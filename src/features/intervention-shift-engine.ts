import type { InterventionScenario, MissionResult } from "./intervention-domain.ts";
import { acceptInterventionMission, createInterventionSession } from "./intervention-engine.ts";
import {
  applyClinicalDecision,
  applyClinicalQualityToResult,
  assessClinicalHandover,
  buildClinicalDebrief,
  createClinicalPatientState,
} from "./intervention-clinical-engine.ts";
import {
  AFTRAL_CASE_CATALOG,
  ENVIRONMENTS_BY_ILLUSTRATION,
  SHIFT_ADDRESSES,
  TRAVEL_UPDATES_BY_ILLUSTRATION,
  getCaseVariantsForScenario,
} from "./intervention-shift-catalog.ts";
import {
  EMPTY_SHIFT_STATS,
  INTERVENTION_SIMULATION_LEVELS,
  INTERVENTION_SHIFT_END_MINUTE,
  INTERVENTION_SIMULATION_MAX_CALLS,
  INTERVENTION_SHIFT_START_MINUTE,
  type DispatchActionId,
  type DynamicShiftCall,
  type InterventionShiftSession,
  type InterventionSimulationLevel,
  type ShiftCompletedIntervention,
  type ShiftSummary,
  type ShiftTraffic,
  type ShiftTravelDecision,
  type ShiftWeather,
  type TravelDecisionId,
} from "./intervention-shift-domain.ts";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundOne = (value: number) => Math.round(value * 10) / 10;

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Hasard déterministe par clé. Ajouter une nouvelle propriété au générateur
 * ne décale pas les valeurs déjà produites pour les autres clés.
 */
export function randomFloat(seed: string, key: string) {
  let value = hashString(`${seed}:${key}`);
  value += 0x6d2b79f5;
  let mixed = value;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
}

function pickByKey<T>(items: readonly T[], seed: string, key: string): T {
  if (items.length === 0) throw new Error(`Aucune donnée disponible pour ${key}.`);
  const index = Math.min(items.length - 1, Math.floor(randomFloat(seed, key) * items.length));
  const item = items[index];
  if (item === undefined) throw new Error(`Sélection impossible pour ${key}.`);
  return item;
}

export function formatShiftMinute(minute: number) {
  const normalized = Math.max(0, Math.floor(minute));
  return `${String(Math.floor(normalized / 60) % 24).padStart(2, "0")}:${String(
    normalized % 60,
  ).padStart(2, "0")}`;
}

export function createInterventionShift(
  seed: string,
  nowMs = Date.now(),
  difficultyLevel: InterventionSimulationLevel = "beginner",
): InterventionShiftSession {
  if (!seed.trim()) throw new Error("Une graine est obligatoire pour générer la garde.");
  return {
    schemaVersion: 2,
    id: `guard-${hashString(seed).toString(36)}`,
    seed,
    status: "briefing",
    roleScope: "hybrid-training",
    difficultyLevel,
    maxCalls: INTERVENTION_SIMULATION_MAX_CALLS[difficultyLevel],
    startMinute: INTERVENTION_SHIFT_START_MINUTE,
    endMinute: INTERVENTION_SHIFT_END_MINUTE,
    currentMinute: INTERVENTION_SHIFT_START_MINUTE,
    vigilance: 100,
    operationalScore: 50,
    vehicleReady: true,
    radioConnected: true,
    crewComplete: true,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    completedInterventions: [],
    usedScenarioIds: [],
    stats: { ...EMPTY_SHIFT_STATS },
  };
}

export function configureShiftDifficulty(
  session: InterventionShiftSession,
  difficultyLevel: InterventionSimulationLevel,
  nowMs = Date.now(),
) {
  if (session.status !== "briefing") return session;
  return {
    ...session,
    difficultyLevel,
    maxCalls: INTERVENTION_SIMULATION_MAX_CALLS[difficultyLevel],
    updatedAtMs: nowMs,
  };
}

export function getScenariosForSimulationLevel(
  scenarios: readonly InterventionScenario[],
  difficultyLevel: InterventionSimulationLevel,
) {
  if (difficultyLevel === "full-shift") return [...scenarios];
  if (difficultyLevel === "critical") {
    return scenarios.filter((scenario) => (scenario.difficultyStars ?? 1) >= 4);
  }
  const maximumStars: Record<
    Exclude<InterventionSimulationLevel, "critical" | "full-shift">,
    number
  > = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };
  const maximum = maximumStars[difficultyLevel];
  return scenarios.filter((scenario) => (scenario.difficultyStars ?? 1) <= maximum);
}

