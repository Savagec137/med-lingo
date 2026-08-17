/**
 * État initial d'une session V3.
 *
 * Le moteur d'exécution (`applyAction`, transitions de phase, score) n'est pas
 * dans ce module : seul l'état de départ y est défini, parce qu'il fait partie
 * du contrat de données. Une session neuve ne contient **aucun fait révélé** :
 * c'est la condition de départ que le test d'étanchéité vérifie.
 */

import { normalizeVitals } from "./clinical/intervention-vitals.ts";
import {
  EQUIPMENT_IDS,
  V3_STARTING_LIVES,
  V3_STARTING_SCORE,
  type EquipmentId,
  type EquipmentState,
  type InterventionScenario,
  type InterventionSession,
} from "./v3-domain.ts";

export interface SessionOptions {
  /** Matériel embarqué, choisi à l'écran d'appel. Rien par défaut. */
  preparedEquipment?: readonly EquipmentId[];
}

function equipmentStates(prepared: readonly EquipmentId[]): EquipmentState[] {
  return EQUIPMENT_IDS.map((id) => ({
    id,
    prepared: prepared.includes(id),
    attached: false,
  }));
}

export function createV3Session(
  scenario: InterventionScenario,
  options: SessionOptions = {},
): InterventionSession {
  return {
    scenarioId: scenario.id,
    phase: "new_call",
    status: "briefing",
    score: V3_STARTING_SCORE,
    patientState: scenario.startingPatient,
    lives: V3_STARTING_LIVES,
    simulatedTimeSeconds: 0,
    equipment: equipmentStates(options.preparedEquipment ?? []),
    revealedFacts: {},
    actionLog: [],
    flags: [],
    vitals: normalizeVitals(scenario.clinical.baseline),
    vitalsHistory: [],
    roscAchieved: false,
    transmission: null,
    gestureRounds: scenario.gestureRounds.map((round) => ({
      ...round,
      selected: [],
      choices: [],
      refused: [],
      resolved: false,
      correct: false,
    })),
    reevaluations: [],
    xpBonus: 0,
    rewardBonus: 0,
  };
}

/** Tout le matériel embarqué. Raccourci de test, pas un défaut de jeu. */
export const ALL_EQUIPMENT: readonly EquipmentId[] = EQUIPMENT_IDS;
