/**
 * Modèle clinique des constantes du Mode Intervention.
 *
 * Portage du moteur physiologique de `features/garde/garde-vitals.ts` vers le
 * Mode Intervention, avec trois ajouts nécessaires au parcours DEA :
 *  - la température, absente du moteur de garde ;
 *  - la pression artérielle diastolique, pour afficher une vraie tension ;
 *  - des seuils et des cibles adaptés à l'âge (adulte / enfant), pour ne pas
 *    ramener la fréquence respiratoire d'un enfant vers une valeur adulte.
 *
 * Le module est pur : aucune dépendance React, aucun aléa, aucune entrée/sortie.
 * Les valeurs de complément (celles qu'aucun scénario ne fournit) sont
 * regroupées dans `FAMILY_BASELINES` pour rester relisables par un formateur.
 */

export const INTERVENTION_VITAL_KEYS = [
  "hr",
  "sbp",
  "dbp",
  "spo2",
  "rr",
  "temperature",
  "gcs",
  "pain",
  "glycemia",
] as const;

export type InterventionVitalKey = (typeof INTERVENTION_VITAL_KEYS)[number];

/** Les constantes affichables : la tension regroupe systolique et diastolique. */
export const DISPLAYED_VITALS = [
  "hr",
  "sbp",
  "spo2",
  "rr",
  "temperature",
  "gcs",
  "pain",
  "glycemia",
] as const;

export type DisplayedVital = (typeof DISPLAYED_VITALS)[number];

export type InterventionVitals = Record<InterventionVitalKey, number>;
export type VitalSeverity = "normal" | "warning" | "critical";
export type VitalTrend = "up" | "down" | "stable";
export type AgeBand = "adult" | "child";

export interface VitalAlert {
  key: DisplayedVital;
  label: string;
  severity: VitalSeverity;
  value: string;
  message: string;
}

export interface VitalReading {
  key: DisplayedVital;
  label: string;
  value: string;
  severity: VitalSeverity;
  trend: VitalTrend;
  delta: string;
}

/** Contexte clinique d'un scénario : ce dont le moteur a besoin pour faire évoluer un patient. */
export interface InterventionClinicalProfile {
  ageBand: AgeBand;
  cardiacArrest: boolean;
  glycemiaRelevant: boolean;
  baseline: InterventionVitals;
}

/** Bornes physiologiques absolues (survie basse / plafond de mesure). */
const BOUNDS: Record<InterventionVitalKey, [number, number]> = {
  hr: [0, 220],
  sbp: [0, 240],
  dbp: [0, 150],
  // 0 % correspond à l'absence de signal du saturomètre, situation de l'arrêt
  // cardio-respiratoire ; un patient perfusé ne descend jamais à ce niveau.
  spo2: [0, 100],
  rr: [0, 70],
  temperature: [28, 42.5],
  gcs: [3, 15],
  pain: [0, 10],
  glycemia: [0.5, 30],
};

interface Threshold {
  label: string;
  critical: (value: number) => boolean;
  warning: (value: number) => boolean;
  message: (value: number) => string;
}

