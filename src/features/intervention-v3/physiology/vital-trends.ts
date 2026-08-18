/**
 * Les tendances cliniques, et la façon dont elles déplacent les constantes.
 *
 * Le principe tient en une phrase : **une tendance ne fixe pas une valeur, elle
 * fixe une destination.** Un patient qui se dégrade lentement n'a pas des
 * constantes anormales, il a des constantes qui glissent vers l'anormal. La
 * différence est ce qui sépare une simulation d'un tableau de chiffres.
 *
 * Chaque tendance est donc une **traction** : un décalage asymptotique par
 * rapport à la base, atteint de façon exponentielle. À `tau` secondes, 63 % du
 * chemin est fait ; le reste s'approche sans jamais dépasser. C'est cette forme
 * qui interdit à une saturation de descendre indéfiniment jusqu'à zéro parce que
 * la mission a duré vingt minutes.
 *
 * Les événements — oxygène posé, patient rassuré, immobilisation, geste
 * dangereux — sont des tractions supplémentaires, datées, qui s'additionnent aux
 * précédentes. Aucune ne remplace l'état : elles se composent. Un patient sous
 * oxygène qui se dégrade continue de se dégrader, plus lentement.
 */

import type {
  ClinicalTrend,
  PhysiologyEventKind,
  PhysiologyProfile,
  SignalDynamics,
  VitalSignal,
} from "./physiology-types.ts";
import { TREND_SEVERITY_ORDER } from "./physiology-types.ts";

/**
 * Comportement d'échantillonnage de chaque constante.
 *
 * `maxStepPerSample` n'est pas décoratif : c'est le contrat que les tests
 * vérifient. Il dit ce qu'un moniteur peut afficher d'un rafraîchissement à
 * l'autre sans qu'un soignant se retourne vers l'écran.
 */
export const SIGNAL_DYNAMICS: Record<VitalSignal, SignalDynamics> = {
  // Saturation : la constante la plus surveillée, et la plus calme. Elle bouge
  // d'un point, parfois deux, sur une vingtaine de secondes.
  spo2: {
    mode: "continuous",
    noiseAmplitude: 1.2,
    noisePeriodSeconds: 22,
    decimals: 0,
    bounds: [50, 100],
    maxStepPerSample: 2,
  },
  // Fréquence cardiaque : plus vive que la saturation, elle réagit au moindre
  // mouvement du patient.
  hr: {
    mode: "continuous",
    noiseAmplitude: 2.5,
    noisePeriodSeconds: 14,
    decimals: 0,
    bounds: [20, 220],
    maxStepPerSample: 5,
  },
  // Fréquence respiratoire : elle vit dans le moteur comme les autres, mais elle
  // se **compte**, elle ne se surveille pas. Aucun appareil de l'ambulance ne la
  // tient à jour : l'équipe regarde le thorax pendant une minute. Sa valeur
  // affichée est donc un instantané, même si le patient, lui, continue de
  // changer de rythme. Le tracé respiratoire reste possible après le comptage —
  // il anime la cadence relevée, pas une cadence observée en direct.
  rr: {
    mode: "snapshot",
    noiseAmplitude: 1.1,
    noisePeriodSeconds: 30,
    decimals: 0,
    bounds: [4, 60],
    maxStepPerSample: 2,
  },
  // Tension : instantané. Le brassard donne un chiffre daté, et la valeur
  // affichée reste celle de la prise. Le bruit ne sert qu'à ce que deux prises
  // successives ne donnent pas exactement le même nombre.
  sbp: {
    mode: "snapshot",
    noiseAmplitude: 3,
    noisePeriodSeconds: 45,
    decimals: 0,
    bounds: [50, 240],
    maxStepPerSample: 8,
  },
  dbp: {
    mode: "snapshot",
    noiseAmplitude: 2,
    noisePeriodSeconds: 45,
    decimals: 0,
    bounds: [25, 150],
    maxStepPerSample: 6,
  },
  temperature: {
    mode: "snapshot",
    noiseAmplitude: 0.08,
    noisePeriodSeconds: 150,
    decimals: 1,
    bounds: [30, 42.5],
    maxStepPerSample: 0.3,
  },
  glycemia: {
    mode: "snapshot",
    noiseAmplitude: 0.06,
    noisePeriodSeconds: 180,
    decimals: 1,
    bounds: [0.8, 30],
    maxStepPerSample: 0.5,
  },
  // Glasgow et douleur ne sont pas des mesures d'appareil mais des évaluations.
  // Leur donner du bruit ferait clignoter un score que le soignant a établi
  // lui-même : un Glasgow ne passe pas de 13 à 14 parce qu'on regarde l'écran.
  gcs: {
    mode: "snapshot",
    noiseAmplitude: 0,
    noisePeriodSeconds: 60,
    decimals: 0,
    bounds: [3, 15],
    maxStepPerSample: 1,
  },
  pain: {
    mode: "snapshot",
    noiseAmplitude: 0,
    noisePeriodSeconds: 60,
    decimals: 0,
    bounds: [0, 10],
    maxStepPerSample: 1,
  },
};

