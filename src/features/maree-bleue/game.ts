/**
 * Marée Bleue — point d'entrée. Monte le jeu dans un conteneur DOM et renvoie
 * de quoi le démonter proprement.
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Sfx } from "./audio";
import { Debris, Glows, Rings } from "./effects";
import { LEVELS, starsFor, type LevelDef } from "./levels";
import {
  buildCannon,
  buildGate,
  buildGeyser,
  buildGiantGeometry,
  buildSoldierGeometry,
  buildSpinner,
  sharedTime,
  soldierMaterial,
  type CannonModel,
  type GateModel,
} from "./models";
import { disposeSharedMaterials } from "./props";
import { GIANT_SCALE, KIND_GIANT, Pool, Sim } from "./sim";
import { radialTexture } from "./textures";
import { GameUi, type Progress } from "./ui";
import { buildWorld, type World } from "./world";

const STORAGE_KEY = "maree-bleue:v1";
const STEP = 1 / 60;

export interface MareeBleueOptions {
  /** Affiche un bouton « Quitter » dans le menu. */
  onExit?: () => void;
}

export interface MareeBleueHandle {
  dispose(): void;
}

type Mode = "menu" | "playing" | "paused" | "ended";

function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (typeof p.unlocked === "number" && p.stars)
        return { unlocked: Math.max(1, Math.min(LEVELS.length, p.unlocked)), stars: p.stars };
    }
  } catch {
    /* stockage indisponible : on repart de zéro */
  }
  return { unlocked: 1, stars: {} };
}

function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* navigation privée : la progression reste en mémoire */
  }
}

function loadMuted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY + ":muted") === "1";
  } catch {
    return false;
  }
}

/** Une foule : soldats normaux + géants, chacun avec son ombre portée. */
class CrowdView {
  readonly normal: THREE.InstancedMesh;
  readonly giant: THREE.InstancedMesh;
  readonly normalShadow: THREE.InstancedMesh;
  readonly giantShadow: THREE.InstancedMesh;

  constructor(team: "blue" | "red", cap: number, shadowTex: THREE.Texture) {
    this.normal = new THREE.InstancedMesh(buildSoldierGeometry(team), soldierMaterial(11), cap);
    this.giant = new THREE.InstancedMesh(buildGiantGeometry(team), soldierMaterial(6.5), 64);
    const shadowGeo = new THREE.PlaneGeometry(0.62, 0.62);
    shadowGeo.rotateX(-Math.PI / 2);
    shadowGeo.translate(0, 0.018, 0);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
    });
    this.normalShadow = new THREE.InstancedMesh(shadowGeo, shadowMat, cap);
    this.giantShadow = new THREE.InstancedMesh(shadowGeo, shadowMat, 64);
    this.normalShadow.instanceMatrix = this.normal.instanceMatrix;
    this.giantShadow.instanceMatrix = this.giant.instanceMatrix;
    for (const m of [this.normal, this.giant]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      m.castShadow = false;
      m.receiveShadow = false;
    }
    for (const m of [this.normalShadow, this.giantShadow]) {
      m.frustumCulled = false;
      m.count = 0;
      m.renderOrder = -1;
    }
  }

  add(scene: THREE.Object3D) {
    scene.add(this.normalShadow, this.giantShadow, this.normal, this.giant);
  }

  sync(p: Pool) {
    const na = this.normal.instanceMatrix.array as Float32Array;
    const ga = this.giant.instanceMatrix.array as Float32Array;
    let a = 0;
    let b = 0;
    const gcap = this.giant.instanceMatrix.count;
    for (let i = 0; i < p.n; i++) {
      const giant = p.kind[i] === KIND_GIANT;
      if (giant && b >= gcap) continue;
      let k = giant ? GIANT_SCALE : 1;
      const age = p.age[i];
      if (age < 0.2) {
        const u = age / 0.2;
        k *= u < 1 ? 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2 : 1;
      }
      const yaw = Math.atan2(p.fx[i], p.fz[i]);
      const c = Math.cos(yaw) * k;
      const s = Math.sin(yaw) * k;
      const arr = giant ? ga : na;
      const o = (giant ? b++ : a++) * 16;
      arr[o] = c;
      arr[o + 1] = 0;
      arr[o + 2] = -s;
      arr[o + 3] = 0;
      arr[o + 4] = 0;
      arr[o + 5] = k;
      arr[o + 6] = 0;
      arr[o + 7] = 0;
      arr[o + 8] = s;
      arr[o + 9] = 0;
      arr[o + 10] = c;
      arr[o + 11] = 0;
      arr[o + 12] = p.x[i];
      arr[o + 13] = 0;
      arr[o + 14] = p.z[i];
      arr[o + 15] = 1;
    }
    this.normal.count = a;
    this.normalShadow.count = a;
    this.giant.count = b;
    this.giantShadow.count = b;
    this.normal.instanceMatrix.needsUpdate = true;
    this.giant.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    for (const m of [this.normal, this.giant]) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      m.dispose();
    }
    this.normalShadow.geometry.dispose();
    (this.normalShadow.material as THREE.Material).dispose();
  }
}