const ADULT_THRESHOLDS: Record<DisplayedVital, Threshold> = {
  hr: {
    label: "FC",
    critical: (v) => v < 40 || v > 130,
    warning: (v) => v < 50 || v > 110,
    message: (v) =>
      v < 50
        ? `FC ${Math.round(v)} /min — bradycardie possiblement mal tolérée, surveillance rapprochée et bilan au médecin régulateur.`
        : `FC ${Math.round(v)} /min — tachycardie : rechercher hypovolémie, douleur, hypoxie ou fièvre.`,
  },
  sbp: {
    label: "TA",
    critical: (v) => v < 90 || v >= 180,
    warning: (v) => v < 100 || v >= 160,
    message: (v) =>
      v < 100
        ? `PAS ${Math.round(v)} mmHg — hypotension, risque de choc : installation adaptée et avis médical sans délai.`
        : `PAS ${Math.round(v)} mmHg — poussée tensionnelle, surveillance neurologique rapprochée.`,
  },
  spo2: {
    label: "SpO₂",
    critical: (v) => v < 90,
    warning: (v) => v < 94,
    message: (v) =>
      `SpO₂ ${Math.round(v)} % — hypoxémie : oxygénothérapie à adapter selon le protocole et réévaluation immédiate.`,
  },
  rr: {
    label: "FR",
    critical: (v) => v < 8 || v > 30,
    warning: (v) => v < 12 || v > 24,
    message: (v) =>
      v < 12
        ? `FR ${Math.round(v)} /min — bradypnée : préparer l'assistance ventilatoire.`
        : `FR ${Math.round(v)} /min — polypnée, signe de détresse respiratoire.`,
  },
  temperature: {
    label: "Température",
    critical: (v) => v < 35 || v >= 40,
    warning: (v) => v < 36 || v >= 38.5,
    message: (v) =>
      v < 36
        ? `Température ${formatTemperature(v)} — hypothermie : lutte active contre le refroidissement.`
        : `Température ${formatTemperature(v)} — hyperthermie, à transmettre avec son évolution.`,
  },
  gcs: {
    label: "Glasgow",
    critical: (v) => v <= 8,
    warning: (v) => v < 14,
    message: (v) =>
      v <= 8
        ? `Glasgow ${Math.round(v)}/15 — coma : liberté des voies aériennes et position adaptée en priorité.`
        : `Glasgow ${Math.round(v)}/15 — trouble de conscience : réévaluer toutes les cinq minutes.`,
  },
  pain: {
    label: "Douleur",
    critical: (v) => v >= 8,
    warning: (v) => v >= 6,
    message: (v) =>
      `EVA ${Math.round(v)}/10 — douleur intense : installation antalgique et transmission à la régulation.`,
  },
  glycemia: {
    label: "Glycémie",
    critical: (v) => v < 3 || v > 20,
    warning: (v) => v < 4 || v > 15,
    message: (v) =>
      v < 4
        ? `Glycémie ${formatGlycemia(v)} — hypoglycémie : appliquer le protocole de resucrage.`
        : `Glycémie ${formatGlycemia(v)} — hyperglycémie à transmettre avec les signes associés.`,
  },
};

/** Adaptations pédiatriques (enfant d'âge scolaire) sur les paramètres âge-dépendants. */
const CHILD_OVERRIDES: Partial<Record<DisplayedVital, Pick<Threshold, "critical" | "warning">>> = {
  hr: { critical: (v) => v < 70 || v > 160, warning: (v) => v < 80 || v > 140 },
  sbp: { critical: (v) => v < 75 || v >= 140, warning: (v) => v < 85 || v >= 125 },
  rr: { critical: (v) => v < 15 || v > 45, warning: (v) => v < 20 || v > 35 },
};

export function vitalThreshold(key: DisplayedVital, band: AgeBand): Threshold {
  const base = ADULT_THRESHOLDS[key];
  if (band === "adult") return base;
  const override = CHILD_OVERRIDES[key];
  return override ? { ...base, ...override } : base;
}

export function vitalSeverity(key: DisplayedVital, value: number, band: AgeBand): VitalSeverity {
  const threshold = vitalThreshold(key, band);
  if (threshold.critical(value)) return "critical";
  if (threshold.warning(value)) return "warning";
  return "normal";
}

const SEVERITY_RANK: Record<VitalSeverity, number> = { normal: 0, warning: 1, critical: 2 };

/** Valeurs de référence d'un patient stable, par tranche d'âge. */
const HEALTHY: Record<AgeBand, InterventionVitals> = {
  adult: {
    hr: 78,
    sbp: 125,
    dbp: 78,
    spo2: 98,
    rr: 15,
    temperature: 37,
    gcs: 15,
    pain: 1,
    glycemia: 5.5,
  },
  child: {
    hr: 100,
    sbp: 100,
    dbp: 62,
    spo2: 98,
    rr: 26,
    temperature: 37,
    gcs: 15,
    pain: 1,
    glycemia: 5,
  },
};

/** Vitesse de convergence de chaque paramètre, par minute simulée. */
const RESPONSE_RATE: Record<InterventionVitalKey, number> = {
  hr: 0.18,
  sbp: 0.12,
  dbp: 0.12,
  spo2: 0.22,
  rr: 0.2,
  temperature: 0.06,
  gcs: 0.1,
  pain: 0.16,
  glycemia: 0.14,
};

function clampVital(key: InterventionVitalKey, value: number): number {
  const [min, max] = BOUNDS[key];
  return Math.min(max, Math.max(min, value));
}

