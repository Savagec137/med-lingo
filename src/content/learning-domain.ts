import type {
  ContentAnswer,
  ContentDifficulty,
  ContentItem,
  ContentType,
} from "./content-domain.ts";

export const LESSON_KINDS = ["lesson", "quiz", "boss"] as const;
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
  order: number;
  title: string;
  subtitle: string;
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
