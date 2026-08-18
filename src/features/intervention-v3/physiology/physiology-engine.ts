/**
 * Le moteur physiologique.
 *
 * Il répond à une seule question : **que valent les constantes de ce patient à
 * l'instant t ?** Pas « fais avancer le patient d'un tour », qui obligerait à
 * garder un état mutable et rendrait tout rejeu approximatif.
 *
 * La valeur d'une constante se compose en quatre temps :
 *
 *   1. la **base** du profil, c'est-à-dire l'état du patient à l'arrivée ;
 *   2. les **tractions** — tendance de fond et événements datés — qui déplacent
 *      lentement la destination ;
 *   3. les **couplages**, qui font qu'une hypoxie accélère le cœur et qu'une
 *      chute de systolique entraîne la diastolique ;
 *   4. le **bruit**, lisse et borné, qui donne la vie du moniteur.
 *
 * Les couplages sont appliqués en **différentiel** : on retranche ce qu'ils
 * valaient déjà sur la base. Sans cela, un patient déclaré à 28 cycles par minute
 * parce qu'il est en détresse verrait la détresse recomptée au premier instant et
 * bondirait à 34 avant que l'équipe ait posé un doigt sur lui.
 *
 * Rien dans ce module ne sait ce que le joueur a mesuré. C'est délibéré : la
 * physiologie est vraie indépendamment de ce qu'on en observe, et le filtrage de
 * ce qui est affichable appartient aux sélecteurs.
 */

import type { InterventionVitals } from "../clinical/intervention-vitals.ts";
import type {
  ClinicalTrend,
  PhysiologyEvent,
  PhysiologyEventKind,
  PhysiologyProfile,
  PhysiologyState,
  VitalSignal,
} from "./physiology-types.ts";
import { VITAL_SIGNALS } from "./physiology-types.ts";
import { hashSeed, smoothNoise } from "./vital-noise.ts";
import {
  SIGNAL_DYNAMICS,
  TREND_SEVERITY_STEP,
  eventPull,
  pullProgress,
  trendPull,
  type VitalPull,
} from "./vital-trends.ts";

/* -------------------------------------------------------------------------- */
/* Construction                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Graine d'une session.
 *
 * Dérivée du scénario et d'un sel, jamais tirée au hasard : deux sessions du
 * même scénario avec le même sel produisent la même courbe, ce qui rend le rejeu
 * fidèle et les tests possibles. Le sel permet à deux parties successives du même
 * joueur de ne pas être identiques — c'est à l'appelant de le fournir s'il le
 * souhaite.
 */
export function physiologySeed(scenarioId: string, salt: number = 0): number {
  return hashSeed("physiology", scenarioId, salt);
}

export function createPhysiology(profile: PhysiologyProfile, seed: number): PhysiologyState {
  return { profile, seed, events: [] };
}

/**
 * Ajoute un événement à la trajectoire.
 *
 * L'état n'est jamais muté : on empile ce qui est arrivé, et les valeurs se
 * recalculent. Un événement à la minute quatre produit le même effet qu'on
 * l'évalue tout de suite ou en rejouant la mission plus tard.
 */
export function withPhysiologyEvent(
  state: PhysiologyState,
  kind: PhysiologyEventKind,
  atSeconds: number,
  cause: string,
): PhysiologyState {
  const event: PhysiologyEvent = { atSeconds, kind, cause };
  return { ...state, events: [...state.events, event] };
}

export const hasPhysiologyEvent = (state: PhysiologyState, kind: PhysiologyEventKind): boolean =>
  state.events.some((event) => event.kind === kind);

/* -------------------------------------------------------------------------- */
/* Cibles                                                                     */
/* -------------------------------------------------------------------------- */

