import type { FactValue } from "./v3-domain.ts";

/** Facteur massique du glucose : mmol/L vers g/L. */
export const GLUCOSE_MMOL_TO_GRAMS = 0.1801559;

export function mmolPerLToGramsPerL(value: number): number {
  return value * GLUCOSE_MMOL_TO_GRAMS;
}

/**
 * Helper de présentation uniquement. Il convertit et formate sans qualifier la
 * valeur de normale, basse ou élevée : l'interface n'invente aucune lecture
 * médicale à partir du nombre affiché.
 */
export function formatGlycemiaForUi(value: number): string {
  return `${mmolPerLToGramsPerL(value).toFixed(2).replace(".", ",")} g/L`;
}

export function formatGlycemiaFactForUi(value: FactValue): string | undefined {
  return value.kind === "numeric" ? formatGlycemiaForUi(value.value) : undefined;
}
