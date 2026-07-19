import type { ContentDifficulty } from "./content-domain.ts";

export const SPECIFICATION_CONTENT_STATUSES = ["complete", "pending_content"] as const;
export type SpecificationContentStatus = (typeof SPECIFICATION_CONTENT_STATUSES)[number];

export interface SpecificationDuration {
  minimumMinutes: number;
  maximumMinutes: number;
  label: string;
}

export interface SpecificationCompetency {
  id: string;
  text: string;
}

export interface SpecificationIntroduction {
  title: string;
  hookTitle: string;
  quote: string;
  paragraphs: string[];
}

export interface SpecificationCourseSection {
  id: string;
  label: string;
  title: string;
  paragraphs: string[];
  questions: string[];
  examples: Array<{ label: string; text: string }>;
  list: string[];
  sequence: string[];
  blocks: SpecificationExtensionBlock[];
}

export interface SpecificationExtensionBlock {
  id: string;
  type: string;
  status?: SpecificationContentStatus;
  [key: string]: unknown;
}

export interface SpecificationFlashcard {
  id: string;
  question: string;
  answer: string;
}

export interface SpecificationOption {
  id: string;
  label: string;
  text: string;
}

export interface SpecificationMcq {
  id: string;
  question: string;
  options: SpecificationOption[];
  correctAnswerId: string;
  explanation: string | null;
}

export interface SpecificationTrueFalse {
  id: string;
  statement: string;
  correctAnswer: boolean;
}

export interface SpecificationAssociation {
  id: string;
  prompt: string;
  pairs: Array<{ left: string; right: string }>;
}

export interface SpecificationOrdering {
  id: string;
  prompt: string;
  presentedOrder: string[];
  correctOrder: string[];
}

export interface SpecificationClinicalCase {
  id: string;
  label: string;
  context: string;
  objective: string;
  correctAnswer: string;
}

export interface SpecificationTrap {
  id: string;
  question: string;
  expectedAnswer: string;
  explanation: string;
}

export interface SpecificationQuizBlueprint {
  id: string;
  title: string;
  questionCount: number;
  distribution: Array<{ label: string; type: string; count: number }>;
  objective: string;
  status: SpecificationContentStatus;
}

export interface SpecificationBoss {
  id: string;
  title: string;
  situation: string;
  requirements: string[];
  minimumSuccessPercent: number;
  reward: { xp: number; badge: string | null };
  status: SpecificationContentStatus;
  unresolvedSourceFragments: string[];
}

export interface PedagogicalSpecification {
  schemaVersion: 1;
  specificationVersion: string;
  contentRevision: number;
  id: string;
  formation: string;
  parcours: string;
  lesson: string;
  title: string;
  duration: SpecificationDuration;
  difficulty: { id: ContentDifficulty; label: string };
  prerequisites: string[];
  primaryCompetency: SpecificationCompetency;
  learningObjectives: string[];
  introduction: SpecificationIntroduction;
  course: { title: string; sections: SpecificationCourseSection[] };
  vocabulary: { title: string; terms: string[] };
  flashcards: { title: string; items: SpecificationFlashcard[] };
  exercises: {
    title: string;
    mcq: SpecificationMcq[];
    trueFalse: SpecificationTrueFalse[];
    associations: SpecificationAssociation[];
    dragAndDrop: SpecificationOrdering[];
    clinicalCases: SpecificationClinicalCase[];
    traps: SpecificationTrap[];
  };
  anecdote: { id: string; title: string; text: string };
  finalQuiz: SpecificationQuizBlueprint;
  boss: SpecificationBoss;
  illustrations: SpecificationExtensionBlock[];
  openQuestions: SpecificationExtensionBlock[];
  rewards: SpecificationExtensionBlock[];
  additionalContent: SpecificationExtensionBlock[];
  integration: {
    sourceStatus: "official";
    mergeStrategy: "merge_by_stable_id";
    projectedContentIds: string[];
    nonProjectedContentIds: string[];
  };
}
