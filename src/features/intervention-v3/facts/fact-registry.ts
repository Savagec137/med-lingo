import registryInput from "./fact-registry.json" with { type: "json" };
import { parseFactRegistry } from "./fact-schema.ts";
import type { ClinicalFact, FactCategory, FactId } from "../v3-domain.ts";

const registry = parseFactRegistry(registryInput);

const factsById = new Map(registry.facts.map((fact) => [fact.id, fact]));

export const CLINICAL_FACTS: readonly ClinicalFact[] = registry.facts;

export const findFact = (factId: FactId) => factsById.get(factId);

/** Un `factId` non résoluble est un défaut de programmation, pas un cas d'affichage. */
export function getFact(factId: FactId): ClinicalFact {
  const fact = factsById.get(factId);
  if (!fact) throw new Error(`Fait inconnu dans le registre : ${factId}`);
  return fact;
}

export const factsOfCategory = (category: FactCategory) =>
  registry.facts.filter((fact) => fact.category === category);

/** Faits révélés par une action donnée, d'après le registre et non l'action. */
export const factsRevealedBy = (actionId: string) =>
  registry.facts.filter((fact) => fact.revealedBy.includes(actionId));
