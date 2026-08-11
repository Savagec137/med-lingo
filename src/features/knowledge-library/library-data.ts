import officialDocuments from "../../../docs/official_sources/document_catalog.json" with { type: "json" };
import internalDocuments from "../../../docs/internal_sources/internal_source_catalog.json" with { type: "json" };
import knowledge from "../../../docs/master_knowledge_base/knowledge.json" with { type: "json" };
import questions from "../../../docs/questions/references.json" with { type: "json" };
import bosses from "../../../docs/boss/references.json" with { type: "json" };
import clinicalCases from "../../../docs/clinical_cases/references.json" with { type: "json" };
import glossary from "../../../docs/glossary/glossary.json" with { type: "json" };
import versions from "../../../docs/versioning/library_versions.json" with { type: "json" };
import { parseKnowledgeLibrarySnapshot } from "./library-schema.ts";

export function loadKnowledgeLibrarySnapshot() {
  return parseKnowledgeLibrarySnapshot({
    schemaVersion: "1.0.0",
    libraryVersion: officialDocuments.library_version,
    documents: officialDocuments.documents,
    internalDocuments: internalDocuments.documents,
    knowledge: knowledge.knowledge,
    questions: questions.questions,
    bosses: bosses.bosses,
    clinicalCases: clinicalCases.clinical_cases,
    glossary: glossary.terms,
    versions: versions.versions,
  });
}
