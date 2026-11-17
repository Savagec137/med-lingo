/**
 * Les cinq décors : lumière, sol, bordures, accessoires, forteresse et
 * obstacles habillés selon le thème du niveau.
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ROAD_GLOW, ROAD_TEXTURES } from "./assets/roads";
import type { LevelDef, ThemeId } from "./levels";
import { buildFortress, type FortressModel, type FortressStyle } from "./models";
import {
  balusterGeometry,
  brokenPillarGeometry,
  cactusGeometry,
  colorize,
  crystalGeometry,
  deadTreeGeometry,
  displace,
  flameMaterial,
  flowerBedGeometry,
  hedgeGeometry,
  lampGeometry,
  lanternGlowGeometry,
  lavaMaterial,
  merge,
  mesaGeometry,
  palmGeometry,
  pineGeometry,
  rockGeometry,
  roundTreeGeometry,
  snowMoundGeometry,
  standingStoneGeometry,
  topiaryGeometry,
  torchGeometry,
  vertexColorMaterial,
  waterMaterial,
} from "./props";
import { makeRng } from "./sim";
import {
  bannerTexture,
  brickTexture,
  groundTexture,
  leafTexture,
  pavingTexture,
  type GroundStyle,
  type PavingStyle,
} from "./textures";

/**
 * Routes peintes générées avec Higgsfield : une image par thème, décodée une
 * seule fois. Taille d'un motif au sol, en mètres (des pierres à l'échelle des soldats).
 */
const ROAD_TILE: Record<ThemeId, number> = {
  jardin: 5.2,
  canyon: 3.4,
  fjord: 3.4,
  forge: 3.6,
  citadelle: 3.8,
};
const roadImages = new Map<string, HTMLImageElement>();
function cachedImage(key: string, src: string) {
  let img = roadImages.get(key);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = src;
    roadImages.set(key, img);
  }
  return img;
}
const roadImage = (id: ThemeId) => cachedImage(id, ROAD_TEXTURES[id]);
const glowImage = (id: ThemeId) => {
  const src = ROAD_GLOW[id];
  return src ? cachedImage(id + ":glow", src) : null;
};

/** Décode d'avance les routes peintes, pour qu'elles soient prêtes au premier niveau. */
export function preloadRoads() {
  for (const id of Object.keys(ROAD_TEXTURES) as ThemeId[]) {
    roadImage(id);
    glowImage(id);
  }
}

/** Quand une image est décodée (tout de suite si elle l'est déjà). */
function whenLoaded(img: HTMLImageElement, fn: () => void) {
  if (img.complete && img.naturalWidth > 0) fn();
  else img.addEventListener("load", fn, { once: true });
}

export interface ThemeDef {
  paving: PavingStyle;
  ground: GroundStyle;
  curb: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  sun: { color: number; intensity: number; dir: [number, number, number] };
  hemi: { sky: number; ground: number; intensity: number };
  exposure: number;
  fortress: FortressStyle;
  /** Couleur d'accent de l'interface. */
  accent: string;
  menuGradient: [string, string];
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  jardin: {
    paving: { hue: 222, sat: 0.07, light: 0.79, grout: "#9ea3ad" },
    ground: { base: [104, 0.45, 0.36], detail: "grass" },
    curb: 0xd9d5cb,
    fog: 0xcfe6ff,
    fogNear: 45,
    fogFar: 120,
    sun: { color: 0xfff2dc, intensity: 2.7, dir: [-0.45, 1, 0.35] },
    hemi: { sky: 0xcfe8ff, ground: 0x5b7f3a, intensity: 1.0 },
    exposure: 1.0,
    fortress: { stone: [8, 0.35, 0.48], roof: 0xb81f2c },
    accent: "#4cc35a",
    menuGradient: ["#7fd36b", "#2f8a3d"],
  },
  canyon: {
    paving: { hue: 34, sat: 0.38, light: 0.7, grout: "#a8784a" },
    ground: { base: [33, 0.55, 0.62], detail: "sand" },
    curb: 0xd8a56a,
    fog: 0xf6d6a8,
    fogNear: 45,
    fogFar: 115,
    sun: { color: 0xffe0b0, intensity: 3.0, dir: [0.55, 1, 0.25] },
    hemi: { sky: 0xffe9c8, ground: 0xc98a4c, intensity: 0.95 },
    exposure: 1.0,
    fortress: { stone: [18, 0.4, 0.42], roof: 0xa71d24 },
    accent: "#f2a33a",
    menuGradient: ["#ffcf6e", "#d9782c"],
  },
  fjord: {
    paving: { hue: 205, sat: 0.35, light: 0.86, grout: "#9cb5cc" },
    ground: { base: [210, 0.35, 0.93], detail: "snow" },
    curb: 0xcfe4f5,
    fog: 0xe2efff,
    fogNear: 40,
    fogFar: 110,
    sun: { color: 0xf2f7ff, intensity: 2.4, dir: [-0.3, 1, 0.5] },
    hemi: { sky: 0xdcecff, ground: 0x9fb4cc, intensity: 1.05 },
    exposure: 0.95,
    fortress: { stone: [215, 0.12, 0.5], roof: 0xb52232 },
    accent: "#58b7ff",
    menuGradient: ["#bfe6ff", "#4b8fd6"],
  },
  forge: {
    paving: { hue: 12, sat: 0.12, light: 0.3, grout: "#1a1212", glow: true },
    ground: { base: [10, 0.12, 0.17], detail: "ash" },
    curb: 0x2c2424,
    fog: 0x3a1a12,
    fogNear: 35,
    fogFar: 95,
    sun: { color: 0xffb08a, intensity: 1.8, dir: [0.3, 1, 0.4] },
    hemi: { sky: 0x9a5a48, ground: 0x2a0e08, intensity: 1.0 },
    exposure: 1.05,
    fortress: { stone: [5, 0.25, 0.26], roof: 0x8f1a14 },
    accent: "#ff6a2a",
    menuGradient: ["#ff8a4a", "#8f1f12"],
  },
  citadelle: {
    paving: { hue: 230, sat: 0.1, light: 0.38, grout: "#1c1f2b", cobble: true },
    ground: { base: [150, 0.2, 0.18], detail: "moss" },
    curb: 0x40445a,
    fog: 0x141a33,
    fogNear: 32,
    fogFar: 92,
    sun: { color: 0xa9c2ff, intensity: 1.5, dir: [-0.5, 1, 0.2] },
    hemi: { sky: 0x4a5c94, ground: 0x151826, intensity: 0.9 },
    exposure: 1.15,
    fortress: { stone: [240, 0.12, 0.34], roof: 0x7a1424 },
    accent: "#9b7bff",
    menuGradient: ["#6b5cff", "#1d1846"],
  },
};

export interface World {
  group: THREE.Group;
  theme: ThemeDef;
  /** Absente en mode Survie : il n'y a rien à prendre, seulement à tenir. */
  fortress: FortressModel | null;
  sun: THREE.DirectionalLight;
  update(t: number, dt: number): void;
  dispose(): void;
}

interface Placement {
  x: number;
  z: number;
  r: number;
}

