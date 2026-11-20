/**
 * Boucle de simulation d'une bataille navale.
 *
 * `createBattle` prépare la mission, `stepWorld` avance d'un pas fixe. Le rendu
 * lit l'état et consomme `world.events` ; il ne modifie jamais la simulation
 * autrement que par les commandes exportées ici (barre, tir, munition,
 * réparation, cible).
 */

import { createAiState, updateAi } from "./ai.ts";
import {
  AI_SPREAD_MUL,
  BALLISTICS,
  ELITE,
  SHIP_CLASSES,
  type AmmoId,
  type BatteryId,
  type ShipClassId,
} from "./defs.ts";
import {
  BATTERY_BEARING,
  batteryFacing,
  effectiveRange,
  enemiesAfloat,
  fireBattery,
  fireGun,
  getPlayer,
  getShip,
  gunsAvailable,
  isAfloat,
  resolveBallHit,
  resolveBombImpact,
  sailFactor,
  startRepair,
  startSinking,
  updateDamageOverTime,
  applyDamage,
  ignite,
} from "./combat.ts";
import { bearingTo, clamp, createRng, dist, headingTo, range, wrapAngle } from "./math.ts";
import {
  ARENA_ISLANDS,
  ARENA_RADIUS,
  PLAYER_START,
  missionEnemyCount,
  type MissionDef,
  type WaveDef,
  type WaveShip,
} from "./missions.ts";
import type { PlayerLoadout } from "./upgrades.ts";
import type { PlayerControls, Ship, Team, World } from "./types.ts";

const OUTCOME_DELAY = { victoire: 2.5, defaite: 3 } as const;

function makeShip(
  world: World,
  cls: ShipClassId,
  team: Team,
  x: number,
  z: number,
  h: number,
  opts: { elite?: boolean; name?: string } = {},
): Ship {
  const c = SHIP_CLASSES[cls];
  const elite = !!opts.elite;
  const k = elite ? ELITE.structure : 1;
  const ship: Ship = {
    id: world.nextId++,
    cls: c,
    team,
    name: opts.name ?? c.name,
    elite,
    x,
    z,
    h,
    speed: 0,
    rudder: 0,
    throttle: 1,
    yawRate: 0,
    hull: c.hull * k,
    hullMax: c.hull * k,
    sails: c.sails * k,
    sailsMax: c.sails * k,
    cannons: c.cannons * k,
    cannonsMax: c.cannons * k,
    fire: 0,
    gunDamage: c.gunDamage * (elite ? ELITE.damage : 1),
    range: c.range,
    baseReload: c.reload,
    spread: c.spread * (team === "pirates" ? AI_SPREAD_MUL : 1) * (elite ? ELITE.accuracy : 1),
    guns: { ...c.guns },
    reload: { babord: 0, tribord: 0, proue: 0, poupe: 0 },
    reloadTotal: { babord: 1, tribord: 1, proue: 1, poupe: 1 },
    mortarReload: c.mortar ? 2 + world.rng() * 2 : 0,
    ammo: "boulet",
    fireStock: c.role === "artilleur" ? 2 : 0,
    repairKits: c.role === "artilleur" ? 1 : 0,
    repairT: 0,
    repairCooldown: 0,
    state: "afloat",
    sinkT: 0,
    ai: null,
    bounty: Math.round(c.bounty * (elite ? ELITE.bounty : 1)),
    stats: { shots: 0, hits: 0, damageDealt: 0, damageTaken: 0 },
    lastAttacker: null,
    sunkByPlayer: false,
    groundedFor: 0,
  };
  // Les batteries ennemies ne sont pas toutes prêtes au même instant.
  if (team === "pirates") {
    for (const b of ["babord", "tribord", "proue", "poupe"] as const)
      ship.reload[b] = world.rng() * 1.5;
  }
  return ship;
}

