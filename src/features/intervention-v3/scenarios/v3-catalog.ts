import pilotInput from "./pilot-trauma-cranien.json" with { type: "json" };
import respiratoryInput from "./detresse-respiratoire.json" with { type: "json" };
import { parseV3Scenario } from "./scenario-schema.ts";
import type { InterventionScenario } from "../v3-domain.ts";

/**
 * Catalogue V3, volontairement séparé de `intervention-missions.json`.
 *
 * `intervention-catalog.test.ts` affirme que le catalogue historique compte
 * exactement quinze missions enchaînées par `unlockAfter`. Y insérer les
 * scénarios V3 casserait deux tests existants ; le mode a donc son propre
 * catalogue, et les deux coexistent.
 *
 * Les deux scénarios sont **complémentaires par construction**, et c'est ce qui
 * justifie d'en avoir écrit un second plutôt que d'en varier le décor. Le
 * traumatisme crânien est un patient dont toutes les constantes sont normales :
 * aucun moniteur ne montre son danger, qui est neurologique. La détresse
 * respiratoire est l'inverse — le danger **est** dans les chiffres, il se dégrade
 * pendant que le joueur recueille, et un geste le corrige. Un mode qui
 * n'enseignerait que l'un des deux formerait à moitié.
 */
const scenarios: readonly InterventionScenario[] = [
  parseV3Scenario(pilotInput),
  parseV3Scenario(respiratoryInput),
];

const scenariosById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));

export const V3_SCENARIOS = scenarios;

export const findV3Scenario = (scenarioId: string) => scenariosById.get(scenarioId);

export function getV3Scenario(scenarioId: string): InterventionScenario {
  const scenario = scenariosById.get(scenarioId);
  if (!scenario) throw new Error(`Scénario V3 inconnu : ${scenarioId}`);
  return scenario;
}

export const PILOT_SCENARIO_ID = "v3-pilot-trauma-cranien";

export const RESPIRATORY_SCENARIO_ID = "v3-detresse-respiratoire";
