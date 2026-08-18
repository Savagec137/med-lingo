/**
 * La seule porte entre la physiologie et l'écran.
 *
 * Le moteur connaît tout du patient dès la première seconde. L'interface ne doit
 * rien en apprendre qui n'ait été mesuré. Entre les deux, ces sélecteurs — et
 * rien d'autre.
 *
 * **Pourquoi ils prennent la session complète.** La signature naturelle serait
 * `getVisibleLiveVitals(sessionView)`. Elle est impossible, et son impossibilité
 * est le mécanisme lui-même : la vue de session ne contient pas la physiologie,
 * précisément pour qu'un composant ne puisse pas l'atteindre. Un sélecteur qui
 * s'en contenterait signifierait que les constantes réelles voyagent jusqu'à
 * l'interface. Ces fonctions reçoivent donc la session entière, ne sont appelées
 * que depuis le moteur et le hook, et ne rendent que des objets sans donnée
 * cachée — c'est ce contrat que les tests d'étanchéité vérifient.
 *
 * **La double condition.** Une constante n'est « en direct » que si deux choses
 * sont vraies en même temps : le joueur l'a **relevée**, et un capteur est
 * **en place**. La première interdit d'afficher une valeur jamais gagnée ; la
 * seconde interdit de continuer à l'actualiser une fois le capteur retiré.
 */

import type {
  EquipmentId,
  FactId,
  InterventionSession,
  InterventionSessionView,
} from "../v3-domain.ts";
import { EQUIPMENT_LABELS } from "../v3-domain.ts";
import { getFact, CLINICAL_FACTS } from "../facts/fact-registry.ts";
import { readFact } from "../facts/read-fact.ts";
import { vitalSeverity } from "../clinical/intervention-vitals.ts";
import type {
  AttachedSensorView,
  LiveVitalView,
  MonitoringSnapshot,
  MonitoringStateView,
  SignalQuality,
  StaleVitalView,
  VitalSignal,
  WaveformStateView,
} from "./physiology-types.ts";
import { SIGNAL_QUALITY_LABELS } from "./physiology-types.ts";
import { samplePhysiology } from "./physiology-engine.ts";
import { SIGNAL_DYNAMICS } from "./vital-trends.ts";
import {
  SIGNAL_EQUIPMENT,
  monitoringModeOf,
  plethysmographTrace,
  qualityAllowsReading,
  respirationTrace,
  signalQualityAt,
} from "./equipment-monitoring.ts";

/* -------------------------------------------------------------------------- */
/* Correspondance faits ↔ constantes                                          */
/* -------------------------------------------------------------------------- */

/**
 * Le fait qui porte une constante, **dérivé du registre** et jamais écrit ici.
 *
 * Une table recopiée à la main cesserait d'être juste au premier fait renommé, et
 * la désynchronisation se verrait par une constante qui n'anime plus rien —
 * c'est-à-dire trop tard.
 */
const FACT_BY_SIGNAL = new Map<VitalSignal, FactId>(
  CLINICAL_FACTS.filter((fact) => fact.vitalKey !== null).map((fact) => [
    fact.vitalKey as VitalSignal,
    fact.id,
  ]),
);

export const factIdForSignal = (signal: VitalSignal): FactId | undefined =>
  FACT_BY_SIGNAL.get(signal);

/* -------------------------------------------------------------------------- */
/* État du matériel                                                           */
/* -------------------------------------------------------------------------- */

const POSE_ACTIONS: Record<string, EquipmentId> = {
  "action.poser-saturometre": "saturometre",
};

const REMOVE_ACTIONS: Record<string, EquipmentId> = {
  "action.retirer-saturometre": "saturometre",
};

/**
 * Depuis quand un capteur est en place, en secondes simulées.
 *
 * Reconstruit depuis le journal plutôt que stocké : `equipment.attached` dit
 * qu'un capteur est posé, pas depuis quand, et c'est l'instant de la pose qui
 * décide de l'animation d'acquisition. Le journal est dans la vue de session,
 * donc cette lecture ne coûte aucune donnée cachée.
 */
export function attachedAtSeconds(
  session: InterventionSessionView,
  equipment: EquipmentId,
): number | null {
  const inPlace = session.equipment.some((item) => item.id === equipment && item.attached);
  if (!inPlace) return null;
  let since: number | null = null;
  for (const entry of session.actionLog) {
    if (entry.outcome === "refused") continue;
    if (POSE_ACTIONS[entry.actionId] === equipment) since = entry.atSeconds;
    if (REMOVE_ACTIONS[entry.actionId] === equipment) since = null;
  }
  return since;
}

