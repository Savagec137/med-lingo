import type {
  DocumentAvailabilityProbe,
  KnowledgeLibrarySnapshot,
  LibraryAuditIssue,
  LibraryAuditReport,
  LibrarySearchEntry,
  LibrarySearchIndex,
  LibrarySearchResult,
  LibraryVersionImpactReport,
  OfficialDocumentIdentity,
  QuestionGenerationCandidate,
  QuestionGenerationDecision,
  TraceabilityNode,
  TraceabilityResult,
} from "./library-domain.ts";

const PRIORITY = {
  master_knowledge_base: 1,
  official_sources: 2,
  knowledge: 3,
  questions: 4,
  clinical_cases: 5,
} as const;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function tokens(value: string) {
  return [
    ...new Set(
      normalize(value)
        .split(/\s+/)
        .filter((token) => token.length > 1),
    ),
  ];
}

function excerpt(text: string, query: string) {
  const normalizedQuery = normalize(query);
  const normalizedText = normalize(text);
  const position = normalizedText.indexOf(normalizedQuery);
  const start = Math.max(0, position < 0 ? 0 : position - 70);
  const slice = text.slice(start, start + 220).trim();
  return start > 0 ? `…${slice}` : slice;
}

export function buildLibrarySearchIndex(snapshot: KnowledgeLibrarySnapshot): LibrarySearchIndex {
  const entries: LibrarySearchEntry[] = [];

  for (const knowledge of snapshot.knowledge) {
    entries.push({
      id: knowledge.knowledge_id,
      type: "master_knowledge_base",
      title: knowledge.title,
      text: [
        knowledge.definition,
        knowledge.summary,
        ...knowledge.important_points,
        ...knowledge.clinical_examples,
        ...knowledge.common_errors,
        ...knowledge.memory_tips,
      ].join(" "),
      keywords: [...knowledge.tags, ...knowledge.related_topics],
      sourceDocumentId: knowledge.source_document,
      priority: PRIORITY.master_knowledge_base,
    });
  }

  for (const document of snapshot.documents) {
    entries.push({
      id: document.document_id,
      type: "official_sources",
      title: document.title,
      text: `${document.organization} ${document.category} ${document.version}`,
      keywords: [document.organization, document.category, document.language],
      sourceDocumentId: document.document_id,
      priority: PRIORITY.official_sources,
    });
  }

  for (const term of snapshot.glossary) {
    entries.push({
      id: term.term_id,
      type: "knowledge",
      title: term.term,
      text: term.definition,
      keywords: [term.term],
      sourceDocumentId: term.source_document,
      priority: PRIORITY.knowledge,
    });
  }

  for (const question of snapshot.questions) {
    entries.push({
      id: question.question_id,
      type: "questions",
      title: question.question_id,
      text: `${question.knowledge_reference} ${question.source_page}`,
      keywords: [question.knowledge_reference],
      sourceDocumentId: question.source_document,
      priority: PRIORITY.questions,
    });
  }

  for (const clinicalCase of snapshot.clinicalCases) {
    entries.push({
      id: clinicalCase.clinical_case_id,
      type: "clinical_cases",
      title: clinicalCase.title,
      text: clinicalCase.knowledge_references.join(" "),
      keywords: clinicalCase.knowledge_references,
      sourceDocumentId: clinicalCase.source_documents[0],
      priority: PRIORITY.clinical_cases,
    });
  }

  const postings = new Map<string, Set<number>>();
  entries.forEach((entry, index) => {
    const searchable = `${entry.title} ${entry.text} ${entry.keywords.join(" ")}`;
    for (const token of tokens(searchable)) {
      const positions = postings.get(token) ?? new Set<number>();
      positions.add(index);
      postings.set(token, positions);
    }
  });

  return { entries, postings };
}

