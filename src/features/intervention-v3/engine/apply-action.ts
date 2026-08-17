import { currentVitalAlerts, evolveInterventionVitals } from "../clinical/intervention-vitals.ts";
import { getAction } from "../actions/action-catalog.ts";
import { readFact } from "../facts/read-fact.ts";
import { revealFacts } from "../facts/reveal-fact.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { calculateBilanGaps } from "./v3-gaps.ts";
import {
  GRAVE_FAULT_FLAGS,
  type ActionEffect,
  type ActionLogEntry,
  type InterventionSession,
  type PlayerAction,
  type PlayerActionId,
} from "../v3-domain.ts";
import { actionRefusal, successfulActionIds } from "./action-gate.ts";
import { phaseAfterAction } from "./v3-phases.ts";
import { buildCentre15Transmission } from "./v3-transmission.ts";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const graveFaults = new Set<string>(GRAVE_FAULT_FLAGS);

export type ApplyActionClassification = "impossible" | "fault" | "valid";

export interface ApplyActionResult {
  session: InterventionSession;
  classification: ApplyActionClassification;
  logEntry: ActionLogEntry;
  reason?: string;
}

function softPrerequisitesMet(session: InterventionSession, action: PlayerAction): boolean {
  const factsKnown = action.requires.justifyingFacts.every((factId) => {
    const read = readFact(session, factId);
    return read.status === "known" && !read.isStale;
  });
  const done = successfulActionIds(session);
  return factsKnown && action.requires.justifyingActions.every((actionId) => done.has(actionId));
}

function refusal(
  session: InterventionSession,
  actionId: PlayerActionId,
  reason: string,
): ApplyActionResult {
  const logEntry: ActionLogEntry = {
    actionId,
    phase: session.phase,
    atSeconds: session.simulatedTimeSeconds,
    outcome: "refused",
    refusalReason: reason,
    revealedFactIds: [],
    scoreDelta: 0,
    patientDelta: 0,
  };
  return {
    classification: "impossible",
    reason,
    logEntry,
    session: { ...session, actionLog: [...session.actionLog, logEntry] },
  };
}

function updateEquipment(session: InterventionSession, actionId: PlayerActionId) {
  if (actionId !== "action.poser-saturometre" && actionId !== "action.retirer-saturometre") {
    return session.equipment;
  }
  const attached = actionId === "action.poser-saturometre";
  return session.equipment.map((entry) =>
    entry.id === "saturometre" ? { ...entry, attached } : entry,
  );
}

function evolveForAction(
  session: InterventionSession,
  action: PlayerAction,
  effect: ActionEffect,
  isFault: boolean,
) {
  const scenario = getV3Scenario(session.scenarioId);
  const quality = isFault ? 0.15 : effect.therapeutic ? 0.9 : 0.55;
  const evolved = evolveInterventionVitals(session.vitals, scenario.clinical, {
    quality,
    minutes: effect.timeSeconds / 60,
    resuscitationEffective: effect.therapeutic && !isFault,
    roscAchieved: session.roscAchieved,
  });
  return {
    ...evolved,
    sample: {
      phase: session.phase,
      label: action.label,
      simulatedTimeSeconds: session.simulatedTimeSeconds + effect.timeSeconds,
      vitals: evolved.vitals,
      alerts: currentVitalAlerts(evolved.vitals, scenario.clinical),
    },
  };
}

/**
 * Applique une action unique. La fonction est pure et idempotente vis-à-vis des
 * barrières : une action impossible est journalisée mais ne consomme ni temps,
 * ni points, ni vie. Une faute souple s'exécute, prend du temps et peut aggraver
 * le patient.
 */
export function applyAction(
  session: InterventionSession,
  actionId: PlayerActionId,
): ApplyActionResult {
  const action = getAction(actionId);
  const hardFailure = actionRefusal(session, action);
  if (hardFailure) return refusal(session, actionId, hardFailure.message);

  const justified = softPrerequisitesMet(session, action);
  const scenario = getV3Scenario(session.scenarioId);
  const handoverGaps =
    actionId === "action.transmettre-bilan" ? calculateBilanGaps(session, scenario) : [];
  const incompleteHandover = handoverGaps.length > 0;
  const isFault = !justified || incompleteHandover;
  const effect = !justified ? action.unjustifiedEffect : action.effect;
  if (!effect) return refusal(session, actionId, "Action non justifiée et sans effet défini.");

  const evolved = evolveForAction(session, action, effect, isFault);
  const flag = effect.flag ?? (incompleteHandover ? "incomplete-handover" : undefined);
  const grave = flag ? graveFaults.has(flag) : false;
  const patientDelta = effect.therapeutic ? effect.patient : 0;
  const handoverPenalty = incompleteHandover ? Math.min(15, handoverGaps.length * 2) : 0;
  const scoreDelta = effect.score - handoverPenalty;
  let updated: InterventionSession = {
    ...session,
    score: clamp(session.score + scoreDelta, 0, 100),
    patientState: clamp(session.patientState + patientDelta, 0, 100),
    lives: grave ? Math.max(0, session.lives - 1) : session.lives,
    simulatedTimeSeconds: session.simulatedTimeSeconds + effect.timeSeconds,
    equipment: updateEquipment(session, actionId),
    flags: flag ? Array.from(new Set([...session.flags, flag])) : session.flags,
    vitals: evolved.vitals,
    vitalsHistory: [...session.vitalsHistory, evolved.sample],
    roscAchieved: evolved.roscAchieved,
    transmission:
      actionId === "action.transmettre-bilan"
        ? buildCentre15Transmission(session, scenario)
        : session.transmission,
  };
  updated = revealFacts(updated, action.reveals, actionId);

  const logEntry: ActionLogEntry = {
    actionId,
    phase: session.phase,
    atSeconds: session.simulatedTimeSeconds,
    outcome: isFault ? "unjustified" : "applied",
    revealedFactIds: [...action.reveals],
    scoreDelta,
    patientDelta,
    ...(flag ? { flag } : {}),
  };
  updated = { ...updated, actionLog: [...updated.actionLog, logEntry] };
  updated = phaseAfterAction(updated, actionId);

  return {
    session: updated,
    classification: isFault ? "fault" : "valid",
    logEntry,
  };
}
