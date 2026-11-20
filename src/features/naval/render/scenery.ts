/**
 * Décor de l'arène : îles rocheuses couronnées de végétation, plages,
 * palmiers et le fort du cap. Les îles reprennent exactement les positions
 * et rayons de la simulation (elles bloquent les navires).
 *
 * Le fort est un décor en phase 1 : la conquête des îles arrivera en phase 4.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { IslandDef } from "../sim/missions.ts";
import { flagTexture, leafTexture } from "./textures.ts";

function hash3(x: number, y: number, z: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return s - Math.floor(s);
}

function noise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  const x00 = c(0, 0, 0) + (c(1, 0, 0) - c(0, 0, 0)) * u;
  const x10 = c(0, 1, 0) + (c(1, 1, 0) - c(0, 1, 0)) * u;
  const x01 = c(0, 0, 1) + (c(1, 0, 1) - c(0, 0, 1)) * u;
  const x11 = c(0, 1, 1) + (c(1, 1, 1) - c(0, 1, 1)) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

const SAND = new THREE.Color("#d9c08a");
const ROCK = new THREE.Color("#6e6253");
const ROCK_DARK = new THREE.Color("#4a4038");
const GRASS = new THREE.Color("#3f7031");
const GRASS_DARK = new THREE.Color("#2b5224");

function buildIslandGeometry(isl: IslandDef): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, isl.kind === "rocher" ? 3 : 4);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const rugged = isl.kind === "rocher" ? 0.55 : 0.32;
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const n =
      noise3(x * 2.2, y * 2.2, z * 2.2, isl.seed) * 0.7 +
      noise3(x * 5, y * 5, z * 5, isl.seed + 1) * 0.3;
    const r = 1 + (n - 0.5) * rugged * 2;
    x *= r;
    z *= r;
    // Profil en dôme : pente raide au bord de l'eau, plateau herbeux au sommet.
    const up = Math.max(y, -0.3);
    let h = up > 0 ? Math.pow(up, isl.kind === "rocher" ? 0.8 : 1.25) : up;
    h *= isl.height * (0.85 + n * 0.3);
    if (y < 0) h = y * 6;
    const px = x * isl.radius;
    const pz = z * isl.radius;
    pos.setXYZ(i, px, h, pz);
    const slope = 1 - Math.abs(y);
    if (h < 1.6 && isl.kind !== "rocher") tmp.copy(SAND);
    else if (isl.kind === "rocher" || slope > 0.75 || h < 4) tmp.copy(ROCK).lerp(ROCK_DARK, n);
    else tmp.copy(GRASS).lerp(GRASS_DARK, n);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Hauteur approximative du terrain à une distance relative du centre (0..1). */
function groundHeight(isl: IslandDef, rel: number): number {
  return isl.height * Math.pow(Math.max(0, 1 - rel * rel), 1.1) * 0.85;
}

function buildPalm(
  rnd: () => number,
  base: THREE.Vector3,
): { trunk: THREE.BufferGeometry; leaves: THREE.BufferGeometry } {
  const height = 7 + rnd() * 5;
  const lean = new THREE.Vector3(rnd() - 0.5, 0, rnd() - 0.5)
    .normalize()
    .multiplyScalar(2 + rnd() * 2);
  const pts = [0, 0.35, 0.7, 1].map((k) =>
    base.clone().add(new THREE.Vector3(lean.x * k * k, height * k, lean.z * k * k)),
  );
  const curve = new THREE.CatmullRomCurve3(pts);
  const trunk = new THREE.TubeGeometry(curve, 6, 0.32, 5, false);
  const top = pts[3];
  const leaves: THREE.BufferGeometry[] = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const leaf = new THREE.PlaneGeometry(5.5, 1.5, 5, 1);
    leaf.translate(2.75, 0, 0);
    leaf.rotateX(-Math.PI / 2);
    const p = leaf.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      // Palme qui retombe, pliée en V le long de la nervure.
      p.setY(k, -x * x * 0.07 + Math.abs(p.getZ(k)) * 0.35);
    }
    leaf.computeVertexNormals();
    leaf.rotateY((i / count) * Math.PI * 2 + rnd() * 0.4);
    leaf.translate(top.x, top.y, top.z);
    leaves.push(leaf);
  }
  const merged = mergeGeometries(leaves)!;
  leaves.forEach((l) => l.dispose());
  return { trunk, leaves: merged };
}

