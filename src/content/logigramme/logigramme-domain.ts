/**
 * Logigrammes de formation — le déroulé d'une mission lu comme un schéma.
 *
 * Un logigramme décrit une mission de bout en bout : chaque case porte une
 * étape, chaque losange une décision, chaque flèche une suite possible. Le
 * schéma seul ne dit pourtant rien de ce qu'il faut faire dans la case : il
 * nomme l'étape, il ne l'explique pas.
 *
 * C'est le rôle de la **fiche** attachée à chaque nœud. Elle porte ce que
 * l'ambulancier fait à cette étape, dans quel ordre, ce que les textes exigent
 * et ce que la pratique reproche le plus souvent. Le schéma sert alors de
 * table des matières cliquable : on y retrouve une étape par sa place dans la
 * mission, pas par son titre dans un sommaire.
 *
 * ## Provenance
 *
 * Le dépôt applique une règle constante : rien ne se présente comme une
 * obligation sans citer le texte qui l'impose. Chaque point clé d'une fiche
 * porte donc sa provenance.
 *
 * - `official` : l'énoncé figure dans un document indexé dans la bibliothèque
 *   (`src/content/library/library-documents.json`). L'identifiant du document
 *   **et** la section citée sont obligatoires.
 * - `internal` : l'énoncé est une affirmation de la banque MedLingo, tirée du
 *   logigramme de formation fourni par l'équipe pédagogique et en attente de
 *   relecture. Il n'emprunte alors aucun document : un point interne qui
 *   citerait un texte officiel se lirait comme une obligation légale.
 */

/** Nature d'un nœud, et donc sa forme sur le schéma. */
export const LOGIGRAMME_NODE_KINDS = ["start", "step", "decision", "end"] as const;
export type LogigrammeNodeKind = (typeof LOGIGRAMME_NODE_KINDS)[number];

/** Intitulé affiché pour chaque nature de nœud. */
export const LOGIGRAMME_NODE_KIND_LABELS: Record<LogigrammeNodeKind, string> = {
  start: "Départ",
  step: "Étape",
  decision: "Décision",
  end: "Fin de mission",
};

/**
 * Ce que porte une flèche. `yes` et `no` sont les deux sorties d'un losange —
 * elles se lisent au premier coup d'œil sur le schéma, l'une verte, l'autre
 * rouge, comme sur le logigramme d'origine. `neutral` est la suite simple.
 */
export const LOGIGRAMME_EDGE_TONES = ["neutral", "yes", "no"] as const;
export type LogigrammeEdgeTone = (typeof LOGIGRAMME_EDGE_TONES)[number];

/**
 * Tracé d'une flèche entre deux nœuds.
 *
 * - `direct` : les deux nœuds partagent une colonne ou une ligne, le trait est
 *   droit ;
 * - `elbow-vh` : on descend d'abord, on rejoint ensuite le nœud par le côté ;
 * - `elbow-hv` : on part sur le côté, on rejoint ensuite le nœud par le haut
 *   ou par le bas ;
 * - `loop` : le retour en arrière. Il emprunte un couloir vertical libre
 *   (`lane`) pour ne traverser aucune case.
 */
export const LOGIGRAMME_EDGE_SHAPES = ["direct", "elbow-vh", "elbow-hv", "loop"] as const;
export type LogigrammeEdgeShape = (typeof LOGIGRAMME_EDGE_SHAPES)[number];

/** Provenance d'un point clé de fiche. Voir l'en-tête du module. */
export const LOGIGRAMME_POINT_PROVENANCES = ["official", "internal"] as const;
export type LogigrammePointProvenance = (typeof LOGIGRAMME_POINT_PROVENANCES)[number];

/** Intitulé affiché au joueur pour chaque provenance. */
export const LOGIGRAMME_POINT_PROVENANCE_LABELS: Record<LogigrammePointProvenance, string> = {
  official: "Texte réglementaire",
  internal: "Contenu MedLingo — relecture en attente",
};

/**
 * État de relecture d'une fiche. `validated` est réservé à une fiche relue et
 * signée par un formateur DEA : aucune ne l'est encore, et le statut est
 * affiché au joueur plutôt que supposé.
 */
export const LOGIGRAMME_FICHE_STATUSES = ["to_validate", "validated"] as const;
export type LogigrammeFicheStatus = (typeof LOGIGRAMME_FICHE_STATUSES)[number];

export interface LogigrammeFichePoint {
  text: string;
  provenance: LogigrammePointProvenance;
  /** Document de la bibliothèque cité. `null` pour un point interne. */
  sourceDocumentId: string | null;
  /** Section citée dans ce document — article, annexe, module. */
  sourceSection: string | null;
}

/**
 * Le contenu qui s'ouvre au clic sur une case.
 *
 * `role` répond à « qu'est-ce qu'on attend de moi ici ? », `checklist` à
 * « dans quel ordre ? », `keyPoints` à « qu'est-ce qui l'impose ? » et
 * `commonErrors` à « qu'est-ce qui se rate le plus souvent ? ».
 */
export interface LogigrammeFiche {
  role: string;
  summary: string;
  checklist: string[];
  keyPoints: LogigrammeFichePoint[];
  commonErrors: string[];
  /** Compétences du référentiel DEA mobilisées à cette étape. */
  competencyIds: string[];
  /** Connaissance de la bibliothèque qui développe le thème, si elle existe. */
  knowledgeId: string | null;
  /** Parcours de la feuille de route qui enseigne l'étape, si elle est visée. */
  parcoursId: string | null;
  status: LogigrammeFicheStatus;
}

