import { z } from "zod";
import { CONTENT_DIFFICULTIES, CONTENT_TYPES, type ContentBank } from "./content-domain.ts";

const contentAnswerSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  match: z.string().trim().min(1).optional(),
  detail: z.string().trim().min(1).optional(),
  explanation: z.string().trim().min(1),
  distractorType: z
    .enum([
      "frequent-error",
      "wrong-timing",
      "secondary-priority",
      "sign-misinterpretation",
      "other-context",
    ])
    .optional(),
  sequenceRank: z.number().int().positive().optional(),
});

const contentMetadataSchema = z
  .object({
    missionId: z.string().trim().min(1).optional(),
    phase: z.string().trim().min(1).optional(),
    specialty: z.string().trim().min(1).optional(),
    lessonId: z.string().trim().min(1).optional(),
    sourceDocument: z.string().trim().min(1).optional(),
    sourcePages: z.string().trim().min(1).optional(),
    competencyIds: z.array(z.string().trim().min(1)).min(1).optional(),
    associationMode: z.literal("matching").optional(),
    requiredSelections: z.number().int().positive().optional(),
  })
  .catchall(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]));

const contentItemSchema = z
  .object({
    id: z.string().trim().min(1),
    unit: z.string().trim().min(1),
    lesson: z.string().trim().min(1),
    difficulty: z.enum(CONTENT_DIFFICULTIES),
    type: z.enum(CONTENT_TYPES),
    question: z.string().trim().min(1),
    instruction: z.string().trim().min(1).optional(),
    answers: z.array(contentAnswerSchema).min(2),
    correctAnswer: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)]),
    explanation: z.string().trim().min(1),
    priorityReminder: z.string().trim().min(1).optional(),
    tags: z.array(z.string().trim().min(1)).min(1),
    metadata: contentMetadataSchema.optional(),
  })
  .superRefine((item, context) => {
    const answerIds = item.answers.map((answer) => answer.id);
    const answerIdSet = new Set(answerIds);
    if (answerIdSet.size !== answerIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answers"],
        message: "Les identifiants de réponse doivent être uniques dans une question.",
      });
    }

    const correctIds = Array.isArray(item.correctAnswer)
      ? item.correctAnswer
      : [item.correctAnswer];
    if (new Set(correctIds).size !== correctIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswer"],
        message: "Une réponse correcte ne peut pas être répétée.",
      });
    }
    for (const correctId of correctIds) {
      if (!answerIdSet.has(correctId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctAnswer"],
          message: `La réponse correcte ${correctId} n'existe pas dans answers.`,
        });
      }
    }

    const isMatchingAssociation =
      item.type === "association" && item.metadata?.associationMode === "matching";
    const expectsSeveral =
      item.type === "multiple_choice" || item.type === "ordering" || isMatchingAssociation;
    if (expectsSeveral && !Array.isArray(item.correctAnswer)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswer"],
        message: `Le type ${item.type} exige un tableau de réponses.`,
      });
    }
    if (!expectsSeveral && Array.isArray(item.correctAnswer)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswer"],
        message: `Le type ${item.type} exige une seule réponse.`,
      });
    }
    if (item.type === "multiple_choice" && correctIds.length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswer"],
        message: "Un choix multiple exige au moins deux bonnes réponses.",
      });
    }
    if (item.type === "ordering") {
      const ranks = item.answers.map((answer) => answer.sequenceRank);
      const expectedRanks = item.answers.map((_, index) => index + 1);
      const orderedRanks = [...ranks].sort((left, right) => (left ?? 0) - (right ?? 0));
      if (
        correctIds.length !== answerIds.length ||
        orderedRanks.some((rank, index) => rank !== expectedRanks[index])
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answers"],
          message:
            "Un ordre chronologique doit classer toutes les réponses avec des rangs continus.",
        });
      }
    }
    if (isMatchingAssociation) {
      const everyAnswerHasMatch = item.answers.every((answer) => answer.match);
      const mapsEveryAnswer =
        correctIds.length === answerIds.length &&
        correctIds.every((correctId, index) => correctId === answerIds[index]);
      if (!everyAnswerHasMatch || !mapsEveryAnswer) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answers"],
          message:
            "Une association doit fournir un libellé match et une correspondance pour chaque réponse.",
        });
      }
    }

    if (
      item.metadata?.requiredSelections !== undefined &&
      item.metadata.requiredSelections !== correctIds.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metadata", "requiredSelections"],
        message: "requiredSelections doit correspondre au nombre de réponses correctes.",
      });
    }

    if (new Set(item.tags).size !== item.tags.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tags"],
        message: "Les tags d'une question doivent être uniques.",
      });
    }
  });

export const contentBankSchema = z
  .object({
    schemaVersion: z.literal(1),
    items: z.array(contentItemSchema).min(1),
  })
  .superRefine((bank, context) => {
    const ids = bank.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Les identifiants de contenu doivent être uniques dans le catalogue.",
      });
    }
  });

export function parseContentBank(input: unknown): ContentBank {
  return contentBankSchema.parse(input) as ContentBank;
}
