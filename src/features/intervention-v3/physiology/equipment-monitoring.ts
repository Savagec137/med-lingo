/**
 * Ce que le matériel permet de voir, et ce qu'il montre de lui-même.
 *
 * Deux responsabilités, volontairement réunies parce qu'elles répondent à la
 * même question — *qu'est-ce qu'un capteur affiche ?* — et qu'elles se
 * contredisent si on les sépare :
 *
 *   1. **Quel appareil porte quelle constante.** Sans saturomètre, pas de SpO₂ ;
 *      sans brassard, pas de tension. C'est la table qui décide de ce qui peut
 *      être surveillé en continu et de ce qui reste un instantané.
 *
 *   2. **La qualité du signal.** Un capteur mal placé, un patient qui bouge, une
 *      mesure en cours. Ces états parlent de l'appareil, jamais du patient : un
 *      signal faible sur quelqu'un qui va très bien est une situation banale, et
 *      c'est ce qui les rend sûrs à afficher — ils n'apprennent rien de clinique.
 *
 * Les tracés sont calculés ici plutôt que dans les composants. Un composant qui
 * fabriquerait sa propre onde aurait besoin de la fréquence réelle du patient, et
 * la lui donner rouvrirait exactement la porte que le mode ferme.
 */

import type { EquipmentId } from "../v3-domain.ts";
import type { MonitoringMode, SignalQuality, VitalSignal } from "./physiology-types.ts";
import { SIGNAL_DYNAMICS } from "./vital-trends.ts";
import { hashSeed, inRecurringWindow, smoothNoise } from "./vital-noise.ts";

/**
 * L'appareil sans lequel une constante ne se mesure pas.
 *
 * `null` ne veut pas dire « gratuite » : la fréquence respiratoire se compte à
 * l'œil, la conscience s'évalue, la douleur se demande. Ces constantes exigent
 * une action, simplement pas un appareil.
 */
export const SIGNAL_EQUIPMENT: Record<VitalSignal, EquipmentId | null> = {
  spo2: "saturometre",
  hr: "saturometre",
  sbp: "tensiometre",
  dbp: "tensiometre",
  glycemia: "glucometre",
  temperature: "thermometre",
  rr: null,
  gcs: null,
  pain: null,
};

/** Matériel qui reste en place et surveille, par opposition à celui qui mesure et se range. */
export const CONTINUOUS_EQUIPMENT: readonly EquipmentId[] = ["saturometre"];

export const monitoringModeOf = (signal: VitalSignal): MonitoringMode =>
  SIGNAL_DYNAMICS[signal].mode;

/** Constantes qu'un appareil donné tient à jour tant qu'il est en place. */
export function continuousSignalsOf(equipment: EquipmentId): VitalSignal[] {
  return (Object.keys(SIGNAL_EQUIPMENT) as VitalSignal[]).filter(
    (signal) => SIGNAL_EQUIPMENT[signal] === equipment && monitoringModeOf(signal) === "continuous",
  );
}

/* -------------------------------------------------------------------------- */
/* Qualité du signal                                                          */
/* -------------------------------------------------------------------------- */

/** Le capteur cherche son signal pendant les premières secondes suivant la pose. */
export const ACQUISITION_SECONDS = 5;

/** Fenêtres d'artéfacts. Récurrentes, déterministes, jamais tirées à l'affichage. */
const WEAK_SIGNAL = { periodSeconds: 165, windowSeconds: 11 };
const MOVEMENT_ARTIFACT = { periodSeconds: 97, windowSeconds: 6 };

export interface SignalQualityInput {
  seed: number;
  /** Instant de la pose du capteur. `null` si aucun capteur n'est en place. */
  attachedAtSeconds: number | null;
  atSeconds: number;
}

/**
 * Qualité du signal d'un capteur en place.
 *
 * L'ordre des réponses est celui du terrain : d'abord « aucun capteur », puis
 * « mesure en cours », puis les deux dérangements possibles. Le signal faible
 * l'emporte sur l'artéfact de mouvement parce qu'il appelle un geste précis —
 * repositionner le capteur — alors que l'artéfact passe tout seul.
 */
export function signalQualityAt(input: SignalQualityInput): SignalQuality {
  const { seed, attachedAtSeconds, atSeconds } = input;
  if (attachedAtSeconds === null) return "lost";
  const attachedFor = atSeconds - attachedAtSeconds;
  if (attachedFor < 0) return "lost";
  if (attachedFor < ACQUISITION_SECONDS) return "measuring";
  if (inRecurringWindow(hashSeed(seed, "weak"), atSeconds, WEAK_SIGNAL)) return "weak";
  if (inRecurringWindow(hashSeed(seed, "artifact"), atSeconds, MOVEMENT_ARTIFACT))
    return "artifact";
  return "good";
}