export function searchKnowledgeLibrary(
  index: LibrarySearchIndex,
  query: string,
  limit = 20,
): LibrarySearchResult[] {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return [];

  const candidates = new Set<number>();
  for (const token of queryTokens) {
    for (const [indexedToken, positions] of index.postings) {
      if (indexedToken === token || indexedToken.startsWith(token)) {
        positions.forEach((position) => candidates.add(position));
      }
    }
  }

  return [...candidates]
    .map((position) => {
      const entry = index.entries[position];
      const haystack = normalize(`${entry.title} ${entry.text} ${entry.keywords.join(" ")}`);
      const matches = queryTokens.filter((token) => haystack.includes(token)).length;
      const exactTitleBonus = normalize(entry.title).includes(normalize(query)) ? 5 : 0;
      return {
        id: entry.id,
        type: entry.type,
        title: entry.title,
        excerpt: excerpt(entry.text, query),
        score: matches * 10 + exactTitleBonus + (6 - entry.priority),
        sourceDocumentId: entry.sourceDocumentId,
      };
    })
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "fr"))
    .slice(0, Math.max(1, limit));
}

export function traceQuestionOrigin(
  snapshot: KnowledgeLibrarySnapshot,
  questionId: string,
): TraceabilityResult {
  const question = snapshot.questions.find((entry) => entry.question_id === questionId);
  if (!question) {
    return { complete: false, nodes: [], missing: [`Question inconnue : ${questionId}`] };
  }

  const knowledge = snapshot.knowledge.find(
    (entry) => entry.knowledge_id === question.knowledge_reference,
  );
  const document = snapshot.documents.find(
    (entry) => entry.document_id === question.source_document,
  );
  const nodes: TraceabilityNode[] = [];
  const missing: string[] = [];

  if (document) {
    nodes.push({ type: "document", id: document.document_id, label: document.title });
  } else {
    missing.push(`Document absent : ${question.source_document}`);
  }

  if (knowledge) {
    if (knowledge.source_chapter) {
      nodes.push({
        type: "chapter",
        id: `${knowledge.knowledge_id}:chapter`,
        label: knowledge.source_chapter,
      });
    } else {
      missing.push(`Chapitre absent pour ${knowledge.knowledge_id}`);
    }
    nodes.push({
      type: "section",
      id: `${knowledge.knowledge_id}:section`,
      label: knowledge.source_section,
    });
    if (knowledge.source_paragraph) {
      nodes.push({
        type: "paragraph",
        id: `${knowledge.knowledge_id}:paragraph`,
        label: knowledge.source_paragraph,
      });
    } else {
      missing.push(`Paragraphe absent pour ${knowledge.knowledge_id}`);
    }
    nodes.push({ type: "knowledge", id: knowledge.knowledge_id, label: knowledge.title });
  } else {
    missing.push(`Connaissance absente : ${question.knowledge_reference}`);
  }

  nodes.push({ type: "question", id: question.question_id, label: question.question_id });
  if (question.answer_id) {
    nodes.push({ type: "answer", id: question.answer_id, label: question.answer_id });
  } else {
    missing.push(`Réponse non reliée pour ${question.question_id}`);
  }
  if (question.explanation_reference) {
    nodes.push({
      type: "explanation",
      id: question.explanation_reference,
      label: question.explanation_reference,
    });
  } else {
    missing.push(`Explication non reliée pour ${question.question_id}`);
  }

  return { complete: missing.length === 0, nodes, missing };
}

function addIssue(
  issues: LibraryAuditIssue[],
  severity: LibraryAuditIssue["severity"],
  code: string,
  message: string,
  entityType?: LibraryAuditIssue["entityType"],
  entityId?: string,
) {
  issues.push({
    id: `library-${String(issues.length + 1).padStart(5, "0")}`,
    severity,
    code,
    message,
    entityType,
    entityId,
  });
}

function duplicateIds(entries: Array<{ id: string; type: LibraryAuditIssue["entityType"] }>) {
  const counts = new Map<string, number>();
  entries.forEach(({ id }) => counts.set(id, (counts.get(id) ?? 0) + 1));
  return entries.filter(({ id }) => (counts.get(id) ?? 0) > 1);
}

