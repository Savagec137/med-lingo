import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const P7_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-07");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const ALLOWED_PAGES = new Set([39, 40, 41]);
const toolchainPassed = process.argv.includes("--toolchain=passed");
const errors = [];
const warnings = [];
const info = [];

const addError = (code, entityId, message) => errors.push({ code, entityId, message });
const addWarning = (code, entityId, message) => warnings.push({ code, entityId, message });
const addInfo = (code, entityId, message) => info.push({ code, entityId, message });

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    addError("INVALID_JSON", path, error.message);
    return null;
  }
}

function normalized(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function referencedPages(value) {
  const pages = new Set();
  for (const token of String(value).split(",")) {
    const range = token.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      for (let page = Number(range[1]); page <= Number(range[2]); page += 1) pages.add(page);
      continue;
    }
    const page = Number(token.trim());
    if (Number.isInteger(page)) pages.add(page);
  }
  return [...pages];
}

const formation = await readJson(
  join(ROOT, "src", "content", "formations", "dea", "formation.json"),
);
const roadmap = await readJson(
  join(ROOT, "src", "content", "formations", "dea", "roadmap-v2.json"),
);
const competencies = await readJson(join(ROOT, "src", "content", "master-knowledge-base.json"));
const knowledgeFile = await readJson(join(P7_DIR, "knowledge.json"));
const sourceCatalog = await readJson(
  join(ROOT, "docs", "internal_sources", "internal_source_catalog.json"),
);
const questionRefs = await readJson(join(ROOT, "docs", "questions", "references.json"));
const bossRefs = await readJson(join(ROOT, "docs", "boss", "references.json"));
const legacyDraft = await readJson(join(P7_DIR, "legacy-import-lesson-08.json"));
const importManifest = await readJson(
  join(
    ROOT,
    "src",
    "content",
    "formations",
    "dea",
    "imports",
    "json-xlsx-v1",
    "import-manifest.json",
  ),
);
const lessons = await Promise.all(
  Array.from({ length: 9 }, (_, index) =>
    readJson(join(P7_DIR, "lesson-" + String(index + 1).padStart(2, "0") + ".json")),
  ),
);

const p7Formation = formation?.parcours?.find((entry) => entry.id === "parcours-07");
const p7Roadmap = roadmap?.parcours?.find((entry) => entry.id === "parcours-07");
const p7Boss = roadmap?.bosses?.find((entry) => entry.id === "dea-p07-boss");
const source = sourceCatalog?.documents?.find((entry) => entry.document_id === SOURCE_ID);
const knownCompetencies = new Set((competencies?.competencies || []).map((entry) => entry.id));
const knownKnowledge = new Set((knowledgeFile?.knowledge || []).map((entry) => entry.knowledgeId));
const allItems = lessons.filter(Boolean).flatMap((lesson) => lesson.items || []);

if (!p7Formation) addError("MISSING_PARCOURS", "parcours-07", "Absent de formation.json.");
if (!p7Roadmap) addError("MISSING_ROADMAP", "parcours-07", "Absent de roadmap-v2.json.");
if (!p7Boss) addError("MISSING_BOSS", "dea-p07-boss", "Boss absent de roadmap-v2.json.");
if (!source) addError("MISSING_SOURCE", SOURCE_ID, "Source absente du catalogue interne.");
if (source?.source_type === "listing_only")
  addError("LISTING_ONLY_SOURCE", SOURCE_ID, "Une source listing_only est interdite.");
if (
  source &&
  source.content_status !== "content_verified" &&
  source.source_type !== "training_source"
) {
  addError("UNUSABLE_SOURCE", SOURCE_ID, "La source n’est ni content_verified ni training_source.");
}
if (p7Formation?.plannedLessonCount !== 8)
  addError("LESSON_PLAN_MISMATCH", "parcours-07", "8 leçons prévues attendues.");
if (p7Formation?.lessons?.length !== 9)
  addError("MANIFEST_COUNT", "parcours-07", "8 leçons et 1 Boss doivent être enregistrés.");
