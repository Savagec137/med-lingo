/**
 * Contrats du moteur physiologique.
 *
 * Le moteur répond à une question et une seule : **que valent les constantes de
 * ce patient à l'instant t ?** Il ne sait rien du joueur, des écrans, ni de ce
 * qui est autorisé à l'affichage — cette séparation est ce qui permet de le
 * tester seul, et ce qui interdit à un composant de l'interroger directement.
 *
 * Trois principes portés par ces types :
 *
 * 1. **Fonction du temps, pas machine à pas.** Une constante n'est pas une
 *    variable que l'on fait avancer d'un tour à l'autre : c'est `valeur(t)`.
 *    Deux échantillonnages du même instant donnent le même chiffre, et rejouer
 *    la mission depuis le début redonne exactement la même courbe.
 *
 * 2. **Aucun `Math.random`.** Le bruit vient d'une graine, et la graine vient de
 *    la session. Sans cela, aucun test ne pourrait affirmer « la SpO₂ ne saute
 *    pas de plus de deux points sans événement ».
 *
 * 3. **Continu ou instantané, jamais les deux.** Une saturation se surveille, une
 *    tension se prend. Animer une tension en continu inventerait un appareil qui
 *    n'existe pas dans une ambulance.
 */

import type { InterventionVitalKey } from "../clinical/intervention-vitals.ts";

/**
 * Les constantes que le moteur fait vivre.
 *
 * Ce sont les clés du moteur clinique historique, délibérément reprises telles
 * quelles : introduire un second vocabulaire (`heartRate` d'un côté, `hr` de
 * l'autre) obligerait à traduire à chaque frontière, et une traduction est un
 * endroit où l'on se trompe.
 */
export const VITAL_SIGNALS = [
  "hr",
  "sbp",
  "dbp",
  "spo2",
  "rr",
  "temperature",
  "gcs",
  "pain",
  "glycemia",
] as const satisfies readonly InterventionVitalKey[];

export type VitalSignal = (typeof VITAL_SIGNALS)[number];

/**
 * Comment une constante se lit sur le terrain.
 *
 * `continuous` : un capteur reste en place et la valeur vit sous les yeux de
 * l'équipe — saturation, pouls.
 *
 * `snapshot` : la mesure est un acte ponctuel qui donne un chiffre daté —
 * tension au brassard, glycémie capillaire, température. La valeur affichée
 * reste celle du moment de la prise, même si le patient a changé depuis.
 */
export const MONITORING_MODES = ["continuous", "snapshot"] as const;

export type MonitoringMode = (typeof MONITORING_MODES)[number];

/**
 * Trajectoire clinique du patient.
 *
 * Elle décide **vers quoi** les constantes se dirigent, jamais de leur valeur
 * instantanée. Un patient qui se dégrade lentement n'a pas des constantes
 * anormales : il a des constantes qui glissent.
 */
export const CLINICAL_TRENDS = [
  "stable",
  "improving",
  "slow_deterioration",
  "rapid_deterioration",
  "critical",
] as const;

export type ClinicalTrend = (typeof CLINICAL_TRENDS)[number];

/** Ordre de gravité, pour aggraver ou améliorer d'un cran. */
export const TREND_SEVERITY_ORDER: readonly ClinicalTrend[] = [
  "improving",
  "stable",
  "slow_deterioration",
  "rapid_deterioration",
  "critical",
];

/**
 * Qualité du signal d'un capteur.
 *
 * Elle décrit l'appareil, jamais le patient : un capteur mal placé donne un
 * mauvais signal sur un patient qui va bien. C'est ce qui rend ces états sûrs —
 * ils n'apprennent rien sur la clinique.
 */
export const SIGNAL_QUALITIES = ["good", "weak", "artifact", "measuring", "lost"] as const;

export type SignalQuality = (typeof SIGNAL_QUALITIES)[number];

export const SIGNAL_QUALITY_LABELS: Record<SignalQuality, string> = {
  good: "Signal correct",
  weak: "Signal faible — repositionner le capteur",
  artifact: "Mouvement du patient — tracé irrégulier",
  measuring: "Mesure en cours",
  lost: "Aucun signal",
};