export interface LogigrammeNode {
  id: string;
  kind: LogigrammeNodeKind;
  /** Titre de la fiche, en toutes lettres. */
  title: string;
  /** Les lignes écrites dans la case du schéma, telles qu'elles s'y lisent. */
  boardLabel: string[];
  /** Colonne de la grille. Les fractions sont admises pour caler une case. */
  column: number;
  /** Ligne de la grille, du haut vers le bas. */
  row: number;
  fiche: LogigrammeFiche;
}

export interface LogigrammeEdge {
  from: string;
  to: string;
  /** « Oui », « Non », ou rien pour une suite simple. */
  label: string | null;
  tone: LogigrammeEdgeTone;
  shape: LogigrammeEdgeShape;
  /** Colonne empruntée par le segment vertical d'une boucle. `null` sinon. */
  lane: number | null;
}

export interface Logigramme {
  id: string;
  /** Bloc de la feuille de route MedLingo auquel le schéma est rattaché. */
  blocId: string;
  /** Bloc de compétences du diplôme d'État, qui n'a pas la même numérotation. */
  deaBlocId: string;
  title: string;
  subtitle: string;
  description: string;
  /** D'où vient le schéma, et ce qui reste à relire. */
  sourceNote: string;
  nodes: LogigrammeNode[];
  edges: LogigrammeEdge[];
}

/** Le nœud de départ : celui qu'aucune flèche ne vise. */
export function getLogigrammeStartNode(logigramme: Logigramme): LogigrammeNode {
  const start = logigramme.nodes.find((node) => node.kind === "start");
  if (!start) throw new Error(`Logigramme sans départ : ${logigramme.id}`);
  return start;
}

/** Les flèches qui partent d'un nœud, dans l'ordre de déclaration. */
export function getOutgoingEdges(logigramme: Logigramme, nodeId: string): LogigrammeEdge[] {
  return logigramme.edges.filter((edge) => edge.from === nodeId);
}

/** Les flèches qui arrivent sur un nœud. */
export function getIncomingEdges(logigramme: Logigramme, nodeId: string): LogigrammeEdge[] {
  return logigramme.edges.filter((edge) => edge.to === nodeId);
}

const edgeKey = (edge: LogigrammeEdge) => `${edge.from}→${edge.to}`;

/**
 * Les flèches de retour : celles qui remontent vers une étape encore ouverte
 * dans le parcours en cours. Le logigramme en compte une — une aggravation
 * pendant le transport renvoie à la décision d'appel du centre 15 — et c'est
 * elle qui empêche de lire le schéma comme une simple liste.
 */
function findBackEdges(logigramme: Logigramme): Set<string> {
  const back = new Set<string>();
  const state = new Map<string, "open" | "closed">();

  const walk = (nodeId: string) => {
    state.set(nodeId, "open");
    for (const edge of getOutgoingEdges(logigramme, nodeId)) {
      const target = state.get(edge.to);
      if (target === "open") back.add(edgeKey(edge));
      else if (target === undefined) walk(edge.to);
    }
    state.set(nodeId, "closed");
  };

  walk(getLogigrammeStartNode(logigramme).id);
  return back;
}

/**
 * Les nœuds dans l'ordre où la mission les rencontre.
 *
 * L'ordre n'est ni celui de la déclaration ni un simple suivi des flèches :
 * une étape n'apparaît qu'après **toutes** celles qui peuvent y mener. Sans
 * cette règle, « Gestion documentaire » — que l'on atteint aussi bien sans
 * urgence qu'après une décision de transport — tomberait au milieu de la
 * séquence d'urgence et couperait le récit en deux.
 *
 * Les flèches de retour sont écartées du calcul : elles reviennent en arrière,
 * elles ne repoussent pas l'étape visée vers la fin de la liste.
 *
 * C'est cette liste que lit la vue « Étapes », qui remplace le schéma sur les
 * écrans trop étroits pour lui.
 */
export function getLogigrammeWalkthrough(logigramme: Logigramme): LogigrammeNode[] {
  const backEdges = findBackEdges(logigramme);
  const forward = logigramme.edges.filter((edge) => !backEdges.has(edgeKey(edge)));

  const waiting = new Map(logigramme.nodes.map((node) => [node.id, 0]));
  for (const edge of forward) waiting.set(edge.to, (waiting.get(edge.to) ?? 0) + 1);

  const depth = new Map(logigramme.nodes.map((node) => [node.id, 0]));
  const ready = logigramme.nodes
    .filter((node) => (waiting.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  while (ready.length > 0) {
    const currentId = ready.shift()!;
    for (const edge of forward) {
      if (edge.from !== currentId) continue;
      depth.set(edge.to, Math.max(depth.get(edge.to) ?? 0, (depth.get(currentId) ?? 0) + 1));
      const left = (waiting.get(edge.to) ?? 0) - 1;
      waiting.set(edge.to, left);
      if (left === 0) ready.push(edge.to);
    }
  }

  const declaration = new Map(logigramme.nodes.map((node, index) => [node.id, index]));
  return [...logigramme.nodes].sort(
    (first, second) =>
      (depth.get(first.id) ?? 0) - (depth.get(second.id) ?? 0) ||
      (declaration.get(first.id) ?? 0) - (declaration.get(second.id) ?? 0),
  );
}