export function buildWorld(level: LevelDef, baseZ: number, baseHalfW: number): World {
  const theme = THEMES[level.theme];
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const updaters: ((t: number, dt: number) => void)[] = [];
  const rng = makeRng(level.id * 101 + 7);
  const W = level.width;
  const L = level.length;
  const hw = W / 2;
  const sv = level.survival ?? null;
  /** Profondeur totale du terrain, entonnoir compris. */
  const depthAll = L + (sv ? sv.funnel.depth : 0);
  /** Demi-largeur praticable (le terrain, puis l'entonnoir qui s'évase). */
  const halfWAt = (z: number) => {
    if (!sv || z >= -L) return hw;
    const t = Math.min(1, (-L - z) / sv.funnel.depth);
    return sv.funnel.throatHalfW + (sv.funnel.topHalfW - sv.funnel.throatHalfW) * t;
  };

  const track = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  // --- Lumières
  const hemi = new THREE.HemisphereLight(theme.hemi.sky, theme.hemi.ground, theme.hemi.intensity);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(theme.sun.color, theme.sun.intensity);
  const dir = new THREE.Vector3(...theme.sun.dir).normalize();
  const center = new THREE.Vector3(0, 0, -depthAll / 2 + 2);
  sun.position.copy(center).addScaledVector(dir, 45);
  sun.target.position.copy(center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const ext = depthAll / 2 + 10;
  sun.shadow.camera.left = -ext;
  sun.shadow.camera.right = ext;
  sun.shadow.camera.top = ext;
  sun.shadow.camera.bottom = -ext;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 110;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  group.add(sun, sun.target);

  // --- Sol extérieur
  const groundTex = track(groundTexture(theme.ground, level.id * 13));
  groundTex.repeat.set(30, 30);
  const groundMat = track(new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 }));
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(220, 220)), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.03, -depthAll / 2);
  ground.receiveShadow = true;
  group.add(ground);

  // --- Chemin dallé
  const pathFar = sv ? -L - 0.6 : -L - 4;
  const pathLen = 6 - pathFar;
  const pathMid = (6 + pathFar) / 2;
  const pathTex = track(pavingTexture(theme.paving, level.id * 7));
  pathTex.repeat.set(W / 4.4, pathLen / 4.4);
  const pathMat = track(
    new THREE.MeshStandardMaterial({
      map: pathTex,
      roughness: level.theme === "fjord" ? 0.35 : 0.8,
      metalness: level.theme === "fjord" ? 0.05 : 0,
      emissive: level.theme === "forge" ? new THREE.Color(0xff4a10) : new THREE.Color(0),
      emissiveMap: level.theme === "forge" ? pathTex : null,
      emissiveIntensity: level.theme === "forge" ? 0.35 : 0,
    }),
  );
  const path = new THREE.Mesh(track(new THREE.PlaneGeometry(W, pathLen)), pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0, pathMid);
  path.receiveShadow = true;
  group.add(path);
  // La route peinte remplace la texture dessinée en code dès que son image est décodée.
  let disposed = false;
  const tile = ROAD_TILE[level.theme];
  const roadTex = (img: HTMLImageElement, srgb: boolean) => {
    const tex = track(new THREE.Texture(img));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.repeat.set(W / tile, pathLen / tile);
    tex.needsUpdate = true;
    return tex;
  };
  const glow = glowImage(level.theme);
  whenLoaded(roadImage(level.theme), () => {
    if (disposed) return;
    pathMat.map = roadTex(roadImage(level.theme), true);
    // Sans masque, la texture dessinée en code garde son rôle de lueur.
    if (pathMat.emissiveMap && !glow) pathMat.emissiveMap = pathMat.map;
    pathMat.needsUpdate = true;
  });
  if (glow) {
    whenLoaded(glow, () => {
      if (disposed) return;
      // Seules les fissures de lave brillent, le basalte reste éteint.
      pathMat.emissiveMap = roadTex(glow, false);
      pathMat.emissive.setHex(0xff6a1a);
      pathMat.emissiveIntensity = 1.7;
      pathMat.needsUpdate = true;
    });
  }
  // Liseré d'ombre au pied des bordures : la route paraît encaissée, construite.
  const edgeTex = track(edgeShadeTexture());
  const edgeMat = track(
    new THREE.MeshBasicMaterial({
      map: edgeTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(track(new THREE.PlaneGeometry(1.1, pathLen)), edgeMat);
    strip.rotation.x = -Math.PI / 2;
    if (side > 0) strip.rotation.z = Math.PI;
    strip.position.set(side * (hw - 0.55), 0.004, pathMid);
    strip.renderOrder = -2;
    group.add(strip);
  }
  // Socle du chemin (épaisseur visible)
  const plinth = new THREE.Mesh(
    track(new THREE.BoxGeometry(W + 0.5, 0.35, pathLen)),
    track(new THREE.MeshStandardMaterial({ color: theme.curb, roughness: 0.8 })),
  );
  plinth.position.set(0, -0.18, pathMid);
  plinth.receiveShadow = true;
  group.add(plinth);
  // Ligne de défense devant le canon
  const line = new THREE.Mesh(
    track(new THREE.PlaneGeometry(W, 0.12)),
    track(new THREE.MeshBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0.6 })),
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.012, 0.2);
  group.add(line);

  // --- Placement des accessoires hors du chemin
  const placed: Placement[] = [];
  const free = (x: number, z: number, r: number) => {
    if (sv) {
      // Rien dans l'entonnoir ni dans l'épaisseur de ses falaises.
      if (z < -L + 3 && Math.abs(x) < halfWAt(z) + 6 + r) return false;
      if (Math.abs(x) < hw + 1.0 + r) return false;
    } else {
      if (Math.abs(x) < hw + 1.0 + r) return false;
      if (z < baseZ - 1 && Math.abs(x) < baseHalfW + 3.5 + r) return false;
    }
    for (const p of placed) if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + r) ** 2) return false;
    return true;
  };
  const scatter = (
    count: number,
    r: number,
    minAbsX: number,
    maxAbsX: number,
    zMin = -depthAll - 26,
    zMax = 14,
  ) => {
    const out: Placement[] = [];
    let tries = 0;
    while (out.length < count && tries < count * 40) {
      tries++;
      const side = rng() < 0.5 ? -1 : 1;
      const x = side * (minAbsX + rng() * (maxAbsX - minAbsX));
      const z = zMin + rng() * (zMax - zMin);
      if (!free(x, z, r)) continue;
      const p = { x, z, r };
      placed.push(p);
      out.push(p);
    }
    return out;
  };
  const instanced = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    items: Placement[],
    scale: [number, number],
    cast = true,
    yOff = 0,
  ) => {
    track(geo);
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    items.forEach((it, i) => {
      const k = scale[0] + rng() * (scale[1] - scale[0]);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);
      s.set(k, k, k);
      p.set(it.x, yOff, it.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.count = items.length;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const vc = vertexColorMaterial(0.85);
  const vcFlat = vertexColorMaterial(0.9, true);

  // Bordure basse continue (bordure de trottoir)
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(
      track(new RoundedBoxGeometry(0.3, 0.18, pathLen, 2, 0.05)),
      track(new THREE.MeshStandardMaterial({ color: theme.curb, roughness: 0.7 })),
    );
    curb.position.set(side * (hw + 0.1), 0.09, pathMid);
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);
  }
  const zStart = 4;
  const zEnd = sv ? -L + 0.4 : baseZ - 0.5;

  // --- Décor par thème
  switch (level.theme) {
    case "jardin": {
      buildBalustrade(group, track, hw, zStart, zEnd);
      // Canaux d'eau de part et d'autre
      const waterMat = track(waterMaterial(0x1b4f57, 0x3d8a86, 0.96));
      for (const side of [-1, 1]) {
        const cw = 2.3;
        const water = new THREE.Mesh(track(new THREE.PlaneGeometry(cw, L + 30)), waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(side * (hw + 0.55 + cw / 2), 0.0, -L / 2 - 2);
        group.add(water);
        const bank = new THREE.Mesh(
          track(new RoundedBoxGeometry(0.35, 0.3, L + 30, 2, 0.06)),
          track(new THREE.MeshStandardMaterial({ color: 0xe3ded2, roughness: 0.7 })),
        );
        bank.position.set(side * (hw + 0.55 + cw + 0.17), 0.1, -L / 2 - 2);
        bank.castShadow = true;
        bank.receiveShadow = true;
        group.add(bank);
        placed.push({ x: side * (hw + 1.7), z: -L / 2, r: 0.1 });
      }
      // Rangées de haies taillées
      const leafTex = track(leafTexture(112, level.id));
      const hedgeMat = track(
        new THREE.MeshStandardMaterial({
          map: leafTex,
          vertexColors: true,
          roughness: 0.95,
          color: 0x8ed07a,
        }),
      );
      const hx = hw + 0.55 + 2.3 + 0.35 + 0.8;
      for (const side of [-1, 1]) {
        let z = 8;
        while (z > -L - 18) {
          const len = 5 + rng() * 4;
          const g = track(hedgeGeometry(1.5, 1.6, len, Math.round(z)));
          const hedge = new THREE.Mesh(g, hedgeMat);
          hedge.position.set(side * (hx + 0.75), 0, z - len / 2);
          hedge.castShadow = true;
          hedge.receiveShadow = true;
          group.add(hedge);
          z -= len + 1.2;
        }
        placed.push({ x: side * (hx + 0.75), z: -L / 2, r: 0.1 });
      }
      // Grand massif devant la forteresse, comme un parterre à la française
      for (const side of [-1, 1]) {
        const g = track(hedgeGeometry(4.5, 2.2, 7, 77 + side));
        const block = new THREE.Mesh(g, hedgeMat);
        block.position.set(side * (baseHalfW + 4.6), 0, baseZ - 1.5);
        block.castShadow = true;
        group.add(block);
      }
      const minX = hx + 2;
      instanced(roundTreeGeometry(0x3f9b3a, 2), vc, scatter(26, 1.6, minX, 30), [0.9, 1.4]);
      instanced(roundTreeGeometry(0x5fae3c, 5), vc, scatter(14, 1.5, minX, 30), [0.8, 1.2]);
      instanced(topiaryGeometry(3, false), vc, scatter(10, 0.8, minX, 18), [0.9, 1.1]);
      instanced(topiaryGeometry(4, true), vc, scatter(10, 0.8, minX, 18), [0.9, 1.1]);
      instanced(flowerBedGeometry(2.4, 1.2, 4), vc, scatter(12, 1.4, minX, 24), [1, 1.2]);
      const lamps = scatter(10, 0.4, minX - 0.6, minX + 2);
      instanced(lampGeometry(), vertexColorMaterial(0.4, false, 0.6), lamps, [1, 1]);
      instanced(
        lanternGlowGeometry(),
        track(
          new THREE.MeshStandardMaterial({
            color: 0xfff1c2,
            emissive: 0xffd77a,
            emissiveIntensity: 1.4,
          }),
        ),
        lamps,
        [1, 1],
        false,
      );
      for (const p of scatter(3, 2.6, minX + 2, 22, -L, 6))
        buildFountain(group, track, p.x, p.z, waterMat, updaters);
      break;
    }
    case "canyon": {
      // Muret de grès
      const blocks: Placement[] = [];
      for (const side of [-1, 1])
        for (let z = zStart; z > zEnd; z -= 0.95) blocks.push({ x: side * (hw + 0.55), z, r: 0.1 });
      const blockMesh = instancedBlocks(group, track, blocks, [0.9, 0.55, 0.6], 0xd99c5c, rng);
      void blockMesh;
      instanced(mesaGeometry(3), vcFlat, scatter(9, 4.5, hw + 10, 34), [3, 5.5]);
      instanced(mesaGeometry(6), vcFlat, scatter(7, 3.5, hw + 7, 30), [2, 3.2]);
      instanced(rockGeometry(0xc27a45, 4), vcFlat, scatter(30, 0.8, hw + 1.6, 26), [0.4, 1.1]);
      instanced(cactusGeometry(5), vc, scatter(26, 0.7, hw + 2, 26), [0.8, 1.3]);
      // Oasis : bassins entourés de palmiers
      const waterMat = track(waterMaterial(0x16708a, 0x5ac9d6, 0.95));
      for (const p of scatter(2, 4.5, hw + 6, 16, -L + 4, 4)) {
        const pool = new THREE.Mesh(track(new THREE.CircleGeometry(2.6, 28)), waterMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(p.x, 0.01, p.z);
        group.add(pool);
        const rim = new THREE.Mesh(
          track(new THREE.TorusGeometry(2.6, 0.2, 6, 28)),
          track(new THREE.MeshStandardMaterial({ color: 0xd9a66b, roughness: 0.9 })),
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.set(p.x, 0.05, p.z);
        group.add(rim);
        const palms: Placement[] = [];
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + rng();
          palms.push({ x: p.x + Math.cos(a) * 3.3, z: p.z + Math.sin(a) * 3.3, r: 0.5 });
        }
        instanced(
          palmGeometry(k(level.id)),
          track(
            new THREE.MeshStandardMaterial({
              vertexColors: true,
              roughness: 0.8,
              side: THREE.DoubleSide,
            }),
          ),
          palms,
          [1, 1.3],
        );
      }
      // Dunes
      const dune = track(
        colorize(
          displace(
            new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            0.05,
            1.5,
            3,
          ).scale(6, 1.2, 4),
          0xe9b979,
          0.05,
          0.1,
          2,
        ),
      );
      instanced(dune, vc, scatter(8, 6, hw + 6, 40, -L - 30, 10), [0.8, 1.4], false, -0.2);
      break;
    }
    case "fjord": {
      const blocks: Placement[] = [];
      for (const side of [-1, 1])
        for (let z = zStart; z > zEnd; z -= 1.05) blocks.push({ x: side * (hw + 0.55), z, r: 0.1 });
      instancedIce(group, track, blocks, rng);
      instanced(pineGeometry(true, 2), vc, scatter(60, 1.2, hw + 2, 34), [1.1, 1.9]);
      instanced(pineGeometry(true, 5), vc, scatter(30, 1.1, hw + 2, 34), [0.8, 1.3]);
      instanced(snowMoundGeometry(3), vc, scatter(24, 1.4, hw + 1.6, 30), [0.6, 1.4], false);
      const crystalMat = track(
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.1,
          metalness: 0.1,
          emissive: 0x2a6f9f,
          emissiveIntensity: 0.35,
          flatShading: true,
        }),
      );
      instanced(crystalGeometry(4), crystalMat, scatter(16, 0.8, hw + 1.6, 22), [0.7, 1.4]);
      // Lac gelé
      for (const p of scatter(2, 5, hw + 7, 20, -L, 0)) {
        const lake = new THREE.Mesh(
          track(new THREE.CircleGeometry(4.2, 32)),
          track(
            new THREE.MeshStandardMaterial({ color: 0x9fd2ee, roughness: 0.05, metalness: 0.3 }),
          ),
        );
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(p.x, 0.01, p.z);
        lake.receiveShadow = true;
        group.add(lake);
      }
      // Montagnes au loin
      const mountain = track(
        colorize(
          displace(new THREE.ConeGeometry(1, 1.4, 10, 5), 0.08, 2, 9),
          0x8aa2bf,
          0.1,
          0.4,
          5,
        ),
      );
      const peaks: Placement[] = [];
      for (let k = 0; k < 9; k++)
        peaks.push({ x: (k - 4) * 12 + (rng() - 0.5) * 6, z: -L - 34 - rng() * 14, r: 1 });
      instanced(mountain, vcFlat, peaks, [12, 20], false);
      const caps = track(
        colorize(
          new THREE.ConeGeometry(0.42, 0.6, 10, 1).translate(0, 0.42, 0),
          0xffffff,
          0.03,
          0,
          1,
        ),
      );
      instanced(caps, vcFlat, peaks, [12, 20], false);
      // Neige qui tombe
      updaters.push(buildPrecipitation(group, track, W + 30, L + 30, 1400, 0xffffff, -1.2, 0.09));
      break;
    }
    case "forge": {
      const rocks: Placement[] = [];
      for (const side of [-1, 1])
        for (let z = zStart; z > zEnd; z -= 0.9)
          rocks.push({ x: side * (hw + 0.6 + rng() * 0.15), z, r: 0.1 });
      instanced(rockGeometry(0x2d2626, 7), vcFlat, rocks, [0.35, 0.55]);
      // Rivières de lave
      const lava = track(lavaMaterial());
      for (const side of [-1, 1]) {
        const river = new THREE.Mesh(track(new THREE.PlaneGeometry(2.4, L + 40)), lava);
        river.rotation.x = -Math.PI / 2;
        river.position.set(side * (hw + 2.4), 0.0, -L / 2 - 4);
        group.add(river);
        const bankRocks: Placement[] = [];
        for (let z = 10; z > -L - 20; z -= 1.1)
          bankRocks.push({ x: side * (hw + 3.9 + rng() * 0.4), z, r: 0.1 });
        instanced(rockGeometry(0x221c1c, 3), vcFlat, bankRocks, [0.4, 0.8]);
        placed.push({ x: side * (hw + 2.4), z: -L / 2, r: 0.1 });
      }
      instanced(rockGeometry(0x3a2f2c, 8), vcFlat, scatter(40, 1, hw + 4.6, 30), [0.6, 1.6]);
      instanced(brokenPillarGeometry(0x4a3a36, 2), vc, scatter(10, 0.8, hw + 5, 20), [0.9, 1.3]);
      instanced(brokenPillarGeometry(0x4a3a36, 4), vc, scatter(8, 0.8, hw + 5, 20), [0.9, 1.3]);
      // Volcans au loin
      const volcano = track(
        colorize(
          displace(new THREE.CylinderGeometry(0.25, 1, 1, 14, 4, true), 0.06, 2, 4),
          0x3b2622,
          0.12,
          0.35,
          3,
        ),
      );
      const vs: Placement[] = [
        { x: -22, z: -L - 38, r: 1 },
        { x: 16, z: -L - 46, r: 1 },
        { x: 40, z: -L - 30, r: 1 },
      ];
      instanced(volcano, vcFlat, vs, [18, 24], false);
      const glowMat = track(new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
      for (const v of vs) {
        const g = new THREE.Mesh(track(new THREE.CircleGeometry(4.6, 18)), glowMat);
        g.rotation.x = -Math.PI / 2;
        g.position.set(v.x, 20.5, v.z);
        group.add(g);
      }
      updaters.push(buildPrecipitation(group, track, W + 24, L + 24, 600, 0xff8a3a, 1.1, 0.12));
      break;
    }
    case "citadelle": {
      // Rempart bas crénelé
      const wallTex = track(brickTexture(235, 0.1, 0.36, 4));
      wallTex.repeat.set(pathLen / 2, 1);
      const wallMat = track(new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }));
      for (const side of [-1, 1]) {
        const len = zStart - zEnd;
        const wall = new THREE.Mesh(track(new THREE.BoxGeometry(0.5, 0.7, len)), wallMat);
        wall.position.set(side * (hw + 0.55), 0.35, (zStart + zEnd) / 2);
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
        const merl: Placement[] = [];
        for (let z = zStart - 0.4; z > zEnd; z -= 0.9)
          merl.push({ x: side * (hw + 0.55), z, r: 0.1 });
        const mg = track(new THREE.BoxGeometry(0.5, 0.3, 0.45));
        const mm = new THREE.InstancedMesh(mg, wallMat, merl.length);
        merl.forEach((p, i) =>
          mm.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, 0.85, p.z)),
        );
        mm.castShadow = true;
        group.add(mm);
      }
      // Torches et halos
      const flame = track(flameMaterial(0xff8a2a));
      const flameGeo = track(new THREE.ConeGeometry(0.16, 0.55, 8, 3, true).translate(0, 0.27, 0));
      const torchGeo = track(torchGeometry());
      const torchMat = vertexColorMaterial(0.8);
      let lightCount = 0;
      for (let z = 1; z > zEnd + 2; z -= 7.5) {
        for (const side of [-1, 1]) {
          const tx = side * (hw + 0.55);
          const torch = new THREE.Mesh(torchGeo, torchMat);
          torch.position.set(tx, 0.7, z);
          torch.castShadow = true;
          group.add(torch);
          const f = new THREE.Mesh(flameGeo, flame);
          f.position.set(tx, 2.31, z);
          group.add(f);
        }
        if (lightCount < 4) {
          const pl = new THREE.PointLight(0xff9a4a, 9, 11, 1.6);
          pl.position.set(lightCount % 2 ? hw - 0.5 : -hw + 0.5, 2.6, z);
          group.add(pl);
          const base = pl.intensity;
          const seed = z;
          updaters.push((t) => {
            pl.intensity =
              base * (0.85 + Math.sin(t * 13 + seed) * 0.08 + Math.sin(t * 7.3 + seed * 2) * 0.07);
          });
          lightCount++;
        }
      }
      instanced(deadTreeGeometry(3), vc, scatter(22, 1, hw + 2, 30), [1, 1.6]);
      instanced(standingStoneGeometry(2), vcFlat, scatter(18, 0.7, hw + 1.8, 24), [0.8, 1.3]);
      instanced(rockGeometry(0x3a3f4f, 6), vcFlat, scatter(26, 0.8, hw + 1.6, 28), [0.4, 1]);
      // Tours lointaines de la citadelle
      const towerTex = track(brickTexture(235, 0.1, 0.32, 9));
      towerTex.repeat.set(3, 3);
      const towerMat = track(new THREE.MeshStandardMaterial({ map: towerTex, roughness: 0.9 }));
      const roofMat = track(new THREE.MeshStandardMaterial({ color: 0x2b2f6a, roughness: 0.6 }));
      const winMat = track(new THREE.MeshBasicMaterial({ color: 0xffc46a }));
      for (const p of scatter(8, 2.4, hw + 8, 30, -L - 10, 4)) {
        const h = 5 + rng() * 4;
        const tower = new THREE.Mesh(track(new THREE.CylinderGeometry(1.4, 1.6, h, 14)), towerMat);
        tower.position.set(p.x, h / 2, p.z);
        tower.castShadow = true;
        group.add(tower);
        const roof = new THREE.Mesh(track(new THREE.ConeGeometry(1.8, 2.6, 14)), roofMat);
        roof.position.set(p.x, h + 1.3, p.z);
        roof.castShadow = true;
        group.add(roof);
        for (let k = 0; k < 2; k++) {
          const win = new THREE.Mesh(track(new THREE.PlaneGeometry(0.3, 0.6)), winMat);
          win.position.set(p.x + (p.x > 0 ? -1 : 1) * 1.45, h * (0.45 + k * 0.25), p.z + 0.3);
          win.rotation.y = p.x > 0 ? -Math.PI / 2 : Math.PI / 2;
          group.add(win);
        }
      }
      // Lune et étoiles
      const moon = new THREE.Mesh(
        track(new THREE.SphereGeometry(4, 24, 16)),
        track(new THREE.MeshBasicMaterial({ color: 0xf4f1ff })),
      );
      moon.position.set(-26, 34, -L - 60);
      group.add(moon);
      const halo = new THREE.Mesh(
        track(new THREE.CircleGeometry(9, 32)),
        track(
          new THREE.MeshBasicMaterial({
            color: 0x8fa6ff,
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
          }),
        ),
      );
      halo.position.copy(moon.position).add(new THREE.Vector3(0, 0, -1));
      group.add(halo);
      updaters.push(buildFireflies(group, track, W + 20, L + 20));
      break;
    }
  }

  // --- Habillage des bords de route : ce qu'on voit dans les marges de l'écran
  dressEdges(level.theme, group, track, updaters, rng, hw, zStart, zEnd, L, W);

  // --- Obstacles du niveau, habillés selon le thème
  for (const o of level.obstacles) {
    if (o.kind === "box") {
      const w = o.maxX - o.minX;
      const d = o.maxZ - o.minZ;
      const h = o.height ?? 1.4;
      const mesh = obstacleBox(level.theme, w, h, d, track, rng);
      mesh.position.set((o.minX + o.maxX) / 2, 0, (o.minZ + o.maxZ) / 2);
      group.add(mesh);
    } else {
      const h = o.height ?? 2.2;
      const mesh = obstaclePillar(level.theme, o.r, h, track);
      mesh.position.set(o.x, 0, o.z);
      group.add(mesh);
    }
  }

  // --- Forteresse (siège) ou entonnoir de la horde (survie)
  let fortress: FortressModel | null = null;
  if (sv) {
    buildFunnel(group, track, level, sv, rng);
  } else {
    fortress = buildFortress(baseHalfW, level.enemy.doors, theme.fortress);
    fortress.group.position.z = baseZ;
    group.add(fortress.group);
    fortress.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        track(mesh.geometry);
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) track(m);
      }
    });
    // Esplanade sous la forteresse
    const apron = new THREE.Mesh(
      track(new THREE.BoxGeometry(baseHalfW * 2 + 6, 0.3, 8)),
      track(new THREE.MeshStandardMaterial({ color: theme.curb, roughness: 0.85 })),
    );
    apron.position.set(0, -0.14, baseZ - 3.5);
    apron.receiveShadow = true;
    group.add(apron);
  }

  return {
    group,
    theme,
    fortress,
    sun,
    update(t, dt) {
      for (const u of updaters) u(t, dt);
    },
    dispose() {
      disposed = true;
      for (const d of disposables) d.dispose();
      sun.shadow.map?.dispose();
    },
  };
}

