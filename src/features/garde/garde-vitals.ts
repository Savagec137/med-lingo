import type { GardeCase, VitalAlert, VitalKey, VitalSeverity, Vitals } from "./garde-domain";

/** Bornes physiologiques absolues (survie / plafond machine). */
const BOUNDS: Record<VitalKey, [number, number]> = {
  spo2: [40, 100],
  sbp: [40, 230],
  hr: [0, 220],
  rr: [0, 60],
  gcs: [3, 15],
  pain: [0, 10],
  glycemia: [0.5, 30],
};

/** Seuils cliniques : au-delà (ou en deçà) = alerte. */
interface Threshold {
  label: string;
  critical: (v: number) => boolean;
  warning: (v: number) => boolean;
  message: (v: number) => string;
}

export const VITAL_THRESHOLDS: Record<VitalKey, Threshold> = {
  spo2: {
    label: "SpO₂",
    critical: (v) => v < 90,
    warning: (v) => v < 94,
    message: (v) => `SpO₂ ${Math.round(v)} % — hypoxémie, oxygénothérapie à titrer immédiatement.`,
  },
  sbp: {
    label: "PAS",
    critical: (v) => v < 90 || v >= 180,
    warning: (v) => v < 100 || v >= 160,
    message: (v) =>
      v < 100
        ? `PAS ${Math.round(v)} mmHg — hypotension, risque de choc : décubitus, remplissage sur avis médical.`
        : `PAS ${Math.round(v)} mmHg — poussée hypertensive, surveillance neurologique rapprochée.`,
  },
  hr: {
    label: "FC",
    critical: (v) => v < 40 || v > 130,
    warning: (v) => v < 50 || v > 110,
    message: (v) =>
      v < 50
        ? `FC ${Math.round(v)} /min — bradycardie mal tolérée possible, scope et bilan médecin.`
        : `FC ${Math.round(v)} /min — tachycardie : rechercher hypovolémie, douleur, hypoxie.`,
  },
  rr: {
    label: "FR",
    critical: (v) => v < 8 || v > 30,
    warning: (v) => v < 12 || v > 24,
    message: (v) =>
      v < 12
        ? `FR ${Math.round(v)} /min — bradypnée, préparer la ventilation assistée.`
        : `FR ${Math.round(v)} /min — polypnée, signe de détresse respiratoire.`,
  },
  gcs: {
    label: "Glasgow",
    critical: (v) => v <= 8,
    warning: (v) => v < 14,
    message: (v) =>
      v <= 8
        ? `Glasgow ${Math.round(v)}/15 — coma : liberté des voies aériennes, PLS ou intubation par le SMUR.`
        : `Glasgow ${Math.round(v)}/15 — troubles de conscience, réévaluer toutes les 5 minutes.`,
  },
  pain: {
    label: "Douleur",
    critical: (v) => v >= 8,
    warning: (v) => v >= 6,
    message: (v) => `EVA ${Math.round(v)}/10 — douleur intense, antalgie à demander à la régulation.`,
  },
  glycemia: {
    label: "Glycémie",
    critical: (v) => v < 3 || v > 20,
    warning: (v) => v < 4 || v > 15,
    message: (v) =>
      v < 4
        ? `Glycémie ${v.toFixed(1)} mmol/L — hypoglycémie : resucrage immédiat.`
        : `Glycémie ${v.toFixed(1)} mmol/L — hyperglycémie, rechercher une acidocétose.`,
  },
};

export function vitalSeverity(key: VitalKey, value: number): VitalSeverity {
  const t = VITAL_THRESHOLDS[key];
  if (t.critical(value)) return "critical";
  if (t.warning(value)) return "warning";
  return "normal";
}

const SEVERITY_RANK: Record<VitalSeverity, number> = { normal: 0, warning: 1, critical: 2 };

function clamp(key: VitalKey, value: number): number {
  const [min, max] = BOUNDS[key];
  return Math.min(max, Math.max(min, value));
}

/** Cible physiologique visée par le patient selon la qualité de la prise en charge. */
function targetsFor(gardeCase: GardeCase, accuracy: number): Vitals {
  const base = gardeCase.vitals;
  const healthy: Vitals = { spo2: 98, sbp: 125, hr: 78, rr: 15, gcs: 15, pain: 1, glycemia: 5.5 };
  // Trajectoire spontanée sans traitement adapté : aggravation à partir de l'état initial.
  const worsened: Vitals = {
    spo2: base.spo2 - 12,
    sbp: base.sbp < 110 ? base.sbp - 25 : base.sbp + 20,
    hr: base.hr < 55 ? base.hr - 15 : base.hr + 35,
    rr: base.rr < 12 ? base.rr - 5 : base.rr + 12,
    gcs: base.gcs - 5,
    pain: base.pain + 3,
    glycemia: base.glycemia < 4 ? base.glycemia - 1.2 : base.glycemia + 2,
  };
  // accuracy 0 → aggravation, 0.5 → statu quo, 1 → récupération.
  const w = Math.min(1, Math.max(0, (accuracy - 0.5) * 2));
  const l = Math.min(1, Math.max(0, (0.5 - accuracy) * 2));
  const mix = (h: number, b: number, bad: number) => h * w + b * (1 - w - l) + bad * l;
  return {
    spo2: mix(healthy.spo2, base.spo2, worsened.spo2),
    sbp: mix(healthy.sbp, base.sbp, worsened.sbp),
    hr: mix(healthy.hr, base.hr, worsened.hr),
    rr: mix(healthy.rr, base.rr, worsened.rr),
    gcs: mix(healthy.gcs, base.gcs, worsened.gcs),
    pain: mix(healthy.pain, base.pain, worsened.pain),
    glycemia: mix(healthy.glycemia, base.glycemia, worsened.glycemia),
  };
}

