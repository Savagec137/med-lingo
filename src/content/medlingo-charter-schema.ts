import { z } from "zod";
import { CONTENT_DIFFICULTIES, CONTENT_TYPES } from "./content-domain.ts";
import {
  CHEST_TIERS,
  RARITIES,
  type ChestTier,
  type Rarity,
} from "../features/gamification/domain.ts";
import { LESSON_CONTENT_STATUSES, LESSON_KINDS } from "./learning-domain.ts";
import type { MedlingoOfficialCharter } from "./medlingo-charter-domain.ts";

const nonEmptyString = z.string().trim().min(1);
const contentTypeSchema = z.enum(CONTENT_TYPES);

const charterSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.literal("medlingo-official-charter"),
    version: nonEmptyString.regex(/^\d+\.\d+\.\d+$/),
    status: z.literal("official"),
    effectiveDate: nonEmptyString.regex(/^\d{4}-\d{2}-\d{2}$/),
    terminology: z.object({
      group: z.literal("bloc"),
      parcours: z.literal("parcours"),
      lesson: z.literal("lesson"),
      review: z.literal("review"),
      quiz: z.literal("quiz"),
      boss: z.literal("boss"),
    }),
    structures: z.object({
      parcours: z.object({
        requiredFields: z.array(nonEmptyString).min(1),
        completionMode: z.literal("sequential"),
        bossUnlocksNextParcours: z.literal(true),
        draftWithoutPublishedLessonsIsVisible: z.literal(false),
      }),
      lesson: z.object({
        kinds: z.array(z.enum(LESSON_KINDS)),
        statuses: z.array(z.enum(LESSON_CONTENT_STATUSES)),
        sessionExerciseMinimum: z.number().int().positive(),
        sessionExerciseMaximum: z.number().int().positive(),
        defaultSessionExerciseCount: z.number().int().positive(),
        correctionKey: z.literal("answer_id"),
        pulseCardIsScored: z.literal(false),
      }),
    }),
    exerciseTypes: z.array(
      z.object({
        id: contentTypeSchema,
        label: nonEmptyString,
        answerMode: z.enum(["single", "multiple", "ordered", "matching"]),
      }),
    ),
    exerciseContexts: z.array(
      z.object({
        id: z.enum(["clinical_case", "prioritization", "synthesis"]),
        compatibleTypes: z.array(contentTypeSchema).min(1),
      }),
    ),
    difficultyLevels: z.array(
      z.object({
        id: z.enum(CONTENT_DIFFICULTIES),
        order: z.number().int().positive(),
        minimumAnswers: z.number().int().min(2),
        maximumAnswers: z.number().int().min(2),
        description: nonEmptyString,
      }),
    ),
    progression: z.object({
      storageKey: z.literal("lesson_id"),
      unlockMode: z.literal("sequential"),
      stars: z.array(
        z.object({
          stars: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
          minimumAccuracy: z.number().min(0).max(1),
        }),
      ),
      successCriteria: z.object({
        lessonMinimumAccuracy: z.number().min(0).max(1),
        quizMinimumAccuracy: z.number().min(0).max(1),
        bossMinimumAccuracy: z.number().min(0).max(1),
        masteryMinimumAccuracy: z.number().min(0).max(1),
        masteryMinimumAttempts: z.number().int().positive(),
      }),
      dailyGoalXp: z.object({
        minimum: z.number().int().positive(),
        maximum: z.number().int().positive(),
        default: z.number().int().positive(),
      }),
      hearts: z.object({
        maximum: z.number().int().positive(),
        regenerationMinutes: z.number().int().positive(),
      }),
    }),
    rewards: z.object({
      rewardTypes: z.array(z.enum(["xp", "coins", "gems", "keys", "tickets", "energy", "item"])),
      inventoryItemTypes: z.array(
        z.enum(["chest", "xp_boost", "avatar", "profile_card", "badge", "ticket"]),
      ),
      lesson: z.object({
        xpMultiplierByStars: z.object({
          "0": z.number().positive(),
          "1": z.number().positive(),
          "2": z.number().positive(),
          "3": z.number().positive(),
        }),
        coinsBase: z.number().int().nonnegative(),
        coinsPerStar: z.number().int().nonnegative(),
      }),
    }),
    badges: z.object({
      identifierPolicy: z.literal("stable_code"),
      duplicatePolicy: z.literal("unique_per_user"),
      categories: z.array(z.enum(["progression", "mastery", "streak", "xp", "boss", "special"])),
    }),
    chests: z.object({
      probabilitySource: z.literal("supabase_loot_tables"),
      historySource: z.literal("supabase_chest_openings"),
      rarities: z.array(z.enum(RARITIES)),
      tiers: z.array(
        z.object({
          id: z.enum(CHEST_TIERS),
          rarity: z.enum(RARITIES),
        }),
      ),
    }),
    boss: z.object({
      engine: z.literal("existing_lesson_engine"),
      excludedEngine: z.literal("mode_intervention"),
      unlocksNextParcours: z.literal(true),
      minimumAccuracy: z.number().min(0).max(1),
      rewardConfigurable: z.literal(true),
    }),
    srs: z.object({
      status: z.literal("contract_ready"),
      scheduleDays: z.array(z.number().int().positive()).min(1),
      minimumAccuracy: z.number().min(0).max(1),
      minimumAttempts: z.number().int().positive(),
      successPolicy: z.literal("advance_one_stage"),
      failurePolicy: z.literal("move_back_one_stage"),
      selectionPriority: z.literal("least_mastered_then_overdue"),
    }),
    publication: z.object({
      questionsInReactForbidden: z.literal(true),
      emptyPublishedBankForbidden: z.literal(true),
      sourceMetadataRequired: z.literal(true),
      trainerValidationIsDistinctFromSourceVerification: z.literal(true),
    }),
  })
  .superRefine((charter, context) => {
    const uniqueChecks = [
      ["structures.lesson.kinds", charter.structures.lesson.kinds, LESSON_KINDS],
      ["structures.lesson.statuses", charter.structures.lesson.statuses, LESSON_CONTENT_STATUSES],
      ["exerciseTypes", charter.exerciseTypes.map((item) => item.id), CONTENT_TYPES],
      ["difficultyLevels", charter.difficultyLevels.map((item) => item.id), CONTENT_DIFFICULTIES],
      ["chests.rarities", charter.chests.rarities, RARITIES],
      ["chests.tiers", charter.chests.tiers.map((item) => item.id), CHEST_TIERS],
    ] as const;

    for (const [path, actual, expected] of uniqueChecks) {
      if (
        actual.length !== expected.length ||
        new Set(actual).size !== actual.length ||
        expected.some((value) => !actual.includes(value as never))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: path.split("."),
          message: `${path} doit couvrir exactement le contrat moteur actuel.`,
        });
      }
    }

    const lessonStructure = charter.structures.lesson;
    if (
      lessonStructure.sessionExerciseMinimum > lessonStructure.defaultSessionExerciseCount ||
      lessonStructure.defaultSessionExerciseCount > lessonStructure.sessionExerciseMaximum
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["structures", "lesson"],
        message: "La taille de session par défaut doit rester dans les bornes définies.",
      });
    }

    const starThresholds = [...charter.progression.stars].sort((a, b) => a.stars - b.stars);
    if (
      starThresholds.length !== 4 ||
      starThresholds.some((entry, index) => entry.stars !== index) ||
      starThresholds.some(
        (entry, index) =>
          index > 0 && entry.minimumAccuracy <= starThresholds[index - 1]!.minimumAccuracy,
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["progression", "stars"],
        message: "Les seuils d'étoiles doivent être uniques et strictement croissants.",
      });
    }

    if (
      charter.srs.scheduleDays.some(
        (day, index) => index > 0 && day <= charter.srs.scheduleDays[index - 1]!,
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["srs", "scheduleDays"],
        message: "Les échéances SRS doivent être strictement croissantes.",
      });
    }

    const expectedChestRarity: Record<ChestTier, Rarity> = {
      bronze: "common",
      silver: "rare",
      gold: "epic",
      legendary: "legendary",
      mythic: "mythic",
    };
    for (const tier of charter.chests.tiers) {
      if (tier.rarity !== expectedChestRarity[tier.id]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["chests", "tiers"],
          message: `La rareté du coffre ${tier.id} ne correspond pas au moteur actuel.`,
        });
      }
    }
  });

export function parseMedlingoOfficialCharter(input: unknown): MedlingoOfficialCharter {
  return charterSchema.parse(input) as MedlingoOfficialCharter;
}
