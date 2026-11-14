/**
 * Modèles 3D construits en code : soldats (gardiens bleus, pillards rouges),
 * canon, portes, forteresse, marteau tournant et geyser.
 *
 * Les soldats sont fusionnés en une seule géométrie à couleurs de sommets et
 * animés dans le shader (jambes et bras), ce qui permet d'en afficher des
 * milliers en un seul appel de dessin.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  GATE_COLORS,
  bannerTexture,
  brickTexture,
  gateLabelTexture,
  hazardStripeTexture,
} from "./textures";

// ---------------------------------------------------------------------------
// Soldats
// ---------------------------------------------------------------------------

/** Les soldats sont dessinés un peu plus grands que leur rayon de collision, pour une foule bien dense. */
const SOLDIER_SCALE = 1.3;
const PART_BODY = 0;
const PART_LEG_L = 1;
const PART_LEG_R = 2;
const PART_ARM_L = 3;
const PART_ARM_R = 4;

function part(
  geo: THREE.BufferGeometry,
  color: number,
  id: number,
  tx = 0,
  ty = 0,
  tz = 0,
  rot?: THREE.Euler,
) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rot));
  g.translate(tx, ty, tz);
  g.deleteAttribute("uv");
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(n).fill(id), 1));
  return g;
}

export type Team = "blue" | "red";