/** Conscience à l'échelle AVPU, du plus éveillé au moins réactif. */
export const AVPU_LEVELS = ["alert", "verbal", "pain", "unresponsive"] as const;

export type AvpuLevel = (typeof AVPU_LEVELS)[number];

export const AVPU_LABELS: Record<AvpuLevel, string> = {
  alert: "Alerte (A)",
  verbal: "Réagit à la voix (V)",
  pain: "Réagit à la douleur (P)",
  unresponsive: "Aucune réaction (U)",
};

/**
 * État de départ d'un patient simulé.
 *
 * Les valeurs de base sont celles d'un patient **au moment où l'équipe arrive**.
 * Ce ne sont pas des valeurs normales : un patient en détresse arrive avec une
 * saturation basse, et c'est sa base.
 */
export interface PhysiologyProfile {
  id: string;
  label: string;
  ageBand: "adult" | "child";
  baselineSpO2: number;
  baselineHeartRate: number;
  baselineRespiratoryRate: number;
  baselineSystolic: number;
  baselineDiastolic: number;
  /** En mmol/L, unité de stockage du moteur clinique. */
  baselineGlucose: number;
  baselineTemperature: number;
  consciousnessLevel: AvpuLevel;
  /** Score de Glasgow réel. Jamais lisible sans évaluation complète. */
  glasgow: number;
  /** Échelle numérique 0–10. */
  painLevel: number;
  /** 0 = état précaire, 1 = patient solide. Module l'amplitude des dérives. */
  clinicalStability: number;
  trend: ClinicalTrend;
  /**
   * Vrai quand une oxygénothérapie est cliniquement indiquée. C'est ce qui décide
   * si poser l'oxygène améliore la saturation ou ne change rien : administrer de
   * l'oxygène à un patient qui sature à 98 % ne le fait pas monter à 100 %.
   */
  oxygenIndicated: boolean;
}

/**
 * Un infléchissement de trajectoire, daté.
 *
 * Le moteur ne garde pas d'état muté : il garde la **liste de ce qui est
 * arrivé**, et recalcule. Un événement à la minute quatre produit exactement le
 * même effet qu'on l'évalue à la minute cinq ou en rejouant la mission un mois
 * plus tard.
 */
export interface PhysiologyEvent {
  atSeconds: number;
  kind: PhysiologyEventKind;
  /** Ce qui l'a provoqué, pour la relecture. Jamais affiché au joueur. */
  cause: string;
}

export const PHYSIOLOGY_EVENT_KINDS = [
  "oxygen_started",
  "oxygen_stopped",
  "reassured",
  "immobilised",
  "positioned",
  "sugar_given",
  "warmed",
  "dangerous_act",
  "deterioration",
] as const;

export type PhysiologyEventKind = (typeof PHYSIOLOGY_EVENT_KINDS)[number];

/**
 * L'état complet du patient simulé.
 *
 * Trois champs, et aucune constante courante : il n'y a **rien à lire** dans cet
 * objet. Les valeurs n'existent qu'au moment où on les demande pour un instant
 * donné, ce qui retire toute possibilité d'en apercevoir une par inadvertance.
 */
export interface PhysiologyState {
  profile: PhysiologyProfile;
  /** Graine de la session. Deux sessions de même graine sont identiques. */
  seed: number;
  events: PhysiologyEvent[];
}

/**
 * Ce que l'interface a le droit de savoir d'une constante surveillée.
 *
 * Aucun champ ne porte de valeur cachée : `value` n'existe que si le joueur a
 * relevé la constante, et `waveform` n'est renseignée que si un capteur est en
 * place. Un composant qui recevrait cet objet sans mesure préalable n'y
 * trouverait que des absences.
 */
export interface LiveVitalView {
  signal: VitalSignal;
  factId: string;
  label: string;
  /** Valeur formatée, unité exclue. Nulle tant que rien n'a été relevé. */
  value: string | null;
  numericValue: number | null;
  unit: string | null;
  isMeasured: boolean;
  /** Un capteur en place tient cette valeur à jour à cet instant. */
  isLive: boolean;
  isStale: boolean;
  signalQuality: SignalQuality;
  /** Sens du dernier mouvement observable. `stable` tant qu'il n'y a rien à comparer. */
  trendDirection: "up" | "down" | "stable";
  severity: "normal" | "warning" | "critical";
}