/** Une valeur chiffrée s'affiche-t-elle malgré la qualité du signal ? */
export function qualityAllowsReading(quality: SignalQuality): boolean {
  // Pendant l'acquisition et sans signal, le moniteur n'affiche pas de chiffre.
  // Un signal faible ou bruité en affiche un, et c'est justement le piège du
  // terrain : la valeur est là, elle est peu fiable, il faut repositionner.
  return quality === "good" || quality === "weak" || quality === "artifact";
}

/* -------------------------------------------------------------------------- */
/* Tracés                                                                     */
/* -------------------------------------------------------------------------- */

/** Un tracé prêt à dessiner : des points dans [-1, 1], sans unité ni valeur. */
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

const EMPTY_TRACE = (quality: SignalQuality): WaveformTrace => ({
  points: [],
  windowSeconds: 0,
  quality,
  ratePerMinute: null,
});

/** Interpolation douce entre 0 et 1. */
const smoothstep = (t: number): number => {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
};

/**
 * Forme d'une onde pléthysmographique sur un cycle, phase dans [0, 1).
 *
 * Quatre segments, dans l'ordre où un doigt les produit : montée systolique
 * rapide, descente, incisure dicrote, retour à la ligne de base. Une sinusoïde
 * aurait été plus simple et n'aurait ressemblé à rien de ce qu'affiche un
 * saturomètre.
 */
export function plethysmographPhase(phase: number): number {
  const p = phase - Math.floor(phase);
  if (p < 0.12) return Math.sin((p / 0.12) * (Math.PI / 2));
  if (p < 0.38) return 1 - 0.65 * smoothstep((p - 0.12) / 0.26);
  if (p < 0.52) return 0.35 + 0.18 * Math.sin(((p - 0.38) / 0.14) * Math.PI);
  return 0.35 * (1 - smoothstep((p - 0.52) / 0.48));
}

/**
 * Forme d'un cycle respiratoire, phase dans [0, 1).
 *
 * L'inspiration occupe 40 % du cycle et l'expiration 60 % : une respiration
 * symétrique se voit immédiatement comme une machine.
 */
export function respirationPhase(phase: number): number {
  const p = phase - Math.floor(phase);
  if (p < 0.4) return Math.sin((p / 0.4) * (Math.PI / 2));
  return Math.cos(((p - 0.4) / 0.6) * (Math.PI / 2));
}

export interface TraceInput {
  seed: number;
  atSeconds: number;
  /** Cadence mesurée par le joueur. `null` interdit tout tracé. */
  ratePerMinute: number | null;
  quality: SignalQuality;
  windowSeconds?: number;
  /** Nombre de points rendus. Fixe la finesse du tracé, pas sa vitesse. */
  resolution?: number;
}

/** Amplitude selon la qualité : un signal faible donne un tracé écrasé. */
const QUALITY_AMPLITUDE: Record<SignalQuality, number> = {
  good: 1,
  weak: 0.35,
  artifact: 0.9,
  measuring: 0,
  lost: 0,
};

function trace(input: TraceInput, shape: (phase: number) => number): WaveformTrace {
  const { seed, atSeconds, ratePerMinute, quality } = input;
  const windowSeconds = input.windowSeconds ?? 6;
  const resolution = input.resolution ?? 120;

  // Deux verrous, et le premier est le plus important : sans cadence mesurée, il
  // n'y a pas de tracé du tout.
  if (ratePerMinute === null || ratePerMinute <= 0) return EMPTY_TRACE(quality);
  if (quality === "lost" || quality === "measuring") return EMPTY_TRACE(quality);

  const amplitude = QUALITY_AMPLITUDE[quality];
  const cyclesPerSecond = ratePerMinute / 60;
  const points: number[] = [];
  for (let index = 0; index < resolution; index += 1) {
    const offset = (index / (resolution - 1)) * windowSeconds;
    const time = atSeconds - windowSeconds + offset;
    let value = shape(time * cyclesPerSecond) * amplitude;
    if (quality === "artifact") {
      // Le mouvement du patient déforme le tracé sans changer sa cadence : c'est
      // ce qui le distingue d'une vraie variation de fréquence.
      value += 0.35 * smoothNoise(hashSeed(seed, "artifact-shape"), time, 0.8);
    }
    points.push(Number(value.toFixed(4)));
  }
  return { points, windowSeconds, quality, ratePerMinute };
}

/** Tracé pléthysmographique du saturomètre. */
export const plethysmographTrace = (input: TraceInput): WaveformTrace =>
  trace(input, plethysmographPhase);

/** Tracé respiratoire, visible seulement après un comptage de la fréquence. */
export const respirationTrace = (input: TraceInput): WaveformTrace =>
  trace({ ...input, windowSeconds: input.windowSeconds ?? 12 }, respirationPhase);
