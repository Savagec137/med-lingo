import { z } from "zod";
import { CONTENT_DIFFICULTIES } from "./content-domain.ts";
import {
  EXTENSIBLE_EXERCISE_TYPES,
  type LearningEntityBundle,
} from "./learning-activity-domain.ts";

const record = z.record(z.string(), z.unknown());

const bundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    lesson: z.object({
      id: z.string().trim().min(1),
      parcoursId: z
        .string()
        .trim()
        .regex(/^parcours-\d{2}$/),
      order: z.number().int().positive(),
      title: z.string().trim().min(1),
      status: z.enum(["awaiting_content", "review", "published", "archived"]),
      contentSections: z.array(
        z.object({
          id: z.string().trim().min(1),
          title: z.string().trim().min(1).nullable(),
          body: z.string().trim().min(1),
        }),
      ),
      illustrationIds: z.array(z.string().trim().min(1)),
      exerciseIds: z.array(z.string().trim().min(1)),
      summary: z.string().trim().min(1).nullable(),
      validation: z.object({
        minimumAccuracy: z.number().min(0).max(1).nullable(),
        minimumExercises: z.number().int().positive().nullable(),
      }),
    }),
    illustrations: z.array(
      z.object({
        id: z.string().trim().min(1),
        src: z.string().trim().min(1),
        alt: z.string().trim().min(1),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      }),
    ),
    exercises: z.array(
      z.object({
        id: z.string().trim().min(1),
        lessonId: z.string().trim().min(1),
        type: z.enum(EXTENSIBLE_EXERCISE_TYPES),
        instruction: z.string().trim().min(1),
        questionIds: z.array(z.string().trim().min(1)).min(1),
        configuration: record,
      }),
    ),
    questions: z.array(
      z.object({
        id: z.string().trim().min(1),
        exerciseId: z.string().trim().min(1),
        competencyIds: z.array(z.string().trim().min(1)).min(1),
        difficulty: z.enum(CONTENT_DIFFICULTIES),
        prompt: z.string().trim().min(1),
        payload: record,
        feedback: z.string(),
        explanation: z.string(),
        sourceDocument: z.string().trim().min(1),
        sourcePages: z.array(z.number().int().positive()).min(1),
        reviewStatus: z.enum([
          "draft",
          "source_verified",
          "pedagogically_reviewed",
          "trainer_validated",
        ]),
      }),
    ),
  })
  .superRefine((bundle, context) => {
    const unique = <T>(values: T[]) => new Set(values).size === values.length;
    const exerciseIds = bundle.exercises.map((exercise) => exercise.id);
    const questionIds = bundle.questions.map((question) => question.id);
    const illustrationIds = bundle.illustrations.map((illustration) => illustration.id);

    if (!unique(exerciseIds) || !unique(questionIds) || !unique(illustrationIds)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: "Les identifiants des entités pédagogiques doivent être uniques.",
      });
    }

    const exerciseSet = new Set(exerciseIds);
    const questionSet = new Set(questionIds);
    const illustrationSet = new Set(illustrationIds);
    for (const id of bundle.lesson.exerciseIds) {
      if (!exerciseSet.has(id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lesson", "exerciseIds"],
          message: `Exercice inconnu : ${id}`,
        });
      }
    }
    for (const id of bundle.lesson.illustrationIds) {
      if (!illustrationSet.has(id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lesson", "illustrationIds"],
          message: `Illustration inconnue : ${id}`,
        });
      }
    }
    for (const [index, exercise] of bundle.exercises.entries()) {
      if (exercise.lessonId !== bundle.lesson.id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exercises", index, "lessonId"],
          message: "Un exercice doit référencer la leçon du bundle.",
        });
      }
      for (const id of exercise.questionIds) {
        if (!questionSet.has(id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["exercises", index, "questionIds"],
            message: `Question inconnue : ${id}`,
          });
        }
      }
    }
    for (const [index, question] of bundle.questions.entries()) {
      if (!exerciseSet.has(question.exerciseId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "exerciseId"],
          message: `Exercice inconnu : ${question.exerciseId}`,
        });
      }
    }

    if (bundle.lesson.status === "published") {
      if (
        bundle.exercises.length === 0 ||
        bundle.questions.length === 0 ||
        bundle.lesson.validation.minimumAccuracy === null
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lesson", "status"],
          message: "Une leçon publiée doit être jouable et posséder ses critères de validation.",
        });
      }
      if (bundle.questions.some((question) => question.reviewStatus === "draft")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions"],
          message: "Une leçon publiée ne peut pas contenir de question au statut draft.",
        });
      }
    }
  });

export function parseLearningEntityBundle(input: unknown): LearningEntityBundle {
  return bundleSchema.parse(input) as LearningEntityBundle;
}
