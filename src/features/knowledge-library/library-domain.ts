export const LIBRARY_REVIEW_STATUSES = [
  "draft",
  "source_verified",
  "pedagogically_reviewed",
  "trainer_validated",
  "deprecated",
] as const;

export type LibraryReviewStatus = (typeof LIBRARY_REVIEW_STATUSES)[number];

export const LIBRARY_KNOWLEDGE_TYPES = [
  "definition",
  "notion",
  "procedure",
  "protocol",
  "table",
  "vocabulary",
  "constant",
  "competency",
  "evidence",
] as const;

export type LibraryKnowledgeType = (typeof LIBRARY_KNOWLEDGE_TYPES)[number];

export const SOURCE_AVAILABILITY_STATUSES = [
  "unchecked",
  "available",
  "unavailable",
  "restricted",
] as const;

export type SourceAvailabilityStatus = (typeof SOURCE_AVAILABILITY_STATUSES)[number];

export interface OfficialDocumentIdentity {
  document_id: string;
  title: string;
  organization: string;
  category: string;
  publication_date: string;
  revision_date: string;
  version: string;
  language: "fr" | string;
  status: "official";
  source_url: string;
  license: string;
  checksum: string;
  pages: number;
  last_import: string;
  hash: string;
  availability_status?: SourceAvailabilityStatus;
}

export interface InternalDocumentIdentity extends Omit<OfficialDocumentIdentity, "status"> {
  status: "internal";
  review_status: LibraryReviewStatus;
}

export interface LibraryKnowledge {
  knowledge_id: string;
  knowledge_type?: LibraryKnowledgeType;
  title: string;
  definition: string;
  summary: string;
  important_points: string[];
  clinical_examples: string[];
  common_errors: string[];
  memory_tips: string[];
  related_topics: string[];
  difficulty: "easy" | "medium" | "hard" | "expert";
  tags: string[];
  source_document: string;
  source_chapter?: string;
  source_section: string;
  source_paragraph?: string;
  source_page: string;
  version: string;
  review_status: LibraryReviewStatus;
}

export interface LibraryQuestionReference {
  question_id: string;
  knowledge_reference: string;
  source_document: string;
  source_page: string;
  source_version: string;
  answer_id?: string;
  explanation_reference?: string;
  version: string;
  review_status: LibraryReviewStatus;
}

export interface LibraryBossReference {
  boss_id: string;
  knowledge_references: string[];
  question_references: string[];
  source_documents: string[];
  version: string;
  review_status: LibraryReviewStatus;
}

export interface LibraryClinicalCaseReference {
  clinical_case_id: string;
  title: string;
  knowledge_references: string[];
  source_documents: string[];
  source_pages: string[];
  version: string;
  review_status: LibraryReviewStatus;
}

export interface LibraryGlossaryTerm {
  term_id: string;
  term: string;
  definition: string;
  knowledge_reference: string;
  source_document: string;
  source_page: string;
  version: string;
}

export interface LibraryVersion {
  version: string;
  created_at: string;
  status: "draft" | "published" | "archived";
  document_count: number;
  knowledge_count: number;
  question_count: number;
  boss_count: number;
  change_log: string[];
}

export interface KnowledgeLibrarySnapshot {
  schemaVersion: "1.0.0";
  libraryVersion: string;
  documents: OfficialDocumentIdentity[];
  internalDocuments: InternalDocumentIdentity[];
  knowledge: LibraryKnowledge[];
  questions: LibraryQuestionReference[];
  bosses: LibraryBossReference[];
  clinicalCases: LibraryClinicalCaseReference[];
  glossary: LibraryGlossaryTerm[];
  versions: LibraryVersion[];
}

export type LibrarySearchEntityType =
  "master_knowledge_base" | "official_sources" | "knowledge" | "questions" | "clinical_cases";

export interface LibrarySearchEntry {
  id: string;
  type: LibrarySearchEntityType;
  title: string;
  text: string;
  keywords: string[];
  sourceDocumentId?: string;
  priority: number;
}

export interface LibrarySearchIndex {
  entries: LibrarySearchEntry[];
  postings: Map<string, Set<number>>;
}

export interface LibrarySearchResult {
  id: string;
  type: LibrarySearchEntityType;
  title: string;
  excerpt: string;
  score: number;
  sourceDocumentId?: string;
}

export interface TraceabilityNode {
  type:
    | "document"
    | "chapter"
    | "section"
    | "paragraph"
    | "knowledge"
    | "question"
    | "answer"
    | "explanation";
  id: string;
  label: string;
}

export interface TraceabilityResult {
  complete: boolean;
  nodes: TraceabilityNode[];
  missing: string[];
}

export type LibraryAuditSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface LibraryAuditIssue {
  id: string;
  severity: LibraryAuditSeverity;
  code: string;
  message: string;
  entityType?: "document" | "knowledge" | "question" | "boss" | "clinical_case" | "version";
  entityId?: string;
}

export interface LibraryAuditReport {
  schemaVersion: 1;
  generatedAt: string;
  libraryVersion: string;
  counts: {
    officialDocuments: number;
    internalDocuments: number;
    knowledge: number;
    questions: number;
    bosses: number;
    clinicalCases: number;
    glossaryTerms: number;
    obsoleteDocuments: number;
    knowledgeWithoutSource: number;
    questionsWithoutReference: number;
  };
  issuesBySeverity: Record<LibraryAuditSeverity, number>;
  issues: LibraryAuditIssue[];
  qualityScore: number;
}

export interface LibraryVersionImpactReport {
  fromVersion: string;
  toVersion: string;
  changedDocuments: string[];
  addedDocuments: string[];
  removedDocuments: string[];
  impactedKnowledge: string[];
  impactedQuestions: string[];
  impactedBosses: string[];
}

export interface QuestionGenerationCandidate {
  question_id: string;
  knowledge_reference: string;
  source_document: string;
  source_page: string;
  source_version: string;
}

export interface QuestionGenerationDecision {
  allowed: boolean;
  errors: string[];
}

export interface DocumentAvailabilityProbe {
  (url: string): Promise<{ available: boolean; status?: number }>;
}
