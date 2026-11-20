/**
 * IA des navires ennemis : une tactique par rôle.
 *
 * - harceleur (cotre) : tourne autour de la cible à vive allure, fuit blessé ;
 * - duelliste (brick) : se met bord à bord et vire pour garder une bordée prête ;
 * - artilleur (frégate) : tient la distance, brise les voiles, se répare une fois ;
 * - kamikaze (brûlot) : intercepte et zigzague quand une bordée le menace ;
 * - bombardier (galiote) : reste loin et lobe des bombes, fuit au contact.
 *
 * Les décisions sont prises toutes les ~0,3 s ; la barre est corrigée à
 * chaque pas. L'IA n'utilise que les actions disponibles au joueur.
 */

import { BATTERIES, type BatteryId } from "./defs.ts";
import {
  effectiveRange,
  fireBattery,
  fireMortar,
  getPlayer,
  inBatteryArc,
  isAfloat,
  startRepair,
} from "./combat.ts";
import { bearingTo, clamp, dist, forwardOf, headingTo, wrapAngle, type Rng } from "./math.ts";
import type { AiState, Ship, World } from "./types.ts";

export function createAiState(rng: Rng): AiState {
  return {
    mode: "approche",
    side: rng() < 0.5 ? 1 : -1,
    decisionIn: rng() * 0.3,
    desiredH: 0,
    throttle: 1,
    modeTime: 0,
    repaired: false,
    fled: false,
    weavePhase: rng() * Math.PI * 2,
  };
}

function setMode(ai: AiState, mode: string): void {
  if (ai.mode !== mode) {
    ai.mode = mode;
    ai.modeTime = 0;
  }
}

/** Cap qui présente un flanc à la cible tout en corrigeant la distance. */
export function broadsideHeading(s: Ship, target: Ship, side: 1 | -1, desiredDist: number): number {
  const los = headingTo(s.x, s.z, target.x, target.z);
  const d = dist(s.x, s.z, target.x, target.z);
  const err = clamp((d - desiredDist) / desiredDist, -1, 1.5);
  const correction = clamp(err * 1.1, -0.75, 0.95);
  return side === 1 ? los + Math.PI / 2 - correction : los - Math.PI / 2 + correction;
}

function sideBattery(side: 1 | -1): BatteryId {
  return side === 1 ? "tribord" : "babord";
}

/** Choisit le flanc qui demande le moins de virage. */
function closestSide(s: Ship, target: Ship, desiredDist: number): 1 | -1 {
  const star = Math.abs(wrapAngle(broadsideHeading(s, target, 1, desiredDist) - s.h));
  const port = Math.abs(wrapAngle(broadsideHeading(s, target, -1, desiredDist) - s.h));
  return star <= port ? 1 : -1;
}

/** Change d'amure quand la bordée présentée recharge et que l'autre est prête. */
function maybeTack(s: Ship, ai: AiState): void {
  const current = sideBattery(ai.side);
  const other = sideBattery(ai.side === 1 ? -1 : 1);
  if (s.reload[current] > 1.5 && s.reload[other] <= 0.3 && ai.modeTime > 4) {
    ai.side = ai.side === 1 ? -1 : 1;
    setMode(ai, "virement");
  }
}

function chooseAmmo(world: World, s: Ship, target: Ship, d: number): void {
  const sailsRatio = target.sails / target.sailsMax;
  if (d < effectiveRange(s, "mitraille") * 0.95 && target.cannons > 0) {
    s.ammo = "mitraille";
  } else if (d < effectiveRange(s, "chaine") * 0.95 && sailsRatio > 0.45 && world.rng() < 0.25) {
    s.ammo = "chaine";
  } else {
    s.ammo = "boulet";
  }
}

