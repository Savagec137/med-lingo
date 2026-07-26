import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const repoRoot = process.argv[2];
if (!repoRoot) {
  throw new Error("Usage: node scripts/import-json-xlsx-v1.mjs <repository-root>");
}

const contentRoot = join(repoRoot, "src", "content");
const deaRoot = join(contentRoot, "formations", "dea");
const importRoot = join(deaRoot, "imports", "json-xlsx-v1");
const sourceRoot = join(importRoot, "source");
const sourceLessonRoot = join(sourceRoot, "lessons");
const sourceBossRoot = join(sourceRoot, "bosses");
const formationPath = join(deaRoot, "formation.json");
const roadmapPath = join(deaRoot, "roadmap-v2.json");
const knowledgeBasePath = join(contentRoot, "master-knowledge-base.json");
const importManifestPath = join(importRoot, "import-manifest.json");
const officialOrgansArchivePath = join(
  deaRoot,
  "parcours-01",
  "archive",
  "lesson-03.official-question-bank.json",
);

const SOURCE_DOCUMENT = "JSON.xlsx";
const PEDAGOGICAL_REFERENCE =
  "JSON.xlsx — banque générée par GPT ; support DEA et pages sources à confirmer";
const IMPORT_BATCH = "json-xlsx-v1-2026-07-26";
const WORKBOOK_SHA256 = "c9713768e132d407c7de6ceaaa8fc50649ab38afe2c8a4983a6f121adbab03f7";

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizePrompt(question) {
  const value = question.question ?? JSON.stringify(question.pairs ?? []);
  return value.normalize("NFKC").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
}

