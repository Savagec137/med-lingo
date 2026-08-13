import pilotInput from "./pilot-trauma-cranien.json" with { type: "json" };
import { parseV3Scenario } from "./scenario-schema.ts";
import type { InterventionScenario } from "../v3-domain.ts";

/**
 * Catalogue V3, volontairement séparé de `intervention-missions.json`.
 *
 * `intervention-catalog.test.ts` affirme que le catalogue historique compte
 * exactement quinze missions enchaînées par `unlockAfter`. Y insérer le pilote
 * casserait deux tests existants ; le mode V3 a donc son propre catalogue, et
 * les deux coexistent le temps du pilote.
 */
const scenarios: readonly InterventionScenario[] = [parseV3Scenario(pilotInput)];

const scenariosById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));

export const V3_SCENARIOS = scenarios;

export const findV3Scenario = (scenarioId: string) => scenariosById.get(scenarioId);

export function getV3Scenario(scenarioId: string): InterventionScenario {
  const scenario = scenariosById.get(scenarioId);
  if (!scenario) throw new Error(`Scénario V3 inconnu : ${scenarioId}`);
  return scenario;
}

export const PILOT_SCENARIO_ID = "v3-pilot-trauma-cranien";
