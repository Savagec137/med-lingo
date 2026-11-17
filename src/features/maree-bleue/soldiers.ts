/**
 * Les soldats : gardiens bleus, pillards rouges, champion et colosse.
 *
 * Chaque soldat est une seule géométrie fusionnée. Trois attributs par sommet
 * portent tout le reste : la couleur, la matière (rugosité, métal, éclat) et le
 * membre auquel il appartient — ce dernier sert au shader pour animer jambes,
 * bras, cape et plumet sans coût côté processeur.
 *
 * Trois niveaux de détail : « high » près de la caméra, « mid » à mi-terrain,
 * « low » (une centaine de triangles) pour la foule lointaine.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { sharedTime } from "./shared.ts";

/** Les soldats sont dessinés un peu plus grands que leur rayon de collision, pour une foule bien dense. */
export const SOLDIER_SCALE = 1.3;

export type Team = "blue" | "red";
export type Detail = "high" | "mid" | "low";

const BODY = 0;
const LEG_L = 1;
const LEG_R = 2;
const ARM_L = 3;
const ARM_R = 4;
const CAPE = 5;
const PLUME = 6;

/** Matière d'une pièce : rugosité, part métallique, éclat propre. */
type Surf = readonly [rough: number, metal: number, glow: number];
const CLOTH: Surf = [0.9, 0, 0];
const LEATHER: Surf = [0.72, 0, 0];
const SKIN: Surf = [0.62, 0, 0];
const BONE: Surf = [0.5, 0, 0];
const STEEL: Surf = [0.3, 0.7, 0];
const IRON: Surf = [0.48, 0.6, 0];
const GOLD: Surf = [0.26, 0.8, 0];
const ENAMEL: Surf = [0.3, 0.4, 0];
const FUR: Surf = [1, 0, 0];
const WOOD: Surf = [0.85, 0, 0];

type V3 = readonly [number, number, number];

/** Prépare une pièce : mise à l'échelle, rotation, translation, puis attributs. */
function P(
  geo: THREE.BufferGeometry,
  color: number,
  id: number,
  surf: Surf,
  t?: V3,
  r?: V3,
  s?: V3,
) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (s) g.scale(s[0], s[1], s[2]);
  if (r)
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r[0], r[1], r[2])));
  if (t) g.translate(t[0], t[1], t[2]);
  if (g.attributes.uv) g.deleteAttribute("uv");
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const mat = new Float32Array(n * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    mat[i * 3] = surf[0];
    mat[i * 3 + 1] = surf[1];
    mat[i * 3 + 2] = surf[2];
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aMat", new THREE.BufferAttribute(mat, 3));
  g.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(n).fill(id), 1));
  return g;
}

/** Profil tourné du buste : taille marquée, poitrine bombée, épaules rondes. */
function torso(segments: number, belly = 1, simple = false) {
  const pts: [number, number][] = simple
    ? [
        [0, 0.27],
        [0.15 * belly, 0.29],
        [0.18 * belly, 0.44],
        [0.14, 0.6],
        [0, 0.64],
      ]
    : [
        [0, 0.27],
        [0.12, 0.275],
        [0.158 * belly, 0.31],
        [0.172 * belly, 0.38],
        [0.165 * belly, 0.46],
        [0.178, 0.53],
        [0.16, 0.59],
        [0.1, 0.63],
        [0, 0.645],
      ];
  return new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
}

/** Cape : nappe courbe dans le dos, des épaules aux mollets. `flip` donne la face intérieure. */
function capeSheet(cols: number, rows: number, v0: number, v1: number, flip: boolean, long = 1) {
  const pos: number[] = [];
  const at = (u: number, v: number) => {
    const a = u * 0.95;
    const R = 0.2 + v * 0.1;
    return [Math.sin(a) * R, 0.61 - v * 0.46 * long, -Math.cos(a) * R - v * 0.03];
  };
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u0 = (i / cols) * 2 - 1;
      const u1 = ((i + 1) / cols) * 2 - 1;
      const va = v0 + ((v1 - v0) * j) / rows;
      const vb = v0 + ((v1 - v0) * (j + 1)) / rows;
      const a = at(u0, va);
      const b = at(u1, va);
      const c = at(u1, vb);
      const d = at(u0, vb);
      // Face visible de derrière (normale vers -z).
      const quad = flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
      for (const p of quad) pos.push(p[0], p[1], p[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Cimier : secteur d'anneau dressé sur le casque, dans le plan vertical
 * avant-arrière. Il part du front et retombe sur la nuque.
 */
function crestArc(inner: number, outer: number, thick: number, segments: number) {
  const s = new THREE.Shape();
  const a0 = 0.5;
  const a1 = Math.PI * 1.02;
  s.absarc(0, 0, outer, a0, a1, false);
  s.absarc(0, 0, inner, a1, a0, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: thick,
    bevelEnabled: false,
    curveSegments: segments,
  });
  g.translate(0, 0, -thick / 2);
  // Le plan de la forme (x, y) devient le plan (z, y) : +x de la forme → +z (le front).
  g.rotateY(-Math.PI / 2);
  return g;
}

/** Lame de hache en croissant, dans le plan vertical qui contient le manche. */
function axeBlade(up: boolean) {
  const s = new THREE.Shape();
  s.moveTo(-0.035, 0.015);
  s.lineTo(0.035, 0.015);
  s.quadraticCurveTo(0.06, 0.07, 0.115, 0.12);
  s.quadraticCurveTo(0, 0.2, -0.115, 0.12);
  s.quadraticCurveTo(-0.06, 0.07, -0.035, 0.015);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.018,
    bevelEnabled: false,
    curveSegments: 4,
  });
  g.translate(0, 0, -0.009);
  if (!up) g.rotateZ(Math.PI);
  g.rotateY(-Math.PI / 2);
  return g;
}

/** Aile de casque du champion. */
function helmetWing(side: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.1, 0.02, 0.2, 0.16);
  s.lineTo(0.13, 0.13);
  s.lineTo(0.15, 0.2);
  s.lineTo(0.08, 0.16);
  s.lineTo(0.08, 0.22);
  s.quadraticCurveTo(0, 0.12, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: false, curveSegments: 4 });
  g.rotateY(side > 0 ? -0.5 : Math.PI + 0.5);
  return g;
}

