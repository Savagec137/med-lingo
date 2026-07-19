import type {
  LessonBossConfiguration,
  LessonContentPool,
  LessonQuizConfiguration,
} from "./learning-domain.ts";

export const PARCOURS_ENTRY_TYPES = ["lesson", "review", "quiz", "boss"] as const;
export type ParcoursEntryType = (typeof PARCOURS_ENTRY_TYPES)[number];

export const PARCOURS_ENTRY_STATUSES = ["draft", "published"] as const;
export type ParcoursEntryStatus = (typeof PARCOURS_ENTRY_STATUSES)[number];

export interface ParcoursManifestEntry {
  id: string;
  order: number;
  title: string;
  type: ParcoursEntryType;
  status: ParcoursEntryStatus;
  bankFile: string;
  learningObjectives: string[];
  competencyIds: string[];
  prerequisiteIds: string[];
  contentPool?: LessonContentPool;
  quizConfiguration?: LessonQuizConfiguration;
  bossConfiguration?: LessonBossConfiguration;
}

export interface ParcoursManifest {
  schemaVersion: 1;
  id: string;
  internalId: string;
  formationId: string;
  title: string;
  subtitle: string;
  globalObjective: string;
  sourceDocument: string;
  sourcePages: number[];
  sourceReviewStatus: "draft" | "source_verified";
  entries: ParcoursManifestEntry[];
  completion: {
    orderedEntryIds: string[];
    unlocksParcoursId: string;
  };
}
