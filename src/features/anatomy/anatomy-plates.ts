/**
 * Registre des planches anatomiques.
 *
 * **Aucune image n'est livrée dans ce lot.** Les chemins sont déclarés et
 * `available: false` le dit : le composant doit se replier sur la planche
 * vectorielle existante tant qu'un actif n'est pas présent. C'est ce qui permet
 * de poser l'architecture sans alourdir le paquet de quinze images.
 *
 * Coût, et raison du repli. Cinq couches par vue, trois vues, font quinze images
 * en pleine définition. À 400 Ko l'image, une planche pèse six mégaoctets, ce qui
 * est inacceptable sur un réseau mobile. D'où les budgets de
 * `anatomy-domain.ts`, le chargement à la demande, et une seule vue préparée.
 */

import {
  ANATOMY_LAYERS,
  LAYER_WEIGHT_BUDGET_KB,
  type AnatomyLayer,
  type AnatomyLayerAsset,
  type AnatomyPlate,
  type AnatomyPlateView,
  type AnatomyView,
} from "./anatomy-domain.ts";

const ASSET_ROOT = "/anatomy";

/** Opacité par défaut : la peau laisse voir ce qu'elle recouvre. */
const DEFAULT_OPACITY: Record<AnatomyLayer, number> = {
  skeleton: 1,
  organs: 1,
  vessels: 1,
  muscles: 0.9,
  skin: 0.35,
};

function layerAsset(view: AnatomyView, layer: AnatomyLayer): AnatomyLayerAsset {
  const base = `${ASSET_ROOT}/${view}_${layer}`;
  return {
    layer,
    src: `${base}.avif`,
    fallbackSrc: `${base}.webp`,
    // Aucun fichier n'est présent : le lot pose la structure, pas les actifs.
    available: false,
    defaultOpacity: DEFAULT_OPACITY[layer],
    maxWeightKb: LAYER_WEIGHT_BUDGET_KB,
  };
}

function plateView(view: AnatomyView, label: string): AnatomyPlateView {
  return {
    view,
    label,
    thumbnailSrc: null,
    // Rapport de la planche vectorielle existante : 200 × 300.
    aspectRatio: 2 / 3,
    layers: ANATOMY_LAYERS.map((layer) => layerAsset(view, layer)),
  };
}

/**
 * Planche du corps entier. Seule la vue de face est préparée pour le pilote ;
 * les deux autres sont déclarées pour que le sélecteur puisse les annoncer
 * comme à venir plutôt que de les faire disparaître.
 */
export const FULL_BODY_PLATE: AnatomyPlate = {
  id: "plate.full-body",
  label: "Corps entier",
  views: [
    plateView("front", "Vue de face"),
    plateView("back", "Vue de dos"),
    plateView("side", "Vue de profil"),
  ],
};

export const ANATOMY_PLATES: readonly AnatomyPlate[] = [FULL_BODY_PLATE];

const platesById = new Map(ANATOMY_PLATES.map((plate) => [plate.id, plate]));

export const findPlate = (plateId: string) => platesById.get(plateId);

export function getPlate(plateId: string): AnatomyPlate {
  const plate = platesById.get(plateId);
  if (!plate) throw new Error(`Planche anatomique inconnue : ${plateId}`);
  return plate;
}

export function findPlateView(plateId: string, view: AnatomyView) {
  return getPlate(plateId).views.find((entry) => entry.view === view);
}

export function getPlateView(plateId: string, view: AnatomyView): AnatomyPlateView {
  const found = findPlateView(plateId, view);
  if (!found) throw new Error(`Vue « ${view} » absente de la planche ${plateId}`);
  return found;
}

/** Vues réellement jouables : celles dont au moins une couche existe. */
export const availableViews = (plateId: string) =>
  getPlate(plateId).views.filter((view) => view.layers.some((layer) => layer.available));

/** Vues déclarées mais sans actif : annoncées « bientôt disponible ». */
export const announcedViews = (plateId: string) =>
  getPlate(plateId).views.filter((view) => !view.layers.some((layer) => layer.available));

/**
 * Couches à charger pour un état d'affichage donné.
 *
 * Seules les couches visibles **et** disponibles sont demandées : activer une
 * couche masquée déclenche son chargement, jamais le démarrage de l'écran.
 */
export function layersToLoad(
  plateId: string,
  view: AnatomyView,
  visibleLayers: readonly AnatomyLayer[],
): AnatomyLayerAsset[] {
  return getPlateView(plateId, view).layers.filter(
    (layer) => layer.available && visibleLayers.includes(layer.layer),
  );
}

/** Vrai quand la planche doit se replier sur le rendu vectoriel existant. */
export const needsVectorFallback = (plateId: string, view: AnatomyView) =>
  getPlateView(plateId, view).layers.every((layer) => !layer.available);