interface Build {
  giant?: boolean;
  /** Variantes : sans rondache, sans arme, sans bras (ils sont refaits par la variante). */
  noShield?: boolean;
  noWeapon?: boolean;
  noArms?: boolean;
}

// ---------------------------------------------------------------------------
// Gardien bleu
// ---------------------------------------------------------------------------

function guardian(detail: Detail, o: Build = {}): THREE.BufferGeometry[] {
  const g: THREE.BufferGeometry[] = [];
  const navy = 0x1c2f8a;
  const royal = 0x2f6bff;
  const steel = 0xdfe7f5;
  const mail = 0x93a0bd;
  const gold = 0xffc93d;
  const white = 0xffffff;
  const skin = 0xf6c9a0;
  const leather = 0x4a2f1c;
  const armor = o.giant ? gold : royal;
  const armorSurf = o.giant ? GOLD : ENAMEL;

  if (detail === "low") {
    for (const [side, id] of [
      [-1, LEG_L],
      [1, LEG_R],
    ] as const) {
      g.push(
        P(new THREE.BoxGeometry(0.11, 0.3, 0.12), navy, id, CLOTH, [side * 0.075, 0.15, 0.01]),
      );
      g.push(
        P(new THREE.BoxGeometry(0.08, 0.26, 0.09), mail, id + 2, IRON, [side * 0.215, 0.46, 0]),
      );
    }
    g.push(P(new THREE.CylinderGeometry(0.14, 0.175, 0.36, 5), royal, BODY, ENAMEL, [0, 0.46, 0]));
    g.push(P(new THREE.IcosahedronGeometry(0.165, 0), skin, BODY, SKIN, [0, 0.77, 0.01]));
    g.push(
      P(
        new THREE.CylinderGeometry(0.05, 0.185, 0.15, 5, 1, true),
        royal,
        BODY,
        ENAMEL,
        [0, 0.87, 0],
      ),
    );
    g.push(
      P(
        new THREE.BoxGeometry(0.05, 0.12, 0.22),
        white,
        PLUME,
        CLOTH,
        [0, 1.0, -0.08],
        [-0.4, 0, 0],
      ),
    );
    g.push(P(capeSheet(1, 1, 0, 1, false), royal, CAPE, CLOTH));
    g.push(
      P(new THREE.BoxGeometry(0.03, 0.28, 0.28), 0x9cc8ff, ARM_L, ENAMEL, [-0.285, 0.44, 0.03]),
    );
    g.push(P(new THREE.BoxGeometry(0.03, 0.02, 0.36), steel, ARM_R, STEEL, [0.215, 0.33, 0.22]));
    return g;
  }

  const hi = detail === "high";
  const seg = hi ? 10 : 6;

  // Jambes : braies, grèves d'acier, bottes
  for (const [side, id] of [
    [-1, LEG_L],
    [1, LEG_R],
  ] as const) {
    const x = side * 0.078;
    if (hi) {
      g.push(P(new THREE.CapsuleGeometry(0.058, 0.13, 1, 6), navy, id, CLOTH, [x, 0.215, 0]));
      g.push(
        P(new THREE.CylinderGeometry(0.068, 0.058, 0.13, 6, 1, true), steel, id, STEEL, [
          x,
          0.135,
          0.004,
        ]),
      );
      g.push(
        P(new THREE.CylinderGeometry(0.073, 0.073, 0.024, 6, 1, true), gold, id, GOLD, [
          x,
          0.2,
          0.004,
        ]),
      );
      g.push(
        P(
          new THREE.SphereGeometry(0.07, 6, 4),
          leather,
          id,
          LEATHER,
          [x, 0.05, 0.03],
          undefined,
          [1, 0.72, 1.5],
        ),
      );
    } else {
      g.push(
        P(new THREE.CylinderGeometry(0.062, 0.055, 0.26, 5, 1, true), navy, id, CLOTH, [x, 0.2, 0]),
      );
      g.push(P(new THREE.BoxGeometry(0.12, 0.1, 0.19), leather, id, LEATHER, [x, 0.05, 0.028]));
    }
  }

  // Buste : cuirasse émaillée, ceinture, tabard blanc
  g.push(P(torso(seg, 1, !hi), armor, BODY, armorSurf));
  g.push(
    P(
      new THREE.CylinderGeometry(0.176, 0.176, 0.05, seg, 1, true),
      leather,
      BODY,
      LEATHER,
      [0, 0.33, 0],
    ),
  );
  g.push(P(new THREE.BoxGeometry(0.065, 0.055, 0.03), gold, BODY, GOLD, [0, 0.33, 0.178]));
  g.push(
    P(new THREE.BoxGeometry(0.15, 0.17, 0.02), white, BODY, CLOTH, [0, 0.235, 0.152], [0.14, 0, 0]),
  );
  if (hi) {
    // Emblème : étoile dorée sur la poitrine
    g.push(
      P(
        new THREE.OctahedronGeometry(0.05, 0),
        o.giant ? 0x4fd8ff : gold,
        BODY,
        o.giant ? ([0.2, 0.2, 1.6] as Surf) : GOLD,
        [0, 0.5, 0.168],
        undefined,
        [1, 1, 0.45],
      ),
    );
    // Tassettes sur les hanches
    for (const a of [-1.15, 1.15, -2.2, 2.2]) {
      g.push(
        P(
          new THREE.BoxGeometry(0.1, 0.11, 0.022),
          steel,
          BODY,
          STEEL,
          [Math.sin(a) * 0.168, 0.265, Math.cos(a) * 0.168],
          [0, a, 0],
        ),
      );
    }
    // Gorgerin
    g.push(
      P(
        new THREE.TorusGeometry(0.098, 0.03, 4, 8),
        gold,
        BODY,
        GOLD,
        [0, 0.635, 0],
        [Math.PI / 2, 0, 0],
      ),
    );
  }

  // Épaulières
  for (const side of [-1, 1]) {
    const r = o.giant ? 0.125 : 0.1;
    g.push(
      P(
        new THREE.SphereGeometry(r, hi ? 8 : 6, 3, 0, Math.PI * 2, 0, Math.PI / 2),
        o.giant ? gold : steel,
        BODY,
        o.giant ? GOLD : STEEL,
        [side * 0.2, 0.58, 0],
      ),
    );
    if (hi)
      g.push(
        P(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.022, 8, 1, true), gold, BODY, GOLD, [
          side * 0.2,
          0.588,
          0,
        ]),
      );
    if (o.giant)
      g.push(
        P(
          new THREE.ConeGeometry(0.03, 0.11, 5),
          gold,
          BODY,
          GOLD,
          [side * 0.24, 0.72, 0],
          [0, 0, -side * 0.5],
        ),
      );
  }

  // Bras : cotte de mailles, gantelets
  for (const [side, id] of [
    [-1, ARM_L],
    [1, ARM_R],
  ] as const) {
    const x = side * 0.225;
    if (hi) {
      g.push(P(new THREE.CapsuleGeometry(0.044, 0.12, 1, 6), mail, id, IRON, [x, 0.475, 0]));
      g.push(
        P(new THREE.CylinderGeometry(0.056, 0.048, 0.085, 6, 1, true), steel, id, STEEL, [
          x,
          0.39,
          0,
        ]),
      );
      g.push(P(new THREE.SphereGeometry(0.052, 6, 4), steel, id, STEEL, [x, 0.335, 0.005]));
    } else {
      g.push(P(new THREE.CylinderGeometry(0.046, 0.05, 0.26, 5), mail, id, IRON, [x, 0.455, 0]));
    }
  }

  // Bouclier rond au bras gauche
  const sx = -0.3;
  g.push(
    P(
      new THREE.CylinderGeometry(0.17, 0.17, 0.03, hi ? 12 : 8),
      royal,
      ARM_L,
      ENAMEL,
      [sx, 0.44, 0.03],
      [0, 0, Math.PI / 2],
    ),
  );
  g.push(
    P(
      new THREE.TorusGeometry(0.17, 0.018, hi ? 4 : 3, hi ? 12 : 8),
      gold,
      ARM_L,
      GOLD,
      [sx, 0.44, 0.03],
      [0, Math.PI / 2, 0],
    ),
  );
  if (hi) {
    g.push(
      P(
        new THREE.SphereGeometry(0.05, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2),
        gold,
        ARM_L,
        GOLD,
        [sx - 0.012, 0.44, 0.03],
        [0, 0, Math.PI / 2],
      ),
    );
    g.push(
      P(new THREE.BoxGeometry(0.012, 0.25, 0.045), white, ARM_L, ENAMEL, [sx - 0.018, 0.44, 0.03]),
    );
    g.push(
      P(new THREE.BoxGeometry(0.012, 0.045, 0.25), white, ARM_L, ENAMEL, [sx - 0.018, 0.44, 0.03]),
    );
  } else {
    g.push(P(new THREE.BoxGeometry(0.02, 0.08, 0.08), gold, ARM_L, GOLD, [sx - 0.02, 0.44, 0.03]));
  }

  // Épée au bras droit
  const wx = 0.225;
  const bl = o.giant ? 0.56 : 0.36;
  if (hi) {
    g.push(
      P(
        new THREE.CylinderGeometry(0.015, 0.015, 0.09, 5),
        leather,
        ARM_R,
        LEATHER,
        [wx, 0.335, 0.035],
        [Math.PI / 2, 0, 0],
      ),
    );
    g.push(P(new THREE.SphereGeometry(0.024, 5, 3), gold, ARM_R, GOLD, [wx, 0.335, -0.02]));
    g.push(P(new THREE.BoxGeometry(0.15, 0.028, 0.032), gold, ARM_R, GOLD, [wx, 0.335, 0.09]));
    g.push(
      P(
        new THREE.CylinderGeometry(0.012, 0.028, bl, 4),
        0xf4f8ff,
        ARM_R,
        [0.16, 0.8, 0] as Surf,
        [wx, 0.335, 0.1 + bl / 2],
        [Math.PI / 2, 0, 0],
        [1, 1, 0.32],
      ),
    );
  } else {
    g.push(P(new THREE.BoxGeometry(0.13, 0.026, 0.03), gold, ARM_R, GOLD, [wx, 0.335, 0.09]));
    g.push(
      P(new THREE.BoxGeometry(0.035, 0.012, bl), 0xf4f8ff, ARM_R, STEEL, [wx, 0.335, 0.1 + bl / 2]),
    );
  }

  // Tête et visage
  g.push(
    P(
      new THREE.SphereGeometry(0.162, hi ? 10 : 7, hi ? 7 : 5),
      skin,
      BODY,
      SKIN,
      [0, 0.79, 0.005],
      undefined,
      [1, 0.96, 0.98],
    ),
  );
  for (const side of [-1, 1]) {
    if (hi) {
      g.push(
        P(
          new THREE.SphereGeometry(0.036, 6, 4),
          white,
          BODY,
          [0.25, 0, 0] as Surf,
          [side * 0.06, 0.775, 0.136],
          undefined,
          [1, 1.1, 0.55],
        ),
      );
      g.push(
        P(
          new THREE.SphereGeometry(0.021, 5, 3),
          0x16204a,
          BODY,
          [0.2, 0, 0] as Surf,
          [side * 0.06, 0.772, 0.153],
          undefined,
          [1, 1.1, 0.5],
        ),
      );
      g.push(
        P(new THREE.OctahedronGeometry(0.009, 0), white, BODY, [0.2, 0, 0.6] as Surf, [
          side * 0.053,
          0.782,
          0.164,
        ]),
      );
      g.push(
        P(
          new THREE.BoxGeometry(0.055, 0.013, 0.014),
          0x6b4423,
          BODY,
          SKIN,
          [side * 0.06, 0.823, 0.146],
          [0, 0, -side * 0.16],
        ),
      );
    } else {
      g.push(
        P(new THREE.BoxGeometry(0.036, 0.045, 0.02), 0x16204a, BODY, SKIN, [
          side * 0.058,
          0.775,
          0.148,
        ]),
      );
    }
  }
  if (hi)
    g.push(P(new THREE.BoxGeometry(0.045, 0.013, 0.012), 0x8a4a3a, BODY, SKIN, [0, 0.712, 0.152]));

  // Casque : calotte, bandeau doré, cimier, garde-joues, nasal
  const hy = 0.805;
  g.push(
    P(
      new THREE.SphereGeometry(0.18, hi ? 10 : 7, hi ? 4 : 3, 0, Math.PI * 2, 0, Math.PI * 0.5),
      armor,
      BODY,
      armorSurf,
      [0, hy, 0],
    ),
  );
  g.push(
    P(new THREE.CylinderGeometry(0.193, 0.193, 0.036, hi ? 10 : 7, 1, true), gold, BODY, GOLD, [
      0,
      hy + 0.008,
      0,
    ]),
  );
  if (hi) {
    for (const side of [-1, 1]) {
      g.push(
        P(new THREE.BoxGeometry(0.03, 0.12, 0.1), armor, BODY, armorSurf, [
          side * 0.165,
          0.745,
          0.035,
        ]),
      );
    }
    g.push(P(new THREE.BoxGeometry(0.028, 0.1, 0.022), gold, BODY, GOLD, [0, 0.795, 0.172]));
  }

  // Cimier : crinière blanche en arc sur le casque, liseré à la couleur du rang
  const tip = o.giant ? gold : royal;
  if (hi) {
    g.push(P(crestArc(0.175, 0.2, 0.05, 8), gold, BODY, GOLD, [0, hy, 0]));
    g.push(P(crestArc(0.2, 0.3, 0.06, 8), white, PLUME, CLOTH, [0, hy, 0]));
    g.push(P(crestArc(0.3, 0.325, 0.064, 8), tip, PLUME, CLOTH, [0, hy, 0]));
  } else {
    g.push(P(crestArc(0.18, 0.3, 0.06, 3), white, PLUME, CLOTH, [0, hy, 0]));
    g.push(P(crestArc(0.3, 0.325, 0.064, 3), tip, PLUME, CLOTH, [0, hy, 0]));
  }

  // Cape bleu roi à ourlet doré (face extérieure et doublure)
  const long = o.giant ? 1.12 : 1;
  if (hi) {
    g.push(P(capeSheet(6, 5, 0, 0.88, false, long), o.giant ? 0x1a3fb8 : royal, CAPE, CLOTH));
    g.push(P(capeSheet(6, 1, 0.88, 1, false, long), gold, CAPE, [0.5, 0.5, 0] as Surf));
    g.push(P(capeSheet(6, 5, 0, 1, true, long), navy, CAPE, CLOTH));
  } else {
    g.push(P(capeSheet(3, 2, 0, 0.86, false, long), royal, CAPE, CLOTH));
    g.push(P(capeSheet(3, 1, 0.86, 1, false, long), gold, CAPE, CLOTH));
  }

  if (o.giant) {
    // Champion : couronne, ailes au casque
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.push(
        P(new THREE.ConeGeometry(0.024, 0.09, 4), gold, BODY, GOLD, [
          Math.cos(a) * 0.175,
          hy + 0.07,
          Math.sin(a) * 0.175,
        ]),
      );
    }
    for (const side of [-1, 1]) {
      g.push(P(helmetWing(side), white, BODY, ENAMEL, [side * 0.17, hy + 0.01, -0.02]));
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Pillard rouge
// ---------------------------------------------------------------------------

function raider(detail: Detail, o: Build = {}): THREE.BufferGeometry[] {
  const g: THREE.BufferGeometry[] = [];
  const red = 0xd3232c;
  const darkRed = 0x8e1219;
  const skin = 0x86b85a;
  const skinDark = 0x6a9a48;
  const leather = 0x3d2618;
  const fur = 0x6b4a2e;
  const iron = 0x5a5560;
  const bone = 0xf2e7c9;
  const wood = 0x7a5230;
  const eye = 0xffe23a;

  if (detail === "low") {
    for (const [side, id] of [
      [-1, LEG_L],
      [1, LEG_R],
    ] as const) {
      g.push(
        P(new THREE.BoxGeometry(0.11, 0.3, 0.12), leather, id, LEATHER, [side * 0.075, 0.15, 0.01]),
      );
      if (!o.noArms)
        g.push(
          P(new THREE.BoxGeometry(0.085, 0.26, 0.09), skin, id + 2, SKIN, [side * 0.22, 0.46, 0]),
        );
    }
    g.push(P(new THREE.CylinderGeometry(0.15, 0.18, 0.36, 5), red, BODY, LEATHER, [0, 0.46, 0]));
    g.push(P(new THREE.IcosahedronGeometry(0.17, 0), skin, BODY, SKIN, [0, 0.77, 0.01]));
    g.push(
      P(
        new THREE.CylinderGeometry(0.05, 0.19, 0.14, 5, 1, true),
        darkRed,
        BODY,
        IRON,
        [0, 0.87, 0],
      ),
    );
    for (const side of [-1, 1]) {
      g.push(
        P(
          new THREE.ConeGeometry(0.04, 0.2, 3),
          bone,
          BODY,
          BONE,
          [side * 0.21, 0.96, 0],
          [0, 0, -side * 0.7],
        ),
      );
    }
    if (!o.noShield)
      g.push(P(new THREE.BoxGeometry(0.03, 0.26, 0.26), wood, ARM_L, WOOD, [-0.29, 0.44, 0.03]));
    if (!o.noWeapon)
      g.push(
        P(new THREE.BoxGeometry(0.03, 0.24, 0.13), 0xc5cad2, ARM_R, STEEL, [0.22, 0.34, 0.34]),
      );
    return g;
  }

  const hi = detail === "high";
  const seg = hi ? 10 : 6;

  // Jambes nues, bandelettes, bottes fourrées
  for (const [side, id] of [
    [-1, LEG_L],
    [1, LEG_R],
  ] as const) {
    const x = side * 0.08;
    if (hi) {
      g.push(P(new THREE.CapsuleGeometry(0.06, 0.13, 1, 6), skin, id, SKIN, [x, 0.215, 0]));
      g.push(
        P(new THREE.CylinderGeometry(0.066, 0.066, 0.03, 6, 1, true), leather, id, LEATHER, [
          x,
          0.2,
          0,
        ]),
      );
      g.push(
        P(
          new THREE.SphereGeometry(0.072, 6, 4),
          leather,
          id,
          LEATHER,
          [x, 0.05, 0.03],
          undefined,
          [1, 0.75, 1.5],
        ),
      );
      g.push(
        P(
          new THREE.TorusGeometry(0.066, 0.026, 3, 6),
          fur,
          id,
          FUR,
          [x, 0.115, 0.005],
          [Math.PI / 2, 0, 0],
        ),
      );
    } else {
      g.push(
        P(new THREE.CylinderGeometry(0.064, 0.056, 0.26, 5, 1, true), skin, id, SKIN, [x, 0.2, 0]),
      );
      g.push(P(new THREE.BoxGeometry(0.125, 0.11, 0.19), leather, id, LEATHER, [x, 0.055, 0.028]));
    }
  }

  // Buste : cuir laqué rouge, sangles croisées, pagne
  const belly = o.giant ? 1.22 : 1.06;
  g.push(P(torso(seg, belly, !hi), red, BODY, LEATHER));
  g.push(
    P(
      new THREE.CylinderGeometry(0.184 * belly, 0.184 * belly, 0.06, seg, 1, true),
      leather,
      BODY,
      LEATHER,
      [0, 0.335, 0],
    ),
  );
  g.push(
    P(
      new THREE.BoxGeometry(0.17, 0.2, 0.022),
      darkRed,
      BODY,
      CLOTH,
      [0, 0.22, 0.158 * belly],
      [0.14, 0, 0],
    ),
  );
  g.push(
    P(
      new THREE.BoxGeometry(0.17, 0.2, 0.022),
      darkRed,
      BODY,
      CLOTH,
      [0, 0.22, -0.158 * belly],
      [-0.14, 0, 0],
    ),
  );
  if (hi) {
    for (const s of [-1, 1]) {
      g.push(
        P(
          new THREE.BoxGeometry(0.045, 0.36, 0.02),
          leather,
          BODY,
          LEATHER,
          [0, 0.48, 0.17 * belly],
          [0, 0, s * 0.62],
        ),
      );
    }
    g.push(
      P(
        new THREE.CylinderGeometry(0.05, 0.05, 0.03, 6),
        iron,
        BODY,
        IRON,
        [0, 0.48, 0.18 * belly],
        [Math.PI / 2, 0, 0],
      ),
    );
    // Boucle en os
    g.push(
      P(
        new THREE.SphereGeometry(0.04, 5, 3),
        bone,
        BODY,
        BONE,
        [0, 0.335, 0.19 * belly],
        undefined,
        [1, 1, 0.6],
      ),
    );
  }

  // Col de fourrure
  g.push(
    P(
      new THREE.TorusGeometry(0.135, 0.065, hi ? 5 : 4, hi ? 9 : 7),
      fur,
      BODY,
      FUR,
      [0, 0.61, -0.01],
      [Math.PI / 2, 0, 0],
    ),
  );
  if (hi) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.push(
        P(
          new THREE.ConeGeometry(0.04, 0.1, 3),
          fur,
          BODY,
          FUR,
          [Math.cos(a) * 0.19, 0.565, Math.sin(a) * 0.19 - 0.01],
          [Math.sin(a) * 2.2, 0, -Math.cos(a) * 2.2],
        ),
      );
    }
  }

  // Épaulière de fer à pointes (droite seulement : silhouette asymétrique)
  const spiked = o.giant ? [-1, 1] : [1];
  for (const side of spiked) {
    g.push(
      P(
        new THREE.SphereGeometry(0.115, hi ? 8 : 6, 3, 0, Math.PI * 2, 0, Math.PI / 2),
        iron,
        BODY,
        IRON,
        [side * 0.215, 0.6, 0],
      ),
    );
    const n = hi ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const a = n === 1 ? 0 : (k - 1) * 0.7;
      g.push(
        P(
          new THREE.ConeGeometry(0.028, 0.12, 4),
          bone,
          BODY,
          BONE,
          [side * (0.235 + Math.abs(a) * 0.02), 0.71 - Math.abs(a) * 0.03, Math.sin(a) * 0.09],
          [a * 0.8, 0, -side * 0.45],
        ),
      );
    }
  }

  // Bras nus, bracelets de fer
  for (const [side, id] of [
    [-1, ARM_L],
    [1, ARM_R],
  ] as const) {
    if (o.noArms) break;
    const x = side * 0.23;
    if (hi) {
      g.push(P(new THREE.CapsuleGeometry(0.05, 0.12, 1, 6), skin, id, SKIN, [x, 0.475, 0]));
      g.push(
        P(new THREE.CylinderGeometry(0.058, 0.054, 0.07, 6, 1, true), iron, id, IRON, [x, 0.4, 0]),
      );
      g.push(P(new THREE.SphereGeometry(0.055, 6, 4), skinDark, id, SKIN, [x, 0.335, 0.005]));
    } else {
      g.push(P(new THREE.CylinderGeometry(0.05, 0.055, 0.27, 5), skin, id, SKIN, [x, 0.455, 0]));
    }
  }

  // Rondache de bois cerclée de fer, pointe centrale
  const sx = -0.305;
  if (!o.noShield) {
    g.push(
      P(
        new THREE.CylinderGeometry(0.155, 0.155, 0.032, hi ? 12 : 7),
        wood,
        ARM_L,
        WOOD,
        [sx, 0.44, 0.03],
        [0, 0, Math.PI / 2],
      ),
    );
    g.push(
      P(
        new THREE.TorusGeometry(0.155, 0.02, hi ? 4 : 3, hi ? 12 : 7),
        iron,
        ARM_L,
        IRON,
        [sx, 0.44, 0.03],
        [0, Math.PI / 2, 0],
      ),
    );
    g.push(
      P(
        new THREE.ConeGeometry(0.045, 0.11, hi ? 6 : 4),
        iron,
        ARM_L,
        IRON,
        [sx - 0.065, 0.44, 0.03],
        [0, 0, Math.PI / 2],
      ),
    );
    if (hi) {
      g.push(
        P(
          new THREE.BoxGeometry(0.012, 0.29, 0.05),
          darkRed,
          ARM_L,
          CLOTH,
          [sx - 0.018, 0.44, 0.03],
          [0.6, 0, 0],
        ),
      );
    }
  }

  // Arme : hache double, ou massue cloutée pour le colosse
  const wx = 0.23;
  if (o.noWeapon) {
    // rien : la variante tient autre chose
  } else if (o.giant) {
    g.push(
      P(
        new THREE.CylinderGeometry(0.075, 0.03, 0.52, 7),
        wood,
        ARM_R,
        WOOD,
        [wx, 0.335, 0.24],
        [Math.PI / 2, 0, 0],
      ),
    );
    for (let k = 0; k < 10; k++) {
      const a = (k / 5) * Math.PI * 2;
      const z = 0.3 + (k % 2) * 0.12 + Math.floor(k / 5) * 0.06;
      g.push(
        P(
          new THREE.ConeGeometry(0.022, 0.08, 4),
          0xc9ccd2,
          ARM_R,
          STEEL,
          [wx + Math.cos(a) * 0.085, 0.335 + Math.sin(a) * 0.085, z],
          [0, 0, a - Math.PI / 2],
        ),
      );
    }
    g.push(P(new THREE.TorusGeometry(0.07, 0.015, 4, 8), iron, ARM_R, IRON, [wx, 0.335, 0.44]));
  } else {
    g.push(
      P(
        new THREE.CylinderGeometry(0.017, 0.017, 0.5, hi ? 6 : 4),
        wood,
        ARM_R,
        WOOD,
        [wx, 0.335, 0.17],
        [Math.PI / 2, 0, 0],
      ),
    );
    if (hi) {
      g.push(P(axeBlade(true), 0xc5cad2, ARM_R, STEEL, [wx, 0.335, 0.33]));
      g.push(P(axeBlade(false), 0xc5cad2, ARM_R, STEEL, [wx, 0.335, 0.33]));
      g.push(
        P(
          new THREE.ConeGeometry(0.02, 0.08, 5),
          iron,
          ARM_R,
          IRON,
          [wx, 0.335, 0.46],
          [Math.PI / 2, 0, 0],
        ),
      );
      g.push(
        P(
          new THREE.CylinderGeometry(0.03, 0.03, 0.07, 6),
          iron,
          ARM_R,
          IRON,
          [wx, 0.335, 0.33],
          [Math.PI / 2, 0, 0],
        ),
      );
    } else {
      g.push(P(new THREE.BoxGeometry(0.016, 0.3, 0.14), 0xc5cad2, ARM_R, STEEL, [wx, 0.335, 0.34]));
    }
  }

  // Tête : mâchoire lourde, oreilles pointues, défenses, yeux luisants
  g.push(
    P(
      new THREE.SphereGeometry(0.168, hi ? 10 : 7, hi ? 7 : 5),
      skin,
      BODY,
      SKIN,
      [0, 0.79, 0.005],
      undefined,
      [1.06, 0.93, 1],
    ),
  );
  if (hi)
    g.push(
      P(
        new THREE.SphereGeometry(0.115, 8, 5),
        skinDark,
        BODY,
        SKIN,
        [0, 0.715, 0.055],
        undefined,
        [1.12, 0.66, 1],
      ),
    );
  for (const side of [-1, 1]) {
    g.push(
      P(
        new THREE.ConeGeometry(0.05, 0.17, hi ? 6 : 4),
        skin,
        BODY,
        SKIN,
        [side * 0.215, 0.8, -0.01],
        [0, 0, -side * 1.25],
        [1, 1, 0.45],
      ),
    );
    g.push(
      P(
        new THREE.ConeGeometry(0.022, 0.085, hi ? 5 : 3),
        bone,
        BODY,
        BONE,
        [side * 0.07, 0.735, 0.142],
        [0.25, 0, side * 0.15],
      ),
    );
    if (hi) {
      g.push(
        P(
          new THREE.SphereGeometry(0.038, 6, 4),
          eye,
          BODY,
          [0.3, 0, 1.3] as Surf,
          [side * 0.064, 0.782, 0.142],
          [0, 0, side * 0.35],
          [1.25, 0.62, 0.5],
        ),
      );
      g.push(
        P(new THREE.BoxGeometry(0.013, 0.034, 0.01), 0x20140c, BODY, SKIN, [
          side * 0.062,
          0.782,
          0.163,
        ]),
      );
      g.push(
        P(
          new THREE.BoxGeometry(0.08, 0.022, 0.03),
          0x35501f,
          BODY,
          SKIN,
          [side * 0.062, 0.818, 0.146],
          [0, 0, side * 0.4],
        ),
      );
    } else {
      g.push(
        P(
          new THREE.BoxGeometry(0.055, 0.036, 0.02),
          eye,
          BODY,
          [0.3, 0, 1.3] as Surf,
          [side * 0.062, 0.782, 0.153],
          [0, 0, side * 0.35],
        ),
      );
    }
  }
  if (hi)
    g.push(
      P(
        new THREE.SphereGeometry(0.03, 5, 3),
        skinDark,
        BODY,
        SKIN,
        [0, 0.752, 0.166],
        undefined,
        [1.3, 0.8, 0.8],
      ),
    );

  // Casque de fer laqué rouge, cornes recourbées
  const hy = 0.845;
  g.push(
    P(
      new THREE.SphereGeometry(0.184, hi ? 10 : 7, hi ? 4 : 3, 0, Math.PI * 2, 0, Math.PI * 0.46),
      darkRed,
      BODY,
      ENAMEL,
      [0, hy, 0],
      undefined,
      [1.04, 1, 1],
    ),
  );
  g.push(
    P(new THREE.CylinderGeometry(0.192, 0.192, 0.04, hi ? 10 : 7, 1, true), iron, BODY, IRON, [
      0,
      hy + 0.01,
      0,
    ]),
  );
  if (hi) g.push(P(new THREE.BoxGeometry(0.03, 0.07, 0.022), iron, BODY, IRON, [0, 0.835, 0.185]));
  const hs = o.giant ? 1.25 : 1;
  for (const side of [-1, 1]) {
    if (hi) {
      g.push(
        P(
          new THREE.CylinderGeometry(0.036 * hs, 0.048 * hs, 0.11 * hs, 6),
          bone,
          BODY,
          BONE,
          [side * 0.2, 0.925, 0],
          [0, 0, -side * 1.05],
        ),
      );
      g.push(
        P(
          new THREE.CylinderGeometry(0.024 * hs, 0.036 * hs, 0.11 * hs, 6),
          bone,
          BODY,
          BONE,
          [side * (0.2 + 0.085 * hs), 0.925 + 0.075 * hs, 0.005],
          [0, 0, -side * 0.5],
        ),
      );
      g.push(
        P(
          new THREE.ConeGeometry(0.024 * hs, 0.12 * hs, 6),
          bone,
          BODY,
          BONE,
          [side * (0.2 + 0.125 * hs), 0.925 + 0.175 * hs, 0.01],
          [0, 0, side * 0.05],
        ),
      );
    } else {
      g.push(
        P(
          new THREE.ConeGeometry(0.045, 0.14, 4),
          bone,
          BODY,
          BONE,
          [side * 0.215, 0.945, 0],
          [0, 0, -side * 1.0],
        ),
      );
      g.push(
        P(
          new THREE.ConeGeometry(0.03, 0.14, 4),
          bone,
          BODY,
          BONE,
          [side * 0.29, 1.045, 0],
          [0, 0, -side * 0.15],
        ),
      );
    }
  }
  g.push(P(new THREE.ConeGeometry(0.035, 0.11, hi ? 6 : 4), iron, BODY, IRON, [0, hy + 0.2, 0]));

  if (o.giant) {
    // Colosse : étendard dans le dos, crânes à la ceinture, chaîne
    g.push(
      P(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 5), wood, BODY, WOOD, [0.06, 0.95, -0.2]),
    );
    g.push(P(new THREE.BoxGeometry(0.012, 0.3, 0.26), red, CAPE, CLOTH, [0.06, 1.22, -0.34]));
    g.push(
      P(
        new THREE.BoxGeometry(0.014, 0.1, 0.1),
        bone,
        CAPE,
        BONE,
        [0.06, 1.24, -0.34],
        [Math.PI / 4, 0, 0],
      ),
    );
    g.push(P(new THREE.SphereGeometry(0.045, 6, 5), bone, BODY, BONE, [0.06, 1.46, -0.2]));
    for (const a of [-0.9, 0.9]) {
      g.push(
        P(new THREE.SphereGeometry(0.045, 6, 5), bone, BODY, BONE, [
          Math.sin(a) * 0.23,
          0.3,
          Math.cos(a) * 0.21,
        ]),
      );
    }
    g.push(
      P(
        new THREE.TorusGeometry(0.2, 0.016, 4, 12),
        iron,
        BODY,
        IRON,
        [0, 0.47, 0],
        [Math.PI / 2 - 0.5, 0, 0.3],
      ),
    );
  }
  return g;
}

