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

/**
 * La même valeur dans l'unité du moteur.
 *
 * Le relevé d'une glycémie est formaté en g/L à l'affichage, mais le nombre
 * conservé reste en mmol/L. Les deux unités doivent pouvoir coexister sur une
 * carte sans que la seconde soit recalculée à la main ailleurs.
 */
export function formatGlycemiaMmolForUi(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} mmol/L`;
}