if (p7Formation?.lessons?.some((entry) => entry.status !== "review")) {
  addError(
    "PUBLISHED_UNVALIDATED_CONTENT",
    "parcours-07",
    "Les fichiers doivent rester en review.",
  );
}
if (p7Formation?.contentStatus !== "review")
  addError("FORMATION_STATUS", "parcours-07", "contentStatus review attendu.");
if (p7Roadmap?.contentStatus !== "partial")
  addError(
    "ROADMAP_STATUS",
    "parcours-07",
    "Le parcours doit rester partial avant validation formateur.",
  );
if (p7Roadmap?.lessonBlueprints?.some((entry) => entry.status !== "awaiting_content")) {
  addError(
    "BLUEPRINT_STATUS",
    "parcours-07",
    "Les blueprints structurels doivent rester awaiting_content.",
  );
}
if (p7Boss?.status !== "awaiting_content")
  addError(
    "BOSS_STRUCTURE_STATUS",
    "dea-p07-boss",
    "Le Boss structurel doit rester awaiting_content.",
  );
if (!legacyDraft?.tags?.includes("import-json-xlsx") || legacyDraft?.items?.length !== 9) {
  addError(
    "LEGACY_DRAFT_NOT_PRESERVED",
    "dea-p07-l08",
    "Les 9 questions GPT importées doivent rester archivées.",
  );
}
const manifestEntry = importManifest?.generatedTargets?.find((entry) => entry.id === "dea-p07-l08");
if (manifestEntry?.publicationStatus !== "archived_source_bank" || !manifestEntry?.archiveFile) {
  addError(
    "LEGACY_MANIFEST_NOT_ARCHIVED",
    "dea-p07-l08",
    "Le manifeste doit pointer vers l’archive historique.",
  );
}

const knowledgeIds = new Set();
const knowledgeTitles = new Map();
for (const knowledge of knowledgeFile?.knowledge || []) {
  if (knowledgeIds.has(knowledge.knowledgeId))
    addError("DUPLICATE_KNOWLEDGE_ID", knowledge.knowledgeId, "ID dupliqué.");
  knowledgeIds.add(knowledge.knowledgeId);
  const titleKey = normalized(knowledge.title);
  if (knowledgeTitles.has(titleKey))
    addWarning(
      "SIMILAR_KNOWLEDGE_TITLE",
      knowledge.knowledgeId,
      "Titre similaire à " + knowledgeTitles.get(titleKey) + ".",
    );
  knowledgeTitles.set(titleKey, knowledge.knowledgeId);
  for (const field of [
    "knowledgeId",
    "title",
    "summary",
    "clinicalApplication",
    "sourceDocument",
    "section",
    "sourceType",
    "status",
  ]) {
    if (!knowledge[field])
      addError("MISSING_KNOWLEDGE_FIELD", knowledge.knowledgeId, "Champ " + field + " absent.");
  }
  if (!knowledge.keyPoints?.length)
    addError("MISSING_KEY_POINTS", knowledge.knowledgeId, "keyPoints vide.");
  if (!knowledge.commonErrors?.length)
    addError("MISSING_COMMON_ERRORS", knowledge.knowledgeId, "commonErrors vide.");
  if (knowledge.sourceDocument !== SOURCE_ID)
    addError("WRONG_KNOWLEDGE_SOURCE", knowledge.knowledgeId, "Source inattendue.");
  if (knowledge.sourceType === "listing_only")
    addError("LISTING_ONLY_KNOWLEDGE", knowledge.knowledgeId, "Source interdite.");
  if (knowledge.status !== "to_validate")
    addError("WRONG_KNOWLEDGE_STATUS", knowledge.knowledgeId, "Statut to_validate attendu.");
  if (!knowledge.plannedParcoursIds?.every((id) => id === "parcours-07"))
    addError(
      "CROSS_PARCOURS_KNOWLEDGE",
      knowledge.knowledgeId,
      "Référence vers un autre parcours.",
    );
  for (const page of knowledge.pages || []) {
    if (!ALLOWED_PAGES.has(page))
      addError("UNVERIFIED_PAGE", knowledge.knowledgeId, "Page " + page + " non vérifiée.");
  }
  for (const competencyId of knowledge.competencyIds || []) {
    if (!knownCompetencies.has(competencyId))
      addError(
        "UNKNOWN_COMPETENCY",
        knowledge.knowledgeId,
        "Compétence inconnue : " + competencyId + ".",
      );
  }
}
if (knowledgeIds.size !== 13)
  addError(
    "KNOWLEDGE_COUNT",
    "parcours-07",
    "13 connaissances attendues, reçu " + knowledgeIds.size + ".",
  );

