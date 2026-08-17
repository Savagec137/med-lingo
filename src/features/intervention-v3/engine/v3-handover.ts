/**
 * Transmettre le bilan : la composition de l'action et de la sélection.
 *
 * Ce module existe pour une raison précise, et non par goût du découpage.
 * `apply-action` construit la transmission par défaut, et la transmission
 * choisie par le joueur a besoin d'`applyAction` pour la mécanique de l'action —
 * temps consommé, passage de phase, sanction des trous du bilan. Les deux dans un
 * même fichier formeraient un cycle d'imports. La composition vit donc ici, et
 * les deux modules qu'elle assemble s'ignorent.
 */

import type {
  Centre15Transmission,
  HandoverItemState,
  InterventionScenario,
  InterventionSession,
  RegulatorQuestion,
} from "../v3-domain.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { applyAction } from "./apply-action.ts";
import { resolveGestureRound, type GestureRoundResolution } from "./v3-gestures.ts";
import {
  handoverCommunicationScore,
  handoverItemStates,
  regulatorQuestionsForTransmission,
  reviewAdditions,
  DIAGNOSTIC_FORMULATION_FLAG,
  HANDOVER_SCORES,
  MAX_ADDITION_BONUS,
  SILENT_GAP_FLAG,
  type HandoverSelection,
} from "./v3-transmission.ts";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const itemIdsInState = (
  scenario: InterventionScenario,
  states: Record<string, HandoverItemState>,
  state: HandoverItemState,
): string[] =>
  scenario.handoverItems
    .filter((item) => item.expected && states[item.id] === state)
    .map((item) => item.id);

export interface TransmissionResult {
  session: InterventionSession;
  /** Nul si la transmission a été refusée par les barrières de l'action. */
  transmission: Centre15Transmission | null;
  refusalReason: string | null;
  /** Points de la communication seule, hors trous du bilan. */
  communicationScore: number;
  /** Éléments attendus que le joueur possédait et n'a pas transmis. */
  omitted: string[];
  /** Éléments attendus manquants et passés sous silence. Le plus grave. */
  silentGaps: string[];
  /** Éléments attendus dont le manque a été annoncé. */
  disclosed: string[];
  /** Questions que le régulateur pose en retour. */
  questions: RegulatorQuestion[];
  /** Formulations diagnostiques refusées, avec leur nature de faute. */
  rejectedAdditions: string[];
}

/**
 * Transmet le bilan sélectionné par le joueur.
 *
 * La mécanique de l'action — barrières dures, temps consommé, passage à la phase
 * suivante, sanction des trous du bilan — reste celle de `applyAction` : elle
 * n'est pas réécrite ici. Ce module ajoute par-dessus ce qu'`applyAction` ne peut
 * pas savoir, à savoir ce que le joueur a choisi de dire.
 */
export function transmitHandover(
  session: InterventionSession,
  selection: HandoverSelection,
): TransmissionResult {
  const scenario = getV3Scenario(session.scenarioId);
  const applied = applyAction(session, "action.transmettre-bilan");
  if (applied.classification === "impossible") {
    return {
      session: applied.session,
      transmission: null,
      refusalReason: applied.reason ?? "Transmission impossible.",
      communicationScore: 0,
      omitted: [],
      silentGaps: [],
      disclosed: [],
      questions: [],
      rejectedAdditions: [],
    };
  }

  // Les états sont calculés sur la session **d'avant** l'action : la transmission
  // rapporte ce que le joueur savait en décrochant, pas ce que les quatre-vingt-dix
  // secondes de l'appel auraient fait vieillir entre-temps.
  const states = handoverItemStates(session, scenario, selection.itemIds);
  const review = reviewAdditions(scenario, selection.additions ?? []);
  const questions = regulatorQuestionsForTransmission(session, scenario, states);

  const additionBonus = Math.min(
    MAX_ADDITION_BONUS,
    review.accepted.length * HANDOVER_SCORES.relevantAddition,
  );
  const communicationScore = handoverCommunicationScore(scenario, states) + additionBonus;
  const silentGaps = itemIdsInState(scenario, states, "silent_gap");

  const flags = new Set(applied.session.flags);
  if (silentGaps.length > 0) flags.add(SILENT_GAP_FLAG);
  if (review.rejected.length > 0) flags.add(DIAGNOSTIC_FORMULATION_FLAG);

  const transmission: Centre15Transmission = {
    startedAtSeconds: session.simulatedTimeSeconds,
    durationSeconds: 90,
    selection: [...selection.itemIds],
    itemStates: states,
    questionsAsked: questions.map((question) => question.id),
    answers: {},
    instruction: scenario.regulatorInstruction,
    freeAdditions: review.accepted,
    rejectedAdditions: review.rejected,
  };

  return {
    session: {
      ...applied.session,
      score: clamp(applied.session.score + communicationScore, 0, 100),
      flags: [...flags],
      transmission,
    },
    transmission,
    refusalReason: null,
    communicationScore,
    omitted: itemIdsInState(scenario, states, "omitted"),
    silentGaps,
    disclosed: itemIdsInState(scenario, states, "disclosed_missing"),
    questions,
    rejectedAdditions: review.rejected,
  };
}

/* -------------------------------------------------------------------------- */
/* Valider le tour de gestes                                                  */
/* -------------------------------------------------------------------------- */

export interface GestureCommitResult {
  session: InterventionSession;
  resolution: GestureRoundResolution;
  refusalReason: string | null;
}

/**
 * Valide le tour de gestes et fait avancer la mission.
 *
 * Deux mécanismes distincts existaient sans être reliés : `resolveGestureRound`
 * marquait le tour clos, et l'action `action.choisir-gestes-prioritaires` faisait
 * passer à la réévaluation. Une interface pouvait donc appeler l'une sans l'autre
 * — clore un tour sans avancer, ou avancer sans clore. Les deux ne forment plus
 * qu'un seul geste, comme la transmission plus haut, et pour la même raison : ce
 * qui doit arriver ensemble ne doit pas pouvoir arriver séparément.
 */
export function commitGestureRound(
  session: InterventionSession,
  roundId: string,
): GestureCommitResult {
  const applied = applyAction(session, "action.choisir-gestes-prioritaires");
  if (applied.classification === "impossible") {
    return {
      session: applied.session,
      resolution: resolveGestureRound(session, roundId),
      refusalReason: applied.reason ?? "Validation impossible.",
    };
  }
  // L'action a fait avancer la phase ; la résolution est calculée sur la session
  // d'avant, pour que le jugement des gestes porte sur l'état où ils ont été
  // choisis et non sur celui que la validation vient de produire.
  const resolution = resolveGestureRound(applied.session, roundId);
  return { session: resolution.session, resolution, refusalReason: null };
}