function getScenarioPool(
  scenarios: readonly InterventionScenario[],
  usedScenarioIds: readonly string[],
  difficultyLevel: InterventionSimulationLevel,
) {
  const eligible = getScenariosForSimulationLevel(scenarios, difficultyLevel);
  const safePool = eligible.length > 0 ? eligible : [...scenarios];
  const unused = safePool.filter((scenario) => !usedScenarioIds.includes(scenario.id));
  return unused.length > 0 ? unused : safePool;
}

function getEnvironment(scenario: InterventionScenario, seed: string, callIndex: number) {
  return pickByKey(
    ENVIRONMENTS_BY_ILLUSTRATION[scenario.illustration],
    seed,
    `call:${callIndex}:environment`,
  );
}

function generateCall(
  shift: InterventionShiftSession,
  scenarios: readonly InterventionScenario[],
  callIndex: number,
): DynamicShiftCall {
  if (scenarios.length === 0) throw new Error("Aucun scénario n'est disponible pour la garde.");
  const pool = getScenarioPool(scenarios, shift.usedScenarioIds, shift.difficultyLevel);
  const scenario = pickByKey(pool, shift.seed, `call:${callIndex}:scenario`);
  const variants = getCaseVariantsForScenario(scenario.id);
  const variant =
    variants.length > 0
      ? pickByKey(variants, shift.seed, `call:${callIndex}:aftral-variant`)
      : undefined;
  const environment = getEnvironment(scenario, shift.seed, callIndex);
  const weather = pickByKey<ShiftWeather>(
    ["clear", "rain", "storm", "fog", "heat"],
    shift.seed,
    `call:${callIndex}:weather`,
  );
  const traffic = pickByKey<ShiftTraffic>(
    ["fluid", "moderate", "dense", "blocked"],
    shift.seed,
    `call:${callIndex}:traffic`,
  );
  const distanceKm = roundOne(1.2 + randomFloat(shift.seed, `call:${callIndex}:distance`) * 9.4);
  const trafficFactor: Record<ShiftTraffic, number> = {
    fluid: 1,
    moderate: 1.2,
    dense: 1.55,
    blocked: 1.9,
  };
  const weatherFactor: Record<ShiftWeather, number> = {
    clear: 1,
    rain: 1.2,
    storm: 1.4,
    fog: 1.35,
    heat: 1.08,
  };
  const etaMinutes = clamp(
    Math.round(2 + distanceKm * 0.72 * trafficFactor[traffic] * weatherFactor[weather]),
    3,
    24,
  );
  const address = pickByKey(SHIFT_ADDRESSES[environment], shift.seed, `call:${callIndex}:address`);
  const travelUpdate = pickByKey(
    TRAVEL_UPDATES_BY_ILLUSTRATION[scenario.illustration],
    shift.seed,
    `call:${callIndex}:travel-update`,
  );

  return {
    id: `${shift.id}-call-${String(callIndex + 1).padStart(2, "0")}`,
    index: callIndex,
    scenarioId: scenario.id,
    caseTemplateId: variant?.id,
    title: variant?.title ?? scenario.title,
    specialty: variant?.specialty ?? scenario.specialty,
    callerQuote: `« ${scenario.alert.dispatchNote} »`,
    patientLabel: [scenario.alert.patient, scenario.alert.age].filter(Boolean).join(", "),
    reason: variant?.title ?? scenario.alert.reason,
    priority: scenario.alert.priority,
    receivedAtMinute: shift.currentMinute,
    context: {
      weather,
      traffic,
      environment,
      distanceKm,
      etaMinutes,
      address,
    },
    dispatchRecords: [],
    travelUpdate,
  };
}

export function startInterventionShift(
  session: InterventionShiftSession,
  scenarios: readonly InterventionScenario[],
  nowMs = Date.now(),
) {
  if (session.status !== "briefing") return session;
  const activeCall = generateCall(session, scenarios, session.completedInterventions.length);
  return {
    ...session,
    status: "ringing" as const,
    activeCall,
    updatedAtMs: nowMs,
  };
}

export function answerShiftCall(session: InterventionShiftSession, nowMs = Date.now()) {
  if (session.status !== "ringing" || !session.activeCall) return session;
  return { ...session, status: "dispatch" as const, updatedAtMs: nowMs };
}

