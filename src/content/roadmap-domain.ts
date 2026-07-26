import type { ContentDifficulty } from "./content-domain.ts";

export const ROADMAP_STAGES = ["core_dea", "advanced"] as const;
export type RoadmapStage = (typeof ROADMAP_STAGES)[number];

export const PEDAGOGICAL_SCOPES = [
  "foundation",
  "emergency_recognition",
  "pathology",
  "advanced_differential",
  "professional_practice",
] as const;
export type PedagogicalScope = (typeof PEDAGOGICAL_SCOPES)[number];

export const ROADMAP_CONTENT_STATUSES = ["awaiting_content", "partial", "published"] as const;
export type RoadmapContentStatus = (typeof ROADMAP_CONTENT_STATUSES)[number];

export interface RoadmapSource {
  file: string;
  projection: "structure_only";
  medicalValidation: "required_before_publication";
}

export interface RoadmapStageDefinition {
  id: RoadmapStage;
  title: string;
  firstParcoursOrder: number;
  lastParcoursOrder: number;
  capstoneBossId?: string;
  prerequisiteBossId?: string;
}

export interface RoadmapBlock {
  id: string;
  order: number;
  title: string;
  description: string | null;
  stage: RoadmapStage;
  theme: string;
  sourceAnchor: string;
}

export interface LessonBlueprint {
  id: string;
  order: number;
  title: string;
  status: "awaiting_content";
}

export interface RoadmapParcours {
  id: string;
  contentId: string;
  blocId: string;
  order: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  objectives: string[];
  competencies: string[];
  difficulty: ContentDifficulty | null;
  difficultyLabel: string | null;
  estimatedMinutes: number | null;
  estimatedDurationLabel: string | null;
  xp: number | null;
  badge: string | null;
  chest: string | null;
  plannedLessonCount: number;
  lessonBlueprints: LessonBlueprint[];
  bossId: string;
  prerequisiteIds: string[];
  unlocksParcoursId: string | null;
  stage: RoadmapStage;
  pedagogicalScope: PedagogicalScope;
  contentStatus: RoadmapContentStatus;
  metadataStatus: "complete" | "pending_specification";
  pendingFields: string[];
  sourceAnchor: string;
}

export interface RoadmapBoss {
  id: string;
  parcoursId: string;
  title: string;
  status: "awaiting_content" | "published";
  scenario: string[];
  selection: {
    strategy: "mixed_competency_pool";
    minimumExercises: number;
    maximumExercises: number;
  };
  successThreshold: number;
  rewardMultiplier: number;
}

export interface OfficialRoadmap {
  schemaVersion: 1;
  id: string;
  formationId: string;
  status: "official_structure";
  source: RoadmapSource;
  stages: RoadmapStageDefinition[];
  blocks: RoadmapBlock[];
  parcours: RoadmapParcours[];
  bosses: RoadmapBoss[];
}
