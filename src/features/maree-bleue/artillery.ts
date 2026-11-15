/**
 * L'artillerie du joueur : la bombarde royale, le mortier, le canon allié,
 * les socles de construction et les obus.
 *
 * Convention : chaque pièce tire vers -z (le haut du terrain) ; la caméra la
 * voit donc de dos, d'où le soin porté à la culasse, à la trémie et à la flèche.
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { sharedTime } from "./shared";
import { burlapTexture, woodTexture } from "./textures";

// ---------------------------------------------------------------------------
// Matières partagées
// ---------------------------------------------------------------------------

interface Mats {
  enamel: THREE.MeshPhysicalMaterial;
  navy: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  darkWood: THREE.MeshStandardMaterial;
  iron: THREE.MeshStandardMaterial;
  gunmetal: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  burlap: THREE.MeshStandardMaterial;
  burlapDark: THREE.MeshStandardMaterial;
}

let shared: Mats | null = null;
const sharedTextures: THREE.Texture[] = [];

/** Les matières sont créées une fois par session et partagées par toutes les pièces. */
function mats(): Mats {
  if (shared) return shared;
  const wood = woodTexture();
  const burlap = burlapTexture();
  burlap.repeat.set(3, 2);
  sharedTextures.push(wood, burlap);
  shared = {
    enamel: new THREE.MeshPhysicalMaterial({
      color: 0x2a62f0,
      roughness: 0.3,
      metalness: 0.25,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
    }),
    navy: new THREE.MeshPhysicalMaterial({
      color: 0x17308f,
      roughness: 0.34,
      metalness: 0.3,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
    }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffc64a, roughness: 0.24, metalness: 0.85 }),
    wood: new THREE.MeshStandardMaterial({ map: wood, color: 0xffffff, roughness: 0.72 }),
    darkWood: new THREE.MeshStandardMaterial({ map: wood, color: 0x9a7a62, roughness: 0.8 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x4d5364, roughness: 0.42, metalness: 0.7 }),
    gunmetal: new THREE.MeshStandardMaterial({ color: 0x77809a, roughness: 0.3, metalness: 0.8 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf5f7ff, roughness: 0.4, metalness: 0.1 }),
    burlap: new THREE.MeshStandardMaterial({ map: burlap, color: 0xffffff, roughness: 0.95 }),
    burlapDark: new THREE.MeshStandardMaterial({ map: burlap, color: 0xcdb48e, roughness: 0.95 }),
  };
  // Marquées « partagées » : le nettoyage d'un niveau ne doit pas les libérer.
  for (const m of Object.values(shared)) (m as THREE.Material).userData.shared = true;
  return shared;
}

/** À appeler quand le jeu est démonté. */
export function disposeArtilleryShared() {
  if (shared) for (const m of Object.values(shared)) (m as THREE.Material).dispose();
  for (const t of sharedTextures) t.dispose();
  sharedTextures.length = 0;
  shared = null;
}

function crystalMaterial(intensity = 0.6) {
  return new THREE.MeshStandardMaterial({
    color: 0x8fe0ff,
    emissive: 0x2a9cff,
    emissiveIntensity: intensity,
    roughness: 0.08,
    metalness: 0.1,
    flatShading: true,
  });
}

function shadows(root: THREE.Object3D, skip: THREE.Object3D[] = []) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || skip.includes(o)) return;
    const mat = m.material as THREE.Material;
    if (mat.transparent) return;
    m.castShadow = true;
    m.receiveShadow = true;
  });
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

// ---------------------------------------------------------------------------
// Pièces communes
// ---------------------------------------------------------------------------

/** Roue à rayons : jante de bois, bandage de fer clouté, moyeu doré coiffé d'émail. */
function spokedWheel(r: number, spokes: number, m: Mats) {
  const wheel = new THREE.Group();
  const felloe = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, r * 0.12, 8, 32), m.wood);
  felloe.rotation.y = Math.PI / 2;
  wheel.add(felloe);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.042, 6, 32), m.iron);
  tire.rotation.y = Math.PI / 2;
  tire.scale.z = 2.2;
  wheel.add(tire);
  const stud = new THREE.SphereGeometry(r * 0.04, 5, 4);
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.045, r * 0.07, r * 0.82, 6),
      m.wood,
    );
    spoke.position.set(0, Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46);
    spoke.rotation.x = a;
    wheel.add(spoke);
    for (const sx of [-1, 1]) {
      const s = new THREE.Mesh(stud, m.gold);
      const b = a + Math.PI / spokes;
      s.position.set(sx * r * 0.13, Math.cos(b) * r * 0.9, Math.sin(b) * r * 0.9);
      wheel.add(s);
    }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.26, r * 0.56, 16), m.gold);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  const nave = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 0.2, 16), m.navy);
  nave.rotation.z = Math.PI / 2;
  wheel.add(nave);
  for (const sx of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 10, 6), m.enamel);
    cap.position.x = sx * r * 0.3;
    wheel.add(cap);
  }
  return wheel;
}