const DISPATCH_ORDER: DispatchActionId[] = ["locate", "engage", "question", "advice"];

function dispatchFeedback(
  actionId: DispatchActionId,
  expected: boolean,
  selected: DispatchActionId[],
) {
  if (actionId === "engage" && !selected.includes("locate")) {
    return "L'engagement est lancé, mais l'adresse et l'accès restent incomplets : le départ perd en efficacité.";
  }
  if (actionId === "advice" && !selected.includes("question")) {
    return "Les conseils sont prématurés tant que les signes essentiels n'ont pas été précisés.";
  }
  if (expected) {
    const messages: Record<DispatchActionId, string> = {
      locate: "L'adresse, l'accès et le rappel sont sécurisés.",
      engage: "Les moyens sont engagés avec les informations indispensables.",
      question: "Les éléments utiles sont recueillis sans retarder le départ.",
      advice: "Les consignes prévues par le scénario sont transmises.",
    };
    return messages[actionId];
  }
  return "L'action reste utile, mais son ordre augmente le délai ou réduit la qualité de la coordination.";
}

export function applyDispatchAction(
  session: InterventionShiftSession,
  actionId: DispatchActionId,
  nowMs = Date.now(),
) {
  const call = session.activeCall;
  if (session.status !== "dispatch" || !call) return session;
  if (call.dispatchRecords.some((record) => record.actionId === actionId)) return session;

  const selected = call.dispatchRecords.map((record) => record.actionId);
  const expected = DISPATCH_ORDER[selected.length] === actionId;
  const engageWithoutLocation = actionId === "engage" && !selected.includes("locate");
  const adviceBeforeQuestions = actionId === "advice" && !selected.includes("question");
  const scoreDelta = engageWithoutLocation ? -4 : adviceBeforeQuestions ? -3 : expected ? 5 : 1;
  const timeDeltaSeconds = expected ? 20 : engageWithoutLocation ? 55 : 38;
  const record = {
    actionId,
    sequence: selected.length + 1,
    scoreDelta,
    timeDeltaSeconds,
    feedback: dispatchFeedback(actionId, expected, selected),
  };
  const etaPenalty = engageWithoutLocation ? 2 : 0;

  return {
    ...session,
    operationalScore: clamp(session.operationalScore + scoreDelta, 0, 100),
    activeCall: {
      ...call,
      context: {
        ...call.context,
        etaMinutes: clamp(call.context.etaMinutes + etaPenalty, 3, 30),
      },
      dispatchRecords: [...call.dispatchRecords, record],
    },
    updatedAtMs: nowMs,
  };
}

export function canDepartToCall(session: InterventionShiftSession) {
  return (
    session.status === "dispatch" &&
    session.activeCall?.dispatchRecords.length === DISPATCH_ORDER.length
  );
}

export function departToCall(session: InterventionShiftSession, nowMs = Date.now()) {
  if (!canDepartToCall(session) || !session.activeCall) return session;
  const qualificationSeconds = session.activeCall.dispatchRecords.reduce(
    (total, record) => total + record.timeDeltaSeconds,
    0,
  );
  return {
    ...session,
    status: "travel" as const,
    currentMinute: Math.min(
      session.endMinute,
      session.currentMinute + Math.max(1, Math.ceil(qualificationSeconds / 60)),
    ),
    updatedAtMs: nowMs,
  };
}

function buildTravelDecision(id: TravelDecisionId): ShiftTravelDecision {
  if (id === "update-regulation") {
    return {
      id,
      scoreDelta: 7,
      patientDelta: 4,
      timeDeltaSeconds: 35,
      feedback:
        "L'évolution est partagée et l'équipe adapte sa préparation sans modifier la sécurité routière.",
    };
  }
  if (id === "unsafe-speed") {
    return {
      id,
      scoreDelta: -9,
      patientDelta: -3,
      timeDeltaSeconds: 10,
      feedback: "Le gain espéré ne justifie pas une conduite non adaptée au trafic et à la météo.",
    };
  }
  return {
    id,
    scoreDelta: -4,
    patientDelta: -3,
    timeDeltaSeconds: 20,
    feedback:
      "L'information nouvelle n'est pas intégrée à la préparation et devra être reprise à l'arrivée.",
  };
}

