import type { InterventionSession, MissionResult, PatientTone } from "./intervention-domain.ts";

export const INTERVENTION_SHIFT_START_MINUTE = 8 * 60;
export const INTERVENTION_SHIFT_END_MINUTE = 20 * 60;
export const INTERVENTION_SHIFT_MAX_CALLS = 14;

export type InterventionShiftStatus =
  | "briefing"
  | "ringing"
  | "dispatch"
  | "travel"
  | "mission"
  | "intervention-summary"
  | "shift-summary";

export type ShiftWeather = "clear" | "rain" | "storm" | "fog" | "heat";
export type ShiftTraffic = "fluid" | "moderate" | "dense" | "blocked";
export type ShiftEnvironment =
  | "apartment"
  | "house"
  | "factory"
  | "forest"
  | "highway"
  | "school"
  | "nursing-home"
  | "station"
  | "stadium"
  | "public-space";

export type DispatchActionId = "locate" | "engage" | "question" | "advice";
export type TravelDecisionId = "update-regulation" | "wait-arrival" | "unsafe-speed";

export interface ShiftCaseTemplate {
  id: string;
  order: number;
  source: "IFA AFTRAL";
  title: string;
  specialty: string;
  mappedScenarioId?: string;
  availability: "playable" | "requires-validated-content";
  tags: string[];
}

export interface ShiftOperationalContext {
  weather: ShiftWeather;
  traffic: ShiftTraffic;
  environment: ShiftEnvironment;
  distanceKm: number;
  etaMinutes: number;
  address: string;
}

export interface ShiftDispatchRecord {
  actionId: DispatchActionId;
  sequence: number;
  scoreDelta: number;
  timeDeltaSeconds: number;
  feedback: string;
}

export interface ShiftTravelDecision {
  id: TravelDecisionId;
  scoreDelta: number;
  patientDelta: number;
  timeDeltaSeconds: number;
  feedback: string;
}

export interface DynamicShiftCall {
  id: string;
  index: number;
  scenarioId: string;
  caseTemplateId?: string;
  title: string;
  specialty: string;
  callerQuote: string;
  patientLabel: string;
  reason: string;
  priority: string;
  receivedAtMinute: number;
  context: ShiftOperationalContext;
  dispatchRecords: ShiftDispatchRecord[];
  travelUpdate: string;
  travelDecision?: ShiftTravelDecision;
  missionSession?: InterventionSession;
  missionStartedAtMs?: number;
  missionElapsedSeconds?: number;
}

export interface ShiftCompletedIntervention {
  callId: string;
  scenarioId: string;
  caseTemplateId?: string;
  title: string;
  specialty: string;
  patientCount: number;
  score: number;
  grade: string;
  xp: number;
  coins: number;
  chest?: string;
  badge?: string;
  correctDecisions: number;
  totalDecisions: number;
  elapsedSeconds: number;
  completedAtMinute: number;
}

export interface InterventionShiftStats {
  interventions: number;
  patients: number;
  cardiacArrests: number;
  traumas: number;
  strokes: number;
  births: number;
  correctDecisions: number;
  totalDecisions: number;
  totalResponseMinutes: number;
  xp: number;
  coins: number;
  chests: number;
}

export interface InterventionShiftSession {
  schemaVersion: 1;
  id: string;
  seed: string;
  status: InterventionShiftStatus;
  roleScope: "hybrid-training";
  startMinute: number;
  endMinute: number;
  currentMinute: number;
  vigilance: number;
  operationalScore: number;
  vehicleReady: boolean;
  radioConnected: boolean;
  crewComplete: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  activeCall?: DynamicShiftCall;
  completedInterventions: ShiftCompletedIntervention[];
  usedScenarioIds: string[];
  stats: InterventionShiftStats;
  lastResult?: MissionResult;
}

export interface ShiftVitalDisplay {
  label: "SpO₂" | "TA" | "FC" | "FR" | "Glasgow" | "Douleur";
  value: string;
  tone: PatientTone;
  trend: "up" | "down" | "stable" | "unknown";
}

export interface ShiftSummary {
  durationMinutes: number;
  accuracy: number;
  averageResponseMinutes: number;
  grade: string;
  rank: string;
}

export const EMPTY_SHIFT_STATS: InterventionShiftStats = {
  interventions: 0,
  patients: 0,
  cardiacArrests: 0,
  traumas: 0,
  strokes: 0,
  births: 0,
  correctDecisions: 0,
  totalDecisions: 0,
  totalResponseMinutes: 0,
  xp: 0,
  coins: 0,
  chests: 0,
};
