/**
 * Ce que les décisions du joueur changent au patient.
 *
 * La table est courte, et c'est volontaire. **Peu de gestes ambulanciers modifient
 * une constante**, et un mode qui ferait remonter une saturation à chaque bonne
 * réponse enseignerait une médecine magique. L'oxygène agit quand il est indiqué,
 * la parole calme un patient douloureux, l'immobilisation freine une dégradation
 * sans la soigner. Tout le reste — surveiller, réévaluer, demander un renfort,
 * préparer le transport — compte au score et ne déplace aucune constante, parce
 * que c'est la vérité du terrain.
 *
 * Les gestes qui sortent du champ de l'ambulancier n'apparaissent pas ici : ils
 * sont refusés avant d'être exécutés, et un geste refusé n'a par définition aucun
 * effet physiologique.
 */

import type { PhysiologyEventKind } from "./physiology-types.ts";

/**
 * Gestes prioritaires qui infléchissent la trajectoire, au moment où le tour est
 * validé — c'est-à-dire quand ils sont réellement faits, pas quand ils sont cochés.
 */
export const GESTURE_PHYSIOLOGY: Record<string, PhysiologyEventKind> = {
  "geste.administrer-oxygene": "oxygen_started",
  "geste.maintenir-axe": "immobilised",
  "geste.rassurer-surveiller": "reassured",
  "geste.installer-selon-tolerance": "positioned",
  // Attendre sans surveiller n'est pas une absence de décision : c'est une
  // décision, et elle laisse le patient glisser.
  "geste.attendre-sans-surveillance": "deterioration",
  "geste.retirer-immobilisation": "dangerous_act",
  "geste.transporter-sans-reevaluation": "dangerous_act",
  "geste.non-indique": "dangerous_act",
};

/**
 * Actions de terrain qui infléchissent la trajectoire.
 *
 * Le retrait du saturomètre n'y figure pas : il arrête la surveillance, il ne
 * change pas le patient. Confondre les deux ferait croire qu'ôter un capteur
 * dégrade quelqu'un.
 */
export const ACTION_PHYSIOLOGY: Record<string, PhysiologyEventKind> = {};

export const physiologyEventForGesture = (gestureId: string): PhysiologyEventKind | undefined =>
  GESTURE_PHYSIOLOGY[gestureId];

export const physiologyEventForAction = (actionId: string): PhysiologyEventKind | undefined =>
  ACTION_PHYSIOLOGY[actionId];