export function createBattle(mission: MissionDef, loadout: PlayerLoadout, seed = 1): World {
  const world: World = {
    time: 0,
    rng: createRng(seed),
    ships: [],
    projectiles: [],
    pending: [],
    events: [],
    islands: ARENA_ISLANDS,
    arenaRadius: ARENA_RADIUS,
    mission,
    waves: mission.waves.map((def) => ({ def, spawned: false })),
    playerId: 0,
    targetId: null,
    targetLocked: false,
    kills: 0,
    killsByClass: {},
    loot: 0,
    outcome: "en-cours",
    outcomeAt: null,
    pendingOutcome: "en-cours",
    nextId: 1,
  };
  const player = makeShip(
    world,
    "galion",
    "joueur",
    PLAYER_START.x,
    PLAYER_START.z,
    PLAYER_START.h,
  );
  player.hull = player.hullMax = loadout.hull;
  player.sails = player.sailsMax = loadout.sails;
  player.cannons = player.cannonsMax = loadout.cannons;
  player.gunDamage = loadout.gunDamage;
  player.baseReload = loadout.reload;
  player.range = loadout.range;
  player.spread = loadout.spread;
  player.fireStock = loadout.fireStock;
  player.repairKits = loadout.repairKits;
  player.speed = player.cls.maxSpeed * 0.5;
  world.ships.push(player);
  world.playerId = player.id;
  spawnDueWaves(world);
  return world;
}

/** Position d'apparition sûre : dans l'arène, hors des îles. */
function safeSpawn(world: World, x: number, z: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  const r = Math.hypot(px, pz);
  const max = world.arenaRadius - 50;
  if (r > max) {
    px = (px / r) * max;
    pz = (pz / r) * max;
  }
  for (let iter = 0; iter < 3; iter++) {
    for (const isl of world.islands) {
      const d = dist(isl.x, isl.z, px, pz);
      const clear = isl.radius + 28;
      if (d < clear) {
        const nx = d > 0.01 ? (px - isl.x) / d : 1;
        const nz = d > 0.01 ? (pz - isl.z) / d : 0;
        px = isl.x + nx * clear;
        pz = isl.z + nz * clear;
      }
    }
  }
  return { x: px, z: pz };
}

function spawnWave(world: World, wave: WaveDef, index: number): void {
  const player = getPlayer(world);
  const n = wave.ships.length;
  wave.ships.forEach((def: WaveShip, i) => {
    let angle: number;
    let distance: number;
    const fan = n === 1 ? 0 : i / (n - 1) - 0.5;
    switch (wave.spawn) {
      case "devant":
        angle = player.h + fan * 0.9 + range(world.rng, -0.1, 0.1);
        distance = range(world.rng, 170, 210);
        break;
      case "flancs":
        angle = player.h + (i % 2 === 0 ? 1 : -1) * (Math.PI / 2 + range(world.rng, -0.3, 0.3));
        distance = range(world.rng, 150, 190);
        break;
      case "derriere":
        angle = player.h + Math.PI + fan * 0.8;
        distance = range(world.rng, 160, 190);
        break;
      case "autour":
        angle = player.h + (Math.PI * 2 * i) / n + range(world.rng, -0.3, 0.3);
        distance = range(world.rng, 150, 190);
        break;
    }
    const pos = safeSpawn(
      world,
      player.x + Math.sin(angle) * distance,
      player.z + Math.cos(angle) * distance,
    );
    const h = headingTo(pos.x, pos.z, player.x, player.z) + range(world.rng, -0.4, 0.4);
    const ship = addEnemy(world, def.cls, pos.x, pos.z, h, { elite: def.elite, name: def.name });
    ship.speed = ship.cls.maxSpeed * 0.6;
  });
  world.events.push({ type: "vague", index });
}

/** Ajoute un navire pirate piloté par l'IA (vagues, tests, scénarios). */
export function addEnemy(
  world: World,
  cls: ShipClassId,
  x: number,
  z: number,
  h: number,
  opts: { elite?: boolean; name?: string } = {},
): Ship {
  const ship = makeShip(world, cls, "pirates", x, z, h, opts);
  ship.ai = createAiState(world.rng);
  ship.ai.desiredH = h;
  world.ships.push(ship);
  return ship;
}

function spawnDueWaves(world: World): void {
  for (let i = 0; i < world.waves.length; i++) {
    const w = world.waves[i];
    if (w.spawned) continue;
    const previousSpawned = i === 0 || world.waves[i - 1].spawned;
    const t = w.def.trigger;
    let due = false;
    if (t.type === "start") due = true;
    else if (t.type === "time") due = world.time >= t.t;
    else if (t.type === "remaining")
      due = previousSpawned && enemiesAfloat(world).length <= t.count;
    if (due) {
      w.spawned = true;
      spawnWave(world, w.def, i);
    }
  }
}