export function auditKnowledgeLibrary(
  snapshot: KnowledgeLibrarySnapshot,
  generatedAt = new Date().toISOString(),
): LibraryAuditReport {
  const issues: LibraryAuditIssue[] = [];
  const documentIds = new Set(snapshot.documents.map((entry) => entry.document_id));
  const knowledgeIds = new Set(snapshot.knowledge.map((entry) => entry.knowledge_id));
  const questionIds = new Set(snapshot.questions.map((entry) => entry.question_id));

  const duplicateEntities = duplicateIds([
    ...snapshot.documents.map((entry) => ({ id: entry.document_id, type: "document" as const })),
    ...snapshot.knowledge.map((entry) => ({ id: entry.knowledge_id, type: "knowledge" as const })),
    ...snapshot.questions.map((entry) => ({ id: entry.question_id, type: "question" as const })),
    ...snapshot.bosses.map((entry) => ({ id: entry.boss_id, type: "boss" as const })),
  ]);
  for (const duplicate of duplicateEntities) {
    addIssue(
      issues,
      "CRITICAL",
      "DUPLICATE_ID",
      `Identifiant dupliqué : ${duplicate.id}`,
      duplicate.type,
      duplicate.id,
    );
  }

  const documentHashes = new Map<string, string>();
  for (const document of snapshot.documents) {
    const existing = documentHashes.get(document.hash);
    if (existing) {
      addIssue(
        issues,
        "ERROR",
        "DUPLICATE_DOCUMENT_HASH",
        `Les documents ${existing} et ${document.document_id} possèdent le même hash.`,
        "document",
        document.document_id,
      );
    } else {
      documentHashes.set(document.hash, document.document_id);
    }
    if (document.availability_status === "unavailable") {
      addIssue(
        issues,
        "ERROR",
        "DOCUMENT_UNAVAILABLE",
        `La source ${document.document_id} est indisponible.`,
        "document",
        document.document_id,
      );
    } else if (!document.availability_status || document.availability_status === "unchecked") {
      addIssue(
        issues,
        "WARNING",
        "DOCUMENT_AVAILABILITY_UNCHECKED",
        `La disponibilité de ${document.document_id} n'a pas été vérifiée.`,
        "document",
        document.document_id,
      );
    }
  }

  const normalizedKnowledge = new Map<string, string>();
  for (const knowledge of snapshot.knowledge) {
    const signature = normalize(`${knowledge.title} ${knowledge.definition}`);
    const duplicate = normalizedKnowledge.get(signature);
    if (duplicate) {
      addIssue(
        issues,
        "ERROR",
        "DUPLICATE_KNOWLEDGE",
        `Les connaissances ${duplicate} et ${knowledge.knowledge_id} sont identiques.`,
        "knowledge",
        knowledge.knowledge_id,
      );
    } else {
      normalizedKnowledge.set(signature, knowledge.knowledge_id);
    }
    if (!documentIds.has(knowledge.source_document)) {
      addIssue(
        issues,
        "CRITICAL",
        "KNOWLEDGE_SOURCE_MISSING",
        `La connaissance ${knowledge.knowledge_id} référence un document absent.`,
        "knowledge",
        knowledge.knowledge_id,
      );
    }
    for (const relatedTopic of knowledge.related_topics) {
      if (!knowledgeIds.has(relatedTopic)) {
        addIssue(
          issues,
          "WARNING",
          "RELATED_KNOWLEDGE_MISSING",
          `La connaissance liée ${relatedTopic} n'existe pas.`,
          "knowledge",
          knowledge.knowledge_id,
        );
      }
    }
  }

  for (const question of snapshot.questions) {
    if (!knowledgeIds.has(question.knowledge_reference)) {
      addIssue(
        issues,
        "CRITICAL",
        "QUESTION_KNOWLEDGE_MISSING",
        `La question ${question.question_id} référence une connaissance absente.`,
        "question",
        question.question_id,
      );
    }
    const document = snapshot.documents.find(
      (entry) => entry.document_id === question.source_document,
    );
    if (!document) {
      addIssue(
        issues,
        "CRITICAL",
        "QUESTION_SOURCE_MISSING",
        `La question ${question.question_id} référence un document absent.`,
        "question",
        question.question_id,
      );
    } else if (document.version !== question.source_version) {
      addIssue(
        issues,
        "ERROR",
        "QUESTION_SOURCE_VERSION_MISMATCH",
        `La question ${question.question_id} utilise ${question.source_version}, document en ${document.version}.`,
        "question",
        question.question_id,
      );
    }
    const trace = traceQuestionOrigin(snapshot, question.question_id);
    if (!trace.complete) {
      addIssue(
        issues,
        "WARNING",
        "INCOMPLETE_TRACEABILITY",
        trace.missing.join(" "),
        "question",
        question.question_id,
      );
    }
  }

  for (const boss of snapshot.bosses) {
    for (const knowledgeReference of boss.knowledge_references) {
      if (!knowledgeIds.has(knowledgeReference)) {
        addIssue(
          issues,
          "CRITICAL",
          "BOSS_KNOWLEDGE_MISSING",
          `Le Boss ${boss.boss_id} référence ${knowledgeReference}, absent de la base.`,
          "boss",
          boss.boss_id,
        );
      }
    }
    for (const questionReference of boss.question_references) {
      if (!questionIds.has(questionReference)) {
        addIssue(
          issues,
          "ERROR",
          "BOSS_QUESTION_MISSING",
          `Le Boss ${boss.boss_id} référence la question absente ${questionReference}.`,
          "boss",
          boss.boss_id,
        );
      }
    }
  }

  const currentVersion = snapshot.versions.find(
    (entry) => entry.version === snapshot.libraryVersion,
  );
  if (!currentVersion) {
    addIssue(
      issues,
      "ERROR",
      "LIBRARY_VERSION_MISSING",
      `La version courante ${snapshot.libraryVersion} n'existe pas dans l'historique.`,
      "version",
      snapshot.libraryVersion,
    );
  } else {
    const declaredCounts = {
      document_count: snapshot.documents.length,
      knowledge_count: snapshot.knowledge.length,
      question_count: snapshot.questions.length,
      boss_count: snapshot.bosses.length,
    };
    for (const [field, actual] of Object.entries(declaredCounts)) {
      if (currentVersion[field as keyof typeof declaredCounts] !== actual) {
        addIssue(
          issues,
          "ERROR",
          "LIBRARY_VERSION_COUNT_MISMATCH",
          `La version ${currentVersion.version} déclare ${field}=${currentVersion[field as keyof typeof declaredCounts]}, valeur réelle=${actual}.`,
          "version",
          currentVersion.version,
        );
      }
    }
  }

  if (snapshot.documents.length === 0) {
    addIssue(
      issues,
      "WARNING",
      "OFFICIAL_LIBRARY_EMPTY",
      "Aucun document officiel n'est encore enregistré. Aucun contenu ne peut être publié.",
    );
  }

  const knowledgeWithoutSource = snapshot.knowledge.filter(
    (entry) => !documentIds.has(entry.source_document),
  ).length;
  const questionsWithoutReference = snapshot.questions.filter(
    (entry) => !knowledgeIds.has(entry.knowledge_reference),
  ).length;
  const obsoleteDocuments = snapshot.documents.filter(
    (entry) => entry.availability_status === "unavailable",
  ).length;
  const issuesBySeverity = {
    INFO: issues.filter((entry) => entry.severity === "INFO").length,
    WARNING: issues.filter((entry) => entry.severity === "WARNING").length,
    ERROR: issues.filter((entry) => entry.severity === "ERROR").length,
    CRITICAL: issues.filter((entry) => entry.severity === "CRITICAL").length,
  };
  const hasMinimumCorpus = snapshot.documents.length > 0 && snapshot.knowledge.length > 0;
  const penalty =
    issuesBySeverity.CRITICAL * 20 +
    issuesBySeverity.ERROR * 8 +
    issuesBySeverity.WARNING * 2 +
    issuesBySeverity.INFO * 0.25;

  return {
    schemaVersion: 1,
    generatedAt,
    libraryVersion: snapshot.libraryVersion,
    counts: {
      officialDocuments: snapshot.documents.length,
      internalDocuments: snapshot.internalDocuments.length,
      knowledge: snapshot.knowledge.length,
      questions: snapshot.questions.length,
      bosses: snapshot.bosses.length,
      clinicalCases: snapshot.clinicalCases.length,
      glossaryTerms: snapshot.glossary.length,
      obsoleteDocuments,
      knowledgeWithoutSource,
      questionsWithoutReference,
    },
    issuesBySeverity,
    issues,
    qualityScore: hasMinimumCorpus ? Math.max(0, Math.round((100 - penalty) * 10) / 10) : 0,
  };
}

