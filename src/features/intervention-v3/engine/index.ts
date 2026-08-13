export {
  applyAction,
  type ApplyActionClassification,
  type ApplyActionResult,
} from "./apply-action.ts";
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
  advanceV3Phase,
  nextV3Phase,
  phaseAfterAction,
  transitionV3Phase,
  V3_PHASE_SEQUENCE,
  type PhaseTransitionResult,
} from "./v3-phases.ts";
export {
  graveFaultCount,
  isV3Failure,
  livesFromActionLog,
  rewardFromPerformance,
  scoreAxesFromLog,
  scoreFromActionLog,
} from "./v3-scoring.ts";
export { buildCentre15Transmission } from "./v3-transmission.ts";
export { createDebriefReport } from "./v3-debrief.ts";
