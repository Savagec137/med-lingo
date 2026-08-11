import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const P6_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-06");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const SOURCE_VERSION = "Version 1 - Août 2022";
const CHANGE =
  "Ajout contrôlé du Parcours 6 - Système respiratoire : 12 connaissances, 64 questions de leçon et 8 questions de Boss, toutes à valider.";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const writeJson = async (path, value) =>
  writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");

function addUnique(target, additions, key, label) {
  const existing = new Map(target.map((entry) => [entry[key], entry]));
  for (const addition of additions) {
    const previous = existing.get(addition[key]);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(addition)) {
        throw new Error(label + " " + addition[key] + " existe avec un contenu différent.");
      }
      continue;
    }
    target.push(addition);
    existing.set(addition[key], addition);
  }
}

const p6Knowledge = await readJson(join(P6_DIR, "knowledge.json"));
const lessons = await Promise.all(
  Array.from({ length: 9 }, (_, index) =>
    readJson(join(P6_DIR, "lesson-" + String(index + 1).padStart(2, "0") + ".json")),
  ),
);
const allItems = lessons.flatMap((lesson) => lesson.items);

const lessonTitles = [
  "Les voies aériennes",
  "Les poumons",
  "Le diaphragme",
  "La ventilation",
  "Les échanges gazeux",
  "L’oxygène",
  "Les principales valeurs normales",
  "Synthèse",
];

const formationPath = join(ROOT, "src", "content", "formations", "dea", "formation.json");
const formation = await readJson(formationPath);
const formationParcours = formation.parcours.find((entry) => entry.id === "parcours-06");
if (!formationParcours) throw new Error("Parcours 6 absent de formation.json.");
Object.assign(formationParcours, {
  difficulty: "easy",
  estimatedMinutes: 75,
  contentStatus: "review",
  pendingFields: ["xp", "chest"],
  lessons: [
    ...lessonTitles.map((title, index) => ({
      id: "dea-p06-l" + String(index + 1).padStart(2, "0"),
      title,
      kind: "lesson",
      status: "review",
      file: "parcours-06/lesson-" + String(index + 1).padStart(2, "0") + ".json",
    })),
    {
      id: "dea-p06-boss",
      title: "Boss - Système respiratoire",
      kind: "boss",
      status: "review",
      file: "parcours-06/lesson-09.json",
    },
  ],
});
await writeJson(formationPath, formation);

const roadmapPath = join(ROOT, "src", "content", "formations", "dea", "roadmap-v2.json");
const roadmap = await readJson(roadmapPath);
const roadmapParcours = roadmap.parcours.find((entry) => entry.id === "parcours-06");
if (!roadmapParcours) throw new Error("Parcours 6 absent de roadmap-v2.json.");
Object.assign(roadmapParcours, {
  difficulty: "easy",
  difficultyLabel: "Débutant",
  estimatedMinutes: 75,
  estimatedDurationLabel: "≈ 75 minutes",
  contentStatus: "partial",
  pendingFields: ["xp", "chest"],
});
await writeJson(roadmapPath, roadmap);

const knowledgePath = join(ROOT, "docs", "master_knowledge_base", "knowledge.json");
const globalKnowledge = await readJson(knowledgePath);
const normalizedKnowledge = p6Knowledge.knowledge.map((entry) => ({
  knowledge_id: entry.knowledgeId,
  knowledge_type: "concept",
  title: entry.title,
  definition: entry.summary,
  summary: entry.summary,
  important_points: entry.keyPoints,
  clinical_examples: [entry.clinicalApplication],
  common_errors: entry.commonErrors,
  memory_tips: [],
  related_topics: [],
  difficulty: "easy",
  tags: ["DEA", "parcours-06", "système-respiratoire"],
  source_document: SOURCE_ID,
  source_chapter: "Module 4 - Appréciation de l’état clinique du patient",
  source_section: entry.section,
  source_page: entry.pages.join(","),
  page_status: entry.pageStatus,
  source_type: entry.sourceType,
  competency_ids: entry.competencyIds,
  planned_parcours_ids: entry.plannedParcoursIds,
  lesson_ids: entry.lessonIds,
  version: SOURCE_VERSION,
  review_status: "source_verified",
  validation_status: entry.status,
}));
addUnique(globalKnowledge.knowledge, normalizedKnowledge, "knowledge_id", "Connaissance");