/** Fût tourné : culasse renforcée, volée effilée, bouche en tulipe. Pointe vers -z. */
function barrelGeometry(k = 1) {
  const profile = [
    [0, 0],
    [0.3, 0],
    [0.335, 0.03],
    [0.335, 0.1],
    [0.31, 0.13],
    [0.3, 0.2],
    [0.29, 0.52],
    [0.315, 0.55],
    [0.315, 0.62],
    [0.285, 0.65],
    [0.262, 1.0],
    [0.285, 1.03],
    [0.285, 1.09],
    [0.252, 1.12],
    [0.236, 1.34],
    [0.27, 1.43],
    [0.33, 1.53],
    [0.345, 1.6],
    [0.33, 1.645],
    [0.27, 1.66],
    [0.2, 1.6],
    [0.175, 1.2],
  ].map(([x, y]) => new THREE.Vector2(x * k, y * k));
  const g = new THREE.LatheGeometry(profile, 40);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Bouton de culasse doré. */
function cascabelGeometry(k = 1) {
  const profile = [
    [0, -0.21],
    [0.07, -0.2],
    [0.105, -0.15],
    [0.1, -0.1],
    [0.06, -0.07],
    [0.07, -0.03],
    [0.2, 0],
    [0.26, 0.02],
  ].map(([x, y]) => new THREE.Vector2(x * k, y * k));
  const g = new THREE.LatheGeometry(profile, 24);
  g.rotateX(-Math.PI / 2);
  return g;
}

function starShape(outer: number, inner: number) {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const r = k % 2 === 0 ? outer : inner;
    if (k === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

/** Écu héraldique : émail bleu, bordure d'or, étoile blanche. */
function crest(m: Mats, size = 1) {
  const g = new THREE.Group();
  const shape = (k: number) => {
    const s = new THREE.Shape();
    s.moveTo(-0.16 * k, 0.17 * k);
    s.lineTo(0.16 * k, 0.17 * k);
    s.lineTo(0.16 * k, 0);
    s.quadraticCurveTo(0.15 * k, -0.15 * k, 0, -0.22 * k);
    s.quadraticCurveTo(-0.15 * k, -0.15 * k, -0.16 * k, 0);
    s.closePath();
    return s;
  };
  const rim = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape(size * 1.14), { depth: 0.025, bevelEnabled: false }),
    m.gold,
  );
  g.add(rim);
  const field = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape(size), { depth: 0.04, bevelEnabled: false }),
    m.enamel,
  );
  g.add(field);
  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape(0.085 * size, 0.036 * size), {
      depth: 0.055,
      bevelEnabled: false,
    }),
    m.white,
  );
  star.position.y = 0.01 * size;
  g.add(star);
  return g;
}

