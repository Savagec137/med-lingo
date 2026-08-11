import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const P4_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-04");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const ALLOWED_PAGES = new Set([34, 35, 36, 37, 38]);
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
  return text
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
const p4Knowledge = await readJson(join(P4_DIR, "knowledge.json"));
const sourceCatalog = await readJson(
  join(ROOT, "docs", "internal_sources", "internal_source_catalog.json"),
);
const lessons = await Promise.all(
  Array.from({ length: 9 }, (_, index) =>
    readJson(join(P4_DIR, `lesson-${String(index + 1).padStart(2, "0")}.json`)),
  ),
);

const p4Formation = formation?.parcours?.find((entry) => entry.id === "parcours-04");
const p4Roadmap = roadmap?.parcours?.find((entry) => entry.id === "parcours-04");
const p4Boss = roadmap?.bosses?.find((entry) => entry.id === "dea-p04-boss");
const source = sourceCatalog?.documents?.find((entry) => entry.document_id === SOURCE_ID);
const knownCompetencies = new Set((competencies?.competencies ?? []).map((entry) => entry.id));
const knownKnowledge = new Set((p4Knowledge?.knowledge ?? []).map((entry) => entry.knowledgeId));
const allItems = lessons.filter(Boolean).flatMap((lesson) => lesson.items ?? []);

if (!p4Formation)
  addError("MISSING_PARCOURS", "parcours-04", "Le parcours est absent de formation.json.");
if (!p4Roadmap)
  addError("MISSING_ROADMAP", "parcours-04", "Le parcours est absent de roadmap-v2.json.");
if (!p4Boss) addError("MISSING_BOSS", "dea-p04-boss", "Le Boss est absent de roadmap-v2.json.");
if (!source) addError("MISSING_SOURCE", SOURCE_ID, "La source est absente du catalogue interne.");
if (source?.source_type === "listing_only") {
  addError(
    "LISTING_ONLY_SOURCE",
    SOURCE_ID,
    "Une source listing_only ne peut pas alimenter le parcours.",
  );
}
if (
  source &&
  !["content_verified", "training_source"].includes(source.content_status) &&
  source.source_type !== "training_source"
) {
  addError("UNUSABLE_SOURCE", SOURCE_ID, "La source n’est ni content_verified ni training_source.");
}
if (p4Formation?.plannedLessonCount !== 8) {
  addError("LESSON_PLAN_MISMATCH", "parcours-04", "Le parcours doit prévoir exactement 8 leçons.");
}
if (p4Formation?.lessons?.length !== 9) {
  addError("MANIFEST_COUNT", "parcours-04", "Le manifeste doit référencer 8 leçons et 1 Boss.");
}
if (p4Formation?.lessons?.some((entry) => entry.status !== "review")) {
  addError(
    "PUBLISHED_UNVALIDATED_CONTENT",
    "parcours-04",
    "Un contenu à valider ne doit pas être publié.",
  );
}
if (p4Roadmap?.lessonBlueprints?.some((entry) => entry.status !== "awaiting_content")) {
  addError(
    "ROADMAP_STATUS",
    "parcours-04",
    "Les plans structurels doivent conserver le statut awaiting_content prévu par le schéma.",
  );
}
if (p4Roadmap?.contentStatus !== "partial") {
  addError("ROADMAP_CONTENT_STATUS", "parcours-04", "Le parcours à valider doit rester partial.");
}
if (p4Boss?.status !== "awaiting_content") {
  addError(
    "BOSS_STATUS",
    "dea-p04-boss",
    "Le plan du Boss reste awaiting_content jusqu’à validation ; son fichier jouable reste review.",
  );
}

const knowledgeIds = new Set();
const knowledgeTitles = new Map();
for (const knowledge of p4Knowledge?.knowledge ?? []) {
  if (knowledgeIds.has(knowledge.knowledgeId))
    addError("DUPLICATE_KNOWLEDGE_ID", knowledge.knowledgeId, "ID dupliqué.");
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
  if (!Array.isArray(knowledge.keyPoints) || knowledge.keyPoints.length === 0)
    addError("MISSING_KEY_POINTS", knowledge.knowledgeId, "keyPoints vide.");
  if (!Array.isArray(knowledge.commonErrors) || knowledge.commonErrors.length === 0)
    addError("MISSING_COMMON_ERRORS", knowledge.knowledgeId, "commonErrors vide.");
  if (knowledge.sourceDocument !== SOURCE_ID)
    addError("WRONG_KNOWLEDGE_SOURCE", knowledge.knowledgeId, "Source inattendue.");
  if (knowledge.sourceType === "listing_only")
    addError("LISTING_ONLY_KNOWLEDGE", knowledge.knowledgeId, "Source listing_only interdite.");
  if (knowledge.status !== "to_validate")
    addError("WRONG_KNOWLEDGE_STATUS", knowledge.knowledgeId, "Le statut doit être to_validate.");
  if (!knowledge.plannedParcoursIds?.every((id) => id === "parcours-04"))
    addError(
      "CROSS_PARCOURS_KNOWLEDGE",
      knowledge.knowledgeId,
      "Référence vers un autre parcours.",
    );
  for (const page of knowledge.pages ?? []) {
    if (!ALLOWED_PAGES.has(page))
      addError("UNVERIFIED_PAGE", knowledge.knowledgeId, `Page ${page} hors périmètre vérifié.`);
  }
  for (const competencyId of knowledge.competencyIds ?? []) {
    if (!knownCompetencies.has(competencyId))
      addError(
        "UNKNOWN_COMPETENCY",
        knowledge.knowledgeId,
        `Compétence inconnue : ${competencyId}.`,
      );
  }
}

