/**
 * Contrats de l'anatomie interactive Medoca.
 *
 * Base commune des questions `anatomy_location` (dont l'ancien type d'import
 * `anatomy_click`). `ImageHotspot` reste réservé à `interactive_image` : une
 * photo annotée n'est pas une planche anatomique, et rien n'est gagné à forcer
 * la fusion.
 *
 * **Coordonnées.** Les configurations de ce module travaillent en pourcentage,
 * de 0 à 100, parce qu'un fichier écrit à la main est plus lisible ainsi. Les
 * 28 questions déjà en production stockent des fractions de 0 à 1 dans
 * `answer.detail` au format `"x,y"` : l'adaptateur convertit, et aucune question
 * n'est modifiée. Dans les deux cas la coordonnée est **relative**, donc stable
 * au redimensionnement, au zoom et au changement d'écran.
 */

/** Couches affichables d'une planche, du plus profond au plus superficiel. */
export const ANATOMY_LAYERS = ["skeleton", "organs", "vessels", "muscles", "skin"] as const;

export type AnatomyLayer = (typeof ANATOMY_LAYERS)[number];

export const ANATOMY_VIEWS = ["front", "back", "side"] as const;

export type AnatomyView = (typeof ANATOMY_VIEWS)[number];

/** Une zone cliquable de la planche. */
export interface AnatomyHotspotConfig {
  /** Identifiant stable. Les questions existantes utilisent `hotspot-<slug>`. */
  id: string;
  /** Nom de la structure. **Masqué tant que la question n'est pas corrigée.** */
  label: string;
  /** Abscisse relative, 0 à 100. */
  x: number;
  /** Ordonnée relative, 0 à 100. */
  y: number;
  /** Rayon de contact en pourcentage de la largeur. Défaut `DEFAULT_HOTSPOT_RADIUS`. */
  radius?: number;
  /** Couche à laquelle la structure appartient. */
  layer: AnatomyLayer;
  /** Numéro affiché sur la pastille. Attribué par ordre de déclaration. */
  order: number;
  /** Structure de référence, pour relier plusieurs questions à une même fiche. */
  targetOrganId?: string;
}

/** Une carte de réponse de la rangée basse. */
export interface AnatomyAnswerOption {
  hotspotId: string;
  order: number;
  /** Libellé, ou `null` tant que la zone n'est pas révélée. */
  label: string | null;
  /** Vignette de la structure, quand elle existe. */
  thumbnailSrc?: string;
  /** Vrai si la zone a déjà été trouvée dans cette session. */
  found: boolean;
}

/**
 * Rayon de contact par défaut, en pourcentage de la largeur.
 *
 * 7 % et non 6 % : sur un écran de 360 pixels, 6 % donnent 43 pixels de
 * diamètre, sous le minimum tactile de 44. Le rendu visuel de la pastille est
 * indépendant de ce rayon.
 */
export const DEFAULT_HOTSPOT_RADIUS = 7;

/** Bornes de zoom, reprises du composant existant. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/**
 * Nature de la validation des données affichées, reprise du modèle du Mode
 * Intervention V3. Une affirmation médicale porte sa provenance, ou porte la
 * mention qu'elle attend une validation.
 */
export const ANATOMY_TRUSTS = [
  "official_verified",
  "training_source",
  "internal_to_validate",
] as const;

export type AnatomyTrust = (typeof ANATOMY_TRUSTS)[number];

/** Un chiffre clé de la fiche pédagogique. */
export interface AnatomyFactStat {
  label: string;
  value: string;
  iconKey: string;
}

/** Fiche affichée après correction. */
export interface AnatomyInfoCard {
  hotspotId: string;
  title: string;
  description: string;
  stats: AnatomyFactStat[];
  /** Fiche de bibliothèque. `En savoir plus` n'apparaît que si elle se résout. */
  knowledgeId: string | null;
  trust: AnatomyTrust;
  /** Obligatoire dès que `trust` vaut `internal_to_validate`. */
  reviewNote: string | null;
}