export function selectTravelDecision(
  session: InterventionShiftSession,
  decisionId: TravelDecisionId,
  nowMs = Date.now(),
) {
  const call = session.activeCall;
  if (session.status !== "travel" || !call || call.travelDecision) return session;
  const travelDecision = buildTravelDecision(decisionId);
  return {
    ...session,
    operationalScore: clamp(session.operationalScore + travelDecision.scoreDelta, 0, 100),
    activeCall: { ...call, travelDecision },
    updatedAtMs: nowMs,
  };
}

export function arriveOnScene(
  session: InterventionShiftSession,
  scenarios: readonly InterventionScenario[],
  nowMs = Date.now(),
) {
  const call = session.activeCall;
  if (session.status !== "travel" || !call?.travelDecision) return session;
  const scenario = scenarios.find((item) => item.id === call.scenarioId);
  if (!scenario) throw new Error(`Scénario introuvable pour l'appel ${call.id}.`);
  let shuffleIndex = 0;
  const random = () => {
    const value = randomFloat(session.seed, `call:${call.index}:shuffle:${shuffleIndex}`);
    shuffleIndex += 1;
    return value;
  };
  const created = acceptInterventionMission(createInterventionSession(scenario, random));
  const missionSession = {
    ...created,
    patientState: clamp(created.patientState + call.travelDecision.patientDelta, 0, 100),
    simulatedTimeSeconds:
      created.simulatedTimeSeconds +
      call.context.etaMinutes * 60 +
      call.travelDecision.timeDeltaSeconds,
  };
  const clinicalState = createClinicalPatientState(
    scenario,
    call.dispatchRecords.length === DISPATCH_ORDER.length,
  );
  return {
    ...session,
    status: "mission" as const,
    currentMinute: Math.min(session.endMinute, session.currentMinute + call.context.etaMinutes),
    activeCall: {
      ...call,
      missionSession,
      clinicalState,
      missionStartedAtMs: nowMs,
      missionElapsedSeconds: 0,
    },
    updatedAtMs: nowMs,
  };
}

function patientCountForScenario(scenario: InterventionScenario) {
  const text = `${scenario.alert.patient} ${scenario.summary}`.toLocaleLowerCase("fr");
  if (text.includes("famille")) return 3;
  if (text.includes("plusieurs")) return 3;
  return 1;
}

function classifyScenario(scenario: InterventionScenario) {
  const text = `${scenario.id} ${scenario.title} ${scenario.specialty}`.toLocaleLowerCase("fr");
  return {
    cardiacArrest: text.includes("arret-cardio") || text.includes("arrêt cardio") ? 1 : 0,
    trauma:
      text.includes("trauma") ||
      text.includes("fracture") ||
      text.includes("accident") ||
      text.includes("hemorrag")
        ? 1
        : 0,
    stroke: text.includes("avc") ? 1 : 0,
    birth: text.includes("accouchement") ? 1 : 0,
  };
}