/** Qualité du signal d'un capteur, à l'instant demandé. */
export function equipmentSignalQuality(
  session: InterventionSession,
  equipment: EquipmentId,
  atSeconds: number,
): SignalQuality {
  return signalQualityAt({
    seed: session.physiology.seed,
    attachedAtSeconds: attachedAtSeconds(session, equipment),
    atSeconds,
  });
}

/* -------------------------------------------------------------------------- */
/* Constantes en direct                                                       */
/* -------------------------------------------------------------------------- */

/** Format d'affichage d'une constante surveillée, unité exclue. */
function formatSignal(signal: VitalSignal, value: number): string {
  const { decimals } = SIGNAL_DYNAMICS[signal];
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals).replace(".", ",");
}

/** Écart en dessous duquel deux échantillons se valent : le tracé ne « monte » pas. */
const TREND_SIGNIFICANCE: Partial<Record<VitalSignal, number>> = { spo2: 0.5, hr: 1.5 };

function liveTrendDirection(
  session: InterventionSession,
  signal: VitalSignal,
  atSeconds: number,
): "up" | "down" | "stable" {
  // La comparaison porte sur dix secondes : sur deux secondes, tout est bruit, et
  // une flèche qui s'inverse à chaque rafraîchissement n'informe de rien.
  const previous = samplePhysiology(session.physiology, Math.max(0, atSeconds - 10))[signal];
  const current = samplePhysiology(session.physiology, atSeconds)[signal];
  const delta = current - previous;
  const significance = TREND_SIGNIFICANCE[signal] ?? 1;
  if (Math.abs(delta) < significance) return "stable";
  return delta > 0 ? "up" : "down";
}

/**
 * Une constante est-elle surveillée en direct à cet instant ?
 *
 * Les deux conditions, dans l'ordre où elles comptent : mesurée par le joueur,
 * puis tenue à jour par un capteur en place.
 */
export function isSignalLive(session: InterventionSessionView, signal: VitalSignal): boolean {
  if (monitoringModeOf(signal) !== "continuous") return false;
  const equipment = SIGNAL_EQUIPMENT[signal];
  if (!equipment) return false;
  if (attachedAtSeconds(session, equipment) === null) return false;

  const factId = factIdForSignal(signal);
  if (!factId) return false;
  return readFact(session, factId).status === "known";
}

/**
 * Les constantes actuellement surveillées, avec leur valeur du moment.
 *
 * La liste est **vide** sur une session vierge, vide après un retrait de capteur,
 * et vide tant que la mesure n'a pas été faite — même capteur posé. Ce n'est pas
 * un cas d'erreur : c'est l'état normal d'un début d'intervention.
 */
export function getVisibleLiveVitals(
  session: InterventionSession,
  atSeconds: number,
): LiveVitalView[] {
  const views: LiveVitalView[] = [];
  const sampled = samplePhysiology(session.physiology, atSeconds);

  for (const [signal, factId] of FACT_BY_SIGNAL) {
    if (!isSignalLive(session, signal)) continue;
    const equipment = SIGNAL_EQUIPMENT[signal];
    const quality = equipment ? equipmentSignalQuality(session, equipment, atSeconds) : "lost";
    const fact = getFact(factId);
    const readable = qualityAllowsReading(quality);
    const value = sampled[signal];

    views.push({
      signal,
      factId,
      label: fact.label,
      // Pendant l'acquisition, le moniteur n'affiche pas de chiffre : il cherche.
      value: readable ? formatSignal(signal, value) : null,
      numericValue: readable ? value : null,
      unit: fact.unit,
      isMeasured: true,
      isLive: true,
      // Une valeur tenue à jour par un capteur ne peut pas être périmée.
      isStale: false,
      signalQuality: quality,
      trendDirection: readable ? liveTrendDirection(session, signal, atSeconds) : "stable",
      severity: vitalSeverity(fact.vitalKey!, value, session.physiology.profile.ageBand),
    });
  }
  return views;
}

/* -------------------------------------------------------------------------- */
/* État de surveillance                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Les types de vue vivent dans `physiology-types.ts`, pas ici.
 *
 * L'interface a besoin de les nommer — un composant doit pouvoir déclarer qu'il
 * reçoit un `MonitoringStateView` — et elle n'a pas le droit d'importer ce
 * module, qui donne accès au moteur. Les déclarer là-bas est ce qui permet aux
 * deux règles de tenir ensemble : les contrats sont publics, les moteurs ne le
 * sont pas.
 */

/**
 * L'état du moniteur, tel qu'un soignant le lit en levant les yeux.
 *
 * `statusLabel` ne dit jamais rien du patient — « saturomètre non posé »,
 * « acquisition du signal ». Un bandeau qui annoncerait « patient stable »
 * offrirait la conclusion que le joueur doit tirer lui-même.
 */