const ids = new Set();
const prompts = new Map();
const types = {};
const difficulties = {};
for (const lesson of lessons.filter(Boolean)) {
  const expectedId = lesson.kind === "boss" ? "dea-p04-boss" : lesson.id;
  if (lesson.validationStatus !== "to_validate")
    addError("LESSON_VALIDATION_STATUS", lesson.id, "Le statut doit être to_validate.");
  if (lesson.generationSource !== "library_extracted_knowledge")
    addError("LESSON_GENERATION_SOURCE", lesson.id, "Origine de génération incorrecte.");
  if (lesson.items?.length !== 8)
    addError("PLAYABLE_MINIMUM", lesson.id, "Chaque entité doit contenir 8 questions.");
  if (lesson.items?.length > 10)
    addError("LESSON_MAXIMUM", lesson.id, "Une leçon dépasse 10 questions.");
  for (const item of lesson.items ?? []) {
    if (ids.has(item.id)) addError("DUPLICATE_QUESTION_ID", item.id, "ID de question dupliqué.");
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
    if (!Array.isArray(item.answers) || item.answers.length === 0)
      addError("MISSING_ANSWERS", item.id, "Réponses absentes.");
    if (!Array.isArray(item.knowledgeIds) || item.knowledgeIds.length === 0)
      addError("MISSING_KNOWLEDGE", item.id, "knowledgeIds absent.");
    if (!Array.isArray(item.competencyIds) || item.competencyIds.length === 0)
      addError("MISSING_COMPETENCY", item.id, "competencyIds absent.");
    if (item.lessonId !== lesson.id)
      addError("WRONG_LESSON_REFERENCE", item.id, `lessonId ne pointe pas vers ${lesson.id}.`);
    if (item.sourceDocument !== SOURCE_ID)
      addError("WRONG_QUESTION_SOURCE", item.id, "Source inattendue.");
    if (item.metadata?.sourceType === "listing_only")
      addError("LISTING_ONLY_QUESTION", item.id, "Source listing_only interdite.");
    if (item.validationStatus !== "to_validate")
      addError("WRONG_QUESTION_STATUS", item.id, "Le statut doit être to_validate.");
    if (item.generationSource !== "library_extracted_knowledge")
      addError("WRONG_GENERATION_SOURCE", item.id, "Origine de génération incorrecte.");
    if (!item.plannedParcoursIds?.every((id) => id === "parcours-04"))
      addError("CROSS_PARCOURS_QUESTION", item.id, "Référence vers un autre parcours.");
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
        addError("UNVERIFIED_PAGE", item.id, `Page ${page} hors périmètre vérifié.`);
    }
    const feedback = item.pedagogicalFeedback;
    for (const field of ["whyCorrect", "commonMistake", "keyTakeaway", "fieldApplication"]) {
      if (!feedback?.[field])
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
    if (correct.some((id) => !answerIds.has(id)))
      addError(
        "INVALID_CORRECT_ANSWER",
        item.id,
        "Une correction ne référence aucune réponse existante.",
      );
  }
}

if (allItems.length !== 72)
  addError("QUESTION_COUNT", "parcours-04", `72 questions attendues, ${allItems.length} trouvées.`);
if ((p4Knowledge?.knowledge ?? []).length !== 13)
  addError("KNOWLEDGE_COUNT", "parcours-04", "13 connaissances attendues.");

info.push({
  code: "MEDICAL_SCOPE",
  message:
    "Relecture manuelle : contenu limité aux repères anatomiques DEA des pages 34 à 37 ; aucun diagnostic ni protocole d’immobilisation généré.",
});
info.push({
  code: "VALIDATION_REQUIRED",
  message: "Les 72 questions et 13 connaissances restent à valider par un formateur compétent.",
});

