/**
 * La seule porte d'accès aux données cliniques côté interface.
 *
 * Aucun composant ne lit `session.vitals`. Il appelle `readFact`, qui retourne
 * soit une valeur relevée, soit une absence nommée. `status: "unknown"` n'est
 * pas une erreur : c'est le cas d'affichage qui produit les « Non mesurée » de
 * l'écran de réévaluation.
 */

import type {
  ClinicalFact,
  FactId,
  FactMeasurement,
  FactRead,
  FactUnknownReason,
  FactValue,
  InterventionScenario,
  InterventionSession,
} from "../v3-domain.ts";
import type { VitalTrend } from "../clinical/intervention-vitals.ts";
import { getFact } from "./fact-registry.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { EQUIPMENT_LABELS } from "../v3-domain.ts";

/** Seuil au-delà duquel un écart entre deux mesures cesse d'être du bruit. */
function significanceFor(fact: ClinicalFact): number {
  return fact.unit === "°C" || fact.unit === "mmol/L" ? 0.15 : 0.5;
}

function numericOf(value: FactValue): number | undefined {
  if (value.kind === "numeric") return value.value;
  if (value.kind === "ratio") return value.systolic;
  return undefined;
}

function formatDelta(fact: ClinicalFact, absolute: number): string {
  if (fact.unit === "°C") return `${absolute.toFixed(1).replace(".", ",")} °C`;
  if (fact.unit === "mmol/L") return `${absolute.toFixed(1).replace(".", ",")} mmol/L`;
  return String(Math.round(absolute));
}

/**
 * Tendance entre les deux derniers relevés. Absente à une seule mesure : une
 * flèche sur un point unique inventerait une évolution.
 */
export function trendOf(
  fact: ClinicalFact,
  measurements: readonly FactMeasurement[],
): { trend: VitalTrend; delta: string } | undefined {
  if (measurements.length < 2) return undefined;
  const current = numericOf(measurements[measurements.length - 1]!.value);
  const previous = numericOf(measurements[measurements.length - 2]!.value);
  if (current === undefined || previous === undefined) return undefined;
  const raw = current - previous;
  const significance = significanceFor(fact);
  if (Math.abs(raw) < significance) return { trend: "stable", delta: "stable" };
  return {
    trend: raw > 0 ? "up" : "down",
    delta: `${raw > 0 ? "+" : "−"}${formatDelta(fact, Math.abs(raw))}`,
  };
}

/** Historique exploitable pour une courbe. Vide sous deux mesures. */
export function trendSeries(
  session: InterventionSession,
  factId: FactId,
): readonly FactMeasurement[] {
  const state = session.revealedFacts[factId];
  if (!state || state.measurements.length < 2) return [];
  return state.measurements;
}

const missingEquipment = (session: InterventionSession, fact: ClinicalFact) =>
  fact.requiresEquipment.filter(
    (id) => !session.equipment.some((entry) => entry.id === id && entry.prepared),
  );

/**
 * Visibilité d'un fait. Quatre règles, et aucune autre : en particulier, la
 * phase courante n'entre pas en compte pour un fait déjà relevé — ce qui a été
 * mesuré reste connu d'un écran à l'autre.
 */
export function isFactVisible(session: InterventionSession, factId: FactId): boolean {
  const fact = getFact(factId);
  switch (fact.visibility) {
    case "always":
      return true;
    case "on_arrival":
      return session.phase !== "new_call";
    case "on_action":
      return factId in session.revealedFacts;
    case "on_dependency":
      return fact.dependsOn.every((dependency) => isFactVisible(session, dependency));
  }
}

/** Valeur d'un fait calculé, à partir des seuls faits déjà visibles. */
function resolveDerived(session: InterventionSession, fact: ClinicalFact): FactValue | undefined {
  if (fact.id !== "fact.stabilite-parametres") return undefined;
  const severities = fact.dependsOn.map((id) => session.revealedFacts[id]?.severity);
  if (severities.some((severity) => severity === undefined)) return undefined;
  if (severities.includes("critical")) {
    return { kind: "enum", value: "degrades", formatted: "Paramètres dégradés" };
  }
  if (severities.includes("warning")) {
    return { kind: "enum", value: "surveiller", formatted: "Paramètres à surveiller" };
  }
  return { kind: "enum", value: "stables", formatted: "Paramètres stables" };
}