/**
 * L'entonnoir du mode Survie : un défilé de grès qui s'évase vers le fond,
 * fermé de part et d'autre du goulot, pavoisé aux couleurs des pillards.
 */
function buildFunnel(
  group: THREE.Group,
  track: Track,
  level: LevelDef,
  sv: NonNullable<LevelDef["survival"]>,
  rng: () => number,
) {
  const L = level.length;
  const hw = level.width / 2;
  const f = sv.funnel;
  const zTop = -L - f.depth - 14;
  const wTop = f.topHalfW + ((f.topHalfW - f.throatHalfW) * 14) / f.depth;

  // Sol piétiné de l'entonnoir
  const floorGeo = track(new THREE.BufferGeometry());
  const m0 = f.throatHalfW + 1.2;
  const m1 = wTop + 1.2;
  const pos = [-m0, 0, -L + 0.2, m0, 0, -L + 0.2, m1, 0, zTop, -m1, 0, zTop];
  const uv = pos.filter((_, i) => i % 3 !== 1).map((v) => v / 5);
  floorGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  floorGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uv), 2));
  floorGeo.setIndex([0, 1, 2, 0, 2, 3]);
  floorGeo.computeVertexNormals();
  const floorTex = track(groundTexture({ base: [26, 0.42, 0.5], detail: "sand" }, 91));
  const floor = new THREE.Mesh(
    floorGeo,
    track(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 })),
  );
  floor.position.y = -0.012;
  floor.receiveShadow = true;
  group.add(floor);

  // Falaises : colonnes de grès serrées le long des deux diagonales et du front
  const near: THREE.Matrix4[] = [];
  const far: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const put = (list: THREE.Matrix4[], x: number, z: number, radius: number, height: number) => {
    q.setFromAxisAngle(up, rng() * Math.PI * 2);
    list.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, -0.1, z),
        q,
        new THREE.Vector3(radius, height / 3.4, radius),
      ),
    );
  };
  for (const side of [-1, 1]) {
    // Diagonales : la paroi monte à mesure qu'on s'éloigne du goulot.
    const steps = Math.ceil((f.depth + 14) / 1.7);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const z = -L - t * (f.depth + 14);
      const w = f.throatHalfW + (wTop - f.throatHalfW) * t;
      const r = 1.25 + rng() * 0.5;
      put(near, side * (w + r * 0.82), z, r, 2.1 + t * 2.2 + rng() * 0.8);
      put(far, side * (w + r + 2 + rng() * 1.5), z - 0.6, 2.2 + rng(), 3.6 + t * 3 + rng() * 1.6);
    }
    // Front : ferme le terrain entre le goulot et le bord, puis se prolonge.
    for (let x = f.throatHalfW + 1.1; x < hw + 16; x += 1.6) {
      const r = 1.2 + rng() * 0.45;
      put(near, side * x, -L - r * 0.7, r, 2 + rng() * 0.7 + Math.max(0, x - hw) * 0.25);
      put(far, side * (x + 0.8), -L - 3.2 - rng(), 2.1 + rng() * 0.8, 3.6 + rng() * 2);
    }
  }
  const rock = vertexColorMaterial(0.9, true);
  for (const [list, seed] of [
    [near, 4],
    [far, 9],
  ] as const) {
    const geo = track(mesaGeometry(seed));
    const mesh = new THREE.InstancedMesh(geo, rock, list.length);
    list.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Étendards des pillards de part et d'autre du goulot, et le long du défilé
  const banner = track(bannerTexture());
  const bannerMat = track(
    new THREE.MeshStandardMaterial({
      map: banner,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.8,
    }),
  );
  const poleMat = track(new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.8 }));
  const boneMat = track(new THREE.MeshStandardMaterial({ color: 0xf2e7c9, roughness: 0.5 }));
  const poleGeo = track(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 6));
  const clothGeo = track(new THREE.PlaneGeometry(1.1, 2.2));
  const skullGeo = track(new THREE.SphereGeometry(0.22, 8, 6));
  const hornGeo = track(new THREE.ConeGeometry(0.07, 0.42, 5));
  const stand = (x: number, z: number, yaw: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.3;
    pole.castShadow = true;
    g.add(pole);
    const cloth = new THREE.Mesh(clothGeo, bannerMat);
    cloth.position.set(0.62, 3.3, 0);
    g.add(cloth);
    const skull = new THREE.Mesh(skullGeo, boneMat);
    skull.position.y = 4.75;
    g.add(skull);
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(hornGeo, boneMat);
      horn.position.set(sx * 0.26, 4.9, 0);
      horn.rotation.z = -sx * 0.9;
      g.add(horn);
    }
    group.add(g);
  };
  for (const side of [-1, 1]) {
    stand(side * (f.throatHalfW + 0.7), -L + 0.9, side > 0 ? 0 : Math.PI);
    for (const t of [0.3, 0.62, 0.95]) {
      const z = -L - t * f.depth;
      const w = f.throatHalfW + (f.topHalfW - f.throatHalfW) * t;
      stand(side * (w + 0.5), z, side > 0 ? 0.5 : Math.PI - 0.5);
    }
  }
}

