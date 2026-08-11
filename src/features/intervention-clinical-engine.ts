import type {
  DecisionRecord,
  InterventionPhase,
  InterventionScenario,
  MissionResult,
  PatientVital,
} from "./intervention-domain.ts";
import type {
  ClinicalDebrief,
  ClinicalHandoverAssessment,
  ClinicalHandoverField,
  ClinicalOutcome,
  ClinicalPatientState,
  ClinicalTimelineEntry,
  ClinicalVital,
  ClinicalVitalChange,
  ClinicalVitalId,
  ClinicalVitalTrend,
} from "./intervention-clinical-domain.ts";
import { getClinicalReferences } from "./intervention-clinical-sources.ts";

const CRITICAL_PHASES = new Set<InterventionPhase>([
  "safety",
  "primary",
  "care",
  "decision",
  "transport",
]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundOne = (value: number) => Math.round(value * 10) / 10;

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (digit) => String("₀₁₂₃₄₅₆₇₈₉".indexOf(digit)))
    .toLocaleLowerCase("fr");
}

function firstNumber(value: string) {
  const match = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function vitalDefinition(vital: PatientVital): {
  id: ClinicalVitalId;
  label: string;
  unit?: string;
  value?: number;
  secondaryValue?: number;
} {
  const label = normalizeLabel(vital.label);
  const numeric = firstNumber(vital.value);

  if (label === "ta" || label.includes("tension") || label.includes("pression arterielle")) {
    const [systolic, diastolic] = vital.value.split("/").map((part) => firstNumber(part));
    return {
      id: "blood-pressure",
      label: "TA",
      unit: "mmHg",
      value: systolic,
      secondaryValue: diastolic,
    };
  }
  if (label === "fc" || label.includes("pouls") || label.includes("frequence cardiaque")) {
    return { id: "heart-rate", label: "FC", unit: "/min", value: numeric };
  }
  if (label === "fr" || label.includes("frequence respiratoire")) {
    return { id: "respiratory-rate", label: "FR", unit: "/min", value: numeric };
  }
  if (label.includes("spo2") || label.includes("saturation")) {
    return { id: "oxygen-saturation", label: "SpO₂", unit: "%", value: numeric };
  }
  if (label.includes("temperature")) {
    return { id: "temperature", label: "Température", unit: "°C", value: numeric };
  }
  if (label.includes("glasgow") || label === "gcs") {
    return { id: "glasgow", label: "Glasgow", unit: "/15", value: numeric };
  }
  if (label.includes("douleur")) {
    return { id: "pain", label: "Douleur", unit: "/10", value: numeric };
  }
  if (label.includes("glycemie")) {
    const renderedValue = normalizeLabel(vital.value);
    const unit = renderedValue.includes("mmol")
      ? "mmol/L"
      : renderedValue.includes("g/l")
        ? "g/L"
        : undefined;
    return { id: "blood-glucose", label: "Glycémie", unit, value: numeric };
  }
  return { id: "observation", label: vital.label, value: numeric };
}

export function parseClinicalVital(vital: PatientVital): ClinicalVital {
  const definition = vitalDefinition(vital);
  const pending = /mesurer|non mesure|inconn/i.test(normalizeLabel(vital.value));
  const measured = definition.id !== "observation" && definition.value !== undefined;
  const value = measured ? definition.value! : vital.value;
  return {
    id: definition.id,
    sourceLabel: vital.label,
    label: definition.label,
    value,
    secondaryValue: definition.secondaryValue,
    unit: definition.unit,
    initialValue: value,
    initialSecondaryValue: definition.secondaryValue,
    tone: vital.tone ?? "stable",
    trend: "unknown",
    status: pending ? "pending" : measured ? "measured" : "qualitative",
  };
}

export function formatClinicalVital(vital: ClinicalVital) {
  if (vital.id === "blood-pressure" && typeof vital.value === "number") {
    const diastolic = vital.secondaryValue === undefined ? "?" : Math.round(vital.secondaryValue);
    return `${Math.round(vital.value)}/${diastolic} ${vital.unit ?? ""}`.trim();
  }
  if (typeof vital.value === "number") {
    const rendered = Number.isInteger(vital.value) ? String(vital.value) : vital.value.toFixed(1);
    return `${rendered}${vital.unit ? ` ${vital.unit}` : ""}`;
  }
  return String(vital.value);
}

function numericTrend(before: number, after: number): ClinicalVitalTrend {
  if (after > before) return "up";
  if (after < before) return "down";
  return "stable";
}

function moveTowardOrAway(value: number, target: number, magnitude: number, improving: boolean) {
  if (Math.abs(value - target) < 0.01) return value;
  const directionToTarget = target > value ? 1 : -1;
  const distance = Math.abs(value - target);
  const appliedMagnitude = improving ? Math.min(distance, magnitude) : magnitude;
  return value + directionToTarget * appliedMagnitude * (improving ? 1 : -1);
}

interface VerifiedSimulationTarget {
  value: number;
  secondaryValue?: number;
  sourceDocument: string;
  sourcePages: string;
}

const DEA_PARAMETER_SOURCE = "DOC-AFTRAL-DEA-B2-M4-2022";

function ageInMonths(age?: string) {
  if (!age) return undefined;
  const normalized = normalizeLabel(age);
  const value = firstNumber(normalized);
  if (value === undefined) return undefined;
  if (normalized.includes("mois")) return value;
  if (normalized.includes("an")) return value * 12;
  return undefined;
}

/**
 * Les cibles ne viennent que des tableaux du support DEA B2.M4. Une constante
 * dont l’unité ou la tranche d’âge est ambiguë reste affichée sans variation
 * chiffrée : le moteur ne complète jamais une valeur manquante.
 */
function getVerifiedSimulationTarget(
  vital: ClinicalVital,
  patientAge?: string,
): VerifiedSimulationTarget | undefined {
  const months = ageInMonths(patientAge);
  switch (vital.id) {
    case "heart-rate":
      if (months === undefined) return undefined;
      if (months < 1) {
        return { value: 135, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "68" };
      }
      if (months < 14 * 12) {
        return { value: 105, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "68" };
      }
      if (months >= 65 * 12) {
        return { value: 57.5, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "68" };
      }
      return { value: 75, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "68" };
    case "blood-pressure":
      if (months === undefined || months < 18 * 12) return undefined;
      return {
        value: 120,
        secondaryValue: 80,
        sourceDocument: DEA_PARAMETER_SOURCE,
        sourcePages: "67",
      };
    case "oxygen-saturation":
      return { value: 97.5, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "72" };
    case "respiratory-rate":
      if (months === undefined) return undefined;
      if (months < 1) {
        return { value: 50, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "71-72" };
      }
      if (months < 24) {
        return { value: 45, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "71-72" };
      }
      if (months <= 12 * 12) {
        return { value: 25, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "71-72" };
      }
      if (months > 14 * 12) {
        return { value: 16, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "71-72" };
      }
      return undefined;
    case "glasgow":
      return { value: 15, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "60-61" };
    case "blood-glucose":
      if (vital.unit === "g/L") {
        return { value: 0.8, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "118-119" };
      }
      if (vital.unit === "mmol/L") {
        return { value: 4.4, sourceDocument: DEA_PARAMETER_SOURCE, sourcePages: "118-119" };
      }
      return undefined;
    case "temperature":
    case "pain":
    case "observation":
      return undefined;
  }
}

function attachVerifiedSimulationTarget(vital: ClinicalVital, patientAge?: string): ClinicalVital {
  const target = getVerifiedSimulationTarget(vital, patientAge);
  if (!target) return vital;
  return {
    ...vital,
    simulationTarget: target.value,
    simulationTargetSecondary: target.secondaryValue,
    targetSourceDocument: target.sourceDocument,
    targetSourcePages: target.sourcePages,
  };
}

function evolveVital(vital: ClinicalVital, patientDelta: number): ClinicalVital {
  if (
    vital.status !== "measured" ||
    typeof vital.value !== "number" ||
    vital.simulationTarget === undefined ||
    patientDelta === 0
  ) {
    return { ...vital, trend: patientDelta === 0 ? "stable" : vital.trend };
  }
  const improving = patientDelta > 0;
  const strength = clamp(Math.ceil(Math.abs(patientDelta) / 4), 1, 4);
  let nextValue = vital.value;
  let nextSecondary = vital.secondaryValue;

  switch (vital.id) {
    case "heart-rate":
      nextValue = moveTowardOrAway(vital.value, vital.simulationTarget, 2 * strength, improving);
      break;
    case "blood-pressure":
      nextValue = moveTowardOrAway(vital.value, vital.simulationTarget, 2 * strength, improving);
      if (nextSecondary !== undefined && vital.simulationTargetSecondary !== undefined) {
        nextSecondary = moveTowardOrAway(
          nextSecondary,
          vital.simulationTargetSecondary,
          strength,
          improving,
        );
      }
      break;
    case "oxygen-saturation":
      nextValue = clamp(
        moveTowardOrAway(vital.value, vital.simulationTarget, strength, improving),
        0,
        100,
      );
      break;
    case "respiratory-rate":
      nextValue = moveTowardOrAway(vital.value, vital.simulationTarget, strength, improving);
      break;
    case "glasgow":
      nextValue = clamp(moveTowardOrAway(vital.value, vital.simulationTarget, 1, improving), 3, 15);
      break;
    case "blood-glucose": {
      const magnitude = vital.unit === "mmol/L" ? 0.2 * strength : 0.05 * strength;
      nextValue = Math.max(
        0,
        moveTowardOrAway(vital.value, vital.simulationTarget, magnitude, improving),
      );
      break;
    }
    case "temperature":
    case "pain":
    case "observation":
      break;
  }

  nextValue = roundOne(nextValue);
  if (nextSecondary !== undefined) nextSecondary = roundOne(nextSecondary);
  return {
    ...vital,
    value: nextValue,
    secondaryValue: nextSecondary,
    trend: numericTrend(vital.value, nextValue),
    tone: improving ? (vital.tone === "critical" ? "watch" : "stable") : "critical",
  };
}

function changesBetween(before: ClinicalVital[], after: ClinicalVital[]): ClinicalVitalChange[] {
  return after.flatMap((vital, index) => {
    const previous = before[index];
    if (!previous) return [];
    const previousValue = formatClinicalVital(previous);
    const nextValue = formatClinicalVital(vital);
    if (previousValue === nextValue && vital.trend === "unknown") return [];
    return [
      {
        vitalId: vital.id,
        label: vital.label,
        before: previousValue,
        after: nextValue,
        trend: vital.trend,
      },
    ];
  });
}

function getOutcome(
  before: number,
  after: number,
  consecutiveErrors: number,
  criticalOmissions: readonly InterventionPhase[],
): { outcome: ClinicalOutcome; failureReason?: string } {
  if (after <= 10) {
    return {
      outcome: "failed",
      failureReason: "L’état clinique atteint le seuil d’échec après une dégradation majeure.",
    };
  }
  if (consecutiveErrors >= 2 && criticalOmissions.length >= 2 && after <= 30) {
    return {
      outcome: "failed",
      failureReason:
        "Deux priorités critiques successives ont été manquées alors que le patient se dégradait.",
    };
  }
  if (after < before) return { outcome: "deteriorating" };
  if (after > before && after >= 70) return { outcome: "stabilized" };
  if (after > before) return { outcome: "improving" };
  return { outcome: after >= 60 ? "stabilized" : "unstable" };
}

function consequenceFor(
  recommended: boolean,
  outcome: ClinicalOutcome,
  vitalChanges: readonly ClinicalVitalChange[],
) {
  if (outcome === "failed") return "La prise en charge ne compense plus la dégradation simulée.";
  const changed = vitalChanges.filter((change) => change.before !== change.after);
  const monitored =
    changed.length > 0 ? ` ${changed.map((change) => change.label).join(", ")} évolue.` : "";
  return recommended
    ? `La décision respecte la priorité attendue et favorise la stabilisation.${monitored}`
    : `La priorité inadéquate ou retardée entraîne une aggravation simulée.${monitored}`;
}

function completedPhase(history: readonly DecisionRecord[], phase: InterventionPhase) {
  return history.some((decision) => decision.phase === phase && decision.recommended);
}

export function assessClinicalHandover(
  history: readonly DecisionRecord[],
  reassessmentCount: number,
  dispatchComplete: boolean,
  outcome: ClinicalOutcome,
  criticalOmissions: readonly InterventionPhase[] = [],
): ClinicalHandoverAssessment {
  const fields: ClinicalHandoverField[] = [
    {
      id: "context",
      label: "Identité, motif et localisation",
      complete: dispatchComplete,
      regulatorQuestion: "Confirmez l’identité utile, le motif et la localisation précise.",
    },
    {
      id: "safety",
      label: "Sécurité et contexte de scène",
      complete: completedPhase(history, "safety"),
      regulatorQuestion: "Quels risques de scène avez-vous identifiés et maîtrisés ?",
    },
    {
      id: "primary",
      label: "Première impression et ABCDE",
      complete: completedPhase(history, "primary"),
      regulatorQuestion: "Quel est le résultat hiérarchisé de votre bilan primaire ABCDE ?",
    },
    {
      id: "vitals",
      label: "Constantes et interrogatoire",
      complete: completedPhase(history, "secondary"),
      regulatorQuestion:
        "Quelles constantes avez-vous relevées et quels éléments d’interrogatoire sont utiles ?",
    },
    {
      id: "actions",
      label: "Gestes réalisés",
      complete: completedPhase(history, "care"),
      regulatorQuestion: "Quels gestes avez-vous réalisés et quel effet avez-vous observé ?",
    },
    {
      id: "evolution",
      label: "Évolution et surveillance",
      complete: reassessmentCount > 0,
      regulatorQuestion: "Comment le patient évolue-t-il depuis votre première évaluation ?",
    },
    {
      id: "decision",
      label: "Demande et décision finale",
      complete: completedPhase(history, "decision"),
      regulatorQuestion: "Quelle décision attendez-vous de la régulation médicale ?",
    },
  ];
  const completeCount = fields.filter((field) => field.complete).length;
  const completeness = Math.round((completeCount / fields.length) * 100);
  const missingCritical = fields.some(
    (field) => !field.complete && ["primary", "actions", "decision"].includes(field.id),
  );
  return {
    completeness,
    fields,
    regulatorQuestions: fields
      .filter((field) => !field.complete)
      .map((field) => field.regulatorQuestion),
    finalDecision:
      outcome === "failed" ||
      outcome === "deteriorating" ||
      criticalOmissions.includes("decision") ||
      criticalOmissions.includes("transport")
        ? "awaiting-support"
        : missingCritical
          ? "regulation-required"
          : "transport",
  };
}

function patientSnapshotVitals(scenario: InterventionScenario) {
  const step = scenario.steps.find(
    (candidate) =>
      candidate.phase !== "arrival" &&
      candidate.phase !== "debrief" &&
      candidate.patient.vitals.length > 0,
  );
  return step?.patient.vitals ?? [];
}

export function createClinicalPatientState(
  scenario: InterventionScenario,
  dispatchComplete = false,
): ClinicalPatientState {
  const overallState = clamp(scenario.startingPatient, 0, 100);
  const outcome: ClinicalOutcome = overallState >= 85 ? "stabilized" : "unstable";
  return {
    schemaVersion: 1,
    overallState,
    outcome,
    vitals: patientSnapshotVitals(scenario).map((vital) =>
      attachVerifiedSimulationTarget(parseClinicalVital(vital), scenario.alert.age),
    ),
    timeline: [],
    reassessmentCount: 0,
    consecutiveErrors: 0,
    criticalOmissions: [],
    handover: assessClinicalHandover([], 0, dispatchComplete, outcome),
  };
}

export function applyClinicalDecision(
  state: ClinicalPatientState,
  decision: DecisionRecord,
  history: readonly DecisionRecord[],
  dispatchComplete: boolean,
  simulatedTimeSeconds: number,
): ClinicalPatientState {
  if (state.outcome === "failed") return state;
  const stateBefore = state.overallState;
  const stateAfter = clamp(stateBefore + decision.effect.patient, 0, 100);
  const consecutiveErrors = decision.recommended ? 0 : state.consecutiveErrors + 1;
  const criticalOmissions =
    !decision.recommended && CRITICAL_PHASES.has(decision.phase)
      ? Array.from(new Set([...state.criticalOmissions, decision.phase]))
      : state.criticalOmissions;
  const outcomeResult = getOutcome(stateBefore, stateAfter, consecutiveErrors, criticalOmissions);
  const vitals = state.vitals.map((vital) => evolveVital(vital, decision.effect.patient));
  const vitalChanges = changesBetween(state.vitals, vitals);
  const entry: ClinicalTimelineEntry = {
    id: `${decision.stepId}:${state.timeline.length + 1}`,
    stepId: decision.stepId,
    phase: decision.phase,
    actionLabel: decision.choiceLabel,
    recommended: decision.recommended,
    patientDelta: decision.effect.patient,
    stateBefore,
    stateAfter,
    outcome: outcomeResult.outcome,
    consequence: consequenceFor(decision.recommended, outcomeResult.outcome, vitalChanges),
    vitalChanges,
    simulatedTimeSeconds,
  };
  return {
    ...state,
    overallState: stateAfter,
    outcome: outcomeResult.outcome,
    vitals,
    timeline: [...state.timeline, entry],
    consecutiveErrors,
    criticalOmissions,
    failureReason: outcomeResult.failureReason,
    handover: assessClinicalHandover(
      history,
      state.reassessmentCount,
      dispatchComplete,
      outcomeResult.outcome,
      criticalOmissions,
    ),
  };
}

export function reassessClinicalPatient(
  state: ClinicalPatientState,
  phase: InterventionPhase,
  stepId: string,
  history: readonly DecisionRecord[],
  dispatchComplete: boolean,
  simulatedTimeSeconds: number,
): ClinicalPatientState {
  if (state.outcome === "failed") return state;
  const drift = state.outcome === "deteriorating" ? -3 : state.outcome === "unstable" ? -1 : 0;
  const stateAfter = clamp(state.overallState + drift, 0, 100);
  const outcomeResult = getOutcome(
    state.overallState,
    stateAfter,
    state.consecutiveErrors,
    state.criticalOmissions,
  );
  const vitals = state.vitals.map((vital) => evolveVital(vital, drift));
  const vitalChanges = changesBetween(state.vitals, vitals);
  const entry: ClinicalTimelineEntry = {
    id: `${stepId}:reassessment:${state.reassessmentCount + 1}`,
    stepId,
    phase,
    actionLabel: "Réévaluation des constantes",
    recommended: true,
    patientDelta: drift,
    stateBefore: state.overallState,
    stateAfter,
    outcome: outcomeResult.outcome,
    consequence:
      drift < 0
        ? "La surveillance objective la poursuite de la dégradation et impose une nouvelle transmission."
        : "La surveillance confirme l’absence de nouvelle dégradation à cet instant.",
    vitalChanges,
    simulatedTimeSeconds,
  };
  const reassessmentCount = state.reassessmentCount + 1;
  return {
    ...state,
    overallState: stateAfter,
    outcome: outcomeResult.outcome,
    vitals,
    timeline: [...state.timeline, entry],
    reassessmentCount,
    failureReason: outcomeResult.failureReason,
    handover: assessClinicalHandover(
      history,
      reassessmentCount,
      dispatchComplete,
      outcomeResult.outcome,
      state.criticalOmissions,
    ),
  };
}

export function applyClinicalQualityToResult(result: MissionResult, state: ClinicalPatientState) {
  const outcomeFactor: Record<ClinicalOutcome, number> = {
    failed: 0.05,
    deteriorating: 0.2,
    unstable: 0.45,
    improving: 0.8,
    stabilized: 1,
  };
  const handoverFactor = 0.6 + (state.handover.completeness / 100) * 0.4;
  const rewardFactor = roundOne(clamp(outcomeFactor[state.outcome] * handoverFactor, 0, 1));
  const scoreCap = state.outcome === "failed" ? 39 : state.outcome === "deteriorating" ? 59 : 100;
  const score = Math.min(result.score, scoreCap);
  const grade =
    score >= 92 ? "A+" : score >= 82 ? "A" : score >= 72 ? "B" : score >= 60 ? "C" : "D";
  return {
    rewardFactor,
    result: {
      ...result,
      score,
      grade,
      xp: Math.round(result.xp * rewardFactor),
      coins: Math.round(result.coins * rewardFactor),
      chest: rewardFactor >= 0.75 ? result.chest : undefined,
      badge: rewardFactor >= 0.85 ? result.badge : undefined,
      patientState: state.overallState,
    },
  };
}

const OUTCOME_LABELS: Record<ClinicalOutcome, string> = {
  unstable: "Patient encore instable",
  improving: "Amélioration en cours",
  stabilized: "Patient stabilisé",
  deteriorating: "Patient aggravé",
  failed: "Échec clinique",
};

export function buildClinicalDebrief(
  scenario: InterventionScenario,
  result: MissionResult,
  state: ClinicalPatientState,
): ClinicalDebrief {
  const phases = Array.from(
    new Set(result.goodDecisions.concat(result.errors).map((item) => item.phase)),
  );
  const vitalIds = Array.from(new Set(state.vitals.map((vital) => vital.id)));
  return {
    outcome: state.outcome,
    outcomeLabel: OUTCOME_LABELS[state.outcome],
    successfulActions: result.goodDecisions.map((decision) => decision.choiceLabel),
    errors: result.errors.map((decision) => `${decision.choiceLabel} — ${decision.feedback}`),
    consequences: state.timeline.map((entry) => ({
      action: entry.actionLabel,
      consequence: entry.consequence,
      outcome: entry.outcome,
    })),
    pulseLessons: scenario.pulseAdvice,
    knowledgeReferences: getClinicalReferences(phases, vitalIds),
    handover: state.handover,
    failureReason: state.failureReason,
  };
}
