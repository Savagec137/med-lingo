/**
 * Missions de la région « Eaux tranquilles » et décor de l'arène.
 *
 * Une mission est une suite de vagues ; chaque vague apparaît quand la
 * précédente est presque coulée (ou après un délai). Les récompenses sont
 * déclarées ici et appliquées par `save.ts` — rien n'est calculé ailleurs.
 */

import type { ShipClassId } from "./defs.ts";

export interface IslandDef {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  kind: "ile" | "rocher" | "fort";
  palms: number;
  seed: number;
}

/** Îles de la zone de combat. Elles bloquent les navires et masquent l'horizon. */
export const ARENA_ISLANDS: readonly IslandDef[] = [
  { id: "pointe-ouest", x: 150, z: 300, radius: 46, height: 26, kind: "ile", palms: 7, seed: 11 },
  { id: "fort-du-cap", x: -175, z: 265, radius: 42, height: 22, kind: "fort", palms: 5, seed: 23 },
  { id: "ilot-du-large", x: 30, z: 470, radius: 16, height: 9, kind: "rocher", palms: 0, seed: 37 },
  { id: "anse-sud", x: 330, z: -60, radius: 52, height: 30, kind: "ile", palms: 8, seed: 41 },
  { id: "recif-noir", x: -320, z: -170, radius: 30, height: 16, kind: "ile", palms: 4, seed: 53 },
  {
    id: "dents-du-diable",
    x: -60,
    z: -330,
    radius: 14,
    height: 11,
    kind: "rocher",
    palms: 0,
    seed: 67,
  },
  {
    id: "ile-aux-perles",
    x: -430,
    z: 360,
    radius: 40,
    height: 20,
    kind: "ile",
    palms: 6,
    seed: 79,
  },
  {
    id: "rocher-sentinelle",
    x: 420,
    z: 330,
    radius: 18,
    height: 14,
    kind: "rocher",
    palms: 1,
    seed: 83,
  },
];

export const ARENA_RADIUS = 560;
export const PLAYER_START = { x: 0, z: 0, h: 0 } as const;

export interface WaveShip {
  cls: ShipClassId;
  elite?: boolean;
  name?: string;
}

export type WaveTrigger =
  | { type: "start" }
  /** Apparaît quand il reste au plus `count` ennemis à flot. */
  | { type: "remaining"; count: number }
  /** Apparaît `t` secondes après le début de la bataille. */
  | { type: "time"; t: number };

export interface WaveDef {
  ships: readonly WaveShip[];
  trigger: WaveTrigger;
  spawn: "devant" | "flancs" | "derriere" | "autour";
}

export type Objective = { type: "couler-tout" } | { type: "couler-elite"; name: string };

