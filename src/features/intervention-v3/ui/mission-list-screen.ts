import { V3_SCENARIOS } from "../scenarios/v3-catalog.ts";

/**
 * L'écran de choix de mission.
 *
 * Il n'existe pas dans les maquettes, et c'est un écart assumé : la maquette du
 * débriefing porte un bouton « Choisir une autre mission » qui ne mène nulle
 * part tant qu'aucune liste n'existe. Le second scénario aurait connu le sort du
 * premier — livré, testé, et injoignable faute d'un écran pour l'ouvrir.
 *
 * Ce que la carte affiche est **ce qu'un formateur annonce avant l'exercice** :
 * la spécialité, la difficulté, la durée, l'objectif pédagogique. Rien du
 * patient : ni constante, ni motif d'appel détaillé. Le motif se découvre à
 * l'écran suivant, par la régulation, comme sur le terrain.
 */

export interface MissionCardModel {
  scenarioId: string;
  title: string;
  specialty: string;
  difficultyLabel: string;
  /** Ce que la mission apprend. Écrit dans le scénario, jamais reformulé ici. */
  objective: string;
  estimatedLabel: string;
  xp: number;
  coins: number;
}

export interface MissionListScreenModel {
  eyebrow: string;
  title: string;
  subtitle: string;
  missions: MissionCardModel[];
}

const DIFFICULTY_LABELS: Record<string, string> = {
  initiation: "Initiation",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

export function missionListScreenModel(): MissionListScreenModel {
  return {
    eyebrow: "Mode simulation",
    title: "Choisir une intervention",
    subtitle:
      "Chaque mission se joue en temps réel. Aucune donnée du patient n'est donnée d'avance : tout se mesure, se demande ou se cherche.",
    missions: V3_SCENARIOS.map((scenario) => ({
      scenarioId: scenario.id,
      title: scenario.title,
      specialty: scenario.specialty,
      difficultyLabel: DIFFICULTY_LABELS[scenario.difficulty] ?? scenario.difficulty,
      objective: scenario.learningObjective,
      estimatedLabel: `${scenario.estimatedMinutes} min`,
      xp: scenario.baseXp,
      coins: scenario.reward.coins,
    })),
  };
}