export function completeShiftIntervention(
  session: InterventionShiftSession,
  scenario: InterventionScenario,
  result: MissionResult,
  nowMs = Date.now(),
) {
  const call = session.activeCall;
  if (session.status !== "mission" || !call?.missionSession) return session;
  if (session.completedInterventions.some((item) => item.callId === call.id)) return session;
  const clinicalState = call.clinicalState ?? createClinicalPatientState(scenario, true);
  const adjusted = applyClinicalQualityToResult(result, clinicalState);
  const finalResult = adjusted.result;
  const debrief = buildClinicalDebrief(scenario, finalResult, clinicalState);
  const correctDecisions = finalResult.goodDecisions.length;
  const totalDecisions = correctDecisions + finalResult.errors.length;
  const patientCount = patientCountForScenario(scenario);
  const classification = classifyScenario(scenario);
  const interventionMinutes = clamp(
    Math.max(scenario.estimatedMinutes, Math.ceil(finalResult.elapsedSeconds / 60)) + 5,
    12,
    95,
  );
  const completedAtMinute = Math.min(
    session.endMinute,
    session.currentMinute + interventionMinutes,
  );
  const completed = {
    callId: call.id,
    scenarioId: scenario.id,
    caseTemplateId: call.caseTemplateId,
    title: call.title,
    specialty: call.specialty,
    patientCount,
    score: finalResult.score,
    grade: finalResult.grade,
    xp: finalResult.xp,
    coins: finalResult.coins,
    chest: finalResult.chest,
    badge: finalResult.badge,
    correctDecisions,
    totalDecisions,
    elapsedSeconds: finalResult.elapsedSeconds,
    completedAtMinute,
    clinicalOutcome: clinicalState.outcome,
    clinicalScore: clinicalState.overallState,
    rewardFactor: adjusted.rewardFactor,
    debrief,
  };
  const nextInterventionCount = session.stats.interventions + 1;
  const weightedScore = Math.round(
    (session.operationalScore * session.stats.interventions + finalResult.score) /
      nextInterventionCount,
  );
  const vigilanceCost =
    4 + (scenario.difficultyStars ?? 1) * 2 + Math.min(6, finalResult.errors.length);

  return {
    ...session,
    status: "intervention-summary" as const,
    currentMinute: completedAtMinute,
    vigilance: clamp(session.vigilance - vigilanceCost, 0, 100),
    operationalScore: clamp(weightedScore, 0, 100),
    completedInterventions: [...session.completedInterventions, completed],
    usedScenarioIds: Array.from(new Set([...session.usedScenarioIds, scenario.id])),
    lastResult: finalResult,
    stats: {
      interventions: nextInterventionCount,
      patients: session.stats.patients + patientCount,
      cardiacArrests: session.stats.cardiacArrests + classification.cardiacArrest,
      traumas: session.stats.traumas + classification.trauma,
      strokes: session.stats.strokes + classification.stroke,
      births: session.stats.births + classification.birth,
      correctDecisions: session.stats.correctDecisions + correctDecisions,
      totalDecisions: session.stats.totalDecisions + totalDecisions,
      totalResponseMinutes: session.stats.totalResponseMinutes + call.context.etaMinutes,
      xp: session.stats.xp + finalResult.xp,
      coins: session.stats.coins + finalResult.coins,
      chests: session.stats.chests + (finalResult.chest ? 1 : 0),
      failures: session.stats.failures + (clinicalState.outcome === "failed" ? 1 : 0),
    },
    updatedAtMs: nowMs,
  };
}

export function requestNextShiftCall(
  session: InterventionShiftSession,
  scenarios: readonly InterventionScenario[],
  nowMs = Date.now(),
) {
  if (session.status !== "intervention-summary") return session;
  if (
    session.currentMinute >= session.endMinute ||
    session.completedInterventions.length >= session.maxCalls
  ) {
    return {
      ...session,
      status: "shift-summary" as const,
      activeCall: undefined,
      updatedAtMs: nowMs,
    };
  }
  const gap = Math.round(
    8 +
      randomFloat(
        session.seed,
        `after-call:${session.completedInterventions.length}:availability-gap`,
      ) *
        34,
  );
  const waitingSession = {
    ...session,
    currentMinute: Math.min(session.endMinute, session.currentMinute + gap),
    activeCall: undefined,
    lastResult: undefined,
  };
  if (waitingSession.currentMinute >= waitingSession.endMinute) {
    return {
      ...waitingSession,
      status: "shift-summary" as const,
      updatedAtMs: nowMs,
    };
  }
  return {
    ...waitingSession,
    status: "ringing" as const,
    activeCall: generateCall(
      waitingSession,
      scenarios,
      waitingSession.completedInterventions.length,
    ),
    updatedAtMs: nowMs,
  };
}

export function finishInterventionShift(session: InterventionShiftSession, nowMs = Date.now()) {
  if (session.status === "briefing" || session.status === "shift-summary") return session;
  return {
    ...session,
    status: "shift-summary" as const,
    activeCall: undefined,
    updatedAtMs: nowMs,
  };
}

export function calculateShiftSummary(session: InterventionShiftSession): ShiftSummary {
  const accuracy =
    session.stats.totalDecisions === 0
      ? 0
      : Math.round((session.stats.correctDecisions / session.stats.totalDecisions) * 100);
  const averageResponseMinutes =
    session.stats.interventions === 0
      ? 0
      : roundOne(session.stats.totalResponseMinutes / session.stats.interventions);
  const score = Math.round((accuracy + session.operationalScore) / 2);
  const grade =
    score >= 92 ? "A+" : score >= 82 ? "A" : score >= 72 ? "B" : score >= 60 ? "C" : "D";
  const rank =
    score >= 92
      ? "Ambulancier référent"
      : score >= 80
        ? "Ambulancier confirmé"
        : score >= 65
          ? "Ambulancier opérationnel"
          : "Ambulancier en progression";
  return {
    durationMinutes: Math.max(0, session.currentMinute - session.startMinute),
    accuracy,
    averageResponseMinutes,
    grade,
    rank,
  };
}

