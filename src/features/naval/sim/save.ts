/**
 * Sauvegarde et économie de Naval Battles.
 *
 * La sauvegarde est versionnée : toute évolution future passera par
 * `migrate` pour ne jamais perdre la progression d'un joueur. Les règles
 * économiques sont toutes ici :
 *
 * - victoire : butin des navires coulés par le joueur + prime de mission
 *   (prime complète et gemmes à la première victoire, prime de reprise ensuite) ;
 * - défaite : la moitié du butin est conservée, aucune prime ;
 * - améliorations : coût fixe par niveau, déclaré dans `upgrades.ts`.
 */

import { MISSIONS, getMission } from "./missions.ts";
import {
  UPGRADE_IDS,
  emptyUpgradeLevels,
  maxLevel,
  nextCost,
  type UpgradeId,
  type UpgradeLevels,
} from "./upgrades.ts";
import type { BattleReport } from "./world.ts";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "naval-battles.save";

export interface MissionRecord {
  wins: number;
  bestStars: number;
}

export interface NavalSave {
  version: 1;
  gold: number;
  gems: number;
  missions: Record<string, MissionRecord>;
  upgrades: UpgradeLevels;
  settings: { sound: boolean };
  stats: { battles: number; victories: number; shipsSunk: number };
}

export function newSave(): NavalSave {
  return {
    version: 1,
    gold: 0,
    gems: 0,
    missions: {},
    upgrades: emptyUpgradeLevels(),
    settings: { sound: true },
    stats: { battles: 0, victories: 0, shipsSunk: 0 },
  };
}

function nonNegInt(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Passe une sauvegarde d'une version antérieure à la version courante. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  // Version 1 = première version publiée : aucune migration pour l'instant.
  return raw;
}

/** Lit une sauvegarde en tolérant les données partielles ou corrompues. */
export function parseSave(text: string | null): NavalSave {
  if (!text) return newSave();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return newSave();
  }
  if (!isRecord(raw)) return newSave();
  const version = nonNegInt(raw.version, 1);
  if (version > SAVE_VERSION) {
    // Sauvegarde d'une version plus récente : on la lit au mieux sans la dégrader.
  }
  const data = migrate(raw);
  const save = newSave();
  save.gold = nonNegInt(data.gold);
  save.gems = nonNegInt(data.gems);
  if (isRecord(data.missions)) {
    for (const m of MISSIONS) {
      const rec = data.missions[m.id];
      if (isRecord(rec)) {
        save.missions[m.id] = {
          wins: nonNegInt(rec.wins),
          bestStars: Math.min(3, nonNegInt(rec.bestStars)),
        };
      }
    }
  }
  if (isRecord(data.upgrades)) {
    for (const id of UPGRADE_IDS) {
      save.upgrades[id] = Math.min(maxLevel(id), nonNegInt(data.upgrades[id]));
    }
  }
  if (isRecord(data.settings)) {
    save.settings.sound = data.settings.sound !== false;
  }
  if (isRecord(data.stats)) {
    save.stats.battles = nonNegInt(data.stats.battles);
    save.stats.victories = nonNegInt(data.stats.victories);
    save.stats.shipsSunk = nonNegInt(data.stats.shipsSunk);
  }
  return save;
}

export function serializeSave(save: NavalSave): string {
  return JSON.stringify(save);
}

/** Une mission est ouverte si c'est la première ou si la précédente a été gagnée. */
export function isMissionUnlocked(save: NavalSave, missionId: string): boolean {
  const index = MISSIONS.findIndex((m) => m.id === missionId);
  if (index <= 0) return index === 0;
  return (save.missions[MISSIONS[index - 1].id]?.wins ?? 0) > 0;
}

export interface RewardBreakdown {
  loot: number;
  missionGold: number;
  gems: number;
  firstClear: boolean;
  total: number;
}

export function computeRewards(save: NavalSave, report: BattleReport): RewardBreakdown {
  const mission = getMission(report.missionId);
  if (report.outcome === "defaite") {
    const loot = Math.floor(report.loot / 2);
    return { loot, missionGold: 0, gems: 0, firstClear: false, total: loot };
  }
  const firstClear = (save.missions[mission.id]?.wins ?? 0) === 0;
  const missionGold = firstClear ? mission.reward.gold : mission.replayGold;
  const gems = firstClear ? mission.reward.gems : 0;
  return { loot: report.loot, missionGold, gems, firstClear, total: report.loot + missionGold };
}

/** Applique le résultat d'une bataille (fonction pure : renvoie une nouvelle sauvegarde). */
export function applyBattle(
  save: NavalSave,
  report: BattleReport,
): { save: NavalSave; rewards: RewardBreakdown } {
  const rewards = computeRewards(save, report);
  const next: NavalSave = {
    ...save,
    missions: { ...save.missions },
    upgrades: { ...save.upgrades },
    settings: { ...save.settings },
    stats: { ...save.stats },
  };
  next.gold += rewards.total;
  next.gems += rewards.gems;
  next.stats.battles += 1;
  next.stats.shipsSunk += report.kills;
  if (report.outcome === "victoire") {
    next.stats.victories += 1;
    const prev = next.missions[report.missionId] ?? { wins: 0, bestStars: 0 };
    next.missions[report.missionId] = {
      wins: prev.wins + 1,
      bestStars: Math.max(prev.bestStars, report.stars),
    };
  }
  return { save: next, rewards };
}

export function buyUpgrade(
  save: NavalSave,
  id: UpgradeId,
): { ok: boolean; save: NavalSave; reason?: string } {
  const level = save.upgrades[id];
  const cost = nextCost(id, level);
  if (cost === null) return { ok: false, save, reason: "Niveau maximal atteint" };
  if (save.gold < cost)
    return { ok: false, save, reason: `Il manque ${cost - save.gold} pièces d'or` };
  return {
    ok: true,
    save: { ...save, gold: save.gold - cost, upgrades: { ...save.upgrades, [id]: level + 1 } },
  };
}
