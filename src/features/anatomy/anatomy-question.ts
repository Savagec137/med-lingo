/**
 * Logique pure des questions anatomiques : construction depuis les données
 * existantes, sélection, correction, révélation des libellés, progression.
 *
 * Aucune dépendance React, aucun accès au DOM. C'est ce qui rend la règle de
 * gameplay testable : « pastilles visibles avant réponse, libellés révélés après
 * correction » est ici une fonction, pas une intention d'affichage.
 */

import {
  DEFAULT_HOTSPOT_RADIUS,
  MAX_ZOOM,
  MIN_ZOOM,
  type AnatomyAnswerOption,
  type AnatomyCorrectionState,
  type AnatomyHotspotConfig,
  type AnatomyLayer,
  type AnatomyProgress,
  type AnatomyQuestionConfig,
  type AnatomySelectionState,
} from "./anatomy-domain.ts";
import { layerForHotspotId, toggleLayer } from "./anatomy-layers.ts";

/** Une réponse telle que la prépare le moteur de leçon existant. */
export interface AnatomySourceAnswer {
  id: string;
  text: string;
  /** Coordonnées relatives « x,y » en fractions de 0 à 1. */
  detail?: string;
}

/**
 * Lit les coordonnées d'une réponse existante et les convertit en pourcentage.
 *
 * Les 28 questions en production stockent des fractions de 0 à 1. Une valeur
 * absente ou illisible retombe au centre plutôt que de casser la question, comme
 * le fait déjà le composant historique.
 */
