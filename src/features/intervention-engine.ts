import type {
  InterventionScenario,
  InterventionSession,
  MissionProgress,
  MissionProgressMap,
  MissionResult,
  MissionState,
  ScenarioChoice,
} from "./intervention-domain.ts";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function createInterventionSession(scenario: InterventionScenario): InterventionSession {
  const firstStep = scenario.steps[0];
  if (!firstStep) throw new Error(`Le scénario ${scenario.id} ne contient aucune étape.`);

  return {
    scenarioId: scenario.id,
    status: "alert",
    currentStepId: firstStep.id,
    visitedStepIds: [],
    score: 45,
    patientState: scenario.startingPatient,
    simulatedTimeSeconds: 0,
    xpBonus: 0,
    rewardBonus: 0,
    flags: [],
    history: [],
    pendingDecision: null,
  };
}

export function acceptInterventionMission(session: InterventionSession): InterventionSession {
  if (session.status !== "alert") return session;
  return { ...session, status: "active" };
}

export function getCurrentScenarioStep(
  scenario: InterventionScenario,
  session: InterventionSession,
) {
  return scenario.steps.find((step) => step.id === session.currentStepId);
}

function getDefaultNextStepId(scenario: InterventionScenario, currentStepId: string) {
  const index = scenario.steps.findIndex((step) => step.id === currentStepId);
  return index >= 0 ? scenario.steps[index + 1]?.id : undefined;
}

export function selectInterventionChoice(
  scenario: InterventionScenario,
  session: InterventionSession,
  choiceId: string,
): InterventionSession {
  if (session.status !== "active" || session.pendingDecision) return session;
  const step = getCurrentScenarioStep(scenario, session);
  const choice: ScenarioChoice | undefined = step?.choices.find((item) => item.id === choiceId);
  if (!step || !choice) return session;

  const decision = {
    stepId: step.id,
    phase: step.phase,
    choiceId: choice.id,
    choiceLabel: choice.label,
    feedback: choice.feedback,
    recommended: choice.recommended,
    effect: choice.effect,
    nextStepId: choice.nextStepId ?? getDefaultNextStepId(scenario, step.id),
  };

  return {
    ...session,
    score: clamp(session.score + choice.effect.score, 0, 100),
    patientState: clamp(session.patientState + choice.effect.patient, 0, 100),
    simulatedTimeSeconds: Math.max(0, session.simulatedTimeSeconds + choice.effect.timeSeconds),
    xpBonus: session.xpBonus + (choice.effect.xpBonus ?? 0),
    rewardBonus: session.rewardBonus + (choice.effect.rewardBonus ?? 0),
    flags: Array.from(new Set([...session.flags, ...(choice.effect.flags ?? [])])),
    history: [...session.history, decision],
    pendingDecision: decision,
  };
}

export function continueIntervention(scenario: InterventionScenario, session: InterventionSession) {
  if (session.status !== "active" || !session.pendingDecision) return session;
  const nextStepId = session.pendingDecision.nextStepId;

  if (!nextStepId || !scenario.steps.some((step) => step.id === nextStepId)) {
    return {
      ...session,
      status: "debrief" as const,
      visitedStepIds: Array.from(new Set([...session.visitedStepIds, session.currentStepId])),
      pendingDecision: null,
    };
  }

  return {
    ...session,
    currentStepId: nextStepId,
    visitedStepIds: Array.from(new Set([...session.visitedStepIds, session.currentStepId])),
    pendingDecision: null,
  };
}

export function gradeMission(score: number) {
  if (score >= 92) return "A+";
  if (score >= 82) return "A";
  if (score >= 72) return "B";
  if (score >= 60) return "C";
  return "D";
}

export function calculateMissionResult(
  scenario: InterventionScenario,
  session: InterventionSession,
  realElapsedSeconds = 0,
): MissionResult {
  const grade = gradeMission(session.score);
  const chest =
    scenario.reward.chest && session.score >= (scenario.reward.chestMinimumScore ?? 0)
      ? scenario.reward.chest
      : undefined;
  const badge =
    scenario.reward.badge && session.score >= (scenario.reward.badgeMinimumScore ?? 0)
      ? scenario.reward.badge
      : undefined;

  return {
    score: session.score,
    grade,
    xp: Math.max(0, scenario.baseXp + session.xpBonus + Math.round(session.score * 0.55)),
    coins: Math.max(0, scenario.reward.coins + session.rewardBonus),
    chest,
    badge,
    patientState: session.patientState,
    errors: session.history.filter((item) => item.effect.isError || !item.recommended),
    goodDecisions: session.history.filter((item) => item.recommended),
    elapsedSeconds: Math.max(0, session.simulatedTimeSeconds + realElapsedSeconds),
  };
}

export function getMissionState(
  scenario: InterventionScenario,
  progress: MissionProgressMap,
): MissionState {
  if (progress[scenario.id]?.completed) return "completed";
  if (scenario.unlockAfter && !progress[scenario.unlockAfter]?.completed) return "locked";
  return "new";
}

export function mergeMissionProgress(
  previous: MissionProgress | undefined,
  result: MissionResult,
): MissionProgress {
  return {
    attempts: (previous?.attempts ?? 0) + 1,
    completed: true,
    bestScore: Math.max(previous?.bestScore ?? 0, result.score),
    bestGrade: previous && previous.bestScore > result.score ? previous.bestGrade : result.grade,
    bestTimeSeconds:
      previous?.bestTimeSeconds && previous.bestTimeSeconds < result.elapsedSeconds
        ? previous.bestTimeSeconds
        : result.elapsedSeconds,
  };
}