export function buildSoldierGeometry(team: Team, detail: Detail = "high") {
  const parts = team === "blue" ? guardian(detail) : raider(detail);
  const merged = mergeGeometries(parts, false);
  merged.scale(SOLDIER_SCALE, SOLDIER_SCALE, SOLDIER_SCALE);
  merged.computeBoundingSphere();
  return merged;
}

export type RaiderRole = "shield" | "bomber";

/**
 * Variantes de pillards. Le porte-pavois avance derrière un grand bouclier
 * de fer : il faut plusieurs soldats pour en venir à bout. L'artificier porte
 * une bombe à mèche allumée au-dessus de sa tête et explose au contact.
 * L'échelle propre à chaque rôle est appliquée par l'instance, pas ici, pour
 * que l'animation des membres garde ses pivots.
 */
export function buildRaiderVariant(role: RaiderRole, detail: "mid" | "low" = "mid") {
  const g = raider(detail, {
    noShield: true,
    noWeapon: true,
    noArms: role === "bomber",
  });
  const fine = detail !== "low";
  const iron = 0x6a6672;
  const darkRed = 0x8e1219;
  if (role === "shield") {
    // Pavois : grande plaque d'acier clair cerclée d'or, chevron rouge, pointes d'os.
    // Clair et bordé d'or pour se détacher de la masse rouge et verte.
    g.push(P(new THREE.BoxGeometry(0.52, 0.66, 0.05), 0xaab2bf, BODY, STEEL, [0, 0.44, 0.27]));
    g.push(P(new THREE.BoxGeometry(0.56, 0.06, 0.07), 0xd9a23a, BODY, GOLD, [0, 0.77, 0.27]));
    g.push(P(new THREE.BoxGeometry(0.56, 0.06, 0.07), 0xd9a23a, BODY, GOLD, [0, 0.11, 0.27]));
    for (const s of [-1, 1])
      g.push(
        P(new THREE.BoxGeometry(0.05, 0.6, 0.07), 0xd9a23a, BODY, GOLD, [s * 0.265, 0.44, 0.27]),
      );
    if (fine) {
      for (const s of [-1, 1]) {
        g.push(
          P(
            new THREE.BoxGeometry(0.3, 0.08, 0.02),
            0xd3232c,
            BODY,
            ENAMEL,
            [s * 0.11, 0.46, 0.3],
            [0, 0, s * 0.6],
          ),
        );
        g.push(
          P(
            new THREE.ConeGeometry(0.035, 0.1, 4),
            0xd8d2c0,
            BODY,
            BONE,
            [s * 0.17, 0.62, 0.33],
            [Math.PI / 2, 0, 0],
          ),
        );
        g.push(
          P(
            new THREE.ConeGeometry(0.035, 0.1, 4),
            0xd8d2c0,
            BODY,
            BONE,
            [s * 0.17, 0.26, 0.33],
            [Math.PI / 2, 0, 0],
          ),
        );
      }
      g.push(
        P(
          new THREE.ConeGeometry(0.05, 0.14, 5),
          0xd8d2c0,
          BODY,
          BONE,
          [0, 0.44, 0.34],
          [Math.PI / 2, 0, 0],
        ),
      );
      // Visière de fer : on ne voit que les yeux.
      g.push(P(new THREE.BoxGeometry(0.3, 0.09, 0.03), iron, BODY, IRON, [0, 0.72, 0.16]));
    }
  } else {
    // Bombe à mèche portée à bout de bras au-dessus de la tête.
    g.push(
      P(
        new THREE.SphereGeometry(0.2, fine ? 10 : 6, fine ? 7 : 4),
        0x24262e,
        BODY,
        [0.35, 0.6, 0] as Surf,
        [0, 1.22, 0.02],
      ),
    );
    g.push(
      P(new THREE.CylinderGeometry(0.045, 0.06, 0.07, 6), 0x8a8f9c, BODY, IRON, [0, 1.43, 0.02]),
    );
    g.push(
      P(
        new THREE.OctahedronGeometry(0.07, 0),
        0xffd24a,
        BODY,
        [0.3, 0, 2.4] as Surf,
        [0.02, 1.52, 0.03],
      ),
    );
    for (const s of [-1, 1]) {
      g.push(
        P(
          new THREE.CylinderGeometry(0.04, 0.045, 0.42, 5),
          0x86b85a,
          BODY,
          SKIN,
          [s * 0.17, 0.86, 0.01],
          [0, 0, s * 0.42],
        ),
      );
    }
    if (fine) {
      g.push(
        P(
          new THREE.TorusGeometry(0.2, 0.018, 4, 10),
          0xc4222b,
          BODY,
          ENAMEL,
          [0, 1.22, 0.02],
          [Math.PI / 2, 0, 0],
        ),
      );
    }
  }
  const merged = mergeGeometries(g, false);
  merged.scale(SOLDIER_SCALE, SOLDIER_SCALE, SOLDIER_SCALE);
  merged.computeBoundingSphere();
  return merged;
}

