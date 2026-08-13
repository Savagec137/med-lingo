import { z } from "zod";
import {
  EQUIPMENT_IDS,
  FACT_CATEGORIES,
  FACT_VALUE_KINDS,
  FACT_VISIBILITIES,
  type FactRegistryIndex,
} from "../v3-domain.ts";

const label = z.string().trim().min(1);

/** Constantes affichables du moteur clinique. Recopiées volontairement : le
 * schéma valide des données, il n'a pas à importer le moteur. Le test vérifie
 * que les deux listes restent alignées. */
const DISPLAYED_VITAL_KEYS = [
  "hr",
  "sbp",
  "spo2",
  "rr",
  "temperature",
  "gcs",
  "pain",
  "glycemia",
] as const;

const factSchema = z
  .object({
    id: z.string().regex(/^fact\.[a-z][a-z0-9-]*[a-z0-9]$/, "identifiant « fact.xxx » attendu"),
    category: z.enum(FACT_CATEGORIES),
    visibility: z.enum(FACT_VISIBILITIES),
    label,
    valueKind: z.enum(FACT_VALUE_KINDS),
    unit: label.nullable(),
    placeholder: label,
    vitalKey: z.enum(DISPLAYED_VITAL_KEYS).nullable(),
    requiresEquipment: z.array(z.enum(EQUIPMENT_IDS)),
    revealedBy: z.array(label),
    dependsOn: z.array(label),
    freshnessSeconds: z.number().int().min(60).nullable(),
  })
  .superRefine((fact, context) => {
    // **L'invariant central du registre.** Un gabarit qui contient un chiffre
    // laisse deviner un ordre de grandeur, donc révèle une partie de la mesure
    // avant qu'elle soit prise.
    if (/[0-9]/.test(fact.placeholder)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["placeholder"],
        message: `${fact.id} : le gabarit « ${fact.placeholder} » contient un chiffre.`,
      });
    }
    // Un fait révélé par une action doit nommer cette action, sinon il est
    // inatteignable.
    if (fact.visibility === "on_action" && fact.revealedBy.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["revealedBy"],
        message: `${fact.id} est visible sur action sans nommer aucune action.`,
      });
    }
    if (fact.visibility !== "on_action" && fact.revealedBy.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["revealedBy"],
        message: `${fact.id} nomme une action révélatrice alors qu'il est visible sans action.`,
      });
    }
    // Un fait calculé doit dire de quoi il se calcule.
    if (fact.category === "derived" && fact.dependsOn.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dependsOn"],
        message: `${fact.id} est dérivé sans prérequis.`,
      });
    }
    if (fact.category !== "derived" && fact.dependsOn.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dependsOn"],
        message: `${fact.id} déclare des prérequis sans être dérivé.`,
      });
    }
    if (fact.visibility === "on_dependency" && fact.category !== "derived") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["visibility"],
        message: `${fact.id} n'est visible que par dépendance sans être dérivé.`,
      });
    }
    // Seule une mesure prend sa valeur dans le moteur clinique.
    if (fact.vitalKey !== null && fact.category !== "probe") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vitalKey"],
        message: `${fact.id} pointe une constante du moteur sans être une mesure.`,
      });
    }
    // Une donnée transmise par la régulation ou visible à l'arrivée ne demande
    // aucun matériel : l'exiger rendrait le fait faussement inatteignable.
    if (fact.requiresEquipment.length > 0 && fact.visibility !== "on_action") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requiresEquipment"],
        message: `${fact.id} exige du matériel alors qu'il est visible sans action.`,
      });
    }
    // Un fait mesuré au format ratio doit porter deux valeurs : le gabarit le
    // reflète, sans quoi l'écran afficherait « -- » pour une tension.
    if (fact.valueKind === "ratio" && !fact.placeholder.includes("/")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["placeholder"],
        message: `${fact.id} est un ratio dont le gabarit ne montre pas les deux valeurs.`,
      });
    }
  });

export const factRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    facts: z.array(factSchema).min(1),
  })
  .superRefine((index, context) => {
    const ids = index.facts.map((fact) => fact.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["facts"],
        message: "Les identifiants de fait doivent être uniques.",
      });
    }
    const byId = new Map(index.facts.map((fact) => [fact.id, fact]));
    for (const fact of index.facts) {
      for (const dependency of fact.dependsOn) {
        const target = byId.get(dependency);
        if (!target) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["facts"],
            message: `${fact.id} dépend d'un fait inconnu : ${dependency}`,
          });
          continue;
        }
        // Pas de dépendance en chaîne : un fait dérivé se calcule sur des faits
        // recueillis, ce qui interdit tout cycle par construction.
        if (target.category === "derived") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["facts"],
            message: `${fact.id} dépend de ${dependency}, lui-même dérivé.`,
          });
        }
      }
    }
  });

export function parseFactRegistry(input: unknown): FactRegistryIndex {
  return factRegistrySchema.parse(input) as FactRegistryIndex;
}

export { DISPLAYED_VITAL_KEYS };