/**
 * Un tracé prêt à dessiner : des points dans [-1, 1], sans unité ni valeur.
 *
 * Le tracé est calculé par le moteur et non par le composant. Un composant qui
 * fabriquerait sa propre onde aurait besoin de la fréquence réelle du patient, et
 * la lui donner rouvrirait exactement la porte que le mode ferme.
 */
export interface WaveformTrace {
  /** Points normalisés. Vide quand rien n'est surveillé. */
  points: number[];
  /** Durée couverte par le tracé, en secondes. */
  windowSeconds: number;
  quality: SignalQuality;
  /**
   * Cadence du tracé. Elle vient toujours d'une **mesure du joueur**, jamais du
   * moteur : sans mesure, pas de tracé, parce qu'une onde qui bat à la bonne
   * fréquence révèle cette fréquence aussi sûrement qu'un chiffre.
   */
  ratePerMinute: number | null;
}

/** Un capteur en place, tel que le moniteur le présente. */
export interface AttachedSensorView {
  equipment: string;
  label: string;
  quality: SignalQuality;
  qualityLabel: string;
  /** Depuis combien de secondes le capteur est en place. */
  attachedForSeconds: number;
  acquiring: boolean;
}

/**
 * L'état du moniteur, tel qu'un soignant le lit en levant les yeux.
 *
 * `statusLabel` ne dit jamais rien du patient — « saturomètre non posé »,
 * « acquisition du signal ». Un bandeau qui annoncerait « patient stable »
 * offrirait la conclusion que le joueur doit tirer lui-même.
 */
export interface MonitoringStateView {
  anyLive: boolean;
  sensors: AttachedSensorView[];
  /**
   * Les constantes surveillées en direct.
   *
   * Nommées `liveVitals` et non `vitals` : `vitals` est le champ caché de la
   * session, celui qui porte les constantes réelles. Une garde interdit d'y
   * accéder depuis un écran, et elle le fait sans regarder le type de l'objet —
   * délibérément, parce qu'un contrôle qui distinguerait les provenances se
   * laisserait contourner. Deux champs homonymes obligeraient donc à
   * l'assouplir ; le nom cède, pas la garde.
   */
  liveVitals: LiveVitalView[];
  statusLabel: string;
}

export interface WaveformStateView {
  pulse: WaveformTrace;
  respiration: WaveformTrace;
}

/** Une mesure que le temps a périmée. Affichée, mais nommée comme datée. */
export interface StaleVitalView {
  factId: string;
  label: string;
  ageSeconds: number;
  freshnessSeconds: number;
  /** Ce que la carte affiche sous la valeur périmée. */
  noticeLabel: string;
}

/**
 * Tout ce que l'interface reçoit de la physiologie, en un seul objet.
 *
 * Le regrouper permet à un écran de le déclarer en un paramètre, et surtout de le
 * rendre **facultatif** : un modèle d'écran doit rester juste sans surveillance,
 * parce que c'est l'état d'un début d'intervention.
 */
export interface MonitoringSnapshot {
  /** Instant auquel l'instantané a été pris, en secondes simulées. */
  atSeconds: number;
  monitoring: MonitoringStateView;
  waveform: WaveformStateView;
  stale: StaleVitalView[];
}

/** Bornes physiologiques et pas d'échantillonnage d'une constante. */
export interface SignalDynamics {
  mode: MonitoringMode;
  /** Amplitude du bruit autour de la cible, dans l'unité de la constante. */
  noiseAmplitude: number;
  /** Période du bruit : plus elle est longue, plus la constante dérive lentement. */
  noisePeriodSeconds: number;
  /** Décimales conservées à l'affichage. */
  decimals: number;
  /** Bornes absolues, au-delà desquelles une valeur cesse d'être plausible. */
  bounds: [number, number];
  /**
   * Écart maximal admis entre deux échantillons consécutifs hors événement.
   * Sert de contrat testable : « la SpO₂ ne saute pas de 98 à 84 ».
   */
  maxStepPerSample: number;
}
