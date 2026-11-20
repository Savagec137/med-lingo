/**
 * Navires procéduraux : coque lissée par sections, château de poupe et
 * galerie éclairée, mâture, voiles gonflées, gréement, pavillon et canons.
 *
 * Les dégâts sont visibles : voiles trouées selon l'état de la voilure,
 * bordé noirci selon la coque, canons qui disparaissent quand la batterie
 * perd des pièces, gîte et naufrage.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gunsAvailable, gunLocal } from "../sim/combat.ts";
import type { BatteryId, ShipClass } from "../sim/defs.ts";
import type { Ship } from "../sim/types.ts";
import {
  deckTexture,
  flagTexture,
  glowTexture,
  hullTexture,
  sailTexture,
  sternTexture,
} from "./textures.ts";
import { waveHeight } from "./waves.ts";

const STATIONS = 24;
const RING = 12;

/** Demi-largeur relative de la coque le long de la longueur (t = 0 poupe, 1 proue). */
export function halfBeam(t: number): number {
  const peak = 0.44;
  if (t < peak) return 0.8 + 0.2 * Math.sin((t / peak) * (Math.PI / 2));
  const u = (t - peak) / (1 - peak);
  return Math.max(0.04, Math.pow(Math.cos(u * (Math.PI / 2)), 0.75));
}

export function sheer(cls: ShipClass, t: number): number {
  return cls.deckHeight * (1 + 0.16 * Math.pow(1 - t, 3) + 0.14 * Math.pow(t, 5));
}

