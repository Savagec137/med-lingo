/**
 * Gel d'une mesure. Contrepartie de `readFact` : là où `readFact` restitue ce
 * qui a été relevé, `revealFact` fixe la valeur au moment du relevé.
 *
 * Deux sources de valeur, jamais les deux à la fois : le moteur clinique pour
 * les faits rattachés à une constante (`vitalKey`), le scénario pour tout ce
 * qu'aucune physiologie ne produit — antécédents, circonstances, perte de
 * connaissance. Le schéma de scénario garantit qu'aucun fait n'a deux sources.
 */

import type { InterventionVitals, VitalSeverity } from "../../intervention-vitals.ts";
import { formatVital, vitalSeverity } from "../../intervention-vitals.ts";
import type {
  ClinicalFact,
  FactId,
  FactValue,
  InterventionScenario,
  InterventionSession,
  PlayerActionId,
} from "../v3-domain.ts";
import { getFact } from "./fact-registry.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";

/** Valeur et sévérité d'une mesure, lues dans les constantes courantes. */
export function factValueFromVitals(
  fact: ClinicalFact,
  vitals: InterventionVitals,
  ageBand: "adult" | "child",
): { value: FactValue; severity: VitalSeverity } {
  const key = fact.vitalKey;
  if (!key) throw new Error(`${fact.id} n'est pas rattaché à une constante du moteur.`);
  const severity = vitalSeverity(key, vitals[key], ageBand);
  const formatted = formatVital(key, vitals);
  if (key === "sbp") {
    return {
      severity,
      value: { kind: "ratio", systolic: vitals.sbp, diastolic: vitals.dbp, formatted },
    };
  }
  return { severity, value: { kind: "numeric", value: vitals[key], formatted } };
}

function authoredValue(scenario: InterventionScenario, factId: FactId): FactValue {
  const value = scenario.factValues[factId];
  if (!value) {
    throw new Error(`${factId} n'a pas de valeur dans le scénario ${scenario.id}.`);
  }
  return value;
}

/**
 * Révèle un fait dans la session et empile la mesure.
 *
 * Une révélation est **définitive** : rien ne dé-révèle un fait. C'est le
 * pendant de la règle centrale — sans cela, annuler une action deviendrait un
 * moyen de sonder gratuitement les constantes.
 */
export function revealFact(
  session: InterventionSession,
  factId: FactId,
  actionId: PlayerActionId,
): InterventionSession {
  const fact = getFact(factId);
  const scenario = getV3Scenario(session.scenarioId);
  const atSeconds = session.simulatedTimeSeconds;

  const { value, severity } =
    fact.vitalKey !== null
      ? factValueFromVitals(fact, session.vitals, scenario.clinical.ageBand)
      : { value: authoredValue(scenario, factId), severity: "normal" as VitalSeverity };

  const previous = session.revealedFacts[factId];
  const measurements = [
    ...(previous?.measurements ?? []),
    { value, severity, atSeconds, actionId },
  ];

  return {
    ...session,
    revealedFacts: {
      ...session.revealedFacts,
      [factId]: {
        factId,
        current: value,
        severity,
        revealedAtSeconds: previous?.revealedAtSeconds ?? atSeconds,
        lastMeasuredAtSeconds: atSeconds,
        measurements,
      },
    },
  };
}

export const revealFacts = (
  session: InterventionSession,
  factIds: readonly FactId[],
  actionId: PlayerActionId,
): InterventionSession =>
  factIds.reduce((current, factId) => revealFact(current, factId, actionId), session);