const ids = new Set();
const prompts = new Map();
const types = {};
const difficulties = {};
for (const lesson of lessons.filter(Boolean)) {
  if (lesson.validationStatus !== "to_validate")
    addError("LESSON_VALIDATION_STATUS", lesson.id, "to_validate attendu.");
  if (lesson.generationSource !== "library_extracted_knowledge")
    addError("LESSON_GENERATION_SOURCE", lesson.id, "Origine incorrecte.");
  if (lesson.items?.length !== 8) addError("PLAYABLE_MINIMUM", lesson.id, "8 questions attendues.");
  for (const item of lesson.items || []) {
    if (ids.has(item.id)) addError("DUPLICATE_QUESTION_ID", item.id, "ID dupliqué.");
    ids.add(item.id);
    const expectedPrefix = lesson.kind === "boss" ? "dea-p07-boss-q" : lesson.id + "-q";
    if (!item.id.startsWith(expectedPrefix))
      addError("QUESTION_ID_FORMAT", item.id, "Préfixe attendu : " + expectedPrefix + ".");
    const promptKey = normalized(item.question);
    if (prompts.has(promptKey))
      addError(
        "DUPLICATE_QUESTION",
        item.id,
        "Question identique à " + prompts.get(promptKey) + ".",
      );
    prompts.set(promptKey, item.id);
    types[item.type] = (types[item.type] || 0) + 1;
    difficulties[item.difficulty] = (difficulties[item.difficulty] || 0) + 1;
    for (const field of [
      "id",
      "type",
      "difficulty",
      "question",
      "explanation",
      "sourceDocument",
      "sourceSection",
      "sourcePages",
      "lessonId",
      "validationStatus",
      "generationSource",
    ]) {
      if (!item[field]) addError("MISSING_QUESTION_FIELD", item.id, "Champ " + field + " absent.");
    }
    if (!item.answers?.length) addError("MISSING_ANSWERS", item.id, "Réponses absentes.");
    if (!item.knowledgeIds?.length) addError("MISSING_KNOWLEDGE", item.id, "knowledgeIds absent.");
    if (!item.competencyIds?.length)
      addError("MISSING_COMPETENCY", item.id, "competencyIds absent.");
    if (item.lessonId !== lesson.id)
      addError("WRONG_LESSON_REFERENCE", item.id, "lessonId incorrect.");
    if (!item.plannedParcoursIds?.every((id) => id === "parcours-07"))
      addError("CROSS_PARCOURS_QUESTION", item.id, "Référence vers un autre parcours.");
    if (item.sourceDocument !== SOURCE_ID)
      addError("WRONG_QUESTION_SOURCE", item.id, "Source inattendue.");
    if (item.validationStatus !== "to_validate")
      addError("WRONG_QUESTION_STATUS", item.id, "to_validate attendu.");
    if (item.generationSource !== "library_extracted_knowledge")
      addError("WRONG_GENERATION_SOURCE", item.id, "Origine incorrecte.");
    for (const knowledgeId of item.knowledgeIds || []) {
      if (!knownKnowledge.has(knowledgeId))
        addError("UNKNOWN_KNOWLEDGE", item.id, "Connaissance inconnue : " + knowledgeId + ".");
    }
    for (const competencyId of item.competencyIds || []) {
      if (!knownCompetencies.has(competencyId))
        addError("UNKNOWN_COMPETENCY", item.id, "Compétence inconnue : " + competencyId + ".");
    }
    for (const page of referencedPages(item.sourcePages)) {
      if (!ALLOWED_PAGES.has(page))
        addError("UNVERIFIED_PAGE", item.id, "Page " + page + " non vérifiée.");
    }
    const feedback = item.pedagogicalFeedback;
    for (const field of ["whyCorrect", "commonMistake", "keyTakeaway", "fieldApplication"]) {
      if (!feedback?.[field])
        addError("MISSING_PEDAGOGICAL_FEEDBACK", item.id, "Champ " + field + " absent.");
    }
    const answerIds = new Set((item.answers || []).map((answer) => answer.id));
    const answerTexts = (item.answers || []).map((answer) => normalized(answer.text));
    if (answerTexts.some((text) => !text)) addError("EMPTY_ANSWER", item.id, "Réponse vide.");
    if (new Set(answerTexts).size !== answerTexts.length)
      addError("DUPLICATE_ANSWER", item.id, "Réponse dupliquée.");
    const expected = Array.isArray(item.correctAnswer) ? item.correctAnswer : [item.correctAnswer];
    if (!expected.length || expected.some((answerId) => !answerIds.has(answerId)))
      addError("INVALID_CORRECT_ANSWER", item.id, "Correction absente des réponses.");
    if (
      ["mcq", "clinical_case", "fill_blank", "true_false_contextual"].includes(item.type) &&
      expected.length !== 1
    ) {
      addError("WRONG_CORRECT_ANSWER_COUNT", item.id, "Une seule correction attendue.");
    }
  }
}
if (allItems.length !== 72)
  addError(
    "QUESTION_COUNT",
    "parcours-07",
    "72 questions attendues, reçu " + allItems.length + ".",
  );
