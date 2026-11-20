/**
 * Moteur de Naval Battles : relie la simulation, le rendu Three.js, l'audio
 * et l'interface. La simulation avance à pas fixe (60 Hz) ; le rendu lit son
 * état et transforme ses événements en effets.
 *
 * Caméra : vue arrière (« chase ») derrière le galion, comme sur la maquette.
 * Quand une cible approche de la portée, la caméra pivote progressivement vers
 * elle pour garder l'ennemi à l'écran pendant les bordées latérales.
 */

import * as THREE from "three";
import {
  batteryArc,
  effectiveRange,
  enemiesAfloat,
  getPlayer,
  getShip,
  gunsAvailable,
  isAfloat,
} from "../sim/combat.ts";
import { AMMO, type AmmoId, type BatteryId } from "../sim/defs.ts";
import { bearingTo, clamp, dist, headingTo, starboardOf, wrapAngle } from "../sim/math.ts";
import { ARENA_ISLANDS, getMission, objectiveLabel, type MissionDef } from "../sim/missions.ts";
import type { NavalSave } from "../sim/save.ts";
import type { NavalEvent, Ship, World } from "../sim/types.ts";
import { buildLoadout } from "../sim/upgrades.ts";
import {
  batteryHeading,
  battleReport,
  createBattle,
  objectiveProgress,
  plannedBattery,
  playerFire,
  playerFireBattery,
  playerRepair,
  selectTarget,
  setPlayerAmmo,
  stepWorld,
  targetInRange,
  type BattleReport,
  type FireResult,
} from "../sim/world.ts";
import { createAudio, type NavalAudio } from "./audio.ts";
import { createLights, createSky } from "./environment.ts";
import {
  createFx,
  explosion,
  flame,
  impact,
  muzzleFlash,
  smoke,
  splash,
  spray,
  trail,
  type Fx,
} from "./fx.ts";
import { createOcean, type Ocean } from "./ocean.ts";
import { createScenery } from "./scenery.ts";
import {
  createShipVisual,
  disposeShipVisual,
  localToWorld,
  randomDeckPoint,
  syncShipVisual,
  type ShipVisual,
} from "./ship-model.ts";
import { disposeTextures } from "./textures.ts";
import { disposeWaterTextures } from "./water-textures.ts";
import { waveHeight } from "./waves.ts";

export interface HudState {
  hull: number;
  hullMax: number;
  sails: number;
  sailsMax: number;
  cannons: number;
  cannonsMax: number;
  fire: number;
  repairing: number | null;
  repairKits: number;
  repairCooldown: number;
  /** 1 = batterie prête, 0 = vient de tirer. */
  reload: Record<BatteryId, number>;
  planned: BatteryId | null;
  inRange: boolean;
  ammo: AmmoId;
  fireStock: number;
  objective: { label: string; done: number; total: number };
  enemiesLeft: number;
  loot: number;
  speedKnots: number;
  throttle: number;
  target: { name: string; distance: number; elite: boolean } | null;
}

export interface EngineCallbacks {
  onHud(hud: HudState): void;
  onBattleEnd(report: BattleReport): void;
  onToast(text: string, tone: "info" | "danger" | "success"): void;
  onAutoPause(): void;
}

export interface NavalEngine {
  showPort(): void;
  startBattle(missionId: string, save: NavalSave): void;
  setRudder(v: number): void;
  setThrottle(v: number): void;
  fire(): FireResult | null;
  setAmmo(a: AmmoId): boolean;
  repair(): { ok: boolean; reason?: string };
  cycleTarget(): void;
  setPaused(p: boolean): void;
  setSound(on: boolean): void;
  unlockAudio(): void;
  /** Accès de test : état de la simulation courante. */
  debugWorld(): World | null;
  /** Accès de test : coût de rendu de la dernière image. */
  debugStats(): { calls: number; triangles: number; pixelRatio: number; frameMs: number };
  dispose(): void;
}

const STEP = 1 / 60;

/** Mission vide pour le port : aucun ennemi n'apparaît. */
const PORT_MISSION: MissionDef = {
  id: "port",
  name: "Port-des-Alizés",
  brief: "",
  objective: { type: "couler-tout" },
  waves: [{ ships: [{ cls: "cotre" }], trigger: { type: "time", t: 1e12 }, spawn: "devant" }],
  difficulty: 1,
  reward: { gold: 0, gems: 0 },
  replayGold: 0,
};

