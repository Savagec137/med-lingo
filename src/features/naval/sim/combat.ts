/**
 * Actions de combat : tirs, balistique, dégâts localisés, incendies,
 * réparations et naufrages. Utilisé par le joueur comme par l'IA.
 */

import {
  AMMO,
  BALLISTICS,
  BROADSIDE_ARC,
  CHASER_ARC,
  FIRE,
  REPAIR,
  type AmmoId,
  type BatteryId,
  type ShipClass,
  type Zone,
} from "./defs.ts";
import {
  bearingTo,
  clamp,
  dist,
  forwardOf,
  gaussian,
  headingTo,
  lerp,
  toLocal,
  toWorld,
  wrapAngle,
} from "./math.ts";
import type { Projectile, Ship, World } from "./types.ts";

export function sailFactor(s: Ship): number {
  return 0.35 + 0.65 * (s.sails / s.sailsMax);
}

export function crewFactor(s: Ship): number {
  return s.cannons / s.cannonsMax;
}

export function isAfloat(s: Ship | undefined | null): s is Ship {
  return !!s && s.state === "afloat";
}

export function getShip(world: World, id: number | null): Ship | undefined {
  if (id === null) return undefined;
  return world.ships.find((s) => s.id === id);
}

export function getPlayer(world: World): Ship {
  const p = world.ships.find((s) => s.id === world.playerId);
  if (!p) throw new Error("Navire du joueur introuvable");
  return p;
}

export function enemiesAfloat(world: World): Ship[] {
  return world.ships.filter((s) => s.team === "pirates" && s.state === "afloat");
}

/** Relèvement central de chaque batterie (0 = avant, +π/2 = tribord). */
export const BATTERY_BEARING: Record<BatteryId, number> = {
  proue: 0,
  tribord: Math.PI / 2,
  babord: -Math.PI / 2,
  poupe: Math.PI,
};

export function isChaser(b: BatteryId): boolean {
  return b === "proue" || b === "poupe";
}

export function batteryArc(b: BatteryId): number {
  return isChaser(b) ? CHASER_ARC : BROADSIDE_ARC;
}

/** Batterie qui fait face à un point, d'après son relèvement. */
export function batteryFacing(s: Ship, tx: number, tz: number): BatteryId {
  const b = bearingTo(s.x, s.z, s.h, tx, tz);
  const a = Math.abs(b);
  if (a < CHASER_ARC) return "proue";
  if (a > Math.PI - CHASER_ARC) return "poupe";
  return b > 0 ? "tribord" : "babord";
}

export function inBatteryArc(s: Ship, battery: BatteryId, tx: number, tz: number): boolean {
  const b = bearingTo(s.x, s.z, s.h, tx, tz);
  return Math.abs(wrapAngle(b - BATTERY_BEARING[battery])) <= batteryArc(battery);
}

export function effectiveRange(s: Ship, ammo: AmmoId): number {
  return s.range * AMMO[ammo].rangeMul;
}

/** Nombre de pièces encore servies : les canons détruits ne tirent plus. */
export function gunsAvailable(s: Ship, battery: BatteryId): number {
  const n = s.guns[battery];
  if (n <= 0) return 0;
  return Math.max(1, Math.ceil(n * (0.4 + 0.6 * crewFactor(s))));
}

export function reloadTime(s: Ship, battery: BatteryId, ammo: AmmoId): number {
  const chaser = isChaser(battery) ? BALLISTICS.chaserReloadMul : 1;
  return s.baseReload * chaser * AMMO[ammo].reloadMul * (1 + (1 - crewFactor(s)) * 1.2);
}

/** Hauteur visée selon la zone (coque basse, pont, voilure). */
export function zoneAimY(cls: ShipClass, zone: Zone): number {
  if (zone === "coque") return cls.deckHeight * 0.45;
  if (zone === "canons") return cls.deckHeight + 0.9;
  return cls.deckHeight + (cls.mastHeight - cls.deckHeight) * 0.42;
}