/** Vitesse de réponse propre à chaque paramètre (par minute simulée). */
const RESPONSE_RATE: Record<VitalKey, number> = {
  spo2: 0.22,
  sbp: 0.12,
  hr: 0.18,
  rr: 0.2,
  gcs: 0.1,
  pain: 0.16,
  glycemia: 0.14,
};

function approach(key: VitalKey, value: number, target: number, minutes: number): number {
  const factor = 1 - Math.exp(-RESPONSE_RATE[key] * Math.max(0.5, minutes));
  return value + (target - value) * factor;
}

/**
 * Modèle d'évolution clinique : chaque constante tend vers sa cible, puis les
 * couplages physiologiques (hypoxie → conscience, hypotension → tachycardie
 * compensatrice, douleur → FC/PAS) ajustent le résultat.
 */
export function evolveVitals(
  vitals: Vitals,
  gardeCase: GardeCase,
  accuracy: number,
  minutes: number,
): Vitals {
  if (gardeCase.isCardiacArrest) {
    const rosc = accuracy >= 0.75;
    return {
      spo2: clamp("spo2", rosc ? approach("spo2", vitals.spo2, 94, minutes) : vitals.spo2 - 4),
      sbp: clamp("sbp", rosc ? approach("sbp", vitals.sbp, 105, minutes) : 0),
      hr: clamp("hr", rosc ? approach("hr", vitals.hr, 110, minutes) : 0),
      rr: clamp("rr", rosc ? approach("rr", vitals.rr, 20, minutes) : 0),
      gcs: clamp("gcs", rosc ? approach("gcs", vitals.gcs, 9, minutes) : 3),
      pain: 0,
      glycemia: vitals.glycemia,
    };
  }

  const target = targetsFor(gardeCase, accuracy);
  const next: Vitals = {
    spo2: approach("spo2", vitals.spo2, target.spo2, minutes),
    sbp: approach("sbp", vitals.sbp, target.sbp, minutes),
    hr: approach("hr", vitals.hr, target.hr, minutes),
    rr: approach("rr", vitals.rr, target.rr, minutes),
    gcs: approach("gcs", vitals.gcs, target.gcs, minutes),
    pain: approach("pain", vitals.pain, target.pain, minutes),
    glycemia: approach("glycemia", vitals.glycemia, target.glycemia, minutes),
  };

  // Couplages physiologiques.
  const hypoxia = Math.max(0, 92 - next.spo2) / 10; // 0 → 1+
  const hypoperfusion = Math.max(0, 95 - next.sbp) / 20;
  const painDrive = Math.max(0, next.pain - 4) / 6;

  next.gcs -= (hypoxia + hypoperfusion) * 1.6;
  next.rr += hypoxia * 3 + painDrive * 2;
  next.hr += hypoperfusion * 18 + painDrive * 10 + hypoxia * 6;
  if (next.gcs < 8) next.rr -= 3; // dépression respiratoire centrale
  if (next.hr > 170) next.sbp -= 10; // remplissage diastolique insuffisant
  if (next.glycemia < 3) next.gcs -= 2;

  return {
    spo2: Math.round(clamp("spo2", next.spo2)),
    sbp: Math.round(clamp("sbp", next.sbp)),
    hr: Math.round(clamp("hr", next.hr)),
    rr: Math.round(clamp("rr", next.rr)),
    gcs: Math.round(clamp("gcs", next.gcs)),
    pain: Math.round(clamp("pain", next.pain)),
    glycemia: Number(clamp("glycemia", next.glycemia).toFixed(1)),
  };
}

const VITAL_KEYS: VitalKey[] = ["spo2", "sbp", "hr", "rr", "gcs", "pain", "glycemia"];

/** Alertes déclenchées lorsqu'une constante franchit un seuil vers le pire. */
export function detectVitalAlerts(before: Vitals, after: Vitals): VitalAlert[] {
  const alerts: VitalAlert[] = [];
  for (const key of VITAL_KEYS) {
    const previous = vitalSeverity(key, before[key]);
    const current = vitalSeverity(key, after[key]);
    if (SEVERITY_RANK[current] > SEVERITY_RANK[previous]) {
      alerts.push({
        key,
        label: VITAL_THRESHOLDS[key].label,
        severity: current,
        value: after[key],
        message: VITAL_THRESHOLDS[key].message(after[key]),
      });
    }
  }
  return alerts.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

/** Constantes actuellement hors seuils (pour l'affichage permanent). */
export function currentVitalAlerts(vitals: Vitals): VitalAlert[] {
  return detectVitalAlerts(
    { spo2: 98, sbp: 125, hr: 78, rr: 15, gcs: 15, pain: 0, glycemia: 5.5 },
    vitals,
  );
}
