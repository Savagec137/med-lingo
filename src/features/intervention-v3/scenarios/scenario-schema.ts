import { z } from "zod";
import { findFact } from "../facts/fact-registry.ts";
import {
  GESTURE_CONSEQUENCE_FAMILIES,
  HINT_POLICIES,
  MAX_EXPECTED_HANDOVER_FACTS,
  MIN_EXPECTED_HANDOVER_FACTS,
  SOURCE_TRUSTS,
  V3_PHASES,
  type InterventionScenario,
} from "../v3-domain.ts";

const label = z.string().trim().min(1);
const prose = z.string().trim().min(20);

const vitalsSchema = z.object({
  hr: z.number(),
  sbp: z.number(),
  dbp: z.number(),
  spo2: z.number(),
  rr: z.number(),
  temperature: z.number(),
  gcs: z.number().min(3).max(15),
  pain: z.number().min(0).max(10),
  glycemia: z.number().positive(),
});

const gestureSchema = z.object({
  id: z.string().regex(/^geste\.[a-z][a-z0-9-]*[a-z0-9]$/),
  label,
  hint: label,
  recommended: z.boolean(),
  outOfScope: z.boolean(),
  outOfScopeReason: prose.nullable(),
  justifiedBy: z.array(label),
  consequenceFamily: z.enum(GESTURE_CONSEQUENCE_FAMILIES),
  actId: z
    .string()
    .regex(/^acte\.r6311-17\.(ii|iii)\.\d$/)
    .nullable(),
  competencyIds: z.array(z.string().regex(/^dea\.c\d{2}$/)),
  knowledgeId: z
    .string()
    .regex(/^(library|intervention)\.[a-z0-9-]+$/)
    .nullable(),
});

const factValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("numeric"), value: z.number(), formatted: label }),
  z.object({
    kind: z.literal("ratio"),
    systolic: z.number(),
    diastolic: z.number(),
    formatted: label,
  }),
  z.object({ kind: z.literal("text"), value: label }),
  z.object({ kind: z.literal("boolean"), value: z.boolean(), formatted: label }),
  z.object({
    kind: z.literal("enum"),
    value: label,
    formatted: label,
    /**
     * Forme courte, pour les panneaux étroits — le bandeau « État du patient »
     * de la maquette tient en trois lignes. Elle est **écrite**, jamais dérivée
     * de l'identifiant : « consciente-anxieuse » abrégé mécaniquement donnerait
     * « Consciente anxieuse », qui n'est pas du français.
     */
    short: label.optional(),
  }),
]);

const handoverItemSchema = z.object({
  id: z.string().regex(/^item\.[a-z][a-z0-9-]*[a-z0-9]$/),
  label,
  factIds: z.array(label),
  expected: z.boolean(),
  disclosable: z.boolean(),
});

const regulatorQuestionSchema = z.object({
  id: z.string().regex(/^question\.[a-z][a-z0-9-]*[a-z0-9]$/),
  text: label,
  triggeredByFactId: label,
  onOmission: z.boolean(),
  answers: z
    .array(
      z.object({
        id: label,
        text: label,
        correct: z.boolean(),
        rationale: prose,
      }),
    )
    .min(2),
});