/**
 * Zone touchée par un boulet en coordonnées locales du navire,
 * ou null si le boulet passe à côté.
 */
export function hitZone(
  cls: ShipClass,
  side: number,
  along: number,
  y: number,
  r: number,
): Zone | null {
  if (y < -0.5) return null;
  const a = cls.length / 2 + r;
  const b = cls.beam / 2 + r;
  const e = (along / a) ** 2 + (side / b) ** 2;
  if (e <= 1) {
    if (y <= cls.deckHeight + r) return "coque";
    if (y <= cls.deckHeight + 2.2) return "canons";
  }
  if (
    Math.abs(along) <= cls.length * 0.42 &&
    Math.abs(side) <= cls.beam * 0.85 &&
    y > cls.deckHeight + 2.2 - r &&
    y <= cls.mastHeight
  ) {
    return "voiles";
  }
  return null;
}

/** Position locale d'une pièce de la batterie. */
export function gunLocal(
  cls: ShipClass,
  battery: BatteryId,
  i: number,
  n: number,
): { side: number; along: number; y: number } {
  if (battery === "tribord" || battery === "babord") {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const side = (battery === "tribord" ? 1 : -1) * (cls.beam / 2 + 0.25);
    return { side, along: lerp(-0.3, 0.3, t) * cls.length, y: cls.deckHeight * 0.72 };
  }
  const offset = n === 1 ? 0 : i % 2 === 0 ? -0.7 : 0.7;
  const along = battery === "proue" ? cls.length / 2 - 0.4 : -cls.length / 2 + 0.6;
  return { side: offset, along, y: cls.deckHeight * 0.9 };
}

/** Déclenche une bordée : les pièces partent l'une après l'autre (tir roulant). */
export function fireBattery(
  world: World,
  s: Ship,
  battery: BatteryId,
  targetId: number | null,
): boolean {
  if (!isAfloat(s) || s.repairT > 0) return false;
  if (s.reload[battery] > 0) return false;
  const n = gunsAvailable(s, battery);
  if (n === 0) return false;
  const ammo: AmmoId = s.ammo === "feu" && s.fireStock <= 0 ? "boulet" : s.ammo;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let k = 0; k < n; k++) {
    world.pending.push({
      at: world.time + k * BALLISTICS.rippleDelay + world.rng() * 0.03,
      shipId: s.id,
      battery,
      gun: order[k],
      guns: n,
      targetId,
      ammo,
    });
  }
  const t = reloadTime(s, battery, ammo);
  s.reload[battery] = t;
  s.reloadTotal[battery] = t;
  if (ammo === "feu") {
    s.fireStock -= 1;
    if (s.fireStock <= 0) s.ammo = "boulet";
  }
  world.events.push({ type: "bordee", shipId: s.id, battery, guns: n });
  return true;
}