/** Configuration complète d'une question anatomique. */
export interface AnatomyQuestionConfig {
  id: string;
  /** Titre de la leçon, affiché en barre haute. */
  title: string;
  /** Sous-titre du parcours. */
  subtitle?: string;
  /** Consigne courte : « Clique sur le cœur ». */
  instruction: string;
  /** Phrase d'action : « Sélectionne la zone demandée sur le schéma. » */
  actionHint: string;
  /** Nom de la structure attendue, pour la consigne. */
  targetLabel: string;
  /** Identifiant de la zone attendue. */
  targetHotspotId: string;
  plateId: string;
  view: AnatomyView;
  /** Couches que le joueur peut basculer sur cette question. */
  enabledLayers: AnatomyLayer[];
  /** Couches visibles à l'ouverture. */
  visibleLayers: AnatomyLayer[];
  hotspots: AnatomyHotspotConfig[];
  /** Explication courte, affichée dans le panneau de retour après réponse. */
  explanation: string;
  /** Fiches par zone. Une zone sans fiche n'en affiche pas. */
  infoCards: AnatomyInfoCard[];
}

/** Ce que le joueur a fait, avant toute correction. */
export interface AnatomySelectionState {
  /** Zone touchée, ou `null`. */
  selectedHotspotId: string | null;
  /** Vrai quand le contact est tombé hors de toute zone. */
  missedTap: boolean;
  visibleLayers: AnatomyLayer[];
  view: AnatomyView;
  zoom: number;
  offset: { x: number; y: number };
  /** Zones trouvées depuis le début de la session de leçon. */
  foundHotspotIds: string[];
}

export type AnatomyVerdict = "pending" | "correct" | "incorrect" | "missed";

/** Ce que l'interface doit afficher après une tentative. */
export interface AnatomyCorrectionState {
  verdict: AnatomyVerdict;
  /** Vrai dès qu'une tentative a été soumise : c'est ce qui lève les libellés. */
  revealed: boolean;
  selectedHotspotId: string | null;
  /** Toujours renseigné après correction, pour montrer la bonne zone. */
  correctHotspotId: string;
  /** Libellé de la zone touchée, ou `null` avant correction. */
  selectedLabel: string | null;
  correctLabel: string;
  explanation: string | null;
  /** Message d'état, destiné à `role="status"`. Ne dépend pas de la couleur. */
  statusMessage: string;
}

/** Progression des zones trouvées, telle qu'affichée en barre haute. */
export interface AnatomyProgress {
  found: number;
  total: number;
  ratio: number;
  /** « 4 / 6 zones trouvées ». */
  label: string;
}

/* -------------------------------------------------------------------------- */
/* Planches et actifs                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Une couche d'une vue. `src` et `fallbackSrc` sont des chemins déclarés : les
 * images ne sont **pas** livrées dans ce lot, et `available: false` le dit.
 */
export interface AnatomyLayerAsset {
  layer: AnatomyLayer;
  /** AVIF, format prioritaire. */
  src: string;
  /** WebP, repli. */
  fallbackSrc: string;
  /** Vrai seulement quand le fichier existe réellement dans le dépôt. */
  available: boolean;
  /** Opacité par défaut. La peau reste translucide au-dessus des autres. */
  defaultOpacity: number;
  /** Budget maximal en kilooctets, vérifié en revue. */
  maxWeightKb: number;
}

export interface AnatomyPlateView {
  view: AnatomyView;
  label: string;
  /** Vignette de la mini-vue. */
  thumbnailSrc: string | null;
  /** Rapport largeur / hauteur, pour réserver la place avant chargement. */
  aspectRatio: number;
  layers: AnatomyLayerAsset[];
}

export interface AnatomyPlate {
  id: string;
  label: string;
  views: AnatomyPlateView[];
}

/** Budgets d'actifs, opposables en revue. */
export const LAYER_WEIGHT_BUDGET_KB = 250;
export const VIEW_WEIGHT_BUDGET_KB = 1200;