export function getVisibleMonitoringState(
  session: InterventionSession,
  atSeconds: number,
): MonitoringStateView {
  const sensors: AttachedSensorView[] = [];
  for (const item of session.equipment) {
    const since = attachedAtSeconds(session, item.id);
    if (since === null) continue;
    const quality = equipmentSignalQuality(session, item.id, atSeconds);
    sensors.push({
      equipment: item.id,
      label: EQUIPMENT_LABELS[item.id],
      quality,
      qualityLabel: SIGNAL_QUALITY_LABELS[quality],
      attachedForSeconds: Math.max(0, atSeconds - since),
      acquiring: quality === "measuring",
    });
  }

  const liveVitals = getVisibleLiveVitals(session, atSeconds);
  const statusLabel =
    sensors.length === 0
      ? "Saturomètre non posé"
      : sensors.some((sensor) => sensor.acquiring)
        ? "Acquisition du signal"
        : liveVitals.length === 0
          ? "Capteur en place — aucune constante relevée"
          : (sensors.find((sensor) => sensor.quality !== "good")?.qualityLabel ??
            "Surveillance active");

  return { anyLive: liveVitals.length > 0, sensors, liveVitals, statusLabel };
}

/* -------------------------------------------------------------------------- */
/* Tracés                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Les tracés autorisés à l'instant demandé.
 *
 * L'onde de pouls suit la **valeur en direct** : capteur posé, mesure faite. Le
 * tracé respiratoire suit la **dernière fréquence comptée** — personne ne
 * surveille une respiration en continu dans une ambulance, mais une fois comptée,
 * l'animer à cette cadence n'invente rien.
 *
 * Une fréquence périmée n'anime plus : au bout de cinq minutes, le tracé
 * respiratoire s'arrête plutôt que d'entretenir une cadence qui n'a plus cours.
 */
export function getVisibleWaveformState(
  session: InterventionSession,
  atSeconds: number,
): WaveformStateView {
  const seed = session.physiology.seed;

  const live = getVisibleLiveVitals(session, atSeconds);
  const pulseSignal = live.find((entry) => entry.signal === "hr");
  const saturometerQuality = equipmentSignalQuality(session, "saturometre", atSeconds);

  const respiratoryFactId = factIdForSignal("rr");
  const respiratory = respiratoryFactId ? readFact(session, respiratoryFactId) : undefined;
  const respiratoryRate =
    respiratory?.status === "known" && !respiratory.isStale && respiratory.value.kind === "numeric"
      ? respiratory.value.value
      : null;

  return {
    pulse: plethysmographTrace({
      seed,
      atSeconds,
      ratePerMinute: pulseSignal?.numericValue ?? null,
      quality: saturometerQuality,
    }),
    respiration: respirationTrace({
      seed: seed + 1,
      atSeconds,
      ratePerMinute: respiratoryRate,
      // Le comptage manuel n'a pas de capteur, donc pas de défaut de capteur :
      // sa qualité est celle du relevé, bonne ou inexistante.
      quality: respiratoryRate === null ? "lost" : "good",
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Mesures datées                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Les mesures que le temps a périmées.
 *
 * Elles restent affichées — effacer une tension parce qu'elle date de six minutes
 * priverait le joueur de ce qu'il a réellement relevé — mais elles sont nommées
 * comme datées, et c'est ce qui déclenche la réévaluation.
 *
 * Une constante surveillée en direct n'y figure jamais : un capteur en place la
 * tient à jour.
 */
export function getVisibleStaleVitals(
  session: InterventionSession,
  atSeconds: number,
): StaleVitalView[] {
  const stale: StaleVitalView[] = [];
  for (const [signal, factId] of FACT_BY_SIGNAL) {
    if (isSignalLive(session, signal)) continue;
    const read = readFact(session, factId);
    if (read.status !== "known" || !read.isStale) continue;
    stale.push({
      factId,
      label: read.fact.label,
      ageSeconds: read.ageSeconds,
      freshnessSeconds: read.fact.freshnessSeconds ?? 0,
      noticeLabel: "À réévaluer",
    });
  }
  return stale;
}

/* -------------------------------------------------------------------------- */
/* L'instantané complet                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Tout ce que l'interface reçoit de la physiologie, en un seul appel.
 *
 * C'est la seule fonction que le hook appelle, et c'est voulu : un appelant qui
 * compose lui-même les quatre sélecteurs finit tôt ou tard par en oublier un, ou
 * par les évaluer à des instants différents — et un moniteur dont l'onde et le
 * chiffre décrivent deux moments distincts est un moniteur qui ment.
 */
export function monitoringSnapshot(
  session: InterventionSession,
  atSeconds: number,
): MonitoringSnapshot {
  return {
    atSeconds,
    monitoring: getVisibleMonitoringState(session, atSeconds),
    waveform: getVisibleWaveformState(session, atSeconds),
    stale: getVisibleStaleVitals(session, atSeconds),
  };
}
