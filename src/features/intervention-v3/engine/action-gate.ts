/**
 * La porte des refus : ce qui est matériellement impossible.
 *
 * Ce module est **sans effet**. Il ne modifie aucune session, n'en produit
 * aucune, et ne connaît ni le score ni la physiologie. C'est ce qui permet à la
 * couche présentation de l'interroger pour savoir quels boutons sont actifs sans
 * jamais pouvoir déclencher une action — `applyAction` lui reste inaccessible,
 * et ESLint le vérifie.
 *
 * Une seule implémentation des barrières dures, donc, partagée par le moteur et
 * par les écrans. Un écran qui rejouerait ces règles de son côté finirait par en
 * oublier une et proposerait des gestes que le moteur rejette.
 */

import {
  EQUIPMENT_LABELS,
  type EquipmentId,
  type InterventionSessionView,
  type PlayerAction,
  type PlayerActionId,
} from "../v3-domain.ts";

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