/** Un soldat d'environ 0,95 m, tourné vers +z. */
export function buildSoldierGeometry(team: Team) {
  const blue = team === "blue";
  const main = blue ? 0x2f6bff : 0xe3262f;
  const dark = blue ? 0x1b2f7a : 0x7a1218;
  const light = blue ? 0x8fc0ff : 0xff8a6b;
  const metal = blue ? 0x4d86ff : 0x9c1b22;
  const pad = blue ? 0xbcd6ff : 0x5a4a44;
  const skin = blue ? 0xf2c18f : 0x9bc46b; // les pillards ont la peau verdâtre
  const trim = blue ? 0xffc93d : 0x3a2a22;
  const parts: THREE.BufferGeometry[] = [];

  // Jambes + bottes
  for (const [side, id] of [
    [-1, PART_LEG_L],
    [1, PART_LEG_R],
  ] as const) {
    parts.push(part(new THREE.BoxGeometry(0.115, 0.26, 0.12), dark, id, side * 0.075, 0.19, 0));
    parts.push(
      part(new THREE.BoxGeometry(0.13, 0.09, 0.17), 0x2b1d16, id, side * 0.075, 0.045, 0.02),
    );
  }
  // Torse, ceinture, plastron
  parts.push(part(new THREE.CylinderGeometry(0.15, 0.175, 0.32, 9), main, PART_BODY, 0, 0.46, 0));
  parts.push(part(new THREE.CylinderGeometry(0.182, 0.182, 0.055, 9), trim, PART_BODY, 0, 0.33, 0));
  parts.push(part(new THREE.BoxGeometry(0.03, 0.03, 0.03), 0xffffff, PART_BODY, 0, 0.33, 0.18));
  if (blue) {
    parts.push(part(new THREE.BoxGeometry(0.2, 0.16, 0.04), light, PART_BODY, 0, 0.49, 0.145));
    parts.push(part(new THREE.BoxGeometry(0.05, 0.12, 0.045), 0xffffff, PART_BODY, 0, 0.49, 0.155));
  } else {
    // Sangle de cuir en diagonale
    parts.push(
      part(
        new THREE.BoxGeometry(0.05, 0.36, 0.03),
        0x4a2e1c,
        PART_BODY,
        0,
        0.47,
        0.16,
        new THREE.Euler(0, 0, 0.7),
      ),
    );
  }
  // Épaulettes
  for (const side of [-1, 1]) {
    parts.push(
      part(
        new THREE.SphereGeometry(0.075, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        pad,
        PART_BODY,
        side * 0.19,
        0.6,
        0,
      ),
    );
  }
  // Bras + mains
  for (const [side, id] of [
    [-1, PART_ARM_L],
    [1, PART_ARM_R],
  ] as const) {
    parts.push(part(new THREE.BoxGeometry(0.085, 0.25, 0.09), main, id, side * 0.215, 0.47, 0));
    parts.push(part(new THREE.IcosahedronGeometry(0.052, 0), skin, id, side * 0.215, 0.33, 0.01));
  }
  if (blue) {
    // Bouclier rond au bras gauche, épée courte au bras droit
    parts.push(
      part(
        new THREE.CylinderGeometry(0.12, 0.12, 0.035, 10),
        light,
        PART_ARM_L,
        -0.28,
        0.45,
        0.02,
        new THREE.Euler(0, 0, Math.PI / 2),
      ),
    );
    parts.push(
      part(
        new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8),
        trim,
        PART_ARM_L,
        -0.3,
        0.45,
        0.02,
        new THREE.Euler(0, 0, Math.PI / 2),
      ),
    );
    parts.push(
      part(new THREE.BoxGeometry(0.03, 0.03, 0.3), 0xe8eef8, PART_ARM_R, 0.215, 0.33, 0.16),
    );
    parts.push(part(new THREE.BoxGeometry(0.1, 0.025, 0.03), trim, PART_ARM_R, 0.215, 0.33, 0.03));
  } else {
    // Hache de pillard
    parts.push(
      part(new THREE.BoxGeometry(0.025, 0.025, 0.34), 0x6b4423, PART_ARM_R, 0.215, 0.33, 0.12),
    );
    parts.push(
      part(new THREE.BoxGeometry(0.02, 0.13, 0.1), 0xb9c0c8, PART_ARM_R, 0.215, 0.36, 0.27),
    );
  }
  // Tête
  parts.push(part(new THREE.IcosahedronGeometry(0.135, 1), skin, PART_BODY, 0, 0.75, 0));
  // Yeux
  for (const side of [-1, 1]) {
    parts.push(
      part(
        new THREE.BoxGeometry(0.03, 0.035, 0.02),
        blue ? 0x101830 : 0xfff04a,
        PART_BODY,
        side * 0.048,
        0.745,
        0.125,
      ),
    );
  }
  // Casque
  parts.push(
    part(
      new THREE.SphereGeometry(0.152, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.56),
      metal,
      PART_BODY,
      0,
      0.765,
      0,
    ),
  );
  parts.push(
    part(
      new THREE.CylinderGeometry(0.158, 0.158, 0.035, 10),
      blue ? 0xffc93d : 0x3a2f2a,
      PART_BODY,
      0,
      0.75,
      0,
    ),
  );
  if (blue) {
    // Cimier blanc
    parts.push(part(new THREE.BoxGeometry(0.035, 0.09, 0.24), 0xffffff, PART_BODY, 0, 0.93, -0.01));
    parts.push(part(new THREE.BoxGeometry(0.03, 0.06, 0.1), main, PART_BODY, 0, 0.88, 0.1));
  } else {
    // Cornes
    for (const side of [-1, 1]) {
      parts.push(
        part(
          new THREE.ConeGeometry(0.035, 0.17, 6),
          0xf3e8cc,
          PART_BODY,
          side * 0.16,
          0.88,
          0,
          new THREE.Euler(0, 0, -side * 0.85),
        ),
      );
    }
  }
  const merged = mergeGeometries(parts, false);
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Géants : le champion bleu (armure dorée, cape, couronne) et le colosse
 * rouge (massue cloutée, épaulières à pointes). Même squelette que les soldats,
 * mis à l'échelle par l'instance.
 */
export function buildGiantGeometry(team: Team) {
  const blue = team === "blue";
  const parts: THREE.BufferGeometry[] = [];
  if (blue) {
    const gold = 0xffc93d;
    // Couronne à pointes autour du casque
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      parts.push(
        part(
          new THREE.ConeGeometry(0.03, 0.09, 4),
          gold,
          PART_BODY,
          Math.cos(a) * 0.13,
          0.86,
          Math.sin(a) * 0.13,
        ),
      );
    }
    parts.push(
      part(
        new THREE.TorusGeometry(0.15, 0.022, 5, 14),
        gold,
        PART_BODY,
        0,
        0.82,
        0,
        new THREE.Euler(Math.PI / 2, 0, 0),
      ),
    );
    // Plastron doré et cape
    parts.push(
      part(new THREE.CylinderGeometry(0.16, 0.18, 0.18, 9, 1, true), gold, PART_BODY, 0, 0.52, 0),
    );
    parts.push(
      part(
        new THREE.BoxGeometry(0.34, 0.5, 0.025),
        0x1a3fb8,
        PART_BODY,
        0,
        0.42,
        -0.19,
        new THREE.Euler(0.18, 0, 0),
      ),
    );
    parts.push(part(new THREE.BoxGeometry(0.36, 0.04, 0.03), gold, PART_BODY, 0, 0.66, -0.16));
    // Grande épée
    parts.push(
      part(new THREE.BoxGeometry(0.035, 0.035, 0.5), 0xf2f6ff, PART_ARM_R, 0.215, 0.33, 0.27),
    );
  } else {
    // Massue cloutée
    parts.push(
      part(
        new THREE.CylinderGeometry(0.03, 0.04, 0.42, 6),
        0x5a3a20,
        PART_ARM_R,
        0.215,
        0.33,
        0.16,
        new THREE.Euler(Math.PI / 2, 0, 0),
      ),
    );
    parts.push(
      part(new THREE.IcosahedronGeometry(0.1, 0), 0x4b3424, PART_ARM_R, 0.215, 0.33, 0.38),
    );
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      parts.push(
        part(
          new THREE.ConeGeometry(0.02, 0.07, 4),
          0xc9ccd2,
          PART_ARM_R,
          0.215 + Math.cos(a) * 0.1,
          0.33 + Math.sin(a) * 0.1,
          0.4,
        ),
      );
    }
    // Épaulières à pointes
    for (const side of [-1, 1]) {
      parts.push(
        part(new THREE.ConeGeometry(0.035, 0.12, 5), 0xc9ccd2, PART_BODY, side * 0.21, 0.69, 0),
      );
    }
    // Ventre bombé
    parts.push(part(new THREE.SphereGeometry(0.17, 9, 6), 0x9d2a1f, PART_BODY, 0, 0.42, 0.04));
  }
  const extra = mergeGeometries(parts, false);
  extra.scale(SOLDIER_SCALE, SOLDIER_SCALE, SOLDIER_SCALE);
  const merged = mergeGeometries([buildSoldierGeometry(team), extra], false);
  merged.computeBoundingSphere();
  return merged;
}