/** Champion bleu (armure d'or, couronne ailée) et colosse rouge (massue, étendard). */
export function buildGiantGeometry(team: Team) {
  const parts =
    team === "blue" ? guardian("high", { giant: true }) : raider("high", { giant: true });
  const merged = mergeGeometries(parts, false);
  merged.scale(SOLDIER_SCALE, SOLDIER_SCALE, SOLDIER_SCALE);
  merged.computeBoundingSphere();
  return merged;
}

// ---------------------------------------------------------------------------
// Matériaux
// ---------------------------------------------------------------------------

/**
 * Pivots de l'animation, en unités du jeu : hauteur des hanches (jambes), des
 * épaules (bras), haut et longueur de la cape. Chaque modèle a les siens.
 */
export interface Pose {
  hip: number;
  shoulder: number;
  capeTop: number;
  capeLength: number;
}

/** Pivots des soldats construits en code. */
export const DEFAULT_POSE: Pose = {
  hip: 0.31 * SOLDIER_SCALE,
  shoulder: 0.58 * SOLDIER_SCALE,
  capeTop: 0.62 * SOLDIER_SCALE,
  capeLength: 0.5 * SOLDIER_SCALE,
};

const f = (v: number) => v.toFixed(4);
const poseKey = (p: Pose) => [p.hip, p.shoulder, p.capeTop, p.capeLength].map(f).join("/");