function k(n: number) {
  return n * 3 + 1;
}

type Track = <T extends { dispose(): void }>(x: T) => T;

function buildBalustrade(
  group: THREE.Group,
  track: Track,
  hw: number,
  zStart: number,
  zEnd: number,
) {
  const stone = track(new THREE.MeshStandardMaterial({ color: 0xf1eee6, roughness: 0.6 }));
  for (const side of [-1, 1]) {
    const x = side * (hw + 0.3);
    const len = zStart - zEnd;
    const cz = (zStart + zEnd) / 2;
    const base = new THREE.Mesh(track(new RoundedBoxGeometry(0.34, 0.16, len, 2, 0.04)), stone);
    base.position.set(x, 0.08, cz);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    const rail = new THREE.Mesh(track(new RoundedBoxGeometry(0.3, 0.14, len, 2, 0.05)), stone);
    rail.position.set(x, 0.79, cz);
    rail.castShadow = true;
    rail.receiveShadow = true;
    group.add(rail);
    const count = Math.floor(len / 0.32);
    const baluster = track(balusterGeometry());
    const inst = new THREE.InstancedMesh(baluster, vertexColorMaterial(0.6), count);
    for (let i = 0; i < count; i++)
      inst.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0.16, zStart - 0.16 - i * 0.32));
    inst.castShadow = true;
    inst.receiveShadow = true;
    group.add(inst);
    const posts = Math.floor(len / 3);
    const postGeo = track(new RoundedBoxGeometry(0.4, 0.95, 0.4, 2, 0.06));
    const postInst = new THREE.InstancedMesh(postGeo, stone, posts + 1);
    for (let i = 0; i <= posts; i++)
      postInst.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0.47, zStart - i * 3));
    postInst.castShadow = true;
    group.add(postInst);
    const capGeo = track(new THREE.SphereGeometry(0.16, 10, 6));
    const capInst = new THREE.InstancedMesh(capGeo, stone, posts + 1);
    for (let i = 0; i <= posts; i++)
      capInst.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 1.05, zStart - i * 3));
    capInst.castShadow = true;
    group.add(capInst);
  }
}