export function isPersistedInterventionShift(value: unknown): value is InterventionShiftSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<InterventionShiftSession>;
  return (
    candidate.schemaVersion === 2 &&
    typeof candidate.id === "string" &&
    typeof candidate.seed === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.difficultyLevel === "string" &&
    INTERVENTION_SIMULATION_LEVELS.includes(candidate.difficultyLevel) &&
    typeof candidate.maxCalls === "number" &&
    Number.isInteger(candidate.maxCalls) &&
    candidate.maxCalls >= 1 &&
    typeof candidate.currentMinute === "number" &&
    Number.isFinite(candidate.currentMinute) &&
    typeof candidate.vigilance === "number" &&
    candidate.vigilance >= 0 &&
    candidate.vigilance <= 100 &&
    Array.isArray(candidate.completedInterventions) &&
    Array.isArray(candidate.usedScenarioIds) &&
    Boolean(candidate.stats)
  );
}

function hasLegacyShiftShape(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.id === "string" &&
    typeof candidate.seed === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.currentMinute === "number" &&
    typeof candidate.vigilance === "number" &&
    Array.isArray(candidate.completedInterventions) &&
    Array.isArray(candidate.usedScenarioIds) &&
    Boolean(candidate.stats)
  );
}

/**
 * Migre les gardes locales V1 sans toucher à Supabase. Une mission en cours
 * reconstruit son état clinique à partir de l'historique de décisions déjà
 * sauvegardé, afin de préserver la reprise après actualisation.
 */
export function restoreInterventionShift(
  value: unknown,
  scenarios: readonly InterventionScenario[],
): InterventionShiftSession | null {
  if (isPersistedInterventionShift(value)) return value;
  if (!hasLegacyShiftShape(value)) return null;

  const legacy = value as Record<string, unknown>;
  const difficultyLevel: InterventionSimulationLevel = "full-shift";
  const stats = legacy.stats as InterventionShiftSession["stats"];
  const completedInterventions = (
    legacy.completedInterventions as Array<
      Omit<
        ShiftCompletedIntervention,
        "clinicalOutcome" | "clinicalScore" | "rewardFactor" | "debrief"
      >
    >
  ).map((completed): ShiftCompletedIntervention => ({
    ...completed,
    clinicalOutcome: "unstable",
    clinicalScore: completed.score,
    rewardFactor: 1,
    debrief: {
      outcome: "unstable",
      outcomeLabel: "Résultat antérieur conservé",
      successfulActions: [],
      errors: [],
      consequences: [],
      pulseLessons: [],
      knowledgeReferences: [],
      handover: assessClinicalHandover([], 0, false, "unstable"),
    },
  }));

  let migrated = {
    ...(legacy as unknown as InterventionShiftSession),
    schemaVersion: 2 as const,
    difficultyLevel,
    maxCalls: INTERVENTION_SIMULATION_MAX_CALLS[difficultyLevel],
    completedInterventions,
    stats: { ...stats, failures: stats.failures ?? 0 },
  };

  const call = migrated.activeCall;
  if (migrated.status === "mission" && call?.missionSession && !call.clinicalState) {
    const scenario = scenarios.find((item) => item.id === call.scenarioId);
    if (!scenario) return null;
    let clinicalState = createClinicalPatientState(
      scenario,
      call.dispatchRecords.length === DISPATCH_ORDER.length,
    );
    for (const decision of call.missionSession.history) {
      clinicalState = applyClinicalDecision(
        clinicalState,
        decision,
        call.missionSession.history.filter(
          (historyDecision) =>
            call.missionSession!.history.indexOf(historyDecision) <=
            call.missionSession!.history.indexOf(decision),
        ),
        call.dispatchRecords.length === DISPATCH_ORDER.length,
        call.missionSession.simulatedTimeSeconds,
      );
    }
    migrated = { ...migrated, activeCall: { ...call, clinicalState } };
  }
  return migrated;
}

export function validateAftralCatalog(scenarios: readonly InterventionScenario[]) {
  const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
  return AFTRAL_CASE_CATALOG.flatMap((item) => {
    if (item.availability === "playable" && !scenarioIds.has(item.mappedScenarioId ?? "")) {
      return [`${item.id}: scénario ${item.mappedScenarioId ?? "absent"} introuvable`];
    }
    return [];
  });
}
