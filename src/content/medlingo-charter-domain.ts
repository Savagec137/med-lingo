import type { ContentDifficulty, ContentType } from "./content-domain.ts";
import type {
  ChestTier,
  InventoryItemType,
  Rarity,
  RewardType,
} from "../features/gamification/domain.ts";
import type { LessonKind, LessonContentStatus } from "./learning-domain.ts";

export interface CharterExerciseType {
  id: ContentType;
  label: string;
  answerMode: "single" | "multiple" | "ordered" | "matching";
}

export interface CharterDifficultyLevel {
  id: ContentDifficulty;
  order: number;
  minimumAnswers: number;
  maximumAnswers: number;
  description: string;
}

export interface MedlingoOfficialCharter {
  schemaVersion: 1;
  id: "medlingo-official-charter";
  version: string;
  status: "official";
  effectiveDate: string;
  terminology: {
    group: "bloc";
    parcours: "parcours";
    lesson: "lesson";
    review: "review";
    quiz: "quiz";
    boss: "boss";
  };
  structures: {
    parcours: {
      requiredFields: string[];
      completionMode: "sequential";
      bossUnlocksNextParcours: true;
      draftWithoutPublishedLessonsIsVisible: false;
    };
    lesson: {
      kinds: LessonKind[];
      statuses: LessonContentStatus[];
      sessionExerciseMinimum: number;
      sessionExerciseMaximum: number;
      defaultSessionExerciseCount: number;
      correctionKey: "answer_id";
      pulseCardIsScored: false;
    };
  };
  exerciseTypes: CharterExerciseType[];
  exerciseContexts: Array<{
    id: "clinical_case" | "prioritization" | "synthesis";
    compatibleTypes: ContentType[];
  }>;
  difficultyLevels: CharterDifficultyLevel[];
  progression: {
    storageKey: "lesson_id";
    unlockMode: "sequential";
    stars: Array<{ stars: 0 | 1 | 2 | 3; minimumAccuracy: number }>;
    successCriteria: {
      lessonMinimumAccuracy: number;
      quizMinimumAccuracy: number;
      bossMinimumAccuracy: number;
      masteryMinimumAccuracy: number;
      masteryMinimumAttempts: number;
    };
    dailyGoalXp: { minimum: number; maximum: number; default: number };
    hearts: { maximum: number; regenerationMinutes: number };
  };
  rewards: {
    rewardTypes: RewardType[];
    inventoryItemTypes: InventoryItemType[];
    lesson: {
      xpMultiplierByStars: Record<"0" | "1" | "2" | "3", number>;
      coinsBase: number;
      coinsPerStar: number;
    };
  };
  badges: {
    identifierPolicy: "stable_code";
    duplicatePolicy: "unique_per_user";
    categories: Array<"progression" | "mastery" | "streak" | "xp" | "boss" | "special">;
  };
  chests: {
    probabilitySource: "supabase_loot_tables";
    historySource: "supabase_chest_openings";
    rarities: Rarity[];
    tiers: Array<{ id: ChestTier; rarity: Rarity }>;
  };
  boss: {
    engine: "existing_lesson_engine";
    excludedEngine: "mode_intervention";
    unlocksNextParcours: true;
    minimumAccuracy: number;
    rewardConfigurable: true;
  };
  srs: {
    status: "contract_ready";
    scheduleDays: number[];
    minimumAccuracy: number;
    minimumAttempts: number;
    successPolicy: "advance_one_stage";
    failurePolicy: "move_back_one_stage";
    selectionPriority: "least_mastered_then_overdue";
  };
  publication: {
    questionsInReactForbidden: true;
    emptyPublishedBankForbidden: true;
    sourceMetadataRequired: true;
    trainerValidationIsDistinctFromSourceVerification: true;
  };
}
