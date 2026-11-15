/**
 * Modèles 3D du terrain construits en code : portes, forteresse, marteau
 * tournant et geyser. Les soldats sont dans `soldiers.ts`, le canon et les
 * défenses alliées dans `artillery.ts`.
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  GATE_COLORS,
  bannerTexture,
  brickTexture,
  gateLabelTexture,
  hazardStripeTexture,
} from "./textures";

import { sharedTime } from "./shared";

export { sharedTime };

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
