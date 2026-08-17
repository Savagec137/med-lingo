/**
 * Les requêtes du moteur : tout ce qu'on peut demander, rien de ce qu'on peut
 * faire.
 *
 * La couche présentation a besoin de savoir beaucoup de choses — quels éléments
 * du bilan sont complets, quelles constantes ont vieilli, quel geste est fondé,
 * ce qu'un départ coûterait. Elle ne doit rien pouvoir déclencher.
 *
 * Ce module est la porte d'entrée qui rend les deux compatibles. Il n'expose que
 * des fonctions **sans effet** : elles prennent une vue de session et rendent une
 * réponse. Aucune ne produit de session modifiée. `selectGesture`,
 * `transmitHandover`, `applyAction`, `openReevaluation`, `validateReevaluation` et
 * `answerRegulatorQuestion` en sont volontairement absents, et ESLint interdit à
 * `ui/**` d'aller les chercher dans leurs modules d'origine.
 *
 * La séparation n'est pas décorative : un présentateur qui pourrait exécuter une
 * action finirait par en exécuter une pendant un rendu, et un rendu qui modifie
 * l'état de jeu est le genre de défaut qu'on ne trouve qu'en production.
 */

export {
  actionRefusal,
  missingEquipmentLabels,
  successfulActionIds,
  ACTION_REFUSAL_KINDS,
  type ActionRefusal,
  type ActionRefusalKind,
} from "./action-gate.ts";

export {
  calculateBilanGaps,
  equipmentBlockedFactIds,
  gapFactIdsV3,
  regulatorQuestionsForSession,
  staleFactIds,
  type BilanGap,
  type BilanGapKind,
} from "./v3-gaps.ts";

export {
  allGestureChoices,
  allRefusedGestures,
  gestureRoundOpenedAt,
  gestureRoundTimeLeft,
  isGestureJustified,
  isGestureRoundExpired,
  missingJustifications,
  GESTURE_NOT_INDICATED_FLAG,
  GESTURE_SCORES,
  GESTURE_UNJUSTIFIED_FLAG,
} from "./v3-gestures.ts";

export {
  currentReevaluation,
  missingExpectedFactIds,
  perishableExpectedFactIds,
  reevaluationStatus,
  refreshedSince,
  reinforcementStatus,
  staleExpectedFactIds,
  staleTransportPenalty,
  transportReadiness,
  REINFORCEMENT_EN_ROUTE_SECONDS,
  REINFORCEMENT_ON_SCENE_SECONDS,
  STALE_TRANSPORT_FLAG,
  type ReevaluationStatus,
  type TransportReadiness,
} from "./v3-reevaluation.ts";

export {
  handoverCommunicationScore,
  handoverItemStates,
  handoverOffers,
  regulatorQuestionsForTransmission,
  reviewAdditions,
  unansweredQuestions,
  HANDOVER_SCORES,
  MAX_ADDITION_BONUS,
  REGULATOR_ANSWER_SCORES,
  SILENT_GAP_FLAG,
  type AdditionReview,
  type HandoverFactOffer,
  type HandoverFactStatus,
  type HandoverItemOffer,
  type HandoverSelection,
} from "./v3-transmission.ts";

export { V3_PHASE_SEQUENCE, nextV3Phase } from "./v3-phases.ts";