function slug(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sourceLessonKey(source) {
  return `${source.path_id}:${source.lesson_id}`;
}

function sourceBossKey(source) {
  return `${source.path_id}:BOSS`;
}

function sourceCompetencyId(source, kind) {
  const suffix = kind === "boss" ? "boss" : source.lesson_id.toLowerCase();
  return `import.json-xlsx.b01.${source.path_id.toLowerCase()}.${suffix}`;
}

function importedQuestionId(source, question, kind) {
  const suffix = kind === "boss" ? "boss" : source.lesson_id.toLowerCase();
  return [
    "import",
    source.block_id.toLowerCase(),
    source.path_id.toLowerCase(),
    suffix,
    question.id.toLowerCase(),
  ].join("-");
}

function difficultyFromNumeric(value) {
  if (value <= 1) return "easy";
  if (value === 2) return "medium";
  if (value === 3) return "hard";
  return "expert";
}

function lessonDifficulty(items) {
  const score = { easy: 1, medium: 2, hard: 3, expert: 4 };
  const ordered = items.map((item) => score[item.difficulty]).sort((a, b) => a - b);
  const median = ordered[Math.floor(ordered.length / 2)] ?? 1;
  return Object.entries(score).find(([, value]) => value === median)?.[0] ?? "easy";
}

const anatomyTargets = {
  abdomen: { label: "Abdomen", x: 0.5, y: 0.49 },
  abdominal_cavity: { label: "Cavité abdominale", x: 0.5, y: 0.5 },
  thoracic_cavity: { label: "Cavité thoracique", x: 0.5, y: 0.3 },
  thorax: { label: "Thorax", x: 0.5, y: 0.31 },
  heart: { label: "Cœur", x: 0.54, y: 0.31 },
  left_ventricle: { label: "Ventricule gauche", x: 0.56, y: 0.34 },
  lungs: { label: "Poumons", x: 0.43, y: 0.29 },
  alveolus: { label: "Alvéole pulmonaire", x: 0.38, y: 0.27 },
  diaphragm: { label: "Diaphragme", x: 0.5, y: 0.39 },
  brain: { label: "Cerveau", x: 0.5, y: 0.08 },
  spinal_cord: { label: "Moelle épinière", x: 0.5, y: 0.27 },
  thyroid: { label: "Thyroïde", x: 0.5, y: 0.17 },
  stomach: { label: "Estomac", x: 0.45, y: 0.46 },
  small_intestine: { label: "Intestin grêle", x: 0.5, y: 0.54 },
  kidneys: { label: "Reins", x: 0.5, y: 0.46 },
  kidney: { label: "Rein", x: 0.42, y: 0.46 },
  right_kidney: { label: "Rein droit", x: 0.58, y: 0.46 },
  adrenal_glands: { label: "Glandes surrénales", x: 0.5, y: 0.43 },
  biceps: { label: "Biceps", x: 0.23, y: 0.31 },
  left_upper_limb: { label: "Membre supérieur gauche", x: 0.82, y: 0.36 },
  right_upper_limb: { label: "Membre supérieur droit", x: 0.18, y: 0.36 },
  femur: { label: "Fémur", x: 0.59, y: 0.69 },
  knee: { label: "Genou", x: 0.59, y: 0.8 },
};

function hashNumber(value) {
  return Number.parseInt(createHash("sha256").update(value).digest("hex").slice(0, 8), 16);
}

function anatomyAnswers(target, questionId) {
  const targetDefinition = anatomyTargets[target];
  if (!targetDefinition) throw new Error(`Cible anatomique inconnue : ${target}`);
  const candidates = Object.entries(anatomyTargets)
    .filter(([id, definition]) => {
      if (id === target) return false;
      return (
        Math.hypot(definition.x - targetDefinition.x, definition.y - targetDefinition.y) > 0.075
      );
    })
    .sort(
      ([left], [right]) =>
        hashNumber(`${questionId}:${left}`) - hashNumber(`${questionId}:${right}`),
    )
    .slice(0, 5);
  return [[target, targetDefinition], ...candidates].map(([id, definition]) => ({
    id: `hotspot-${id}`,
    text: definition.label,
    detail: `${definition.x},${definition.y}`,
    explanation: "",
  }));
}

function convertQuestion(source, question, kind) {
  const id = importedQuestionId(source, question, kind);
  const competencyId = sourceCompetencyId(source, kind);
  const metadata = {
    importBatch: IMPORT_BATCH,
    originalBlockId: source.block_id,
    originalPathId: source.path_id,
    originalLessonId: kind === "boss" ? source.boss_id : source.lesson_id,
    originalQuestionId: question.id,
    originalType: question.type,
    sourceDocument: SOURCE_DOCUMENT,
    sourcePages: "non fournies",
    reviewStatus: "draft",
  };
  const base = {
    id,
    difficulty: difficultyFromNumeric(question.difficulty),
    question: question.question ?? "Associe chaque élément à sa correspondance.",
    explanation: "",
    tags: [
      "import-json-xlsx",
      "validation-medicale-requise",
      source.path_id.toLowerCase(),
      kind === "boss" ? "boss" : source.lesson_id.toLowerCase(),
    ],
    competencyIds: [competencyId],
    pedagogicalReference: PEDAGOGICAL_REFERENCE,
    metadata,
  };

  if (question.type === "multiple_choice" || question.type === "clinical_case") {
    const answers = question.options.map((text, index) => ({
      id: `${id}-answer-${String(index + 1).padStart(2, "0")}`,
      text,
      explanation: "",
    }));
    return {
      ...base,
      type: question.type === "clinical_case" ? "clinical_case" : "mcq",
      answers,
      correctAnswer: answers[question.correct].id,
    };
  }

  if (question.type === "true_false") {
    const answers = [
      { id: `${id}-true`, text: "Vrai", explanation: "" },
      { id: `${id}-false`, text: "Faux", explanation: "" },
    ];
    return {
      ...base,
      type: "true_false_contextual",
      answers,
      correctAnswer: question.answer ? answers[0].id : answers[1].id,
    };
  }

  if (question.type === "matching") {
    const answers = question.pairs.map(([text, match], index) => ({
      id: `${id}-pair-${String(index + 1).padStart(2, "0")}`,
      text,
      match,
      explanation: "",
    }));
    return {
      ...base,
      type: "association",
      instruction: "Associe chaque élément à sa correspondance.",
      answers,
      correctAnswer: answers.map((answer) => answer.id),
      metadata: {
        ...metadata,
        associationMode: "matching",
        requiredSelections: answers.length,
      },
    };
  }

  if (question.type === "ordering") {
    const answers = question.solution.map((text, index) => ({
      id: `${id}-step-${String(index + 1).padStart(2, "0")}`,
      text,
      explanation: "",
      sequenceRank: index + 1,
    }));
    return {
      ...base,
      type: "ordering",
      answers,
      correctAnswer: answers.map((answer) => answer.id),
      metadata: { ...metadata, requiredSelections: answers.length },
    };
  }

  if (question.type === "fill_blank") {
    const answers = question.answers.map((text, index) => ({
      id: `${id}-accepted-${String(index + 1).padStart(2, "0")}`,
      text,
      explanation: "",
    }));
    return {
      ...base,
      type: "fill_blank",
      answers,
      correctAnswer: answers.map((answer) => answer.id),
      metadata: { ...metadata, acceptedTextAnswers: question.answers },
    };
  }

  if (question.type === "anatomy_click") {
    const answers = anatomyAnswers(question.target, id);
    return {
      ...base,
      type: "anatomy_location",
      answers,
      correctAnswer: `hotspot-${question.target}`,
      metadata: { ...metadata, anatomyTarget: question.target },
    };
  }

  throw new Error(`Type de question non pris en charge : ${question.type}`);
}

function listJson(root) {
  return readdirSync(root)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({ file, value: readJson(join(root, file)) }));
}

