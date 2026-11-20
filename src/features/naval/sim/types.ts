import type { AmmoId, BatteryId, ShipClass, ShipClassId, Zone } from "./defs.ts";
import type { Rng } from "./math.ts";
import type { IslandDef, MissionDef, WaveDef } from "./missions.ts";

export type Team = "joueur" | "pirates";
export type ShipState = "afloat" | "sinking" | "sunk";

export interface AiState {
  /** Mode courant, lisible en débogage et dans les tests. */
  mode: string;
  /** Côté préféré pour tourner autour de la cible (+1 tribord, −1 bâbord). */
  side: 1 | -1;
  decisionIn: number;
  desiredH: number;
  throttle: number;
  modeTime: number;
  repaired: boolean;
  fled: boolean;
  weavePhase: number;
}

export interface ShipStats {
  shots: number;
  hits: number;
  damageDealt: number;
  damageTaken: number;
}

export interface Ship {
  id: number;
  cls: ShipClass;
  team: Team;
  name: string;
  elite: boolean;
  x: number;
  z: number;
  h: number;
  speed: number;
  /** Barre : −1 bâbord … +1 tribord. */
  rudder: number;
  throttle: number;
  /** Vitesse angulaire réelle (rad/s), utilisée pour la gîte au rendu. */
  yawRate: number;
  hull: number;
  hullMax: number;
  sails: number;
  sailsMax: number;
  cannons: number;
  cannonsMax: number;
  /** Intensité de l'incendie, 0 = aucun feu, 1 = brasier. */
  fire: number;
  gunDamage: number;
  range: number;
  baseReload: number;
  spread: number;
  guns: Record<BatteryId, number>;
  reload: Record<BatteryId, number>;
  reloadTotal: Record<BatteryId, number>;
  mortarReload: number;
  ammo: AmmoId;
  fireStock: number;
  repairKits: number;
  /** Secondes restantes de réparation (0 = aucune). */
  repairT: number;
  repairCooldown: number;
  state: ShipState;
  sinkT: number;
  ai: AiState | null;
  bounty: number;
  stats: ShipStats;
  lastAttacker: number | null;
  /** Vrai si le joueur a porté le coup fatal (le butin lui revient). */
  sunkByPlayer: boolean;
  groundedFor: number;
}

export interface Projectile {
  id: number;
  owner: number;
  team: Team;
  kind: "boulet" | "bombe";
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ammo: AmmoId;
  damage: number;
  ignite: number;
  age: number;
  radius: number;
}

export interface PendingShot {
  at: number;
  shipId: number;
  battery: BatteryId;
  gun: number;
  guns: number;
  targetId: number | null;
  ammo: AmmoId;
}

export type NavalEvent =
  | {
      type: "tir";
      shipId: number;
      battery: BatteryId;
      x: number;
      y: number;
      z: number;
      dirH: number;
      ammo: AmmoId;
    }
  | { type: "bordee"; shipId: number; battery: BatteryId; guns: number }
  | { type: "gerbe"; x: number; z: number; big: boolean }
  | {
      type: "impact";
      shipId: number;
      zone: Zone;
      x: number;
      y: number;
      z: number;
      damage: number;
      byPlayer: boolean;
      ammo: AmmoId;
    }
  | { type: "incendie"; shipId: number }
  | { type: "naufrage"; shipId: number }
  | { type: "coule"; shipId: number }
  | {
      type: "bombe-lancee";
      shipId: number;
      tx: number;
      tz: number;
      flightTime: number;
      radius: number;
    }
  | { type: "explosion"; x: number; z: number; big: boolean }
  | { type: "reparation"; shipId: number }
  | { type: "vague"; index: number }
  | { type: "echouage"; shipId: number }
  | { type: "fin"; outcome: "victoire" | "defaite" };

export interface WaveRuntime {
  def: WaveDef;
  spawned: boolean;
}

export type Outcome = "en-cours" | "victoire" | "defaite";

export interface World {
  time: number;
  rng: Rng;
  ships: Ship[];
  projectiles: Projectile[];
  pending: PendingShot[];
  /** Événements de l'étape courante : consommés par le rendu puis vidés. */
  events: NavalEvent[];
  islands: readonly IslandDef[];
  arenaRadius: number;
  mission: MissionDef;
  waves: WaveRuntime[];
  playerId: number;
  targetId: number | null;
  /** Vrai si le joueur a choisi sa cible lui-même. */
  targetLocked: boolean;
  kills: number;
  killsByClass: Partial<Record<ShipClassId, number>>;
  loot: number;
  outcome: Outcome;
  /** Fin décidée, appliquée après un court délai pour laisser jouer l'animation. */
  outcomeAt: number | null;
  pendingOutcome: Outcome;
  nextId: number;
}

export interface PlayerControls {
  /** −1 bâbord … +1 tribord. */
  rudder: number;
  /** Voilure 0..1. */
  throttle: number;
}
