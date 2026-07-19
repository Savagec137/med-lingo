import { z } from "zod";
import { CONTENT_DIFFICULTIES } from "./content-domain.ts";
import {
  SPECIFICATION_CONTENT_STATUSES,
  type PedagogicalSpecification,
} from "./pedagogical-specification-domain.ts";

const nonEmptyString = z.string().min(1);
const stringArray = z.array(nonEmptyString);
const extensionBlockSchema = z
  .object({
    id: nonEmptyString,
    type: nonEmptyString,
    status: z.enum(SPECIFICATION_CONTENT_STATUSES).optional(),
  })
  .passthrough();

const courseSectionSchema = z.object({
  id: nonEmptyString,
  label: nonEmptyString,
  title: nonEmptyString,
  paragraphs: stringArray,
  questions: stringArray,
  examples: z.array(z.object({ label: nonEmptyString, text: nonEmptyString })),
  list: stringArray,
  sequence: stringArray,
  blocks: z.array(extensionBlockSchema),
});

const mcqSchema = z
  .object({
    id: nonEmptyString,
    question: nonEmptyString,
    options: z
      .array(z.object({ id: nonEmptyString, label: nonEmptyString, text: nonEmptyString }))
      .min(2),
    correctAnswerId: nonEmptyString,
    explanation: nonEmptyString.nullable(),
  })
  .superRefine((question, context) => {
    const optionIds = question.options.map((option) => option.id);
    if (new Set(optionIds).size !== optionIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Les identifiants d'option doivent être uniques.",
      });
    }
    if (!optionIds.includes(question.correctAnswerId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswerId"],
        message: "La bonne réponse doit référencer une option existante.",
      });
    }
  });

