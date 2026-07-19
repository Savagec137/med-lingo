import type {
  ContentAnswer,
  ContentDifficulty,
  ContentItem,
  ContentType,
} from "./content-domain.ts";

export const LESSON_KINDS = ["lesson", "review", "quiz", "boss"] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

export const LESSON_CONTENT_STATUSES = [
  "awaiting_content",
  "review",
  "published",
  "archived",
] as const;
export type LessonContentStatus = (typeof LESSON_CONTENT_STATUSES)[number];

export interface LessonSelectionPolicy {
  strategy: "all" | "random";
  count: number | null;
}

export const CONTENT_POOL_STRATEGIES = ["balanced_random", "adaptive_review"] as const;
export type ContentPoolStrategy = (typeof CONTENT_POOL_STRATEGIES)[number];

export interface LessonContentPool {
  sourceLessonIds: string[];
  strategy: ContentPoolStrategy;
  minimumItems: number | null;
  maximumItems: number | null;
  coverage: "balanced_by_lesson";
  deduplicateBy: "id";
  futurePriority?: "least_mastered";
}

export interface LessonQuizConfiguration {
  successThreshold: number | null;
  successThresholdConfigurable: boolean;
  rewardConfigurable: boolean;
}

export interface LessonBossConfiguration {
  objective: string;
  scenario: string;
  tasks: string[];
  engine: "existing_lesson_engine";
  excludedEngine: "mode_intervention";
  successThreshold: number | null;
  rewardConfigurable: boolean;
}

export interface LearningContentItem {
  id: string;
  difficulty: ContentDifficulty;
  type: ContentType;
  question: string;
  instruction?: string;
  answers: ContentAnswer[];
  correctAnswer: string | string[];
  explanation: string;
  priorityReminder?: string;
  tags: string[];
  competencyIds: string[];
  pedagogicalReference?: string;
  level?: number;
  xp?: number;
  metadata?: ContentItem["metadata"];
}

export interface LessonContentFile {
  schemaVersion: 2;
  formation: string;
  parcours: string;
  id: string;
  title: string;
  kind: LessonKind;
  status: LessonContentStatus;
  difficulty: ContentDifficulty | null;
  estimatedMinutes: number | null;
  estimatedDuration?: {
    minimumMinutes: number;
    maximumMinutes: number;
    label: string;
  };
  level: number | null;
  xp: number | null;
  tags: string[];
  pedagogicalReference: string | null;
  pulse: string | null;
  selection: LessonSelectionPolicy;
  specificationFile?: string;
  learningObjectives?: string[];
  competencyIds?: string[];
  prerequisiteIds?: string[];
  contentPool?: LessonContentPool;
  quizConfiguration?: LessonQuizConfiguration;
  bossConfiguration?: LessonBossConfiguration;
  items: LearningContentItem[];
}

export interface FormationLessonReference {
  id: string;
  title: string;
  kind: LessonKind;
  status: LessonContentStatus;
  file: string;
  specificationFile?: string;
}

export interface ParcoursDefinition {
  id: string;
  contentId?: string;
  order: number;
  title: string;
  subtitle: string;
  objective?: string;
  manifestFile?: string;
  unlocksParcoursId?: string;
  theme:
    | "green"
    | "blue"
    | "purple"
    | "orange"
    | "red"
    | "yellow"
    | "teal"
    | "cyan"
    | "pink"
    | "indigo"
    | "slate";
  lessons: FormationLessonReference[];
}

export interface FormationDefinition {
  schemaVersion: 2;
  id: string;
  title: string;
  parcours: ParcoursDefinition[];
}

export interface LoadedLessonContent extends LessonContentFile {
  interactions: ContentItem[];
}