function moveShip(world: World, s: Ship, dt: number): void {
  const c = s.cls;
  if (s.state === "afloat") {
    const sf = sailFactor(s);
    const targetSpeed = c.maxSpeed * clamp(s.throttle, 0, 1) * sf;
    const dv = targetSpeed - s.speed;
    s.speed += clamp(dv, -c.accel * 1.5 * dt, c.accel * dt);
    const turn = c.turnRate * (0.6 + 0.4 * sf) * (0.35 + 0.65 * Math.min(1, s.speed / c.maxSpeed));
    s.yawRate = -clamp(s.rudder, -1, 1) * turn;
  } else {
    s.speed *= Math.pow(0.6, dt);
    s.yawRate *= Math.pow(0.5, dt);
  }
  s.h = wrapAngle(s.h + s.yawRate * dt);
  s.x += Math.sin(s.h) * s.speed * dt;
  s.z += Math.cos(s.h) * s.speed * dt;
}

/** Échouage sur les îles, limite de l'arène et chocs entre coques. */
function resolveCollisions(world: World, dt: number): void {
  for (const s of world.ships) {
    if (s.state === "sunk") continue;
    const shipR = s.cls.length * 0.35;
    let grounded = false;
    for (const isl of world.islands) {
      const d = dist(isl.x, isl.z, s.x, s.z);
      const min = isl.radius * 0.92 + shipR;
      if (d < min) {
        const nx = d > 0.01 ? (s.x - isl.x) / d : 1;
        const nz = d > 0.01 ? (s.z - isl.z) / d : 0;
        s.x = isl.x + nx * min;
        s.z = isl.z + nz * min;
        if (s.state === "afloat") {
          applyDamage(world, s, "coque", s.speed * 0.5 * dt, null);
          if (s.groundedFor === 0) world.events.push({ type: "echouage", shipId: s.id });
        }
        s.speed *= Math.pow(0.15, dt);
        grounded = true;
      }
    }
    s.groundedFor = grounded ? s.groundedFor + dt : 0;
    const r = Math.hypot(s.x, s.z);
    if (r > world.arenaRadius) {
      s.x = (s.x / r) * world.arenaRadius;
      s.z = (s.z / r) * world.arenaRadius;
    }
  }
  const afloat = world.ships.filter((s) => s.state === "afloat");
  for (let i = 0; i < afloat.length; i++) {
    for (let j = i + 1; j < afloat.length; j++) {
      const a = afloat[i];
      const b = afloat[j];
      const d = dist(a.x, a.z, b.x, b.z);
      // Le brûlot explose au contact d'un ennemi.
      const ram = a.cls.ram && a.team !== b.team ? a : b.cls.ram && b.team !== a.team ? b : null;
      if (ram) {
        const victim = ram === a ? b : a;
        const spec = ram.cls.ram!;
        if (d <= spec.radius + victim.cls.length * 0.3) {
          applyDamage(world, victim, "coque", spec.hull, ram.id);
          applyDamage(world, victim, "voiles", spec.sails, ram.id);
          ignite(world, victim, spec.fire);
          ram.lastAttacker = ram.id;
          ram.hull = 0;
          startSinking(world, ram);
          continue;
        }
      }
      const min = (a.cls.length + b.cls.length) * 0.3;
      if (d < min && d > 0.01) {
        const push = (min - d) / 2;
        const nx = (b.x - a.x) / d;
        const nz = (b.z - a.z) / d;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
      }
    }
  }
}

function updateProjectiles(world: World, dt: number): void {
  const g = BALLISTICS.gravity;
  const alive = [];
  for (const p of world.projectiles) {
    p.vy -= g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.age += dt;
    if (p.kind === "boulet" && resolveBallHit(world, p)) continue;
    if (p.y <= 0) {
      if (p.kind === "bombe") resolveBombImpact(world, p);
      else world.events.push({ type: "gerbe", x: p.x, z: p.z, big: false });
      continue;
    }
    if (p.age > 10) continue;
    alive.push(p);
  }
  world.projectiles = alive;
}

