/**
 * Le vocabulaire des actes hors du champ de l'ambulancier.
 *
 * Le catalogue refuse déjà six actes. Mais un apprenant ne pense pas en
 * identifiants : il pense « cathéter », « seringue », « médicament IV ». Trois de
 * ces mots n'apparaissaient nulle part, si bien qu'un joueur cherchant le geste
 * sous son nom courant ne trouvait rien — et n'apprenait donc pas qu'il est
 * interdit.
 *
 * Ce module ne crée aucun acte. Il **relie les mots du terrain aux refus qui
 * existent**, pour qu'un écran puisse répondre sous n'importe lequel d'entre eux,
 * et pour qu'un test vérifie qu'aucun terme ne reste sans réponse.
 *
 * L'article R. 6311-17 est une liste **limitative** : ce qui n'y figure pas est
 * hors périmètre. Le refus n'est donc pas une restriction de jeu, c'est le droit.
 */

import { getAction, PLAYER_ACTIONS } from "../actions/action-catalog.ts";
import type { PlayerAction, PlayerActionId } from "../v3-domain.ts";

/**
 * Termes que l'apprenant doit reconnaître comme hors périmètre, et l'acte du
 * catalogue qui porte le refus et son explication.
 *
 * Plusieurs termes désignent le même acte, et c'est voulu : « cathéter » et
 * « voie veineuse » sont un même abord vasculaire, « seringue » et « injection »
 * un même geste. Un dictionnaire à une entrée par mot répond à chacun.
 */
export const OUT_OF_SCOPE_TERMS: Readonly<Record<string, PlayerActionId>> = {
  perfusion: "action.perfuser",
  "voie veineuse": "action.poser-voie-veineuse",
  cathéter: "action.poser-voie-veineuse",
  seringue: "action.injecter-produit",
  injection: "action.injecter-produit",
  "médicament iv": "action.injecter-produit",
  "diagnostic médical définitif": "action.poser-diagnostic",
  "geste invasif": "action.sonder-invasif",
};

export type OutOfScopeTerm = keyof typeof OUT_OF_SCOPE_TERMS;

/** L'acte refusé correspondant à un terme, insensible à la casse. */
export function outOfScopeActionForTerm(term: string): PlayerAction | undefined {
  const actionId = OUT_OF_SCOPE_TERMS[term.trim().toLocaleLowerCase("fr")];
  return actionId ? getAction(actionId) : undefined;
}

/**
 * Tous les actes hors périmètre proposés à une phase.
 *
 * Ils sont **proposés et non masqués** : un acte absent de l'écran n'enseigne
 * rien, alors qu'un acte présenté, tenté et refusé avec son motif juridique est
 * le moment où la limite s'apprend. C'est la même règle que pour les gestes
 * dangereux du tour prioritaire.
 */
export const outOfScopeActionsForPhase = (phase: string): PlayerAction[] =>
  PLAYER_ACTIONS.filter(
    (action) => action.outOfScope && action.requires.phases.includes(phase as never),
  );

/**
 * Motif du refus, tel qu'il doit être affiché.
 *
 * Toujours le texte du catalogue, jamais une phrase générique : « ce n'est pas
 * autorisé » n'apprend rien, « aucun acte de l'article R. 6311-17 ne prévoit
 * d'abord vasculaire pour l'ambulancier » apprend la règle et sa source.
 */
export const outOfScopeReason = (action: PlayerAction): string =>
  action.outOfScopeReason ?? "Acte hors du champ de l'ambulancier.";