const lessonSources = listJson(sourceLessonRoot);
const bossSources = listJson(sourceBossRoot);
if (lessonSources.length !== 40 || bossSources.length !== 4) {
  throw new Error(
    `Archive source incomplète : ${lessonSources.length} leçons et ${bossSources.length} Boss.`,
  );
}

const lessonsByKey = new Map(
  lessonSources.map(({ file, value }) => [sourceLessonKey(value), { file, value }]),
);
const bossesByKey = new Map(
  bossSources.map(({ file, value }) => [sourceBossKey(value), { file, value }]),
);

const assignments = {
  "dea-p01-l02": ["P01:L09", "P03:L02"],
  "dea-p01-l03": ["P01:L04"],
  "dea-p01-l04": ["P01:L01", "P01:L02", "P01:L03"],
  "dea-p01-l05": ["P01:L05"],
  "dea-p01-l07": ["P01:L06"],
  "dea-p01-l08": ["P01:L07", "P01:L08", "P01:L10", "P04:L01", "P04:L02"],
  "dea-p02-l01": ["P02:L01"],
  "dea-p02-l02": ["P02:L02"],
  "dea-p02-l03": ["P02:L04"],
  "dea-p02-l04": ["P02:L03"],
  "dea-p02-l05": ["P02:L07"],
  "dea-p02-l06": ["P02:L08", "P02:L09"],
  "dea-p02-l07": ["P02:L05"],
  "dea-p02-l08": ["P02:L06", "P02:L10"],
  "dea-p03-l01": ["P03:L03", "P03:L04", "P03:L05"],
  "dea-p03-l02": ["P03:L07"],
  "dea-p03-l03": ["P03:L08"],
  "dea-p03-l04": ["P03:L09"],
  "dea-p03-l05": ["P03:L06"],
  "dea-p03-l06": ["P03:L10"],
  "dea-p03-l08": ["P03:L01"],
  "dea-p05-l08": ["P04:L03"],
  "dea-p06-l08": ["P04:L04"],
  "dea-p07-l08": ["P04:L06"],
  "dea-p08-l08": ["P04:L05"],
  "dea-p09-l08": ["P04:L07"],
  "dea-p10-l08": ["P04:L08"],
  "dea-p18-l08": ["P04:L09", "P04:L10"],
};

const bossAssignments = {
  "dea-p01-boss": ["P01:BOSS"],
  "dea-p02-boss": ["P02:BOSS"],
  "dea-p03-boss": ["P03:BOSS"],
  "dea-p18-boss": ["P04:BOSS"],
};

const targetFiles = {
  "dea-p01-boss": "parcours-01/lesson-12.json",
  "dea-p02-boss": "parcours-02/lesson-13.json",
  "dea-p03-boss": "parcours-03/lesson-09.json",
  "dea-p18-boss": "parcours-18/lesson-09.json",
};