function approach(key: InterventionVitalKey, value: number, target: number, minutes: number) {
  const factor = 1 - Math.exp(-RESPONSE_RATE[key] * Math.max(0.5, minutes));
  return value + (target - value) * factor;
}

/**
 * État visé par un patient ayant repris une activité circulatoire : perfusion
 * rétablie mais précaire, conscience encore altérée.
 */
function postRoscAnchor(profile: InterventionClinicalProfile): InterventionVitals {
  return {
    hr: 110,
    sbp: 105,
    dbp: 65,
    spo2: 94,
    rr: 20,
    temperature: profile.baseline.temperature,
    gcs: 9,
    pain: 0,
    glycemia: profile.baseline.glycemia,
  };
}

/** Trajectoire spontanée d'un patient laissé sans prise en charge adaptée. */
function worsenedFrom(baseline: InterventionVitals): InterventionVitals {
  return {
    hr: baseline.hr < 55 ? baseline.hr - 15 : baseline.hr + 35,
    sbp: baseline.sbp < 110 ? baseline.sbp - 25 : baseline.sbp + 20,
    dbp: baseline.dbp < 70 ? baseline.dbp - 18 : baseline.dbp + 12,
    spo2: baseline.spo2 - 12,
    rr: baseline.rr < 12 ? baseline.rr - 5 : baseline.rr + 12,
    temperature:
      baseline.temperature >= 38
        ? baseline.temperature + 1
        : baseline.temperature < 36
          ? baseline.temperature - 0.8
          : baseline.temperature + 0.3,
    gcs: baseline.gcs - 5,
    pain: baseline.pain + 3,
    glycemia: baseline.glycemia < 4 ? baseline.glycemia - 1.2 : baseline.glycemia + 2,
  };
}

/**
 * Cible visée par le patient selon la qualité de la prise en charge :
 * 0 → aggravation, 0,5 → statu quo, 1 → récupération.
 */
function targetsFor(
  profile: InterventionClinicalProfile,
  quality: number,
  postRosc: boolean,
): InterventionVitals {
  const healthy = HEALTHY[profile.ageBand];
  // Après un RACS, l'état de référence n'est plus l'arrêt : viser un patient
  // réanimé fragile, sinon la trajectoire repartirait d'un patient sans débit.
  const base = postRosc ? postRoscAnchor(profile) : profile.baseline;
  const recovered: InterventionVitals = postRosc ? postRoscAnchor(profile) : healthy;
  const worsened = worsenedFrom(base);
  const up = Math.min(1, Math.max(0, (quality - 0.5) * 2));
  const down = Math.min(1, Math.max(0, (0.5 - quality) * 2));
  const mix = (good: number, neutral: number, bad: number) =>
    good * up + neutral * (1 - up - down) + bad * down;

  return INTERVENTION_VITAL_KEYS.reduce((accumulator, key) => {
    accumulator[key] = mix(recovered[key], base[key], worsened[key]);
    return accumulator;
  }, {} as InterventionVitals);
}

export interface EvolveContext {
  /** Qualité de la prise en charge sur la période, de 0 (fautive) à 1 (idéale). */
  quality: number;
  /** Durée simulée écoulée, en minutes. */
  minutes: number;
  /**
   * Réanimation efficace : seule condition d'obtention d'un RACS. Le moteur
   * n'accorde jamais de reprise d'activité circulatoire sans cette entrée.
   */
  resuscitationEffective?: boolean;
  /** RACS déjà obtenu lors d'une étape précédente. */
  roscAchieved?: boolean;
}

export interface EvolveResult {
  vitals: InterventionVitals;
  /** Vrai dès que le patient en arrêt cardio-respiratoire a repris une activité circulatoire. */
  roscAchieved: boolean;
}

/** Seuil de qualité de réanimation en dessous duquel aucun RACS n'est possible. */
export const ROSC_QUALITY_THRESHOLD = 0.75;

/**
 * Fait évoluer les constantes d'une période à la suivante : convergence vers la
 * cible, puis couplages physiologiques (hypoxie → conscience, hypoperfusion →
 * tachycardie compensatrice, douleur et fièvre → FC/FR, Glasgow bas →
 * dépression respiratoire, hypoglycémie → conscience).
 */
