import type {
  InterventionPhase,
  InterventionScenario,
  InterventionSession,
  MissionResult,
  ScenarioStep,
} from "./intervention-domain.ts";
import {
  acceptInterventionMission,
  calculateMissionResult,
  continueIntervention,
  createInterventionSession,
  getCurrentScenarioStep,
  submitInterventionAnswers,
} from "./intervention-engine.ts";
import {
  applyClinicalDecision,
  applyClinicalQualityToResult,
  buildClinicalDebrief,
  createClinicalPatientState,
  reassessClinicalPatient,
} from "./intervention-clinical-engine.ts";
import type {
  ClinicalDebrief,
  ClinicalPatientState,
  ClinicalVital,
} from "./intervention-clinical-domain.ts";

export type InterventionReplayStrategy = "ideal" | "average" | "catastrophic";

export interface InterventionReplayResult {
  scenarioId: string;
  strategy: InterventionReplayStrategy;
  initialState: number;
  finalState: number;
  clinicalState: ClinicalPatientState;
  missionResult: MissionResult;
  rewardFactor: number;
  debrief: ClinicalDebrief;
  decisionCount: number;
  failureReached: boolean;
}

const AVERAGE_ERROR_PHASES = new Set<InterventionPhase>(["secondary", "debrief"]);

function correctAnswerIds(step: ScenarioStep) {
  if ((step.format ?? "single") === "sequence") {
    return [...step.choices]
      .sort((left, right) => (left.sequenceRank ?? 0) - (right.sequenceRank ?? 0))
      .map((choice) => choice.id);
  }
  return step.choices.filter((choice) => choice.recommended).map((choice) => choice.id);
}

function incorrectAnswerIds(step: ScenarioStep) {
  const correct = correctAnswerIds(step);
  if ((step.format ?? "single") === "sequence") return [...correct].reverse();

  const required = step.requiredSelections ?? 1;
  const wrong = [...step.choices]
    .filter((choice) => !choice.recommended)
    .sort((left, right) => left.effect.patient - right.effect.patient)
    .map((choice) => choice.id);
  const fallback = step.choices
    .filter((choice) => choice.recommended)
    .sort((left, right) => left.effect.patient - right.effect.patient)
    .map((choice) => choice.id);
  const selected = [...wrong, ...fallback].slice(0, required);
  if (
    selected.length !== required ||
    (selected.length === correct.length && selected.every((id) => correct.includes(id)))
  ) {
    throw new Error(`Aucun chemin incorrect testable pour ${step.id}.`);
  }
  return selected;
}

function answerIdsFor(step: ScenarioStep, strategy: InterventionReplayStrategy) {
  if (strategy === "ideal") return correctAnswerIds(step);
  if (strategy === "average" && !AVERAGE_ERROR_PHASES.has(step.phase)) {
    return correctAnswerIds(step);
  }
  return incorrectAnswerIds(step);
}

function initialTravelDelta(strategy: InterventionReplayStrategy) {
  return strategy === "ideal" ? 4 : strategy === "catastrophic" ? -3 : 0;
}

function forceClinicalDebrief(session: InterventionSession): InterventionSession {
  return { ...session, status: "debrief", pendingDecision: null };
}

export function replayInterventionScenario(
  scenario: InterventionScenario,
  strategy: InterventionReplayStrategy,
): InterventionReplayResult {
  const travelDelta = initialTravelDelta(strategy);
  let missionSession = acceptInterventionMission(createInterventionSession(scenario, () => 0.417));
  missionSession = {
    ...missionSession,
    patientState: Math.min(100, Math.max(0, missionSession.patientState + travelDelta)),
  };
  const initialState = missionSession.patientState;
  let clinicalState = createClinicalPatientState(scenario, true, initialState);
  let guard = 0;

  while (missionSession.status === "active" && guard < scenario.steps.length + 2) {
    guard += 1;
    const current = getCurrentScenarioStep(scenario, missionSession);
    if (!current) throw new Error(`Étape introuvable pendant le replay de ${scenario.id}.`);

    if (
      strategy !== "catastrophic" &&
      (current.phase === "secondary" || current.phase === "transport")
    ) {
      clinicalState = reassessClinicalPatient(
        clinicalState,
        current.phase,
        current.id,
        missionSession.history,
        true,
        missionSession.simulatedTimeSeconds,
      );
    }

    const submitted = submitInterventionAnswers(
      scenario,
      missionSession,
      answerIdsFor(current, strategy),
    );
    const decision = submitted.pendingDecision;
    if (!decision) throw new Error(`Décision non enregistrée pendant le replay de ${current.id}.`);
    clinicalState = applyClinicalDecision(
      clinicalState,
      decision,
      submitted.history,
      true,
      submitted.simulatedTimeSeconds,
    );
    const continued = continueIntervention(scenario, submitted);
    missionSession =
      clinicalState.outcome === "failed" ? forceClinicalDebrief(continued) : continued;
  }

  if (missionSession.status !== "debrief") {
    throw new Error(`Le replay ${strategy} de ${scenario.id} ne rejoint pas le débrief.`);
  }
  const baseResult = calculateMissionResult(scenario, missionSession);
  const adjusted = applyClinicalQualityToResult(baseResult, clinicalState);
  return {
    scenarioId: scenario.id,
    strategy,
    initialState,
    finalState: clinicalState.overallState,
    clinicalState,
    missionResult: adjusted.result,
    rewardFactor: adjusted.rewardFactor,
    debrief: buildClinicalDebrief(scenario, adjusted.result, clinicalState),
    decisionCount: missionSession.history.length,
    failureReached: clinicalState.outcome === "failed",
  };
}

export function isClinicalVitalWithinDisplayBounds(vital: ClinicalVital) {
  if (typeof vital.value !== "number" || !Number.isFinite(vital.value))
    return vital.status !== "measured";
  if (vital.id === "oxygen-saturation") return vital.value >= 0 && vital.value <= 100;
  if (vital.id === "glasgow") return vital.value >= 3 && vital.value <= 15;
  if (vital.id === "pain") return vital.value >= 0 && vital.value <= 10;
  if (vital.id === "blood-glucose") return vital.value >= 0;
  if (vital.id === "heart-rate") return vital.value >= 0 && vital.value <= 300;
  if (vital.id === "respiratory-rate") return vital.value >= 0 && vital.value <= 100;
  if (vital.id === "temperature") return vital.value >= 20 && vital.value <= 45;
  if (vital.id === "blood-pressure") {
    return (
      vital.value >= 0 &&
      vital.value <= 300 &&
      (vital.secondaryValue === undefined ||
        (vital.secondaryValue >= 0 && vital.secondaryValue <= 200))
    );
  }
  return true;
}

const OUT_OF_SCOPE_ACTION =
  /\b(administrer|injecter|intuber|perfuser|prescrire|sédater|sedater|réduire une fracture|poser un diagnostic)\b/i;

export function findOutOfScopeRecommendedActions(scenario: InterventionScenario) {
  return scenario.steps.flatMap((step) =>
    step.format === "error-identification"
      ? []
      : step.choices
          .filter((choice) => choice.recommended && OUT_OF_SCOPE_ACTION.test(choice.label))
          .map((choice) => ({ stepId: step.id, choiceId: choice.id, label: choice.label })),
  );
}
