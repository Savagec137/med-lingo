import catalogInput from "./action-catalog.json" with { type: "json" };
import { parseActionCatalog } from "./action-schema.ts";
import type { InterventionPhase, PlayerAction, PlayerActionId } from "../v3-domain.ts";

const catalog = parseActionCatalog(catalogInput);

const actionsById = new Map(catalog.actions.map((action) => [action.id, action]));

export const PLAYER_ACTIONS: readonly PlayerAction[] = catalog.actions;

export const findAction = (actionId: PlayerActionId) => actionsById.get(actionId);

export function getAction(actionId: PlayerActionId): PlayerAction {
  const action = actionsById.get(actionId);
  if (!action) throw new Error(`Action inconnue dans le catalogue : ${actionId}`);
  return action;
}

/** Actions proposées dans une phase, y compris celles hors périmètre. */
export const actionsForPhase = (phase: InterventionPhase) =>
  catalog.actions.filter((action) => action.requires.phases.includes(phase));

/** Actions réellement jouables : les refus n'en font pas partie. */
export const playableActions = () => catalog.actions.filter((action) => !action.outOfScope);

export const outOfScopeActions = () => catalog.actions.filter((action) => action.outOfScope);
