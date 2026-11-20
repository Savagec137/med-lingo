/**
 * Pilote automatique du joueur : joue une mission avec les mêmes commandes
 * qu'un humain (barre, TIRER, munition, réparation). Sert aux tests de bout en
 * bout et à l'équilibrage, pour vérifier que chaque mission se gagne et se perd.
 */

import { broadsideHeading, avoidObstacles } from "./ai.ts";
import { effectiveRange, getPlayer, getShip, isAfloat } from "./combat.ts";
import { BALLISTICS } from "./defs.ts";
import { bearingTo, clamp, dist, wrapAngle } from "./math.ts";
import { playerFire, playerRepair, setPlayerAmmo, stepWorld } from "./world.ts";
import type { PlayerControls, World } from "./types.ts";

export interface AutopilotOptions {
  /** Distance de combat visée, en fraction de la portée. */
  standoff?: number;
  /** Le pilote répare-t-il son navire ? */
  repairs?: boolean;
  /** Le pilote tire-t-il ? (faux = cible passive, pour tester l'IA ennemie) */
  fires?: boolean;
  /** Le pilote esquive-t-il les bombes de mortier ? */
  dodges?: boolean;
}

export function autopilotControls(world: World, opts: AutopilotOptions = {}): PlayerControls {
  const player = getPlayer(world);
  const target = getShip(world, world.targetId);
  if (!isAfloat(player)) return { rudder: 0, throttle: 0 };
  if (opts.repairs !== false) {
    const hurt = player.hull / player.hullMax < 0.45 || player.fire > 0.45;
    if (hurt && player.repairKits > 0) playerRepair(world);
  }
  if (!isAfloat(target)) return { rudder: 0, throttle: 0.6 };
  const d = dist(player.x, player.z, target.x, target.z);
  const range = effectiveRange(player, "boulet");
  const side: 1 | -1 = bearingTo(player.x, player.z, player.h, target.x, target.z) < 0 ? -1 : 1;
  let desired = broadsideHeading(player, target, side, range * (opts.standoff ?? 0.62));
  if (opts.dodges !== false) {
    // Esquive : une bombe qui tombera près de la route impose un virage serré.
    for (const p of world.projectiles) {
      if (p.kind !== "bombe" || p.team === player.team) continue;
      const g = BALLISTICS.gravity;
      const t = (p.vy + Math.sqrt(p.vy * p.vy + 2 * g * Math.max(0, p.y))) / g;
      const landX = p.x + p.vx * t;
      const landZ = p.z + p.vz * t;
      const aheadX = player.x + Math.sin(player.h) * player.speed * t;
      const aheadZ = player.z + Math.cos(player.h) * player.speed * t;
      if (dist(landX, landZ, aheadX, aheadZ) < p.radius + player.cls.length * 0.4) {
        desired =
          player.h + (bearingTo(player.x, player.z, player.h, landX, landZ) > 0 ? 1.2 : -1.2);
        break;
      }
    }
  }
  desired = avoidObstacles(world, player, desired);
  const diff = wrapAngle(desired - player.h);
  if (opts.fires !== false) {
    if (target.cls.id === "fregate" && player.fireStock > 0 && d < effectiveRange(player, "feu"))
      setPlayerAmmo(world, "feu");
    else setPlayerAmmo(world, "boulet");
    if (d <= effectiveRange(player, player.ammo)) playerFire(world);
  }
  return { rudder: clamp(-diff * 2.5, -1, 1), throttle: 1 };
}

/** Joue une bataille jusqu'à sa fin (ou la limite de temps). */
export function runBattle(world: World, opts: AutopilotOptions = {}, maxSeconds = 600): World {
  const dt = 1 / 60;
  const steps = Math.ceil(maxSeconds / dt);
  for (let i = 0; i < steps && world.outcome === "en-cours"; i++) {
    stepWorld(world, dt, autopilotControls(world, opts));
    world.events.length = 0;
  }
  return world;
}
