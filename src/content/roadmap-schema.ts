import { z } from "zod";
import { CONTENT_DIFFICULTIES } from "./content-domain.ts";
import {
  PEDAGOGICAL_SCOPES,
  ROADMAP_CONTENT_STATUSES,
  ROADMAP_STAGES,
  type OfficialRoadmap,
} from "./roadmap-domain.ts";

const stableId = (prefix: string) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^${prefix}-\\d{2}$`));

const lessonBlueprintSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^dea-p\d{2}-l\d{2}$/),
  order: z.number().int().positive(),
  title: z.string().trim().min(1),
  status: z.literal("awaiting_content"),
});

const roadmapSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().trim().min(1),
    formationId: z.string().trim().min(1),
    status: z.literal("official_structure"),
    source: z.object({
      file: z
        .string()
        .trim()
        .regex(/^roadmap-v\d+\.specification\.txt$/),
      projection: z.literal("structure_only"),
      medicalValidation: z.literal("required_before_publication"),
    }),
    stages: z.array(
      z.object({
        id: z.enum(ROADMAP_STAGES),
        title: z.string().trim().min(1),
        firstParcoursOrder: z.number().int().positive(),
        lastParcoursOrder: z.number().int().positive(),
        capstoneBossId: z.string().trim().min(1).optional(),
        prerequisiteBossId: z.string().trim().min(1).optional(),
      }),
    ),
    blocks: z.array(
      z.object({
        id: stableId("bloc"),
        order: z.number().int().positive(),
        title: z.string().trim().min(1),
        description: z.string().trim().min(1).nullable(),
        stage: z.enum(ROADMAP_STAGES),
        theme: z.string().trim().min(1),
        sourceAnchor: z.string().trim().min(1),
      }),
    ),
    parcours: z.array(
      z.object({
        id: stableId("parcours"),
        contentId: z
          .string()
          .trim()
          .regex(/^dea-p\d{2}$/),
        blocId: stableId("bloc"),
        order: z.number().int().positive(),
        title: z.string().trim().min(1),
        subtitle: z.string().trim().min(1).nullable(),
        description: z.string().trim().min(1).nullable(),
        objectives: z.array(z.string().trim().min(1)),
        competencies: z.array(z.string().trim().min(1)),
        difficulty: z.enum(CONTENT_DIFFICULTIES).nullable(),
        difficultyLabel: z.string().trim().min(1).nullable(),
        estimatedMinutes: z.number().int().positive().nullable(),
        estimatedDurationLabel: z.string().trim().min(1).nullable(),
        xp: z.number().int().nonnegative().nullable(),
        badge: z.string().trim().min(1).nullable(),
        chest: z.string().trim().min(1).nullable(),
        plannedLessonCount: z.number().int().nonnegative(),
        lessonBlueprints: z.array(lessonBlueprintSchema),
        bossId: z
          .string()
          .trim()
          .regex(/^dea-p\d{2}-boss$/),
        prerequisiteIds: z.array(z.string().trim().min(1)),
        unlocksParcoursId: stableId("parcours").nullable(),
        stage: z.enum(ROADMAP_STAGES),
        pedagogicalScope: z.enum(PEDAGOGICAL_SCOPES),
        contentStatus: z.enum(ROADMAP_CONTENT_STATUSES),
        metadataStatus: z.enum(["complete", "pending_specification"]),
        pendingFields: z.array(z.string().trim().min(1)),
        sourceAnchor: z.string().trim().min(1),
      }),
    ),
    bosses: z.array(
      z.object({
        id: z
          .string()
          .trim()
          .regex(/^dea-p\d{2}-boss$/),
        parcoursId: stableId("parcours"),
        title: z.string().trim().min(1),
        status: z.enum(["awaiting_content", "published"]),
        scenario: z.array(z.string().trim().min(1)),
        selection: z.object({
          strategy: z.literal("mixed_competency_pool"),
          minimumExercises: z.number().int().positive(),
          maximumExercises: z.number().int().positive(),
        }),
        successThreshold: z.number().min(0).max(1),
        rewardMultiplier: z.number().positive(),
      }),
    ),
  })
  .superRefine((roadmap, context) => {
    const continuous = (values: number[]) => values.every((value, index) => value === index + 1);
    const unique = <T>(values: T[]) => new Set(values).size === values.length;

    if (
      !continuous(roadmap.blocks.map((block) => block.order)) ||
      !unique(roadmap.blocks.map((block) => block.id))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blocks"],
        message: "Les blocs doivent être uniques et classés dans un ordre continu.",
      });
    }
    if (
      !continuous(roadmap.parcours.map((parcours) => parcours.order)) ||
      !unique(roadmap.parcours.map((parcours) => parcours.id))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parcours"],
        message: "Les parcours doivent être uniques et classés dans un ordre continu.",
      });
    }

    const blockIds = new Set(roadmap.blocks.map((block) => block.id));
    const parcoursIds = new Set(roadmap.parcours.map((parcours) => parcours.id));
    const bossIds = new Set(roadmap.bosses.map((boss) => boss.id));
    const lessonIds = roadmap.parcours.flatMap((parcours) =>
      parcours.lessonBlueprints.map((lesson) => lesson.id),
    );

    if (!unique(lessonIds) || bossIds.size !== roadmap.bosses.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parcours"],
        message: "Les identifiants de leçon et de Boss doivent être uniques.",
      });
    }

    for (const [index, parcours] of roadmap.parcours.entries()) {
      if (!blockIds.has(parcours.blocId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parcours", index, "blocId"],
          message: `Bloc inconnu : ${parcours.blocId}`,
        });
      }
      if (!bossIds.has(parcours.bossId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parcours", index, "bossId"],
          message: `Boss inconnu : ${parcours.bossId}`,
        });
      }
      if (parcours.plannedLessonCount !== parcours.lessonBlueprints.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parcours", index, "plannedLessonCount"],
          message: "Le nombre de leçons doit correspondre aux plans enregistrés.",
        });
      }
      if (parcours.unlocksParcoursId && !parcoursIds.has(parcours.unlocksParcoursId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parcours", index, "unlocksParcoursId"],
          message: `Parcours à débloquer inconnu : ${parcours.unlocksParcoursId}`,
        });
      }
    }
  });

export function parseOfficialRoadmap(input: unknown): OfficialRoadmap {
  return roadmapSchema.parse(input) as OfficialRoadmap;
}