const PORT_SPOT = { x: -131, z: 198, h: 0.99 };

const STYLE = `
.nb-overlay{position:absolute;inset:0;pointer-events:none;overflow:hidden;font-family:"Cinzel",Georgia,serif}
.nbm-marker{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:3px;will-change:transform;transition:opacity .2s}
.nbm-name{font-size:11px;font-weight:700;letter-spacing:.06em;color:#ffe3a3;text-shadow:0 1px 3px #000,0 0 8px rgba(0,0,0,.6);white-space:nowrap}
.nbm-bar{width:64px;height:7px;border-radius:4px;background:rgba(10,12,20,.75);border:1px solid rgba(255,214,140,.55);overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.5)}
.nbm-bar>i{display:block;height:100%;background:linear-gradient(#ff6b5a,#c8231c);transition:width .25s}
.nbm-sub{display:flex;gap:3px;width:64px}
.nbm-sub>span{flex:1;height:3px;border-radius:2px;background:rgba(10,12,20,.7);overflow:hidden}
.nbm-sub>span>i{display:block;height:100%;transition:width .25s}
.nbm-sub>span.s>i{background:#f2efe6}
.nbm-sub>span.c>i{background:#f0a641}
.nbm-reticle{position:absolute;top:100%;margin-top:4px;width:70px;height:56px;display:none}
.nbm-marker.target .nbm-reticle{display:block}
.nbm-reticle:before,.nbm-reticle:after{content:"";position:absolute;top:0;bottom:0;width:18px;border:3px solid #f3c25b;border-radius:50%;filter:drop-shadow(0 0 4px rgba(243,194,91,.8))}
.nbm-reticle:before{left:0;border-right:0;border-top-color:transparent;border-bottom-color:transparent}
.nbm-reticle:after{right:0;border-left:0;border-top-color:transparent;border-bottom-color:transparent}
.nbm-marker.target .nbm-bar{border-color:#f3c25b}
.nbm-fire{position:absolute;right:-16px;top:6px;width:12px;height:12px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:radial-gradient(circle at 60% 40%,#ffe08a,#ff6a1a 60%,#b51e0c);box-shadow:0 0 8px #ff7a2a;display:none}
.nbm-marker.burning .nbm-fire{display:block}
.nbm-edge{position:absolute;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;display:none}
.nbm-edge:before{content:"";position:absolute;inset:4px;border-radius:3px;background:#f3c25b;clip-path:polygon(0 0,100% 50%,0 100%,25% 50%);filter:drop-shadow(0 0 4px #000)}
.nbm-marker.off .nbm-edge{display:block}
.nbm-marker.off .nbm-bar,.nbm-marker.off .nbm-sub,.nbm-marker.off .nbm-reticle,.nbm-marker.off .nbm-name{display:none}
.nbm-dmg{position:absolute;left:0;top:0;font-weight:800;font-size:17px;color:#ffd166;text-shadow:0 2px 4px #000,0 0 10px rgba(0,0,0,.6);animation:nbm-float .95s ease-out forwards;white-space:nowrap}
.nbm-dmg.voiles{color:#f4f1e8;font-size:13px}
.nbm-dmg.canons{color:#ff9f43;font-size:13px}
.nbm-dmg.player{color:#ff5a4a}
@keyframes nbm-float{0%{opacity:0;transform:translate(var(--x),var(--y)) scale(.7)}15%{opacity:1;transform:translate(var(--x),calc(var(--y) - 10px)) scale(1.1)}100%{opacity:0;transform:translate(var(--x),calc(var(--y) - 54px)) scale(1)}}
`;

interface Marker {
  el: HTMLDivElement;
  bar: HTMLElement;
  sails: HTMLElement;
  cannons: HTMLElement;
  edge: HTMLElement;
}