function instancedBlocks(
  group: THREE.Group,
  track: Track,
  items: Placement[],
  size: [number, number, number],
  color: number,
  rng: () => number,
) {
  const geo = track(new RoundedBoxGeometry(size[0], size[1], size[2], 2, 0.08));
  const mat = track(new THREE.MeshStandardMaterial({ roughness: 0.9 }));
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const c = new THREE.Color();
  const m = new THREE.Matrix4();
  items.forEach((p, i) => {
    m.makeRotationY((rng() - 0.5) * 0.15);
    m.setPosition(p.x, size[1] / 2 + (rng() - 0.5) * 0.06, p.z);
    mesh.setMatrixAt(i, m);
    c.setHex(color).multiplyScalar(0.85 + rng() * 0.25);
    mesh.setColorAt(i, c);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function instancedIce(group: THREE.Group, track: Track, items: Placement[], rng: () => number) {
  const geo = track(new RoundedBoxGeometry(0.85, 0.62, 0.95, 2, 0.1));
  const mat = track(
    new THREE.MeshStandardMaterial({
      color: 0xbfe6ff,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const ice = new THREE.InstancedMesh(geo, mat, items.length);
  const snowGeo = track(
    colorize(
      displace(
        new THREE.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
        0.04,
        3,
        1,
      ).scale(0.95, 0.35, 1.0),
      0xffffff,
      0.03,
      0,
      2,
    ),
  );
  const snow = new THREE.InstancedMesh(snowGeo, vertexColorMaterial(0.9), items.length);
  const m = new THREE.Matrix4();
  items.forEach((p, i) => {
    const h = 0.31 + (rng() - 0.5) * 0.08;
    m.makeRotationY((rng() - 0.5) * 0.2);
    m.setPosition(p.x, h, p.z);
    ice.setMatrixAt(i, m);
    m.setPosition(p.x, h + 0.3, p.z);
    snow.setMatrixAt(i, m);
  });
  ice.castShadow = true;
  ice.receiveShadow = true;
  snow.receiveShadow = true;
  group.add(ice, snow);
}

function obstacleBox(
  theme: ThemeId,
  w: number,
  h: number,
  d: number,
  track: Track,
  rng: () => number,
): THREE.Object3D {
  const g = new THREE.Group();
  switch (theme) {
    case "jardin": {
      const leafTex = track(leafTexture(110, 5));
      const mesh = new THREE.Mesh(
        track(hedgeGeometry(w, h, d, 5)),
        track(
          new THREE.MeshStandardMaterial({
            map: leafTex,
            vertexColors: true,
            roughness: 0.95,
            color: 0x8ed07a,
          }),
        ),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      break;
    }
    case "canyon": {
      const mesh = new THREE.Mesh(
        track(
          colorize(
            displace(new RoundedBoxGeometry(w, h, d, 3, 0.15), 0.06, 2, 3).translate(0, h / 2, 0),
            0xd38a4e,
            0.15,
            0.3,
            4,
          ),
        ),
        vertexColorMaterial(0.9, true),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      break;
    }
    case "fjord": {
      const mesh = new THREE.Mesh(
        track(new RoundedBoxGeometry(w, h, d, 3, 0.12).translate(0, h / 2, 0)),
        track(
          new THREE.MeshStandardMaterial({
            color: 0xa8dcff,
            roughness: 0.08,
            metalness: 0.2,
            transparent: true,
            opacity: 0.85,
            emissive: 0x1b5d8a,
            emissiveIntensity: 0.25,
          }),
        ),
      );
      mesh.castShadow = true;
      g.add(mesh);
      const snow = new THREE.Mesh(
        track(
          colorize(
            displace(new RoundedBoxGeometry(w + 0.08, 0.16, d + 0.08, 2, 0.07), 0.02, 4, 2),
            0xffffff,
            0.03,
            0,
            1,
          ),
        ),
        vertexColorMaterial(0.9),
      );
      snow.position.y = h + 0.04;
      g.add(snow);
      break;
    }
    case "forge": {
      const mesh = new THREE.Mesh(
        track(
          colorize(
            displace(new RoundedBoxGeometry(w, h, d, 3, 0.15), 0.05, 2.4, 6).translate(0, h / 2, 0),
            0x2f2828,
            0.18,
            0.25,
            6,
          ),
        ),
        vertexColorMaterial(0.9, true),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      break;
    }
    case "citadelle": {
      const tex = track(brickTexture(235, 0.1, 0.4, 7));
      tex.repeat.set(Math.max(1, w / 1.5), Math.max(1, h / 1.2));
      const mat = track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
      const mesh = new THREE.Mesh(
        track(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0)),
        mat,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      const n = Math.max(2, Math.round(w / 0.7));
      for (let i = 0; i < n; i++) {
        const mer = new THREE.Mesh(track(new THREE.BoxGeometry(0.4, 0.35, d * 0.9)), mat);
        mer.position.set(-w / 2 + 0.2 + (i * (w - 0.4)) / (n - 1), h + 0.17, 0);
        mer.castShadow = true;
        g.add(mer);
      }
      break;
    }
  }
  void rng;
  return g;
}

function obstaclePillar(theme: ThemeId, r: number, h: number, track: Track): THREE.Object3D {
  if (theme === "canyon") {
    const geo = track(mesaGeometry(11));
    const mesh = new THREE.Mesh(geo, vertexColorMaterial(0.9, true));
    mesh.scale.set(r, h / 3.4, r);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  const color = theme === "forge" ? 0x3a2f2c : theme === "citadelle" ? 0x5a5f72 : 0xe6e1d6;
  const mesh = new THREE.Mesh(
    track(
      colorize(
        new THREE.CylinderGeometry(r * 0.85, r, h, 14, 3).translate(0, h / 2, 0),
        color,
        0.1,
        0.25,
        3,
      ),
    ),
    vertexColorMaterial(0.8),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildFountain(
  group: THREE.Group,
  track: Track,
  x: number,
  z: number,
  waterMat: THREE.Material,
  updaters: ((t: number, dt: number) => void)[],
) {
  const stone = track(new THREE.MeshStandardMaterial({ color: 0xece7dc, roughness: 0.6 }));
  const f = new THREE.Group();
  f.position.set(x, 0, z);
  const basinGeo = track(new THREE.CylinderGeometry(2.2, 2.35, 0.55, 28, 1, true));
  const outer = new THREE.Mesh(basinGeo, stone);
  outer.position.y = 0.27;
  f.add(outer);
  const lip = new THREE.Mesh(track(new THREE.TorusGeometry(2.25, 0.13, 8, 32)), stone);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.56;
  f.add(lip);
  const water = new THREE.Mesh(track(new THREE.CircleGeometry(2.2, 28)), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.42;
  f.add(water);
  const column = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.32, 1.4, 12)), stone);
  column.position.y = 1.0;
  f.add(column);
  const bowl = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.85, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)),
    stone,
  );
  bowl.position.y = 1.95;
  f.add(bowl);
  const bowlWater = new THREE.Mesh(track(new THREE.CircleGeometry(0.78, 20)), waterMat);
  bowlWater.rotation.x = -Math.PI / 2;
  bowlWater.position.y = 1.93;
  f.add(bowlWater);
  const jetMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xbfeaff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const jet = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.05, 0.12, 0.9, 8, 1, true)),
    jetMat,
  );
  jet.position.y = 2.4;
  f.add(jet);
  const curtain = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.82, 1.3, 1.5, 24, 1, true)),
    jetMat,
  );
  curtain.position.y = 1.2;
  f.add(curtain);
  updaters.push((t) => {
    jet.scale.y = 1 + Math.sin(t * 6) * 0.12;
    curtain.scale.x = curtain.scale.z = 1 + Math.sin(t * 4) * 0.03;
  });
  f.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== water && o !== jet && o !== curtain && o !== bowlWater) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  group.add(f);
}