export function validateQuestionGeneration(
  snapshot: KnowledgeLibrarySnapshot,
  candidate: QuestionGenerationCandidate,
): QuestionGenerationDecision {
  const errors: string[] = [];
  const knowledge = snapshot.knowledge.find(
    (entry) => entry.knowledge_id === candidate.knowledge_reference,
  );
  const document = snapshot.documents.find(
    (entry) => entry.document_id === candidate.source_document,
  );

  if (!knowledge) errors.push("La connaissance n'existe pas dans la Master Knowledge Base.");
  if (!document) errors.push("Le document source officiel n'existe pas.");
  if (knowledge && knowledge.source_document !== candidate.source_document) {
    errors.push("La source de la question ne correspond pas à celle de la connaissance.");
  }
  if (knowledge && ["draft", "deprecated"].includes(knowledge.review_status)) {
    errors.push("La connaissance n'est pas dans un statut publiable.");
  }
  if (document && document.version !== candidate.source_version) {
    errors.push("La version source de la question ne correspond pas au document.");
  }
  if (document?.availability_status === "unavailable") {
    errors.push("Le document officiel est indisponible.");
  }
  if (!candidate.source_page.trim()) errors.push("La page source est obligatoire.");

  return { allowed: errors.length === 0, errors };
}

export async function verifyOfficialDocumentAvailability(
  documents: OfficialDocumentIdentity[],
  probe: DocumentAvailabilityProbe,
) {
  return Promise.all(
    documents.map(async (document) => {
      const result = await probe(document.source_url);
      return {
        documentId: document.document_id,
        sourceUrl: document.source_url,
        available: result.available,
        status: result.status,
      };
    }),
  );
}

