export const INTERVENTION_PHASES = [
  "arrival",
  "safety",
  "primary",
  "secondary",
  "care",
  "decision",
  "transport",
  "debrief",
] as const;

export type InterventionPhase = (typeof INTERVENTION_PHASES)[number];
export type MissionDifficulty = "initiation" | "intermediate" | "advanced";
export type MissionDifficultyStars = 1 | 2 | 3 | 4 | 5;
export type MissionState = "new" | "completed" | "locked";
export type PatientTone = "stable" | "watch" | "critical";
export type InterventionQuestionFormat =
  | "single"
  | "multiple"
  | "sequence"
  | "contextual-true-false"
  | "equipment"
  | "association"
  | "error-identification"
  | "regulatory"
  | "handover";
export type DistractorKind =
  | "frequent-error"
  | "wrong-timing"
  | "secondary-priority"
  | "sign-misinterpretation"
  | "other-context";
export type ScenarioIllustration =
  | "general"
  | "cardiac"
  | "respiratory"
  | "neurology"
  | "metabolic"
  | "trauma"
  | "allergy"
  | "pediatric"
  | "maternity"
  | "toxicology"
  | "complex";

export interface MissionReward {
  coins: number;
  chest?: string;
  chestMinimumScore?: number;
  badge?: string;
  badgeMinimumScore?: number;
}

export interface MissionAlert {
  patient: string;
  age?: string;
  reason: string;
  priority: string;
  distance: string;
  location: string;
  time: string;
  elapsed?: string;
  dispatchNote: string;
}

export interface PatientVital {
  label: string;
  value: string;
  tone?: PatientTone;
}

export interface PatientSnapshot {
  label: string;
  detail: string;
  tone: PatientTone;
  vitals: PatientVital[];
}

export interface DecisionEffect {
  score: number;
  patient: number;
  timeSeconds: number;
  xpBonus?: number;
  rewardBonus?: number;
  flags?: string[];
  isError?: boolean;
}

export interface ScenarioChoice {
  id: string;
  label: string;
  detail: string;
  feedback: string;
  rationale?: string;
  distractorKind?: DistractorKind;
  sequenceRank?: number;
  recommended: boolean;
  nextStepId?: string;
  effect: DecisionEffect;
}

export interface ScenarioStep {
  id: string;
  phase: InterventionPhase;
  eyebrow: string;
  title: string;
  narrative: string;
  objective: string;
  question?: string;
  format?: InterventionQuestionFormat;
  requiredSelections?: number;
  successFeedback?: string;
  priorityReminder?: string;
  successEffect?: DecisionEffect;
  failureEffect?: DecisionEffect;
  patient: PatientSnapshot;
  choices: ScenarioChoice[];
}

export interface InterventionScenario {
  id: string;
  specialty: string;
  title: string;
  summary: string;
  difficulty: MissionDifficulty;
  difficultyStars?: MissionDifficultyStars;
  minimumLevel?: number;
  estimatedMinutes: number;
  baseXp: number;
  illustration: ScenarioIllustration;
  unlockAfter?: string;
  alert: MissionAlert;
  reward: MissionReward;
  startingPatient: number;
  pulseAdvice: string[];
  steps: ScenarioStep[];
}

export interface DecisionRecord {
  stepId: string;
  phase: InterventionPhase;
  choiceId: string;
  choiceLabel: string;
  selectedChoiceIds?: string[];
  choiceFeedbacks?: Array<{
    choiceId: string;
    choiceLabel: string;
    rationale: string;
    recommended: boolean;
    selected: boolean;
  }>;
  feedback: string;
  recommended: boolean;
  effect: DecisionEffect;
  nextStepId?: string;
}

export interface InterventionSession {
  scenarioId: string;
  status: "alert" | "active" | "debrief";
  currentStepId: string;
  choiceOrderByStep: Record<string, string[]>;
  visitedStepIds: string[];
  score: number;
  patientState: number;
  simulatedTimeSeconds: number;
  xpBonus: number;
  rewardBonus: number;
  flags: string[];
  history: DecisionRecord[];
  pendingDecision: DecisionRecord | null;
}

export interface MissionProgress {
  attempts: number;
  completed: boolean;
  bestScore: number;
  bestGrade: string;
  bestTimeSeconds: number;
}

export type MissionProgressMap = Record<string, MissionProgress>;

export interface MissionResult {
  score: number;
  grade: string;
  xp: number;
  coins: number;
  chest?: string;
  badge?: string;
  patientState: number;
  errors: DecisionRecord[];
  goodDecisions: DecisionRecord[];
  elapsedSeconds: number;
}

export const PHASE_LABELS: Record<InterventionPhase, string> = {
  arrival: "Arrivée",
  safety: "Sécurisation",
  primary: "Bilan primaire",
  secondary: "Bilan secondaire",
  care: "Gestes",
  decision: "Décision",
  transport: "Transport",
  debrief: "Débriefing",
};

export const DIFFICULTY_LABELS: Record<MissionDifficulty, string> = {
  initiation: "Initiation",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};
