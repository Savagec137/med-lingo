import type { InterventionSessionView, PlayerAction, PlayerActionId } from "../v3-domain.ts";
import {
  actionRefusal,
  missingEquipmentLabels,
  successfulActionIds,
  type ActionRefusalKind,
} from "../engine/action-gate.ts";
import { findAction } from "../actions/action-catalog.ts";

/**
 * Ce qu'un écran affiche d'une action : active ou non, et pourquoi.
 *
 * L'écran ne décide pas de ce qui est refusé. Il demande au moteur
 * (`actionRefusal`) et se contente de traduire la nature du refus en une phrase
 * affichable. C'est la seule façon d'éviter le défaut le plus coûteux d'une
 * interface de jeu : un bouton présenté actif que le moteur rejette au clic.
 *
 * Les barrières souples ne désactivent rien. Approcher un patient sans avoir
 * sécurisé la zone reste cliquable — l'erreur doit être possible pour être une
 * faute, et c'est le débriefing qui la relève.
 */
export interface ActionAvailability {
  enabled: boolean;
  /** Phrase affichée sous une carte désactivée. Nul quand l'action est active. */
  disabledReason: string | null;
  /** Nature du refus, pour un style d'affichage distinct. Nul si active. */
  refusalKind: ActionRefusalKind | null;
  /** Action hors périmètre DEA : la maquette la barre au lieu de la griser. */
  outOfScope: boolean;
  /** Déjà accomplie au moins une fois dans cette intervention. */
  alreadyDone: boolean;
}

export function actionAvailability(
  session: InterventionSessionView,
  action: PlayerAction,
): ActionAvailability {
  const refusal = actionRefusal(session, action);
  const alreadyDone = successfulActionIds(session).has(action.id);

  if (!refusal) {
    return {
      enabled: true,
      disabledReason: null,
      refusalKind: null,
      outOfScope: action.outOfScope,
      alreadyDone,
    };
  }

  return {
    enabled: false,
    disabledReason: displayReason(refusal.kind, refusal, action),
    refusalKind: refusal.kind,
    outOfScope: action.outOfScope,
    alreadyDone,
  };
}

/**
 * Formulation affichée. Les messages du moteur sont destinés au journal : ils
 * nomment les identifiants techniques. L'écran en dit la même chose avec les
 * mots du métier.
 */
function displayReason(
  kind: ActionRefusalKind,
  refusal: NonNullable<ReturnType<typeof actionRefusal>>,
  action: PlayerAction,
): string {
  switch (kind) {
    case "out_of_scope":
      return action.outOfScopeReason ?? "Acte hors du champ de l'ambulancier.";
    case "wrong_phase":
      return "Indisponible à cette étape.";
    case "equipment_missing":
      return `Matériel non embarqué : ${missingEquipmentLabels(refusal).join(", ")}.`;
    case "sensor_not_attached":
      return "Le saturomètre n'est pas posé.";
    case "blocking_action_missing":
      return blockingReason(refusal.blockingActionId);
    case "max_uses_reached":
      return "Action déjà réalisée.";
  }
}

/** Nomme l'action manquante quand le catalogue la connaît, sans jargon sinon. */
function blockingReason(blockingActionId: PlayerActionId | null): string {
  const blocking = blockingActionId ? findAction(blockingActionId) : undefined;
  return blocking ? `À faire d'abord : ${blocking.label}.` : "Une action préalable manque.";
}
