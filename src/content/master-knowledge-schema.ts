import { z } from "zod";
import { CONTENT_DIFFICULTIES } from "./content-domain.ts";
import { KNOWLEDGE_REVIEW_STATUSES, type MasterKnowledgeBase } from "./master-knowledge-domain.ts";

const masteryCriteriaSchema = z.object({
  minimumAccuracy: z.number().min(0).max(1),
  minimumAttempts: z.number().int().min(1),
  requiredExerciseTypes: z.array(z.string().trim().min(1)).min(1),
});

const competencySchema = z.object({
  id: z.string().trim().min(1),
  parcours: z.number().int().positive(),
  formationIds: z.array(z.string().trim().min(1)).min(1),
  domain: z.string().trim().min(1),
  subdomain: z.string().trim().min(1),
  competence: z.string().trim().min(1),
  prerequisites: z.array(z.string().trim().min(1)),
  learningObjectives: z.array(z.string().trim().min(1)).min(1),
  recommendedQuestionPool: z.number().int().positive(),
  difficulty: z.enum(CONTENT_DIFFICULTIES),
  masteryCriteria: masteryCriteriaSchema,
  tags: z.array(z.string().trim().min(1)).min(1),
  sourceDocument: z.string().trim().min(1),
  sourcePages: z.array(z.number().int().positive()),
  sourceLocation: z.string().trim().min(1).optional(),
  reviewStatus: z.enum(KNOWLEDGE_REVIEW_STATUSES),
  lessonIds: z.array(z.string().trim().min(1)).min(1),
  questionIds: z.array(z.string().trim().min(1)),
  contentIds: z.array(z.string().trim().min(1)),
});

const masterKnowledgeSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    formations: z.array(z.string().trim().min(1)).min(1),
    lessonRegistry: z.array(z.string().trim().min(1)).min(1),
    supportedExerciseTypes: z.array(z.string().trim().min(1)).min(1),
    competencies: z.array(competencySchema).min(1),
  })
  .superRefine((knowledgeBase, context) => {
    const ids = knowledgeBase.competencies.map((competency) => competency.id);
    const idSet = new Set(ids);
    const formationSet = new Set(knowledgeBase.formations);
    const lessonSet = new Set(knowledgeBase.lessonRegistry);
    const exerciseTypeSet = new Set(knowledgeBase.supportedExerciseTypes);

    if (idSet.size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["competencies"],
        message: "Les identifiants de compétence doivent être uniques.",
      });
    }

    for (const [index, competency] of knowledgeBase.competencies.entries()) {
      const path = ["competencies", index];
      for (const prerequisite of competency.prerequisites) {
        if (!idSet.has(prerequisite)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "prerequisites"],
            message: `Prérequis inconnu : ${prerequisite}`,
          });
        }
      }
      for (const formationId of competency.formationIds) {
        if (!formationSet.has(formationId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "formationIds"],
            message: `Formation inconnue : ${formationId}`,
          });
        }
      }
      for (const lessonId of competency.lessonIds) {
        if (!lessonSet.has(lessonId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "lessonIds"],
            message: `Leçon inconnue : ${lessonId}`,
          });
        }
      }
      for (const exerciseType of competency.masteryCriteria.requiredExerciseTypes) {
        if (!exerciseTypeSet.has(exerciseType)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "masteryCriteria", "requiredExerciseTypes"],
            message: `Type d'exercice inconnu : ${exerciseType}`,
          });
        }
      }
    }
  });

export function parseMasterKnowledgeBase(input: unknown): MasterKnowledgeBase {
  return masterKnowledgeSchema.parse(input) as MasterKnowledgeBase;
}