function decide(world: World, s: Ship, ai: AiState, target: Ship): void {
  const d = dist(s.x, s.z, target.x, target.z);
  const los = headingTo(s.x, s.z, target.x, target.z);
  const hullRatio = s.hull / s.hullMax;

  switch (s.cls.role) {
    case "harceleur": {
      const orbit = s.range * 0.8;
      if (hullRatio < 0.35 && !ai.fled && ai.mode !== "fuite") {
        setMode(ai, "fuite");
        ai.fled = true;
      }
      if (ai.mode === "fuite") {
        ai.desiredH = los + Math.PI + ai.side * 0.4;
        ai.throttle = 1;
        if (ai.modeTime > 7) setMode(ai, "harcelement");
        break;
      }
      if (d > s.range * 1.5) {
        setMode(ai, "approche");
        ai.desiredH = los + ai.side * 0.3;
      } else {
        setMode(ai, "harcelement");
        ai.desiredH = broadsideHeading(s, target, ai.side, orbit);
      }
      ai.throttle = 1;
      chooseAmmo(world, s, target, d);
      break;
    }
    case "duelliste": {
      const ideal = s.range * 0.6;
      if (d > s.range * 1.4) {
        setMode(ai, "approche");
        ai.desiredH = los + ai.side * 0.3;
        ai.throttle = 1;
      } else {
        if (ai.mode === "approche") ai.side = closestSide(s, target, ideal);
        if (ai.mode !== "virement") setMode(ai, "duel");
        maybeTack(s, ai);
        if (ai.mode === "virement" && ai.modeTime > 3) setMode(ai, "duel");
        ai.desiredH = broadsideHeading(s, target, ai.side, ideal);
        ai.throttle = 0.8;
      }
      chooseAmmo(world, s, target, d);
      break;
    }
    case "artilleur": {
      const ideal = s.range * 0.85;
      if (hullRatio < 0.4 && !ai.repaired && s.repairKits > 0) {
        if (startRepair(world, s).ok) ai.repaired = true;
      }
      if (d < 38) {
        setMode(ai, "degagement");
        ai.desiredH = los + Math.PI + ai.side * 0.5;
        ai.throttle = 1;
      } else if (d > s.range * 1.3) {
        setMode(ai, "approche");
        ai.desiredH = los + ai.side * 0.25;
        ai.throttle = 1;
      } else {
        if (ai.mode === "approche" || ai.mode === "degagement")
          ai.side = closestSide(s, target, ideal);
        if (ai.mode !== "virement") setMode(ai, "canonnade");
        maybeTack(s, ai);
        if (ai.mode === "virement" && ai.modeTime > 4) setMode(ai, "canonnade");
        ai.desiredH = broadsideHeading(s, target, ai.side, ideal);
        ai.throttle = 0.7;
      }
      // Brise d'abord la voilure d'une cible rapide, puis pilonne la coque.
      const chainRange = effectiveRange(s, "chaine");
      if (
        d < chainRange * 0.95 &&
        target.sails / target.sailsMax > 0.4 &&
        target.speed > s.speed * 1.05
      ) {
        s.ammo = "chaine";
      } else if (s.fireStock > 0 && d < effectiveRange(s, "feu") * 0.9 && world.rng() < 0.15) {
        s.ammo = "feu";
      } else {
        s.ammo = "boulet";
      }
      break;
    }
    case "kamikaze": {
      setMode(ai, "abordage");
      const tf = forwardOf(target.h);
      const t = Math.min(6, d / Math.max(s.speed, 4));
      ai.desiredH = headingTo(
        s.x,
        s.z,
        target.x + tf.x * target.speed * t,
        target.z + tf.z * target.speed * t,
      );
      ai.throttle = 1;
      break;
    }
    case "bombardier": {
      const m = s.cls.mortar;
      const maxR = m ? m.range : s.range;
      if (d < 60) {
        setMode(ai, "fuite");
        ai.desiredH = los + Math.PI + ai.side * 0.3;
        ai.throttle = 1;
      } else if (d > maxR * 0.9) {
        setMode(ai, "approche");
        ai.desiredH = los;
        ai.throttle = 0.8;
      } else {
        setMode(ai, "pilonnage");
        ai.desiredH = broadsideHeading(s, target, ai.side, 100);
        ai.throttle = 0.45;
      }
      s.ammo = "boulet";
      break;
    }
    case "joueur":
      break;
  }
}

/** Écarte le cap des îles sur la route et ramène vers le centre de l'arène. */
export function avoidObstacles(world: World, s: Ship, desired: number): number {
  let h = desired;
  const fromCenter = Math.hypot(s.x, s.z);
  if (fromCenter > world.arenaRadius - 70) {
    const home = headingTo(s.x, s.z, 0, 0);
    const w = clamp((fromCenter - (world.arenaRadius - 70)) / 50, 0, 1);
    h = h + wrapAngle(home - h) * w;
  }
  const look = 30 + s.speed * 3;
  const f = forwardOf(h);
  for (const isl of world.islands) {
    const px = isl.x - s.x;
    const pz = isl.z - s.z;
    const along = px * f.x + pz * f.z;
    if (along < -isl.radius || along > look + isl.radius) continue;
    const lateral = -px * f.z + pz * f.x;
    const clearance = isl.radius + s.cls.length * 0.6 + 8;
    if (Math.abs(lateral) < clearance) {
      const push = 0.6 + 0.6 * (1 - Math.abs(lateral) / clearance);
      // Île à tribord de la route : on lofe vers bâbord (le cap augmente).
      h += lateral >= 0 ? push : -push;
    }
  }
  return h;
}

function fireWeapons(world: World, s: Ship, target: Ship): void {
  if (s.cls.mortar) fireMortar(world, s, target);
  const d = dist(s.x, s.z, target.x, target.z);
  if (d > effectiveRange(s, s.ammo) && d <= effectiveRange(s, "boulet")) s.ammo = "boulet";
  if (d > effectiveRange(s, s.ammo)) return;
  for (const b of BATTERIES) {
    if (s.guns[b] <= 0 || s.reload[b] > 0) continue;
    if (!inBatteryArc(s, b, target.x, target.z)) continue;
    fireBattery(world, s, b, target.id);
  }
}

export function updateAi(world: World, s: Ship, dt: number): void {
  const ai = s.ai;
  if (!ai || s.state !== "afloat") return;
  ai.modeTime += dt;
  ai.decisionIn -= dt;
  ai.weavePhase += dt * 2.2;
  const target = getPlayer(world);
  if (!isAfloat(target)) {
    setMode(ai, "victoire");
    s.throttle = 0.4;
    s.rudder = 0;
    return;
  }
  if (ai.decisionIn <= 0) {
    ai.decisionIn = 0.3 + world.rng() * 0.15;
    decide(world, s, ai, target);
  }
  let desired = ai.desiredH;
  if (s.cls.role === "kamikaze") {
    // Zigzague quand une bordée chargée du joueur le vise.
    const d = dist(s.x, s.z, target.x, target.z);
    const b = bearingTo(target.x, target.z, target.h, s.x, s.z);
    const side: BatteryId = b > 0 ? "tribord" : "babord";
    const threatened =
      Math.abs(Math.abs(b) - Math.PI / 2) < 0.75 &&
      d < target.range * 1.1 &&
      target.reload[side] < 1.5;
    if (threatened && d > 25) desired += Math.sin(ai.weavePhase) * 0.55;
  }
  desired = avoidObstacles(world, s, desired);
  const diff = wrapAngle(desired - s.h);
  s.rudder = clamp(-diff * 2.5, -1, 1);
  s.throttle = ai.throttle;
  fireWeapons(world, s, target);
}
