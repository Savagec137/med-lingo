import { z } from "zod";
import {
  LIBRARY_KNOWLEDGE_TYPES,
  LIBRARY_REVIEW_STATUSES,
  SOURCE_AVAILABILITY_STATUSES,
  type KnowledgeLibrarySnapshot,
} from "./library-domain.ts";

const nonEmpty = z.string().trim().min(1);

const officialDocumentSchema = z.object({
  document_id: nonEmpty,
  title: nonEmpty,
  organization: nonEmpty,
  category: nonEmpty,
  publication_date: nonEmpty,
  revision_date: nonEmpty,
  version: nonEmpty,
  language: nonEmpty,
  status: z.literal("official"),
  source_url: z.string().url(),
  license: nonEmpty,
  checksum: nonEmpty,
  pages: z.number().int().positive(),
  last_import: nonEmpty,
  hash: nonEmpty,
  availability_status: z.enum(SOURCE_AVAILABILITY_STATUSES).optional(),
});

const internalDocumentSchema = officialDocumentSchema.omit({ status: true }).extend({
  status: z.literal("internal"),
  review_status: z.enum(LIBRARY_REVIEW_STATUSES),
});

const knowledgeSchema = z.object({
  knowledge_id: nonEmpty,
  knowledge_type: z.enum(LIBRARY_KNOWLEDGE_TYPES).optional(),
  title: nonEmpty,
  definition: nonEmpty,
  summary: nonEmpty,
  important_points: z.array(nonEmpty),
  clinical_examples: z.array(nonEmpty),
  common_errors: z.array(nonEmpty),
  memory_tips: z.array(nonEmpty),
  related_topics: z.array(nonEmpty),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  tags: z.array(nonEmpty),
  source_document: nonEmpty,
  source_chapter: nonEmpty.optional(),
  source_section: nonEmpty,
  source_paragraph: nonEmpty.optional(),
  source_page: nonEmpty,
  version: nonEmpty,
  review_status: z.enum(LIBRARY_REVIEW_STATUSES),
});

const questionSchema = z.object({
  question_id: nonEmpty,
  knowledge_reference: nonEmpty,
  source_document: nonEmpty,
  source_page: nonEmpty,
  source_version: nonEmpty,
  answer_id: nonEmpty.optional(),
  explanation_reference: nonEmpty.optional(),
  version: nonEmpty,
  review_status: z.enum(LIBRARY_REVIEW_STATUSES),
});

const bossSchema = z.object({
  boss_id: nonEmpty,
  knowledge_references: z.array(nonEmpty),
  question_references: z.array(nonEmpty),
  source_documents: z.array(nonEmpty),
  version: nonEmpty,
  review_status: z.enum(LIBRARY_REVIEW_STATUSES),
});

const clinicalCaseSchema = z.object({
  clinical_case_id: nonEmpty,
  title: nonEmpty,
  knowledge_references: z.array(nonEmpty),
  source_documents: z.array(nonEmpty),
  source_pages: z.array(nonEmpty),
  version: nonEmpty,
  review_status: z.enum(LIBRARY_REVIEW_STATUSES),
});

const glossarySchema = z.object({
  term_id: nonEmpty,
  term: nonEmpty,
  definition: nonEmpty,
  knowledge_reference: nonEmpty,
  source_document: nonEmpty,
  source_page: nonEmpty,
  version: nonEmpty,
});

const versionSchema = z.object({
  version: nonEmpty,
  created_at: nonEmpty,
  status: z.enum(["draft", "published", "archived"]),
  document_count: z.number().int().nonnegative(),
  knowledge_count: z.number().int().nonnegative(),
  question_count: z.number().int().nonnegative(),
  boss_count: z.number().int().nonnegative(),
  change_log: z.array(nonEmpty),
});

export const knowledgeLibrarySnapshotSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  libraryVersion: nonEmpty,
  documents: z.array(officialDocumentSchema),
  internalDocuments: z.array(internalDocumentSchema),
  knowledge: z.array(knowledgeSchema),
  questions: z.array(questionSchema),
  bosses: z.array(bossSchema),
  clinicalCases: z.array(clinicalCaseSchema),
  glossary: z.array(glossarySchema),
  versions: z.array(versionSchema),
});

export function parseKnowledgeLibrarySnapshot(input: unknown): KnowledgeLibrarySnapshot {
  return knowledgeLibrarySnapshotSchema.parse(input);
}
