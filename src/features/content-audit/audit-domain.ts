export const AUDIT_SEVERITIES = ["INFO", "WARNING", "ERROR", "CRITICAL"] as const;

export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_CATEGORIES = [
  "structure",
  "ids",
  "duplicates",
  "required_fields",
  "pedagogy",
  "references",
  "question_types",
  "difficulty",
  "answers",
  "feedback",
  "json",
  "supabase",
  "performance",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export interface AuditInputFile {
  path: string;
  sizeBytes: number;
  data?: unknown;
  parseError?: string;
  utf8Valid: boolean;
}

export interface AuditIssue {
  id: string;
  severity: AuditSeverity;
  category: AuditCategory;
  code: string;
  message: string;
  file?: string;
  entityType?: "bloc" | "parcours" | "lesson" | "knowledge" | "question" | "boss";
  entityId?: string;
  field?: string;
  classification?: "acceptable" | "error";
  relatedIds?: string[];
}

export interface AuditEntityCounts {
  blocks: number;
  parcours: number;
  lessons: number;
  contentLessons: number;
  knowledge: number;
  questions: number;
  bosses: number;
  populatedBosses: number;
}

export interface AuditDuplicateGroup {
  kind: "question" | "knowledge" | "answer" | "title";
  normalizedText: string;
  entityIds: string[];
  files: string[];
  classification: "acceptable" | "error";
  reason: string;
}

export interface AuditSupabaseComparison {
  status: "not_configured" | "unavailable" | "compared";
  jsonQuestionCount: number;
  supabaseQuestionCount?: number;
  missingInSupabase: string[];
  additionalInSupabase: string[];
  differentIds: string[];
  message: string;
}

export interface AuditPerformance {
  fileCount: number;
  totalSizeBytes: number;
  estimatedMemoryBytes: number;
  analysisTimeMs: number;
  averageTimePerQuestionMs: number;
}

export interface AuditQualityBreakdown {
  structure: number;
  coherence: number;
  duplicates: number;
  integrity: number;
  performance: number;
  completeness: number;
}

export interface AuditReport {
  schemaVersion: 1;
  generatedAt: string;
  scope: {
    root: string;
    activeDefinition: string;
    excludedFromActiveCounts: string[];
  };
  summary: AuditEntityCounts;
  files: {
    total: number;
    validJson: number;
    invalidJson: number;
    invalidUtf8: number;
  };
  questionTypes: Record<string, number>;
  difficulties: Record<string, number>;
  lessonsOnlyEasy: Array<{ lessonId: string; questionCount: number; file: string }>;
  duplicates: AuditDuplicateGroup[];
  issuesBySeverity: Record<AuditSeverity, number>;
  issuesByCategory: Record<AuditCategory, number>;
  issues: AuditIssue[];
  supabase: AuditSupabaseComparison;
  performance: AuditPerformance;
  qualityScore: {
    total: number;
    breakdown: AuditQualityBreakdown;
  };
}

export interface RunAuditOptions {
  rootLabel?: string;
  generatedAt?: string;
  supabaseQuestionIds?: string[];
  analysisStartedAt?: number;
}