/** Tire une pièce : visée avec anticipation, dispersion et arc balistique. */
export function fireGun(
  world: World,
  shot: {
    shipId: number;
    battery: BatteryId;
    gun: number;
    guns: number;
    targetId: number | null;
    ammo: AmmoId;
  },
): void {
  const s = getShip(world, shot.shipId);
  if (!isAfloat(s)) return;
  const def = AMMO[shot.ammo];
  const g = gunLocal(s.cls, shot.battery, shot.gun, shot.guns);
  const wp = toWorld(s.x, s.z, s.h, g.side, g.along);
  const maxRange = effectiveRange(s, shot.ammo);
  const v = BALLISTICS.muzzleSpeed * def.speedMul;
  const target = getShip(world, shot.targetId);

  let aimX: number;
  let aimZ: number;
  let aimY: number;
  if (isAfloat(target)) {
    const tf = forwardOf(target.h);
    let px = target.x;
    let pz = target.z;
    for (let k = 0; k < 2; k++) {
      const t = dist(wp.x, wp.z, px, pz) / v;
      px = target.x + tf.x * target.speed * t;
      pz = target.z + tf.z * target.speed * t;
    }
    // Les pièces visent des points étagés le long de la cible.
    const spreadAlong =
      (shot.guns === 1 ? 0 : shot.gun / (shot.guns - 1) - 0.5) * target.cls.length * 0.55;
    aimX = px + tf.x * spreadAlong;
    aimZ = pz + tf.z * spreadAlong;
    aimY = zoneAimY(target.cls, def.aim);
  } else {
    const dirH = s.h - BATTERY_BEARING[shot.battery];
    aimX = wp.x + Math.sin(dirH) * maxRange * 0.92;
    aimZ = wp.z + Math.cos(dirH) * maxRange * 0.92;
    aimY = 0;
  }

  // La pièce ne pivote que dans l'arc de son sabord.
  const center = BATTERY_BEARING[shot.battery];
  const arc = batteryArc(shot.battery);
  const wanted = wrapAngle(s.h - headingTo(wp.x, wp.z, aimX, aimZ));
  const bearing = center + clamp(wrapAngle(wanted - center), -arc, arc);
  const baseH = s.h - bearing;
  const desired = Math.min(dist(wp.x, wp.z, aimX, aimZ), maxRange);

  const y0 = g.y;
  for (let p = 0; p < def.pellets; p++) {
    const spread = s.spread * (1 + desired / 100) * (def.pellets > 1 ? 1.8 : 1);
    const h = baseH + gaussian(world.rng) * spread;
    const r = clamp(
      desired * (1 + gaussian(world.rng) * (0.02 + s.spread * 0.6)),
      4,
      maxRange * 1.03,
    );
    const y = aimY + gaussian(world.rng) * (0.45 + r * 0.009);
    const t = r / v;
    const vy = (y - y0 + 0.5 * BALLISTICS.gravity * t * t) / t;
    const proj: Projectile = {
      id: world.nextId++,
      owner: s.id,
      team: s.team,
      kind: "boulet",
      x: wp.x,
      y: y0,
      z: wp.z,
      vx: Math.sin(h) * v,
      vy,
      vz: Math.cos(h) * v,
      ammo: shot.ammo,
      damage: s.gunDamage * def.pelletDamage,
      ignite: def.ignite,
      age: 0,
      radius: BALLISTICS.ballRadius,
    };
    world.projectiles.push(proj);
    s.stats.shots += 1;
  }
  world.events.push({
    type: "tir",
    shipId: s.id,
    battery: shot.battery,
    x: wp.x,
    y: y0,
    z: wp.z,
    dirH: baseH,
    ammo: shot.ammo,
  });
}

/** Lance une bombe de mortier sur la position anticipée de la cible. */
export function fireMortar(world: World, s: Ship, target: Ship): boolean {
  const m = s.cls.mortar;
  if (!m || !isAfloat(s) || !isAfloat(target) || s.mortarReload > 0) return false;
  const d = dist(s.x, s.z, target.x, target.z);
  if (d < m.minRange || d > m.range) return false;
  const tf = forwardOf(target.h);
  const T = m.flightTime;
  const err = 4 + d * 0.045;
  const tx = target.x + tf.x * target.speed * T + gaussian(world.rng) * err;
  const tz = target.z + tf.z * target.speed * T + gaussian(world.rng) * err;
  const y0 = s.cls.deckHeight + 1;
  world.projectiles.push({
    id: world.nextId++,
    owner: s.id,
    team: s.team,
    kind: "bombe",
    x: s.x,
    y: y0,
    z: s.z,
    vx: (tx - s.x) / T,
    vy: (0 - y0 + 0.5 * BALLISTICS.gravity * T * T) / T,
    vz: (tz - s.z) / T,
    ammo: "boulet",
    damage: m.damage * (s.elite ? 1.2 : 1),
    ignite: 0.35,
    age: 0,
    radius: m.radius,
  });
  s.mortarReload = m.reload * (1 + (1 - crewFactor(s)) * 1.2);
  s.stats.shots += 1;
  world.events.push({
    type: "bombe-lancee",
    shipId: s.id,
    tx,
    tz,
    flightTime: T,
    radius: m.radius,
  });
  return true;
}

