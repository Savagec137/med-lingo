import type { ContentDifficulty } from "./content-domain.ts";

export const KNOWLEDGE_REVIEW_STATUSES = [
  "draft",
  "source_verified",
  "pedagogically_reviewed",
  "trainer_validated",
  "deprecated",
] as const;

export type KnowledgeReviewStatus = (typeof KNOWLEDGE_REVIEW_STATUSES)[number];

export interface MasteryCriteria {
  minimumAccuracy: number;
  minimumAttempts: number;
  requiredExerciseTypes: string[];
}

export interface CompetencyDefinition {
  id: string;
  parcours: number;
  formationIds: string[];
  domain: string;
  subdomain: string;
  competence: string;
  prerequisites: string[];
  learningObjectives: string[];
  recommendedQuestionPool: number;
  difficulty: ContentDifficulty;
  masteryCriteria: MasteryCriteria;
  tags: string[];
  sourceDocument: string;
  sourcePages: number[];
  sourceLocation?: string;
  reviewStatus: KnowledgeReviewStatus;
  lessonIds: string[];
  questionIds: string[];
  contentIds: string[];
}

export interface MasterKnowledgeBase {
  schemaVersion: "1.0";
  formations: string[];
  lessonRegistry: string[];
  supportedExerciseTypes: string[];
  competencies: CompetencyDefinition[];
}
