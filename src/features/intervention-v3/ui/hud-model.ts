import type { InterventionSessionView } from "../v3-domain.ts";

/**
 * Le bandeau supérieur des maquettes du Mode Intervention V3.
 *
 * Les cinq maquettes ne portent pas le même bandeau, et la consigne est d'y
 * rester fidèle écran par écran. Il y a **quatre** dispositions distinctes pour
 * cinq maquettes : « Constantes en direct » et « Appel au 15 » partagent la
 * même. Ce module les décrit sans en inventer une cinquième.
 *
 * Aucune valeur n'est fabriquée ici : les vies viennent de la session, le reste
 * du profil joueur passé en argument. Une maquette montre `2 450` pièces parce
 * que le profil en portait 2 450, pas parce que le nombre est écrit dans le code.
 */

/** Disposition du bandeau, une par maquette distincte. */
export const HUD_VARIANTS = ["dispatch", "field", "monitoring", "critical"] as const;
export type HudVariant = (typeof HUD_VARIANTS)[number];

/** Ce que l'écran affiche du joueur, hors session clinique. */
export interface PlayerHud {
  /** Pièces détenues. */
  coins: number;
  /** Niveau courant. */
  level: number;
  /** XP acquise dans le niveau courant. */
  xp: number;
  /** XP nécessaire pour passer au niveau suivant. */
  xpToNextLevel: number;
  /** Vies maximales du joueur, pour l'affichage « 5/5 ». */
  maxLives: number;
  /** Horodatage affiché par les maquettes qui portent une heure. */
  clock: string;
  /** Pastille de date des maquettes qui en portent une : « MAR 13 ». */
  dateChip: string;
  /** Avatar en ligne, point vert de la maquette 1. */
  online: boolean;
}

/** Un emplacement du bandeau, dans l'ordre de gauche à droite de la maquette. */
export type HudSlot =
  | { kind: "menu" }
  | { kind: "logo"; label: "MEDOCA" }
  | { kind: "date"; value: string }
  | { kind: "clock"; value: string }
  | { kind: "coins"; value: number; caption: string | null }
  | { kind: "lives"; value: number; max: number | null; caption: string | null }
  | { kind: "level"; value: number; caption: string; xp: number; xpToNextLevel: number }
  | { kind: "avatar"; badgeLevel: number | null; online: boolean };

export interface HudModel {
  variant: HudVariant;
  slots: HudSlot[];
}

/**
 * Bandeau d'un écran donné.
 *
 * `session` fournit les vies restantes — c'est la seule donnée du bandeau que la
 * partie en cours fait varier.
 */
export function hudModel(
  session: InterventionSessionView,
  variant: HudVariant,
  player: PlayerHud,
): HudModel {
  const lives = session.lives;

  switch (variant) {
    // Maquette 1 — Nouvel appel : pastille de date, pièces, vies « 5/5 Vies »,
    // niveau avec barre d'XP, avatar avec point de présence. Pas de logo.
    case "dispatch":
      return {
        variant,
        slots: [
          { kind: "date", value: player.dateChip },
          { kind: "coins", value: player.coins, caption: null },
          { kind: "lives", value: lives, max: player.maxLives, caption: "Vies" },
          {
            kind: "level",
            value: player.level,
            caption: "XP",
            xp: player.xp,
            xpToNextLevel: player.xpToNextLevel,
          },
          { kind: "avatar", badgeLevel: null, online: player.online },
        ],
      };

    // Maquette 2 — Arrivée sur les lieux : menu, vies, logo centré, pièces,
    // avatar portant le niveau en pastille. Ni heure ni barre d'XP.
    case "field":
      return {
        variant,
        slots: [
          { kind: "menu" },
          { kind: "lives", value: lives, max: player.maxLives, caption: "Vies" },
          { kind: "logo", label: "MEDOCA" },
          { kind: "coins", value: player.coins, caption: "Pièces" },
          { kind: "avatar", badgeLevel: player.level, online: false },
        ],
      };

    // Maquettes 3 et 4 — Constantes en direct et Appel au 15 : heure, vies,
    // pièces, logo, « Niveau N » avec barre d'XP, avatar avec pastille.
    case "monitoring":
      return {
        variant,
        slots: [
          { kind: "clock", value: player.clock },
          { kind: "lives", value: lives, max: player.maxLives, caption: "Vies" },
          { kind: "coins", value: player.coins, caption: "Pièces" },
          { kind: "logo", label: "MEDOCA" },
          {
            kind: "level",
            value: player.level,
            caption: "Niveau",
            xp: player.xp,
            xpToNextLevel: player.xpToNextLevel,
          },
          { kind: "avatar", badgeLevel: player.level, online: false },
        ],
      };

    // Maquette 5 — Gestes prioritaires : heure, vies **sans total ni libellé**,
    // pièces sans libellé, logo, « NIVEAU N » avec barre, avatar, puis menu à
    // droite. C'est le seul écran où le menu est en fin de bandeau.
    case "critical":
      return {
        variant,
        slots: [
          { kind: "clock", value: player.clock },
          { kind: "lives", value: lives, max: null, caption: null },
          { kind: "coins", value: player.coins, caption: null },
          { kind: "logo", label: "MEDOCA" },
          {
            kind: "level",
            value: player.level,
            caption: "NIVEAU",
            xp: player.xp,
            xpToNextLevel: player.xpToNextLevel,
          },
          { kind: "avatar", badgeLevel: null, online: false },
          { kind: "menu" },
        ],
      };
  }
}

/** Part d'XP acquise dans le niveau, bornée à [0, 1] pour la barre. */
export function xpProgress(player: Pick<PlayerHud, "xp" | "xpToNextLevel">): number {
  if (player.xpToNextLevel <= 0) return 0;
  const ratio = player.xp / player.xpToNextLevel;
  return Math.min(1, Math.max(0, ratio));
}