export function ignite(world: World, s: Ship, amount: number): void {
  if (!isAfloat(s)) return;
  const wasBurning = s.fire > 0.05;
  s.fire = Math.min(1, s.fire + amount);
  if (!wasBurning) world.events.push({ type: "incendie", shipId: s.id });
}

/** Inflige des dégâts à une zone ; une zone déjà détruite reporte 40 % sur la coque. */
export function applyDamage(
  world: World,
  s: Ship,
  zone: Zone,
  amount: number,
  attackerId: number | null,
): number {
  if (s.state !== "afloat" || amount <= 0) return 0;
  let dealt = 0;
  if (zone === "coque") {
    dealt = Math.min(s.hull, amount);
    s.hull -= dealt;
  } else if (zone === "voiles") {
    if (s.sails > 0) {
      dealt = Math.min(s.sails, amount);
      s.sails -= dealt;
    } else {
      dealt = Math.min(s.hull, amount * 0.4);
      s.hull -= dealt;
    }
  } else {
    if (s.cannons > 0) {
      dealt = Math.min(s.cannons, amount);
      s.cannons -= dealt;
    } else {
      dealt = Math.min(s.hull, amount * 0.4);
      s.hull -= dealt;
    }
  }
  s.stats.damageTaken += dealt;
  if (attackerId !== null) {
    s.lastAttacker = attackerId;
    const attacker = getShip(world, attackerId);
    if (attacker && attacker.id !== s.id) attacker.stats.damageDealt += dealt;
  }
  if (s.hull <= 0) startSinking(world, s);
  return dealt;
}

export function startSinking(world: World, s: Ship): void {
  if (s.state !== "afloat") return;
  s.hull = 0;
  s.state = "sinking";
  s.sinkT = 0;
  s.fire = Math.max(s.fire, 0.6);
  s.repairT = 0;
  s.sunkByPlayer = s.lastAttacker === world.playerId;
  world.events.push({ type: "naufrage", shipId: s.id });
  if (s.team === "pirates") {
    world.kills += 1;
    world.killsByClass[s.cls.id] = (world.killsByClass[s.cls.id] ?? 0) + 1;
    if (s.sunkByPlayer) world.loot += s.bounty;
  }
  // Un brûlot qui sombre explose et embrase tout ce qui l'entoure.
  if (s.cls.ram) {
    world.events.push({ type: "explosion", x: s.x, z: s.z, big: true });
    for (const other of world.ships) {
      if (other === s || other.state !== "afloat") continue;
      if (dist(s.x, s.z, other.x, other.z) <= 14) {
        applyDamage(world, other, "coque", 14, s.id);
        ignite(world, other, 0.3);
      }
    }
  }
}

/** Collision d'un boulet avec les navires adverses. Retourne vrai si le boulet a touché. */
export function resolveBallHit(world: World, p: Projectile): boolean {
  for (const s of world.ships) {
    if (s.team === p.team || s.state !== "afloat") continue;
    if (Math.abs(p.x - s.x) > s.cls.length || Math.abs(p.z - s.z) > s.cls.length) continue;
    const local = toLocal(s.x, s.z, s.h, p.x, p.z);
    const zone = hitZone(s.cls, local.side, local.along, p.y, p.radius);
    if (!zone) continue;
    const def = AMMO[p.ammo];
    const shooter = getShip(world, p.owner);
    if (shooter) shooter.stats.hits += 1;
    const dealt = applyDamage(world, s, zone, p.damage * def.damage[zone], p.owner);
    world.events.push({
      type: "impact",
      shipId: s.id,
      zone,
      x: p.x,
      y: p.y,
      z: p.z,
      damage: dealt,
      byPlayer: p.owner === world.playerId,
      ammo: p.ammo,
    });
    if (p.ignite > 0 && world.rng() < p.ignite) ignite(world, s, FIRE.igniteAmount);
    return true;
  }
  return false;
}

