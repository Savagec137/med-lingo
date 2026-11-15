/**
 * Modèles 3D construits en code : soldats (gardiens bleus, pillards rouges),
 * canon, défenses alliées, portes, forteresse, marteau tournant et geyser.
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
export type Detail = "high" | "low";

interface Palette {
  main: number;
  dark: number;
  light: number;
  metal: number;
  pad: number;
  skin: number;
  trim: number;
  cloth: number;
  boot: number;
}

const PALETTES: Record<Team, Palette> = {
  blue: {
    main: 0x2f6bff,
    dark: 0x1a2f86,
    light: 0x8fc4ff,
    metal: 0x3f7bff,
    pad: 0xd6e6ff,
    skin: 0xf3c597,
    trim: 0xffc93d,
    cloth: 0xffffff,
    boot: 0x3a2618,
  },
  red: {
    main: 0xd8262f,
    dark: 0x6e1016,
    light: 0xff8a6b,
    metal: 0x4a3d3a,
    pad: 0x7a5236,
    skin: 0x8fbf5f,
    trim: 0x2e2018,
    cloth: 0x9c1b22,
    boot: 0x2a1a12,
  },
};

/** Profil tourné du buste : bombé à la taille, épaules arrondies. */
function torsoGeometry(segments: number) {
  const prof = [
    [0, 0.28],
    [0.125, 0.28],
    [0.165, 0.33],
    [0.178, 0.42],
    [0.168, 0.52],
    [0.14, 0.59],
    [0.07, 0.635],
    [0, 0.64],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(prof, segments);
}

/**
 * Un soldat d'environ 0,95 m (avant mise à l'échelle), tourné vers +z.
 * « high » : modèle détaillé pour les soldats proches de la caméra ;
 * « low » : silhouette identique, moins de polygones, pour la foule lointaine.
 */
export function buildSoldierGeometry(team: Team, detail: Detail = "high") {
  const blue = team === "blue";
  const c = PALETTES[team];
  const hi = detail === "high";
  const seg = hi ? 9 : 6;
  const parts: THREE.BufferGeometry[] = [];

  // Jambes, bottes
  for (const [side, id] of [
    [-1, PART_LEG_L],
    [1, PART_LEG_R],
  ] as const) {
    parts.push(
      part(
        new THREE.CylinderGeometry(0.06, 0.052, 0.24, hi ? 7 : 5, 1, true),
        c.dark,
        id,
        side * 0.075,
        0.2,
        0,
      ),
    );
    if (hi) {
      parts.push(
        part(
          new RoundedBoxGeometry(0.12, 0.1, 0.18, 1, 0.035),
          c.boot,
          id,
          side * 0.075,
          0.05,
          0.02,
        ),
      );
      parts.push(
        part(
          new THREE.BoxGeometry(0.125, 0.022, 0.09),
          blue ? c.trim : 0x5a3a24,
          id,
          side * 0.075,
          0.1,
          0.0,
        ),
      );
    } else {
      parts.push(
        part(new THREE.BoxGeometry(0.12, 0.1, 0.17), c.boot, id, side * 0.075, 0.05, 0.02),
      );
    }
  }

  // Buste
  parts.push(part(torsoGeometry(seg), c.main, PART_BODY));
  // Ceinture et boucle
  parts.push(
    part(
      new THREE.CylinderGeometry(0.17, 0.17, 0.05, seg, 1, true),
      blue ? 0x5a3a20 : 0x3a2418,
      PART_BODY,
      0,
      0.345,
      0,
    ),
  );
  parts.push(
    part(
      new THREE.BoxGeometry(0.06, 0.045, 0.03),
      blue ? c.trim : 0xb9c0c8,
      PART_BODY,
      0,
      0.345,
      0.17,
    ),
  );
  if (blue) {
    // Tabard blanc frappé d'une étoile dorée, cape dans le dos
    parts.push(part(new THREE.BoxGeometry(0.16, 0.22, 0.03), c.cloth, PART_BODY, 0, 0.47, 0.158));
    if (hi)
      parts.push(part(new THREE.OctahedronGeometry(0.04, 0), c.trim, PART_BODY, 0, 0.49, 0.178));
    parts.push(
      part(
        new THREE.BoxGeometry(0.16, 0.12, 0.025),
        c.cloth,
        PART_BODY,
        0,
        0.26,
        0.15,
        new THREE.Euler(0.12, 0, 0),
      ),
    );
    const cape = new THREE.CylinderGeometry(
      0.2,
      0.25,
      0.4,
      hi ? 6 : 4,
      1,
      true,
      Math.PI * 0.62,
      Math.PI * 0.76,
    );
    parts.push(part(cape, c.dark, PART_BODY, 0, 0.4, -0.01));
  } else {
    // Gilet de cuir, pagne, fourrure sur les épaules
    parts.push(
      part(
        new THREE.BoxGeometry(0.05, 0.34, 0.03),
        0x4a2e1c,
        PART_BODY,
        0.02,
        0.47,
        0.168,
        new THREE.Euler(0, 0, 0.62),
      ),
    );
    parts.push(
      part(
        new THREE.BoxGeometry(0.2, 0.14, 0.03),
        c.cloth,
        PART_BODY,
        0,
        0.26,
        0.15,
        new THREE.Euler(0.12, 0, 0),
      ),
    );
    const fur = new THREE.TorusGeometry(0.15, 0.06, hi ? 5 : 3, hi ? 10 : 6);
    fur.rotateX(Math.PI / 2);
    parts.push(part(fur, 0x6b4a2e, PART_BODY, 0, 0.6, 0));
  }

  // Épaulières
  for (const side of [-1, 1]) {
    parts.push(
      part(
        new THREE.SphereGeometry(0.085, hi ? 7 : 5, hi ? 3 : 2, 0, Math.PI * 2, 0, Math.PI / 2),
        c.pad,
        PART_BODY,
        side * 0.19,
        0.585,
        0,
      ),
    );
    if (!blue && hi) {
      parts.push(
        part(new THREE.ConeGeometry(0.025, 0.09, 4), 0xd8d2c0, PART_BODY, side * 0.21, 0.66, 0),
      );
    }
  }

  // Bras et mains
  for (const [side, id] of [
    [-1, PART_ARM_L],
    [1, PART_ARM_R],
  ] as const) {
    parts.push(
      part(
        new THREE.CylinderGeometry(0.048, 0.042, 0.22, hi ? 6 : 4, 1, true),
        c.main,
        id,
        side * 0.215,
        0.47,
        0,
      ),
    );
    parts.push(
      part(
        new THREE.IcosahedronGeometry(0.05, 0),
        blue ? 0xe9eef8 : c.skin,
        id,
        side * 0.215,
        0.345,
        0.01,
      ),
    );
  }

  // Armes
  if (blue) {
    // Bouclier rond : disque bleu, liseré doré, umbo
    parts.push(
      part(
        new THREE.CylinderGeometry(0.135, 0.135, 0.03, hi ? 12 : 7),
        c.light,
        PART_ARM_L,
        -0.285,
        0.45,
        0.03,
        new THREE.Euler(0, 0, Math.PI / 2),
      ),
    );
    parts.push(
      part(
        new THREE.CylinderGeometry(0.148, 0.148, 0.02, hi ? 12 : 7, 1, true),
        c.trim,
        PART_ARM_L,
        -0.285,
        0.45,
        0.03,
        new THREE.Euler(0, 0, Math.PI / 2),
      ),
    );
    if (hi) {
      parts.push(
        part(new THREE.IcosahedronGeometry(0.04, 0), c.trim, PART_ARM_L, -0.31, 0.45, 0.03),
      );
      parts.push(
        part(new THREE.BoxGeometry(0.012, 0.16, 0.035), 0xffffff, PART_ARM_L, -0.303, 0.45, 0.03),
      );
    }
    // Épée : lame, garde dorée, poignée
    parts.push(
      part(new THREE.BoxGeometry(0.026, 0.012, 0.3), 0xeef3fb, PART_ARM_R, 0.215, 0.345, 0.2),
    );
    parts.push(
      part(new THREE.BoxGeometry(0.12, 0.028, 0.03), c.trim, PART_ARM_R, 0.215, 0.345, 0.05),
    );
  } else {
    // Hache double
    parts.push(
      part(
        new THREE.CylinderGeometry(0.015, 0.015, 0.38, 5),
        0x6b4423,
        PART_ARM_R,
        0.215,
        0.345,
        0.12,
        new THREE.Euler(Math.PI / 2, 0, 0),
      ),
    );
    parts.push(
      part(new THREE.BoxGeometry(0.018, 0.16, 0.09), 0xc2c8d0, PART_ARM_R, 0.215, 0.37, 0.28),
    );
    if (hi)
      parts.push(
        part(new THREE.BoxGeometry(0.02, 0.05, 0.03), 0x8a9098, PART_ARM_R, 0.215, 0.345, 0.32),
      );
  }

  // Tête
  const head = new THREE.SphereGeometry(0.15, hi ? 10 : 7, hi ? 7 : 5);
  head.scale(1, 0.95, 0.97);
  parts.push(part(head, c.skin, PART_BODY, 0, 0.78, 0));
  // Yeux
  for (const side of [-1, 1]) {
    if (hi) {
      parts.push(
        part(new THREE.SphereGeometry(0.03, 5, 4), 0xffffff, PART_BODY, side * 0.052, 0.77, 0.128),
      );
      parts.push(
        part(
          new THREE.SphereGeometry(0.017, 4, 3),
          blue ? 0x1a2240 : 0xffe04a,
          PART_BODY,
          side * 0.052,
          0.77,
          0.152,
        ),
      );
    } else {
      parts.push(
        part(
          new THREE.BoxGeometry(0.03, 0.035, 0.02),
          blue ? 0x1a2240 : 0xffe04a,
          PART_BODY,
          side * 0.05,
          0.77,
          0.14,
        ),
      );
    }
  }
  if (!blue) {
    // Défenses du pillard
    for (const side of [-1, 1]) {
      parts.push(
        part(
          new THREE.ConeGeometry(0.014, 0.05, 4),
          0xfff6dc,
          PART_BODY,
          side * 0.045,
          0.705,
          0.13,
        ),
      );
    }
  }

  // Casque
  parts.push(
    part(
      new THREE.SphereGeometry(0.168, hi ? 10 : 7, hi ? 4 : 3, 0, Math.PI * 2, 0, Math.PI * 0.5),
      c.metal,
      PART_BODY,
      0,
      0.79,
      -0.005,
    ),
  );
  parts.push(
    part(
      new THREE.CylinderGeometry(0.172, 0.172, 0.04, hi ? 10 : 7, 1, true),
      blue ? c.trim : 0x2a2220,
      PART_BODY,
      0,
      0.795,
      -0.005,
    ),
  );
  if (blue) {
    // Nasal et grand plumet blanc au bout bleu
    if (hi)
      parts.push(part(new THREE.BoxGeometry(0.025, 0.09, 0.02), c.trim, PART_BODY, 0, 0.78, 0.16));
    parts.push(
      part(
        new THREE.BoxGeometry(0.04, 0.1, 0.2),
        0xffffff,
        PART_BODY,
        0,
        0.98,
        -0.02,
        new THREE.Euler(-0.25, 0, 0),
      ),
    );
    parts.push(
      part(
        new THREE.BoxGeometry(0.038, 0.08, 0.1),
        0xffffff,
        PART_BODY,
        0,
        0.95,
        -0.15,
        new THREE.Euler(-0.9, 0, 0),
      ),
    );
    if (hi)
      parts.push(
        part(
          new THREE.BoxGeometry(0.036, 0.06, 0.06),
          c.main,
          PART_BODY,
          0,
          0.88,
          -0.22,
          new THREE.Euler(-1.3, 0, 0),
        ),
      );
  } else {
    // Cornes recourbées en deux segments
    for (const side of [-1, 1]) {
      parts.push(
        part(
          new THREE.ConeGeometry(0.04, 0.12, 5),
          0xf0e4c4,
          PART_BODY,
          side * 0.17,
          0.87,
          0,
          new THREE.Euler(0, 0, -side * 1.1),
        ),
      );
      parts.push(
        part(
          new THREE.ConeGeometry(0.025, 0.1, 5),
          0xf0e4c4,
          PART_BODY,
          side * 0.235,
          0.95,
          0,
          new THREE.Euler(0, 0, -side * 0.25),
        ),
      );
    }
    if (hi)
      parts.push(part(new THREE.ConeGeometry(0.03, 0.08, 4), 0x6e1016, PART_BODY, 0, 0.98, -0.02));
  }

  const merged = mergeGeometries(parts, false);
  merged.scale(SOLDIER_SCALE, SOLDIER_SCALE, SOLDIER_SCALE);
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
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      parts.push(
        part(
          new THREE.ConeGeometry(0.028, 0.1, 4),
          gold,
          PART_BODY,
          Math.cos(a) * 0.15,
          0.89,
          Math.sin(a) * 0.15,
        ),
      );
    }
    parts.push(
      part(
        new THREE.TorusGeometry(0.17, 0.022, 5, 16),
        gold,
        PART_BODY,
        0,
        0.84,
        0,
        new THREE.Euler(Math.PI / 2, 0, 0),
      ),
    );
    parts.push(part(new THREE.SphereGeometry(0.03, 6, 4), 0x4fd2ff, PART_BODY, 0, 0.87, 0.17));
    parts.push(
      part(new THREE.CylinderGeometry(0.18, 0.19, 0.18, 10, 1, true), gold, PART_BODY, 0, 0.5, 0),
    );
    parts.push(
      part(
        new THREE.CylinderGeometry(0.26, 0.34, 0.52, 7, 1, true, Math.PI * 0.6, Math.PI * 0.8),
        0x14308f,
        PART_BODY,
        0,
        0.37,
        -0.02,
      ),
    );
    parts.push(
      part(new THREE.BoxGeometry(0.035, 0.035, 0.55), 0xf2f6ff, PART_ARM_R, 0.215, 0.345, 0.32),
    );
  } else {
    parts.push(
      part(
        new THREE.CylinderGeometry(0.03, 0.04, 0.42, 6),
        0x5a3a20,
        PART_ARM_R,
        0.215,
        0.345,
        0.16,
        new THREE.Euler(Math.PI / 2, 0, 0),
      ),
    );
    parts.push(
      part(new THREE.IcosahedronGeometry(0.1, 0), 0x4b3424, PART_ARM_R, 0.215, 0.345, 0.38),
    );
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      parts.push(
        part(
          new THREE.ConeGeometry(0.02, 0.07, 4),
          0xc9ccd2,
          PART_ARM_R,
          0.215 + Math.cos(a) * 0.1,
          0.345 + Math.sin(a) * 0.1,
          0.4,
        ),
      );
    }
    for (const side of [-1, 1]) {
      parts.push(
        part(new THREE.ConeGeometry(0.035, 0.13, 5), 0xc9ccd2, PART_BODY, side * 0.2, 0.69, 0),
      );
    }
    parts.push(part(new THREE.SphereGeometry(0.17, 9, 6), 0x9d2a1f, PART_BODY, 0, 0.42, 0.05));
  }
  const extra = mergeGeometries(parts, false);
  extra.scale(SOLDIER_SCALE, SOLDIER_SCALE, SOLDIER_SCALE);
  const merged = mergeGeometries([buildSoldierGeometry(team, "high"), extra], false);
  merged.computeBoundingSphere();
  return merged;
}

