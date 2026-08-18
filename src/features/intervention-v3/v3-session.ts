/**
 * État initial d'une session V3.
 *
 * Le moteur d'exécution (`applyAction`, transitions de phase, score) n'est pas
 * dans ce module : seul l'état de départ y est défini, parce qu'il fait partie
 * du contrat de données. Une session neuve ne contient **aucun fait révélé** :
 * c'est la condition de départ que le test d'étanchéité vérifie.
 */

import { normalizeVitals } from "./clinical/intervention-vitals.ts";
import { profileFromScenario } from "./physiology/clinical-profiles.ts";
import {
  createPhysiology,
  physiologySeed,
  samplePhysiology,
} from "./physiology/physiology-engine.ts";
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
  /**
   * Sel de la graine physiologique.
   *
   * Deux sessions du même scénario et du même sel donnent **exactement** les
   * mêmes courbes : c'est ce qui rend un rejeu fidèle et un test possible. Le
   * défaut est zéro — une mission rejouée est identique tant que l'appelant ne
   * demande pas autre chose, ce qui est le comportement attendu d'un exercice.
   */
  physiologySalt?: number;
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
  const physiology = createPhysiology(
    profileFromScenario(scenario.id, scenario.clinical),
    physiologySeed(scenario.id, options.physiologySalt ?? 0),
  );

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
    // Les constantes de départ viennent du moteur physiologique, pas de la ligne
    // de base recopiée : à la seconde zéro, le patient a déjà le bruit de ses
    // capteurs. Prendre la ligne de base telle quelle donnerait un patient
    // parfaitement rond, ce qui n'existe pas.
    vitals: normalizeVitals(samplePhysiology(physiology, 0)),
    vitalsHistory: [],
    physiology,
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