const specificationSchema = z
  .object({
    schemaVersion: z.literal(1),
    specificationVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    contentRevision: z.number().int().positive(),
    id: nonEmptyString,
    formation: nonEmptyString,
    parcours: nonEmptyString,
    lesson: nonEmptyString,
    title: nonEmptyString,
    duration: z
      .object({
        minimumMinutes: z.number().int().positive(),
        maximumMinutes: z.number().int().positive(),
        label: nonEmptyString,
      })
      .refine((duration) => duration.minimumMinutes <= duration.maximumMinutes, {
        message: "La durée minimale ne peut pas dépasser la durée maximale.",
      }),
    difficulty: z.object({ id: z.enum(CONTENT_DIFFICULTIES), label: nonEmptyString }),
    prerequisites: stringArray,
    primaryCompetency: z.object({ id: nonEmptyString, text: nonEmptyString }),
    learningObjectives: stringArray.min(1),
    introduction: z.object({
      title: nonEmptyString,
      hookTitle: nonEmptyString,
      quote: nonEmptyString,
      paragraphs: stringArray,
    }),
    course: z.object({ title: nonEmptyString, sections: z.array(courseSectionSchema).min(1) }),
    vocabulary: z.object({ title: nonEmptyString, terms: stringArray.min(1) }),
    flashcards: z.object({
      title: nonEmptyString,
      items: z
        .array(z.object({ id: nonEmptyString, question: nonEmptyString, answer: nonEmptyString }))
        .min(1),
    }),
    exercises: z.object({
      title: nonEmptyString,
      mcq: z.array(mcqSchema),
      trueFalse: z.array(
        z.object({ id: nonEmptyString, statement: nonEmptyString, correctAnswer: z.boolean() }),
      ),
      associations: z.array(
        z.object({
          id: nonEmptyString,
          prompt: nonEmptyString,
          pairs: z.array(z.object({ left: nonEmptyString, right: nonEmptyString })).min(1),
        }),
      ),
      dragAndDrop: z.array(
        z.object({
          id: nonEmptyString,
          prompt: nonEmptyString,
          presentedOrder: stringArray.min(1),
          correctOrder: stringArray.min(1),
        }),
      ),
      clinicalCases: z.array(
        z.object({
          id: nonEmptyString,
          label: nonEmptyString,
          context: nonEmptyString,
          objective: nonEmptyString,
          correctAnswer: nonEmptyString,
        }),
      ),
      traps: z.array(
        z.object({
          id: nonEmptyString,
          question: nonEmptyString,
          expectedAnswer: nonEmptyString,
          explanation: nonEmptyString,
        }),
      ),
    }),
    anecdote: z.object({ id: nonEmptyString, title: nonEmptyString, text: nonEmptyString }),
    finalQuiz: z.object({
      id: nonEmptyString,
      title: nonEmptyString,
      questionCount: z.number().int().positive(),
      distribution: z
        .array(
          z.object({
            label: nonEmptyString,
            type: nonEmptyString,
            count: z.number().int().nonnegative(),
          }),
        )
        .min(1),
      objective: nonEmptyString,
      status: z.enum(SPECIFICATION_CONTENT_STATUSES),
    }),
    boss: z.object({
      id: nonEmptyString,
      title: nonEmptyString,
      situation: nonEmptyString,
      requirements: stringArray,
      minimumSuccessPercent: z.number().min(0).max(100),
      reward: z.object({ xp: z.number().int().nonnegative(), badge: nonEmptyString.nullable() }),
      status: z.enum(SPECIFICATION_CONTENT_STATUSES),
      unresolvedSourceFragments: stringArray,
    }),
    illustrations: z.array(extensionBlockSchema),
    openQuestions: z.array(extensionBlockSchema),
    rewards: z.array(extensionBlockSchema),
    additionalContent: z.array(extensionBlockSchema),
    integration: z.object({
      sourceStatus: z.literal("official"),
      mergeStrategy: z.literal("merge_by_stable_id"),
      projectedContentIds: stringArray,
      nonProjectedContentIds: stringArray,
    }),
  })
  .passthrough()
  .superRefine((specification, context) => {
    const distributed = specification.finalQuiz.distribution.reduce(
      (total, entry) => total + entry.count,
      0,
    );
    if (distributed !== specification.finalQuiz.questionCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalQuiz", "distribution"],
        message: "La répartition du quiz doit correspondre au nombre total de questions.",
      });
    }

    for (const ordering of specification.exercises.dragAndDrop) {
      if (
        ordering.presentedOrder.length !== ordering.correctOrder.length ||
        !ordering.presentedOrder.every((item) => ordering.correctOrder.includes(item))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exercises", "dragAndDrop"],
          message: `Les deux ordres de ${ordering.id} doivent contenir les mêmes éléments.`,
        });
      }
    }

    const ids = [
      ...specification.flashcards.items.map((item) => item.id),
      ...specification.exercises.mcq.map((item) => item.id),
      ...specification.exercises.trueFalse.map((item) => item.id),
      ...specification.exercises.associations.map((item) => item.id),
      ...specification.exercises.dragAndDrop.map((item) => item.id),
      ...specification.exercises.clinicalCases.map((item) => item.id),
      ...specification.exercises.traps.map((item) => item.id),
      specification.anecdote.id,
      specification.finalQuiz.id,
      specification.boss.id,
      ...specification.illustrations.map((item) => item.id),
      ...specification.openQuestions.map((item) => item.id),
      ...specification.rewards.map((item) => item.id),
      ...specification.additionalContent.map((item) => item.id),
    ];
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: "Les identifiants de la spécification doivent être uniques.",
      });
    }

    const projected = specification.integration.projectedContentIds;
    const nonProjected = specification.integration.nonProjectedContentIds;
    const tracked = [...projected, ...nonProjected];
    if (
      new Set(tracked).size !== tracked.length ||
      ids.some((id) => !tracked.includes(id)) ||
      tracked.some((id) => !ids.includes(id))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["integration"],
        message: "Chaque contenu doit être suivi une seule fois comme projeté ou non projeté.",
      });
    }
  });

export function parsePedagogicalSpecification(input: unknown): PedagogicalSpecification {
  return specificationSchema.parse(input) as PedagogicalSpecification;
}