/** Uniform de temps partagé par tous les matériaux animés. */
export const sharedTime = { value: 0 };

/**
 * Matériau des soldats : couleurs de sommets, membres animés dans le shader,
 * et un liseré lumineux (rim light) à la couleur de l'équipe pour qu'on
 * distingue chaque soldat dans la mêlée.
 */
export function soldierMaterial(stride = 11, rim = 0x8fc4ff) {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.5,
    metalness: 0.1,
  });
  const rimColor = new THREE.Color(rim);
  mat.customProgramCacheKey = () => `soldier-${stride}-${rim}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTime;
    shader.uniforms.uStride = { value: stride };
    shader.uniforms.uRim = { value: rimColor };
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
          float pivot = (aPart > 2.5 ? 0.58 : 0.31) * ${SOLDIER_SCALE.toFixed(2)};
          if (aPart > 0.5) {
            transformed.y -= pivot;
            transformed = mbRotX(mbAngle()) * transformed;
            transformed.y += pivot;
          }
          transformed.y += abs(sin(uTime * uStride + mbPhase())) * 0.045;
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRim;")
      .replace(
        "#include <opaque_fragment>",
        `{
          float rimF = 1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
          outgoingLight += uRim * pow(rimF, 3.0) * 0.55;
        }
        #include <opaque_fragment>`,
      );
  };
  return mat;
}