export function createMareeBleue(
  container: HTMLElement,
  options: MareeBleueOptions = {},
): MareeBleueHandle {
  const root = document.createElement("div");
  root.className = "mb-root";
  container.appendChild(root);

  // --- Rendu
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  // Qualité adaptative : on baisse la résolution si l'appareil peine.
  const ratios = [2, 1.6, 1.25, 1];
  let ratioStep = ratios.findIndex((r) => r <= Math.min(window.devicePixelRatio || 1, 2));
  if (ratioStep < 0) ratioStep = ratios.length - 1;
  renderer.setPixelRatio(ratios[ratioStep]);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 260);
  const camBase = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  let shake = 0;

  // --- Objets persistants
  const shadowTex = radialTexture("rgba(0,0,0,0.5)");
  const blueView = new CrowdView("blue", 2200, shadowTex);
  const redView = new CrowdView("red", 1800, shadowTex);
  blueView.add(scene);
  redView.add(scene);
  const cannon: CannonModel = buildCannon();
  cannon.group.scale.setScalar(1.35);
  scene.add(cannon.group);
  const debris = new Debris();
  const glows = new Glows();
  const rings = new Rings();
  scene.add(debris.mesh, glows.mesh, rings.group);
  const sfx = new Sfx();
  sfx.muted = loadMuted();

  // --- État de partie
  let progress = loadProgress();
  let mode: Mode = "menu";
  let levelIndex = 0;
  let sim: Sim;
  let world: World | null = null;
  let gateModels: GateModel[] = [];
  let hazardViews: { update(): void; group: THREE.Group }[] = [];
  let levelGroup = new THREE.Group();
  scene.add(levelGroup);
  let acc = 0;
  let endTimer = -1;
  let peakBlue = 0;
  let collapse = 0;
  let wasReady = false;
  let demo = true;
  let demoX = 0;

  // --- Entrées
  const input = { targetX: 0, firing: false };
  let pointerId: number | null = null;
  let lastPx = 0;
  let pxPerUnit = 40;
  const keys = new Set<string>();

  const ui = new GameUi(root, {
    onPlay: (i) => {
      sfx.unlock();
      sfx.click();
      startLevel(i, false);
    },
    onPause: () => {
      if (mode !== "playing") return;
      sfx.click();
      mode = "paused";
      input.firing = false;
      ui.showPause();
    },
    onResume: () => {
      sfx.click();
      mode = "playing";
      ui.closeModal();
    },
    onRestart: () => {
      sfx.click();
      startLevel(levelIndex, false);
    },
    onMenu: () => {
      sfx.click();
      goMenu();
    },
    onNext: () => {
      sfx.click();
      startLevel(Math.min(LEVELS.length - 1, levelIndex + 1), false);
    },
    onChampion: () => {
      sfx.unlock();
      if (mode === "playing") sim.fireChampion();
    },
    onToggleSound: () => {
      sfx.unlock();
      sfx.setMuted(!sfx.muted);
      ui.setMuted(sfx.muted);
      try {
        window.localStorage.setItem(STORAGE_KEY + ":muted", sfx.muted ? "1" : "0");
      } catch {
        /* sans importance */
      }
      sfx.click();
    },
    onExit: options.onExit,
  });
  ui.setMuted(sfx.muted);

  function clearLevel() {
    if (world) {
      levelGroup.remove(world.group);
      world.dispose();
      world = null;
    }
    for (const g of gateModels) {
      g.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mat = m.material as THREE.MeshBasicMaterial;
          mat.map?.dispose();
          mat.dispose();
          if (m === g.panel || m === g.glow) m.geometry.dispose();
        }
      });
    }
    gateModels = [];
    hazardViews = [];
    scene.remove(levelGroup);
    levelGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && o.userData.own) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((x) => x.dispose());
      }
    });
    levelGroup = new THREE.Group();
    scene.add(levelGroup);
    debris.clear();
    glows.clear();
    rings.clear();
  }

  function startLevel(i: number, asDemo: boolean) {
    clearLevel();
    levelIndex = i;
    demo = asDemo;
    const lvl = LEVELS[i];
    sim = new Sim(lvl, (Date.now() & 0xffff) + i);
    world = buildWorld(lvl, sim.baseZ, sim.baseHalfW);
    levelGroup.add(world.group);
    scene.fog = new THREE.Fog(world.theme.fog, world.theme.fogNear, world.theme.fogFar);
    scene.background = new THREE.Color(world.theme.fog);
    renderer.toneMappingExposure = world.theme.exposure;

    for (const g of lvl.gates) {
      const gm = buildGate(g.op, g.value, g.w, !!g.gold);
      gm.group.position.set(g.x, 0, g.z);
      levelGroup.add(gm.group);
      gateModels.push(gm);
    }
    sim.hazards.forEach((h) => {
      if (h.def.kind === "spinner") {
        const sp = buildSpinner(h.def.r);
        sp.group.position.set(h.def.x, 0, h.def.z);
        sp.group.traverse((o) => (o.userData.own = true));
        levelGroup.add(sp.group);
        hazardViews.push({ group: sp.group, update: () => (sp.rotor.rotation.y = -h.angle) });
      } else {
        const gy = buildGeyser(h.def.r);
        gy.group.position.set(h.def.x, 0, h.def.z);
        gy.group.traverse((o) => (o.userData.own = true));
        levelGroup.add(gy.group);
        const colMat = gy.column.material as THREE.MeshBasicMaterial;
        const coreMat = gy.core.material as THREE.MeshBasicMaterial;
        hazardViews.push({
          group: gy.group,
          update: () => {
            const period = (h.def as { period: number }).period;
            if (h.phase === 0) {
              gy.poolMat.emissiveIntensity = 0.9 + Math.sin(sharedTime.value * 3) * 0.15;
              colMat.opacity = Math.max(0, colMat.opacity - 0.05);
              coreMat.opacity = Math.max(0, coreMat.opacity - 0.06);
            } else if (h.phase === 1) {
              gy.poolMat.emissiveIntensity = 1.6 + Math.sin(sharedTime.value * 30) * 0.8;
              colMat.opacity = 0.08 + Math.random() * 0.06;
              gy.column.scale.set(0.6, 0.15, 0.6);
            } else {
              const u = Math.min(1, (h.timer - (period - 0.7)) / 0.15);
              gy.poolMat.emissiveIntensity = 3;
              colMat.opacity = 0.75;
              coreMat.opacity = 0.9;
              gy.column.scale.set(1, u, 1);
              gy.core.scale.set(1, u, 1);
            }
          },
        });
      }
    });

    acc = 0;
    endTimer = -1;
    peakBlue = 0;
    collapse = 0;
    wasReady = false;
    input.targetX = 0;
    input.firing = false;
    demoX = 0;
    world.fortress.group.position.y = 0;
    world.fortress.group.rotation.set(0, 0, 0);
    frameCamera();
    if (asDemo) {
      mode = "menu";
      ui.showMenu(progress);
    } else {
      mode = "playing";
      ui.showHud(lvl);
    }
  }

  function goMenu() {
    const next = Math.min(LEVELS.length - 1, Math.max(0, progress.unlocked - 1));
    startLevel(next, true);
  }

  // --- Cadrage : tout le terrain, du canon à la forteresse
  function frameCamera() {
    const w = root.clientWidth || 1;
    const hgt = root.clientHeight || 1;
    const aspect = w / hgt;
    camera.aspect = aspect;
    const lvl = sim.level;
    const portrait = aspect < 1;
    const pitch = THREE.MathUtils.degToRad(portrait ? 50 : 46);
    camera.fov = portrait ? 50 : 42;
    camera.updateProjectionMatrix();
    const f = THREE.MathUtils.degToRad(camera.fov);
    const cotA = 1 / Math.tan(pitch - f / 2);
    const cotB = 1 / Math.tan(pitch + f / 2);
    // Le bas de l'écran montre le canon ; le haut, la forteresse sous le HUD.
    const zNear = 3.4;
    const zFar = -lvl.length - (portrait ? 11 : 8);
    const halfW = lvl.width / 2 + 0.3;
    const probe = new THREE.Vector3();
    const place = (H: number) => {
      const zc = zNear + H * cotB;
      camera.position.set(0, H, zc);
      camLook.set(0, 0, zc - H / Math.tan(pitch));
      camera.lookAt(camLook);
      camera.updateMatrixWorld();
      return zc - H * cotA;
    };
    const fits = (H: number) => {
      const top = place(H);
      probe.set(halfW, 0, 1.3).project(camera);
      return top <= zFar && Math.abs(probe.x) <= 0.98;
    };
    let lo = 3;
    let hi = 220;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    place(hi);
    camBase.copy(camera.position);
    const a = new THREE.Vector3(-1, 0, 1.3).project(camera);
    const b = new THREE.Vector3(1, 0, 1.3).project(camera);
    pxPerUnit = Math.max(4, (Math.abs(b.x - a.x) / 2) * w);
  }

  function resize() {
    const w = root.clientWidth || 1;
    const hgt = root.clientHeight || 1;
    renderer.setSize(w, hgt, false);
    frameCamera();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(root);

  // --- Pointeur : maintenir pour tirer, glisser pour viser
  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  const onDown = (e: PointerEvent) => {
    if (mode !== "playing") return;
    sfx.unlock();
    pointerId = e.pointerId;
    lastPx = e.clientX;
    input.firing = true;
    ui.hideHint();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* capture non disponible */
    }
  };
  const onMove = (e: PointerEvent) => {
    if (pointerId !== e.pointerId || mode !== "playing") return;
    const dx = e.clientX - lastPx;
    lastPx = e.clientX;
    input.targetX += (dx / pxPerUnit) * 1.15;
    const lim = sim.halfW - 0.9;
    input.targetX = Math.max(-lim, Math.min(lim, input.targetX));
  };
  const onUp = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    pointerId = null;
    input.firing = false;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  const onKeyDown = (e: KeyboardEvent) => {
    if (mode !== "playing") {
      if (e.key === "Escape" && mode === "paused") {
        mode = "playing";
        ui.closeModal();
      }
      return;
    }
    keys.add(e.key.toLowerCase());
    if (e.key === " ") e.preventDefault();
    if (e.key === "Enter" || e.key.toLowerCase() === "e") sim.fireChampion();
    if (e.key === "Escape" || e.key.toLowerCase() === "p") {
      mode = "paused";
      ui.showPause();
    }
    sfx.unlock();
    ui.hideHint();
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  const onVis = () => {
    if (document.hidden && mode === "playing") {
      mode = "paused";
      input.firing = false;
      ui.showPause();
    }
  };
  document.addEventListener("visibilitychange", onVis);

  // --- Pilote automatique du mode démo (derrière le menu)
  function demoBot() {
    const lim = sim.halfW - 0.9;
    let best = demoX;
    let bestScore = -1;
    for (let x = -lim; x <= lim + 1e-6; x += 0.5) {
      let m = 1;
      for (const g of sim.gates) {
        const tArr = (sim.cannonZ - 1 - g.def.z) / 5.7;
        const mv = g.def.move;
        const gx = mv
          ? g.def.x + Math.sin((sim.time + tArr) * mv.speed + (mv.phase ?? 0)) * mv.amp
          : g.def.x;
        if (Math.abs(x - gx) > g.def.w / 2 - 0.3) continue;
        m *= g.def.op === "mul" ? g.def.value : 1 / g.def.value;
      }
      for (const h of sim.hazards) if (Math.abs(x - h.def.x) < h.def.r) m *= 0.6;
      const score = m - Math.abs(x - demoX) * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = x;
      }
    }
    demoX += Math.max(-0.15, Math.min(0.15, best - demoX));
    input.targetX = demoX;
    input.firing = Math.sin(sim.time * 0.7) > -0.6;
  }

  // --- Projection monde → écran pour les textes flottants
  const tmpV = new THREE.Vector3();
  function toScreen(x: number, y: number, z: number) {
    tmpV.set(x, y, z).project(camera);
    return {
      x: (tmpV.x * 0.5 + 0.5) * root.clientWidth,
      y: (-tmpV.y * 0.5 + 0.5) * root.clientHeight,
    };
  }

  // --- Traitement des événements de simulation
  function handleSimOutput() {
    const deaths = sim.deaths;
    const n = sim.deathCount;
    const stride = n > 160 ? Math.ceil(n / 160) : 1;
    for (let k = 0; k < n; k += stride) {
      const o = k * 4;
      const x = deaths[o];
      const z = deaths[o + 1];
      const team = deaths[o + 2];
      const giant = deaths[o + 3] > 0;
      const color = team === 0 ? 0x3d7bff : 0xe3262f;
      debris.burst(x, 0.45, z, giant ? 14 : 2, giant ? 3.5 : 1.8, color, giant ? 1.8 : 1);
      if (giant) {
        debris.burst(x, 0.8, z, 8, 3, 0xffffff, 1.2);
        rings.spawn(x, z, 2.2, team === 0 ? 0x6ab0ff : 0xff6a4a);
      }
      if ((k / stride) % 2 === 0)
        glows.spawn(x, 0.5, z, giant ? 1.6 : 0.55, team === 0 ? 0x4a7dff : 0xff5a3a, 0.25, 1.2);
    }
    if (n > 0 && mode === "playing") sfx.clash();
    const bn = sim.birthCount;
    const bs = bn > 50 ? Math.ceil(bn / 50) : 1;
    for (let k = 0; k < bn; k += bs)
      glows.spawn(sim.births[k * 2], 0.4, sim.births[k * 2 + 1], 0.5, 0x7fc4ff, 0.35, 1.5, 1.2);

    for (const e of sim.events) {
      switch (e.type) {
        case "fire":
          if (!demo) sfx.fire();
          break;
        case "gate": {
          const g = sim.gates[e.index];
          const kind = g.def.op === "div" ? "div" : g.def.gold ? "gold" : "mul";
          if (!demo) sfx.gate_(kind);
          if (e.value < 0) debris.burst(e.x, 0.6, e.z, 1, 1.5, 0xff5566, 0.8);
          break;
        }
        case "baseHit":
          if (e.value > 1) {
            shake = Math.max(shake, 0.6);
            rings.spawn(e.x, e.z + 0.3, 3, 0xffb040);
            debris.burst(e.x, 1.5, e.z + 0.2, 24, 4, 0x8a6a5a, 2);
            if (!demo) {
              sfx.baseHit(true);
              const p = toScreen(e.x, 3, e.z);
              ui.floatText(p.x, p.y, `-${e.value}`, "#ffd23f");
            }
          } else {
            if (Math.random() < 0.3)
              debris.burst(e.x, 1 + Math.random() * 1.4, e.z + 0.15, 1, 1.5, 0x9a7a6a, 1);
            if (Math.random() < 0.4)
              glows.spawn(e.x, 0.6 + Math.random(), e.z + 0.2, 0.7, 0xffa040, 0.25, 1);
            if (!demo) sfx.baseHit(false);
          }
          break;
        case "playerHit":
          shake = Math.max(shake, 0.25);
          debris.burst(e.x, 0.6, e.z, 6, 2.5, 0xff4040, 1.2);
          if (!demo) sfx.playerHit();
          break;
        case "champion":
          rings.spawn(e.x, e.z - 0.8, 2.6, 0xffd23f);
          glows.spawn(e.x, 1.2, e.z - 1.2, 2.4, 0xffd25a, 0.45, 1.2);
          shake = Math.max(shake, 0.3);
          if (!demo) sfx.champion();
          break;
        case "brute":
          glows.spawn(e.x, 1, e.z, 2.5, 0xff3a1a, 0.6, 1);
          break;
        case "eruption":
          shake = Math.max(shake, 0.25);
          debris.burst(e.x, 0.3, e.z, 18, 3, 0xff7a20, 1.3, 2.2);
          for (let k = 0; k < 6; k++)
            glows.spawn(
              e.x + (Math.random() - 0.5) * e.value,
              0.5 + k * 0.6,
              e.z + (Math.random() - 0.5) * e.value,
              1.6,
              0xff8a30,
              0.6,
              1.2,
              2,
            );
          if (!demo) sfx.eruption();
          break;
        case "spinnerHit":
          if (Math.random() < 0.5)
            debris.burst(e.x, 0.6, e.z, 3, 4, e.value === 0 ? 0x3d7bff : 0xe3262f, 1, 1.4);
          if (!demo) sfx.chop();
          break;
        case "won":
          endTimer = 2.4;
          collapse = 0.0001;
          shake = 1;
          if (!demo) sfx.win();
          break;
        case "lost":
          endTimer = 1.6;
          shake = 0.8;
          if (!demo) sfx.lose();
          break;
      }
    }
    sim.drain();
  }

  function finishLevel() {
    const lvl = sim.level;
    const won = sim.state === "won";
    let stars = 0;
    if (won) {
      stars = starsFor(sim.playerHp, lvl.playerHp);
      progress = {
        unlocked: Math.max(progress.unlocked, Math.min(LEVELS.length, lvl.id + 1)),
        stars: { ...progress.stars, [lvl.id]: Math.max(progress.stars[lvl.id] ?? 0, stars) },
      };
      saveProgress(progress);
    }
    mode = "ended";
    input.firing = false;
    ui.showEnd({
      won,
      stars,
      time: sim.endTime,
      shots: sim.shots,
      kills: sim.kills,
      peak: peakBlue,
      hasNext: won && levelIndex < LEVELS.length - 1,
      last: won && levelIndex === LEVELS.length - 1,
    });
  }

  // --- Mise à jour des visuels
  const wheelSpin = { v: 0 };
  function syncVisuals(dt: number, t: number) {
    blueView.sync(sim.blue);
    redView.sync(sim.red);
    peakBlue = Math.max(peakBlue, sim.blue.n);

    cannon.group.position.set(sim.cannonX, 0, sim.cannonZ);
    wheelSpin.v += (sim.cannonVel * dt) / 0.27;
    for (const w of cannon.wheels) w.rotation.x = wheelSpin.v;
    cannon.turret.rotation.z = THREE.MathUtils.clamp(-sim.cannonVel * 0.012, -0.12, 0.12);
    cannon.barrel.position.z = -0.05 + sim.recoil * 0.16;
    (cannon.flash.material as THREE.MeshBasicMaterial).opacity = sim.recoil * sim.recoil * 0.9;
    cannon.flash.scale.setScalar(0.6 + sim.recoil * 0.6);
    const charge = sim.charge / sim.level.chargeShots;
    cannon.tankFill.scale.y = Math.max(0.03, charge);
    const ringMat = cannon.ring.material as THREE.MeshBasicMaterial;
    if (sim.championReady) {
      ringMat.color.setHex(0xffd23f);
      ringMat.opacity = 0.55 + Math.sin(t * 8) * 0.3;
      cannon.ring.scale.setScalar(1 + Math.sin(t * 8) * 0.06);
    } else {
      ringMat.color.setHex(0x5aa8ff);
      ringMat.opacity = 0.35 + sim.playerFlash * 0.5;
      cannon.ring.scale.setScalar(1);
    }
    if (sim.championReady && !wasReady && !demo) sfx.ready();
    wasReady = sim.championReady;

    sim.gates.forEach((g, i) => {
      const gm = gateModels[i];
      gm.group.position.x = g.x;
      const k = 1 + g.pulse * 0.1;
      gm.panel.scale.set(k, k, 1);
      (gm.glow.material as THREE.MeshBasicMaterial).opacity = 0.25 + g.pulse * 0.5;
      gm.orbs.forEach((o, j) => (o.position.y = 1.72 + Math.sin(t * 3 + j * 1.7 + i) * 0.05));
    });
    for (const h of hazardViews) h.update();

    if (world) {
      const f = world.fortress;
      const flash = sim.baseFlash;
      for (const m of f.flashMats) {
        m.emissive.setRGB(flash * 0.6, flash * 0.08, flash * 0.05);
      }
      for (const g of f.doorGlows)
        (g.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 4) * 0.12;
      f.group.position.x = Math.sin(t * 60) * 0.05 * flash;
      if (collapse > 0) {
        collapse += dt;
        const u = Math.min(1, collapse / 2.2);
        f.group.position.y = -u * u * 4.5;
        f.group.rotation.x = -u * 0.25;
        if (Math.random() < 0.6 && collapse < 2.2) {
          const x = (Math.random() - 0.5) * (sim.baseHalfW * 2 + 2);
          debris.burst(
            x,
            2 + Math.random() * 2,
            sim.baseZ - Math.random() * 2,
            4,
            4,
            0x8a7a70,
            2.2,
          );
          glows.spawn(x, 1 + Math.random() * 3, sim.baseZ - 1, 3, 0xffb060, 0.6, 1.5);
          if (Math.random() < 0.15) rings.spawn(x, sim.baseZ + 0.5, 4, 0xffd23f);
          shake = Math.max(shake, 0.35);
        }
        if (collapse > 0.4 && collapse < 2.4 && Math.random() < 0.35) {
          const colors = [0xffd23f, 0x4b8bff, 0xffffff, 0x5ad35a, 0xff6bb5];
          debris.spawn(
            (Math.random() - 0.5) * 10,
            6 + Math.random() * 3,
            sim.baseZ + 6 + Math.random() * 8,
            (Math.random() - 0.5) * 3,
            2,
            (Math.random() - 0.5) * 3,
            1.6,
            1.3,
            colors[Math.floor(Math.random() * colors.length)],
          );
        }
      }
      world.update(t, dt);
    }

    // Caméra : léger tremblement
    shake = Math.max(0, shake - dt * 2.2);
    const sx = (Math.random() - 0.5) * shake * 0.35;
    const sy = (Math.random() - 0.5) * shake * 0.35;
    camera.position.set(camBase.x + sx, camBase.y + sy, camBase.z);
    camera.lookAt(camLook.x + sx * 0.5, camLook.y, camLook.z);
  }

  // --- Boucle principale
  let raf = 0;
  let last = performance.now();
  let uiTimer = 0;
  let perfTime = 0;
  let perfFrames = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const rawDt = (now - last) / 1000;
    const dt = Math.min(0.05, rawDt);
    last = now;
    if (mode === "playing" && rawDt < 0.5) {
      perfTime += rawDt;
      perfFrames++;
      if (perfTime > 2.5) {
        const fps = perfFrames / perfTime;
        if (fps < 42 && ratioStep < ratios.length - 1) {
          ratioStep++;
          renderer.setPixelRatio(ratios[ratioStep]);
          resize();
        }
        perfTime = 0;
        perfFrames = 0;
      }
    }
    const running =
      mode === "playing" || mode === "menu" || (mode === "ended" && sim.state !== "playing");
    if (running) {
      if (mode === "menu") demoBot();
      else if (mode === "playing") {
        const k =
          (keys.has("arrowleft") || keys.has("a") || keys.has("q") ? -1 : 0) +
          (keys.has("arrowright") || keys.has("d") ? 1 : 0);
        if (k !== 0) {
          const lim = sim.halfW - 0.9;
          input.targetX = Math.max(-lim, Math.min(lim, input.targetX + k * 9 * dt));
        }
        if (keys.has(" ")) input.firing = true;
        else if (pointerId === null) input.firing = false;
      }
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 4) {
        sim.step(STEP, mode === "ended" ? { targetX: input.targetX, firing: false } : input);
        handleSimOutput();
        acc -= STEP;
        steps++;
      }
      if (steps === 4) acc = 0;
      if (mode === "menu" && sim.state !== "playing") {
        if (endTimer < 0) endTimer = 3;
      }
      if (endTimer > 0) {
        endTimer -= dt;
        if (endTimer <= 0) {
          endTimer = -1;
          if (mode === "menu") startLevel(levelIndex, true);
          else if (mode === "playing") finishLevel();
        }
      }
    }
    sharedTime.value += mode === "paused" ? 0 : dt;
    syncVisuals(mode === "paused" ? 0 : dt, sharedTime.value);
    debris.update(mode === "paused" ? 0 : dt);
    glows.update(mode === "paused" ? 0 : dt, camera);
    rings.update(mode === "paused" ? 0 : dt);
    renderer.render(scene, camera);

    uiTimer -= dt;
    if (uiTimer <= 0 && (mode === "playing" || mode === "paused")) {
      uiTimer = 0.08;
      ui.update({
        baseHp: sim.baseHp,
        baseMax: sim.level.baseHp,
        hp: sim.playerHp,
        hpMax: sim.level.playerHp,
        blue: sim.blue.n,
        red: sim.red.n,
        charge: sim.charge / sim.level.chargeShots,
        ready: sim.championReady,
      });
    }
  };

  goMenu();
  resize();
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVis);
      clearLevel();
      blueView.dispose();
      redView.dispose();
      debris.dispose();
      glows.dispose();
      rings.dispose();
      shadowTex.dispose();
      envTex.dispose();
      cannon.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
      disposeSharedMaterials();
      sfx.dispose();
      ui.dispose();
      renderer.dispose();
      root.remove();
    },
  };
}

export type { LevelDef };
