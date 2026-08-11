import type {
  KnowledgeLibrarySnapshot,
  LibrarySearchResult,
  QuestionGenerationCandidate,
} from "./library-domain.ts";
import {
  buildLibrarySearchIndex,
  searchKnowledgeLibrary,
  validateQuestionGeneration,
} from "./library-engine.ts";

const RETRIEVAL_ORDER = [
  "master_knowledge_base",
  "official_sources",
  "knowledge",
  "questions",
  "clinical_cases",
] as const;

export function createPulseLibraryApi(snapshot: KnowledgeLibrarySnapshot) {
  const index = buildLibrarySearchIndex(snapshot);

  return {
    retrievalOrder: RETRIEVAL_ORDER,
    search(query: string, limit = 20): LibrarySearchResult[] {
      return searchKnowledgeLibrary(index, query, limit);
    },
    buildGroundedContext(query: string, limit = 12) {
      const results = searchKnowledgeLibrary(index, query, limit);
      return RETRIEVAL_ORDER.map((type) => ({
        type,
        results: results.filter((entry) => entry.type === type),
      })).filter((group) => group.results.length > 0);
    },
    authorizeQuestion(candidate: QuestionGenerationCandidate) {
      return validateQuestionGeneration(snapshot, candidate);
    },
    hasKnowledge(knowledgeId: string) {
      return snapshot.knowledge.some((entry) => entry.knowledge_id === knowledgeId);
    },
  };
}
