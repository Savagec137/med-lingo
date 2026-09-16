import blocFiveInput from "./bloc-05-logigramme.json" with { type: "json" };
import type { Logigramme, LogigrammeNode } from "./logigramme-domain.ts";
import { parseLogigramme } from "./logigramme-schema.ts";

/**
 * Les logigrammes publiés. Ils sont validés au chargement du module : un
 * schéma incohérent — une flèche vers une case inexistante, une décision sans
 * sortie nommée — casse la page plutôt que de s'afficher à moitié.
 */
export const LOGIGRAMMES: readonly Logigramme[] = [parseLogigramme(blocFiveInput)];

const logigrammesById = new Map(LOGIGRAMMES.map((logigramme) => [logigramme.id, logigramme]));

export function findLogigramme(id: string): Logigramme | null {
  return logigrammesById.get(id) ?? null;
}

/** Le logigramme rattaché à un bloc de la feuille de route, s'il en existe un. */
export function findLogigrammeForBloc(blocId: string): Logigramme | null {
  return LOGIGRAMMES.find((logigramme) => logigramme.blocId === blocId) ?? null;
}

export function findLogigrammeNode(logigramme: Logigramme, nodeId: string): LogigrammeNode | null {
  return logigramme.nodes.find((node) => node.id === nodeId) ?? null;
}