function lessonFileForId(id) {
  if (targetFiles[id]) return targetFiles[id];
  const match = id.match(/^dea-p(\d{2})-l(\d{2})$/);
  if (!match) throw new Error(`Identifiant de leçon invalide : ${id}`);
  return `parcours-${match[1]}/lesson-${match[2]}.json`;
}

const duplicateCanonical = { lesson: new Map(), boss: new Map() };
const suppressedDuplicates = [];
const keptQuestionIds = new Set();

for (const [kind, sources] of [
  ["lesson", lessonSources],
  ["boss", bossSources],
]) {
  for (const { file, value } of sources) {
    for (const question of value.questions) {
      const prompt = normalizePrompt(question);
      const canonical = duplicateCanonical[kind].get(prompt);
      const key = `${kind}:${file}:${question.id}`;
      if (!canonical) {
        duplicateCanonical[kind].set(prompt, {
          sourceFile: file,
          sourceQuestionId: question.id,
          importedQuestionId: importedQuestionId(value, question, kind),
        });
        keptQuestionIds.add(key);
      } else {
        suppressedDuplicates.push({
          kind,
          sourceFile: file,
          sourceQuestionId: question.id,
          prompt: question.question ?? "Association",
          canonical,
        });
      }
    }
  }
}

function sourceQuestionsForTarget(keys, kind) {
  const sourceMap = kind === "boss" ? bossesByKey : lessonsByKey;
  return keys.flatMap((key) => {
    const source = sourceMap.get(key);
    if (!source) throw new Error(`Source introuvable : ${key}`);
    return source.value.questions
      .filter((question) => keptQuestionIds.has(`${kind}:${source.file}:${question.id}`))
      .map((question) => convertQuestion(source.value, question, kind));
  });
}

const roadmap = readJson(roadmapPath);
const roadmapParcours = new Map(roadmap.parcours.map((parcours) => [parcours.id, parcours]));
const roadmapBosses = new Map(roadmap.bosses.map((boss) => [boss.id, boss]));

function targetDefinition(id) {
  const boss = roadmapBosses.get(id);
  if (boss) {
    return {
      id,
      title: boss.title,
      parcoursId: boss.parcoursId,
      kind: "boss",
      order: 9,
      prerequisiteIds: [roadmapParcours.get(boss.parcoursId)?.lessonBlueprints.at(-1)?.id].filter(
        Boolean,
      ),
    };
  }
  const pathMatch = id.match(/^dea-p(\d{2})-l(\d{2})$/);
  if (!pathMatch) throw new Error(`Cible inconnue : ${id}`);
  const parcoursId = `parcours-${pathMatch[1]}`;
  const parcours = roadmapParcours.get(parcoursId);
  const blueprint = parcours?.lessonBlueprints.find((lesson) => lesson.id === id);
  if (!parcours || !blueprint) throw new Error(`Plan de leçon introuvable : ${id}`);
  return {
    id,
    title: blueprint.title,
    parcoursId,
    kind: "lesson",
    order: blueprint.order,
    prerequisiteIds:
      blueprint.order > 1
        ? [`dea-p${pathMatch[1]}-l${String(blueprint.order - 1).padStart(2, "0")}`]
        : [],
  };
}

function createLessonFile(id, keys, kind) {
  const definition = targetDefinition(id);
  const items = sourceQuestionsForTarget(keys, kind);
  const sourceMap = kind === "boss" ? bossesByKey : lessonsByKey;
  const sourceTitles = keys.map((key) => {
    const source = sourceMap.get(key).value;
    return kind === "boss" ? source.title : source.lesson_title;
  });
  const sourceRewards = keys.map((key) => sourceMap.get(key).value.reward).filter(Boolean);
  const boss = kind === "boss" ? roadmapBosses.get(id) : null;
  return {
    schemaVersion: 2,
    formation: "dea",
    parcours: definition.parcoursId,
    id,
    title: definition.title,
    kind,
    status: "review",
    difficulty: lessonDifficulty(items),
    estimatedMinutes: Math.max(3, Math.ceil(items.length * 0.75)),
    level: kind === "boss" ? 3 : 1,
    xp:
      kind === "boss"
        ? (sourceRewards[0]?.xp ?? 150)
        : Math.max(25, Math.min(150, items.length * 3)),
    tags: ["import-json-xlsx", "validation-medicale-requise"],
    pedagogicalReference: PEDAGOGICAL_REFERENCE,
    pulse: null,
    selection: {
      strategy: "random",
      count:
        kind === "boss"
          ? Math.min(boss?.selection.maximumExercises ?? 12, items.length)
          : Math.min(10, items.length),
    },
    learningObjectives: sourceTitles,
    competencyIds: keys.map((key) => sourceCompetencyId(sourceMap.get(key).value, kind)),
    prerequisiteIds: definition.prerequisiteIds,
    ...(kind === "boss"
      ? {
          bossConfiguration: {
            objective: boss.title,
            scenario: boss.scenario.join(" "),
            tasks: boss.scenario.length > 0 ? boss.scenario : [boss.title],
            engine: "existing_lesson_engine",
            excludedEngine: "mode_intervention",
            successThreshold: boss.successThreshold,
            rewardConfigurable: true,
          },
        }
      : {}),
    items,
  };
}

