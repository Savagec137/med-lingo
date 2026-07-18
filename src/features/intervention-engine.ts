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

function randomIndex(length: number, random: () => number) {
  return Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
}

function shuffleIds(ids: string[], random: () => number) {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1, random);
    [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
  }
  return shuffled;
}

export function buildChoiceOrderByStep(
  scenario: InterventionScenario,
  random: () => number = Math.random,
) {
  const orderByStep: Record<string, string[]> = {};
  const positionCounts = new Map<string, number>();
  const recentCorrectPositions: number[] = [];

  for (const step of scenario.steps) {
    const correctChoices = step.choices.filter((choice) => choice.recommended);
    const isSingleAnswer =
      (step.format ?? "single") !== "multiple" &&
      (step.format ?? "single") !== "sequence" &&
      correctChoices.length === 1;

    if (!isSingleAnswer) {
      orderByStep[step.id] = shuffleIds(
        step.choices.map((choice) => choice.id),
        random,
      );
      continue;
    }

    const correct = correctChoices[0];
    if (!correct) throw new Error(`La question ${step.id} ne possède aucune bonne réponse.`);
    const positions = Array.from({ length: step.choices.length }, (_, index) => index);
    const forbidden =
      recentCorrectPositions.length >= 2 &&
      recentCorrectPositions.at(-1) === recentCorrectPositions.at(-2)
        ? recentCorrectPositions.at(-1)
        : undefined;
    const allowed = positions.filter((position) => position !== forbidden);
    const minimumCount = Math.min(
      ...allowed.map((position) => positionCounts.get(`${step.choices.length}:${position}`) ?? 0),
    );
    const balanced = allowed.filter(
      (position) =>
        (positionCounts.get(`${step.choices.length}:${position}`) ?? 0) === minimumCount,
    );
    const correctPosition = balanced[randomIndex(balanced.length, random)] ?? allowed[0] ?? 0;
    const distractors = shuffleIds(
      step.choices.filter((choice) => choice.id !== correct.id).map((choice) => choice.id),
      random,
    );
    distractors.splice(correctPosition, 0, correct.id);
    orderByStep[step.id] = distractors;
    positionCounts.set(
      `${step.choices.length}:${correctPosition}`,
      (positionCounts.get(`${step.choices.length}:${correctPosition}`) ?? 0) + 1,
    );
    recentCorrectPositions.push(correctPosition);
  }

  return orderByStep;
}

export function createInterventionSession(
  scenario: InterventionScenario,
  random: () => number = Math.random,
): InterventionSession {
  const firstStep = scenario.steps[0];
  if (!firstStep) throw new Error(`Le scénario ${scenario.id} ne contient aucune étape.`);

  return {
    scenarioId: scenario.id,
    status: "alert",
    currentStepId: firstStep.id,
    choiceOrderByStep: buildChoiceOrderByStep(scenario, random),
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
  const step = scenario.steps.find((item) => item.id === session.currentStepId);
  if (!step) return undefined;
  const order = session.choiceOrderByStep[step.id];
  if (!order) return step;
  const choicesById = new Map(step.choices.map((choice) => [choice.id, choice]));
  const choices = order.map((choiceId) => choicesById.get(choiceId)).filter(Boolean);
  return choices.length === step.choices.length
    ? { ...step, choices: choices as ScenarioChoice[] }
    : step;
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
  return submitInterventionAnswers(scenario, session, [choiceId]);
}

function sameChoiceSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const expected = new Set(right);
  return left.every((choiceId) => expected.has(choiceId));
}

export function isInterventionAnswerCorrect(
  step: NonNullable<ReturnType<typeof getCurrentScenarioStep>>,
  choiceIds: string[],
) {
  if (new Set(choiceIds).size !== choiceIds.length) return false;
  if (!choiceIds.every((choiceId) => step.choices.some((choice) => choice.id === choiceId)))
    return false;

  if ((step.format ?? "single") === "sequence") {
    const expected = [...step.choices]
      .sort((left, right) => (left.sequenceRank ?? 0) - (right.sequenceRank ?? 0))
      .map((choice) => choice.id);
    return (
      choiceIds.length === expected.length && choiceIds.every((id, index) => id === expected[index])
    );
  }

  const expected = step.choices.filter((choice) => choice.recommended).map((choice) => choice.id);
  return sameChoiceSet(choiceIds, expected);
}

export function submitInterventionAnswers(
  scenario: InterventionScenario,
  session: InterventionSession,
  choiceIds: string[],
): InterventionSession {
  if (session.status !== "active" || session.pendingDecision) return session;
  const step = getCurrentScenarioStep(scenario, session);
  if (!step || choiceIds.length === 0) return session;
  const selectedChoices = choiceIds
    .map((choiceId) => step.choices.find((choice) => choice.id === choiceId))
    .filter(Boolean) as ScenarioChoice[];
  if (selectedChoices.length !== choiceIds.length) return session;
  const requiredSelections = step.requiredSelections ?? 1;
  if (choiceIds.length !== requiredSelections) return session;
  const correct = isInterventionAnswerCorrect(step, choiceIds);
  const firstSelected = selectedChoices[0];
  if (!firstSelected) return session;
  const effect = correct
    ? (step.successEffect ?? firstSelected.effect)
    : (step.failureEffect ?? firstSelected.effect);
  const feedback = correct
    ? (step.successFeedback ?? firstSelected.feedback)
    : `La sélection ne respecte pas entièrement la priorité ou l'ordre attendu. ${step.priorityReminder ?? "Réévalue la chronologie et les signes de gravité."}`;

  const decision = {
    stepId: step.id,
    phase: step.phase,
    choiceId: choiceIds.join("|"),
    choiceLabel: selectedChoices.map((choice) => choice.label).join(" + "),
    selectedChoiceIds: choiceIds,
    choiceFeedbacks: step.choices.map((choice) => ({
      choiceId: choice.id,
      choiceLabel: choice.label,
      rationale: choice.rationale ?? choice.feedback,
      recommended: choice.recommended,
      selected: choiceIds.includes(choice.id),
    })),
    feedback,
    recommended: correct,
    effect,
    nextStepId: firstSelected.nextStepId ?? getDefaultNextStepId(scenario, step.id),
  };

  return {
    ...session,
    score: clamp(session.score + effect.score, 0, 100),
    patientState: clamp(session.patientState + effect.patient, 0, 100),
    simulatedTimeSeconds: Math.max(0, session.simulatedTimeSeconds + effect.timeSeconds),
    xpBonus: session.xpBonus + (effect.xpBonus ?? 0),
    rewardBonus: session.rewardBonus + (effect.rewardBonus ?? 0),
    flags: Array.from(new Set([...session.flags, ...(effect.flags ?? [])])),
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
  const succeeded = result.score >= 60;
  return {
    attempts: (previous?.attempts ?? 0) + 1,
    completed: Boolean(previous?.completed || succeeded),
    bestScore: Math.max(previous?.bestScore ?? 0, result.score),
    bestGrade: previous && previous.bestScore > result.score ? previous.bestGrade : result.grade,
    bestTimeSeconds:
      previous?.bestTimeSeconds && previous.bestTimeSeconds < result.elapsedSeconds
        ? previous.bestTimeSeconds
        : result.elapsedSeconds,
  };
}
