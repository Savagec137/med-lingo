import { generateGardeCase } from "./garde-case-generator";
import { detectVitalAlerts, evolveVitals } from "./garde-vitals";
import {
  MAX_INTERVENTIONS,
  SHIFT_END_MINUTES,
  SHIFT_START_MINUTES,
  type GardeAnswer,
  type GardeCase,
  type GardeState,
  type Vitals,
} from "./garde-domain";

const STABLE_VITALS: Vitals = {
  spo2: 97,
  sbp: 125,
  hr: 82,
  rr: 16,
  gcs: 15,
  pain: 2,
  glycemia: 5.5,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}


export function createGardeState(): GardeState {
  return {
    status: "briefing",
    clockMinutes: SHIFT_START_MINUTES,
    fatigue: 100,
    interventions: 0,
    patients: 0,
    arrests: 0,
    traumas: 0,
    strokes: 0,
    births: 0,
    totalXp: 0,
    totalMinutes: 0,
    decisionsTotal: 0,
    decisionsCorrect: 0,
    currentCase: null,
    questionIndex: 0,
    vitals: STABLE_VITALS,
    caseStartClock: SHIFT_START_MINUTES,
    answers: [],
    lastAnswer: null,
    results: [],
    log: [],
  };
}

function nextCase(state: GardeState): GardeState {
  const generated = generateGardeCase(state.clockMinutes, state.interventions + 1);
  return {
    ...state,
    status: "call",
    currentCase: generated,
    questionIndex: 0,
    vitals: generated.vitals,
    caseStartClock: state.clockMinutes,
    answers: [],
    lastAnswer: null,
  };
}

export function startShift(state: GardeState): GardeState {
  return nextCase({ ...state, clockMinutes: SHIFT_START_MINUTES });
}

export function acceptCall(state: GardeState): GardeState {
  return { ...state, status: "running" };
}

export function answerQuestion(state: GardeState, selectedIds: string[]): GardeState {
  const current = state.currentCase;
  const question = current?.questions[state.questionIndex];
  if (!current || !question) return state;

  const correctIds = question.options.filter((option) => option.correct).map((o) => o.id);
  const hits = selectedIds.filter((id) => correctIds.includes(id)).length;
  const wrong = selectedIds.filter((id) => !correctIds.includes(id)).length;
  const misses = correctIds.length - hits;
  const accuracy = clamp((hits - wrong * 0.5) / Math.max(1, correctIds.length), 0, 1);

  const vitalsAfter = evolveVitals(state.vitals, current, accuracy, question.timeCostMinutes);
  const alerts = detectVitalAlerts(state.vitals, vitalsAfter);
  const answer: GardeAnswer = {
    phase: question.phase,
    selectedIds,
    hits,
    misses,
    wrong,
    accuracy,
    vitalsAfter,
    alerts,
  };

  return {
    ...state,
    vitals: vitalsAfter,
    clockMinutes: state.clockMinutes + question.timeCostMinutes,
    fatigue: clamp(state.fatigue - 1, 20, 100),
    decisionsTotal: state.decisionsTotal + 1,
    decisionsCorrect: state.decisionsCorrect + (accuracy >= 0.75 ? 1 : 0),
    answers: [...state.answers, answer],
    lastAnswer: answer,
  };
}

function closeCase(state: GardeState, current: GardeCase): GardeState {
  const accuracy =
    state.answers.reduce((sum, answer) => sum + answer.accuracy, 0) /
    Math.max(1, state.answers.length);
  const durationMinutes = state.clockMinutes - state.caseStartClock;
  const patientStable = current.isCardiacArrest
    ? accuracy >= 0.75
    : state.vitals.gcs >= 12 && state.vitals.spo2 >= 92 && state.vitals.sbp >= 95;
  const xp = Math.round(30 + accuracy * 70 + (patientStable ? 20 : 0));

  return {
    ...state,
    status: "case-debrief",
    fatigue: clamp(state.fatigue - 4, 20, 100),
    interventions: state.interventions + 1,
    patients: state.patients + (current.isBirth ? 2 : 1),
    arrests: state.arrests + (current.isCardiacArrest ? 1 : 0),
    traumas: state.traumas + (current.family === "trauma" ? 1 : 0),
    strokes: state.strokes + (current.pathologyId === "avc" ? 1 : 0),
    births: state.births + (current.isBirth ? 1 : 0),
    totalXp: state.totalXp + xp,
    totalMinutes: state.totalMinutes + durationMinutes,
    results: [
      ...state.results,
      {
        caseId: current.id,
        pathologyLabel: current.pathologyLabel,
        accuracy,
        durationMinutes,
        patientStable,
        xp,
      },
    ],
    log: [
      ...state.log,
      `${current.pathologyLabel} — ${Math.round(accuracy * 100)} % de décisions justes`,
    ],
  };
}

export function nextQuestion(state: GardeState): GardeState {
  const current = state.currentCase;
  if (!current) return state;
  const upcoming = state.questionIndex + 1;
  if (upcoming >= current.questions.length) return closeCase(state, current);
  return { ...state, questionIndex: upcoming, lastAnswer: null };
}

export function nextIntervention(state: GardeState): GardeState {
  const shiftOver =
    state.clockMinutes >= SHIFT_END_MINUTES || state.interventions >= MAX_INTERVENTIONS;
  if (shiftOver) return { ...state, status: "shift-report", currentCase: null };
  return nextCase(state);
}

export function endShift(state: GardeState): GardeState {
  return { ...state, status: "shift-report", currentCase: null };
}

export function gradeLabel(accuracyPercent: number): string {
  if (accuracyPercent >= 92) return "Ambulancier confirmé";
  if (accuracyPercent >= 80) return "Équipier aguerri";
  if (accuracyPercent >= 65) return "Équipier opérationnel";
  return "Équipier en formation";
}
