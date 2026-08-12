import { z } from "zod";
import {
  ACTION_CATEGORIES,
  EQUIPMENT_IDS,
  V3_PHASES,
  type ActionCatalogIndex,
} from "../v3-domain.ts";

const label = z.string().trim().min(1);
const prose = z.string().trim().min(10);

/**
 * Termes qui décrivent un geste exclu du jouable V3 : injection,
 * auto-injection, perfusion, voie veineuse, cathéter, seringue. La recherche
 * porte sur l'identifiant, le libellé **et** l'indice, parce qu'une action peut
 * être nommée sobrement et décrite par son geste.
 */
export const EXCLUDED_GESTURE_PATTERN =
  /inject|auto-inject|perfus|voie[\s-]veineuse|intraveineu|cath[eé]ter|seringue|abord[\s-]vasculaire|intra[\s-]?osseu/i;

const effectSchema = z.object({
  score: z.number(),
  patient: z.number(),
  timeSeconds: z.number().int().min(0),
  flag: z
    .string()
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/)
    .nullable(),
  therapeutic: z.boolean(),
});

const actionSchema = z
  .object({
    id: z.string().regex(/^action\.[a-z][a-z0-9-]*[a-z0-9]$/, "identifiant « action.xxx » attendu"),
    label,
    hint: label,
    category: z.enum(ACTION_CATEGORIES),
    requires: z.object({
      phases: z.array(z.enum(V3_PHASES)).min(1),
      equipment: z.array(z.enum(EQUIPMENT_IDS)),
      blockingActions: z.array(label),
      justifyingFacts: z.array(label),
      justifyingActions: z.array(label),
      maxUses: z.number().int().min(1).nullable(),
    }),
    reveals: z.array(label),
    timeSeconds: z.number().int().min(0),
    effect: effectSchema,
    unjustifiedEffect: effectSchema.nullable(),
    actId: z
      .string()
      .regex(/^acte\.r6311-17\.(ii|iii)\.\d$/)
      .nullable(),
    competencyIds: z.array(z.string().regex(/^dea\.c\d{2}$/)),
    outOfScope: z.boolean(),
    outOfScopeReason: prose.nullable(),
    knowledgeId: z
      .string()
      .regex(/^(library|intervention)\.[a-z0-9-]+$/)
      .nullable(),
  })
  .superRefine((action, context) => {
    // **La garantie de périmètre.** Aucun geste jouable ne décrit une injection,
    // une perfusion ou un abord vasculaire. Les actions hors périmètre en
    // parlent nécessairement : c'est leur raison d'être.
    if (!action.outOfScope) {
      const haystack = `${action.id} ${action.label} ${action.hint}`;
      if (EXCLUDED_GESTURE_PATTERN.test(haystack)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["label"],
          message: `${action.id} décrit un geste exclu du jouable V3 sans être marqué hors périmètre.`,
        });
      }
    }
    // La voie auto-injectable est écartée du jouable, quelle que soit sa base
    // réglementaire : l'intitulé du texte n'est pas confronté et la consigne
    // produit exclut l'injection.
    if (action.actId === "acte.r6311-17.iii.3") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actId"],
        message: `${action.id} référence l'acte de voie auto-injectable, exclu du jouable V3.`,
      });
    }
    // Une action refusée doit dire pourquoi, sinon le refus n'apprend rien.
    if (action.outOfScope && action.outOfScopeReason === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outOfScopeReason"],
        message: `${action.id} est hors périmètre sans motif affichable.`,
      });
    }
    if (!action.outOfScope && action.outOfScopeReason !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outOfScopeReason"],
        message: `${action.id} porte un motif de refus sans être hors périmètre.`,
      });
    }
    // Une action refusée ne révèle rien et ne consomme aucun temps.
    if (action.outOfScope && (action.reveals.length > 0 || action.timeSeconds > 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reveals"],
        message: `${action.id} est hors périmètre mais révèle un fait ou consomme du temps.`,
      });
    }
    // Le temps déclaré et le temps de l'effet doivent concorder : deux sources
    // pour une même durée finiraient par diverger.
    if (action.effect.timeSeconds !== action.timeSeconds) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effect", "timeSeconds"],
        message: `${action.id} déclare ${action.timeSeconds} s et applique ${action.effect.timeSeconds} s.`,
      });
    }
    if (
      action.unjustifiedEffect !== null &&
      action.unjustifiedEffect.timeSeconds !== action.timeSeconds
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unjustifiedEffect", "timeSeconds"],
        message: `${action.id} : l'effet injustifié ne consomme pas la même durée.`,
      });
    }
    // Une action qui peut être faite hors justification doit décrire cet effet,
    // sinon le moteur n'aurait rien à appliquer.
    const hasSoftGate =
      action.requires.justifyingFacts.length > 0 || action.requires.justifyingActions.length > 0;
    if (hasSoftGate && !action.outOfScope && action.unjustifiedEffect === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unjustifiedEffect"],
        message: `${action.id} exige des prérequis souples sans décrire l'effet de leur absence.`,
      });
    }
    if (!hasSoftGate && action.unjustifiedEffect !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unjustifiedEffect"],
        message: `${action.id} décrit un effet injustifié sans prérequis souple.`,
      });
    }
    // Seul un geste soigne. Une mesure qui modifierait l'état du patient
    // rendrait la causalité illisible pour l'apprenant.
    if (action.effect.therapeutic && action.category !== "care") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effect", "therapeutic"],
        message: `${action.id} se déclare thérapeutique sans être un geste.`,
      });
    }
    if (!action.effect.therapeutic && action.effect.patient !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effect", "patient"],
        message: `${action.id} modifie l'état du patient sans être thérapeutique.`,
      });
    }
    // Une action jouable mobilise au moins une compétence : sans elle, rien ne
    // relie le geste au référentiel.
    if (!action.outOfScope && action.competencyIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["competencyIds"],
        message: `${action.id} est jouable sans compétence rattachée.`,
      });
    }
  });

export const actionCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    actions: z.array(actionSchema).min(1),
  })
  .superRefine((index, context) => {
    const ids = index.actions.map((action) => action.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actions"],
        message: "Les identifiants d'action doivent être uniques.",
      });
    }
    const known = new Set(ids);
    for (const action of index.actions) {
      const referenced = [...action.requires.blockingActions, ...action.requires.justifyingActions];
      for (const required of referenced) {
        if (!known.has(required)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["actions"],
            message: `${action.id} exige une action inconnue : ${required}`,
          });
        }
      }
    }
  });

export function parseActionCatalog(input: unknown): ActionCatalogIndex {
  return actionCatalogSchema.parse(input) as ActionCatalogIndex;
}