function unknownReason(
  session: InterventionSession,
  scenario: InterventionScenario,
  fact: ClinicalFact,
): { reason: FactUnknownReason; label: string } {
  // L'ordre compte. On répond d'abord « ce fait ne concerne pas cette mission »,
  // puis « le matériel manque », puis « rien n'a encore été relevé ». Répondre
  // « matériel manquant » sur un fait hors périmètre serait exact et inutile.
  if (!scenario.factIds.includes(fact.id)) {
    return { reason: "not_applicable", label: "Sans objet ici" };
  }
  const missing = missingEquipment(session, fact);
  if (missing.length > 0) {
    const names = missing.map((id) => EQUIPMENT_LABELS[id]).join(", ");
    return { reason: "equipment_missing", label: `${names} non embarqué` };
  }
  if (fact.category === "derived") {
    return { reason: "not_revealed", label: fact.placeholder };
  }
  return { reason: "not_revealed", label: notMeasuredLabel(fact) };
}

/** « Non mesurée » pour une constante, le gabarit propre du fait sinon. */
function notMeasuredLabel(fact: ClinicalFact): string {
  return fact.category === "probe" ? "Non mesurée" : fact.placeholder;
}

/**
 * Lecture d'un fait pour l'affichage.
 *
 * La valeur retournée est celle **figée au moment du relevé**, jamais recalculée
 * depuis `session.vitals`. Le patient continue d'évoluer pendant que l'écran
 * affiche la dernière prise, ce qui est fidèle au terrain et donne la
 * péremption sans mécanisme dédié.
 */
export function readFact(session: InterventionSession, factId: FactId): FactRead {
  const fact = getFact(factId);
  const scenario = getV3Scenario(session.scenarioId);

  if (!isFactVisible(session, factId)) {
    const { reason, label } = unknownReason(session, scenario, fact);
    return { status: "unknown", fact, reason, placeholder: fact.placeholder, label };
  }

  if (fact.category === "derived") {
    const value = resolveDerived(session, fact);
    if (!value) {
      return {
        status: "unknown",
        fact,
        reason: "not_revealed",
        placeholder: fact.placeholder,
        label: fact.placeholder,
      };
    }
    return { status: "known", fact, value, severity: "normal", ageSeconds: 0, isStale: false };
  }

  const state = session.revealedFacts[factId];
  if (!state) {
    // Faits `always` et `on_arrival` : ce que la régulation transmet et ce qu'on
    // voit en arrivant appartiennent au scénario, pas à un relevé. Ils se lisent
    // sans entrée dans `revealedFacts`, qui reste ainsi le registre de ce que le
    // joueur est allé chercher lui-même.
    const authored = scenario.factValues[factId];
    if (authored) {
      return {
        status: "known",
        fact,
        value: authored,
        severity: "normal",
        ageSeconds: 0,
        isStale: false,
      };
    }
    const { reason, label } = unknownReason(session, scenario, fact);
    return { status: "unknown", fact, reason, placeholder: fact.placeholder, label };
  }

  const ageSeconds = Math.max(0, session.simulatedTimeSeconds - state.lastMeasuredAtSeconds);
  const isStale = fact.freshnessSeconds !== null && ageSeconds > fact.freshnessSeconds;
  const trend = trendOf(fact, state.measurements);

  return {
    status: "known",
    fact,
    value: state.current,
    severity: state.severity,
    ageSeconds,
    isStale,
    ...(trend ?? {}),
  };
}

export const readFacts = (session: InterventionSession, factIds: readonly FactId[]): FactRead[] =>
  factIds.map((factId) => readFact(session, factId));

/**
 * Faits attendus au bilan qui manquent ou sont périmés. Alimente la liste de
 * rappel de l'écran de réévaluation et les questions du régulateur : elle est
 * calculée, jamais rédigée dans les données de mission.
 */
export function gapFactIds(session: InterventionSession, scenario: InterventionScenario): FactId[] {
  return scenario.expectedHandoverFactIds.filter((factId) => {
    const read = readFact(session, factId);
    return read.status === "unknown" || read.isStale;
  });
}

/** Couverture des faits pour le débriefing : mesuré, non mesuré, hors d'atteinte. */
export function factCoverage(session: InterventionSession, scenario: InterventionScenario) {
  return scenario.factIds.map((factId) => {
    const fact = getFact(factId);
    const read = readFact(session, factId);
    const state =
      read.status === "known"
        ? ("measured" as const)
        : read.reason === "equipment_missing"
          ? ("not_measurable" as const)
          : ("not_measured" as const);
    return { factId, label: fact.label, state };
  });
}