/** Une traction vers une destination, atteinte exponentiellement. */
export interface VitalPull {
  startSeconds: number;
  /** Décalage asymptotique par rapport à la base, par constante. */
  offsets: Partial<Record<VitalSignal, number>>;
  /** Constante de temps : à `tauSeconds`, 63 % du décalage est atteint. */
  tauSeconds: number;
}

export const TREND_LABELS: Record<ClinicalTrend, string> = {
  stable: "État stable",
  improving: "État en amélioration",
  slow_deterioration: "Dégradation lente",
  rapid_deterioration: "Dégradation rapide",
  critical: "État critique",
};

/**
 * Destination de chaque tendance.
 *
 * Les chiffres sont des **décalages**, pas des valeurs : « −6 » sur la
 * saturation veut dire « ce patient descend de six points s'il n'est pas pris en
 * charge », quelle que soit sa saturation de départ. Un patient qui arrive à
 * 92 % et un patient qui arrive à 98 % ne se dégradent pas vers le même chiffre.
 *
 * À faire relire par le binôme médecin urgentiste / formateur DEA, au même titre
 * que les valeurs de scénario : ces amplitudes décrivent une vitesse de
 * dégradation, ce qui est une affirmation clinique.
 */
export const TREND_PULLS: Record<ClinicalTrend, Omit<VitalPull, "startSeconds">> = {
  stable: { offsets: {}, tauSeconds: 600 },
  improving: {
    offsets: { spo2: 3, hr: -12, rr: -3, sbp: 6, pain: -2 },
    tauSeconds: 420,
  },
  slow_deterioration: {
    offsets: { spo2: -6, hr: 18, rr: 6, sbp: -14, gcs: -1 },
    tauSeconds: 600,
  },
  rapid_deterioration: {
    offsets: { spo2: -14, hr: 34, rr: 12, sbp: -30, gcs: -3 },
    tauSeconds: 300,
  },
  critical: {
    offsets: { spo2: -26, hr: 48, rr: 16, sbp: -45, gcs: -5 },
    tauSeconds: 180,
  },
};

/*
 * Aucune tendance ne déplace la diastolique.
 *
 * Ce n'est pas un oubli : la diastolique **suit** la systolique, et ce lien est
 * exprimé une seule fois, dans les couplages du moteur. La déclarer aussi ici
 * ferait compter deux fois la même chute de tension, et la pression
 * différentielle deviendrait absurde au bout de quelques minutes.
 */

/**
 * Décale une tendance de `steps` crans dans l'ordre de gravité.
 *
 * Un cran vers le pire, jamais deux : un geste dangereux aggrave la trajectoire,
 * il ne fait pas passer un patient stable en état critique. Les bornes sont
 * saturantes — on ne descend pas sous « en amélioration », on ne monte pas
 * au-dessus de « critique ».
 */
export function TREND_SEVERITY_STEP(trend: ClinicalTrend, steps: number): ClinicalTrend {
  const index = TREND_SEVERITY_ORDER.indexOf(trend);
  if (index < 0) return trend;
  const moved = Math.min(TREND_SEVERITY_ORDER.length - 1, Math.max(0, index + steps));
  return TREND_SEVERITY_ORDER[moved]!;
}

/** Tendances qui vont vers le pire. Seules celles-ci sont amplifiées par la fragilité. */
const DETERIORATING: ReadonlySet<ClinicalTrend> = new Set<ClinicalTrend>([
  "slow_deterioration",
  "rapid_deterioration",
  "critical",
]);

/**
 * Facteur de fragilité.
 *
 * Un patient solide encaisse, un patient précaire glisse plus vite. La stabilité
 * de référence est 0,5 : à cette valeur, la tendance produit exactement les
 * décalages déclarés. Elle n'agit que sur la dégradation — être solide n'accélère
 * pas la guérison.
 */
export function fragilityScale(profile: PhysiologyProfile, trend: ClinicalTrend): number {
  if (!DETERIORATING.has(trend)) return 1;
  return 1 + (0.5 - profile.clinicalStability);
}