/** Animation commune au rendu et aux ombres : course, bras en garde, cape et plumet au vent. */
const vertCommon = (pose: Pose) => `
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
  float mbSwing() { return sin(uTime * uStride + mbPhase()); }
  float mbAngle() {
    float sw = mbSwing();
    if (aPart < 0.5) return 0.0;
    if (aPart < 1.5) return sw * 0.8;
    if (aPart < 2.5) return -sw * 0.8;
    if (aPart < 3.5) return -0.4 - sw * 0.28;
    if (aPart < 4.5) return -1.05 + sw * 0.38;
    return 0.0;
  }
  vec3 mbPose(vec3 p) {
    float sw = mbSwing();
    if (aPart > 0.5 && aPart < 4.5) {
      float pivot = aPart > 2.5 ? ${f(pose.shoulder)} : ${f(pose.hip)};
      p.y -= pivot;
      p = mbRotX(mbAngle()) * p;
      p.y += pivot;
    } else if (aPart > 4.5 && aPart < 5.5) {
      float w = clamp((${f(pose.capeTop)} - p.y) / ${f(pose.capeLength)}, 0.0, 1.0);
      p.z -= (0.09 + sin(uTime * uStride * 0.8 + mbPhase() + p.y * 7.0) * 0.06) * w * w;
      p.x += sin(uTime * uStride * 0.5 + mbPhase() * 1.3 + p.y * 5.0) * 0.03 * w;
    } else if (aPart > 5.5) {
      float w = clamp(-p.z / ${f(0.3 * SOLDIER_SCALE)}, 0.0, 1.0);
      p.x += sin(uTime * uStride * 0.5 + mbPhase()) * 0.05 * w;
      p.y -= abs(sw) * 0.03 * w;
    }
    // Rebond de course et buste penché vers l'avant.
    p.z += p.y * 0.09;
    p.y += abs(sw) * 0.05;
    return p;
  }`;

