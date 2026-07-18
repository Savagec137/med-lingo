export const CONTENT_DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;

export type ContentDifficulty = (typeof CONTENT_DIFFICULTIES)[number];

export const CONTENT_TYPES = [
  "mcq",
  "multiple_choice",
  "ordering",
  "true_false_contextual",
  "equipment",
  "association",
  "error_identification",
  "regulatory",
  "handover",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export interface ContentAnswer {
  id: string;
  text: string;
  match?: string;
  detail?: string;
  explanation: string;
  distractorType?:
    | "frequent-error"
    | "wrong-timing"
    | "secondary-priority"
    | "sign-misinterpretation"
    | "other-context";
  sequenceRank?: number;
}

export interface ContentMetadata {
  missionId?: string;
  phase?: string;
  specialty?: string;
  lessonId?: string;
  sourceDocument?: string;
  sourcePages?: string;
  associationMode?: "matching";
  requiredSelections?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface ContentItem {
  id: string;
  unit: string;
  lesson: string;
  difficulty: ContentDifficulty;
  type: ContentType;
  question: string;
  instruction?: string;
  answers: ContentAnswer[];
  correctAnswer: string | string[];
  explanation: string;
  priorityReminder?: string;
  tags: string[];
  metadata?: ContentMetadata;
}

export interface ContentBank {
  schemaVersion: 1;
  items: ContentItem[];
}

export interface ContentQuery {
  unit?: string;
  lesson?: string;
  difficulty?: ContentDifficulty;
  type?: ContentType;
  tags?: string[];
  metadata?: Partial<ContentMetadata>;
}

export interface ContentEvaluation {
  itemId: string;
  isCorrect: boolean;
  selectedAnswerIds: string[];
  correctAnswerIds: string[];
  explanation: string;
  priorityReminder?: string;
  answerFeedback: Array<{
    answerId: string;
    selected: boolean;
    correct: boolean;
    explanation: string;
  }>;
}
