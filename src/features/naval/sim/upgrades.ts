/**
 * Arsenal : améliorations des armes et du navire du joueur.
 *
 * Chaque niveau a un coût en or explicite ; l'effet est calculé ici et
 * appliqué au galion au début de chaque bataille (aucune valeur cachée).
 */

import { SHIP_CLASSES } from "./defs.ts";

export type UpgradeId =
  "calibre" | "cadence" | "portee" | "pointage" | "coque" | "poudre" | "charpentiers";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  costs: readonly number[];
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: "calibre",
    name: "Gros calibre",
    description: "+10 % de dégâts par boulet et par niveau.",
    costs: [150, 300, 500, 750, 1050],
  },
  {
    id: "cadence",
    name: "Servants aguerris",
    description: "−7 % de temps de rechargement par niveau.",
    costs: [150, 300, 500, 750, 1050],
  },
  {
    id: "portee",
    name: "Hausse de bronze",
    description: "+8 % de portée par niveau.",
    costs: [200, 400, 650, 950],
  },
  {
    id: "pointage",
    name: "Maîtres pointeurs",
    description: "−12 % de dispersion des tirs par niveau.",
    costs: [180, 360, 600, 900],
  },
  {
    id: "coque",
    name: "Bordé de chêne",
    description: "+12 % de coque et +8 % de voilure par niveau.",
    costs: [200, 380, 600, 880, 1200],
  },
  {
    id: "poudre",
    name: "Soute à poudre",
    description: "+2 boulets incendiaires par bataille et par niveau.",
    costs: [180, 380, 650],
  },
  {
    id: "charpentiers",
    name: "Charpentiers",
    description: "+1 trousse de réparation par bataille et par niveau.",
    costs: [250, 500, 850],
  },
];

export const UPGRADE_IDS: readonly UpgradeId[] = UPGRADES.map((u) => u.id);

export type UpgradeLevels = Record<UpgradeId, number>;

export function emptyUpgradeLevels(): UpgradeLevels {
  return {
    calibre: 0,
    cadence: 0,
    portee: 0,
    pointage: 0,
    coque: 0,
    poudre: 0,
    charpentiers: 0,
  };
}

export function getUpgrade(id: UpgradeId): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`Amélioration inconnue : ${id}`);
  return def;
}

export function maxLevel(id: UpgradeId): number {
  return getUpgrade(id).costs.length;
}

/** Coût du prochain niveau, ou null si le maximum est atteint. */
export function nextCost(id: UpgradeId, level: number): number | null {
  const costs = getUpgrade(id).costs;
  return level < costs.length ? costs[level] : null;
}

export interface PlayerLoadout {
  hull: number;
  sails: number;
  cannons: number;
  gunDamage: number;
  reload: number;
  range: number;
  spread: number;
  fireStock: number;
  repairKits: number;
}

export const BASE_FIRE_STOCK = 4;
export const BASE_REPAIR_KITS = 2;

export function buildLoadout(levels: UpgradeLevels): PlayerLoadout {
  const base = SHIP_CLASSES.galion;
  return {
    hull: Math.round(base.hull * (1 + 0.12 * levels.coque)),
    sails: Math.round(base.sails * (1 + 0.08 * levels.coque)),
    cannons: base.cannons,
    gunDamage: base.gunDamage * (1 + 0.1 * levels.calibre),
    reload: base.reload * (1 - 0.07 * levels.cadence),
    range: base.range * (1 + 0.08 * levels.portee),
    spread: base.spread * (1 - 0.12 * levels.pointage),
    fireStock: BASE_FIRE_STOCK + 2 * levels.poudre,
    repairKits: BASE_REPAIR_KITS + levels.charpentiers,
  };
}

/** Valeur lisible de la caractéristique touchée par une amélioration, à un niveau donné. */
export function describeLevel(id: UpgradeId, level: number): string {
  const levels = { ...emptyUpgradeLevels(), [id]: level };
  const l = buildLoadout(levels);
  switch (id) {
    case "calibre":
      return `${l.gunDamage.toFixed(1)} dégâts/boulet`;
    case "cadence":
      return `${l.reload.toFixed(2)} s par bordée`;
    case "portee":
      return `${Math.round(l.range)} m de portée`;
    case "pointage":
      return `±${((l.spread * 180) / Math.PI).toFixed(2)}° de dispersion`;
    case "coque":
      return `${l.hull} coque · ${l.sails} voiles`;
    case "poudre":
      return `${l.fireStock} boulets incendiaires`;
    case "charpentiers":
      return `${l.repairKits} trousses de réparation`;
  }
}