export function evolveInterventionVitals(
  vitals: InterventionVitals,
  profile: InterventionClinicalProfile,
  context: EvolveContext,
): EvolveResult {
  const minutes = Math.max(0.5, context.minutes);
  const quality = Math.min(1, Math.max(0, context.quality));

  if (profile.cardiacArrest && !context.roscAchieved) {
    const rosc = Boolean(context.resuscitationEffective) && quality >= ROSC_QUALITY_THRESHOLD;
    if (!rosc) {
      // Aucun débit spontané : le no-flow se poursuit, la SpO₂ mesurée s'effondre.
      return {
        roscAchieved: false,
        vitals: round({
          hr: 0,
          sbp: 0,
          dbp: 0,
          spo2: clampVital("spo2", vitals.spo2 - 4 * minutes),
          rr: 0,
          temperature: clampVital("temperature", vitals.temperature - 0.05 * minutes),
          gcs: 3,
          pain: 0,
          glycemia: vitals.glycemia,
        }),
      };
    }
    // Reprise progressive à partir de l'état constaté, jamais d'un saut brutal.
    const anchor = postRoscAnchor(profile);
    return {
      roscAchieved: true,
      vitals: round(
        applyCouplings(
          {
            hr: approach("hr", Math.max(vitals.hr, 30), anchor.hr, minutes),
            sbp: approach("sbp", Math.max(vitals.sbp, 45), anchor.sbp, minutes),
            dbp: approach("dbp", Math.max(vitals.dbp, 25), anchor.dbp, minutes),
            spo2: approach("spo2", Math.max(vitals.spo2, 60), anchor.spo2, minutes),
            rr: approach("rr", Math.max(vitals.rr, 6), anchor.rr, minutes),
            temperature: vitals.temperature,
            gcs: approach("gcs", vitals.gcs, anchor.gcs, minutes),
            pain: 0,
            glycemia: vitals.glycemia,
          },
          profile,
        ),
      ),
    };
  }

  const target = targetsFor(profile, quality, profile.cardiacArrest);
  const next = INTERVENTION_VITAL_KEYS.reduce((accumulator, key) => {
    accumulator[key] = approach(key, vitals[key], target[key], minutes);
    return accumulator;
  }, {} as InterventionVitals);

  return {
    roscAchieved: Boolean(context.roscAchieved),
    vitals: round(applyCouplings(next, profile)),
  };
}

function applyCouplings(
  next: InterventionVitals,
  profile: InterventionClinicalProfile,
): InterventionVitals {
  const healthy = HEALTHY[profile.ageBand];
  const hypoxia = Math.max(0, 92 - next.spo2) / 10;
  const hypoperfusion = Math.max(0, healthy.sbp - 30 - next.sbp) / 20;
  const painDrive = Math.max(0, next.pain - 4) / 6;
  const fever = Math.max(0, next.temperature - 38);

  const coupled: InterventionVitals = { ...next };
  // Les couplages sont des décalages compensatoires bornés : sans plafond, ils
  // s'additionneraient d'une étape à l'autre jusqu'à des valeurs impossibles.
  coupled.gcs -= Math.min(6, (hypoxia + hypoperfusion) * 1.6);
  coupled.rr += Math.min(14, hypoxia * 3 + painDrive * 2 + fever * 2);
  coupled.hr += Math.min(35, hypoperfusion * 18 + painDrive * 10 + hypoxia * 6 + fever * 8);
  if (coupled.gcs < 8) coupled.rr -= 3; // dépression respiratoire centrale
  if (coupled.hr > 170) coupled.sbp -= 10; // remplissage diastolique insuffisant
  if (coupled.glycemia < 3) coupled.gcs -= 2;

  // La diastolique suit la systolique et se pince quand la perfusion chute.
  coupled.dbp = Math.min(coupled.dbp, coupled.sbp * 0.78);
  if (hypoperfusion > 0) coupled.dbp -= hypoperfusion * 6;
  coupled.dbp = Math.max(coupled.dbp, Math.min(coupled.sbp - 12, coupled.sbp * 0.45));

  return coupled;
}