// ---------------------------------------------------------------------------
// Canon du joueur : la bombarde royale
// ---------------------------------------------------------------------------

export interface CannonModel {
  group: THREE.Group;
  turret: THREE.Group;
  barrel: THREE.Group;
  /** Roues : groupes à faire tourner autour de x. */
  wheels: THREE.Object3D[];
  /** Cristal d'énergie : son éclat suit la jauge du champion. */
  crystal: THREE.Mesh;
  crystalMat: THREE.MeshStandardMaterial;
  muzzleGlow: THREE.MeshBasicMaterial;
  ring: THREE.Mesh;
  flash: THREE.Mesh;
}

function cannonMaterials() {
  return {
    navy: new THREE.MeshStandardMaterial({ color: 0x1c3a9e, roughness: 0.32, metalness: 0.35 }),
    royal: new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.3, metalness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffc84a, roughness: 0.22, metalness: 0.95 }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xf2f5ff, roughness: 0.35, metalness: 0.1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 0.75, metalness: 0 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x3a3f4c, roughness: 0.4, metalness: 0.75 }),
  };
}

/** Grande roue à rayons : jante de bois cerclée de fer, moyeu doré. */
function spokedWheel(r: number, mats: ReturnType<typeof cannonMaterials>, spokes = 10) {
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.11, 8, 28), mats.wood);
  rim.rotation.y = Math.PI / 2;
  wheel.add(rim);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r + r * 0.09, r * 0.05, 6, 28), mats.iron);
  tire.rotation.y = Math.PI / 2;
  wheel.add(tire);
  for (let k = 0; k < spokes; k++) {
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.04, r * 0.06, r * 1.9, 5),
      mats.wood,
    );
    spoke.rotation.x = (k / spokes) * Math.PI;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.24, r * 0.28, r * 0.5, 14),
    mats.gold,
  );
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.14, 10, 6), mats.royal);
  cap.position.x = r * 0.27;
  wheel.add(cap);
  const cap2 = cap.clone();
  cap2.position.x = -r * 0.27;
  wheel.add(cap2);
  return wheel;
}

