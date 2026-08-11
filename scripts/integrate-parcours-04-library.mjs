import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const P4_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-04");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const SOURCE_VERSION = "Version 1 — Août 2022";
const CHANGE =
  "Ajout contrôlé du Parcours 4 — Système locomoteur : 13 connaissances, 64 questions de leçon et 8 questions de Boss, toutes à valider.";

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

const p4Knowledge = await readJson(join(P4_DIR, "knowledge.json"));
const lessons = await Promise.all(
  Array.from({ length: 9 }, (_, index) =>
    readJson(join(P4_DIR, `lesson-${String(index + 1).padStart(2, "0")}.json`)),
  ),
);
const allItems = lessons.flatMap((lesson) => lesson.items);

const knowledgePath = join(ROOT, "docs", "master_knowledge_base", "knowledge.json");
const globalKnowledge = await readJson(knowledgePath);
const normalizedKnowledge = p4Knowledge.knowledge.map((entry) => ({
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
  tags: ["DEA", "parcours-04", "système-locomoteur"],
  source_document: SOURCE_ID,
  source_chapter: "Module 4 — Appréciation de l’état clinique du patient",
  source_section: entry.section,
  source_page: entry.pages.join("-"),
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
const sourceRef = globalKnowledge.document_sources.find((entry) => entry.document_id === SOURCE_ID);
if (sourceRef && sourceRef.knowledge_count !== normalizedKnowledge.length) {
  throw new Error(`Le document ${SOURCE_ID} possède déjà un décompte différent.`);
}
if (!sourceRef) {
  globalKnowledge.document_sources.push({
    document_id: SOURCE_ID,
    analysis_reference: `documents/${SOURCE_ID}.json`,
    knowledge_count: normalizedKnowledge.length,
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
  parcours_id: "parcours-04",
  lesson_file: "src/content/formations/dea/parcours-04/lesson-09.json",
  question_ids: bossLesson.items.map((item) => item.id),
  knowledge_references: [...new Set(bossLesson.items.flatMap((item) => item.knowledgeIds))],
  source_document: SOURCE_ID,
  source_pages: "34-37",
  source_version: SOURCE_VERSION,
  validation_status: "to_validate",
};
addUnique(bossRefs.bosses, [bossReference], "boss_id", "Boss");
await writeJson(bossRefsPath, bossRefs);

const officialCatalog = await readJson(
  join(ROOT, "docs", "official_sources", "document_catalog.json"),
);
const internalCatalog = await readJson(
  join(ROOT, "docs", "internal_sources", "internal_source_catalog.json"),
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
  `Bibliothèque mise à jour : ${normalizedKnowledge.length} connaissances, ${normalizedQuestionRefs.length} références de questions et 1 Boss.`,
);
