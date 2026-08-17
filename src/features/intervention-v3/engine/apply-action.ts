import { currentVitalAlerts, evolveInterventionVitals } from "../clinical/intervention-vitals.ts";
import { getAction } from "../actions/action-catalog.ts";
import { readFact } from "../facts/read-fact.ts";
import { revealFacts } from "../facts/reveal-fact.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { calculateBilanGaps } from "./v3-gaps.ts";
import {
  EQUIPMENT_LABELS,
  GRAVE_FAULT_FLAGS,
  type ActionEffect,
  type ActionLogEntry,
  type EquipmentId,
  type InterventionSession,
  type InterventionSessionView,
  type PlayerAction,
  type PlayerActionId,
} from "../v3-domain.ts";
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

const successfulEntries = (session: InterventionSessionView) =>
  session.actionLog.filter(
    (entry) => entry.outcome === "applied" || entry.outcome === "unjustified",
  );

/**
 * Actions réellement accomplies. Une action refusée n'en fait pas partie : elle
 * a été journalisée, pas jouée, et ne peut donc satisfaire aucun prérequis.
 */
export const successfulActionIds = (session: InterventionSessionView): Set<PlayerActionId> =>
  new Set(successfulEntries(session).map((entry) => entry.actionId));

/** Nature du refus. C'est elle que l'interface traduit, jamais le message. */
export const ACTION_REFUSAL_KINDS = [
  "out_of_scope",
  "wrong_phase",
  "equipment_missing",
  "sensor_not_attached",
  "blocking_action_missing",
  "max_uses_reached",
] as const;

export type ActionRefusalKind = (typeof ACTION_REFUSAL_KINDS)[number];

export interface ActionRefusal {
  kind: ActionRefusalKind;
  /** Message journalisé dans `actionLog.refusalReason`. */
  message: string;
  /** Matériel manquant, pour un refus `equipment_missing`. Vide sinon. */
  missingEquipment: EquipmentId[];
  /** Action préalable manquante, pour un refus `blocking_action_missing`. */
  blockingActionId: PlayerActionId | null;
}

/**
 * Barrières dures d'une action, **seule autorité sur ce qui est refusé**.
 *
 * Exportée et prenant la vue de session parce que l'interface doit décider quels
 * boutons sont actifs. Un écran qui rejouerait ces règles de son côté finirait
 * par en oublier une — la vérification du capteur posé, ou le fait qu'une action
 * refusée ne compte pas comme accomplie — et proposerait des boutons que le
 * moteur rejette. Ici il n'y a qu'une implémentation, et un test vérifie que
 * l'écran l'utilise.
 *
 * Les barrières souples n'y figurent pas : une action non justifiée reste
 * jouable, c'est le principe du mode.
 */
export function actionRefusal(
  session: InterventionSessionView,
  action: PlayerAction,
): ActionRefusal | undefined {
  const refusal = (
    kind: ActionRefusalKind,
    message: string,
    extra: Partial<Pick<ActionRefusal, "missingEquipment" | "blockingActionId">> = {},
  ): ActionRefusal => ({
    kind,
    message,
    missingEquipment: extra.missingEquipment ?? [],
    blockingActionId: extra.blockingActionId ?? null,
  });

  if (action.outOfScope) {
    return refusal("out_of_scope", action.outOfScopeReason ?? "Action hors du champ DEA.");
  }
  if (!action.requires.phases.includes(session.phase)) {
    return refusal("wrong_phase", `Action indisponible pendant la phase ${session.phase}.`);
  }
  const missingEquipment = action.requires.equipment.filter(
    (id) => !session.equipment.some((entry) => entry.id === id && entry.prepared),
  );
  if (missingEquipment.length > 0) {
    return refusal("equipment_missing", `Matériel non préparé : ${missingEquipment.join(", ")}.`, {
      missingEquipment,
    });
  }
  if (action.id === "action.retirer-saturometre") {
    const attached = session.equipment.some(
      (entry) => entry.id === "saturometre" && entry.attached,
    );
    if (!attached) return refusal("sensor_not_attached", "Le saturomètre n'est pas posé.");
  }
  const done = successfulActionIds(session);
  const blocking = action.requires.blockingActions.find((actionId) => !done.has(actionId));
  if (blocking) {
    return refusal("blocking_action_missing", `Action préalable non réalisée : ${blocking}.`, {
      blockingActionId: blocking,
    });
  }
  if (action.requires.maxUses !== null) {
    const uses = successfulEntries(session).filter((entry) => entry.actionId === action.id).length;
    if (uses >= action.requires.maxUses) {
      return refusal("max_uses_reached", "Nombre maximal d'utilisations atteint.");
    }
  }
  return undefined;
}

/** Libellés du matériel manquant, pour un message lisible côté écran. */
export const missingEquipmentLabels = (refusal: ActionRefusal): string[] =>
  refusal.missingEquipment.map((id) => EQUIPMENT_LABELS[id]);

function softPrerequisitesMet(session: InterventionSession, action: PlayerAction): boolean {
  const factsKnown = action.requires.justifyingFacts.every((factId) => {
    const read = readFact(session, factId);
    return read.status === "known" && !read.isStale;
  });
  const done = new Set(successfulEntries(session).map((entry) => entry.actionId));
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