function round(vitals: InterventionVitals): InterventionVitals {
  return {
    hr: Math.round(clampVital("hr", vitals.hr)),
    sbp: Math.round(clampVital("sbp", vitals.sbp)),
    dbp: Math.round(clampVital("dbp", vitals.dbp)),
    spo2: Math.round(clampVital("spo2", vitals.spo2)),
    rr: Math.round(clampVital("rr", vitals.rr)),
    temperature: Number(clampVital("temperature", vitals.temperature).toFixed(1)),
    gcs: Math.round(clampVital("gcs", vitals.gcs)),
    pain: Math.round(clampVital("pain", vitals.pain)),
    glycemia: Number(clampVital("glycemia", vitals.glycemia).toFixed(1)),
  };
}

export function normalizeVitals(vitals: InterventionVitals): InterventionVitals {
  return round(vitals);
}

function formatTemperature(value: number) {
  return `${value.toFixed(1).replace(".", ",")} °C`;
}

function formatGlycemia(value: number) {
  const grams = (value * 0.18).toFixed(2).replace(".", ",");
  return `${value.toFixed(1).replace(".", ",")} mmol/L (${grams} g/L)`;
}

export function formatVital(key: DisplayedVital, vitals: InterventionVitals): string {
  switch (key) {
    case "hr":
      return `${vitals.hr} /min`;
    case "sbp":
      return `${vitals.sbp}/${vitals.dbp} mmHg`;
    case "spo2":
      return `${vitals.spo2} %`;
    case "rr":
      return `${vitals.rr} /min`;
    case "temperature":
      return formatTemperature(vitals.temperature);
    case "gcs":
      return `${vitals.gcs}/15`;
    case "pain":
      return `${vitals.pain}/10`;
    case "glycemia":
      // Forme compacte : les cellules de constantes restent lisibles sur mobile.
      return `${vitals.glycemia.toFixed(1).replace(".", ",")} mmol/L`;
  }
}

const VITAL_LABELS: Record<DisplayedVital, string> = {
  hr: "FC",
  sbp: "TA",
  spo2: "SpO₂",
  rr: "FR",
  temperature: "Température",
  gcs: "Glasgow",
  pain: "Douleur",
  glycemia: "Glycémie",
};

export function vitalLabel(key: DisplayedVital) {
  return VITAL_LABELS[key];
}

/** Constantes affichées pour un profil : la glycémie n'apparaît que si elle est pertinente. */
export function monitoredVitals(profile: InterventionClinicalProfile): DisplayedVital[] {
  return DISPLAYED_VITALS.filter((key) => key !== "glycemia" || profile.glycemiaRelevant);
}

/** Une constante dont l'évolution va dans le sens de l'aggravation. */
function worseningDirection(key: DisplayedVital): "higher" | "lower" | "both" {
  if (key === "spo2" || key === "gcs") return "lower";
  if (key === "pain") return "higher";
  return "both";
}

export function describeVitals(
  vitals: InterventionVitals,
  previous: InterventionVitals | undefined,
  profile: InterventionClinicalProfile,
): VitalReading[] {
  return monitoredVitals(profile).map((key) => {
    const reference = key === "sbp" ? "sbp" : key;
    const current = vitals[reference];
    const before = previous?.[reference];
    const rawDelta = before === undefined ? 0 : current - before;
    const significant = key === "temperature" || key === "glycemia" ? 0.15 : 0.5;
    const trend: VitalTrend =
      Math.abs(rawDelta) < significant ? "stable" : rawDelta > 0 ? "up" : "down";
    const formattedDelta =
      trend === "stable"
        ? "stable"
        : `${rawDelta > 0 ? "+" : "−"}${formatDelta(key, Math.abs(rawDelta))}`;
    return {
      key,
      label: VITAL_LABELS[key],
      value: formatVital(key, vitals),
      severity: vitalSeverity(key, current, profile.ageBand),
      trend,
      delta: formattedDelta,
    };
  });
}

function formatDelta(key: DisplayedVital, value: number) {
  if (key === "temperature") return `${value.toFixed(1).replace(".", ",")} °C`;
  if (key === "glycemia") return `${value.toFixed(1).replace(".", ",")} mmol/L`;
  return String(Math.round(value));
}