/** Uniform de temps partagé par tous les matériaux animés. */
export const sharedTime = { value: 0 };

export function soldierMaterial(stride = 11) {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.08,
  });
  mat.customProgramCacheKey = () => `soldier-${stride}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTime;
    shader.uniforms.uStride = { value: stride };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aPart;
        uniform float uTime;
        uniform float uStride;
        float mbPhase() {
          #ifdef USE_INSTANCING
            return instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.9;
          #else
            return 0.0;
          #endif
        }
        mat3 mbRotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
        float mbAngle() {
          float sw = sin(uTime * uStride + mbPhase());
          if (aPart < 0.5) return 0.0;
          if (aPart < 1.5) return sw * 0.75;
          if (aPart < 2.5) return -sw * 0.75;
          if (aPart < 3.5) return -sw * 0.9;
          return sw * 0.9;
        }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        objectNormal = mbRotX(mbAngle()) * objectNormal;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          float pivot = (aPart > 2.5 ? 0.58 : 0.31) * 1.3;
          if (aPart > 0.5) {
            transformed.y -= pivot;
            transformed = mbRotX(mbAngle()) * transformed;
            transformed.y += pivot;
          }
          transformed.y += abs(sin(uTime * uStride + mbPhase())) * 0.045;
        }`,
      );
  };
  return mat;
}

// ---------------------------------------------------------------------------
// Canon
// ---------------------------------------------------------------------------

export interface CannonModel {
  group: THREE.Group;
  turret: THREE.Group;
  barrel: THREE.Group;
  wheels: THREE.Mesh[];
  tankFill: THREE.Mesh;
  ring: THREE.Mesh;
  flash: THREE.Mesh;
}

