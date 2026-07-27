import type { ContentDifficulty } from "./content-domain.ts";

export const EXTENSIBLE_EXERCISE_TYPES = [
  "mcq",
  "true_false",
  "association",
  "ordering",
  "drag_drop",
  "anatomy_location",
  "interactive_image",
  "clinical_case",
  "calculation",
  "fill_blank",
] as const;

export type ExtensibleExerciseType = (typeof EXTENSIBLE_EXERCISE_TYPES)[number];

export interface IllustrationReference {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface LessonEntity {
  id: string;
  parcoursId: string;
  order: number;
  title: string;
  status: "awaiting_content" | "review" | "published" | "archived";
  contentSections: Array<{ id: string; title: string | null; body: string }>;
  illustrationIds: string[];
  exerciseIds: string[];
  summary: string | null;
  validation: {
    minimumAccuracy: number | null;
    minimumExercises: number | null;
  };
}

export interface ExerciseEntity {
  id: string;
  lessonId: string;
  type: ExtensibleExerciseType;
  instruction: string;
  questionIds: string[];
  configuration: Record<string, unknown>;
}

export interface QuestionEntity {
  id: string;
  exerciseId: string;
  competencyIds: string[];
  difficulty: ContentDifficulty;
  prompt: string;
  payload: Record<string, unknown>;
  feedback: string;
  explanation: string;
  sourceDocument: string;
  sourcePages: number[];
  reviewStatus: "draft" | "source_verified" | "pedagogically_reviewed" | "trainer_validated";
}

export interface LearningEntityBundle {
  schemaVersion: 1;
  lesson: LessonEntity;
  illustrations: IllustrationReference[];
  exercises: ExerciseEntity[];
  questions: QuestionEntity[];
}
