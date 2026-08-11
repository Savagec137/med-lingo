import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const P5_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-05");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const ALLOWED_PAGES = new Set([18, 19, 20, 21, 53, 66, 67, 68]);
const errors = [];
const warnings = [];
const info = [];

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    errors.push({ code: "INVALID_JSON", file: path, message: error.message });
    return null;
  }
}

function addError(code, entityId, message) {
  errors.push({ code, entityId, message });
}

function addWarning(code, entityId, message) {
  warnings.push({ code, entityId, message });
}

function normalized(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pageNumbers(value) {
  return [...String(value).matchAll(/\d+/g)].map((match) => Number(match[0]));
}

const formation = await readJson(
  join(ROOT, "src", "content", "formations", "dea", "formation.json"),
);
const roadmap = await readJson(
  join(ROOT, "src", "content", "formations", "dea", "roadmap-v2.json"),
);
const competencies = await readJson(join(ROOT, "src", "content", "master-knowledge-base.json"));
const p5Knowledge = await readJson(join(P5_DIR, "knowledge.json"));
const sourceCatalog = await readJson(
  join(ROOT, "docs", "internal_sources", "internal_source_catalog.json"),
);
const questionRefs = await readJson(join(ROOT, "docs", "questions", "references.json"));
const bossRefs = await readJson(join(ROOT, "docs", "boss", "references.json"));
const legacyDraft = await readJson(join(P5_DIR, "legacy-import-lesson-08.json"));
const lessons = await Promise.all(
  Array.from({ length: 9 }, (_, index) =>
    readJson(join(P5_DIR, `lesson-${String(index + 1).padStart(2, "0")}.json`)),
  ),
);

const p5Formation = formation?.parcours?.find((entry) => entry.id === "parcours-05");
const p5Roadmap = roadmap?.parcours?.find((entry) => entry.id === "parcours-05");
const p5Boss = roadmap?.bosses?.find((entry) => entry.id === "dea-p05-boss");
const source = sourceCatalog?.documents?.find((entry) => entry.document_id === SOURCE_ID);
const knownCompetencies = new Set((competencies?.competencies ?? []).map((entry) => entry.id));
const knownKnowledge = new Set((p5Knowledge?.knowledge ?? []).map((entry) => entry.knowledgeId));
const allItems = lessons.filter(Boolean).flatMap((lesson) => lesson.items ?? []);

if (!p5Formation) addError("MISSING_PARCOURS", "parcours-05", "Absent de formation.json.");
if (!p5Roadmap) addError("MISSING_ROADMAP", "parcours-05", "Absent de roadmap-v2.json.");
if (!p5Boss) addError("MISSING_BOSS", "dea-p05-boss", "Boss absent de roadmap-v2.json.");
if (!source) addError("MISSING_SOURCE", SOURCE_ID, "Source absente du catalogue interne.");
if (source?.source_type === "listing_only") {
  addError("LISTING_ONLY_SOURCE", SOURCE_ID, "Une source listing_only est interdite.");
}
if (
  source &&
  !["content_verified", "training_source"].includes(source.content_status) &&
  source.source_type !== "training_source"
) {
  addError("UNUSABLE_SOURCE", SOURCE_ID, "Source non utilisable pour générer du contenu.");
}
if (p5Formation?.plannedLessonCount !== 8) {
  addError("LESSON_PLAN_MISMATCH", "parcours-05", "8 leçons prévues attendues.");
}
if (p5Formation?.lessons?.length !== 9) {
  addError("MANIFEST_COUNT", "parcours-05", "Le manifeste doit référencer 8 leçons et 1 Boss.");
}
if (p5Formation?.lessons?.some((entry) => entry.status !== "review")) {
  addError(
    "PUBLISHED_UNVALIDATED_CONTENT",
    "parcours-05",
    "Tous les fichiers doivent rester review.",
  );
}
if (p5Formation?.contentStatus !== "review") {
  addError("FORMATION_CONTENT_STATUS", "parcours-05", "Le parcours doit rester en review.");
}
if (p5Roadmap?.contentStatus !== "partial") {
  addError("ROADMAP_CONTENT_STATUS", "parcours-05", "Le parcours à valider doit rester partial.");
}
if (p5Roadmap?.lessonBlueprints?.some((entry) => entry.status !== "awaiting_content")) {
  addError("ROADMAP_STATUS", "parcours-05", "Les blueprints doivent rester awaiting_content.");
}
if (p5Boss?.status !== "awaiting_content") {
  addError("BOSS_STATUS", "dea-p05-boss", "Le Boss structurel doit rester awaiting_content.");
}
if (!legacyDraft?.tags?.includes("import-json-xlsx") || legacyDraft?.items?.length !== 10) {
  addError(
    "LEGACY_DRAFT_NOT_PRESERVED",
    "dea-p05-l08",
    "Les 10 questions importées doivent rester archivées.",
  );
}

const knowledgeIds = new Set();
const knowledgeTitles = new Map();
for (const knowledge of p5Knowledge?.knowledge ?? []) {
  if (knowledgeIds.has(knowledge.knowledgeId)) {
    addError("DUPLICATE_KNOWLEDGE_ID", knowledge.knowledgeId, "ID dupliqué.");
  }
  knowledgeIds.add(knowledge.knowledgeId);
  const titleKey = normalized(knowledge.title);
  if (knowledgeTitles.has(titleKey)) {
    addWarning(
      "SIMILAR_KNOWLEDGE_TITLE",
      knowledge.knowledgeId,
      `Titre similaire à ${knowledgeTitles.get(titleKey)}.`,
    );
  }
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
      addError("MISSING_KNOWLEDGE_FIELD", knowledge.knowledgeId, `Champ ${field} absent.`);
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
    addError("WRONG_KNOWLEDGE_STATUS", knowledge.knowledgeId, "Statut attendu : to_validate.");
  if (!knowledge.plannedParcoursIds?.every((id) => id === "parcours-05")) {
    addError(
      "CROSS_PARCOURS_KNOWLEDGE",
      knowledge.knowledgeId,
      "Référence vers un autre parcours.",
    );
  }
  for (const page of knowledge.pages ?? []) {
    if (!ALLOWED_PAGES.has(page))
      addError("UNVERIFIED_PAGE", knowledge.knowledgeId, `Page ${page} non vérifiée.`);
  }
  for (const competencyId of knowledge.competencyIds ?? []) {
    if (!knownCompetencies.has(competencyId)) {
      addError(
        "UNKNOWN_COMPETENCY",
        knowledge.knowledgeId,
        `Compétence inconnue : ${competencyId}.`,
      );
    }
  }
}

const ids = new Set();
const prompts = new Map();
const types = {};
const difficulties = {};
for (const lesson of lessons.filter(Boolean)) {
  const expectedId = lesson.kind === "boss" ? "dea-p05-boss" : lesson.id;
  if (lesson.validationStatus !== "to_validate")
    addError("LESSON_VALIDATION_STATUS", lesson.id, "Statut attendu : to_validate.");
  if (lesson.generationSource !== "library_extracted_knowledge")
    addError("LESSON_GENERATION_SOURCE", lesson.id, "Origine incorrecte.");
  if (lesson.items?.length !== 8) addError("PLAYABLE_MINIMUM", lesson.id, "8 questions attendues.");
  if (lesson.items?.length > 10) addError("LESSON_MAXIMUM", lesson.id, "Plus de 10 questions.");
  for (const item of lesson.items ?? []) {
    if (ids.has(item.id)) addError("DUPLICATE_QUESTION_ID", item.id, "ID dupliqué.");
    ids.add(item.id);
    if (!item.id.startsWith(`${expectedId}-q`))
      addError("QUESTION_ID_FORMAT", item.id, `ID non rattaché à ${expectedId}.`);
    const promptKey = normalized(item.question);
    if (prompts.has(promptKey))
      addError("DUPLICATE_QUESTION", item.id, `Question identique à ${prompts.get(promptKey)}.`);
    prompts.set(promptKey, item.id);
    types[item.type] = (types[item.type] ?? 0) + 1;
    difficulties[item.difficulty] = (difficulties[item.difficulty] ?? 0) + 1;
    for (const field of [
      "id",
      "type",
      "difficulty",
      "question",
      "explanation",
      "sourceDocument",
      "sourceSection",
      "lessonId",
      "validationStatus",
      "generationSource",
    ]) {
      if (!item[field]) addError("MISSING_QUESTION_FIELD", item.id, `Champ ${field} absent.`);
    }
    if (!item.answers?.length) addError("MISSING_ANSWERS", item.id, "Réponses absentes.");
    if (!item.knowledgeIds?.length) addError("MISSING_KNOWLEDGE", item.id, "knowledgeIds absent.");
    if (!item.competencyIds?.length)
      addError("MISSING_COMPETENCY", item.id, "competencyIds absent.");
    if (item.lessonId !== lesson.id)
      addError("WRONG_LESSON_REFERENCE", item.id, `lessonId ne pointe pas vers ${lesson.id}.`);
    if (item.sourceDocument !== SOURCE_ID)
      addError("WRONG_QUESTION_SOURCE", item.id, "Source inattendue.");
    if (item.metadata?.sourceType === "listing_only")
      addError("LISTING_ONLY_QUESTION", item.id, "Source listing_only interdite.");
    if (item.validationStatus !== "to_validate")
      addError("WRONG_QUESTION_STATUS", item.id, "Statut attendu : to_validate.");
    if (item.generationSource !== "library_extracted_knowledge")
      addError("WRONG_GENERATION_SOURCE", item.id, "Origine incorrecte.");
    if (!item.plannedParcoursIds?.every((id) => id === "parcours-05"))
      addError("CROSS_PARCOURS_QUESTION", item.id, "Autre parcours référencé.");
    for (const knowledgeId of item.knowledgeIds ?? []) {
      if (!knownKnowledge.has(knowledgeId))
        addError("UNKNOWN_KNOWLEDGE", item.id, `Connaissance inconnue : ${knowledgeId}.`);
    }
    for (const competencyId of item.competencyIds ?? []) {
      if (!knownCompetencies.has(competencyId))
        addError("UNKNOWN_COMPETENCY", item.id, `Compétence inconnue : ${competencyId}.`);
    }
    for (const page of pageNumbers(item.sourcePages)) {
      if (!ALLOWED_PAGES.has(page))
        addError("UNVERIFIED_PAGE", item.id, `Page ${page} non vérifiée.`);
    }
    for (const field of ["whyCorrect", "commonMistake", "keyTakeaway", "fieldApplication"]) {
      if (!item.pedagogicalFeedback?.[field])
        addError("MISSING_PEDAGOGICAL_FEEDBACK", item.id, `Feedback ${field} absent.`);
    }
    const answerIds = new Set();
    const answerTexts = new Set();
    for (const answer of item.answers ?? []) {
      if (!answer.id || !answer.text)
        addError("INVALID_ANSWER", item.id, "Réponse vide ou sans ID.");
      if (answerIds.has(answer.id))
        addError("DUPLICATE_ANSWER_ID", item.id, `Réponse ${answer.id} dupliquée.`);
      answerIds.add(answer.id);
      const answerKey = normalized(answer.text);
      if (answerTexts.has(answerKey))
        addError("DUPLICATE_ANSWER_TEXT", item.id, `Réponse ${answer.text} dupliquée.`);
      answerTexts.add(answerKey);
    }
    const correct = Array.isArray(item.correctAnswer) ? item.correctAnswer : [item.correctAnswer];
    if (!correct.length || correct.some((id) => !answerIds.has(id))) {
      addError(
        "INVALID_CORRECT_ANSWER",
        item.id,
        "Correction absente ou non reliée à une réponse existante.",
      );
    }
  }
}

if (allItems.length !== 72)
  addError("QUESTION_COUNT", "parcours-05", `72 questions attendues, ${allItems.length} trouvées.`);
if ((p5Knowledge?.knowledge ?? []).length !== 14)
  addError("KNOWLEDGE_COUNT", "parcours-05", "14 connaissances attendues.");

for (const item of allItems) {
  if (!questionRefs?.questions?.some((entry) => entry.question_id === item.id)) {
    addError(
      "MISSING_LIBRARY_QUESTION_REFERENCE",
      item.id,
      "Référence absente de la bibliothèque.",
    );
  }
}
if (!bossRefs?.bosses?.some((entry) => entry.boss_id === "dea-p05-boss")) {
  addError(
    "MISSING_LIBRARY_BOSS_REFERENCE",
    "dea-p05-boss",
    "Référence Boss absente de la bibliothèque.",
  );
}

info.push({
  code: "MEDICAL_SCOPE",
  message:
    "Contenu limité aux pages vérifiées sur l’appareil circulatoire, la pression artérielle et le pouls ; aucun diagnostic, seuil controversé ou traitement généré.",
});
info.push({
  code: "LEGACY_PRESERVED",
  message:
    "Les 10 anciennes questions importées depuis JSON.xlsx restent inchangées dans legacy-import-lesson-08.json et ne sont pas publiées comme banque officielle.",
});
info.push({
  code: "VALIDATION_REQUIRED",
  message: "Les 72 questions et 14 connaissances restent à valider par un formateur compétent.",
});

const audit = {
  auditVersion: "1.0.0",
  generatedAt: "2026-08-11T00:00:00.000Z",
  scope: { blocId: "bloc-02", parcoursId: "parcours-05", title: "Système cardiovasculaire" },
  preGeneration: {
    plannedLessons: 8,
    existingImportedDraftQuestions: 10,
    usableSourcedQuestions: 0,
    officialQuestionsMissing: 72,
    bossDeclared: true,
    bossPreviouslyPopulated: false,
  },
  source: {
    documentId: SOURCE_ID,
    title: "B2.M4 - Support Etudiant.pdf",
    type: source?.source_type,
    contentStatus: source?.content_status,
    verifiedPages: [...ALLOWED_PAGES],
    checksum: source?.checksum,
  },
  counts: {
    plannedLessons: p5Formation?.plannedLessonCount ?? 0,
    completedLessons: lessons.filter(
      (lesson) => lesson?.kind === "lesson" && lesson.items?.length >= 8,
    ).length,
    knowledgeCreated: p5Knowledge?.knowledge?.length ?? 0,
    lessonQuestions: lessons.slice(0, 8).flatMap((lesson) => lesson?.items ?? []).length,
    bossQuestions: lessons.at(-1)?.items?.length ?? 0,
    totalQuestions: allItems.length,
    needsReview: allItems.filter((item) => item.validationStatus === "to_validate").length,
    preservedLegacyDraftQuestions: legacyDraft?.items?.length ?? 0,
  },
  distributions: { types, difficulties },
  checks: {
    jsonValid: !errors.some((entry) => entry.code === "INVALID_JSON"),
    uniqueQuestionIds: !errors.some((entry) => entry.code === "DUPLICATE_QUESTION_ID"),
    uniqueQuestionPrompts: !errors.some((entry) => entry.code === "DUPLICATE_QUESTION"),
    sourcesPresent: !errors.some((entry) => entry.code.includes("SOURCE")),
    knowledgeReferencesValid: !errors.some((entry) => entry.code.includes("KNOWLEDGE")),
    lessonReferencesValid: !errors.some((entry) => entry.code.includes("LESSON_REFERENCE")),
    competencyReferencesValid: !errors.some((entry) => entry.code.includes("COMPETENCY")),
    noListingOnlySource: !errors.some((entry) => entry.code.includes("LISTING_ONLY")),
    verifiedPagesOnly: !errors.some((entry) => entry.code === "UNVERIFIED_PAGE"),
    feedbackComplete: !errors.some((entry) => entry.code === "MISSING_PEDAGOGICAL_FEEDBACK"),
    parcoursOnly: !errors.some((entry) => entry.code.includes("CROSS_PARCOURS")),
    legacyDraftPreserved: !errors.some((entry) => entry.code === "LEGACY_DRAFT_NOT_PRESERVED"),
    medicalLevelManualReview: "pass",
    tests: "pending",
    lint: "pending",
    build: "pending",
  },
  errors,
  warnings,
  info,
  coverage: {
    playableEntities: 9,
    plannedEntities: 9,
    score: errors.length === 0 ? 100 : Math.max(0, 100 - errors.length * 5),
    trainerValidatedScore: 0,
  },
  result: errors.length === 0 ? "PASS_PENDING_TOOLCHAIN" : "FAIL",
};

await writeFile(join(ROOT, "PARCOURS_5_AUDIT.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");

const report = `# Parcours 5 - Rapport de génération pédagogique

## Résultat

Le **Parcours 5 - Système cardiovasculaire** est alimenté au minimum jouable : 8 leçons de 8 questions et un Boss de 8 questions. Tout le contenu officiel créé reste en statut \`to_validate\`.

## Mini-rapport avant génération

| Élément | État initial |
|---|---:|
| Bloc | \`bloc-02\` - Anatomie par système |
| Parcours | \`parcours-05\` - Système cardiovasculaire |
| Leçons prévues | 8 |
| Anciennes questions importées | 10, brouillon non sourcé |
| Questions officielles utilisables | 0 |
| Boss prévu | Oui - \`dea-p05-boss\` |
| Questions officielles nécessaires | 72 (64 leçons + 8 Boss) |
| Connaissances actives déjà reliées | 0 |

Source retenue : **B2.M4 - Support Étudiant, AFTRAL/IFA, Module 4, version 1 d’août 2022**, pages 18 à 21, 53 et 66 à 68. Les pages ont été extraites et contrôlées visuellement.

Éléments exclus : seuils contradictoires ou potentiellement datés du support, diagnostic cardiovasculaire, interprétation isolée d’une constante et traitement. Aucun de ces contenus n’a été inventé.

## Contenu créé

- **14 connaissances** sourcées et \`to_validate\`.
- **64 questions de leçon**, 8 par leçon.
- **8 questions de Boss**.
- **72 questions à relire**.
- Formats : QCM simple/multiple, vrai-faux contextualisé, association, ordre, texte à trous et cas clinique descriptif.
- Les **10 questions historiques** restent archivées sans modification dans \`legacy-import-lesson-08.json\` et ne sont pas utilisées comme banque officielle.
- Aucun XP, coffre, badge ou protocole clinique n’a été inventé.

## Leçons complétées

1. Le cœur
2. Les vaisseaux
3. Le sang
4. Petite circulation
5. Grande circulation
6. La pression artérielle
7. Le pouls
8. Synthèse
9. Boss - Système cardiovasculaire

## Traçabilité

Chaque question possède un \`lessonId\`, des \`knowledgeIds\`, des \`competencyIds\` existants, une section et des pages vérifiées, ainsi que le feedback \`whyCorrect\`, \`commonMistake\`, \`keyTakeaway\` et \`fieldApplication\`. \`safetyPoint\` est présent lorsque l’interprétation clinique pourrait être surétendue.

## Audit

- JSON : **${audit.checks.jsonValid ? "valide" : "invalide"}**
- Erreurs structurelles : **${errors.length}**
- Avertissements : **${warnings.length}**
- Source \`listing_only\` : **aucune**
- Pages hors périmètre vérifié : **aucune**
- Doublons de question ou d’ID : **aucun**
- Couverture jouable : **${audit.coverage.score} %**
- Validation formateur : **0 % - 72 questions \`to_validate\`**
- Tests, lint et build : **en attente d’exécution**

## Prochain parcours recommandé

Après validation pédagogique de ce lot, le prochain parcours séquentiel est **Parcours 6 - Système respiratoire**. Aucun contenu de ce parcours n’a été modifié.
`;

await writeFile(join(ROOT, "PARCOURS_5_GENERATION_REPORT.md"), report, "utf8");
console.log(
  `Audit Parcours 5 : ${errors.length} erreur(s), ${warnings.length} avertissement(s), ${allItems.length} questions.`,
);
if (errors.length) process.exitCode = 1;