/** Alertes déclenchées par le franchissement d'un seuil dans le mauvais sens. */
export function detectVitalAlerts(
  before: InterventionVitals,
  after: InterventionVitals,
  profile: InterventionClinicalProfile,
): VitalAlert[] {
  const alerts: VitalAlert[] = [];
  for (const key of monitoredVitals(profile)) {
    const previousSeverity = vitalSeverity(key, before[key], profile.ageBand);
    const currentSeverity = vitalSeverity(key, after[key], profile.ageBand);
    if (SEVERITY_RANK[currentSeverity] <= SEVERITY_RANK[previousSeverity]) continue;
    alerts.push({
      key,
      label: VITAL_LABELS[key],
      severity: currentSeverity,
      value: formatVital(key, after),
      message: vitalThreshold(key, profile.ageBand).message(after[key]),
    });
  }
  return alerts.sort((left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]);
}

/** Constantes hors seuils à un instant donné, pour l'affichage permanent. */
export function currentVitalAlerts(
  vitals: InterventionVitals,
  profile: InterventionClinicalProfile,
): VitalAlert[] {
  return detectVitalAlerts(HEALTHY[profile.ageBand], vitals, profile);
}

/**
 * Traduit l'état physiologique en indice 0-100 comparable à `patientState`.
 * Une constante critique pèse deux fois plus qu'une constante en alerte.
 */
export function vitalsStability(
  vitals: InterventionVitals,
  profile: InterventionClinicalProfile,
): number {
  const keys = monitoredVitals(profile);
  const penalty = keys.reduce((total, key) => {
    const severity = vitalSeverity(key, vitals[key], profile.ageBand);
    return total + (severity === "critical" ? 2 : severity === "warning" ? 1 : 0);
  }, 0);
  const worst = keys.length * 2;
  const physiological = 100 - Math.round((penalty / worst) * 100);
  // Un patient sans débit circulatoire n'est jamais « partiellement stable ».
  if (vitals.hr === 0 && vitals.sbp === 0) return 0;
  return Math.min(100, Math.max(0, physiological));
}

export function isPatientStable(
  vitals: InterventionVitals,
  profile: InterventionClinicalProfile,
): boolean {
  if (vitals.hr === 0 && vitals.sbp === 0) return false;
  return monitoredVitals(profile).every(
    (key) => vitalSeverity(key, vitals[key], profile.ageBand) !== "critical",
  );
}

export function patientToneFromVitals(
  vitals: InterventionVitals,
  profile: InterventionClinicalProfile,
): "stable" | "watch" | "critical" {
  const keys = monitoredVitals(profile);
  if (vitals.hr === 0 && vitals.sbp === 0) return "critical";
  if (keys.some((key) => vitalSeverity(key, vitals[key], profile.ageBand) === "critical")) {
    return "critical";
  }
  if (keys.some((key) => vitalSeverity(key, vitals[key], profile.ageBand) === "warning")) {
    return "watch";
  }
  return "stable";
}

/* ------------------------------------------------------------------------- */
/* Dérivation du profil clinique à partir des données de mission existantes   */
/* ------------------------------------------------------------------------- */

/**
 * Valeurs de complément par famille de pathologie, utilisées uniquement pour
 * les constantes qu'un scénario ne fournit pas. Ces valeurs décrivent un
 * patient « modérément atteint » de la famille ; la gravité propre au scénario
 * est ensuite appliquée par `applySeverity`.
 *
 * À faire relire par le binôme médecin urgentiste / formateur DEA
 * (cf. INTERVENTION_MEDICAL_REVIEW.md).
 */
const FAMILY_BASELINES: Record<string, Partial<InterventionVitals>> = {
  general: { hr: 92, sbp: 118, spo2: 96, rr: 18, temperature: 36.9, gcs: 15, pain: 2 },
  cardiac: { hr: 104, sbp: 132, spo2: 95, rr: 22, temperature: 36.8, gcs: 15, pain: 7 },
  respiratory: { hr: 108, sbp: 138, spo2: 89, rr: 30, temperature: 37.2, gcs: 14, pain: 2 },
  neurology: { hr: 88, sbp: 168, spo2: 95, rr: 18, temperature: 36.9, gcs: 14, pain: 1 },
  metabolic: { hr: 96, sbp: 122, spo2: 96, rr: 18, temperature: 36.6, gcs: 13, pain: 1 },
  trauma: { hr: 116, sbp: 104, spo2: 94, rr: 24, temperature: 36.4, gcs: 14, pain: 8 },
  allergy: { hr: 122, sbp: 88, spo2: 91, rr: 28, temperature: 36.9, gcs: 14, pain: 3 },
  pediatric: { hr: 138, sbp: 96, spo2: 94, rr: 34, temperature: 38.6, gcs: 14, pain: 3 },
  maternity: { hr: 98, sbp: 118, spo2: 97, rr: 20, temperature: 37, gcs: 15, pain: 8 },
  toxicology: { hr: 104, sbp: 112, spo2: 92, rr: 20, temperature: 36.6, gcs: 12, pain: 2 },
  complex: { hr: 112, sbp: 106, spo2: 92, rr: 26, temperature: 36.5, gcs: 13, pain: 6 },
};