export interface MissionDef {
  id: string;
  name: string;
  brief: string;
  objective: Objective;
  waves: readonly WaveDef[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Prime versée à la première victoire. */
  reward: { gold: number; gems: number };
  /** Prime versée aux victoires suivantes. */
  replayGold: number;
}

export const REGION = {
  id: "eaux-tranquilles",
  name: "Eaux tranquilles",
} as const;

export const MISSIONS: readonly MissionDef[] = [
  {
    id: "premiers-boulets",
    name: "Premiers boulets",
    brief:
      "Deux cotres des douanes patrouillent près du cap. Présentez-leur votre flanc : les canons sont sur les côtés.",
    objective: { type: "couler-tout" },
    waves: [
      { ships: [{ cls: "cotre" }, { cls: "cotre" }], trigger: { type: "start" }, spawn: "devant" },
      { ships: [{ cls: "cotre" }], trigger: { type: "remaining", count: 0 }, spawn: "flancs" },
    ],
    difficulty: 1,
    reward: { gold: 120, gems: 0 },
    replayGold: 40,
  },
  {
    id: "coulez-cinq",
    name: "Coulez 5 navires",
    brief:
      "Une patrouille de la Marine traque les contrebandiers de l'archipel. Ses bricks se battent bord à bord.",
    objective: { type: "couler-tout" },
    waves: [
      { ships: [{ cls: "cotre" }, { cls: "cotre" }], trigger: { type: "start" }, spawn: "devant" },
      {
        ships: [{ cls: "brick" }, { cls: "cotre" }],
        trigger: { type: "remaining", count: 1 },
        spawn: "flancs",
      },
      { ships: [{ cls: "brick" }], trigger: { type: "remaining", count: 0 }, spawn: "devant" },
    ],
    difficulty: 2,
    reward: { gold: 200, gems: 0 },
    replayGold: 70,
  },
  {
    id: "brulots",
    name: "Les brûlots de la baie",
    brief:
      "Le Gouverneur lance des brûlots chargés de poudre sur vous. Coulez-les avant le contact, ou esquivez.",
    objective: { type: "couler-tout" },
    waves: [
      { ships: [{ cls: "brick" }, { cls: "brulot" }], trigger: { type: "start" }, spawn: "devant" },
      {
        ships: [{ cls: "brulot" }, { cls: "brulot" }, { cls: "cotre" }],
        trigger: { type: "remaining", count: 1 },
        spawn: "autour",
      },
    ],
    difficulty: 2,
    reward: { gold: 260, gems: 0 },
    replayGold: 90,
  },
  {
    // Identifiant historique conservé : les sauvegardes y sont rattachées.
    id: "le-borgne",
    name: "Le Vigilant",
    brief:
      "Le Vigilant, brick renforcé du capitaine Valmont, chasse les pirates de l'archipel. Coulez-le : son escorte ne compte pas.",
    objective: { type: "couler-elite", name: "Le Vigilant" },
    waves: [
      {
        ships: [
          { cls: "brick", elite: true, name: "Le Vigilant" },
          { cls: "cotre" },
          { cls: "cotre" },
        ],
        trigger: { type: "start" },
        spawn: "devant",
      },
      {
        ships: [{ cls: "brulot" }, { cls: "cotre" }],
        trigger: { type: "time", t: 45 },
        spawn: "flancs",
      },
    ],
    difficulty: 3,
    reward: { gold: 320, gems: 1 },
    replayGold: 110,
  },
  {
    id: "bombes-sur-la-passe",
    name: "Bombes sur la passe",
    brief:
      "Les galiotes du Gouverneur bombardent la passe depuis le large. Sortez des cercles rouges et allez les chercher.",
    objective: { type: "couler-tout" },
    waves: [
      {
        ships: [{ cls: "galiote" }, { cls: "brick" }],
        trigger: { type: "start" },
        spawn: "devant",
      },
      {
        ships: [{ cls: "galiote" }, { cls: "cotre" }, { cls: "cotre" }],
        trigger: { type: "remaining", count: 1 },
        spawn: "flancs",
      },
    ],
    difficulty: 3,
    reward: { gold: 380, gems: 1 },
    replayGold: 130,
  },
  {
    // Identifiant historique conservé : les sauvegardes y sont rattachées.
    id: "la-vipere",
    name: "La frégate du Gouverneur",
    brief:
      "L'Inflexible, frégate de 16 canons du Gouverneur, garde le passage. Ses bricks la couvrent.",
    objective: { type: "couler-elite", name: "L'Inflexible" },
    waves: [
      {
        ships: [{ cls: "fregate", elite: true, name: "L'Inflexible" }],
        trigger: { type: "start" },
        spawn: "devant",
      },
      {
        ships: [{ cls: "brick" }, { cls: "brick" }],
        trigger: { type: "time", t: 20 },
        spawn: "flancs",
      },
    ],
    difficulty: 4,
    reward: { gold: 520, gems: 2 },
    replayGold: 180,
  },
  {
    id: "tempete-de-fer",
    name: "Tempête de fer",
    brief: "Toute l'escadre du Gouverneur converge sur vous. Quatre vagues, aucun répit.",
    objective: { type: "couler-tout" },
    waves: [
      {
        ships: [{ cls: "cotre" }, { cls: "brick" }, { cls: "cotre" }],
        trigger: { type: "start" },
        spawn: "devant",
      },
      {
        ships: [{ cls: "brulot" }, { cls: "brulot" }, { cls: "galiote" }],
        trigger: { type: "remaining", count: 1 },
        spawn: "autour",
      },
      {
        ships: [{ cls: "fregate" }, { cls: "brick" }],
        trigger: { type: "remaining", count: 1 },
        spawn: "devant",
      },
      {
        ships: [{ cls: "brick" }, { cls: "galiote" }],
        trigger: { type: "remaining", count: 1 },
        spawn: "flancs",
      },
    ],
    difficulty: 5,
    reward: { gold: 750, gems: 3 },
    replayGold: 250,
  },
];

export function getMission(id: string): MissionDef {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error(`Mission inconnue : ${id}`);
  return mission;
}

export function missionEnemyCount(mission: MissionDef): number {
  return mission.waves.reduce((n, w) => n + w.ships.length, 0);
}

export function objectiveLabel(mission: MissionDef): string {
  if (mission.objective.type === "couler-elite") return `Coulez ${mission.objective.name}`;
  const n = missionEnemyCount(mission);
  return `Coulez ${n} navire${n > 1 ? "s" : ""}`;
}