/** Neige (vitesse négative) ou braises (vitesse positive). */
function buildPrecipitation(
  group: THREE.Group,
  track: Track,
  w: number,
  l: number,
  count: number,
  color: number,
  speed: number,
  size: number,
) {
  const pos = new Float32Array(count * 3);
  const rng = makeRng(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rng() - 0.5) * w;
    pos[i * 3 + 1] = rng() * 14;
    pos[i * 3 + 2] = 6 - rng() * l;
  }
  const geo = track(new THREE.BufferGeometry());
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = track(
    new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: speed > 0 ? 0.95 : 0.85,
      depthWrite: false,
      blending: speed > 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
    }),
  );
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  group.add(pts);
  return (t: number, dt: number) => {
    const a = geo.attributes.position as THREE.BufferAttribute;
    const arr = a.array as Float32Array;
    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + speed * dt * (0.7 + ((i * 7) % 10) * 0.06);
      if (y < 0) y += 14;
      if (y > 14) y -= 14;
      arr[i * 3 + 1] = y;
      arr[i * 3] += Math.sin(t * 0.8 + i) * dt * 0.25;
    }
    a.needsUpdate = true;
  };
}

function buildFireflies(group: THREE.Group, track: Track, w: number, l: number) {
  const count = 120;
  const base = new Float32Array(count * 3);
  const pos = new Float32Array(count * 3);
  const rng = makeRng(42);
  for (let i = 0; i < count; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    base[i * 3] = side * (w / 2 - 8 + rng() * 10);
    base[i * 3 + 1] = 0.5 + rng() * 2;
    base[i * 3 + 2] = 4 - rng() * l;
  }
  const geo = track(new THREE.BufferGeometry());
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = track(
    new THREE.PointsMaterial({
      color: 0xc8ff7a,
      size: 0.16,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  group.add(pts);
  return (t: number) => {
    for (let i = 0; i < count; i++) {
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.7 + i * 1.3) * 0.8;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 1.1 + i) * 0.4;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.6 + i * 0.7) * 0.8;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };
}

export { merge };

/** Dégradé d'ombre, opaque côté bordure (à gauche de la texture). */
function edgeShadeTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 4;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  const grad = g.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, "rgba(10,8,6,0.42)");
  grad.addColorStop(0.35, "rgba(10,8,6,0.16)");
  grad.addColorStop(1, "rgba(10,8,6,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Accessoires plantés le long des bordures, assez hauts pour se voir dans les
 * marges de l'écran : lampadaires du jardin, torches du canyon, lanternes de
 * glace, braseros de la forge, étendards de la citadelle ; et de quoi animer l'air.
 */
function dressEdges(
  theme: ThemeId,
  group: THREE.Group,
  track: Track,
  updaters: ((t: number, dt: number) => void)[],
  rng: () => number,
  hw: number,
  zStart: number,
  zEnd: number,
  L: number,
  W: number,
) {
  const along = (step: number, offset = 0) => {
    const out: number[] = [];
    for (let z = zStart - 1.5 - offset; z > zEnd + 1; z -= step) out.push(z);
    return out;
  };
  const instancedAt = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    spots: [number, number, number, number][],
    cast = true,
  ) => {
    track(geo);
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, spots.length));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    spots.forEach(([x, y, z, k], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(k, k, k));
      mesh.setMatrixAt(i, m);
    });
    mesh.count = spots.length;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const flames = (spots: [number, number, number, number][], color: number) => {
    const mat = track(flameMaterial(color));
    const geo = track(new THREE.ConeGeometry(0.16, 0.55, 8, 3, true).translate(0, 0.27, 0));
    for (const [x, y, z, k] of spots) {
      const f = new THREE.Mesh(geo, mat);
      f.position.set(x, y, z);
      f.scale.setScalar(k);
      group.add(f);
    }
  };
  const flicker = (spots: [number, number, number][], color: number, power: number, max = 4) => {
    spots.slice(0, max).forEach(([x, y, z], i) => {
      const pl = new THREE.PointLight(color, power, 9, 1.6);
      pl.position.set(x, y, z);
      group.add(pl);
      updaters.push((t) => {
        pl.intensity =
          power * (0.82 + Math.sin(t * 11 + i * 1.7) * 0.1 + Math.sin(t * 6.1 + i) * 0.08);
      });
    });
  };
  const sides = [-1, 1];
  switch (theme) {
    case "jardin": {
      // Lampadaires sur les piliers de la balustrade, un pilier sur deux.
      const spots: [number, number, number, number][] = [];
      for (const side of sides)
        for (let z = zStart; z > zEnd; z -= 6) spots.push([side * (hw + 0.3), 0.95, z, 0.72]);
      instancedAt(lampGeometry(), vertexColorMaterial(0.4, false, 0.6), spots);
      instancedAt(
        lanternGlowGeometry(),
        track(
          new THREE.MeshStandardMaterial({
            color: 0xfff1c2,
            emissive: 0xffd77a,
            emissiveIntensity: 1.6,
          }),
        ),
        spots,
        false,
      );
      // Pétales qui volent au-dessus du jardin.
      updaters.push(buildPrecipitation(group, track, W + 16, L + 24, 260, 0xffbfd8, -0.45, 0.1));
      break;
    }
    case "canyon": {
      // Torches plantées sur le muret de grès.
      const spots: [number, number, number, number][] = [];
      for (const side of sides)
        for (const z of along(7, side > 0 ? 3.5 : 0)) spots.push([side * (hw + 0.55), 0.52, z, 1]);
      instancedAt(torchGeometry(), vertexColorMaterial(0.8), spots);
      flames(
        spots.map(([x, y, z]) => [x, y + 1.61, z, 1.1] as [number, number, number, number]),
        0xffa040,
      );
      // Poussière de sable portée par le vent.
      updaters.push(buildPrecipitation(group, track, W + 12, L + 20, 320, 0xf4d29c, 0.18, 0.06));
      break;
    }
    case "fjord": {
      // Lanternes de glace : cristaux lumineux posés sur les blocs de glace.
      const mat = track(
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.1,
          metalness: 0.1,
          emissive: 0x3a9be0,
          emissiveIntensity: 0.9,
          flatShading: true,
        }),
      );
      const spots: [number, number, number, number][] = [];
      for (const side of sides)
        for (const z of along(6, side > 0 ? 3 : 0)) spots.push([side * (hw + 0.55), 0.5, z, 0.75]);
      instancedAt(crystalGeometry(9), mat, spots);
      // Halo bleuté au pied de chaque lanterne.
      const haloMat = track(
        new THREE.MeshBasicMaterial({
          color: 0x6fc4ff,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const haloGeo = track(new THREE.CircleGeometry(1.1, 20));
      for (const [x, , z] of spots) {
        const h = new THREE.Mesh(haloGeo, haloMat);
        h.rotation.x = -Math.PI / 2;
        h.position.set(x - Math.sign(x) * 0.7, 0.012, z);
        group.add(h);
      }
      break;
    }
    case "forge": {
      // Braseros de fer le long de la route.
      const bowl = merge([
        colorize(
          new THREE.CylinderGeometry(0.09, 0.14, 0.9, 6).translate(0, 0.45, 0),
          0x2a2224,
          0.05,
        ),
        colorize(
          new THREE.CylinderGeometry(0.36, 0.18, 0.3, 10).translate(0, 1.05, 0),
          0x3a2c28,
          0.08,
        ),
        colorize(
          new THREE.TorusGeometry(0.36, 0.05, 5, 10).rotateX(Math.PI / 2).translate(0, 1.2, 0),
          0x5a4038,
          0.05,
        ),
        colorize(
          new THREE.SphereGeometry(0.28, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(
            0,
            1.14,
            0,
          ),
          0xff7a2a,
          0.15,
        ),
      ]);
      const spots: [number, number, number, number][] = [];
      for (const side of sides)
        for (const z of along(6.5, side > 0 ? 3.2 : 0)) spots.push([side * (hw + 0.62), 0, z, 1]);
      instancedAt(bowl, vertexColorMaterial(0.7, false, 0.3), spots);
      flames(
        spots.map(([x, , z]) => [x, 1.16, z, 1.7] as [number, number, number, number]),
        0xff7a2a,
      );
      flicker(
        spots
          .filter((_, i) => i % 3 === 0)
          .map(([x, , z]) => [x * 0.92, 1.8, z] as [number, number, number]),
        0xff7a3a,
        7,
      );
      break;
    }
    case "citadelle": {
      // Étendards bleu nuit entre les torches, côté route.
      const banner = track(bannerTexture("#3a2f8f", 29));
      const bannerMat = track(
        new THREE.MeshStandardMaterial({
          map: banner,
          transparent: true,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
          roughness: 0.8,
        }),
      );
      const poleMat = track(
        new THREE.MeshStandardMaterial({ color: 0x2a2430, roughness: 0.6, metalness: 0.4 }),
      );
      const poleGeo = track(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 6));
      const clothGeo = track(new THREE.PlaneGeometry(0.75, 1.5));
      const cloths: THREE.Mesh[] = [];
      for (const side of sides) {
        for (const z of along(15, side > 0 ? 7.5 : 3.75)) {
          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.set(side * (hw + 0.55), 1.7 + 0.7, z);
          pole.castShadow = true;
          group.add(pole);
          const cloth = new THREE.Mesh(clothGeo, bannerMat);
          cloth.position.set(side * (hw + 0.55) - side * 0.42, 2.9, z);
          cloth.castShadow = true;
          group.add(cloth);
          cloths.push(cloth);
        }
      }
      updaters.push((t) => {
        cloths.forEach((c, i) => {
          c.rotation.y = Math.sin(t * 1.3 + i) * 0.12;
        });
      });
      break;
    }
  }
}