const GLYCEMIA_BY_FAMILY: Record<string, number> = {
  metabolic: 2.6,
  neurology: 6.2,
  pediatric: 4.8,
  toxicology: 5,
};

/** Familles pour lesquelles la glycémie capillaire fait partie du bilan attendu. */
const GLYCEMIA_FAMILIES = new Set(["general", "metabolic", "neurology", "pediatric", "toxicology"]);

const CONSCIOUSNESS_TO_GCS: Array<[RegExp, number]> = [
  [/absente|inconscient|aréactif/i, 3],
  [/somnolen/i, 12],
  [/diminu|obnubil/i, 13],
  [/confus|desorient|désorient/i, 13],
  [/agit/i, 14],
  [/anxieu/i, 15],
  [/alerte|conscient|orient/i, 15],
];

function parseNumber(raw: string): number | undefined {
  const match = raw.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Lit les constantes déjà rédigées dans un scénario. Ces valeurs sont
 * pédagogiquement validées : elles prévalent toujours sur les valeurs de
 * complément.
 */
export function parseAuthoredVitals(vitals: ReadonlyArray<{ label: string; value: string }>) {
  const parsed: Partial<InterventionVitals> = {};
  let glycemiaRequested = false;

  for (const vital of vitals) {
    const label = vital.label.toLocaleLowerCase("fr");
    const value = vital.value;

    if (/^fc$|pouls|fréquence card/.test(label)) {
      const parsedValue = parseNumber(value);
      if (parsedValue !== undefined) parsed.hr = parsedValue;
      continue;
    }
    if (/^ta$|tension|pression art/.test(label)) {
      const [systolic, diastolic] = value.split("/").map((part) => parseNumber(part));
      if (systolic !== undefined) parsed.sbp = systolic;
      if (diastolic !== undefined) parsed.dbp = diastolic;
      continue;
    }
    if (/spo|satur/.test(label)) {
      const parsedValue = parseNumber(value);
      if (parsedValue !== undefined) parsed.spo2 = parsedValue;
      continue;
    }
    if (/^fr$/.test(label)) {
      const parsedValue = parseNumber(value);
      if (parsedValue !== undefined) parsed.rr = parsedValue;
      continue;
    }
    if (/respiration/.test(label)) {
      if (/absente|anormale|agonique|gasp/i.test(value)) parsed.rr = 0;
      else {
        const parsedValue = parseNumber(value);
        if (parsedValue !== undefined) parsed.rr = parsedValue;
      }
      continue;
    }
    // Ancré pour ne pas confondre « Température » avec « Temps » ou « Temps écoulé ».
    if (/^temp[eé]rature$/.test(label)) {
      const parsedValue = parseNumber(value);
      if (parsedValue !== undefined) parsed.temperature = parsedValue;
      continue;
    }
    if (/glasgow/.test(label)) {
      const parsedValue = parseNumber(value);
      if (parsedValue !== undefined) parsed.gcs = parsedValue;
      continue;
    }
    if (/conscience|réactivit|reactivit|vigilance/.test(label)) {
      const match = CONSCIOUSNESS_TO_GCS.find(([pattern]) => pattern.test(value));
      if (match) parsed.gcs = match[1];
      continue;
    }
    if (/douleur|^eva$/.test(label)) {
      const parsedValue = parseNumber(value);
      if (parsedValue !== undefined) parsed.pain = parsedValue;
      continue;
    }
    if (/glyc/.test(label)) {
      glycemiaRequested = true;
      const parsedValue = parseNumber(value);
      if (parsedValue !== undefined) parsed.glycemia = parsedValue;
      continue;
    }
  }

  return { parsed, glycemiaRequested };
}

/**
 * Décale les valeurs de complément selon la gravité déclarée du scénario.
 * `startingPatient` va de 20 (critique) à 70 (surveillance simple).
 */
function applySeverity(
  values: InterventionVitals,
  startingPatient: number,
  band: AgeBand,
): InterventionVitals {
  // 0 → scénario le plus grave du catalogue, 1 → le plus rassurant.
  const comfort = Math.min(1, Math.max(0, (startingPatient - 20) / 50));
  const stress = 1 - comfort;
  const healthy = HEALTHY[band];
  const shift = (value: number, healthyValue: number) =>
    value + (value - healthyValue) * stress * 0.35;

  return {
    hr: shift(values.hr, healthy.hr),
    sbp: shift(values.sbp, healthy.sbp),
    dbp: shift(values.dbp, healthy.dbp),
    spo2: Math.min(100, shift(values.spo2, healthy.spo2)),
    rr: shift(values.rr, healthy.rr),
    temperature: shift(values.temperature, healthy.temperature),
    gcs: Math.min(15, shift(values.gcs, healthy.gcs)),
    pain: Math.min(10, shift(values.pain, healthy.pain)),
    glycemia: values.glycemia,
  };
}

export interface ClinicalProfileInput {
  illustration: string;
  startingPatient: number;
  vitals: ReadonlyArray<{ label: string; value: string }>;
  /** Renseigné explicitement dans le profil de mission. */
  ageBand?: AgeBand;
  cardiacArrest?: boolean;
  glycemiaRelevant?: boolean;
  /** Surcharge complète, pour un scénario dont les constantes sont validées. */
  baseline?: Partial<InterventionVitals>;
}

/**
 * Construit le profil clinique d'un scénario. Ordre de priorité :
 * surcharge explicite → constantes rédigées dans le scénario → valeurs de
 * complément de la famille, décalées par la gravité du scénario.
 */
export function deriveClinicalProfile(input: ClinicalProfileInput): InterventionClinicalProfile {
  const family = FAMILY_BASELINES[input.illustration] ? input.illustration : "general";
  const band: AgeBand = input.ageBand ?? (family === "pediatric" ? "child" : "adult");
  const { parsed, glycemiaRequested } = parseAuthoredVitals(input.vitals);
  const cardiacArrest = input.cardiacArrest ?? false;

  const familyDefaults = FAMILY_BASELINES[family] ?? {};
  const healthy = HEALTHY[band];
  const complete: InterventionVitals = {
    hr: familyDefaults.hr ?? healthy.hr,
    sbp: familyDefaults.sbp ?? healthy.sbp,
    dbp: familyDefaults.dbp ?? Math.round((familyDefaults.sbp ?? healthy.sbp) * 0.62),
    spo2: familyDefaults.spo2 ?? healthy.spo2,
    rr: familyDefaults.rr ?? healthy.rr,
    temperature: familyDefaults.temperature ?? healthy.temperature,
    gcs: familyDefaults.gcs ?? healthy.gcs,
    pain: familyDefaults.pain ?? healthy.pain,
    glycemia: GLYCEMIA_BY_FAMILY[family] ?? healthy.glycemia,
  };

  const scaled = applySeverity(complete, input.startingPatient, band);
  const merged: InterventionVitals = {
    ...scaled,
    ...stripUndefined(parsed),
    ...stripUndefined(input.baseline ?? {}),
  };

  // La diastolique n'est presque jamais rédigée : la déduire de la systolique.
  if (parsed.dbp === undefined && input.baseline?.dbp === undefined) {
    merged.dbp = Math.round(merged.sbp * 0.62);
  }

  // En arrêt cardio-respiratoire, aucun débit : le saturomètre ne mesure rien et
  // la conscience est nulle, quelles que soient les valeurs de complément.
  const baseline = cardiacArrest
    ? round({ ...merged, hr: 0, sbp: 0, dbp: 0, rr: 0, spo2: 0, gcs: 3, pain: 0 })
    : round(merged);

  return {
    ageBand: band,
    cardiacArrest,
    glycemiaRelevant:
      input.glycemiaRelevant ?? (glycemiaRequested || GLYCEMIA_FAMILIES.has(family)),
    baseline,
  };
}

function stripUndefined(values: Partial<InterventionVitals>): Partial<InterventionVitals> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<InterventionVitals>;
}
