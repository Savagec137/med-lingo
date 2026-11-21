/**
 * Modèle 3D du galion du joueur (fichier GLB généré à partir de la planche de
 * référence, `docs/naval-battles/reference/`).
 *
 * Le modèle est un bloc texturé unique : on le cale (orientation, longueur,
 * ligne de flottaison), on lui donne les reflets du ciel couchant pour les
 * dorures, on fait luire ses fenêtres et ses fanaux à partir de sa propre
 * texture, et il noircit avec les dégâts comme le galion procédural.
 *
 * Si le fichier est absent ou illisible, le jeu garde le galion procédural.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { ShipClass } from "../sim/defs.ts";
import { createSky } from "./environment.ts";
import { glowTexture } from "./textures.ts";
import type { ShipVisual } from "./ship-model.ts";

/**
 * Fichier du modèle, servi depuis `public/models/`. Vide tant que le modèle n'est
 * pas livré : le jeu ne le demande pas et garde le galion procédural.
 */
export const PLAYER_MODEL_URL: string | null = null;

/** Calage du modèle importé dans le repère du jeu (proue vers +Z, tribord vers −X). */
export const PLAYER_MODEL_FIT = {
  /** Rotation (radians, autour de Y) qui amène la proue du fichier vers +Z. */
  yaw: 0,
  /** Longueur hors-tout visée, beaupré compris (la coque jouable mesure 26 m). */
  length: 31,
  /** Tirant d'eau : la quille descend à cette profondeur sous la surface. */
  draft: 2.2,
  /** Les pixels clairs et chauds de la texture (fenêtres, fanaux) s'illuminent. */
  glow: { strength: 2.4, minLuminance: 0.42, maxLuminance: 0.75 },
  /** Halos des fanaux, en coordonnées du modèle calé (x, y, z). */
  lanterns: [] as [number, number, number][],
};

export interface PlayerModel {
  template: THREE.Object3D;
  envMap: THREE.Texture;
  dispose(): void;
}

/** Environnement de réflexion tiré du ciel du jeu : les métaux reflètent le couchant. */
function skyEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  const sky = createSky();
  scene.add(sky);
  const target = pmrem.fromScene(scene, 0, 0.5, 3000);
  sky.geometry.dispose();
  sky.material.dispose();
  pmrem.dispose();
  return target.texture;
}

/** Ajoute l'auto-illumination des zones claires et chaudes de la texture de base. */
function addWindowGlow(material: THREE.MeshStandardMaterial): void {
  const g = PLAYER_MODEL_FIT.glow;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGlow = { value: g.strength };
    shader.uniforms.uGlowRange = { value: new THREE.Vector2(g.minLuminance, g.maxLuminance) };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uGlow;\nuniform vec2 uGlowRange;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        #ifdef USE_MAP
          vec3 glowBase = texture2D(map, vMapUv).rgb;
          float glowLum = dot(glowBase, vec3(0.299, 0.587, 0.114));
          float glowWarm = smoothstep(0.08, 0.3, glowBase.r - glowBase.b);
          totalEmissiveRadiance += glowBase * smoothstep(uGlowRange.x, uGlowRange.y, glowLum) * glowWarm * uGlow;
        #endif`,
      );
  };
  material.customProgramCacheKey = () => "naval-player-glow";
}

/** Oriente, met à l'échelle et pose le modèle sur l'eau. */
export function fitModel(source: THREE.Object3D): THREE.Group {
  const fit = PLAYER_MODEL_FIT;
  const oriented = new THREE.Group();
  oriented.rotation.y = fit.yaw;
  oriented.add(source);
  const holder = new THREE.Group();
  holder.add(oriented);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3());
  const scale = fit.length / Math.max(1e-3, size.z);
  holder.scale.setScalar(scale);
  holder.updateMatrixWorld(true);
  box.setFromObject(holder);
  const center = box.getCenter(new THREE.Vector3());
  holder.position.set(-center.x, -fit.draft - box.min.y, -center.z);
  const root = new THREE.Group();
  root.add(holder);
  return root;
}

export async function loadPlayerModel(
  renderer: THREE.WebGLRenderer,
  url: string,
): Promise<PlayerModel | null> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let gltf;
  try {
    gltf = await loader.loadAsync(url);
  } catch {
    return null;
  }
  const envMap = skyEnvironment(renderer);
  const owned: { dispose(): void }[] = [envMap];
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    owned.push(mesh.geometry);
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (m instanceof THREE.MeshStandardMaterial) {
        m.envMap = envMap;
        m.envMapIntensity = 0.75;
        addWindowGlow(m);
      }
      owned.push(m);
      for (const key of [
        "map",
        "normalMap",
        "roughnessMap",
        "metalnessMap",
        "emissiveMap",
        "aoMap",
      ] as const) {
        const t = (m as THREE.MeshStandardMaterial)[key];
        if (t) owned.push(t);
      }
    }
  });
  return {
    template: fitModel(gltf.scene),
    envMap,
    dispose() {
      for (const d of owned) d.dispose();
    },
  };
}

/** Visuel du galion du joueur à partir du modèle importé (mêmes règles que le procédural). */
export function createModelShipVisual(cls: ShipClass, model: PlayerModel): ShipVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const instance = model.template.clone(true);
  // Matériaux propres à l'instance : le noircissement des dégâts ne fuit pas ailleurs.
  const tintMaterials: THREE.MeshStandardMaterial[] = [];
  const disposables: { dispose(): void }[] = [];
  instance.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const clone = (m: THREE.Material) => {
      const c = m.clone();
      if (c instanceof THREE.MeshStandardMaterial) {
        c.onBeforeCompile = m.onBeforeCompile;
        c.customProgramCacheKey = m.customProgramCacheKey;
        tintMaterials.push(c);
      }
      disposables.push(c);
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
  });
  body.add(instance);
  const lanterns: THREE.Sprite[] = [];
  if (PLAYER_MODEL_FIT.lanterns.length) {
    const glowMat = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: "#ffb25a",
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    disposables.push(glowMat);
    for (const [x, y, z] of PLAYER_MODEL_FIT.lanterns) {
      const glow = new THREE.Sprite(glowMat);
      glow.position.set(x, y, z);
      glow.scale.setScalar(2);
      body.add(glow);
      lanterns.push(glow);
    }
  }
  return {
    root,
    body,
    cls,
    tear: { value: 0 },
    tintMaterials,
    cannons: null,
    gunSlots: [],
    flag: null,
    flagBase: null,
    lanterns,
    disposables,
    heel: 0,
    gunKey: "",
  };
}
