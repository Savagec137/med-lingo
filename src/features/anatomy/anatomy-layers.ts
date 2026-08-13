import { ANATOMY_LAYERS, type AnatomyLayer } from "./anatomy-domain.ts";

/** Libellés affichés dans le panneau « Affichage ». */
export const LAYER_LABELS: Record<AnatomyLayer, string> = {
  skeleton: "Squelette",
  organs: "Organes",
  vessels: "Vaisseaux",
  muscles: "Muscles",
  skin: "Peau",
};

/**
 * Ordre d'empilement, du plus profond au plus superficiel. La peau est dessinée
 * en dernier et reste translucide dès qu'une couche plus profonde est visible,
 * sinon la planche devient une silhouette opaque.
 */
export const LAYER_STACK_ORDER: readonly AnatomyLayer[] = ANATOMY_LAYERS;

/** Ordre d'affichage du panneau, du superficiel au profond, comme la maquette. */
export const LAYER_PANEL_ORDER: readonly AnatomyLayer[] = [
  "skin",
  "muscles",
  "skeleton",
  "organs",
  "vessels",
];

export const layerIndex = (layer: AnatomyLayer) => LAYER_STACK_ORDER.indexOf(layer);

/**
 * Couche de chaque structure connue des questions existantes.
 *
 * Les 23 identifiants proviennent des 28 questions `anatomy_location` déjà en
 * production, relevés dans `answer.id` sous la forme `hotspot-<slug>`. Aucune
 * question ne déclare de couche : cette table est la seule source, et
 * `layerForSlug` échoue explicitement sur un identifiant inconnu plutôt que de
 * retomber sur une valeur par défaut — un point sans couche serait invisible ou
 * mal rangé sans que personne s'en aperçoive.
 */
export const LAYER_BY_SLUG: Record<string, AnatomyLayer> = {
  // Organes
  heart: "organs",
  left_ventricle: "organs",
  lungs: "organs",
  alveolus: "organs",
  brain: "organs",
  spinal_cord: "organs",
  stomach: "organs",
  small_intestine: "organs",
  kidney: "organs",
  kidneys: "organs",
  right_kidney: "organs",
  thyroid: "organs",
  adrenal_glands: "organs",
  // Muscles
  diaphragm: "muscles",
  biceps: "muscles",
  // Squelette
  femur: "skeleton",
  knee: "skeleton",
  // Régions : rattachées à la peau, seule couche qui les rende repérables de
  // l'extérieur. Une région n'est pas un organe.
  thorax: "skin",
  abdomen: "skin",
  thoracic_cavity: "skin",
  abdominal_cavity: "skin",
  left_upper_limb: "skin",
  right_upper_limb: "skin",
};

/** Extrait le slug d'un identifiant de zone, avec ou sans le préfixe `hotspot-`. */
export function slugOfHotspotId(hotspotId: string): string {
  return hotspotId.startsWith("hotspot-") ? hotspotId.slice("hotspot-".length) : hotspotId;
}

export function findLayerForSlug(slug: string): AnatomyLayer | undefined {
  return LAYER_BY_SLUG[slug];
}

/** Couche d'une structure. Lève sur un identifiant absent de la table. */
export function layerForSlug(slug: string): AnatomyLayer {
  const layer = LAYER_BY_SLUG[slug];
  if (!layer) {
    throw new Error(
      `Structure anatomique sans couche déclarée : « ${slug} ». Ajoute-la dans LAYER_BY_SLUG.`,
    );
  }
  return layer;
}

export const layerForHotspotId = (hotspotId: string) => layerForSlug(slugOfHotspotId(hotspotId));

/**
 * Couches visibles après bascule, en conservant l'ordre d'empilement.
 *
 * La couche qui porte la zone attendue ne peut pas être masquée tant que la
 * question n'est pas corrigée : sans cette garde, le joueur pourrait rendre la
 * question insoluble.
 */
export function toggleLayer(
  visible: readonly AnatomyLayer[],
  layer: AnatomyLayer,
  lockedLayer?: AnatomyLayer,
): AnatomyLayer[] {
  if (layer === lockedLayer && visible.includes(layer)) return [...visible];
  const next = visible.includes(layer)
    ? visible.filter((entry) => entry !== layer)
    : [...visible, layer];
  return LAYER_STACK_ORDER.filter((entry) => next.includes(entry));
}

/** Vrai si la couche est verrouillée parce qu'elle porte la zone attendue. */
export const isLayerLocked = (layer: AnatomyLayer, lockedLayer?: AnatomyLayer) =>
  layer === lockedLayer;