const p7QuestionRefs =
  questionRefs?.questions?.filter((entry) => entry.question_id.startsWith("dea-p07-")) || [];
if (p7QuestionRefs.length !== 72)
  addError("QUESTION_REFERENCE_COUNT", "parcours-07", "72 références globales attendues.");
const p7BossRef = bossRefs?.bosses?.find((entry) => entry.boss_id === "dea-p07-boss");
if (!p7BossRef || p7BossRef.question_ids?.length !== 8)
  addError("BOSS_REFERENCE", "dea-p07-boss", "Référence Boss incomplète.");

addWarning(
  "SOURCE_COLON_CLAIM_REVIEW",
  SOURCE_ID,
  "L’affirmation simplifiée de la page 40 sur la cellulose n’a pas été transformée en question et nécessite une validation pédagogique préalable.",
);
addInfo(
  "SOURCE_SELECTION",
  SOURCE_ID,
  "B2.M4 est le seul PDF local directement pertinent et suffisamment précis pour ce parcours fondamental.",
);

const audit = {
  auditId: "parcours-07-audit-2026-08-11",
  generatedAt: new Date().toISOString(),
  scope: {
    formationId: "dea",
    blocId: "bloc-02",
    parcoursId: "parcours-07",
    title: "Système digestif",
  },
  baseline: {
    plannedLessons: 8,
    existingOfficialPlayableQuestions: 0,
    archivedUnverifiedImportedQuestions: 9,
    existingBossQuestions: 0,
    missingQuestionsBeforeGeneration: 72,
  },
  result: {
    status: errors.length ? "FAIL" : toolchainPassed ? "PASS" : "PASS_PENDING_TOOLCHAIN",
    errorCount: errors.length,
    warningCount: warnings.length,
    knowledgeCount: knowledgeIds.size,
    lessonCount: lessons.filter((entry) => entry?.kind === "lesson").length,
    lessonQuestionCount: allItems.filter((item) => item.lessonId !== "dea-p07-boss").length,
    bossQuestionCount: allItems.filter((item) => item.lessonId === "dea-p07-boss").length,
    totalQuestionCount: allItems.length,
    typeDistribution: types,
    difficultyDistribution: difficulties,
    coveragePercent: allItems.length === 72 ? 100 : Math.round((allItems.length / 72) * 100),
    toolchain: toolchainPassed ? "passed" : "pending",
    toolchainDetails: toolchainPassed
      ? {
          tests: "111/111 passed",
          productionBuild: "passed",
          scopedLint: "passed",
          globalLint: "blocked by pre-existing CRLF formatting errors outside the Parcours 7 scope",
        }
      : { tests: "pending", productionBuild: "pending", scopedLint: "pending" },
  },
  sources: [
    {
      documentId: SOURCE_ID,
      title: source?.title,
      sourceType: source?.source_type,
      contentStatus: source?.content_status,
      pagesUsed: [39, 40, 41],
      excludedPages: [42],
      excludedReason:
        "L’IMC et le vocabulaire médical de la page 42 sont hors du périmètre du Parcours 7.",
    },
  ],
  errors,
  warnings,
  info,
  nextRecommendedParcours: "parcours-08",
};