export function createNavalEngine(
  host: HTMLElement,
  callbacks: EngineCallbacks,
  opts: { sound: boolean },
): NavalEngine {
  const lowEnd =
    (navigator.hardwareConcurrency ?? 8) <= 4 ||
    Math.min(window.innerWidth, window.innerHeight) < 360;
  const renderer = new THREE.WebGLRenderer({
    antialias: !lowEnd,
    powerPreference: "high-performance",
  });
  const maxRatio = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 1.75);
  let pixelRatio = maxRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none";
  host.appendChild(renderer.domElement);

  const overlay = document.createElement("div");
  overlay.className = "nb-overlay";
  const style = document.createElement("style");
  style.textContent = STYLE;
  overlay.appendChild(style);
  host.appendChild(overlay);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 4000);
  createLights(scene);
  const sky = createSky();
  scene.add(sky);
  const ocean: Ocean = createOcean(lowEnd ? "basse" : "haute");
  scene.add(ocean.mesh);
  const scenery = createScenery(ARENA_ISLANDS);
  scene.add(scenery.group);
  const fx: Fx = createFx();
  scene.add(fx.group);
  const audio: NavalAudio = createAudio(opts.sound);

  let mode: "port" | "battle" = "port";
  let world: World = createBattle(
    PORT_MISSION,
    buildLoadout({
      calibre: 0,
      cadence: 0,
      portee: 0,
      pointage: 0,
      coque: 0,
      poudre: 0,
      charpentiers: 0,
    }),
    1,
  );
  const visuals = new Map<number, ShipVisual>();
  const markers = new Map<number, Marker>();
  let paused = false;
  let ended = false;
  let rudder = 0;
  let keyRudder = 0;
  let throttle = 1;
  let accumulator = 0;
  let clock = 0;
  let hudTimer = 0;
  let shake = 0;
  let disposed = false;
  let raf = 0;
  let last = performance.now();
  let frameAvg = 16;
  let frameSamples = 0;
  const rnd = Math.random;

  const camState = { yaw: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), ready: false };
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function resize() {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 55 : 48;
    camera.updateProjectionMatrix();
    // Taille des particules en unités monde : hauteur du tampon / (2·tan(fov/2)).
    fx.setScale((h * pixelRatio) / (2 * Math.tan((camera.fov * Math.PI) / 360)));
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  function clearShips() {
    for (const v of visuals.values()) disposeShipVisual(v);
    visuals.clear();
    for (const m of markers.values()) m.el.remove();
    markers.clear();
    fx.clear();
  }

  function ensureVisual(s: Ship): ShipVisual {
    let v = visuals.get(s.id);
    if (!v) {
      v = createShipVisual(s.cls, s.id * 1.37);
      visuals.set(s.id, v);
      scene.add(v.root);
    }
    return v;
  }

  function ensureMarker(s: Ship): Marker {
    let m = markers.get(s.id);
    if (!m) {
      const el = document.createElement("div");
      el.className = "nbm-marker";
      el.innerHTML = `${s.elite ? `<div class="nbm-name">${s.name}</div>` : ""}<div class="nbm-bar"><i></i></div><div class="nbm-sub"><span class="s"><i></i></span><span class="c"><i></i></span></div><div class="nbm-fire"></div><div class="nbm-reticle"></div><div class="nbm-edge"></div>`;
      overlay.appendChild(el);
      m = {
        el,
        bar: el.querySelector(".nbm-bar>i") as HTMLElement,
        sails: el.querySelector(".nbm-sub .s>i") as HTMLElement,
        cannons: el.querySelector(".nbm-sub .c>i") as HTMLElement,
        edge: el.querySelector(".nbm-edge") as HTMLElement,
      };
      markers.set(s.id, m);
    }
    return m;
  }

  function damageNumber(x: number, y: number, z: number, text: string, cls: string) {
    tmp.set(x, y, z).project(camera);
    if (tmp.z > 1) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    const el = document.createElement("div");
    el.className = `nbm-dmg ${cls}`;
    el.textContent = text;
    el.style.setProperty("--x", `${((tmp.x + 1) / 2) * w - 12 + (rnd() - 0.5) * 24}px`);
    el.style.setProperty("--y", `${((1 - tmp.y) / 2) * h - 20}px`);
    el.addEventListener("animationend", () => el.remove());
    overlay.appendChild(el);
  }

  function distToCamera(x: number, y: number, z: number) {
    return camera.position.distanceTo(tmp2.set(x, y, z));
  }

  function handleEvent(ev: NavalEvent) {
    const player = getPlayer(world);
    switch (ev.type) {
      case "tir": {
        muzzleFlash(fx, rnd, ev.x, ev.y + waveHeight(ev.x, ev.z, clock) * 0.3, ev.z, ev.dirH);
        audio.cannon(distToCamera(ev.x, ev.y, ev.z));
        if (ev.shipId === player.id) shake = Math.max(shake, 0.25);
        break;
      }
      case "gerbe":
        splash(fx, rnd, ev.x, ev.z, ev.big, clock);
        if (distToCamera(ev.x, 0, ev.z) < 160) audio.splash(distToCamera(ev.x, 0, ev.z));
        break;
      case "impact": {
        impact(fx, rnd, ev.x, ev.y, ev.z, ev.zone);
        audio.hit(distToCamera(ev.x, ev.y, ev.z));
        if (ev.shipId === player.id) {
          shake = Math.max(shake, 0.9);
          damageNumber(ev.x, ev.y + 2, ev.z, `-${Math.max(1, Math.round(ev.damage))}`, "player");
        } else if (ev.byPlayer) {
          const label =
            ev.zone === "coque"
              ? `-${Math.max(1, Math.round(ev.damage))}`
              : ev.zone === "voiles"
                ? "Voiles !"
                : "Canons !";
          damageNumber(ev.x, ev.y + 2, ev.z, label, ev.zone);
        }
        break;
      }
      case "incendie":
        if (ev.shipId === player.id)
          callbacks.onToast("Incendie à bord ! Réparez pour l'éteindre.", "danger");
        break;
      case "naufrage": {
        const s = getShip(world, ev.shipId);
        if (!s) break;
        explosion(fx, rnd, s.x, s.cls.deckHeight + 1, s.z, !!s.cls.ram);
        audio.explosion(distToCamera(s.x, 0, s.z), !!s.cls.ram);
        if (s.team === "pirates") {
          const loot = s.sunkByPlayer ? ` · +${s.bounty} or` : "";
          callbacks.onToast(`${s.name} coulé${loot}`, "success");
        }
        break;
      }
      case "coule": {
        const v = visuals.get(ev.shipId);
        if (v) {
          disposeShipVisual(v);
          visuals.delete(ev.shipId);
        }
        fx.dropWake(ev.shipId);
        markers.get(ev.shipId)?.el.remove();
        markers.delete(ev.shipId);
        break;
      }
      case "bombe-lancee": {
        fx.bombMarker(ev.tx, ev.tz, ev.radius, ev.flightTime, clock);
        if (dist(ev.tx, ev.tz, player.x, player.z) < 60) audio.whistle(ev.flightTime);
        break;
      }
      case "explosion":
        explosion(fx, rnd, ev.x, 1, ev.z, ev.big);
        splash(fx, rnd, ev.x, ev.z, true, clock);
        audio.explosion(distToCamera(ev.x, 0, ev.z), ev.big);
        if (dist(ev.x, ev.z, player.x, player.z) < 30) shake = Math.max(shake, ev.big ? 1.4 : 0.8);
        break;
      case "reparation":
        if (ev.shipId === player.id)
          callbacks.onToast("Charpentiers à l'ouvrage : les canons se taisent.", "info");
        break;
      case "vague":
        if (ev.index > 0) {
          const n = world.mission.waves[ev.index]?.ships.length ?? 0;
          callbacks.onToast(
            `Nouvelle vague : ${n} voile${n > 1 ? "s" : ""} à l'horizon !`,
            "danger",
          );
        }
        break;
      case "echouage":
        if (ev.shipId === player.id)
          callbacks.onToast("Récifs ! Éloignez-vous de l'île.", "danger");
        break;
      case "fin":
        if (!ended) {
          ended = true;
          callbacks.onBattleEnd(battleReport(world));
        }
        break;
      case "bordee":
        break;
    }
  }

  function emitHud() {
    const p = getPlayer(world);
    const target = getShip(world, world.targetId);
    const ratio = (b: BatteryId) =>
      p.guns[b] <= 0 ? 0 : 1 - p.reload[b] / Math.max(0.01, p.reloadTotal[b]);
    const progress = objectiveProgress(world);
    callbacks.onHud({
      hull: p.hull,
      hullMax: p.hullMax,
      sails: p.sails,
      sailsMax: p.sailsMax,
      cannons: p.cannons,
      cannonsMax: p.cannonsMax,
      fire: p.fire,
      repairing: p.repairT > 0 ? 1 - p.repairT / 4 : null,
      repairKits: p.repairKits,
      repairCooldown: p.repairCooldown,
      reload: {
        babord: ratio("babord"),
        tribord: ratio("tribord"),
        proue: ratio("proue"),
        poupe: ratio("poupe"),
      },
      planned: plannedBattery(world),
      inRange: targetInRange(world),
      ammo: p.ammo,
      fireStock: p.fireStock,
      objective: {
        label: objectiveLabel(world.mission),
        done: progress.done,
        total: progress.total,
      },
      enemiesLeft: enemiesAfloat(world).length,
      loot: world.loot,
      speedKnots: Math.round(p.speed * 1.6),
      throttle,
      target: isAfloat(target)
        ? {
            name: target.name,
            distance: Math.round(dist(p.x, p.z, target.x, target.z)),
            elite: target.elite,
          }
        : null,
    });
  }

  function updateCamera(dt: number) {
    const p = getPlayer(world);
    const v = visuals.get(p.id);
    const bodyY = v ? v.body.position.y : 0;
    // En portrait, le champ horizontal est étroit : on recule davantage.
    const portrait = camera.aspect < 0.8;
    if (mode === "port") {
      const a = clock * 0.04 + 2.2;
      const r = portrait ? 92 : 70;
      camera.position.set(
        p.x + Math.sin(a) * r,
        24 + Math.sin(clock * 0.2) * 1.5,
        p.z + Math.cos(a) * r,
      );
      camera.lookAt(p.x, bodyY + 8, p.z);
      // Le navire s'affiche dans le tiers haut, au-dessus des panneaux du port.
      camera.rotateX(portrait ? -0.3 : -0.12);
      return;
    }
    const target = getShip(world, world.targetId);
    let lock = 0;
    let losH = p.h;
    if (isAfloat(target) && p.state === "afloat") {
      const d = dist(p.x, p.z, target.x, target.z);
      const range = effectiveRange(p, "boulet");
      lock = clamp(1 - (d - range * 1.1) / (range * 0.9), 0, 1) * 0.88;
      losH = headingTo(p.x, p.z, target.x, target.z);
      // Inutile de pivoter si la cible est déjà devant.
      const b = Math.abs(bearingTo(p.x, p.z, p.h, target.x, target.z));
      lock *= clamp((b - 0.25) / 0.6, 0, 1);
    }
    const desiredYaw = p.h + lock * wrapAngle(losH - p.h);
    if (!camState.ready) camState.yaw = desiredYaw;
    camState.yaw += wrapAngle(desiredYaw - camState.yaw) * Math.min(1, dt * 1.8);
    const fx2 = Math.sin(camState.yaw);
    const fz2 = Math.cos(camState.yaw);
    const sinking = p.state !== "afloat" ? Math.min(1, p.sinkT / 4) : 0;
    // Cadrage de la maquette : navire entier au centre, horizon au tiers supérieur.
    // Portrait : horizon à ~30 % de la hauteur, navire entre ~26 % et ~62 %.
    // Paysage : horizon plus bas (~43 %) pour que les ennemis passent sous le bandeau.
    const back = (portrait ? 75 : 52) + lock * 8 + sinking * 25;
    const height = (portrait ? 21 : 12) + lock * 3 + sinking * 14;
    const ahead = portrait ? 26 : 150;
    const want = tmp.set(p.x - fx2 * back, height, p.z - fz2 * back);
    const look = tmp2.set(p.x + fx2 * ahead, bodyY * 0.5, p.z + fz2 * ahead);
    if (isAfloat(target) && lock > 0) {
      const mid = new THREE.Vector3((p.x + target.x) / 2, 3, (p.z + target.z) / 2);
      look.lerp(mid, lock * 0.6);
    }
    if (!camState.ready) {
      camState.pos.copy(want);
      camState.look.copy(look);
      camState.ready = true;
    }
    camState.pos.lerp(want, Math.min(1, dt * 3.5));
    camState.look.lerp(look, Math.min(1, dt * 4));
    camera.position.copy(camState.pos);
    if (shake > 0) {
      camera.position.x += (rnd() - 0.5) * shake;
      camera.position.y += (rnd() - 0.5) * shake;
      shake = Math.max(0, shake - dt * 2.5);
    }
    camera.lookAt(camState.look);
  }

  function updateMarkers() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    const live = new Set<number>();
    if (mode === "battle") {
      for (const s of world.ships) {
        if (s.team !== "pirates" || s.state !== "afloat") continue;
        live.add(s.id);
        const m = ensureMarker(s);
        tmp.set(s.x, s.cls.mastHeight + 3, s.z).project(camera);
        const behind = tmp.z > 1;
        let x = ((tmp.x + 1) / 2) * w;
        let y = ((1 - tmp.y) / 2) * h;
        const off = behind || x < 8 || x > w - 8 || y < 70 || y > h - 8;
        const isTarget = s.id === world.targetId;
        m.el.classList.toggle("target", isTarget);
        m.el.classList.toggle("burning", s.fire > 0.05);
        m.el.classList.toggle("off", off);
        if (off) {
          // Flèche au bord de l'écran, dans la direction du navire.
          if (behind) {
            x = w - x;
            y = h - y;
          }
          const cx = w / 2;
          const cy = h / 2;
          const ang = Math.atan2(y - cy, x - cx);
          const rx = w / 2 - 22;
          const ry = h / 2 - 90;
          const k = Math.min(
            rx / Math.abs(Math.cos(ang) || 1e-3),
            ry / Math.abs(Math.sin(ang) || 1e-3),
          );
          x = cx + Math.cos(ang) * k;
          y = cy + Math.sin(ang) * k;
          m.edge.style.transform = `rotate(${ang}rad)`;
          m.el.style.opacity = isTarget ? "1" : "0.65";
          m.el.style.transform = `translate(${x}px, ${y}px)`;
        } else {
          m.el.style.opacity = "1";
          m.el.style.transform = `translate(${x - 32}px, ${y - (s.elite ? 34 : 18)}px)`;
        }
        m.bar.style.width = `${(100 * s.hull) / s.hullMax}%`;
        m.sails.style.width = `${(100 * s.sails) / s.sailsMax}%`;
        m.cannons.style.width = `${(100 * s.cannons) / s.cannonsMax}%`;
      }
    }
    for (const [id, m] of markers) {
      if (!live.has(id)) {
        m.el.remove();
        markers.delete(id);
      }
    }
  }

  function updateShipEffects(dt: number) {
    const player = getPlayer(world);
    const arcFor = mode === "battle" && player.state === "afloat" ? plannedBattery(world) : null;
    if (arcFor) {
      const ready = player.reload[arcFor] <= 0 && gunsAvailable(player, arcFor) > 0;
      fx.setArc(
        true,
        player.x,
        player.z,
        batteryHeading(player, arcFor),
        batteryArc(arcFor),
        effectiveRange(player, player.ammo),
        ready,
        targetInRange(world),
      );
    } else {
      fx.setArc(false, 0, 0, 0, 0, 0, false, false);
    }
    for (const s of world.ships) {
      if (s.state === "sunk") continue;
      const v = ensureVisual(s);
      syncShipVisual(v, s, clock, dt);
      const alive = s.state === "afloat";
      fx.wake(s.id).update(s.x, s.z, s.h, s.cls.beam, s.speed, s.cls.length, clock, dt, alive);
      if (mode !== "battle") continue;
      const distance = dist(s.x, s.z, camera.position.x, camera.position.z);
      if (distance > 700) continue;
      // Flammes et fumée noire proportionnelles à l'incendie.
      if (s.fire > 0.02 || s.state === "sinking") {
        const intensity = Math.max(s.fire, s.state === "sinking" ? 0.6 : 0);
        const n = intensity * 45 * dt;
        for (let i = 0; i < Math.floor(n) + (rnd() < n % 1 ? 1 : 0); i++) {
          const p = randomDeckPoint(v, rnd, tmp);
          flame(fx, rnd, p.x, p.y, p.z, intensity);
          if (rnd() < 0.35) smoke(fx, rnd, p.x, p.y + 2, p.z, 0.9, 2.5 + intensity * 3);
        }
      }
      // Coque abîmée : fumée grise qui s'échappe.
      if (alive && s.hull / s.hullMax < 0.5 && rnd() < dt * 5) {
        const p = randomDeckPoint(v, rnd, tmp);
        smoke(fx, rnd, p.x, p.y, p.z, 0.3, 1.8);
      }
      // Gerbes d'étrave.
      if (alive && s.speed > 3.5 && rnd() < dt * s.speed * 1.8) {
        const side = starboardOf(s.h);
        const sgn = rnd() < 0.5 ? 1 : -1;
        const p = localToWorld(v, 0, 0.4, s.cls.length * 0.45, tmp);
        spray(fx, rnd, p.x, p.y, p.z, { x: side.x * sgn, z: side.z * sgn }, s.speed);
      }
    }
    // Boulets en vol et leur traînée.
    const balls = world.projectiles.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      big: p.kind === "bombe",
    }));
    fx.setBalls(balls);
    if (mode === "battle") {
      for (const b of balls) if (rnd() < 0.5) trail(fx, b.x, b.y, b.z);
    }
  }

  function adaptQuality(frameMs: number) {
    frameAvg = frameAvg * 0.95 + frameMs * 0.05;
    frameSamples++;
    if (frameSamples < 90) return;
    frameSamples = 0;
    if (frameAvg > 24 && pixelRatio > 0.8) {
      pixelRatio = Math.max(0.8, pixelRatio - 0.15);
      renderer.setPixelRatio(pixelRatio);
      resize();
    } else if (frameAvg < 14 && pixelRatio < maxRatio) {
      pixelRatio = Math.min(maxRatio, pixelRatio + 0.1);
      renderer.setPixelRatio(pixelRatio);
      resize();
    }
  }

  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const frameMs = now - last;
    const dt = Math.min(0.05, frameMs / 1000);
    last = now;
    adaptQuality(frameMs);
    const running = mode === "battle" && !paused;
    if (running) {
      clock += dt;
      accumulator += dt;
      let steps = 0;
      const controls = { rudder: clamp(rudder + keyRudder, -1, 1), throttle };
      while (accumulator >= STEP && steps < 5) {
        stepWorld(world, STEP, controls);
        for (const ev of world.events) handleEvent(ev);
        world.events.length = 0;
        accumulator -= STEP;
        steps++;
      }
      if (steps === 5) accumulator = 0;
      hudTimer += dt;
      if (hudTimer > 0.1) {
        hudTimer = 0;
        emitHud();
      }
    } else if (mode === "port") {
      clock += dt;
    }
    updateShipEffects(running || mode === "port" ? dt : 0);
    if (running || mode === "port") fx.update(dt, clock);
    updateCamera(dt);
    updateMarkers();
    const p = getPlayer(world);
    ocean.update(clock, p.x, p.z);
    sky.position.copy(camera.position);
    sky.material.uniforms.uTime.value = clock;
    renderer.render(scene, camera);
  }

  // Sélection d'une cible au toucher.
  const onPointerDown = (e: PointerEvent) => {
    if (mode !== "battle" || paused) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best: Ship | null = null;
    let bestD = 80;
    for (const s of enemiesAfloat(world)) {
      for (const y of [s.cls.deckHeight, s.cls.mastHeight * 0.6]) {
        tmp.set(s.x, y, s.z).project(camera);
        if (tmp.z > 1) continue;
        const d = Math.hypot(
          ((tmp.x + 1) / 2) * rect.width - px,
          ((1 - tmp.y) / 2) * rect.height - py,
        );
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
    }
    if (best) {
      selectTarget(world, best.id);
      audio.ui();
      emitHud();
    }
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  const keys = new Set<string>();
  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (mode !== "battle") return;
    const k = e.key.toLowerCase();
    if (down && keys.has(k)) return;
    if (down) keys.add(k);
    else keys.delete(k);
    keyRudder =
      (keys.has("arrowright") || keys.has("d") ? 1 : 0) -
      (keys.has("arrowleft") || keys.has("a") || keys.has("q") ? 1 : 0);
    if (!down || paused) return;
    if (k === " " || k === "enter") {
      e.preventDefault();
      api.fire();
    } else if (k === "1") api.setAmmo("boulet");
    else if (k === "2") api.setAmmo("chaine");
    else if (k === "3") api.setAmmo("mitraille");
    else if (k === "4") api.setAmmo("feu");
    else if (k === "r") api.repair();
    else if (k === "tab") {
      e.preventDefault();
      api.cycleTarget();
    } else if (k === "z" || k === "w" || k === "arrowup") api.setThrottle(1);
    else if (k === "s" || k === "arrowdown") api.setThrottle(0.5);
    else if (k === "j") playerFireBattery(world, "babord");
    else if (k === "l") playerFireBattery(world, "tribord");
  };
  const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
  const onKeyUp = (e: KeyboardEvent) => onKey(e, false);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const onVisibility = () => {
    if (document.hidden && mode === "battle" && !paused && !ended) {
      paused = true;
      callbacks.onAutoPause();
    }
    last = performance.now();
  };
  document.addEventListener("visibilitychange", onVisibility);

  function enterPort() {
    clearShips();
    mode = "port";
    ended = false;
    paused = false;
    world = createBattle(
      PORT_MISSION,
      buildLoadout({
        calibre: 0,
        cadence: 0,
        portee: 0,
        pointage: 0,
        coque: 0,
        poudre: 0,
        charpentiers: 0,
      }),
      1,
    );
    const p = getPlayer(world);
    p.x = PORT_SPOT.x;
    p.z = PORT_SPOT.z;
    p.h = PORT_SPOT.h;
    p.speed = 0;
    camState.ready = false;
  }

  const api: NavalEngine = {
    showPort() {
      enterPort();
    },
    startBattle(missionId, save) {
      clearShips();
      const mission = getMission(missionId);
      world = createBattle(mission, buildLoadout(save.upgrades), (Date.now() % 100000) + 1);
      mode = "battle";
      paused = false;
      ended = false;
      rudder = 0;
      keyRudder = 0;
      throttle = 1;
      accumulator = 0;
      camState.ready = false;
      audio.resume();
      emitHud();
    },
    setRudder(v) {
      rudder = clamp(v, -1, 1);
    },
    setThrottle(v) {
      throttle = clamp(v, 0.3, 1);
      if (mode === "battle") emitHud();
    },
    fire() {
      if (mode !== "battle" || paused) return null;
      const res = playerFire(world);
      emitHud();
      return res;
    },
    setAmmo(a) {
      if (mode !== "battle") return false;
      const ok = setPlayerAmmo(world, a);
      if (ok) audio.ui();
      else callbacks.onToast(`Plus de ${AMMO[a].name.toLowerCase()} en soute.`, "info");
      emitHud();
      return ok;
    },
    repair() {
      if (mode !== "battle" || paused) return { ok: false, reason: "Indisponible" };
      const res = playerRepair(world);
      if (!res.ok && res.reason) callbacks.onToast(res.reason, "info");
      emitHud();
      return res;
    },
    cycleTarget() {
      if (mode !== "battle") return;
      const p = getPlayer(world);
      const list = enemiesAfloat(world).sort(
        (a, b) => dist(p.x, p.z, a.x, a.z) - dist(p.x, p.z, b.x, b.z),
      );
      if (list.length === 0) return;
      const i = list.findIndex((s) => s.id === world.targetId);
      selectTarget(world, list[(i + 1) % list.length].id);
      audio.ui();
      emitHud();
    },
    setPaused(p) {
      paused = p;
      last = performance.now();
    },
    setSound(on) {
      audio.setEnabled(on);
    },
    unlockAudio() {
      audio.resume();
    },
    debugWorld() {
      return mode === "battle" ? world : null;
    },
    debugStats() {
      const r = renderer.info.render;
      return {
        calls: r.calls,
        triangles: r.triangles,
        pixelRatio,
        frameMs: Math.round(frameAvg * 10) / 10,
      };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
      clearShips();
      fx.dispose();
      ocean.dispose();
      scenery.dispose();
      sky.geometry.dispose();
      sky.material.dispose();
      disposeTextures();
      disposeWaterTextures();
      audio.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      overlay.remove();
    },
  };

  enterPort();
  raf = requestAnimationFrame(frame);
  return api;
}