/** Fanion qui flotte au vent. */
function pennant(w: number, h: number, color: number) {
  const geo = new THREE.PlaneGeometry(w, h, 8, 1);
  geo.translate(w / 2, 0, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    // Pointe en queue d'aronde.
    const u = pos.getX(i) / w;
    pos.setY(i, pos.getY(i) * (1 - u * 0.55));
  }
  const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.7 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed.z += sin(position.x * 9.0 - uTime * 8.0) * 0.09 * position.x;`,
      );
  };
  return new THREE.Mesh(geo, mat);
}

/** Petit casque à plumet qui dépasse de la trémie : les soldats attendent leur tour. */
function hopperHead(m: Mats) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.075, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), m.enamel));
  const band = mesh(new THREE.TorusGeometry(0.075, 0.012, 4, 12), m.gold);
  band.rotation.x = Math.PI / 2;
  g.add(band);
  g.add(mesh(new THREE.SphereGeometry(0.032, 6, 4), m.white, 0, 0.09, 0.01));
  g.add(mesh(new THREE.SphereGeometry(0.026, 6, 4), m.white, 0, 0.1, 0.05));
  return g;
}

// ---------------------------------------------------------------------------
// La bombarde royale
// ---------------------------------------------------------------------------

export interface CannonModel {
  group: THREE.Group;
  /** Affût + fût : penche légèrement quand le canon roule de côté. */
  turret: THREE.Group;
  /** Fût : recule au tir. */
  barrel: THREE.Group;
  /** Roues : à faire tourner autour de x. */
  wheels: THREE.Object3D[];
  /** Cristal d'énergie : son éclat suit la jauge du champion. */
  crystal: THREE.Mesh;
  crystalMat: THREE.MeshStandardMaterial;
  /** Anneaux d'énergie du fût : s'illuminent à chaque tir. */
  coilMat: THREE.MeshStandardMaterial;
  /** Casques dans la trémie : ils sautillent. */
  heads: THREE.Object3D[];
  muzzleGlow: THREE.MeshBasicMaterial;
  ring: THREE.Mesh;
  flash: THREE.Mesh;
  /** Matériaux propres à ce canon (hors matières partagées). */
  own: THREE.Material[];
}

export function buildCannon(): CannonModel {
  const m = mats();
  const group = new THREE.Group();
  const turret = new THREE.Group();
  group.add(turret);
  const own: THREE.Material[] = [];

  // --- Affût : deux flasques de bois ferrées, entretoise, essieu
  const cheekShape = new THREE.Shape();
  cheekShape.moveTo(-0.85, 0.02);
  cheekShape.lineTo(0.72, 0.02);
  cheekShape.quadraticCurveTo(0.9, 0.04, 0.84, 0.24);
  cheekShape.quadraticCurveTo(0.7, 0.48, 0.46, 0.64);
  cheekShape.quadraticCurveTo(0.26, 0.76, 0.06, 0.64);
  cheekShape.quadraticCurveTo(-0.2, 0.44, -0.74, 0.34);
  cheekShape.quadraticCurveTo(-0.92, 0.28, -0.85, 0.02);
  const cheekGeo = new THREE.ExtrudeGeometry(cheekShape, {
    depth: 0.13,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 2,
    curveSegments: 10,
  });
  cheekGeo.rotateY(Math.PI / 2);
  const strapShape = new THREE.Shape();
  strapShape.moveTo(0.84, 0.24);
  strapShape.quadraticCurveTo(0.7, 0.48, 0.46, 0.64);
  strapShape.quadraticCurveTo(0.26, 0.76, 0.06, 0.64);
  strapShape.quadraticCurveTo(-0.2, 0.44, -0.74, 0.34);
  strapShape.lineTo(-0.74, 0.29);
  strapShape.quadraticCurveTo(-0.2, 0.39, 0.06, 0.585);
  strapShape.quadraticCurveTo(0.26, 0.7, 0.44, 0.59);
  strapShape.quadraticCurveTo(0.66, 0.44, 0.79, 0.22);
  strapShape.closePath();
  const strapGeo = new THREE.ExtrudeGeometry(strapShape, {
    depth: 0.2,
    bevelEnabled: false,
    curveSegments: 10,
  });
  strapGeo.rotateY(Math.PI / 2);
  const boltGeo = new THREE.SphereGeometry(0.03, 7, 5);
  for (const side of [-1, 1]) {
    const cheek = mesh(cheekGeo, m.wood, side * 0.36 - 0.065, 0.3, 0);
    turret.add(cheek);
    turret.add(mesh(strapGeo, m.navy, side * 0.36 - 0.1, 0.3, 0));
    for (const [zx, y] of [
      [0.62, 0.42],
      [0.36, 0.56],
      [-0.1, 0.62],
      [-0.45, 0.6],
      [0.6, 0.12],
      [-0.6, 0.12],
    ]) {
      turret.add(mesh(boltGeo, m.gold, side * 0.47, 0.3 + y - 0.06 * (y > 0.3 ? 1 : 0), -zx * 0.9));
    }
    // Écu sur le flanc
    const badge = crest(m, 0.72);
    badge.rotation.y = (side * Math.PI) / 2;
    badge.position.set(side * 0.455, 0.55, 0.18);
    turret.add(badge);
    // Chapeau de tourillon
    const capT = mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.08, 14),
      m.gold,
      side * 0.44,
      0.94,
      -0.25,
    );
    capT.rotation.z = Math.PI / 2;
    turret.add(capT);
  }
  turret.add(mesh(new RoundedBoxGeometry(0.6, 0.2, 1.3, 2, 0.05), m.darkWood, 0, 0.42, -0.05));
  const axle = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 12), m.iron, 0, 0.56, -0.2);
  axle.rotation.z = Math.PI / 2;
  turret.add(axle);

  // --- Flèche : poutre qui descend vers l'arrière, sabot de fer, anneau d'attelage
  const trail = mesh(new RoundedBoxGeometry(0.34, 0.2, 1.15, 2, 0.05), m.wood, 0, 0.36, 1.22);
  trail.rotation.x = 0.36;
  turret.add(trail);
  for (const z of [0.95, 1.5]) {
    const hoop = mesh(
      new RoundedBoxGeometry(0.38, 0.24, 0.09, 1, 0.03),
      m.navy,
      0,
      0.46 - (z - 0.95) * 0.37,
      z,
    );
    hoop.rotation.x = 0.36;
    turret.add(hoop);
  }
  turret.add(mesh(new RoundedBoxGeometry(0.42, 0.1, 0.3, 2, 0.04), m.iron, 0, 0.09, 1.76));
  const tow = mesh(new THREE.TorusGeometry(0.11, 0.028, 6, 16), m.gold, 0, 0.13, 1.96);
  tow.rotation.x = Math.PI / 2;
  turret.add(tow);

  // --- Roues
  const wheels: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const w = spokedWheel(0.56, 12, m);
    w.position.set(side * 0.68, 0.56, -0.2);
    group.add(w);
    wheels.push(w);
  }

  // --- Fût
  const barrel = new THREE.Group();
  barrel.position.set(0, 0.94, 0.37);
  barrel.rotation.x = 0.07;
  turret.add(barrel);
  barrel.add(mesh(barrelGeometry(), m.enamel));
  barrel.add(mesh(cascabelGeometry(), m.gold));
  const bandAt = (z: number, r: number, tube = 0.034) => {
    const b = mesh(new THREE.TorusGeometry(r, tube, 8, 36), m.gold, 0, 0, z);
    barrel.add(b);
  };
  bandAt(-0.065, 0.335);
  bandAt(-0.585, 0.315);
  bandAt(-1.06, 0.285);
  bandAt(-1.6, 0.345, 0.04);
  bandAt(-1.36, 0.245, 0.022);
  // Rang de perles d'or derrière la bouche
  const pearl = new THREE.SphereGeometry(0.03, 7, 5);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    barrel.add(mesh(pearl, m.gold, Math.cos(a) * 0.3, Math.sin(a) * 0.3, -1.49));
  }
  // Anneaux d'énergie incrustés
  const coilMat = new THREE.MeshStandardMaterial({
    color: 0x7fd8ff,
    emissive: 0x2fa8ff,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });
  own.push(coilMat);
  for (const [z, r] of [
    [-0.33, 0.3],
    [-0.83, 0.277],
    [-1.22, 0.249],
  ]) {
    const coil = mesh(new THREE.CylinderGeometry(r, r, 0.05, 28, 1, true), coilMat, 0, 0, z);
    coil.rotation.x = Math.PI / 2;
    barrel.add(coil);
  }
  // Anses (dauphins) dorées
  for (const side of [-1, 1]) {
    const dolphin = mesh(
      new THREE.TorusGeometry(0.075, 0.022, 6, 12, Math.PI),
      m.gold,
      side * 0.1,
      0.285,
      -0.74,
    );
    dolphin.rotation.y = Math.PI / 2;
    barrel.add(dolphin);
  }
  // Étoile sur la volée
  const star = mesh(
    new THREE.ExtrudeGeometry(starShape(0.11, 0.046), { depth: 0.03, bevelEnabled: false }),
    m.gold,
    0,
    0.262,
    -0.98,
  );
  star.rotation.x = -Math.PI / 2;
  barrel.add(star);
  // Tourillons
  const trunnion = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.84, 14), m.iron, 0, 0, -0.62);
  trunnion.rotation.z = Math.PI / 2;
  barrel.add(trunnion);
  // Lueur au fond de la bouche
  const muzzleGlow = new THREE.MeshBasicMaterial({
    color: 0x6fd0ff,
    transparent: true,
    opacity: 0.6,
  });
  own.push(muzzleGlow);
  const glowDisc = mesh(new THREE.CircleGeometry(0.19, 24), muzzleGlow, 0, 0, -1.58);
  glowDisc.rotation.y = Math.PI;
  barrel.add(glowDisc);

  // --- Trémie sur la culasse : les soldats y attendent, casque au vent
  const hopper = new THREE.Group();
  hopper.position.set(0, 0.3, -0.3);
  hopper.rotation.x = 0.12;
  barrel.add(hopper);
  const brass = new THREE.MeshStandardMaterial({
    color: 0xffc64a,
    roughness: 0.28,
    metalness: 0.85,
    side: THREE.DoubleSide,
  });
  own.push(brass);
  hopper.add(mesh(new THREE.CylinderGeometry(0.27, 0.13, 0.24, 20, 1, true), brass, 0, 0.14, 0));
  const lip = mesh(new THREE.TorusGeometry(0.27, 0.028, 6, 24), m.gold, 0, 0.26, 0);
  lip.rotation.x = Math.PI / 2;
  hopper.add(lip);
  hopper.add(mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 16), m.navy, 0, 0.02, 0));
  const heads: THREE.Object3D[] = [];
  for (const [x, z] of [
    [-0.1, 0.04],
    [0.1, 0.05],
    [0, -0.09],
  ]) {
    const hd = hopperHead(m);
    hd.position.set(x, 0.2, z);
    hd.userData.baseY = 0.2;
    hopper.add(hd);
    heads.push(hd);
  }

  // --- Cristal d'énergie sur son pied, à l'arrière : jauge du champion
  const stand = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.5, 8), m.gold, 0, 0.62, 1.3);
  turret.add(stand);
  const cradle = mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 16), m.gold, 0, 0.9, 1.3);
  cradle.rotation.x = Math.PI / 2;
  turret.add(cradle);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const claw = mesh(
      new THREE.ConeGeometry(0.022, 0.16, 5),
      m.gold,
      Math.cos(a) * 0.11,
      0.97,
      1.3 + Math.sin(a) * 0.11,
    );
    claw.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    turret.add(claw);
  }
  const crystalMat = crystalMaterial();
  own.push(crystalMat);
  const crystal = mesh(new THREE.OctahedronGeometry(0.13, 0), crystalMat, 0, 1.08, 1.3);
  crystal.scale.set(1, 1.5, 1);
  turret.add(crystal);

  // --- Écouvillon le long de la flasque gauche, seau sous la flèche
  const rod = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.55, 6), m.darkWood, -0.56, 0.7, 0.15);
  rod.rotation.x = Math.PI / 2 - 0.12;
  turret.add(rod);
  const sponge = mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.16, 10),
    m.white,
    -0.56,
    0.79,
    -0.6,
  );
  sponge.rotation.x = Math.PI / 2 - 0.12;
  turret.add(sponge);
  const bucket = new THREE.Group();
  bucket.position.set(0.3, 0.2, 1.05);
  bucket.add(mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 12, 1, true), m.wood));
  bucket.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 12), m.wood, 0, -0.075, 0));
  for (const y of [-0.04, 0.05]) {
    const hoop = mesh(new THREE.TorusGeometry(0.094 + y * 0.1, 0.01, 4, 12), m.iron, 0, y, 0);
    hoop.rotation.x = Math.PI / 2;
    bucket.add(hoop);
  }
  turret.add(bucket);

  // --- Fanion
  turret.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.15, 6), m.gold, -0.2, 0.95, 1.1));
  turret.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), m.gold, -0.2, 1.54, 1.1));
  const flag = pennant(0.5, 0.26, 0x2f6bff);
  own.push(flag.material as THREE.Material);
  flag.rotation.y = -Math.PI / 2;
  flag.position.set(-0.2, 1.36, 1.1);
  turret.add(flag);

  // --- Éclair de bouche
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0x9fd8ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  own.push(flashMat);
  const flash = mesh(new THREE.SphereGeometry(0.36, 12, 8), flashMat, 0, 0, -1.85);
  barrel.add(flash);

  // --- Anneau lumineux au sol
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x5aa8ff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  own.push(ringMat);
  const ring = mesh(new THREE.RingGeometry(1.15, 1.3, 56), ringMat, 0, 0.03, 0.15);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  shadows(group, [ring, flash, glowDisc]);
  return {
    group,
    turret,
    barrel,
    wheels,
    crystal,
    crystalMat,
    coilMat,
    heads,
    muzzleGlow,
    ring,
    flash,
    own,
  };
}

// ---------------------------------------------------------------------------
// Défenses alliées
// ---------------------------------------------------------------------------

/** Socle octogonal où se construit une défense. */
export function buildPad() {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0xc9cfdc, roughness: 0.7 });
  const base = mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.16, 8), stone, 0, 0.08, 0);
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);
  const inlay = mesh(
    new THREE.CylinderGeometry(0.56, 0.56, 0.02, 8),
    new THREE.MeshStandardMaterial({ color: 0x9aa3b8, roughness: 0.6 }),
    0,
    0.165,
    0,
  );
  inlay.receiveShadow = true;
  group.add(inlay);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x6ab4ff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = mesh(new THREE.RingGeometry(0.5, 0.6, 8), glowMat, 0, 0.18, 0);
  glow.rotation.x = -Math.PI / 2;
  glow.rotation.z = Math.PI / 8;
  group.add(glow);
  // Croix « + » holographique tant que le socle est libre
  const plusMat = new THREE.MeshBasicMaterial({
    color: 0xbfe0ff,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const plus = new THREE.Group();
  plus.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.11), plusMat));
  plus.add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.42), plusMat));
  plus.position.y = 0.4;
  group.add(plus);
  return { group, glowMat, plus };
}

export interface HelperModel {
  group: THREE.Group;
  /** Partie qui pivote vers la cible. */
  yaw: THREE.Group;
  /** Partie qui recule au tir. */
  recoil: THREE.Group;
  /** Lueur de l'âme du tube : suit le rechargement. */
  glow?: THREE.MeshBasicMaterial;
}

function sandbag(m: Mats, dark: boolean) {
  const g = new THREE.Group();
  const bag = mesh(
    new RoundedBoxGeometry(0.36, 0.16, 0.22, 3, 0.075),
    dark ? m.burlapDark : m.burlap,
  );
  g.add(bag);
  // Couture et oreilles nouées
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.012, 0.012), m.darkWood, 0, 0.078, 0));
  for (const sx of [-1, 1]) {
    const ear = mesh(
      new THREE.ConeGeometry(0.03, 0.07, 4),
      dark ? m.burlapDark : m.burlap,
      sx * 0.19,
      0.03,
      0,
    );
    ear.rotation.z = -sx * 1.2;
    g.add(ear);
  }
  return g;
}

/** Obus de mortier : ogive de fer cerclée d'or, ailettes. */
function mortarRound(m: Mats, k = 1) {
  const g = new THREE.Group();
  const prof = [
    [0, 0.2],
    [0.03, 0.19],
    [0.075, 0.1],
    [0.085, 0],
    [0.075, -0.09],
    [0.04, -0.14],
    [0.03, -0.24],
    [0, -0.24],
  ].map(([x, y]) => new THREE.Vector2(x * k, y * k));
  g.add(mesh(new THREE.LatheGeometry(prof, 12), m.gunmetal));
  const band = mesh(new THREE.TorusGeometry(0.084 * k, 0.012 * k, 4, 12), m.gold);
  band.rotation.x = Math.PI / 2;
  g.add(band);
  for (let i = 0; i < 4; i++) {
    const fin = mesh(new THREE.BoxGeometry(0.008 * k, 0.1 * k, 0.07 * k), m.navy, 0, -0.2 * k, 0);
    fin.rotation.y = (i / 4) * Math.PI * 2;
    fin.translateZ(0.045 * k);
    g.add(fin);
  }
  return g;
}

/** Mortier : tube trapu sur fourche pivotante, parapet de sacs de sable, caisse d'obus. */
export function buildMortar(): HelperModel {
  const m = mats();
  const group = new THREE.Group();

  // Parapet en fer à cheval, deux rangs croisés (ouvert vers l'arrière)
  const row = (n: number, radius: number, y: number, offset: number, dark: boolean) => {
    for (let k = 0; k < n; k++) {
      const a = Math.PI * (0.02 + offset) + (k / (n - 1)) * Math.PI * (0.96 - offset * 2);
      const bag = sandbag(m, dark !== (k % 2 === 0));
      bag.position.set(Math.cos(a) * radius, y, -Math.sin(a) * radius + 0.1);
      bag.rotation.y = a + Math.PI / 2 + (k % 3) * 0.06 - 0.06;
      group.add(bag);
    }
  };
  row(6, 0.62, 0.08, 0, false);
  row(5, 0.6, 0.23, 0.06, true);

  // Plaque de base boulonnée et couronne dentée
  group.add(mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.07, 20), m.iron, 0, 0.035, 0.05));
  const yaw = new THREE.Group();
  yaw.position.set(0, 0.07, 0.05);
  group.add(yaw);
  yaw.add(mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.08, 20), m.navy, 0, 0.04, 0));
  const tooth = new THREE.BoxGeometry(0.05, 0.05, 0.07);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const t = mesh(tooth, m.gold, Math.cos(a) * 0.37, 0.04, Math.sin(a) * 0.37);
    t.rotation.y = -a;
    yaw.add(t);
  }
  // Fourche : deux flasques triangulaires émaillées
  const yokeShape = new THREE.Shape();
  yokeShape.moveTo(-0.2, 0);
  yokeShape.lineTo(0.22, 0);
  yokeShape.quadraticCurveTo(0.12, 0.3, 0.04, 0.4);
  yokeShape.quadraticCurveTo(0, 0.45, -0.05, 0.4);
  yokeShape.quadraticCurveTo(-0.14, 0.28, -0.2, 0);
  const yokeGeo = new THREE.ExtrudeGeometry(yokeShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    bevelSegments: 1,
  });
  yokeGeo.rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    yaw.add(mesh(yokeGeo, m.enamel, side * 0.3 - 0.03, 0.08, 0));
    const cap = mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12),
      m.gold,
      side * 0.345,
      0.46,
      0,
    );
    cap.rotation.z = Math.PI / 2;
    yaw.add(cap);
  }

  // Tube
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.46, 0);
  pivot.rotation.x = -0.72;
  yaw.add(pivot);
  const recoil = new THREE.Group();
  pivot.add(recoil);
  const prof = [
    [0, -0.3],
    [0.12, -0.3],
    [0.2, -0.26],
    [0.245, -0.18],
    [0.25, -0.02],
    [0.235, 0.02],
    [0.23, 0.3],
    [0.255, 0.33],
    [0.27, 0.4],
    [0.25, 0.44],
    [0.2, 0.44],
    [0.185, 0.36],
    [0.18, -0.05],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  recoil.add(mesh(new THREE.LatheGeometry(prof, 28), m.gunmetal));
  for (const [y, r] of [
    [-0.02, 0.25],
    [0.16, 0.232],
    [0.4, 0.27],
  ]) {
    const band = mesh(new THREE.TorusGeometry(r, 0.026, 6, 28), m.gold, 0, y, 0);
    band.rotation.x = Math.PI / 2;
    recoil.add(band);
  }
  recoil.add(mesh(new THREE.SphereGeometry(0.1, 12, 8), m.gold, 0, -0.33, 0));
  const pin = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.66, 10), m.iron, 0, 0, 0);
  pin.rotation.z = Math.PI / 2;
  recoil.add(pin);
  for (const side of [-1, 1]) {
    const handle = mesh(
      new THREE.TorusGeometry(0.06, 0.016, 5, 10, Math.PI),
      m.iron,
      side * 0.245,
      0.2,
      0,
    );
    handle.rotation.z = (-side * Math.PI) / 2;
    recoil.add(handle);
  }
  const glow = new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.5 });
  const bore = mesh(new THREE.CircleGeometry(0.185, 20), glow, 0, 0.3, 0);
  bore.rotation.x = -Math.PI / 2;
  recoil.add(bore);
  // Crémaillère de pointage
  const arc = mesh(
    new THREE.TorusGeometry(0.2, 0.018, 4, 12, Math.PI * 0.6),
    m.gold,
    0.31,
    0.3,
    0.02,
  );
  arc.rotation.set(0, Math.PI / 2, 0.3);
  yaw.add(arc);

  // Caisse d'obus et munitions
  const crate = new THREE.Group();
  crate.position.set(0.5, 0, 0.62);
  crate.rotation.y = 0.35;
  crate.add(mesh(new RoundedBoxGeometry(0.4, 0.22, 0.28, 1, 0.02), m.wood, 0, 0.11, 0));
  for (const sx of [-1, 1]) {
    crate.add(mesh(new THREE.BoxGeometry(0.03, 0.24, 0.3), m.iron, sx * 0.15, 0.11, 0));
  }
  for (let k = 0; k < 3; k++) {
    const r = mortarRound(m, 0.9);
    r.position.set(-0.12 + k * 0.12, 0.34, 0);
    crate.add(r);
  }
  group.add(crate);
  const spare = mortarRound(m, 0.9);
  spare.rotation.z = Math.PI / 2;
  spare.position.set(-0.52, 0.08, 0.66);
  group.add(spare);

  // Fanion
  group.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 5), m.gold, -0.5, 0.42, 0.5));
  const flag = pennant(0.3, 0.16, 0x2f6bff);
  flag.rotation.y = -Math.PI / 2;
  flag.position.set(-0.5, 0.74, 0.5);
  group.add(flag);

  shadows(group, [bore]);
  return { group, yaw, recoil, glow };
}

/** Canon allié : couleuvrine légère derrière son pavois, trémie miniature. */
export function buildAllyCannon(): HelperModel {
  const m = mats();
  const group = new THREE.Group();
  const yaw = new THREE.Group();
  group.add(yaw);

  // Affût court et flèche
  yaw.add(mesh(new RoundedBoxGeometry(0.42, 0.16, 0.8, 2, 0.04), m.wood, 0, 0.36, 0.1));
  const trail = mesh(new RoundedBoxGeometry(0.2, 0.12, 0.6, 2, 0.03), m.wood, 0, 0.2, 0.68);
  trail.rotation.x = 0.42;
  yaw.add(trail);
  yaw.add(mesh(new RoundedBoxGeometry(0.26, 0.07, 0.16, 1, 0.02), m.iron, 0, 0.06, 0.94));
  const axle = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.86, 8), m.iron, 0, 0.34, -0.02);
  axle.rotation.z = Math.PI / 2;
  yaw.add(axle);
  for (const side of [-1, 1]) {
    const w = spokedWheel(0.34, 8, m);
    w.position.set(side * 0.4, 0.34, -0.02);
    yaw.add(w);
    // Supports de tourillon
    yaw.add(
      mesh(new RoundedBoxGeometry(0.07, 0.22, 0.2, 1, 0.02), m.navy, side * 0.2, 0.52, -0.05),
    );
  }

  // Pavois : bouclier d'artilleur frappé de l'écu
  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(-0.5, 0);
  shieldShape.lineTo(-0.5, 0.42);
  shieldShape.quadraticCurveTo(-0.46, 0.62, -0.2, 0.66);
  shieldShape.lineTo(0.2, 0.66);
  shieldShape.quadraticCurveTo(0.46, 0.62, 0.5, 0.42);
  shieldShape.lineTo(0.5, 0);
  shieldShape.lineTo(0.18, 0);
  shieldShape.lineTo(0.18, 0.26);
  shieldShape.absarc(0, 0.26, 0.18, 0, Math.PI, false);
  shieldShape.lineTo(-0.18, 0);
  shieldShape.closePath();
  const shield = mesh(
    new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      bevelSegments: 1,
      curveSegments: 10,
    }),
    m.enamel,
    0,
    0.34,
    -0.36,
  );
  shield.rotation.x = 0.16;
  yaw.add(shield);
  const rimGeo = new THREE.TorusGeometry(0.03, 0.012, 4, 8);
  for (const [x, y] of [
    [-0.42, 0.1],
    [0.42, 0.1],
    [-0.4, 0.46],
    [0.4, 0.46],
    [0, 0.6],
  ]) {
    yaw.add(mesh(rimGeo, m.gold, x, 0.34 + y, -0.3 + y * 0.16));
  }
  for (const side of [-1, 1]) {
    const badge = crest(m, 0.5);
    badge.position.set(side * 0.33, 0.76, -0.385);
    badge.rotation.set(0.16, Math.PI, 0);
    yaw.add(badge);
  }

  // Fût
  const recoil = new THREE.Group();
  recoil.position.set(0, 0.6, 0.28);
  recoil.rotation.x = 0.05;
  yaw.add(recoil);
  const k = 0.6;
  recoil.add(mesh(barrelGeometry(k), m.enamel));
  recoil.add(mesh(cascabelGeometry(k), m.gold));
  for (const [z, r] of [
    [-0.065, 0.335],
    [-0.585, 0.315],
    [-1.06, 0.285],
    [-1.6, 0.345],
  ]) {
    recoil.add(mesh(new THREE.TorusGeometry(r * k, 0.022, 6, 24), m.gold, 0, 0, z * k));
  }
  const trunnion = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 10), m.iron, 0, 0, -0.62 * k);
  trunnion.rotation.z = Math.PI / 2;
  recoil.add(trunnion);
  // Petite trémie et son cristal
  const brass = new THREE.MeshStandardMaterial({
    color: 0xffc64a,
    roughness: 0.28,
    metalness: 0.85,
    side: THREE.DoubleSide,
  });
  recoil.add(
    mesh(new THREE.CylinderGeometry(0.15, 0.08, 0.14, 14, 1, true), brass, 0, 0.26, -0.14),
  );
  const hd = hopperHead(m);
  hd.scale.setScalar(0.85);
  hd.position.set(0, 0.3, -0.14);
  recoil.add(hd);
  const gem = mesh(new THREE.OctahedronGeometry(0.07, 0), crystalMaterial(1.1), 0, 0.24, 0.08);
  gem.scale.set(1, 1.4, 1);
  recoil.add(gem);

  shadows(group);
  return { group, yaw, recoil };
}

/** Obus en vol : bombe ronde à mèche incandescente. */
export function buildShell() {
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.32, metalness: 0.75 }),
  );
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.022, 5, 16),
    new THREE.MeshStandardMaterial({ color: 0xffc64a, roughness: 0.25, metalness: 0.85 }),
  );
  body.add(band);
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.065, 0.07, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b7080, roughness: 0.4, metalness: 0.7 }),
  );
  neck.position.y = 0.2;
  body.add(neck);
  const fuse = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd060 }),
  );
  fuse.position.y = 0.27;
  body.add(fuse);
  body.castShadow = true;
  return body;
}