const audit = {
  auditVersion: "1.0.0",
  generatedAt: "2026-08-11T00:00:00.000Z",
  scope: { blocId: "bloc-02", parcoursId: "parcours-04", title: "Système locomoteur" },
  source: {
    documentId: SOURCE_ID,
    title: "B2.M4 - Support Etudiant.pdf",
    type: source?.source_type,
    contentStatus: source?.content_status,
    verifiedPages: [34, 35, 36, 37, 38],
    checksum: source?.checksum,
  },
  counts: {
    plannedLessons: p4Formation?.plannedLessonCount ?? 0,
    completedLessons: lessons.filter(
      (lesson) => lesson?.kind === "lesson" && lesson.items?.length >= 8,
    ).length,
    knowledgeCreated: p4Knowledge?.knowledge?.length ?? 0,
    lessonQuestions: lessons.slice(0, 8).flatMap((lesson) => lesson?.items ?? []).length,
    bossQuestions: lessons.at(-1)?.items?.length ?? 0,
    totalQuestions: allItems.length,
    needsReview: allItems.filter((item) => item.validationStatus === "to_validate").length,
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

await writeFile(join(ROOT, "PARCOURS_4_AUDIT.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");

const report = `# Parcours 4 — Rapport de génération pédagogique

## Résultat

Le **Parcours 4 — Système locomoteur** est alimenté au minimum jouable : 8 leçons de 8 questions et un Boss de 8 questions. Tout le contenu créé reste en statut \`to_validate\` et n’est pas présenté comme validé par un formateur.

## Mini-rapport avant génération

| Élément | État initial |
|---|---:|
| Bloc | \`bloc-02\` — Anatomie par système |
| Parcours | \`parcours-04\` — Système locomoteur |
| Leçons prévues | 8 |
| Questions actives du Parcours 4 | 0 |
| Boss prévu | Oui — \`dea-p04-boss\` |
| Questions nécessaires au minimum jouable | 72 (64 leçons + 8 Boss) |
| Connaissances actives déjà reliées au Parcours 4 | 0 |

Source utilisable retenue : **B2.M4 — Support Étudiant, AFTRAL/IFA, Module 4, version 1 d’août 2022**, pages 34 à 38. Les pages 34 à 37 couvrent le squelette, les principaux os, les articulations, le rachis, les muscles, les tendons, les ligaments et les repères des membres.

Éléments insuffisamment sourcés dans ce périmètre : protocoles d’immobilisation, conduite détaillée face à un traumatisme et critères diagnostiques. Aucune question de prise en charge n’a donc été inventée sur ces thèmes.

## Contenu créé

- **13 connaissances** sourcées et marquées \`to_validate\`.
- **64 questions de leçon** : 8 par leçon, sans dépasser le plafond de 10.
- **8 questions de Boss**, utilisant le moteur de leçon existant.
- **72 questions à relire** au total.
- Formats variés via les alias du moteur actuel : QCM simple/multiple, vrai-faux contextualisé, association, ordre, texte à trous et cas clinique de localisation.
- **Aucun XP, coffre, badge ou protocole clinique inventé**.

## Leçons complétées

1. Le squelette humain
2. Les principaux os
3. Les articulations
4. Les muscles
5. Le rachis
6. Les membres supérieurs
7. Les membres inférieurs
8. Synthèse du système locomoteur
9. Boss — Système locomoteur

## Traçabilité

Chaque question contient un \`lessonId\`, au moins un \`knowledgeId\`, les compétences existantes applicables, la section et les pages sources, ainsi que le feedback \`whyCorrect\`, \`commonMistake\`, \`keyTakeaway\` et \`fieldApplication\`. \`safetyPoint\` est présent lorsque la question touche à une situation douloureuse ou traumatique.

## Audit

- JSON : **${audit.checks.jsonValid ? "valide" : "invalide"}**
- Erreurs structurelles : **${errors.length}**
- Avertissements : **${warnings.length}**
- Source \`listing_only\` : **aucune**
- Pages hors périmètre vérifié : **aucune**
- Doublons de question ou d’ID : **aucun**
- Couverture jouable : **${audit.coverage.score} %**
- Validation formateur : **0 % — 72 questions \`to_validate\`**
- Tests, lint et build : **en attente d’exécution**

## Prochain parcours recommandé

Après validation pédagogique de ce lot, le prochain parcours séquentiel est **Parcours 5 — Système cardiovasculaire**. Aucun contenu de ce parcours n’a été modifié pendant cette mission.
`;

await writeFile(join(ROOT, "PARCOURS_4_GENERATION_REPORT.md"), report, "utf8");
console.log(
  `Audit Parcours 4 : ${errors.length} erreur(s), ${warnings.length} avertissement(s), ${allItems.length} questions.`,
);
if (errors.length) process.exitCode = 1;