function buildHullGeometry(cls: ShipClass): THREE.BufferGeometry {
  const L = cls.length;
  const B = cls.beam;
  const draft = cls.deckHeight * 0.75;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i <= STATIONS; i++) {
    const t = i / STATIONS;
    const z = (t - 0.5) * L;
    const w = (halfBeam(t) * B) / 2;
    const top = sheer(cls, t);
    const bottom = -draft * (1 - 0.7 * Math.pow(Math.abs(2 * t - 1), 4));
    for (let j = 0; j <= RING; j++) {
      const a = (j / RING) * Math.PI;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const x = -Math.sign(c) * w * Math.pow(Math.abs(c), 0.55);
      const depth = Math.pow(s, 1.5);
      const y = top - (top - bottom) * depth;
      positions.push(x, y, z);
      uvs.push((t * L) / 9, 1 - depth);
    }
  }
  const indices: number[] = [];
  const n = RING + 1;
  for (let i = 0; i < STATIONS; i++) {
    for (let j = 0; j < RING; j++) {
      const a = i * n + j;
      const b = a + n;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  // Tableau arrière et étrave fermés par un éventail.
  for (const station of [0, STATIONS]) {
    const t = station / STATIONS;
    const center = positions.length / 3;
    positions.push(0, sheer(cls, t) * 0.4, (t - 0.5) * L);
    uvs.push(0, 0.5);
    const first = station * n;
    for (let j = 0; j < RING; j++) indices.push(center, first + j + 1, first + j);
    indices.push(center, first, first + RING);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildDeckGeometry(cls: ShipClass): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= STATIONS; i++) {
    const t = i / STATIONS;
    const z = (t - 0.5) * cls.length;
    const w = ((halfBeam(t) * cls.beam) / 2) * 0.97;
    const y = sheer(cls, t) - 0.12;
    positions.push(-w, y, z, w, y, z);
    uvs.push(-w / 3, z / 3, w / 3, z / 3);
    if (i < STATIONS) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Bastingage : un ruban vertical le long des deux bords. */
function buildRailGeometry(cls: ShipClass): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const h = 0.55 + cls.deckHeight * 0.12;
  for (const side of [-1, 1]) {
    const base = positions.length / 3;
    for (let i = 0; i <= STATIONS; i++) {
      const t = i / STATIONS;
      const z = (t - 0.5) * cls.length;
      const w = (halfBeam(t) * cls.beam) / 2;
      const y = sheer(cls, t);
      positions.push(side * w, y - 0.05, z, side * w * 0.97, y + h, z);
      if (i < STATIONS) {
        const a = base + i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Voile carrée gonflée vers l'avant, légèrement trapézoïdale. */
function buildSailGeometry(width: number, height: number, belly: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 8, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = x / width + 0.5;
    const v = y / height + 0.5;
    const taper = 1 - 0.12 * v;
    pos.setX(i, x * taper);
    const bulge = belly * Math.sin(Math.PI * u) * (0.55 + 0.45 * Math.sin(Math.PI * v));
    pos.setZ(i, bulge);
  }
  geo.computeVertexNormals();
  return geo;
}

function cylinderBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r0: number,
  r1: number,
  seg = 6,
): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  geo.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
  return geo;
}

const SAIL_NOISE = /* glsl */ `
float sailHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sailNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sailHash(i), sailHash(i + vec2(1.0, 0.0)), u.x), mix(sailHash(i + vec2(0.0, 1.0)), sailHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

/** Matériau de voile : la toile se troue et roussit quand la voilure s'use. */
function sailMaterial(
  map: THREE.Texture,
  tear: { value: number },
  seed: number,
  glow: number,
): THREE.MeshStandardMaterial {
  // Légère auto-illumination : la toile reste lisible à contre-jour.
  const mat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: glow,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTear = tear;
    shader.uniforms.uSeed = { value: seed };
    shader.vertexShader =
      "varying vec2 vSailUv;\n" +
      shader.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\n vSailUv = uv;");
    shader.fragmentShader =
      "uniform float uTear;\nuniform float uSeed;\nvarying vec2 vSailUv;\n" +
      SAIL_NOISE +
      shader.fragmentShader.replace(
        "#include <alphatest_fragment>",
        `#include <alphatest_fragment>
        float holes = sailNoise(vSailUv * vec2(7.0, 5.0) + uSeed) * 0.65 + sailNoise(vSailUv * 19.0 + uSeed) * 0.35;
        float cut = uTear * 0.6;
        if (holes < cut) discard;
        diffuseColor.rgb *= mix(0.25, 1.0, smoothstep(cut, cut + 0.07, holes));`,
      );
  };
  mat.customProgramCacheKey = () => "naval-sail";
  return mat;
}

export interface ShipVisual {
  root: THREE.Group;
  body: THREE.Group;
  cls: ShipClass;
  tear: { value: number };
  hullMaterial: THREE.MeshStandardMaterial;
  cannons: THREE.InstancedMesh;
  gunSlots: { battery: BatteryId; index: number; matrix: THREE.Matrix4 }[];
  flag: THREE.Mesh | null;
  flagBase: Float32Array | null;
  lanterns: THREE.Sprite[];
  disposables: { dispose(): void }[];
  heel: number;
  gunKey: string;
}

export function createShipVisual(cls: ShipClass, seed: number): ShipVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T): T => {
    disposables.push(x);
    return x;
  };
  const L = cls.length;
  const B = cls.beam;
  const look = cls.look;

  const hullMaterial = track(
    new THREE.MeshStandardMaterial({
      map: hullTexture(look),
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  const hull = new THREE.Mesh(track(buildHullGeometry(cls)), hullMaterial);
  body.add(hull);

  const deck = new THREE.Mesh(
    track(buildDeckGeometry(cls)),
    track(new THREE.MeshStandardMaterial({ map: deckTexture(), roughness: 0.9 })),
  );
  body.add(deck);

  const trimMaterial = track(
    new THREE.MeshStandardMaterial({
      color: look.trim,
      roughness: 0.55,
      metalness: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  const darkWood = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(look.hull).multiplyScalar(0.8),
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  body.add(new THREE.Mesh(track(buildRailGeometry(cls)), darkWood));

  // Château de poupe et galerie éclairée.
  const castleLen = L * 0.2;
  const castleW = halfBeam(0.08) * B * 0.92;
  const castleH = cls.deckHeight * (cls.masts >= 2 ? 0.8 : 0.45);
  const castleTop = sheer(cls, 0.08) + castleH;
  const castle = new THREE.Mesh(
    track(new THREE.BoxGeometry(castleW, castleH, castleLen)),
    hullMaterial,
  );
  castle.position.set(0, sheer(cls, 0.08) + castleH / 2 - 0.1, -L / 2 + castleLen / 2 + 0.2);
  body.add(castle);
  const castleRail = new THREE.Mesh(
    track(new THREE.BoxGeometry(castleW * 1.02, 0.18, castleLen * 1.02)),
    trimMaterial,
  );
  castleRail.position.set(0, castleTop + 0.05, castle.position.z);
  body.add(castleRail);

  const stern = sternTexture();
  const sternH = castleH + cls.deckHeight * 0.55;
  const sternPanel = new THREE.Mesh(
    track(new THREE.PlaneGeometry(castleW * 0.98, sternH)),
    track(
      new THREE.MeshStandardMaterial({
        map: stern.map,
        emissiveMap: stern.emissive,
        emissive: new THREE.Color("#ffb060"),
        emissiveIntensity: 1.6,
        roughness: 0.8,
      }),
    ),
  );
  sternPanel.position.set(0, castleTop - sternH / 2, -L / 2 - 0.06);
  sternPanel.rotation.y = Math.PI;
  body.add(sternPanel);

  // Gaillard d'avant.
  if (cls.masts >= 2) {
    const fcW = halfBeam(0.84) * B * 0.85;
    const fcL = L * 0.13;
    const fc = new THREE.Mesh(
      track(new THREE.BoxGeometry(fcW, cls.deckHeight * 0.3, fcL)),
      hullMaterial,
    );
    fc.position.set(0, sheer(cls, 0.84) + cls.deckHeight * 0.15 - 0.1, L * 0.34 - 0.2);
    body.add(fc);
  }

  // Fanaux de poupe : petite lanterne et halo additif.
  const lanterns: THREE.Sprite[] = [];
  const glowMat = track(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: "#ffb25a",
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  const lampMat = track(
    new THREE.MeshStandardMaterial({
      color: "#2a1a0c",
      emissive: "#ffc46a",
      emissiveIntensity: 2.2,
    }),
  );
  const lanternSpots = cls.masts >= 2 ? [-castleW / 2 + 0.2, 0, castleW / 2 - 0.2] : [0];
  for (const x of lanternSpots) {
    const y = castleTop + (x === 0 ? 1.1 : 0.6);
    const lamp = new THREE.Mesh(track(new THREE.BoxGeometry(0.4, 0.6, 0.4)), lampMat);
    lamp.position.set(x, y, -L / 2 + 0.1);
    body.add(lamp);
    const glow = new THREE.Sprite(glowMat);
    glow.position.copy(lamp.position);
    glow.scale.setScalar(x === 0 ? 2.2 : 1.6);
    body.add(glow);
    lanterns.push(glow);
  }

  // Mâture, vergues, voiles.
  const mastLayout: Record<number, { t: number; h: number }[]> = {
    1: [{ t: 0.56, h: 1 }],
    2: [
      { t: 0.34, h: 0.9 },
      { t: 0.66, h: 1 },
    ],
    3: [
      { t: 0.25, h: 0.8 },
      { t: 0.5, h: 1 },
      { t: 0.74, h: 0.9 },
    ],
  };
  const masts = mastLayout[cls.masts] ?? mastLayout[3];
  const woodGeos: THREE.BufferGeometry[] = [];
  const tear = { value: 0 };
  const sailLum = new THREE.Color(look.sail).getHSL({ h: 0, s: 0, l: 0 }).l;
  const glow = sailLum < 0.2 ? 0.55 : sailLum < 0.45 ? 0.25 : 0.06;
  const plainSail = sailMaterial(sailTexture(look, false), tear, seed, glow);
  const emblemSail = sailMaterial(sailTexture(look, true), tear, seed + 3.1, glow);
  track(plainSail);
  track(emblemSail);
  const plainSailGeos: THREE.BufferGeometry[] = [];
  const emblemSailGeos: THREE.BufferGeometry[] = [];
  const rigging: number[] = [];
  const mastTops: THREE.Vector3[] = [];
  const mastR = 0.2 + L * 0.007;
  const mainIndex = masts.findIndex((m) => m.h === 1);

  masts.forEach((m, mi) => {
    const z = (m.t - 0.5) * L;
    const deckY = sheer(cls, m.t) - 0.1;
    const height = (cls.mastHeight - deckY) * m.h;
    const top = new THREE.Vector3(0, deckY + height, z);
    mastTops.push(top);
    woodGeos.push(
      cylinderBetween(new THREE.Vector3(0, deckY - 0.5, z), top, mastR, mastR * 0.55, 8),
    );
    const levels = cls.mastHeight > 18 ? 3 : 2;
    const usable = height - 2.4;
    for (let k = 0; k < levels; k++) {
      const sh = (usable / levels) * 0.84;
      const yb = deckY + 2.4 + (usable / levels) * k;
      const sw = B * (1.55 - 0.28 * k) * (m.h < 1 ? 0.88 : 1);
      const geo = buildSailGeometry(sw, sh, sw * 0.1);
      geo.translate(0, yb + sh / 2, z + mastR + 0.35);
      (mi === mainIndex && k === 0 && look.emblem !== "aucun"
        ? emblemSailGeos
        : plainSailGeos
      ).push(geo);
      const yardY = yb + sh + 0.05;
      woodGeos.push(
        cylinderBetween(
          new THREE.Vector3(-sw * 0.56, yardY, z + mastR),
          new THREE.Vector3(sw * 0.56, yardY, z + mastR),
          0.11,
          0.11,
          5,
        ),
      );
    }
    // Haubans vers les bords.
    const w = (halfBeam(m.t) * B) / 2;
    for (const side of [-1, 1]) {
      for (let r = 0; r < 3; r++) {
        rigging.push(
          0,
          deckY + height * (0.92 - r * 0.05),
          z,
          side * w,
          sheer(cls, m.t) + 0.3,
          z - 1.4 + r * 1.2,
        );
      }
    }
  });
  // Étais entre les mâts, beaupré et foc.
  const bowTop = new THREE.Vector3(0, sheer(cls, 1) + 0.3, L / 2 - 0.3);
  const spritTip = bowTop.clone().add(new THREE.Vector3(0, L * 0.09, L * 0.26));
  woodGeos.push(cylinderBetween(bowTop, spritTip, 0.2, 0.1, 6));
  for (let i = 0; i < mastTops.length - 1; i++) {
    const a = mastTops[i];
    const b = mastTops[i + 1];
    rigging.push(a.x, a.y, a.z, b.x, b.y * 0.75, b.z);
  }
  const fore = mastTops[mastTops.length - 1];
  rigging.push(fore.x, fore.y, fore.z, spritTip.x, spritTip.y, spritTip.z);
  rigging.push(mastTops[0].x, mastTops[0].y, mastTops[0].z, 0, castleTop + 0.3, -L / 2 + 0.6);
  {
    // Foc triangulaire entre le beaupré et le mât de misaine.
    const head = fore
      .clone()
      .multiplyScalar(1)
      .setY(fore.y * 0.72);
    const jib = new THREE.BufferGeometry();
    const p0 = spritTip.clone().add(new THREE.Vector3(0, -0.2, -0.4));
    const p1 = head;
    const p2 = new THREE.Vector3(0, sheer(cls, 0.95) + 1.2, L / 2 - 1);
    jib.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z], 3),
    );
    jib.setAttribute("uv", new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0], 2));
    jib.setAttribute("normal", new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
    plainSailGeos.push(jib);
  }

  const woodMat = track(new THREE.MeshStandardMaterial({ color: "#4a3220", roughness: 0.85 }));
  const spars = new THREE.Mesh(track(mergeGeometries(woodGeos)!), woodMat);
  body.add(spars);
  woodGeos.forEach((g) => g.dispose());
  if (plainSailGeos.length) {
    const sails = new THREE.Mesh(
      track(mergeGeometries(plainSailGeos.map((g) => (g.index ? g.toNonIndexed() : g)))!),
      plainSail,
    );
    body.add(sails);
  }
  if (emblemSailGeos.length) {
    const sails = new THREE.Mesh(track(mergeGeometries(emblemSailGeos)!), emblemSail);
    body.add(sails);
  }
  plainSailGeos.forEach((g) => g.dispose());
  emblemSailGeos.forEach((g) => g.dispose());

  const ropes = new THREE.LineSegments(
    track(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(rigging, 3),
      ),
    ),
    track(new THREE.LineBasicMaterial({ color: "#1a120b", transparent: true, opacity: 0.75 })),
  );
  body.add(ropes);

  // Pavillon en tête du grand mât.
  let flag: THREE.Mesh | null = null;
  let flagBase: Float32Array | null = null;
  if (look.flag !== "aucun") {
    const fw = 1.8 + L * 0.05;
    const geo = track(new THREE.PlaneGeometry(fw, fw * 0.66, 8, 2));
    geo.translate(fw / 2, 0, 0);
    geo.rotateY(Math.PI / 2);
    flagBase = new Float32Array((geo.attributes.position as THREE.BufferAttribute).array);
    flag = new THREE.Mesh(
      geo,
      track(
        new THREE.MeshStandardMaterial({
          map: flagTexture(look.flag),
          side: THREE.DoubleSide,
          roughness: 1,
        }),
      ),
    );
    const main = mastTops[mainIndex >= 0 ? mainIndex : 0];
    flag.position.set(0, main.y - fw * 0.35, main.z);
    body.add(flag);
  }

  // Canons : une instance par pièce, masquée quand la pièce est hors d'usage.
  const gunSlots: ShipVisual["gunSlots"] = [];
  const barrel = track(new THREE.CylinderGeometry(0.15, 0.21, 1.5, 8));
  barrel.rotateZ(Math.PI / 2);
  const total = cls.guns.babord + cls.guns.tribord + cls.guns.proue + cls.guns.poupe;
  const cannons = new THREE.InstancedMesh(
    barrel,
    track(new THREE.MeshStandardMaterial({ color: "#17171b", metalness: 0.7, roughness: 0.45 })),
    Math.max(1, total),
  );
  cannons.count = total;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (const battery of ["babord", "tribord", "proue", "poupe"] as const) {
    const n = cls.guns[battery];
    for (let i = 0; i < n; i++) {
      const g = gunLocal(cls, battery, i, n);
      // gunLocal : côté positif = tribord = −X local.
      const x = -g.side;
      const yaw =
        battery === "babord"
          ? 0
          : battery === "tribord"
            ? Math.PI
            : battery === "proue"
              ? -Math.PI / 2
              : Math.PI / 2;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const offset = battery === "babord" || battery === "tribord" ? 0.35 * Math.sign(x) : 0;
      m4.compose(new THREE.Vector3(x + offset, g.y, g.along), q, new THREE.Vector3(1, 1, 1));
      gunSlots.push({ battery, index: i, matrix: m4.clone() });
    }
  }
  gunSlots.forEach((slot, i) => cannons.setMatrixAt(i, slot.matrix));
  cannons.instanceMatrix.needsUpdate = true;
  if (total > 0) body.add(cannons);

  return {
    root,
    body,
    cls,
    tear,
    hullMaterial,
    cannons,
    gunSlots,
    flag,
    flagBase,
    lanterns,
    disposables,
    heel: 0,
    gunKey: "",
  };
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Met à jour la position, la houle, la gîte et l'état visuel des dégâts. */
export function syncShipVisual(v: ShipVisual, ship: Ship, time: number, dt: number): void {
  const c = v.cls;
  v.root.position.set(ship.x, 0, ship.z);
  v.root.rotation.y = ship.h;
  const sh = Math.sin(ship.h);
  const ch = Math.cos(ship.h);
  const half = c.length * 0.42;
  const beam = c.beam * 0.6;
  const hb = waveHeight(ship.x + sh * half, ship.z + ch * half, time);
  const hs = waveHeight(ship.x - sh * half, ship.z - ch * half, time);
  // Bâbord = +X local = (cos h, −sin h) en monde.
  const hp = waveHeight(ship.x + ch * beam, ship.z - sh * beam, time);
  const hst = waveHeight(ship.x - ch * beam, ship.z + sh * beam, time);
  const pitch = Math.atan2(hb - hs, half * 2) * 0.9;
  const roll = Math.atan2(hp - hst, beam * 2) * 0.8;
  const targetHeel = THREE.MathUtils.clamp(ship.yawRate * ship.speed * 0.045, -0.2, 0.2);
  v.heel += (targetHeel - v.heel) * Math.min(1, dt * 2);
  let y = (hb + hs + hp + hst) * 0.22;
  let rx = -pitch;
  let rz = roll + v.heel;
  if (ship.state !== "afloat") {
    const k = Math.min(1, ship.sinkT / 6);
    y -= Math.pow(k, 1.6) * (c.deckHeight * 2 + c.mastHeight * 0.9);
    rz += k * 0.55 * (ship.id % 2 === 0 ? 1 : -1);
    rx -= k * 0.3;
  }
  v.body.position.y = y;
  v.body.rotation.set(rx, 0, rz);
  v.root.visible = ship.state !== "sunk";

  // Dégâts visibles.
  v.tear.value = 1 - ship.sails / ship.sailsMax;
  const hullDamage = 1 - ship.hull / ship.hullMax;
  v.hullMaterial.color.setScalar(1 - 0.5 * hullDamage);
  const visible: Record<BatteryId, number> = {
    babord: gunsAvailable(ship, "babord"),
    tribord: gunsAvailable(ship, "tribord"),
    proue: gunsAvailable(ship, "proue"),
    poupe: gunsAvailable(ship, "poupe"),
  };
  const key = `${visible.babord}${visible.tribord}${visible.proue}${visible.poupe}`;
  if (key !== v.gunKey) {
    v.gunKey = key;
    v.gunSlots.forEach((slot, i) =>
      v.cannons.setMatrixAt(i, slot.index < visible[slot.battery] ? slot.matrix : ZERO),
    );
    v.cannons.instanceMatrix.needsUpdate = true;
  }

  // Pavillon qui claque au vent.
  if (v.flag && v.flagBase) {
    const pos = v.flag.geometry.attributes.position as THREE.BufferAttribute;
    const base = v.flagBase;
    for (let i = 0; i < pos.count; i++) {
      const z = base[i * 3 + 2];
      const along = Math.abs(z);
      pos.setX(i, base[i * 3] + Math.sin(time * 7 + along * 2.2 + ship.id) * along * 0.12);
    }
    pos.needsUpdate = true;
  }
  const flicker = 0.9 + Math.sin(time * 13 + ship.id) * 0.05 + Math.sin(time * 29) * 0.05;
  for (const l of v.lanterns) l.material.opacity = ship.state === "afloat" ? flicker : 0.3;
}

export function disposeShipVisual(v: ShipVisual): void {
  v.root.removeFromParent();
  for (const d of v.disposables) d.dispose();
  v.cannons.dispose();
}

/** Point aléatoire sur le pont, en coordonnées monde (flammes, fumée). */
export function randomDeckPoint(
  v: ShipVisual,
  rnd: () => number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const c = v.cls;
  const t = 0.12 + rnd() * 0.76;
  out.set((rnd() - 0.5) * c.beam * 0.6 * halfBeam(t), sheer(c, t) + 0.4, (t - 0.5) * c.length);
  v.body.updateMatrixWorld();
  return out.applyMatrix4(v.body.matrixWorld);
}

/** Position monde d'un point local du navire. */
export function localToWorld(
  v: ShipVisual,
  x: number,
  y: number,
  z: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  out.set(x, y, z);
  v.body.updateMatrixWorld();
  return out.applyMatrix4(v.body.matrixWorld);
}