/** Fût tourné : bouton de culasse, renforts, volée, tulipe évasée. */
function barrelGeometry(scale = 1) {
  const profile = [
    [0, -0.18],
    [0.11, -0.16],
    [0.14, -0.08],
    [0.1, -0.02],
    [0.3, 0.0],
    [0.33, 0.06],
    [0.33, 0.2],
    [0.3, 0.24],
    [0.28, 0.5],
    [0.31, 0.53],
    [0.31, 0.6],
    [0.27, 0.63],
    [0.24, 1.0],
    [0.27, 1.03],
    [0.27, 1.09],
    [0.23, 1.12],
    [0.22, 1.3],
    [0.29, 1.4],
    [0.33, 1.52],
    [0.25, 1.55],
    [0.17, 1.48],
    [0.16, 1.0],
  ].map(([x, y]) => new THREE.Vector2(x * scale, y * scale));
  const g = new THREE.LatheGeometry(profile, 32);
  g.rotateX(-Math.PI / 2);
  return g;
}

export function buildCannon(): CannonModel {
  const group = new THREE.Group();
  const mats = cannonMaterials();

  // Affût : deux flasques bleues reliées par des entretoises dorées
  const cheekShape = new THREE.Shape();
  cheekShape.moveTo(-0.75, 0);
  cheekShape.lineTo(0.7, 0);
  cheekShape.quadraticCurveTo(0.85, 0.05, 0.8, 0.22);
  cheekShape.lineTo(0.35, 0.62);
  cheekShape.quadraticCurveTo(0.1, 0.78, -0.2, 0.62);
  cheekShape.lineTo(-0.7, 0.32);
  cheekShape.quadraticCurveTo(-0.82, 0.2, -0.75, 0);
  const cheekGeo = new THREE.ExtrudeGeometry(cheekShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 2,
    curveSegments: 8,
  });
  cheekGeo.rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeo, mats.navy);
    cheek.position.set(side * 0.34 - 0.06, 0.28, 0);
    group.add(cheek);
    // Filet doré le long de la flasque
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 1.3), mats.gold);
    trim.position.set(side * 0.46, 0.36, 0.0);
    group.add(trim);
    for (let k = 0; k < 4; k++) {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), mats.gold);
      rivet.position.set(side * 0.47, 0.5, -0.45 + k * 0.3);
      group.add(rivet);
    }
  }
  const transom = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.16, 1.2, 2, 0.05), mats.royal);
  transom.position.set(0, 0.32, 0);
  group.add(transom);
  // Flèche arrière posée au sol
  const trail = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.14, 0.7, 2, 0.05), mats.navy);
  trail.position.set(0, 0.16, 0.85);
  trail.rotation.x = -0.25;
  group.add(trail);
  const trailCap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 12), mats.gold);
  trailCap.rotation.z = Math.PI / 2;
  trailCap.position.set(0, 0.08, 1.18);
  group.add(trailCap);

  // Roues
  const wheels: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const w = spokedWheel(0.52, mats);
    w.position.set(side * 0.62, 0.52, -0.05);
    group.add(w);
    wheels.push(w);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 10), mats.iron);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, 0.52, -0.05);
  group.add(axle);

  // Tourelle et fût
  const turret = new THREE.Group();
  turret.position.set(0, 0.86, 0.05);
  group.add(turret);
  const barrel = new THREE.Group();
  barrel.rotation.x = 0.08;
  turret.add(barrel);
  const tube = new THREE.Mesh(barrelGeometry(1), mats.royal);
  barrel.add(tube);
  for (const z of [-0.12, -0.565, -1.06]) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(z < -1 ? 0.27 : z < -0.5 ? 0.31 : 0.335, 0.035, 8, 28),
      mats.gold,
    );
    band.position.z = z;
    barrel.add(band);
  }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.04, 8, 28), mats.gold);
  lip.position.z = -1.5;
  barrel.add(lip);
  // Tourillons sur l'affût
  const trunnion = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.82, 12), mats.gold);
  trunnion.rotation.z = Math.PI / 2;
  trunnion.position.z = -0.3;
  barrel.add(trunnion);
  // Emblème : étoile dorée sur le dessus du fût
  const star = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 === 0 ? 0.13 : 0.055;
    if (k === 0) star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const starGeo = new THREE.ExtrudeGeometry(star, { depth: 0.03, bevelEnabled: false });
  const starMesh = new THREE.Mesh(starGeo, mats.gold);
  starMesh.rotation.x = -Math.PI / 2;
  starMesh.position.set(0, 0.305, -0.78);
  barrel.add(starMesh);
  // Lueur au fond de la bouche
  const muzzleGlow = new THREE.MeshBasicMaterial({
    color: 0x6fd0ff,
    transparent: true,
    opacity: 0.6,
  });
  const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), muzzleGlow);
  glowDisc.position.z = -1.46;
  glowDisc.rotation.y = Math.PI;
  barrel.add(glowDisc);
  // Cristal d'énergie au-dessus de la culasse, sur son berceau doré
  const cradle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.1, 12), mats.gold);
  cradle.position.set(0, 0.32, 0.1);
  barrel.add(cradle);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x7fd8ff,
    emissive: 0x2a9cff,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
    flatShading: true,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), crystalMat);
  crystal.scale.set(1, 1.5, 1);
  crystal.position.set(0, 0.55, 0.1);
  barrel.add(crystal);

  // Fanion bleu sur la flèche
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), mats.gold);
  pole.position.set(0.22, 0.75, 0.95);
  group.add(pole);
  const flagGeo = new THREE.PlaneGeometry(0.42, 0.26, 6, 1);
  flagGeo.translate(0.21, 0, 0);
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0x2f6bff,
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  flagMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed.z += sin(position.x * 9.0 - uTime * 8.0) * 0.05 * position.x * 2.0;`,
      );
  };
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.rotation.y = -Math.PI / 2;
  flag.position.set(0.22, 1.18, 0.95);
  group.add(flag);

  // Éclair de bouche
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 8),
    new THREE.MeshBasicMaterial({
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  flash.position.z = -1.7;
  barrel.add(flash);

  // Anneau lumineux au sol
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.2, 48),
    new THREE.MeshBasicMaterial({
      color: 0x5aa8ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && o !== ring && o !== flash && o !== glowDisc) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return { group, turret, barrel, wheels, crystal, crystalMat, muzzleGlow, ring, flash };
}

// ---------------------------------------------------------------------------
// Défenses alliées : socle, mortier, canon allié, obus
// ---------------------------------------------------------------------------

/** Socle octogonal où se construit une défense. */
export function buildPad() {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0xc9cfdc, roughness: 0.7 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.74, 0.16, 8), stone);
  base.position.y = 0.08;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x6ab4ff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.56, 8), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.rotation.z = Math.PI / 8;
  glow.position.y = 0.17;
  group.add(glow);
  // Croix « + » holographique tant que le socle est libre
  const plusMat = new THREE.MeshBasicMaterial({
    color: 0xbfe0ff,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  const plus = new THREE.Group();
  plus.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.1), plusMat));
  plus.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.4), plusMat));
  plus.position.y = 0.35;
  group.add(plus);
  return { group, glowMat, plus };
}

export interface HelperModel {
  group: THREE.Group;
  /** Partie qui pivote vers la cible. */
  yaw: THREE.Group;
  /** Partie qui recule au tir. */
  recoil: THREE.Group;
}

/** Mortier : gros tube trapu sur fourche pivotante, entouré de sacs de sable. */
export function buildMortar(): HelperModel {
  const mats = cannonMaterials();
  const group = new THREE.Group();
  const sand = new THREE.MeshStandardMaterial({ color: 0xc9a46b, roughness: 0.95 });
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 5), sand);
    bag.scale.set(1.4, 0.65, 0.9);
    bag.position.set(Math.cos(a) * 0.6, 0.26, Math.sin(a) * 0.6);
    bag.rotation.y = -a;
    group.add(bag);
  }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.18, 16), mats.iron);
  base.position.y = 0.25;
  group.add(base);
  const yaw = new THREE.Group();
  yaw.position.y = 0.34;
  group.add(yaw);
  for (const side of [-1, 1]) {
    const fork = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.42, 0.32, 2, 0.03), mats.navy);
    fork.position.set(side * 0.3, 0.2, 0);
    yaw.add(fork);
  }
  const pivot = new THREE.Group();
  pivot.position.y = 0.32;
  pivot.rotation.x = -0.75;
  yaw.add(pivot);
  const recoil = new THREE.Group();
  pivot.add(recoil);
  const prof = [
    [0, -0.25],
    [0.2, -0.24],
    [0.27, -0.12],
    [0.28, 0.25],
    [0.31, 0.3],
    [0.31, 0.38],
    [0.24, 0.4],
    [0.2, 0.2],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const tube = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), mats.gold);
  recoil.add(tube);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.03, 6, 24), mats.navy);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.05;
  recoil.add(band);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.66, 10), mats.iron);
  pin.rotation.z = Math.PI / 2;
  recoil.add(pin);
  // Pile d'obus
  for (const [x, z] of [
    [0.35, 0.38],
    [0.47, 0.3],
    [0.41, 0.48],
  ]) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mats.iron);
    ball.position.set(x, 0.42, z);
    group.add(ball);
  }
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return { group, yaw, recoil };
}

/** Canon allié : petite bombarde sur roues, aux couleurs du joueur. */
export function buildAllyCannon(): HelperModel {
  const mats = cannonMaterials();
  const group = new THREE.Group();
  const yaw = new THREE.Group();
  group.add(yaw);
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.22, 0.75, 2, 0.06), mats.navy);
  body.position.y = 0.36;
  yaw.add(body);
  for (const side of [-1, 1]) {
    const w = spokedWheel(0.3, mats, 8);
    w.position.set(side * 0.36, 0.3, 0.02);
    yaw.add(w);
  }
  const recoil = new THREE.Group();
  recoil.position.set(0, 0.56, 0.05);
  recoil.rotation.x = 0.06;
  yaw.add(recoil);
  const tube = new THREE.Mesh(barrelGeometry(0.62), mats.royal);
  recoil.add(tube);
  for (const z of [-0.08, -0.35, -0.66]) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(z < -0.6 ? 0.17 : 0.2, 0.025, 6, 20),
      mats.gold,
    );
    band.position.z = z;
    recoil.add(band);
  }
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08, 0),
    new THREE.MeshStandardMaterial({
      color: 0x7fd8ff,
      emissive: 0x2a9cff,
      emissiveIntensity: 1,
      flatShading: true,
    }),
  );
  gem.position.set(0, 0.24, 0.05);
  recoil.add(gem);
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return { group, yaw, recoil };
}

export function buildShell() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.35, metalness: 0.7 }),
  );
  const fuse = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0xffc040 }),
  );
  fuse.position.y = 0.17;
  mesh.add(fuse);
  mesh.castShadow = true;
  return mesh;
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