/** Valeur de départ d'une constante, lue dans le profil. */
export function baselineOf(profile: PhysiologyProfile, signal: VitalSignal): number {
  switch (signal) {
    case "spo2":
      return profile.baselineSpO2;
    case "hr":
      return profile.baselineHeartRate;
    case "rr":
      return profile.baselineRespiratoryRate;
    case "sbp":
      return profile.baselineSystolic;
    case "dbp":
      return profile.baselineDiastolic;
    case "glycemia":
      return profile.baselineGlucose;
    case "temperature":
      return profile.baselineTemperature;
    case "gcs":
      return profile.glasgow;
    case "pain":
      return profile.painLevel;
  }
}

export function baselineVitals(profile: PhysiologyProfile): InterventionVitals {
  return fromSignals((signal) => baselineOf(profile, signal));
}

/** Toutes les tractions actives sur ce patient : la tendance, puis les événements. */
export function pullsOf(state: PhysiologyState): VitalPull[] {
  const pulls: VitalPull[] = [trendPull(state.profile)];
  for (const event of state.events) {
    const pull = eventPull(event.kind, event.atSeconds, state.profile);
    if (pull) pulls.push(pull);
  }
  return pulls;
}

/**
 * Destination d'une constante à l'instant t, couplages exclus.
 *
 * C'est la valeur « propre » : celle vers laquelle le patient se dirige, sans le
 * bruit du capteur ni les compensations de l'organisme.
 */
function pulledTargets(state: PhysiologyState, atSeconds: number): InterventionVitals {
  const pulls = pullsOf(state);
  return fromSignals((signal) => {
    let value = baselineOf(state.profile, signal);
    for (const pull of pulls) {
      const offset = pull.offsets[signal];
      if (offset !== undefined) value += offset * pullProgress(pull, atSeconds);
    }
    return value;
  });
}

/* -------------------------------------------------------------------------- */
/* Couplages                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Compensations de l'organisme, exprimées en décalages.
 *
 * Un corps ne subit pas ses constantes : il réagit. Une hypoxie fait accélérer la
 * respiration et le cœur ; une chute de tension provoque une tachycardie
 * compensatrice ; une douleur forte accélère les deux ; une conscience très
 * altérée déprime la ventilation.
 *
 * Ces décalages sont **relatifs à la base** : `couplingOffsets` est calculé sur la
 * base autant que sur l'instant courant, et seule la différence est appliquée. Un
 * patient déjà tachypnéique à l'arrivée ne se voit donc pas ajouter la tachypnée
 * qu'il a déjà.
 */
function couplingOffsets(vitals: InterventionVitals): Partial<Record<VitalSignal, number>> {
  const hypoxia = Math.max(0, 92 - vitals.spo2) / 10;
  const hypoperfusion = Math.max(0, 100 - vitals.sbp) / 20;
  const painDrive = Math.max(0, vitals.pain - 4) / 6;
  const fever = Math.max(0, vitals.temperature - 38);
  const depression = vitals.gcs < 8 ? 1 : 0;

  return {
    hr: Math.min(35, hypoperfusion * 18 + painDrive * 10 + hypoxia * 6 + fever * 8),
    rr: Math.min(14, hypoxia * 3 + painDrive * 2 + fever * 2) - depression * 3,
    gcs: -Math.min(6, (hypoxia + hypoperfusion) * 1.6),
    // La diastolique suit la systolique : elle n'a pas de tendance propre, et lui
    // en donner une ferait diverger la pression différentielle.
    dbp: 0,
  };
}

/** Diastolique déduite de la systolique, en conservant le rapport de la base. */
function coupledDiastolic(
  profile: PhysiologyProfile,
  systolic: number,
  baselineSystolic: number,
): number {
  const ratio = profile.baselineDiastolic / baselineSystolic;
  const followed = profile.baselineDiastolic + (systolic - baselineSystolic) * ratio;
  // La pression différentielle se pince quand la perfusion chute, sans jamais
  // s'inverser : une diastolique au-dessus de la systolique n'existe pas.
  return Math.min(followed, systolic - 10);
}

/* -------------------------------------------------------------------------- */
/* Échantillonnage                                                            */
/* -------------------------------------------------------------------------- */

