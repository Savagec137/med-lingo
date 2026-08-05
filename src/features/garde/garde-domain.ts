export const GARDE_PHASES = [
  "dispatch",
  "transit",
  "abcde",
  "vitals",
  "interrogation",
  "gestures",
  "regulation",
  "decision",
] as const;

export type GardePhase = (typeof GARDE_PHASES)[number];

export const GARDE_PHASE_LABELS: Record<GardePhase, string> = {
  dispatch: "Régulation",
  transit: "Trajet",
  abcde: "ABCDE",
  vitals: "Constantes",
  interrogation: "Interrogatoire",
  gestures: "Gestes",
  regulation: "Bilan médecin",
  decision: "Décision",
};

export type GardeStatus = "briefing" | "call" | "running" | "case-debrief" | "shift-report";

export interface Vitals {
  spo2: number;
  sbp: number;
  hr: number;
  rr: number;
  gcs: number;
  pain: number;
  glycemia: number;
}

export interface GardeOption {
  id: string;
  label: string;
  correct: boolean;
  note: string;
}

export interface GardeQuestion {
  phase: GardePhase;
  eyebrow: string;
  title: string;
  prompt: string;
  multiple: boolean;
  options: GardeOption[];
  timeCostMinutes: number;
}

export interface GardeCase {
  id: string;
  pathologyId: string;
  pathologyLabel: string;
  family: "medical" | "trauma" | "cardiac" | "neuro" | "respiratory" | "obstetric";
  callerLine: string;
  reason: string;
  priority: "P0" | "P1" | "P2";
  patientLabel: string;
  age: number;
  sex: "Homme" | "Femme";
  antecedents: string[];
  environment: string;
  weather: string;
  trafficLabel: string;
  distanceKm: number;
  etaMinutes: number;
  transitEvent: string;
  vitals: Vitals;
  questions: GardeQuestion[];
  isCardiacArrest: boolean;
  isBirth: boolean;
}

export interface GardeAnswer {
  phase: GardePhase;
  selectedIds: string[];
  hits: number;
  misses: number;
  wrong: number;
  accuracy: number;
  vitalsAfter: Vitals;
}

export interface GardeCaseResult {
  caseId: string;
  pathologyLabel: string;
  accuracy: number;
  durationMinutes: number;
  patientStable: boolean;
  xp: number;
}

export interface GardeState {
  status: GardeStatus;
  clockMinutes: number;
  fatigue: number;
  interventions: number;
  patients: number;
  arrests: number;
  traumas: number;
  strokes: number;
  births: number;
  totalXp: number;
  totalMinutes: number;
  decisionsTotal: number;
  decisionsCorrect: number;
  currentCase: GardeCase | null;
  questionIndex: number;
  vitals: Vitals;
  caseStartClock: number;
  answers: GardeAnswer[];
  lastAnswer: GardeAnswer | null;
  results: GardeCaseResult[];
  log: string[];
}

export const SHIFT_START_MINUTES = 8 * 60;
export const SHIFT_END_MINUTES = 20 * 60;
export const MAX_INTERVENTIONS = 14;

export function formatClock(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
