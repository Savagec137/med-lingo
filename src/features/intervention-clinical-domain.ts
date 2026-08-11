import type { InterventionPhase, PatientTone } from "./intervention-domain.ts";

export type ClinicalOutcome = "unstable" | "improving" | "stabilized" | "deteriorating" | "failed";

export type ClinicalVitalId =
  | "heart-rate"
  | "blood-pressure"
  | "oxygen-saturation"
  | "respiratory-rate"
  | "temperature"
  | "glasgow"
  | "pain"
  | "blood-glucose"
  | "observation";

export type ClinicalVitalTrend = "up" | "down" | "stable" | "unknown";
export type ClinicalVitalStatus = "measured" | "qualitative" | "pending";

export interface ClinicalVital {
  id: ClinicalVitalId;
  sourceLabel: string;
  label: string;
  value: number | string;
  secondaryValue?: number;
  unit?: string;
  initialValue: number | string;
  initialSecondaryValue?: number;
  simulationTarget?: number;
  simulationTargetSecondary?: number;
  targetSourceDocument?: string;
  targetSourcePages?: string;
  tone: PatientTone;
  trend: ClinicalVitalTrend;
  status: ClinicalVitalStatus;
}

export interface ClinicalVitalChange {
  vitalId: ClinicalVitalId;
  label: string;
  before: string;
  after: string;
  trend: ClinicalVitalTrend;
}

export interface ClinicalTimelineEntry {
  id: string;
  stepId: string;
  phase: InterventionPhase;
  actionLabel: string;
  recommended: boolean;
  patientDelta: number;
  stateBefore: number;
  stateAfter: number;
  outcome: ClinicalOutcome;
  consequence: string;
  vitalChanges: ClinicalVitalChange[];
  simulatedTimeSeconds: number;
}

export interface ClinicalHandoverField {
  id: "context" | "safety" | "primary" | "vitals" | "actions" | "evolution" | "decision";
  label: string;
  complete: boolean;
  regulatorQuestion: string;
}

export interface ClinicalHandoverAssessment {
  completeness: number;
  fields: ClinicalHandoverField[];
  regulatorQuestions: string[];
  finalDecision: "transport" | "awaiting-support" | "regulation-required";
}

export interface ClinicalPatientState {
  schemaVersion: 1;
  overallState: number;
  outcome: ClinicalOutcome;
  vitals: ClinicalVital[];
  timeline: ClinicalTimelineEntry[];
  reassessmentCount: number;
  consecutiveErrors: number;
  criticalOmissions: InterventionPhase[];
  failureReason?: string;
  handover: ClinicalHandoverAssessment;
}

export interface ClinicalKnowledgeReference {
  id: string;
  knowledgeId: string;
  title: string;
  sourceDocument: string;
  sourcePages: string;
  repositoryPath: string;
  sourceUrl?: string;
  reviewStatus: "source_verified";
  phases: InterventionPhase[];
  vitalIds?: ClinicalVitalId[];
}

export interface ClinicalDebriefConsequence {
  action: string;
  consequence: string;
  outcome: ClinicalOutcome;
}

export interface ClinicalDebrief {
  outcome: ClinicalOutcome;
  outcomeLabel: string;
  successfulActions: string[];
  errors: string[];
  consequences: ClinicalDebriefConsequence[];
  pulseLessons: string[];
  knowledgeReferences: ClinicalKnowledgeReference[];
  handover: ClinicalHandoverAssessment;
  failureReason?: string;
}
