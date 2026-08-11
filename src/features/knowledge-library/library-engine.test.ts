import assert from "node:assert/strict";
import test from "node:test";
import type { KnowledgeLibrarySnapshot, OfficialDocumentIdentity } from "./library-domain.ts";
import {
  auditKnowledgeLibrary,
  buildLibrarySearchIndex,
  compareLibraryVersions,
  searchKnowledgeLibrary,
  traceQuestionOrigin,
  validateQuestionGeneration,
} from "./library-engine.ts";

const document: OfficialDocumentIdentity = {
  document_id: "DOC-DEA-001",
  title: "Référentiel contrôlé",
  organization: "Organisation test",
  category: "DEA",
  publication_date: "2026-01-01",
  revision_date: "2026-01-01",
  version: "1",
  language: "fr",
  status: "official",
  source_url: "https://example.org/document.pdf",
  license: "Accès contrôlé",
  checksum: "sha256:test",
  pages: 10,
  last_import: "2026-07-30T00:00:00.000Z",
  hash: "test",
  availability_status: "available",
};

function fixture(): KnowledgeLibrarySnapshot {
  return {
    schemaVersion: "1.0.0",
    libraryVersion: "v1",
    documents: [document],
    internalDocuments: [],
    knowledge: [
      {
        knowledge_id: "K00001",
        title: "Position anatomique",
        definition: "Définition vérifiable.",
        summary: "Résumé vérifiable.",
        important_points: ["Point vérifiable"],
        clinical_examples: [],
        common_errors: [],
        memory_tips: [],
        related_topics: [],
        difficulty: "easy",
        tags: ["anatomie"],
        source_document: document.document_id,
        source_chapter: "Chapitre 1",
        source_section: "Section 1",
        source_paragraph: "Paragraphe 1",
        source_page: "2",
        version: "1",
        review_status: "source_verified",
      },
    ],
    questions: [
      {
        question_id: "Q00001",
        knowledge_reference: "K00001",
        source_document: document.document_id,
        source_page: "2",
        source_version: "1",
        answer_id: "Q00001:A",
        explanation_reference: "Q00001:explanation",
        version: "1",
        review_status: "source_verified",
      },
    ],
    bosses: [
      {
        boss_id: "BOSS-001",
        knowledge_references: ["K00001"],
        question_references: ["Q00001"],
        source_documents: [document.document_id],
        version: "1",
        review_status: "source_verified",
      },
    ],
    clinicalCases: [],
    glossary: [],
    versions: [
      {
        version: "v1",
        created_at: "2026-07-30T00:00:00.000Z",
        status: "draft",
        document_count: 1,
        knowledge_count: 1,
        question_count: 1,
        boss_count: 1,
        change_log: ["Initialisation"],
      },
    ],
  };
}

test("la recherche respecte la priorité documentaire", () => {
  const snapshot = fixture();
  const results = searchKnowledgeLibrary(buildLibrarySearchIndex(snapshot), "anatomique");
  assert.equal(results[0]?.id, "K00001");
  assert.equal(results[0]?.type, "master_knowledge_base");
});

test("la traçabilité relie document, connaissance, question, réponse et explication", () => {
  const trace = traceQuestionOrigin(fixture(), "Q00001");
  assert.equal(trace.complete, true);
  assert.deepEqual(
    trace.nodes.map((node) => node.type),
    [
      "document",
      "chapter",
      "section",
      "paragraph",
      "knowledge",
      "question",
      "answer",
      "explanation",
    ],
  );
});

test("la génération est refusée si la connaissance ou la version source est absente", () => {
  const snapshot = fixture();
  assert.equal(
    validateQuestionGeneration(snapshot, {
      question_id: "Q00002",
      knowledge_reference: "K00001",
      source_document: "DOC-DEA-001",
      source_page: "2",
      source_version: "1",
    }).allowed,
    true,
  );
  const rejected = validateQuestionGeneration(snapshot, {
    question_id: "Q00003",
    knowledge_reference: "K-INCONNUE",
    source_document: "DOC-DEA-001",
    source_page: "2",
    source_version: "2",
  });
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.errors.length, 2);
});

test("la comparaison de versions liste les contenus impactés sans les modifier", () => {
  const before = fixture();
  const after = structuredClone(before);
  after.libraryVersion = "v2";
  after.documents[0].version = "2";
  after.documents[0].hash = "nouveau-hash";
  const beforeJson = JSON.stringify(before);
  const afterJson = JSON.stringify(after);
  const impact = compareLibraryVersions(before, after);
  assert.deepEqual(impact.changedDocuments, ["DOC-DEA-001"]);
  assert.deepEqual(impact.impactedKnowledge, ["K00001"]);
  assert.deepEqual(impact.impactedQuestions, ["Q00001"]);
  assert.deepEqual(impact.impactedBosses, ["BOSS-001"]);
  assert.equal(JSON.stringify(before), beforeJson);
  assert.equal(JSON.stringify(after), afterJson);
});

test("l'audit signale une bibliothèque vide sans inventer de contenu", () => {
  const empty = fixture();
  empty.documents = [];
  empty.knowledge = [];
  empty.questions = [];
  empty.bosses = [];
  const report = auditKnowledgeLibrary(empty, "2026-07-30T00:00:00.000Z");
  assert.equal(report.counts.officialDocuments, 0);
  assert.equal(report.qualityScore, 0);
  assert.ok(report.issues.some((issue) => issue.code === "OFFICIAL_LIBRARY_EMPTY"));
});