export const scenarioSchema = z
  .object({
    id: z.string().regex(/^v3-[a-z][a-z0-9-]*[a-z0-9]$/),
    schemaVersion: z.literal(1),
    title: label,
    specialty: label,
    learningObjective: prose,
    difficulty: z.enum(["initiation", "intermediate", "advanced"]),
    illustration: label,
    estimatedMinutes: z.number().int().positive(),
    baseXp: z.number().int().positive(),
    startingPatient: z.number().int().min(0).max(100),
    hintPolicy: z.enum(HINT_POLICIES),
    alert: z.object({
      patient: label,
      age: label.optional(),
      reason: label,
      priority: label,
      distance: label,
      location: label,
      time: label,
      elapsed: label.optional(),
      dispatchNote: prose,
    }),
    clinical: z.object({
      ageBand: z.enum(["adult", "child"]),
      cardiacArrest: z.boolean(),
      glycemiaRelevant: z.boolean(),
      baseline: vitalsSchema,
    }),
    clinicalTrust: z.enum(SOURCE_TRUSTS),
    clinicalReviewNote: prose,
    factIds: z.array(label).min(1),
    factValues: z.record(z.string(), factValueSchema),
    expectedHandoverFactIds: z.array(label),
    handoverItems: z.array(handoverItemSchema).min(1),
    regulatorQuestions: z.array(regulatorQuestionSchema),
    gestureRounds: z
      .array(
        z.object({
          id: z.string().regex(/^round\.[a-z][a-z0-9-]*[a-z0-9]$/),
          requiredSelections: z.number().int().min(1),
          timerSeconds: z.number().int().min(30).nullable(),
          offered: z.array(gestureSchema).min(4),
        }),
      )
      .min(1),
    narrative: z.record(z.enum(V3_PHASES), prose),
    regulatorInstruction: prose,
    rejectedAdditions: z.array(label),
    freeAdditions: z.array(label),
    reward: z.object({
      coins: z.number().int().min(0),
      chest: label.optional(),
      chestMinimumScore: z.number().int().min(0).max(100).optional(),
      badge: label.optional(),
      badgeMinimumScore: z.number().int().min(0).max(100).optional(),
    }),
  })
  .superRefine((scenario, context) => {
    const facts = new Set(scenario.factIds);
    if (facts.size !== scenario.factIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["factIds"],
        message: "Un fait est déclaré deux fois dans le scénario.",
      });
    }
    for (const factId of scenario.expectedHandoverFactIds) {
      if (!facts.has(factId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expectedHandoverFactIds"],
          message: `${factId} est attendu au bilan sans être mobilisé par le scénario.`,
        });
      }
    }
    // Chaque fait mobilisé doit avoir une source de valeur, et une seule : le
    // moteur clinique pour les mesures rattachées à une constante, le scénario
    // pour le reste. Sans cette règle, un fait serait révélable sans rien à
    // afficher, ou le scénario contredirait la physiologie simulée.
    for (const factId of scenario.factIds) {
      const fact = findFact(factId);
      if (!fact) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["factIds"],
          message: `${factId} est mobilisé par le scénario sans exister dans le registre.`,
        });
        continue;
      }
      const authored = factId in scenario.factValues;
      const fromEngine = fact.vitalKey !== null;
      const computed = fact.category === "derived";
      if (fromEngine && authored) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["factValues"],
          message: `${factId} prend sa valeur du moteur clinique : le scénario ne doit pas la fixer.`,
        });
      }
      if (computed && authored) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["factValues"],
          message: `${factId} est calculé : le scénario ne doit pas fixer sa valeur.`,
        });
      }
      if (!fromEngine && !computed && !authored) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["factValues"],
          message: `${factId} n'a aucune valeur : ni constante du moteur, ni valeur écrite dans le scénario.`,
        });
      }
      if (authored && scenario.factValues[factId]!.kind !== fact.valueKind) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["factValues"],
          message: `${factId} est déclaré ${fact.valueKind} dans le registre et ${scenario.factValues[factId]!.kind} dans le scénario.`,
        });
      }
    }
    for (const factId of Object.keys(scenario.factValues)) {
      if (!facts.has(factId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["factValues"],
          message: `${factId} porte une valeur sans être mobilisé par le scénario.`,
        });
      }
    }
    // Le bilan attendu ne peut être ni trivial ni encyclopédique. Le plafond de
    // douze est la décision produit : au-delà, ce n'est plus un bilan mais un
    // formulaire.
    const expectedCount = new Set(scenario.expectedHandoverFactIds).size;
    if (
      expectedCount < MIN_EXPECTED_HANDOVER_FACTS ||
      expectedCount > MAX_EXPECTED_HANDOVER_FACTS
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedHandoverFactIds"],
        message: `${expectedCount} faits attendus : la fourchette autorisée est ${MIN_EXPECTED_HANDOVER_FACTS} à ${MAX_EXPECTED_HANDOVER_FACTS}.`,
      });
    }
    // Les éléments de bilan attendus doivent couvrir exactement les faits
    // attendus : sinon un fait serait exigé sans case pour le transmettre, ou
    // une case attendue ne porterait rien.
    const coveredByExpectedItems = new Set(
      scenario.handoverItems.filter((item) => item.expected).flatMap((item) => item.factIds),
    );
    for (const factId of scenario.expectedHandoverFactIds) {
      if (!coveredByExpectedItems.has(factId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["handoverItems"],
          message: `${factId} est attendu au bilan mais aucun élément transmissible ne le porte.`,
        });
      }
    }
    for (const factId of coveredByExpectedItems) {
      if (!scenario.expectedHandoverFactIds.includes(factId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["handoverItems"],
          message: `${factId} est porté par un élément attendu sans figurer dans le bilan attendu.`,
        });
      }
    }
    for (const item of scenario.handoverItems) {
      for (const factId of item.factIds) {
        if (!facts.has(factId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["handoverItems"],
            message: `${item.id} porte un fait hors du scénario : ${factId}`,
          });
        }
      }
    }
    // Une question du régulateur naît d'un trou du bilan. Sans trou possible,
    // elle serait un script, pas une réaction.
    for (const question of scenario.regulatorQuestions) {
      if (!scenario.expectedHandoverFactIds.includes(question.triggeredByFactId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["regulatorQuestions"],
          message: `${question.id} se déclenche sur ${question.triggeredByFactId}, qui n'est pas attendu au bilan.`,
        });
      }
      const correct = question.answers.filter((answer) => answer.correct);
      if (correct.length !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["regulatorQuestions"],
          message: `${question.id} porte ${correct.length} bonnes réponses ; il en faut exactement une.`,
        });
      }
    }
    for (const round of scenario.gestureRounds) {
      const recommended = round.offered.filter((gesture) => gesture.recommended);
      if (recommended.length !== round.requiredSelections) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gestureRounds"],
          message: `${round.id} demande ${round.requiredSelections} gestes et en recommande ${recommended.length}.`,
        });
      }
      // Un tour sans geste hors périmètre n'apprend pas la limite : on
      // n'apprend une frontière qu'en la rencontrant.
      if (!round.offered.some((gesture) => gesture.outOfScope)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gestureRounds"],
          message: `${round.id} ne propose aucun geste hors périmètre.`,
        });
      }
      for (const gesture of round.offered) {
        if (gesture.outOfScope && gesture.recommended) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["gestureRounds"],
            message: `${gesture.id} est recommandé et hors périmètre à la fois.`,
          });
        }
        if (gesture.outOfScope && gesture.outOfScopeReason === null) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["gestureRounds"],
            message: `${gesture.id} est hors périmètre sans motif affichable.`,
          });
        }
        if (!gesture.outOfScope && gesture.outOfScopeReason !== null) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["gestureRounds"],
            message: `${gesture.id} porte un motif de refus sans être hors périmètre.`,
          });
        }
        for (const factId of gesture.justifiedBy) {
          if (!facts.has(factId)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["gestureRounds"],
              message: `${gesture.id} se justifie par un fait hors du scénario : ${factId}`,
            });
          }
        }
      }
    }
    // La glycémie ne s'affiche que si le profil la déclare pertinente : l'exiger
    // au bilan sans l'activer produirait un trou impossible à combler.
    if (
      scenario.expectedHandoverFactIds.includes("fact.glycemie") &&
      !scenario.clinical.glycemiaRelevant
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clinical", "glycemiaRelevant"],
        message:
          "La glycémie est attendue au bilan alors que le profil clinique ne la déclare pas pertinente.",
      });
    }
    // Un arrêt circulatoire n'a pas de tension mesurable : le scénario pilote
    // n'en est pas un, et cette garde empêche d'en écrire un par erreur.
    if (scenario.clinical.cardiacArrest && scenario.clinical.baseline.sbp > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clinical", "baseline"],
        message: "Un patient en arrêt circulatoire ne peut pas porter de tension non nulle.",
      });
    }
    for (const phase of V3_PHASES) {
      if (!scenario.narrative[phase]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["narrative"],
          message: `La phase ${phase} n'a pas de texte de scène.`,
        });
      }
    }
  });

export function parseV3Scenario(input: unknown): InterventionScenario {
  return scenarioSchema.parse(input) as unknown as InterventionScenario;
}