const sourceDocument = await readJson(
  join(ROOT, "docs", "master_knowledge_base", "documents", SOURCE_ID + ".json"),
);
const sourceRef = globalKnowledge.document_sources.find((entry) => entry.document_id === SOURCE_ID);
if (sourceRef) {
  sourceRef.knowledge_count = sourceDocument.knowledge.length;
} else {
  globalKnowledge.document_sources.push({
    document_id: SOURCE_ID,
    analysis_reference: "documents/" + SOURCE_ID + ".json",
    knowledge_count: sourceDocument.knowledge.length,
  });
}
globalKnowledge.generated_at = "2026-08-11T00:00:00.000Z";
await writeJson(knowledgePath, globalKnowledge);

const questionRefsPath = join(ROOT, "docs", "questions", "references.json");
const questionRefs = await readJson(questionRefsPath);
const normalizedQuestionRefs = allItems.map((item) => ({
  question_id: item.id,
  knowledge_reference: item.knowledgeIds[0],
  knowledge_references: item.knowledgeIds,
  lesson_id: item.lessonId,
  planned_parcours_ids: item.plannedParcoursIds,
  source_document: item.sourceDocument,
  source_section: item.sourceSection,
  source_page: item.sourcePages,
  source_version: SOURCE_VERSION,
  validation_status: item.validationStatus,
  generation_source: item.generationSource,
}));
addUnique(questionRefs.questions, normalizedQuestionRefs, "question_id", "Question");
await writeJson(questionRefsPath, questionRefs);

const bossRefsPath = join(ROOT, "docs", "boss", "references.json");
const bossRefs = await readJson(bossRefsPath);
const bossLesson = lessons.at(-1);
addUnique(
  bossRefs.bosses,
  [
    {
      boss_id: bossLesson.id,
      parcours_id: "parcours-06",
      lesson_file: "src/content/formations/dea/parcours-06/lesson-09.json",
      question_ids: bossLesson.items.map((item) => item.id),
      knowledge_references: [...new Set(bossLesson.items.flatMap((item) => item.knowledgeIds))],
      source_document: SOURCE_ID,
      source_pages: "23-26, 71-72",
      source_version: SOURCE_VERSION,
      validation_status: "to_validate",
    },
  ],
  "boss_id",
  "Boss",
);
await writeJson(bossRefsPath, bossRefs);

const internalCatalogPath = join(ROOT, "docs", "internal_sources", "internal_source_catalog.json");
const internalCatalog = await readJson(internalCatalogPath);
const catalogDocument = internalCatalog.documents.find((entry) => entry.document_id === SOURCE_ID);
if (!catalogDocument) throw new Error("Source " + SOURCE_ID + " absente du catalogue interne.");
catalogDocument.analysis_status = "partial_content_verified";
const respiratoryScope =
  "appareil respiratoire, pages 23 à 27 ; fréquence respiratoire et oxymétrie, pages 71 à 72";
if (!String(catalogDocument.analyzed_scope || "").includes("appareil respiratoire")) {
  catalogDocument.analyzed_scope = catalogDocument.analyzed_scope
    ? catalogDocument.analyzed_scope + " ; " + respiratoryScope
    : respiratoryScope;
}
catalogDocument.review_status = "source_verified";
await writeJson(internalCatalogPath, internalCatalog);

const manifestPath = join(
  ROOT,
  "src",
  "content",
  "formations",
  "dea",
  "imports",
  "json-xlsx-v1",
  "import-manifest.json",
);
const manifest = await readJson(manifestPath);
const legacyEntry = manifest.generatedTargets.find((entry) => entry.id === "dea-p06-l08");
if (!legacyEntry) throw new Error("Entrée historique dea-p06-l08 absente du manifeste d’import.");
Object.assign(legacyEntry, {
  archiveFile: "parcours-06/legacy-import-lesson-08.json",
  supersededBy: "parcours-06/lesson-08.json",
  publicationStatus: "archived_source_bank",
});
await writeJson(manifestPath, manifest);

const officialCatalog = await readJson(
  join(ROOT, "docs", "official_sources", "document_catalog.json"),
);
const versionsPath = join(ROOT, "docs", "versioning", "library_versions.json");
const versions = await readJson(versionsPath);
const current = versions.versions.find((entry) => entry.version === versions.current_version);
if (!current) throw new Error("Version courante de la bibliothèque introuvable.");
current.document_count = officialCatalog.documents.length + internalCatalog.documents.length;
current.knowledge_count = globalKnowledge.knowledge.length;
current.question_count = questionRefs.questions.length;
current.boss_count = bossRefs.bosses.length;
if (!current.change_log.includes(CHANGE)) current.change_log.push(CHANGE);
await writeJson(versionsPath, versions);

console.log(
  "Parcours 6 intégré : " +
    normalizedKnowledge.length +
    " connaissances, " +
    normalizedQuestionRefs.length +
    " références de questions et 1 Boss.",
);
