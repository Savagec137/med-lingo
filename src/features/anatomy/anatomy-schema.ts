import { z } from "zod";
import {
  ANATOMY_LAYERS,
  ANATOMY_TRUSTS,
  ANATOMY_VIEWS,
  type AnatomyQuestionConfig,
} from "./anatomy-domain.ts";
import { findLayerForSlug, slugOfHotspotId } from "./anatomy-layers.ts";

const label = z.string().trim().min(1);
const prose = z.string().trim().min(20);
/** Coordonnée relative, en pourcentage. Jamais un pixel. */
const percent = z.number().min(0).max(100);

const hotspotSchema = z.object({
  id: label,
  label,
  x: percent,
  y: percent,
  radius: z.number().min(1).max(30).optional(),
  layer: z.enum(ANATOMY_LAYERS),
  order: z.number().int().min(1),
  targetOrganId: label.optional(),
});

const infoCardSchema = z
  .object({
    hotspotId: label,
    title: label,
    description: prose,
    stats: z.array(z.object({ label, value: label, iconKey: label })).max(6),
    knowledgeId: label.nullable(),
    trust: z.enum(ANATOMY_TRUSTS),
    reviewNote: prose.nullable(),
  })
  .superRefine((card, context) => {
    // Une affirmation médicale non validée porte la mention qui le dit. C'est la
    // règle appliquée depuis la bibliothèque : rien d'affiché dont personne ne
    // puisse dire d'où ça vient.
    if (card.trust === "internal_to_validate" && card.reviewNote === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewNote"],
        message: `${card.hotspotId} est à valider sans note de relecture.`,
      });
    }
    // Des chiffres présentés comme officiels doivent citer leur source.
    if (card.trust === "official_verified" && card.knowledgeId === null && card.stats.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["knowledgeId"],
        message: `${card.hotspotId} affiche des chiffres comme vérifiés sans fiche de bibliothèque.`,
      });
    }
  });

export const anatomyQuestionSchema = z
  .object({
    id: label,
    title: label,
    subtitle: label.optional(),
    instruction: label,
    actionHint: label,
    targetLabel: label,
    targetHotspotId: label,
    plateId: label,
    view: z.enum(ANATOMY_VIEWS),
    enabledLayers: z.array(z.enum(ANATOMY_LAYERS)).min(1),
    visibleLayers: z.array(z.enum(ANATOMY_LAYERS)).min(1),
    hotspots: z.array(hotspotSchema).min(2),
    explanation: prose,
    infoCards: z.array(infoCardSchema),
  })
  .superRefine((config, context) => {
    const ids = config.hotspots.map((hotspot) => hotspot.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hotspots"],
        message: "Deux zones portent le même identifiant.",
      });
    }
    const orders = config.hotspots.map((hotspot) => hotspot.order);
    if (new Set(orders).size !== orders.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hotspots"],
        message: "Deux zones portent le même numéro d'ordre.",
      });
    }
    // La zone attendue doit exister, sinon la question est insoluble.
    const target = config.hotspots.find((hotspot) => hotspot.id === config.targetHotspotId);
    if (!target) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetHotspotId"],
        message: `La zone attendue ${config.targetHotspotId} n'est pas déclarée dans les hotspots.`,
      });
    } else {
      if (target.label !== config.targetLabel) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetLabel"],
          message: `La consigne annonce « ${config.targetLabel} » et la zone s'appelle « ${target.label} ».`,
        });
      }
      // **La garantie de jouabilité.** La couche de la zone attendue doit être
      // activable et visible au départ : sinon la question ne peut pas être
      // résolue.
      if (!config.enabledLayers.includes(target.layer)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["enabledLayers"],
          message: `La couche « ${target.layer} » porte la zone attendue mais n'est pas activable.`,
        });
      }
      if (!config.visibleLayers.includes(target.layer)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["visibleLayers"],
          message: `La couche « ${target.layer} » porte la zone attendue mais est masquée à l'ouverture.`,
        });
      }
    }
    for (const layer of config.visibleLayers) {
      if (!config.enabledLayers.includes(layer)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["visibleLayers"],
          message: `La couche « ${layer} » est visible sans être activable.`,
        });
      }
    }
    // Chaque zone doit être atteignable : sa couche doit être activable.
    for (const hotspot of config.hotspots) {
      if (!config.enabledLayers.includes(hotspot.layer)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hotspots"],
          message: `${hotspot.id} appartient à la couche « ${hotspot.layer} », non activable sur cette question.`,
        });
      }
      // La table des couches est la seule source : une zone dont le slug y est
      // déclaré ne peut pas se contredire dans la configuration.
      const declared = findLayerForSlug(slugOfHotspotId(hotspot.id));
      if (declared && declared !== hotspot.layer) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hotspots"],
          message: `${hotspot.id} est déclaré « ${hotspot.layer} » ici et « ${declared} » dans LAYER_BY_SLUG.`,
        });
      }
    }
    for (const card of config.infoCards) {
      if (!ids.includes(card.hotspotId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["infoCards"],
          message: `La fiche ${card.hotspotId} ne correspond à aucune zone.`,
        });
      }
    }
  });

export function parseAnatomyQuestion(input: unknown): AnatomyQuestionConfig {
  return anatomyQuestionSchema.parse(input) as AnatomyQuestionConfig;
}