export function buildCannon(): CannonModel {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({
    color: 0xf3f6ff,
    roughness: 0.35,
    metalness: 0.15,
  });
  const blue = new THREE.MeshStandardMaterial({
    color: 0x2f6bff,
    roughness: 0.35,
    metalness: 0.25,
  });
  const darkBlue = new THREE.MeshStandardMaterial({
    color: 0x1a3a9c,
    roughness: 0.5,
    metalness: 0.2,
  });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc23d, roughness: 0.3, metalness: 0.8 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x24252c, roughness: 0.9 });

  // Châssis
  const chassis = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.32, 1.15, 3, 0.1), white);
  chassis.position.y = 0.42;
  group.add(chassis);
  const skirt = new THREE.Mesh(new RoundedBoxGeometry(1.32, 0.12, 1.22, 2, 0.05), blue);
  skirt.position.y = 0.3;
  group.add(skirt);

  // Roues
  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.2, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const treadGeo = new THREE.TorusGeometry(0.27, 0.035, 6, 18);
  treadGeo.rotateY(Math.PI / 2);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, rubber);
      w.position.set(sx * 0.68, 0.27, sz * 0.38);
      const hub = new THREE.Mesh(hubGeo, gold);
      w.add(hub);
      const tread = new THREE.Mesh(treadGeo, darkBlue);
      tread.position.x = sx * 0.06;
      w.add(tread);
      // Rayons visibles quand la roue tourne
      for (let k = 0; k < 3; k++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.05), white);
        spoke.position.x = sx * 0.1;
        spoke.rotation.x = (k * Math.PI) / 3;
        w.add(spoke);
      }
      group.add(w);
      wheels.push(w);
    }
  }

  // Tourelle
  const turret = new THREE.Group();
  turret.position.y = 0.6;
  group.add(turret);
  const ringBase = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.16, 24), darkBlue);
  ringBase.position.y = 0.02;
  turret.add(ringBase);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    blue,
  );
  dome.position.y = 0.08;
  turret.add(dome);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 32), gold);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.1;
  turret.add(band);

  // Réservoir de charge (se remplit avec la jauge du champion)
  const tankGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.5, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xbfe3ff,
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  tankGlass.position.set(0, 0.55, 0.42);
  turret.add(tankGlass);
  const tankFillGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.48, 16);
  tankFillGeo.translate(0, 0.24, 0);
  const tankFill = new THREE.Mesh(
    tankFillGeo,
    new THREE.MeshStandardMaterial({
      color: 0x5fd4ff,
      emissive: 0x2a8cff,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
  );
  tankFill.position.set(0, 0.31, 0.42);
  turret.add(tankFill);
  for (const y of [0.3, 0.8]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), gold);
    cap.position.set(0, y, 0.42);
    turret.add(cap);
  }

  // Canon : profil tourné (lathe) avec frettes et bouche évasée
  const barrel = new THREE.Group();
  barrel.position.set(0, 0.32, -0.05);
  barrel.rotation.x = -0.12;
  turret.add(barrel);
  const profile: THREE.Vector2[] = [
    [0, 0],
    [0.2, 0],
    [0.24, 0.06],
    [0.24, 0.16],
    [0.2, 0.2],
    [0.19, 0.6],
    [0.22, 0.64],
    [0.22, 0.74],
    [0.18, 0.78],
    [0.17, 1.05],
    [0.25, 1.12],
    [0.28, 1.25],
    [0.2, 1.27],
    [0.14, 1.2],
    [0.13, 0.5],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const tubeGeo = new THREE.LatheGeometry(profile, 28);
  tubeGeo.rotateX(-Math.PI / 2);
  const tube = new THREE.Mesh(tubeGeo, white);
  barrel.add(tube);
  for (const z of [-0.69, -1.18]) {
    const fret = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.035, 8, 24), blue);
    fret.position.z = z;
    barrel.add(fret);
  }
  const bore = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 20),
    new THREE.MeshBasicMaterial({ color: 0x0a1030 }),
  );
  bore.position.z = -1.22;
  bore.rotation.y = Math.PI;
  barrel.add(bore);

  // Éclair de bouche
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 8),
    new THREE.MeshBasicMaterial({
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  flash.position.z = -1.4;
  barrel.add(flash);

  // Anneau lumineux au sol
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.1, 48),
    new THREE.MeshBasicMaterial({
      color: 0x5aa8ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== ring && o !== flash) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group, turret, barrel, wheels, tankFill, ring, flash };
}