export function parseRelativePoint(detail: string | undefined): { x: number; y: number } {
  // `Number("")` vaut 0 et non NaN : une chaîne vide passerait pour l'origine et
  // collerait la zone dans le coin supérieur gauche. Les segments blancs sont
  // donc écartés avant conversion.
  const parts = (detail ?? "").split(",").map((part) => part.trim());
  const toNumber = (part: string | undefined) =>
    part === undefined || part === "" ? Number.NaN : Number(part);
  const rawX = toNumber(parts[0]);
  const rawY = toNumber(parts[1]);
  const x = Number.isFinite(rawX) ? rawX : 0.5;
  const y = Number.isFinite(rawY) ? rawY : 0.5;
  // Une valeur supérieure à 1 est déjà exprimée en pourcentage : on ne la
  // multiplie pas deux fois.
  const asPercent = (value: number) => (value <= 1 ? value * 100 : value);
  return { x: clamp(asPercent(x), 0, 100), y: clamp(asPercent(y), 0, 100) };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Construit les zones d'une question à partir des réponses existantes.
 *
 * Le numéro d'ordre suit l'ordre de déclaration : c'est celui que le composant
 * historique affiche déjà, et le changer renuméroterait les zones d'une question
 * à l'autre.
 */
export function hotspotsFromAnswers(
  answers: readonly AnatomySourceAnswer[],
): AnatomyHotspotConfig[] {
  return answers.map((answer, index) => {
    const point = parseRelativePoint(answer.detail);
    return {
      id: answer.id,
      label: answer.text,
      x: point.x,
      y: point.y,
      radius: DEFAULT_HOTSPOT_RADIUS,
      layer: layerForHotspotId(answer.id),
      order: index + 1,
    };
  });
}

/**
 * Zones d'une question, **sans couche**, pour la planche vectorielle historique.
 *
 * `hotspotsFromAnswers` échoue volontairement sur une structure absente de la
 * table des couches : c'est ce qui empêche une zone d'exister sans être rangée.
 * Ce comportement est juste pour une configuration écrite à la main, mais
 * inacceptable dans un écran de leçon, où il ferait planter la question. La
 * planche vectorielle n'a de toute façon pas de couches : elle n'a besoin que
 * des positions, des libellés et des numéros.
 */
export interface AnatomyPoint {
  id: string;
  label: string;
  /** Abscisse relative, 0 à 100. */
  x: number;
  /** Ordonnée relative, 0 à 100. */
  y: number;
  order: number;
}

export function pointsFromAnswers(answers: readonly AnatomySourceAnswer[]): AnatomyPoint[] {
  return answers.map((answer, index) => {
    const point = parseRelativePoint(answer.detail);
    return {
      id: answer.id,
      label: answer.text,
      x: point.x,
      y: point.y,
      order: index + 1,
    };
  });
}

/**
 * Libellé accessible d'une zone de la planche historique.
 *
 * Même règle que `hotspotAriaLabel`, sur la forme réduite : le nom n'apparaît
 * qu'une fois la question corrigée.
 */
export function pointAriaLabel(point: AnatomyPoint, total: number, revealed: boolean): string {
  return revealed ? point.label : `Zone ${point.order} sur ${total}`;
}

/** Couches mobilisées par une liste de zones, sans doublon. */
export function layersOfHotspots(hotspots: readonly AnatomyHotspotConfig[]): AnatomyLayer[] {
  const seen = new Set<AnatomyLayer>();
  for (const hotspot of hotspots) seen.add(hotspot.layer);
  return [...seen];
}

/* -------------------------------------------------------------------------- */
/* État initial                                                              */
/* -------------------------------------------------------------------------- */

export function createSelectionState(
  config: AnatomyQuestionConfig,
  foundHotspotIds: readonly string[] = [],
): AnatomySelectionState {
  return {
    selectedHotspotId: null,
    missedTap: false,
    visibleLayers: [...config.visibleLayers],
    view: config.view,
    zoom: MIN_ZOOM,
    offset: { x: 0, y: 0 },
    foundHotspotIds: [...foundHotspotIds],
  };
}

/** Couche verrouillée pendant la question : celle qui porte la zone attendue. */
export function lockedLayerOf(config: AnatomyQuestionConfig): AnatomyLayer | undefined {
  return config.hotspots.find((hotspot) => hotspot.id === config.targetHotspotId)?.layer;
}

/**
 * Couches visibles à l'ouverture, corrigées si nécessaire.
 *
 * Si la configuration masque la couche de la zone attendue, la question serait
 * insoluble : elle est forcée à visible.
 */
export function initialVisibleLayers(config: AnatomyQuestionConfig): AnatomyLayer[] {
  const locked = lockedLayerOf(config);
  if (!locked || config.visibleLayers.includes(locked)) return [...config.visibleLayers];
  return toggleLayer(config.visibleLayers, locked, undefined);
}

/* -------------------------------------------------------------------------- */
/* Sélection                                                                 */
/* -------------------------------------------------------------------------- */

/** Zone touchée à un point donné, en pourcentage, ou `null` hors de toute zone. */
export function hotspotAt(
  config: AnatomyQuestionConfig,
  point: { x: number; y: number },
  visibleLayers: readonly AnatomyLayer[],
): AnatomyHotspotConfig | null {
  const candidates = config.hotspots
    .filter((hotspot) => visibleLayers.includes(hotspot.layer))
    .map((hotspot) => ({
      hotspot,
      distance: Math.hypot(hotspot.x - point.x, hotspot.y - point.y),
      radius: hotspot.radius ?? DEFAULT_HOTSPOT_RADIUS,
    }))
    .filter((entry) => entry.distance <= entry.radius)
    // Deux zones peuvent se chevaucher : la plus proche du contact gagne.
    .sort((left, right) => left.distance - right.distance);
  return candidates[0]?.hotspot ?? null;
}

/** Vrai si la zone est active : sa couche doit être visible. */
export function isHotspotActive(
  hotspot: AnatomyHotspotConfig,
  visibleLayers: readonly AnatomyLayer[],
): boolean {
  return visibleLayers.includes(hotspot.layer);
}

export function selectHotspot(
  state: AnatomySelectionState,
  hotspotId: string,
): AnatomySelectionState {
  return { ...state, selectedHotspotId: hotspotId, missedTap: false };
}

export function registerMissedTap(state: AnatomySelectionState): AnatomySelectionState {
  return { ...state, selectedHotspotId: null, missedTap: true };
}

export function switchLayer(
  config: AnatomyQuestionConfig,
  state: AnatomySelectionState,
  layer: AnatomyLayer,
  corrected: boolean,
): AnatomySelectionState {
  if (!config.enabledLayers.includes(layer)) return state;
  // Le verrou tombe une fois la question corrigée : plus rien à protéger.
  const locked = corrected ? undefined : lockedLayerOf(config);
  return { ...state, visibleLayers: toggleLayer(state.visibleLayers, layer, locked) };
}

/* -------------------------------------------------------------------------- */
/* Zoom et recentrage                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Décalage borné pour que la planche ne sorte jamais du cadre. Les dimensions
 * sont fournies par l'appelant : le module reste sans DOM.
 */
export function clampOffset(
  offset: { x: number; y: number },
  zoom: number,
  size: { width: number; height: number },
): { x: number; y: number } {
  const maxX = size.width * (zoom - 1);
  const maxY = size.height * (zoom - 1);
  return {
    x: normalizeZero(clamp(offset.x, -maxX, 0)),
    y: normalizeZero(clamp(offset.y, -maxY, 0)),
  };
}

/** Sans zoom, `-maxX` vaut `-0` et le décalage sortirait en `-0`. */
const normalizeZero = (value: number) => (value === 0 ? 0 : value);

export function applyZoom(
  state: AnatomySelectionState,
  nextZoom: number,
  size: { width: number; height: number },
): AnatomySelectionState {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  return { ...state, zoom, offset: clampOffset(state.offset, zoom, size) };
}

/** Recentre sans changer le zoom — bouton de ciblage de la maquette. */
export function recenter(state: AnatomySelectionState): AnatomySelectionState {
  return { ...state, offset: { x: 0, y: 0 } };
}

/** Réinitialise zoom, décalage et couches : le bouton de remise à zéro. */
export function resetView(
  config: AnatomyQuestionConfig,
  state: AnatomySelectionState,
): AnatomySelectionState {
  return {
    ...state,
    zoom: MIN_ZOOM,
    offset: { x: 0, y: 0 },
    visibleLayers: initialVisibleLayers(config),
  };
}

/**
 * Position d'une zone à l'écran, en pourcentage du conteneur non transformé.
 *
 * Les coordonnées sont relatives : elles ne dépendent ni du zoom, ni de la
 * taille du conteneur. Le zoom est appliqué par une transformation du parent, et
 * la pastille conserve sa taille apparente par le contre-facteur `1/zoom`.
 */
export function hotspotStyle(hotspot: AnatomyHotspotConfig, zoom: number) {
  return {
    leftPercent: hotspot.x,
    topPercent: hotspot.y,
    counterScale: 1 / clamp(zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

/* -------------------------------------------------------------------------- */
/* Correction et révélation                                                  */
/* -------------------------------------------------------------------------- */

/**
 * État de correction d'une question.
 *
 * **La règle de gameplay est ici.** `revealed` est faux tant qu'aucune tentative
 * n'a été soumise, et tous les libellés en dépendent. Aucun composant ne peut
 * donc afficher un nom de zone avant la correction sans contourner ce module.
 */
export function correct(
  config: AnatomyQuestionConfig,
  state: AnatomySelectionState,
  submitted: boolean,
): AnatomyCorrectionState {
  const target = config.hotspots.find((hotspot) => hotspot.id === config.targetHotspotId);
  if (!target) {
    throw new Error(
      `La question ${config.id} désigne une zone attendue absente de ses hotspots : ${config.targetHotspotId}`,
    );
  }

  if (!submitted) {
    return {
      verdict: "pending",
      revealed: false,
      selectedHotspotId: state.selectedHotspotId,
      correctHotspotId: target.id,
      selectedLabel: null,
      correctLabel: target.label,
      explanation: null,
      statusMessage: state.selectedHotspotId
        ? "Zone sélectionnée. Valide pour connaître le résultat."
        : "Sélectionne une zone sur le schéma.",
    };
  }

  const selected = config.hotspots.find((hotspot) => hotspot.id === state.selectedHotspotId);
  const verdict = state.missedTap
    ? ("missed" as const)
    : selected?.id === target.id
      ? ("correct" as const)
      : ("incorrect" as const);

  const statusMessage =
    verdict === "correct"
      ? `Correct. ${target.label} est la bonne zone.`
      : verdict === "missed"
        ? `Aucune zone touchée. La bonne zone était ${target.label}.`
        : `Incorrect. Tu as désigné ${selected?.label ?? "une autre zone"} ; la bonne zone était ${target.label}.`;

  return {
    verdict,
    revealed: true,
    selectedHotspotId: state.selectedHotspotId,
    correctHotspotId: target.id,
    selectedLabel: selected?.label ?? null,
    correctLabel: target.label,
    explanation: config.explanation,
    statusMessage,
  };
}

/**
 * Libellé affichable d'une zone.
 *
 * Une zone garde son nom masqué tant que la question n'est pas corrigée **et**
 * qu'elle n'a pas déjà été trouvée dans la session. C'est la correction du
 * défaut relevé sur la maquette : à 4 zones trouvées sur 6, deux zones ne
 * doivent pas afficher leur nom.
 */
export function visibleLabel(
  hotspot: AnatomyHotspotConfig,
  correction: AnatomyCorrectionState,
  foundHotspotIds: readonly string[],
): string | null {
  if (correction.revealed) return hotspot.label;
  if (foundHotspotIds.includes(hotspot.id)) return hotspot.label;
  return null;
}

/** Libellé accessible d'une pastille : neutre avant révélation. */
export function hotspotAriaLabel(
  hotspot: AnatomyHotspotConfig,
  total: number,
  correction: AnatomyCorrectionState,
  foundHotspotIds: readonly string[],
): string {
  const label = visibleLabel(hotspot, correction, foundHotspotIds);
  if (label) return label;
  return `Zone ${hotspot.order} sur ${total}`;
}

/** Cartes de la rangée basse, libellés masqués tant qu'ils doivent l'être. */
export function answerOptions(
  config: AnatomyQuestionConfig,
  correction: AnatomyCorrectionState,
  foundHotspotIds: readonly string[],
): AnatomyAnswerOption[] {
  return [...config.hotspots]
    .sort((left, right) => left.order - right.order)
    .map((hotspot) => ({
      hotspotId: hotspot.id,
      order: hotspot.order,
      label: visibleLabel(hotspot, correction, foundHotspotIds),
      found: foundHotspotIds.includes(hotspot.id),
    }));
}

/** Marque une zone comme trouvée. Idempotent : rien ne se dé-trouve. */
export function markFound(foundHotspotIds: readonly string[], hotspotId: string): string[] {
  return foundHotspotIds.includes(hotspotId)
    ? [...foundHotspotIds]
    : [...foundHotspotIds, hotspotId];
}

/** Progression des zones trouvées sur les zones de la planche. */
export function progressOf(
  config: AnatomyQuestionConfig,
  foundHotspotIds: readonly string[],
): AnatomyProgress {
  const total = config.hotspots.length;
  const found = config.hotspots.filter((hotspot) => foundHotspotIds.includes(hotspot.id)).length;
  return {
    found,
    total,
    ratio: total === 0 ? 0 : found / total,
    label: `${found} / ${total} zones trouvées`,
  };
}

/** Vrai si la fiche pédagogique peut s'afficher pour cette zone. */
export function infoCardFor(config: AnatomyQuestionConfig, hotspotId: string) {
  return config.infoCards.find((card) => card.hotspotId === hotspotId);
}

/**
 * Vrai si le bouton `En savoir plus` doit apparaître. Une fiche sans
 * `knowledgeId` résoluble n'affiche pas de lien : mieux vaut aucun bouton qu'un
 * lien mort.
 */
export function canOpenKnowledge(
  config: AnatomyQuestionConfig,
  hotspotId: string,
  resolves: (knowledgeId: string) => boolean,
): boolean {
  const card = infoCardFor(config, hotspotId);
  if (!card?.knowledgeId) return false;
  return resolves(card.knowledgeId);
}