const clampSignal = (signal: VitalSignal, value: number): number => {
  const [low, high] = SIGNAL_DYNAMICS[signal].bounds;
  return Math.min(high, Math.max(low, value));
};

const roundSignal = (signal: VitalSignal, value: number): number => {
  const { decimals } = SIGNAL_DYNAMICS[signal];
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** Bruit du capteur pour une constante, dans son unité. */
function signalNoise(state: PhysiologyState, signal: VitalSignal, atSeconds: number): number {
  const dynamics = SIGNAL_DYNAMICS[signal];
  if (dynamics.noiseAmplitude === 0) return 0;
  // Une graine par constante : la saturation et le pouls ne dérivent pas à
  // l'unisson, ce qui trahirait immédiatement un générateur unique.
  const seed = hashSeed(state.seed, signal);
  return dynamics.noiseAmplitude * smoothNoise(seed, atSeconds, dynamics.noisePeriodSeconds);
}

/**
 * Les constantes réelles du patient à l'instant t.
 *
 * **C'est la vérité du terrain, pas ce qui est affichable.** Cette fonction ne
 * doit jamais être appelée depuis un composant : les sélecteurs sont la seule
 * porte, et ils n'ouvrent que sur ce que le joueur a mesuré.
 */
export function samplePhysiology(state: PhysiologyState, atSeconds: number): InterventionVitals {
  const time = Math.max(0, atSeconds);
  const targets = pulledTargets(state, time);
  const baseline = baselineVitals(state.profile);
  const atBaseline = couplingOffsets(baseline);
  const atNow = couplingOffsets(targets);

  const sampled = fromSignals((signal) => {
    const differential = (atNow[signal] ?? 0) - (atBaseline[signal] ?? 0);
    return clampSignal(signal, targets[signal] + differential + signalNoise(state, signal, time));
  });

  // La diastolique est déduite en dernier, une fois la systolique connue : c'est
  // une conséquence, pas une constante indépendante.
  sampled.dbp = clampSignal(
    "dbp",
    coupledDiastolic(state.profile, sampled.sbp, baseline.sbp) + signalNoise(state, "dbp", time),
  );

  return fromSignals((signal) => roundSignal(signal, sampled[signal]));
}

/** Une constante seule, à l'instant t. */
export function sampleVital(
  state: PhysiologyState,
  signal: VitalSignal,
  atSeconds: number,
): number {
  return samplePhysiology(state, atSeconds)[signal];
}

/* -------------------------------------------------------------------------- */
/* Lecture de trajectoire                                                     */
/* -------------------------------------------------------------------------- */

/**
 * La tendance telle qu'elle se présente après les événements.
 *
 * Sert au débriefing, jamais à l'affichage en cours de mission : dire au joueur
 * « ce patient se dégrade » lui donnerait gratuitement la lecture clinique qu'il
 * doit construire à partir de ses mesures.
 */
export function effectiveTrend(state: PhysiologyState): ClinicalTrend {
  let step = 0;
  for (const event of state.events) {
    if (event.kind === "dangerous_act" || event.kind === "deterioration") step += 1;
    if (event.kind === "immobilised") step -= 1;
  }
  return TREND_SEVERITY_STEP(state.profile.trend, step);
}

/**
 * Écart entre deux instants pour une constante, dans son unité.
 *
 * Utilisé par les tests de plausibilité : c'est la quantité qui ne doit jamais
 * dépasser `maxStepPerSample` en l'absence d'événement.
 */
export function vitalStep(
  state: PhysiologyState,
  signal: VitalSignal,
  fromSeconds: number,
  toSeconds: number,
): number {
  return Math.abs(sampleVital(state, signal, toSeconds) - sampleVital(state, signal, fromSeconds));
}

/* -------------------------------------------------------------------------- */
/* Utilitaires                                                                */
/* -------------------------------------------------------------------------- */

function fromSignals(compute: (signal: VitalSignal) => number): InterventionVitals {
  const vitals = {} as InterventionVitals;
  for (const signal of VITAL_SIGNALS) vitals[signal] = compute(signal);
  return vitals;
}