// ---------------------------------------------------------------------------
// Portes
// ---------------------------------------------------------------------------

export interface GateModel {
  group: THREE.Group;
  panel: THREE.Mesh;
  glow: THREE.Mesh;
  orbs: THREE.Mesh[];
}

const pillarGeo = new RoundedBoxGeometry(0.3, 1.45, 0.3, 2, 0.06);
const capGeo = new THREE.IcosahedronGeometry(0.16, 1);
const footGeo = new RoundedBoxGeometry(0.44, 0.16, 0.44, 2, 0.05);

export function buildGate(op: "mul" | "div", value: number, w: number, gold: boolean): GateModel {
  const kind = op === "div" ? "div" : gold ? "gold" : "mul";
  const col = GATE_COLORS[kind];
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({
    color: 0xf4f1ea,
    roughness: 0.5,
    metalness: 0.05,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: col.glow,
    roughness: 0.3,
    metalness: 0.4,
  });
  const orbMat = new THREE.MeshStandardMaterial({
    color: col.glow,
    emissive: col.glow,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const orbs: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(footGeo, accent);
    foot.position.set((side * w) / 2, 0.08, 0);
    group.add(foot);
    const pillar = new THREE.Mesh(pillarGeo, stone);
    pillar.position.set((side * w) / 2, 0.86, 0);
    group.add(pillar);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.04, 6, 16), accent);
    collar.rotation.x = Math.PI / 2;
    collar.position.set((side * w) / 2, 1.5, 0);
    group.add(collar);
    const orb = new THREE.Mesh(capGeo, orbMat);
    orb.position.set((side * w) / 2, 1.72, 0);
    group.add(orb);
    orbs.push(orb);
  }
  const label = op === "div" ? `÷${value}` : `×${value}`;
  const tex = gateLabelTexture(label, kind, (w - 0.3) / 1.1);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.3, 1.1),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  panel.position.set(0, 1.0, -0.1);
  panel.rotation.x = -0.72;
  group.add(panel);
  // Rideau d'énergie au sol
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.3, 0.5),
    new THREE.MeshBasicMaterial({
      color: col.glow,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.025;
  group.add(glow);
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== panel && o !== glow) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group, panel, glow, orbs };
}

// ---------------------------------------------------------------------------
// Forteresse rouge
// ---------------------------------------------------------------------------

export interface FortressStyle {
  stone: [number, number, number];
  roof: number;
}

export interface FortressModel {
  group: THREE.Group;
  /** Matériaux à faire flasher quand la forteresse encaisse. */
  flashMats: THREE.MeshStandardMaterial[];
  flags: THREE.Mesh[];
  doorGlows: THREE.Mesh[];
}