/** Traction de fond du patient, active dès la première seconde. */
export function trendPull(profile: PhysiologyProfile): VitalPull {
  const base = TREND_PULLS[profile.trend];
  const scale = fragilityScale(profile, profile.trend);
  return {
    startSeconds: 0,
    tauSeconds: base.tauSeconds,
    offsets: scaleOffsets(base.offsets, scale),
  };
}

export function scaleOffsets(
  offsets: Partial<Record<VitalSignal, number>>,
  scale: number,
): Partial<Record<VitalSignal, number>> {
  const scaled: Partial<Record<VitalSignal, number>> = {};
  for (const [signal, value] of Object.entries(offsets)) {
    scaled[signal as VitalSignal] = value * scale;
  }
  return scaled;
}

/**
 * Effet d'un événement sur la trajectoire.
 *
 * Renvoie `null` quand l'événement ne change rien pour ce patient. C'est le cas
 * le plus instructif du lot : **poser l'oxygène à un patient qui sature à 98 %
 * ne fait pas monter sa saturation.** Le geste est journalisé, il compte au
 * débriefing, mais la physiologie ne le récompense pas — sans quoi le mode
 * enseignerait à oxygéner tout le monde.
 */
export function eventPull(
  kind: PhysiologyEventKind,
  atSeconds: number,
  profile: PhysiologyProfile,
): VitalPull | null {
  switch (kind) {
    case "oxygen_started":
      if (!profile.oxygenIndicated) return null;
      // La remontée est progressive : à trois minutes, les deux tiers du chemin.
      // Une correction instantanée ferait croire que l'oxygène agit comme un
      // interrupteur.
      return { startSeconds: atSeconds, tauSeconds: 180, offsets: { spo2: 7, rr: -2, hr: -4 } };

    case "oxygen_stopped":
      // Le retrait ne remet pas le compteur à zéro : il ajoute la traction
      // inverse, et la saturation redescend au même rythme qu'elle était montée.
      if (!profile.oxygenIndicated) return null;
      return { startSeconds: atSeconds, tauSeconds: 180, offsets: { spo2: -7, rr: 2, hr: 4 } };

    case "reassured": {
      // Rassurer n'agit que sur ce que le stress a fait monter. Sur un patient
      // calme, l'effet est nul — et c'est juste : on ne ralentit pas un cœur qui
      // bat normalement en parlant doucement.
      const stress = Math.max(0, Math.min(1, profile.painLevel / 10));
      if (stress < 0.3) return null;
      return {
        startSeconds: atSeconds,
        tauSeconds: 150,
        offsets: { hr: -10 * stress, rr: -2 * stress, pain: -1 },
      };
    }

    case "immobilised": {
      // L'immobilisation ne soigne rien : elle empêche d'aggraver. Elle est donc
      // modélisée comme un frein sur la dégradation en cours, et n'a aucun effet
      // sur un patient stable.
      const base = TREND_PULLS[profile.trend];
      if (!DETERIORATING.has(profile.trend)) return null;
      return {
        startSeconds: atSeconds,
        tauSeconds: base.tauSeconds,
        offsets: scaleOffsets(base.offsets, -0.3 * fragilityScale(profile, profile.trend)),
      };
    }

    case "positioned":
      return { startSeconds: atSeconds, tauSeconds: 240, offsets: { rr: -1, spo2: 1 } };

    case "sugar_given":
      // Sans hypoglycémie, resucrer ne fait rien de visible.
      if (profile.baselineGlucose > 3.5) return null;
      return { startSeconds: atSeconds, tauSeconds: 300, offsets: { glycemia: 2.5, gcs: 2 } };

    case "warmed":
      return { startSeconds: atSeconds, tauSeconds: 600, offsets: { temperature: 0.6 } };

    case "dangerous_act":
      return {
        startSeconds: atSeconds,
        tauSeconds: 240,
        offsets: { spo2: -4, hr: 12, sbp: -8, gcs: -1 },
      };

    case "deterioration":
      return {
        startSeconds: atSeconds,
        tauSeconds: 200,
        offsets: { spo2: -8, hr: 20, rr: 5, sbp: -15, gcs: -2 },
      };
  }
}

/**
 * Part du décalage atteinte à un instant donné.
 *
 * Vaut 0 avant l'événement — une traction ne rétroagit pas sur le passé — et
 * s'approche de 1 sans l'atteindre. C'est ce qui donne les courbes qui
 * s'aplatissent plutôt que des rampes qui filent.
 */
export function pullProgress(pull: VitalPull, atSeconds: number): number {
  const elapsed = atSeconds - pull.startSeconds;
  if (elapsed <= 0) return 0;
  return 1 - Math.exp(-elapsed / pull.tauSeconds);
}