/** Une bombe touche l'eau : dégâts de zone dégressifs. */
export function resolveBombImpact(world: World, p: Projectile): void {
  world.events.push({ type: "explosion", x: p.x, z: p.z, big: false });
  for (const s of world.ships) {
    if (s.team === p.team || s.state !== "afloat") continue;
    const reach = p.radius + s.cls.length * 0.2;
    const d = dist(p.x, p.z, s.x, s.z);
    if (d > reach) continue;
    const falloff = 1 - 0.5 * (d / reach);
    const shooter = getShip(world, p.owner);
    if (shooter) shooter.stats.hits += 1;
    const dealt = applyDamage(world, s, "coque", p.damage * falloff, p.owner);
    applyDamage(world, s, "voiles", p.damage * 0.4 * falloff, p.owner);
    world.events.push({
      type: "impact",
      shipId: s.id,
      zone: "coque",
      x: s.x,
      y: s.cls.deckHeight,
      z: s.z,
      damage: dealt,
      byPlayer: false,
      ammo: "boulet",
    });
    if (world.rng() < p.ignite) ignite(world, s, FIRE.igniteAmount);
  }
}

/** Lance une réparation : l'équipage éteint le feu et rapièce pendant quelques secondes. */
export function startRepair(world: World, s: Ship): { ok: boolean; reason?: string } {
  if (!isAfloat(s)) return { ok: false, reason: "Le navire sombre" };
  if (s.repairT > 0) return { ok: false, reason: "Réparation déjà en cours" };
  if (s.repairKits <= 0) return { ok: false, reason: "Plus de trousse de réparation" };
  if (s.repairCooldown > 0)
    return { ok: false, reason: "Les charpentiers reprennent leur souffle" };
  const damaged =
    s.hull < s.hullMax || s.sails < s.sailsMax || s.cannons < s.cannonsMax || s.fire > 0;
  if (!damaged) return { ok: false, reason: "Le navire est intact" };
  s.repairKits -= 1;
  s.repairT = REPAIR.duration;
  s.fire = 0;
  world.events.push({ type: "reparation", shipId: s.id });
  return { ok: true };
}

/** Avance l'incendie et la réparation d'un navire. */
export function updateDamageOverTime(world: World, s: Ship, dt: number): void {
  if (s.state !== "afloat") return;
  if (s.repairT > 0) {
    const step = Math.min(dt, s.repairT);
    s.hull = Math.min(s.hullMax, s.hull + (s.hullMax * REPAIR.hull * step) / REPAIR.duration);
    s.sails = Math.min(s.sailsMax, s.sails + (s.sailsMax * REPAIR.sails * step) / REPAIR.duration);
    s.cannons = Math.min(
      s.cannonsMax,
      s.cannons + (s.cannonsMax * REPAIR.cannons * step) / REPAIR.duration,
    );
    s.repairT -= step;
    if (s.repairT <= 0) {
      s.repairT = 0;
      s.repairCooldown = REPAIR.cooldown;
    }
    return;
  }
  if (s.repairCooldown > 0) s.repairCooldown = Math.max(0, s.repairCooldown - dt);
  if (s.fire > 0) {
    const f = s.fire;
    s.fire = clamp(
      f + (FIRE.growth + FIRE.spread * f - FIRE.suppression * (0.4 + 0.6 * crewFactor(s))) * dt,
      0,
      1,
    );
    if (s.fire < 0.02) s.fire = 0;
    applyDamage(world, s, "voiles", FIRE.sailsDps * f * dt, s.lastAttacker);
    applyDamage(world, s, "canons", FIRE.cannonsDps * f * dt, s.lastAttacker);
    applyDamage(world, s, "coque", FIRE.hullDps * f * dt, s.lastAttacker);
  }
}
