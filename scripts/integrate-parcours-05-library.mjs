import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const P5_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-05");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const SOURCE_VERSION = "Version 1 - Août 2022";
const CHANGE =
  "Ajout contrôlé du Parcours 5 - Système cardiovasculaire : 14 connaissances, 64 questions de leçon et 8 questions de Boss, toutes à valider.";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function addUnique(target, additions, key, label) {
  const existing = new Map(target.map((entry) => [entry[key], entry]));
  for (const addition of additions) {
    const previous = existing.get(addition[key]);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(addition)) {
        throw new Error(`${label} ${addition[key]} existe avec un contenu différent.`);
      }
      continue;
    }
    target.push(addition);
    existing.set(addition[key], addition);
  }
}

const p5Knowledge = await readJson(join(P5_DIR, "knowledge.json"));
const lessons = await Promise.all(
  Array.from({ length: 9 }, (_, index) =>
    readJson(join(P5_DIR, `lesson-${String(index + 1).padStart(2, "0")}.json`)),
  ),
);
const allItems = lessons.flatMap((lesson) => lesson.items);

const formationPath = join(ROOT, "src", "content", "formations", "dea", "formation.json");
const formation = await readJson(formationPath);
const formationParcours = formation.parcours.find((entry) => entry.id === "parcours-05");
if (!formationParcours) throw new Error("Parcours 5 absent de formation.json.");
Object.assign(formationParcours, {
  difficulty: "easy",
  estimatedMinutes: 75,
  contentStatus: "review",
  pendingFields: ["xp", "chest"],
  lessons: [
    {
      id: "dea-p05-l01",
      title: "Le cœur",
      kind: "lesson",
      status: "review",
      file: "parcours-05/lesson-01.json",
    },
    {
      id: "dea-p05-l02",
      title: "Les vaisseaux",
      kind: "lesson",
      status: "review",
      file: "parcours-05/lesson-02.json",
    },
    {
      id: "dea-p05-l03",
      title: "Le sang",
      kind: "lesson",
      status: "review",
      file: "parcours-05/lesson-03.json",
    },
    {
      id: "dea-p05-l04",
      title: "Petite circulation",
      kind: "lesson",
      status: "review",
      file: "parcours-05/lesson-04.json",
    },
    {
      id: "dea-p05-l05",
      title: "Grande circulation",
      kind: "lesson",
      status: "review",
      file: "parcours-05/lesson-05.json",
    },
    {
      id: "dea-p05-l06",
      title: "La pression artérielle",
      kind: "lesson",
      status: "review",
      file: "parcours-05/lesson-06.json",
    },
    {
      id: "dea-p05-l07",
      title: "Le pouls",
      kind: "lesson",
      status: "review",
      file: "parcours-05/lesson-07.json",
    },
    {
      id: "dea-p05-l08",
      title: "Synthèse",
      kind: "lesson",
      status: "review",
      file: "parcours-05/lesson-08.json",
    },
    {
      id: "dea-p05-boss",
      title: "Boss - Système cardiovasculaire",
      kind: "boss",
      status: "review",
      file: "parcours-05/lesson-09.json",
    },
  ],
});
await writeJson(formationPath, formation);

const roadmapPath = join(ROOT, "src", "content", "formations", "dea", "roadmap-v2.json");
const roadmap = await readJson(roadmapPath);
const roadmapParcours = roadmap.parcours.find((entry) => entry.id === "parcours-05");
if (!roadmapParcours) throw new Error("Parcours 5 absent de roadmap-v2.json.");
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
const normalizedKnowledge = p5Knowledge.knowledge.map((entry) => ({
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
  tags: ["DEA", "parcours-05", "système-cardiovasculaire"],
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
  join(ROOT, "docs", "master_knowledge_base", "documents", `${SOURCE_ID}.json`),
);
const sourceKnowledgeCount = sourceDocument.knowledge.length;
const sourceRef = globalKnowledge.document_sources.find((entry) => entry.document_id === SOURCE_ID);
if (sourceRef) {
  sourceRef.knowledge_count = sourceKnowledgeCount;
} else {
  globalKnowledge.document_sources.push({
    document_id: SOURCE_ID,
    analysis_reference: `documents/${SOURCE_ID}.json`,
    knowledge_count: sourceKnowledgeCount,
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
const bossReference = {
  boss_id: bossLesson.id,
  parcours_id: "parcours-05",
  lesson_file: "src/content/formations/dea/parcours-05/lesson-09.json",
  question_ids: bossLesson.items.map((item) => item.id),
  knowledge_references: [...new Set(bossLesson.items.flatMap((item) => item.knowledgeIds))],
  source_document: SOURCE_ID,
  source_pages: "18-21, 53, 66-68",
  source_version: SOURCE_VERSION,
  validation_status: "to_validate",
};
addUnique(bossRefs.bosses, [bossReference], "boss_id", "Boss");
await writeJson(bossRefsPath, bossRefs);

const internalCatalogPath = join(ROOT, "docs", "internal_sources", "internal_source_catalog.json");
const internalCatalog = await readJson(internalCatalogPath);
const catalogDocument = internalCatalog.documents.find((entry) => entry.document_id === SOURCE_ID);
if (!catalogDocument) throw new Error(`Source ${SOURCE_ID} absente du catalogue interne.`);
Object.assign(catalogDocument, {
  analysis_status: "partial_content_verified",
  analyzed_scope:
    "Appareil locomoteur, pages 34 à 38 ; appareil circulatoire, pages 18 à 21 ; pression artérielle et pouls, pages 53 et 66 à 68",
  review_status: "source_verified",
});
await writeJson(internalCatalogPath, internalCatalog);

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
  `Parcours 5 intégré : ${normalizedKnowledge.length} connaissances, ${normalizedQuestionRefs.length} références de questions et 1 Boss.`,
);