export function buildFortress(halfW: number, doors: number[], style: FortressStyle): FortressModel {
  const group = new THREE.Group();
  const brick = brickTexture(style.stone[0], style.stone[1], style.stone[2]);
  brick.repeat.set(3, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.85, color: 0xffffff });
  const towerTex = brickTexture(style.stone[0], style.stone[1], style.stone[2] * 0.95, 21);
  towerTex.repeat.set(3, 2);
  const towerMat = new THREE.MeshStandardMaterial({ map: towerTex, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x3b2b2b, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({
    color: style.roof,
    roughness: 0.5,
    metalness: 0.1,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf3c34a,
    roughness: 0.3,
    metalness: 0.8,
  });
  const flashMats = [wallMat, towerMat];

  const wallW = halfW * 2 + 0.4;
  const wallH = 2.8;
  const wallD = 2.4;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, wallD), wallMat);
  wall.position.set(0, wallH / 2, -wallD / 2);
  group.add(wall);
  // Corniche
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(wallW + 0.3, 0.2, wallD + 0.3), trimMat);
  cornice.position.set(0, wallH, -wallD / 2);
  group.add(cornice);
  // Créneaux (merlons) en instanciation
  const merlonGeo = new THREE.BoxGeometry(0.42, 0.45, 0.35);
  const nm = Math.floor(wallW / 0.75);
  const merlons = new THREE.InstancedMesh(merlonGeo, wallMat, nm * 2);
  const m = new THREE.Matrix4();
  for (let i = 0; i < nm; i++) {
    const x = -wallW / 2 + 0.375 + i * (wallW / nm);
    m.makeTranslation(x, wallH + 0.32, 0.0);
    merlons.setMatrixAt(i * 2, m);
    m.makeTranslation(x, wallH + 0.32, -wallD);
    merlons.setMatrixAt(i * 2 + 1, m);
  }
  group.add(merlons);

  // Portes en arc
  const doorGlows: THREE.Mesh[] = [];
  const archShape = new THREE.Shape();
  archShape.moveTo(-0.75, 0);
  archShape.lineTo(-0.75, 1.2);
  archShape.absarc(0, 1.2, 0.75, Math.PI, 0, true);
  archShape.lineTo(0.75, 0);
  archShape.lineTo(-0.75, 0);
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-1.0, 0);
  frameShape.lineTo(-1.0, 1.2);
  frameShape.absarc(0, 1.2, 1.0, Math.PI, 0, true);
  frameShape.lineTo(1.0, 0);
  frameShape.lineTo(0.75, 0);
  frameShape.lineTo(0.75, 1.2);
  frameShape.absarc(0, 1.2, 0.75, 0, Math.PI, false);
  frameShape.lineTo(-0.75, 0);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.3,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 2,
    curveSegments: 16,
  });
  const holeGeo = new THREE.ShapeGeometry(archShape, 16);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x120607 });
  const barMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2e,
    metalness: 0.7,
    roughness: 0.4,
  });
  for (const dx of doors) {
    const frame = new THREE.Mesh(frameGeo, trimMat);
    frame.position.set(dx, 0, 0.02);
    group.add(frame);
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(dx, 0, 0.03);
    group.add(hole);
    const glow = new THREE.Mesh(
      holeGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff3a1a,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.position.set(dx, 0, 0.04);
    group.add(glow);
    doorGlows.push(glow);
    // Herse relevée
    for (let k = -2; k <= 2; k++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), barMat);
      bar.position.set(dx + k * 0.28, 1.7 + Math.cos((k / 2) * 1.2) * 0.15, 0.1);
      group.add(bar);
    }
  }

  // Bannières
  const banner = bannerTexture();
  const bannerMat = new THREE.MeshStandardMaterial({
    map: banner,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.8,
  });
  const bannerXs: number[] = [];
  const gaps = [-halfW + 0.2, ...doors, halfW - 0.2].sort((a, b) => a - b);
  for (let i = 0; i < gaps.length - 1; i++) {
    const mid = (gaps[i] + gaps[i + 1]) / 2;
    if (gaps[i + 1] - gaps[i] > 2.4) bannerXs.push(mid);
  }
  for (const bx of bannerXs) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), bannerMat);
    b.position.set(bx, 1.75, 0.06);
    group.add(b);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), goldMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(bx, 2.56, 0.08);
    group.add(rod);
  }

  // Tours d'angle
  const flags: THREE.Mesh[] = [];
  const flagGeo = new THREE.PlaneGeometry(0.9, 0.5, 8, 2);
  flagGeo.translate(0.45, 0, 0);
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xd8232f,
    side: THREE.DoubleSide,
    roughness: 0.7,
  });
  flagMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed.z += sin(position.x * 5.0 - uTime * 6.0) * 0.08 * position.x;`,
      );
  };
  for (const side of [-1, 1]) {
    const tx = side * (halfW + 0.6);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 4.2, 18), towerMat);
    tower.position.set(tx, 2.1, -1.0);
    group.add(tower);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.15, 0.35, 18), trimMat);
    crown.position.set(tx, 4.3, -1.0);
    group.add(crown);
    const nmt = 10;
    for (let k = 0; k < nmt; k++) {
      const a = (k / nmt) * Math.PI * 2;
      const mer = new THREE.Mesh(merlonGeo, towerMat);
      mer.position.set(tx + Math.cos(a) * 1.18, 4.68, -1.0 + Math.sin(a) * 1.18);
      mer.rotation.y = -a;
      group.add(mer);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.9, 18), roofMat);
    roof.position.set(tx, 5.75, -1.0);
    group.add(roof);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), goldMat);
    pole.position.set(tx, 7.2, -1.0);
    group.add(pole);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(tx + 0.03, 7.55, -1.0);
    group.add(flag);
    flags.push(flag);
    // Meurtrières lumineuses
    for (const y of [1.6, 2.9]) {
      const slit = new THREE.Mesh(
        new THREE.PlaneGeometry(0.14, 0.42),
        new THREE.MeshBasicMaterial({ color: 0xffa340 }),
      );
      slit.position.set(tx, y, -1.0 + 1.13);
      group.add(slit);
    }
  }

  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(mesh.material as THREE.Material).transparent) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return { group, flashMats, flags, doorGlows };
}

// ---------------------------------------------------------------------------
// Pièges
// ---------------------------------------------------------------------------

export function buildSpinner(r: number) {
  const group = new THREE.Group();
  const rotor = new THREE.Group();
  group.add(rotor);
  const metal = new THREE.MeshStandardMaterial({
    color: 0x8b93a3,
    metalness: 0.85,
    roughness: 0.3,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2f38, metalness: 0.6, roughness: 0.5 });
  const stripes = hazardStripeTexture();
  stripes.repeat.set(r * 2, 1);
  const stripeMat = new THREE.MeshStandardMaterial({
    map: stripes,
    roughness: 0.5,
    metalness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.75, 0.25, 20), dark);
  base.position.y = 0.12;
  group.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.0, 16), metal);
  post.position.y = 0.6;
  group.add(post);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), metal);
    bolt.position.set(Math.cos(a) * 0.62, 0.25, Math.sin(a) * 0.62);
    group.add(bolt);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), stripeMat);
  hub.position.y = 0.55;
  rotor.add(hub);
  const bar = new THREE.Mesh(new RoundedBoxGeometry(r * 2, 0.22, 0.22, 2, 0.05), stripeMat);
  bar.position.y = 0.55;
  rotor.add(bar);
  const spikeGeo = new THREE.ConeGeometry(0.07, 0.25, 6);
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), metal);
    head.position.set(side * r, 0.55, 0);
    rotor.add(head);
    const dirs = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
      [0.7, 0.7, 0],
      [-0.7, 0.7, 0],
      [0, 0.7, 0.7],
      [0, 0.7, -0.7],
    ];
    for (const d of dirs) {
      const v = new THREE.Vector3(d[0], d[1], d[2]).normalize();
      const spike = new THREE.Mesh(spikeGeo, dark);
      spike.position.copy(v.clone().multiplyScalar(0.38)).add(head.position);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
      rotor.add(spike);
    }
  }
  // Cercle d'avertissement au sol
  const warn = new THREE.Mesh(
    new THREE.RingGeometry(r + 0.15, r + 0.32, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffc41f,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  warn.rotation.x = -Math.PI / 2;
  warn.position.y = 0.03;
  group.add(warn);
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== warn) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group, rotor };
}

export function buildGeyser(r: number) {
  const group = new THREE.Group();
  const rock = new THREE.MeshStandardMaterial({
    color: 0x2b2324,
    roughness: 0.95,
    flatShading: true,
  });
  const rimGeo = new THREE.TorusGeometry(r, 0.28, 6, 16);
  const pos = rimGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const n = Math.sin(x * 5.1) * Math.cos(y * 4.3);
    pos.setZ(i, pos.getZ(i) * (1 + n * 0.4));
  }
  rimGeo.computeVertexNormals();
  const rim = new THREE.Mesh(rimGeo, rock);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.05;
  rim.castShadow = true;
  rim.receiveShadow = true;
  group.add(rim);
  const poolMat = new THREE.MeshStandardMaterial({
    color: 0xff5a14,
    emissive: 0xff3a00,
    emissiveIntensity: 1.2,
    roughness: 0.6,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 32), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.04;
  group.add(pool);
  const columnGeo = new THREE.CylinderGeometry(r * 0.55, r * 0.95, 4, 20, 4, true);
  columnGeo.translate(0, 2, 0);
  const column = new THREE.Mesh(
    columnGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffa040,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  group.add(column);
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.3, r * 0.6, 4.5, 16, 1, true).translate(0, 2.25, 0),
    new THREE.MeshBasicMaterial({
      color: 0xfff1a0,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  group.add(core);
  return { group, poolMat, column, core };
}