if (!existsSync(officialOrgansArchivePath)) {
  mkdirSync(dirname(officialOrgansArchivePath), { recursive: true });
  copyFileSync(join(deaRoot, "parcours-01", "lesson-03.json"), officialOrgansArchivePath);
}

const officialOrgans = readJson(officialOrgansArchivePath);
const relocatedOrgans = {
  ...officialOrgans,
  id: "dea-p01-l06",
  title: targetDefinition("dea-p01-l06").title,
  prerequisiteIds: ["dea-p01-l05"],
  items: officialOrgans.items.map((item) => ({
    ...item,
    metadata: {
      ...item.metadata,
      lessonId: "dea-p01-l06",
      migratedFromLessonId: "dea-p01-l03",
    },
  })),
};

const generatedTargets = [];
for (const [id, keys] of Object.entries(assignments)) {
  const file = lessonFileForId(id);
  const content = createLessonFile(id, keys, "lesson");
  writeJson(join(deaRoot, file), content);
  generatedTargets.push({
    id,
    kind: "lesson",
    file,
    sourceKeys: keys,
    questionCount: content.items.length,
    status: content.status,
  });
}
writeJson(join(deaRoot, lessonFileForId("dea-p01-l06")), relocatedOrgans);

for (const [id, keys] of Object.entries(bossAssignments)) {
  const file = lessonFileForId(id);
  const content = createLessonFile(id, keys, "boss");
  writeJson(join(deaRoot, file), content);
  generatedTargets.push({
    id,
    kind: "boss",
    file,
    sourceKeys: keys,
    questionCount: content.items.length,
    status: content.status,
  });
}

const p03EndocrinePlaceholder = {
  schemaVersion: 2,
  formation: "dea",
  parcours: "parcours-03",
  id: "dea-p03-l07",
  title: targetDefinition("dea-p03-l07").title,
  kind: "lesson",
  status: "awaiting_content",
  difficulty: null,
  estimatedMinutes: null,
  level: null,
  xp: null,
  tags: [],
  pedagogicalReference: null,
  pulse: null,
  selection: { strategy: "all", count: null },
  items: [],
};
writeJson(join(deaRoot, lessonFileForId("dea-p03-l07")), p03EndocrinePlaceholder);

const formation = readJson(formationPath);

function upsertFormationLesson(parcoursId, lesson) {
  const parcours = formation.parcours.find((entry) => entry.id === parcoursId);
  if (!parcours) throw new Error(`Parcours de formation inconnu : ${parcoursId}`);
  parcours.lessons = parcours.lessons.filter(
    (entry) => entry.id === lesson.id || entry.file !== lesson.file,
  );
  const index = parcours.lessons.findIndex((entry) => entry.id === lesson.id);
  if (index >= 0) parcours.lessons[index] = lesson;
  else parcours.lessons.push(lesson);
}