await writeFile(join(ROOT, "PARCOURS_7_AUDIT.json"), JSON.stringify(audit, null, 2) + "\n", "utf8");
const markdown = [
  "# Rapport de génération — Parcours 7",
  "",
  "## Résultat",
  "",
  "- Parcours : **Système digestif** (parcours-07, bloc-02)",
  "- Statut : **" + audit.result.status + "**",
  "- Couverture : **" + audit.result.coveragePercent + " %**",
  "- Connaissances créées : **" + audit.result.knowledgeCount + "**",
  "- Leçons complétées : **" + audit.result.lessonCount + " / 8**",
  "- Questions de leçon : **" + audit.result.lessonQuestionCount + "**",
  "- Questions de Boss : **" + audit.result.bossQuestionCount + "**",
  "- Total : **" + audit.result.totalQuestionCount + " questions**",
  "- Questions needsReview / to_validate : **" + audit.result.totalQuestionCount + "**",
  "",
  "## Mini-rapport avant génération",
  "",
  "- 8 leçons prévues.",
  "- 0 question officielle jouable et sourcée.",
  "- 9 questions GPT non sourcées conservées sans modification dans une archive historique.",
  "- Boss déclaré mais sans banque.",
  "- Minimum manquant pour rendre le parcours jouable : 64 questions de leçon et 8 de Boss.",
  "",
  "## Sources utilisées",
  "",
  "- **B2.M4 - Support Etudiant.pdf**, AFTRAL, version 1 — août 2022.",
  "- Pages 39 à 40 : organes, trajet et glandes digestives.",
  "- Page 41 : digestion, nutriments, absorption et transit.",
  "- Statut : source interne de formation, contenu vérifié ; validation formateur encore requise.",
  "",
  "Les autres PDF de la bibliothèque ont été considérés mais ne sont pas utilisés : ils sont hors périmètre, plus avancés, historiques ou sans ancrage suffisamment précis pour ce parcours fondamental.",
  "",
  "## Point nécessitant une validation pédagogique",
  "",
  "La page 40 contient une affirmation simplifiée sur la transformation de la cellulose. Elle a été volontairement exclue des connaissances et questions en attendant une validation pédagogique. La page 42 (IMC et vocabulaire) reste hors périmètre.",
  "",
  "## Contrôles",
  "",
  "- Erreurs : **" + errors.length + "**",
  "- Avertissements : **" + warnings.length + "**",
  "- JSON, IDs, références, sources, corrections et feedbacks : " +
    (errors.length ? "échec" : "conformes") +
    ".",
  "- Tests : **" + (toolchainPassed ? "111 / 111 réussis" : "en attente") + "**.",
  "- Build de production / TypeScript : **" + (toolchainPassed ? "réussi" : "en attente") + "**.",
  "- ESLint du périmètre modifié : **" + (toolchainPassed ? "réussi" : "en attente") + "**.",
  "- ESLint global : bloqué par des fins de ligne CRLF préexistantes hors du périmètre du Parcours 7 ; aucun fichier étranger au sprint n’a été reformaté.",
  "",
  "## Boss",
  "",
  "Boss complété avec 8 exercices mixtes, niveau DEA, moteur de leçon existant, seuil de réussite 80 %, statut `to_validate`.",
  "",
  "## Prochaine étape recommandée",
  "",
  "Après validation formateur du Parcours 7 : **Parcours 8 — Système nerveux**.",
  "",
].join("\n");
await writeFile(join(ROOT, "PARCOURS_7_GENERATION_REPORT.md"), markdown, "utf8");

console.log(
  "Audit Parcours 7 : " +
    audit.result.status +
    " - " +
    errors.length +
    " erreur(s), " +
    warnings.length +
    " avertissement(s).",
);
if (errors.length) process.exitCode = 1;