/**
 * Matériau des soldats : couleurs et matières par sommet (acier brillant,
 * tissu mat, yeux luisants), membres animés, liseré lumineux d'équipe.
 */
export interface SoldierLook {
  /** Pivots propres au modèle (par défaut, ceux des soldats construits en code). */
  pose?: Pose;
  /** Texture du modèle : remplace alors les couleurs par sommet. */
  map?: THREE.Texture;
}

export function soldierMaterial(stride = 11, rim = 0x8fc4ff, look: SoldierLook = {}) {
  const pose = look.pose ?? DEFAULT_POSE;
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: !look.map,
    map: look.map ?? null,
    roughness: 1,
    metalness: 1,
  });
  const rimColor = new THREE.Color(rim);
  mat.customProgramCacheKey = () =>
    `soldier-${stride}-${rim}-${poseKey(pose)}-${look.map ? "tex" : "col"}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTime;
    shader.uniforms.uStride = { value: stride };
    shader.uniforms.uRim = { value: rimColor };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 aMat;
        varying vec3 vMat;
        ${vertCommon(pose)}`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        objectNormal = mbRotX(mbAngle()) * objectNormal;
        vMat = aMat;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed = mbPose(transformed);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRim;\nvarying vec3 vMat;")
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor *= vMat.x;",
      )
      .replace(
        "#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\nmetalnessFactor *= vMat.y;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vMat.z;",
      )
      .replace(
        "#include <opaque_fragment>",
        `{
          float rimF = 1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
          outgoingLight += uRim * pow(rimF, 3.0) * 0.5;
        }
        #include <opaque_fragment>`,
      );
  };
  return mat;
}

/** Matériau de profondeur assorti : l'ombre portée suit la même animation que le soldat. */
export function soldierDepthMaterial(stride = 11, pose: Pose = DEFAULT_POSE) {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.customProgramCacheKey = () => `soldier-depth-${stride}-${poseKey(pose)}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTime;
    shader.uniforms.uStride = { value: stride };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${vertCommon(pose)}`)
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed = mbPose(transformed);`,
      );
  };
  return mat;
}

/** Nombre de triangles d'une géométrie, indexée ou non — sert aux tests de budget. */
export function triangleCount(g: THREE.BufferGeometry) {
  return (g.index ? g.index.count : g.attributes.position.count) / 3;
}