const preservedReferences = [
  {
    id: "dea-p01-l01",
    title: targetDefinition("dea-p01-l01").title,
    kind: "lesson",
    status: "published",
    file: "parcours-01/lesson-01.json",
    specificationFile: "parcours-01/lesson-01.specification.json",
  },
  {
    id: "dea-p01-l06",
    title: targetDefinition("dea-p01-l06").title,
    kind: "lesson",
    status: "published",
    file: lessonFileForId("dea-p01-l06"),
  },
];
for (const reference of preservedReferences) {
  upsertFormationLesson(targetDefinition(reference.id).parcoursId, reference);
}
for (const target of generatedTargets) {
  const definition = targetDefinition(target.id);
  upsertFormationLesson(definition.parcoursId, {
    id: target.id,
    title: definition.title,
    kind: definition.kind,
    status: "review",
    file: target.file,
  });
}
upsertFormationLesson("parcours-03", {
  id: "dea-p03-l07",
  title: targetDefinition("dea-p03-l07").title,
  kind: "lesson",
  status: "awaiting_content",
  file: lessonFileForId("dea-p03-l07"),
});

const managedParcoursIds = new Set(
  [...generatedTargets.map((target) => target.id), "dea-p03-l07"].map(
    (id) => targetDefinition(id).parcoursId,
  ),
);
for (const parcoursId of managedParcoursIds) {
  const parcours = formation.parcours.find((entry) => entry.id === parcoursId);
  const blueprint = roadmap.parcours.find((entry) => entry.id === parcoursId);
  if (!parcours || !blueprint) continue;
  const roadmapIds = new Set([
    ...blueprint.lessonBlueprints.map((lesson) => lesson.id),
    blueprint.bossId,
  ]);
  parcours.lessons = parcours.lessons.filter((lesson) => roadmapIds.has(lesson.id));
  parcours.lessons.sort((left, right) => {
    const orderedIds = [...blueprint.lessonBlueprints.map((lesson) => lesson.id), blueprint.bossId];
    return orderedIds.indexOf(left.id) - orderedIds.indexOf(right.id);
  });
}
writeJson(formationPath, formation);

for (const parcours of roadmap.parcours) {
  const formationParcours = formation.parcours.find((entry) => entry.id === parcours.id);
  const playableIds = new Set(
    (formationParcours?.lessons ?? [])
      .filter((lesson) => lesson.status === "published" || lesson.status === "review")
      .map((lesson) => lesson.id),
  );
  const playableBlueprints = parcours.lessonBlueprints.filter((lesson) =>
    playableIds.has(lesson.id),
  ).length;
  parcours.contentStatus =
    playableBlueprints === 0
      ? "awaiting_content"
      : playableBlueprints === parcours.plannedLessonCount
        ? "published"
        : "partial";
}
writeJson(roadmapPath, roadmap);

const sourceToTarget = new Map();
for (const [target, keys] of Object.entries(assignments)) {
  for (const key of keys) sourceToTarget.set(`lesson:${key}`, target);
}
for (const [target, keys] of Object.entries(bossAssignments)) {
  for (const key of keys) sourceToTarget.set(`boss:${key}`, target);
}

const knowledgeBase = readJson(knowledgeBasePath);
knowledgeBase.lessonRegistry = [
  ...new Set([
    ...knowledgeBase.lessonRegistry,
    ...generatedTargets.map((target) => target.id),
    "dea-p01-l06",
    "dea-p03-l07",
  ]),
];
knowledgeBase.supportedExerciseTypes = [
  ...new Set([...knowledgeBase.supportedExerciseTypes, "fill_blank", "anatomy_location"]),
];
knowledgeBase.competencies = knowledgeBase.competencies
  .filter((competency) => !competency.id.startsWith("import.json-xlsx."))
  .map((competency) => {
    if (!competency.lessonIds.includes("dea-p01-l03")) return competency;
    if (
      !competency.id.startsWith("body.organ") &&
      competency.id !== "body.organization.tissue-to-organ"
    ) {
      return competency;
    }
    return {
      ...competency,
      lessonIds: competency.lessonIds.map((lessonId) =>
        lessonId === "dea-p01-l03" ? "dea-p01-l06" : lessonId,
      ),
      sourceLocation:
        competency.sourceLocation === "dea-p01-l03" ? "dea-p01-l06" : competency.sourceLocation,
    };
  });

