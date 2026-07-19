import { z } from "zod";
import { CONTENT_POOL_STRATEGIES, type LessonContentPool } from "./learning-domain.ts";
import {
  PARCOURS_ENTRY_STATUSES,
  PARCOURS_ENTRY_TYPES,
  type ParcoursManifest,
} from "./parcours-manifest-domain.ts";

const nonEmptyString = z.string().trim().min(1);

const contentPoolSchema: z.ZodType<LessonContentPool> = z
  .object({
    sourceLessonIds: z.array(nonEmptyString).min(1),
    strategy: z.enum(CONTENT_POOL_STRATEGIES),
    minimumItems: z.number().int().positive().nullable(),
    maximumItems: z.number().int().positive().nullable(),
    coverage: z.literal("balanced_by_lesson"),
    deduplicateBy: z.literal("id"),
    futurePriority: z.literal("least_mastered").optional(),
  })
  .superRefine((pool, context) => {
    if (new Set(pool.sourceLessonIds).size !== pool.sourceLessonIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceLessonIds"],
        message: "Les banques sources doivent être uniques.",
      });
    }
    if (
      pool.minimumItems !== null &&
      pool.maximumItems !== null &&
      pool.minimumItems > pool.maximumItems
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minimumItems"],
        message: "Le minimum du pool ne peut pas dépasser son maximum.",
      });
    }
  });

const entrySchema = z.object({
  id: nonEmptyString,
  order: z.number().int().positive(),
  title: nonEmptyString,
  type: z.enum(PARCOURS_ENTRY_TYPES),
  status: z.enum(PARCOURS_ENTRY_STATUSES),
  bankFile: nonEmptyString.regex(/^parcours-\d{2}\/lesson-\d{2}\.json$/),
  learningObjectives: z.array(nonEmptyString),
  competencyIds: z.array(nonEmptyString),
  prerequisiteIds: z.array(nonEmptyString),
  contentPool: contentPoolSchema.optional(),
  quizConfiguration: z
    .object({
      successThreshold: z.number().min(0).max(1).nullable(),
      successThresholdConfigurable: z.boolean(),
      rewardConfigurable: z.boolean(),
    })
    .optional(),
  bossConfiguration: z
    .object({
      objective: nonEmptyString,
      scenario: nonEmptyString,
      tasks: z.array(nonEmptyString).min(1),
      engine: z.literal("existing_lesson_engine"),
      excludedEngine: z.literal("mode_intervention"),
      successThreshold: z.number().min(0).max(1).nullable(),
      rewardConfigurable: z.boolean(),
    })
    .optional(),
});

const parcoursManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: nonEmptyString.regex(/^[a-z0-9]+-p\d{2}$/),
    internalId: nonEmptyString.regex(/^parcours-\d{2}$/),
    formationId: nonEmptyString,
    title: nonEmptyString,
    subtitle: nonEmptyString,
    globalObjective: nonEmptyString,
    sourceDocument: nonEmptyString,
    sourcePages: z.array(z.number().int().positive()),
    sourceReviewStatus: z.enum(["draft", "source_verified"]),
    entries: z.array(entrySchema).min(1),
    completion: z.object({
      orderedEntryIds: z.array(nonEmptyString).min(1),
      unlocksParcoursId: nonEmptyString,
    }),
  })
  .superRefine((manifest, context) => {
    const ids = manifest.entries.map((entry) => entry.id);
    const files = manifest.entries.map((entry) => entry.bankFile);
    const expectedOrders = manifest.entries.map((_, index) => index + 1);
    if (new Set(ids).size !== ids.length || new Set(files).size !== files.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "Les identifiants et fichiers du parcours doivent être uniques.",
      });
    }
    if (manifest.entries.some((entry, index) => entry.order !== expectedOrders[index])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "L'ordre des contenus du parcours doit être continu.",
      });
    }

    for (const [index, entry] of manifest.entries.entries()) {
      const expectedPrerequisites = index === 0 ? [] : [manifest.entries[index - 1]!.id];
      if (
        entry.prerequisiteIds.length !== expectedPrerequisites.length ||
        entry.prerequisiteIds.some(
          (id, prerequisiteIndex) => id !== expectedPrerequisites[prerequisiteIndex],
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "prerequisiteIds"],
          message: "Les prérequis doivent suivre l'ordre pédagogique déclaré.",
        });
      }
      if (entry.type === "lesson" && entry.competencyIds.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "competencyIds"],
          message: "Une leçon doit référencer au moins une compétence.",
        });
      }
      if (entry.type !== "lesson" && !entry.contentPool) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "contentPool"],
          message: "Une révision, un quiz ou un Boss doit déclarer ses banques sources.",
        });
      }
      for (const sourceLessonId of entry.contentPool?.sourceLessonIds ?? []) {
        const sourceIndex = ids.indexOf(sourceLessonId);
        if (sourceIndex < 0 || sourceIndex >= index) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["entries", index, "contentPool", "sourceLessonIds"],
            message: `Banque source inconnue ou non antérieure : ${sourceLessonId}`,
          });
        }
      }
    }

    if (
      manifest.completion.orderedEntryIds.length !== ids.length ||
      manifest.completion.orderedEntryIds.some((id, index) => id !== ids[index])
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completion", "orderedEntryIds"],
        message: "La progression finale doit reprendre exactement l'ordre des contenus.",
      });
    }
  });

export function parseParcoursManifest(input: unknown): ParcoursManifest {
  return parcoursManifestSchema.parse(input) as ParcoursManifest;
}