export function compareLibraryVersions(
  before: KnowledgeLibrarySnapshot,
  after: KnowledgeLibrarySnapshot,
): LibraryVersionImpactReport {
  const beforeDocuments = new Map(before.documents.map((entry) => [entry.document_id, entry]));
  const afterDocuments = new Map(after.documents.map((entry) => [entry.document_id, entry]));
  const changedDocuments = after.documents
    .filter((entry) => {
      const previous = beforeDocuments.get(entry.document_id);
      return previous && (previous.hash !== entry.hash || previous.version !== entry.version);
    })
    .map((entry) => entry.document_id);
  const addedDocuments = after.documents
    .filter((entry) => !beforeDocuments.has(entry.document_id))
    .map((entry) => entry.document_id);
  const removedDocuments = before.documents
    .filter((entry) => !afterDocuments.has(entry.document_id))
    .map((entry) => entry.document_id);
  const impactedDocumentIds = new Set([
    ...changedDocuments,
    ...addedDocuments,
    ...removedDocuments,
  ]);
  const impactedKnowledge = after.knowledge
    .filter((entry) => impactedDocumentIds.has(entry.source_document))
    .map((entry) => entry.knowledge_id);
  const impactedKnowledgeIds = new Set(impactedKnowledge);
  const impactedQuestions = after.questions
    .filter(
      (entry) =>
        impactedDocumentIds.has(entry.source_document) ||
        impactedKnowledgeIds.has(entry.knowledge_reference),
    )
    .map((entry) => entry.question_id);
  const impactedQuestionIds = new Set(impactedQuestions);
  const impactedBosses = after.bosses
    .filter(
      (entry) =>
        entry.source_documents.some((id) => impactedDocumentIds.has(id)) ||
        entry.knowledge_references.some((id) => impactedKnowledgeIds.has(id)) ||
        entry.question_references.some((id) => impactedQuestionIds.has(id)),
    )
    .map((entry) => entry.boss_id);

  return {
    fromVersion: before.libraryVersion,
    toVersion: after.libraryVersion,
    changedDocuments,
    addedDocuments,
    removedDocuments,
    impactedKnowledge,
    impactedQuestions,
    impactedBosses,
  };
}