/** Cible automatique : l'ennemi le plus proche, avec une préférence pour l'avant. */
export function autoTarget(world: World): void {
  const player = getPlayer(world);
  const current = getShip(world, world.targetId);
  if (isAfloat(current) && world.targetLocked) return;
  let best: Ship | null = null;
  let bestScore = Infinity;
  for (const s of enemiesAfloat(world)) {
    const d = dist(player.x, player.z, s.x, s.z);
    if (d > 320) continue;
    const b = Math.abs(bearingTo(player.x, player.z, player.h, s.x, s.z));
    const score = d + b * 35;
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  // Garde la cible actuelle tant qu'elle reste un bon choix (évite le papillonnement).
  if (isAfloat(current) && best && best.id !== current.id) {
    const d = dist(player.x, player.z, current.x, current.z);
    const b = Math.abs(bearingTo(player.x, player.z, player.h, current.x, current.z));
    if (d + b * 35 < bestScore * 1.35) return;
  }
  world.targetId = best ? best.id : null;
  world.targetLocked = false;
}

function checkOutcome(world: World): void {
  if (world.outcome !== "en-cours") return;
  if (world.outcomeAt !== null) {
    if (world.time >= world.outcomeAt) {
      world.outcome = world.pendingOutcome;
      world.events.push({ type: "fin", outcome: world.outcome as "victoire" | "defaite" });
    }
    return;
  }
  const player = getPlayer(world);
  if (player.state !== "afloat") {
    world.pendingOutcome = "defaite";
    world.outcomeAt = world.time + OUTCOME_DELAY.defaite;
    return;
  }
  if (objectiveComplete(world)) {
    world.pendingOutcome = "victoire";
    world.outcomeAt = world.time + OUTCOME_DELAY.victoire;
  }
}

export function objectiveComplete(world: World): boolean {
  const o = world.mission.objective;
  if (o.type === "couler-elite") {
    return world.ships.some(
      (s) => s.team === "pirates" && s.elite && s.name === o.name && s.state !== "afloat",
    );
  }
  return world.waves.every((w) => w.spawned) && enemiesAfloat(world).length === 0;
}

/** Progression lisible de l'objectif (pour le bandeau de mission). */
export function objectiveProgress(world: World): { done: number; total: number } {
  const o = world.mission.objective;
  if (o.type === "couler-elite") return { done: objectiveComplete(world) ? 1 : 0, total: 1 };
  return {
    done: Math.min(world.kills, missionEnemyCount(world.mission)),
    total: missionEnemyCount(world.mission),
  };
}

/** Avance la bataille d'un pas. Le pas recommandé est de 1/60 s. */
export function stepWorld(world: World, dt: number, controls: PlayerControls): void {
  world.time += dt;
  const player = getPlayer(world);
  if (player.state === "afloat") {
    player.rudder = clamp(controls.rudder, -1, 1);
    player.throttle = clamp(controls.throttle, 0, 1);
  }

  spawnDueWaves(world);

  for (const s of world.ships) {
    if (s.state === "afloat") {
      if (s.ai) updateAi(world, s, dt);
      if (s.repairT <= 0) {
        for (const b of ["babord", "tribord", "proue", "poupe"] as const) {
          if (s.reload[b] > 0) s.reload[b] = Math.max(0, s.reload[b] - dt);
        }
        if (s.mortarReload > 0) s.mortarReload = Math.max(0, s.mortarReload - dt);
      }
      updateDamageOverTime(world, s, dt);
    } else if (s.state === "sinking") {
      s.sinkT += dt;
      if (s.sinkT > 6) {
        s.state = "sunk";
        world.events.push({ type: "coule", shipId: s.id });
      }
    }
    moveShip(world, s, dt);
  }

  if (world.pending.length > 0) {
    const due = world.pending.filter((p) => p.at <= world.time);
    if (due.length > 0) {
      world.pending = world.pending.filter((p) => p.at > world.time);
      for (const shot of due) fireGun(world, shot);
    }
  }

  updateProjectiles(world, dt);
  resolveCollisions(world, dt);
  autoTarget(world);
  checkOutcome(world);
}

// ---------------------------------------------------------------------------
// Commandes du joueur

export type FireResult =
  { ok: true; batteries: BatteryId[] } | { ok: false; reason: string; battery?: BatteryId };

/** Batterie que la commande TIRER utilisera maintenant, ou null sans cible. */
export function plannedBattery(world: World): BatteryId | null {
  const player = getPlayer(world);
  const target = getShip(world, world.targetId);
  if (!isAfloat(target)) return null;
  return batteryFacing(player, target.x, target.z);
}

export function targetInRange(world: World): boolean {
  const player = getPlayer(world);
  const target = getShip(world, world.targetId);
  if (!isAfloat(target)) return false;
  return dist(player.x, player.z, target.x, target.z) <= effectiveRange(player, player.ammo);
}

/** TIRER : la batterie qui fait face à la cible ; sans cible, les deux bordées prêtes. */
export function playerFire(world: World): FireResult {
  const player = getPlayer(world);
  if (!isAfloat(player)) return { ok: false, reason: "Le navire sombre" };
  if (player.repairT > 0) return { ok: false, reason: "Équipage aux réparations" };
  const target = getShip(world, world.targetId);
  if (isAfloat(target)) {
    const battery = batteryFacing(player, target.x, target.z);
    if (gunsAvailable(player, battery) === 0)
      return { ok: false, reason: "Aucun canon de ce côté", battery };
    if (player.reload[battery] > 0) return { ok: false, reason: "Rechargement", battery };
    fireBattery(world, player, battery, target.id);
    return { ok: true, batteries: [battery] };
  }
  const fired: BatteryId[] = [];
  for (const b of ["babord", "tribord"] as const) {
    if (player.reload[b] <= 0 && fireBattery(world, player, b, null)) fired.push(b);
  }
  return fired.length > 0 ? { ok: true, batteries: fired } : { ok: false, reason: "Rechargement" };
}

/** Tire une batterie précise (raccourcis clavier). */
export function playerFireBattery(world: World, battery: BatteryId): FireResult {
  const player = getPlayer(world);
  if (!isAfloat(player)) return { ok: false, reason: "Le navire sombre" };
  if (player.repairT > 0) return { ok: false, reason: "Équipage aux réparations" };
  if (player.reload[battery] > 0) return { ok: false, reason: "Rechargement", battery };
  const target = getShip(world, world.targetId);
  const aimAt =
    isAfloat(target) && batteryFacing(player, target.x, target.z) === battery ? target.id : null;
  return fireBattery(world, player, battery, aimAt)
    ? { ok: true, batteries: [battery] }
    : { ok: false, reason: "Aucun canon de ce côté", battery };
}

export function setPlayerAmmo(world: World, ammo: AmmoId): boolean {
  const player = getPlayer(world);
  if (ammo === "feu" && player.fireStock <= 0) return false;
  player.ammo = ammo;
  return true;
}

export function playerRepair(world: World): { ok: boolean; reason?: string } {
  return startRepair(world, getPlayer(world));
}

export function selectTarget(world: World, id: number | null): boolean {
  if (id === null) {
    world.targetLocked = false;
    autoTarget(world);
    return true;
  }
  const s = getShip(world, id);
  if (!isAfloat(s) || s.team === "joueur") return false;
  world.targetId = id;
  world.targetLocked = true;
  return true;
}

/** Direction (cap monde) d'une batterie, pour le rendu des arcs de tir. */
export function batteryHeading(s: Ship, battery: BatteryId): number {
  return s.h - BATTERY_BEARING[battery];
}

// ---------------------------------------------------------------------------
// Bilan

export interface BattleReport {
  missionId: string;
  outcome: "victoire" | "defaite";
  duration: number;
  kills: number;
  killsByClass: Partial<Record<ShipClassId, number>>;
  loot: number;
  shots: number;
  hits: number;
  damageDealt: number;
  damageTaken: number;
  hullRatio: number;
  stars: number;
}

export function battleReport(world: World): BattleReport {
  if (world.outcome === "en-cours") throw new Error("La bataille n'est pas terminée");
  const p = getPlayer(world);
  const hullRatio = p.hull / p.hullMax;
  const victory = world.outcome === "victoire";
  const stars = victory ? (hullRatio >= 0.66 ? 3 : hullRatio >= 0.33 ? 2 : 1) : 0;
  return {
    missionId: world.mission.id,
    outcome: world.outcome,
    duration: world.time,
    kills: world.kills,
    killsByClass: { ...world.killsByClass },
    loot: world.loot,
    shots: p.stats.shots,
    hits: p.stats.hits,
    damageDealt: Math.round(p.stats.damageDealt),
    damageTaken: Math.round(p.stats.damageTaken),
    hullRatio,
    stars,
  };
}