function buildFort(isl: IslandDef, disposables: { dispose(): void }[]): THREE.Group {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: "#8d8574", roughness: 0.95 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: "#6d6658", roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: "#4b3424", roughness: 0.9 });
  disposables.push(stone, stoneDark, wood);
  const ground = groundHeight(isl, 0.25);
  const tower = new THREE.CylinderGeometry(5, 6, 13, 10);
  disposables.push(tower);
  const t = new THREE.Mesh(tower, stone);
  t.position.set(0, ground + 6, 0);
  g.add(t);
  const merlon = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  disposables.push(merlon);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const m = new THREE.Mesh(merlon, stoneDark);
    m.position.set(Math.cos(a) * 4.6, ground + 13.2, Math.sin(a) * 4.6);
    g.add(m);
  }
  const wall = new THREE.BoxGeometry(22, 5, 2.2);
  disposables.push(wall);
  for (const [x, z, rot] of [
    [10, 6, 0.4],
    [-9, 7, -0.5],
  ] as const) {
    const w = new THREE.Mesh(wall, stone);
    w.position.set(x, ground + 1.5, z);
    w.rotation.y = rot;
    g.add(w);
  }
  const hut = new THREE.BoxGeometry(6, 3.2, 5);
  disposables.push(hut);
  const h = new THREE.Mesh(hut, wood);
  h.position.set(0, ground + 14.6, 0);
  g.add(h);
  const pole = new THREE.CylinderGeometry(0.15, 0.2, 9, 5);
  disposables.push(pole);
  const p = new THREE.Mesh(pole, wood);
  p.position.set(1.5, ground + 20, 0);
  g.add(p);
  const flagGeo = new THREE.PlaneGeometry(4.5, 3);
  flagGeo.translate(2.25, 0, 0);
  disposables.push(flagGeo);
  const flagMat = new THREE.MeshStandardMaterial({
    map: flagTexture("pavillon-noir"),
    side: THREE.DoubleSide,
  });
  disposables.push(flagMat);
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(1.6, ground + 23, 0);
  flag.rotation.y = -0.6;
  g.add(flag);
  return g;
}

export interface Scenery {
  group: THREE.Group;
  dispose(): void;
}

export function createScenery(islands: readonly IslandDef[]): Scenery {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const terrain = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    flatShading: true,
  });
  const bark = new THREE.MeshStandardMaterial({ color: "#6b4b2e", roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTexture(),
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    roughness: 0.9,
    color: "#b5d68f",
  });
  disposables.push(terrain, bark, leafMat);
  for (const isl of islands) {
    const geo = buildIslandGeometry(isl);
    disposables.push(geo);
    const mesh = new THREE.Mesh(geo, terrain);
    mesh.position.set(isl.x, 0, isl.z);
    group.add(mesh);
    if (isl.palms > 0) {
      let s = isl.seed * 7.31;
      const rnd = () => {
        s = (s * 16807 + 0.5) % 2147483647;
        return (s % 10000) / 10000;
      };
      const trunks: THREE.BufferGeometry[] = [];
      const leaves: THREE.BufferGeometry[] = [];
      for (let i = 0; i < isl.palms; i++) {
        const a = rnd() * Math.PI * 2;
        const rel = 0.35 + rnd() * 0.4;
        const base = new THREE.Vector3(
          Math.cos(a) * rel * isl.radius,
          groundHeight(isl, rel) - 0.5,
          Math.sin(a) * rel * isl.radius,
        );
        const palm = buildPalm(rnd, base);
        trunks.push(palm.trunk);
        leaves.push(palm.leaves);
      }
      const t = mergeGeometries(trunks)!;
      const l = mergeGeometries(leaves)!;
      trunks.forEach((g) => g.dispose());
      leaves.forEach((g) => g.dispose());
      disposables.push(t, l);
      const tm = new THREE.Mesh(t, bark);
      const lm = new THREE.Mesh(l, leafMat);
      tm.position.copy(mesh.position);
      lm.position.copy(mesh.position);
      group.add(tm, lm);
    }
    if (isl.kind === "fort") {
      const fort = buildFort(isl, disposables);
      fort.position.set(isl.x, 0, isl.z);
      group.add(fort);
    }
  }
  return {
    group,
    dispose() {
      group.removeFromParent();
      for (const d of disposables) d.dispose();
    },
  };
}