const importedCompetencies = [];
for (const [kind, sources] of [
  ["lesson", lessonSources],
  ["boss", bossSources],
]) {
  for (const { file, value } of sources) {
    const sourceKey = kind === "boss" ? sourceBossKey(value) : sourceLessonKey(value);
    const targetId = sourceToTarget.get(`${kind}:${sourceKey}`);
    if (!targetId) throw new Error(`Aucune cible pour ${kind}:${sourceKey}`);
    const questionIds = value.questions
      .filter((question) => keptQuestionIds.has(`${kind}:${file}:${question.id}`))
      .map((question) => importedQuestionId(value, question, kind));
    const difficulties = value.questions.map((question) =>
      difficultyFromNumeric(question.difficulty),
    );
    importedCompetencies.push({
      id: sourceCompetencyId(value, kind),
      parcours: Number(targetId.slice(5, 7)),
      formationIds: ["dea"],
      domain:
        value.path_id === "P01"
          ? "body-foundations"
          : value.path_id === "P02"
            ? "medical-language"
            : value.path_id === "P03"
              ? "anatomy"
              : "physiology",
      subdomain: slug(kind === "boss" ? value.title : value.lesson_title),
      competence: kind === "boss" ? value.title : value.lesson_title,
      prerequisites: [],
      learningObjectives: [kind === "boss" ? value.description : value.lesson_title],
      recommendedQuestionPool: questionIds.length,
      difficulty: lessonDifficulty(difficulties.map((difficulty) => ({ difficulty }))),
      masteryCriteria: {
        status: "pending_confirmation",
        minimumAccuracy: null,
        minimumAttempts: null,
        requiredExerciseTypes: [],
      },
      tags: [
        "import-json-xlsx",
        value.path_id.toLowerCase(),
        kind === "boss" ? "boss" : value.lesson_id.toLowerCase(),
      ],
      sourceDocument: SOURCE_DOCUMENT,
      sourcePages: [],
      sourceLocation: `imports/json-xlsx-v1/source/${kind === "boss" ? "bosses" : "lessons"}/${file}`,
      sourceConfirmationRequired: true,
      reviewStatus: "draft",
      lessonIds: [targetId],
      questionIds,
      contentIds: questionIds,
    });
  }
}
knowledgeBase.competencies.push(...importedCompetencies);
writeJson(knowledgeBasePath, knowledgeBase);

const integratedQuestionIds = generatedTargets.flatMap((target) => {
  const file = join(deaRoot, target.file);
  return readJson(file).items.map((item) => item.id);
});
const sourceQuestionCount =
  lessonSources.reduce((count, source) => count + source.value.questions.length, 0) +
  bossSources.reduce((count, source) => count + source.value.questions.length, 0);
const assignedSourceKeys = [
  ...Object.values(assignments)
    .flat()
    .map((key) => `lesson:${key}`),
  ...Object.values(bossAssignments)
    .flat()
    .map((key) => `boss:${key}`),
];
const importManifest = {
  schemaVersion: 1,
  batchId: IMPORT_BATCH,
  sourceDocument: SOURCE_DOCUMENT,
  workbookSha256: WORKBOOK_SHA256,
  reviewStatus: "draft",
  medicalSourceValidationRequired: true,
  sourceFileCount: lessonSources.length + bossSources.length,
  sourceLessonCount: lessonSources.length,
  sourceBossCount: bossSources.length,
  sourceQuestionCount,
  integratedQuestionCount: integratedQuestionIds.length,
  suppressedDuplicateCount: suppressedDuplicates.length,
  preservedOfficialQuestionCount:
    readJson(join(deaRoot, "parcours-01", "lesson-01.json")).items.length +
    relocatedOrgans.items.length,
  assignedSourceKeys,
  generatedTargets,
  integratedQuestionIds,
  suppressedDuplicates,
};
writeJson(importManifestPath, importManifest);

console.log(
  JSON.stringify(
    {
      sourceFiles: importManifest.sourceFileCount,
      sourceQuestions: sourceQuestionCount,
      integratedQuestions: integratedQuestionIds.length,
      suppressedDuplicates: suppressedDuplicates.length,
      generatedTargets: generatedTargets.length,
      competencies: importedCompetencies.length,
      manifest: relative(repoRoot, importManifestPath),
    },
    null,
    2,
  ),
);
