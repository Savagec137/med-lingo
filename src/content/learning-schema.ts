import { z } from "zod";
import { CONTENT_DIFFICULTIES, CONTENT_TYPES, type ContentItem } from "./content-domain.ts";
import { parseContentBank } from "./content-schema.ts";
import {
  LESSON_CONTENT_STATUSES,
  LESSON_KINDS,
  type FormationDefinition,
  type LessonContentFile,
  type LearningContentItem,
} from "./learning-domain.ts";

const answerSchema = z.object({
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

const metadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional();

const learningItemSchema = z.object({
  id: z.string().trim().min(1),
  difficulty: z.enum(CONTENT_DIFFICULTIES),
  type: z.enum(CONTENT_TYPES),
  question: z.string().trim().min(1),
  instruction: z.string().trim().min(1).optional(),
  answers: z.array(answerSchema).min(2),
  correctAnswer: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)]),
  explanation: z.string().trim().min(1),
  priorityReminder: z.string().trim().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).min(1),
  competencyIds: z.array(z.string().trim().min(1)).min(1),
  pedagogicalReference: z.string().trim().min(1).optional(),
  level: z.number().int().positive().optional(),
  xp: z.number().int().nonnegative().optional(),
  metadata: metadataSchema,
});

const lessonContentSchema = z
  .object({
    schemaVersion: z.literal(2),
    formation: z.string().trim().min(1),
    parcours: z.string().trim().min(1),
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    kind: z.enum(LESSON_KINDS),
    status: z.enum(LESSON_CONTENT_STATUSES),
    difficulty: z.enum(CONTENT_DIFFICULTIES).nullable(),
    estimatedMinutes: z.number().int().positive().nullable(),
    level: z.number().int().positive().nullable(),
    xp: z.number().int().nonnegative().nullable(),
    tags: z.array(z.string().trim().min(1)),
    pedagogicalReference: z.string().trim().min(1).nullable(),
    pulse: z.string().trim().min(1).max(240).nullable(),
    selection: z.object({
      strategy: z.enum(["all", "random"]),
      count: z.number().int().positive().nullable(),
    }),
    items: z.array(learningItemSchema),
  })
  .superRefine((lesson, context) => {
    const ids = lesson.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Les identifiants de question doivent être uniques dans la leçon.",
      });
    }

    if (lesson.status === "awaiting_content" && lesson.items.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Une banque en attente de contenu doit rester vide.",
      });
    }

    if (lesson.status !== "published") return;

    const requiredMetadata = [
      lesson.difficulty,
      lesson.estimatedMinutes,
      lesson.level,
      lesson.xp,
      lesson.pedagogicalReference,
    ];
    if (requiredMetadata.some((value) => value === null) || lesson.items.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message:
          "Une leçon publiée exige ses métadonnées, sa référence pédagogique et au moins une question.",
      });
    }

    if (
      lesson.selection.strategy === "random" &&
      (lesson.selection.count === null || lesson.selection.count > lesson.items.length)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selection", "count"],
        message: "La sélection aléatoire doit demander un nombre disponible de questions.",
      });
    }
  });

const lessonReferenceSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  kind: z.enum(LESSON_KINDS),
  status: z.enum(LESSON_CONTENT_STATUSES),
  file: z
    .string()
    .trim()
    .regex(/^parcours-\d{2}\/lesson-\d{2}\.json$/),
});

const parcoursSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^parcours-\d{2}$/),
  order: z.number().int().positive(),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1),
  theme: z.enum([
    "green",
    "blue",
    "purple",
    "orange",
    "red",
    "yellow",
    "teal",
    "cyan",
    "pink",
    "indigo",
    "slate",
  ]),
  lessons: z.array(lessonReferenceSchema),
});

const formationSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    parcours: z.array(parcoursSchema).min(1),
  })
  .superRefine((formation, context) => {
    const parcoursIds = formation.parcours.map((parcours) => parcours.id);
    const orders = formation.parcours.map((parcours) => parcours.order);
    const lessonIds = formation.parcours.flatMap((parcours) =>
      parcours.lessons.map((lesson) => lesson.id),
    );
    const files = formation.parcours.flatMap((parcours) =>
      parcours.lessons.map((lesson) => lesson.file),
    );

    const duplicateChecks: Array<[string, Array<string | number>]> = [
      ["parcours", parcoursIds],
      ["parcours.order", orders],
      ["lessons.id", lessonIds],
      ["lessons.file", files],
    ];
    for (const [path, values] of duplicateChecks) {
      if (new Set<string | number>(values).size !== values.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message: `${path} contient une valeur dupliquée.`,
        });
      }
    }

    const expectedOrders = formation.parcours.map((_, index) => index + 1);
    if (orders.some((order, index) => order !== expectedOrders[index])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parcours"],
        message: "Les parcours doivent être classés dans un ordre continu.",
      });
    }
  });

export function normalizeLearningItem(
  lesson: LessonContentFile,
  item: LearningContentItem,
): ContentItem {
  return {
    id: item.id,
    unit: lesson.parcours,
    lesson: lesson.id,
    difficulty: item.difficulty,
    type: item.type,
    question: item.question,
    instruction: item.instruction,
    answers: item.answers,
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
    priorityReminder: item.priorityReminder,
    tags: item.tags,
    metadata: {
      ...item.metadata,
      formation: lesson.formation,
      parcours: lesson.parcours,
      lessonId: lesson.id,
      pedagogicalReference: item.pedagogicalReference ?? lesson.pedagogicalReference ?? "",
      competencyIds: item.competencyIds,
      level: item.level ?? lesson.level ?? 0,
      xp: item.xp ?? 0,
    },
  };
}

export function parseLessonContentFile(input: unknown): LessonContentFile {
  const lesson = lessonContentSchema.parse(input) as LessonContentFile;
  if (lesson.items.length > 0) {
    parseContentBank({
      schemaVersion: 1,
      items: lesson.items.map((item) => normalizeLearningItem(lesson, item)),
    });
  }
  return lesson;
}

export function parseFormationDefinition(input: unknown): FormationDefinition {
  return formationSchema.parse(input) as FormationDefinition;
}
