import {
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  type AuditCategory,
  type AuditDuplicateGroup,
  type AuditInputFile,
  type AuditIssue,
  type AuditQualityBreakdown,
  type AuditReport,
  type AuditSeverity,
  type RunAuditOptions,
} from "./audit-domain.ts";
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  normalizePath,
  normalizeText,
  round,
  stringArray,
  unique,
  type JsonRecord,
} from "./audit-utils.ts";

interface EntityRef {
  id: string;
  file: string;
  data: JsonRecord;
  parentId?: string;
}

interface QuestionRef extends EntityRef {
  lessonId: string | null;
  prompt: string;
  type: string;
  difficulty: string;
  answers: JsonRecord[];
  correctAnswerIds: string[];
  knowledgeReferences: string[];
  source: string | null;
  version: string | null;
  parent: JsonRecord;
}

const REQUIRED_QUESTION_FIELDS = [
  "id",
  "type",
  "difficulty",
  "question",
  "answers",
  "correctAnswer",
  "explanation",
  "knowledgeReferences",
  "tags",
  "source",
  "version",
  "createdAt",
  "updatedAt",
] as const;

const FEEDBACK_FIELDS = [
  "why_correct",
  "common_mistake",
  "key_takeaway",
  "memory_tip",
  "clinical_context",
] as const;

const QUESTION_TYPE_ALIASES: Record<string, string> = {
  mcq: "multiple_choice",
  multiple_choice: "multiple_choice",
  true_false_contextual: "true_false",
  true_false: "true_false",
  association: "matching",
  matching: "matching",
  ordering: "ordering",
  fill_blank: "fill_blank",
  anatomy_location: "anatomy_click",
  anatomy_click: "anatomy_click",
  clinical_case: "clinical_case",
};

function emptyCount<T extends readonly string[]>(keys: T): Record<T[number], number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T[number], number>;
}

function activeQuestionFile(path: string, data: JsonRecord): boolean {
  if (
    path.includes("/archive/") ||
    path.includes("/imports/") ||
    path.endsWith(".specification.json")
  ) {
    return false;
  }
  if (/\/formations\/dea\/parcours-\d+\/lesson-\d+\.json$/u.test(path)) {
    return true;
  }
  return path.includes("/content/banks/") && Array.isArray(data.items);
}

function activeLessonFile(path: string): boolean {
  return (
    !path.includes("/archive/") &&
    !path.includes("/imports/") &&
    /\/formations\/dea\/parcours-\d+\/lesson-\d+\.json$/u.test(path)
  );
}

function questionType(question: JsonRecord): string {
  const metadata = asRecord(question.metadata);
  const original = asString(metadata?.originalType);
  const raw = original ?? asString(question.type) ?? "unknown";
  return QUESTION_TYPE_ALIASES[raw] ?? raw;
}

function questionDifficulty(question: JsonRecord): string {
  const raw = question.difficulty;
  if (typeof raw === "number") {
    return raw <= 1 ? "easy" : raw === 2 ? "medium" : raw === 3 ? "hard" : "expert";
  }
  return asString(raw) ?? "unknown";
}

function answerRecords(question: JsonRecord): JsonRecord[] {
  const source = Array.isArray(question.answers)
    ? question.answers
    : Array.isArray(question.options)
      ? question.options
      : [];
  return source.map((value, index) => {
    if (typeof value === "string") {
      return { id: String(index), text: value };
    }
    return asRecord(value) ?? { id: String(index), text: "" };
  });
}

function correctAnswerIds(question: JsonRecord, answers: JsonRecord[]): string[] {
  const raw =
    question.correctAnswer ??
    question.correctAnswerId ??
    question.correctAnswers ??
    question.correct;
  if (typeof raw === "number") {
    return [asString(answers[raw]?.id) ?? String(raw)];
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((value) => {
      if (typeof value === "number") return [asString(answers[value]?.id) ?? String(value)];
      const text = asString(value);
      return text ? [text] : [];
    });
  }
  const text = asString(raw);
  return text ? [text] : [];
}

function knowledgeReferences(question: JsonRecord): string[] {
  const metadata = asRecord(question.metadata);
  return unique([
    ...stringArray(question.knowledgeReferences),
    ...stringArray(question.competencyIds),
    ...stringArray(metadata?.competencyIds),
  ]);
}

function questionSource(question: JsonRecord, parent: JsonRecord): string | null {
  const metadata = asRecord(question.metadata);
  return (
    asString(question.source) ??
    asString(metadata?.sourceDocument) ??
    asString(parent.sourceDocument) ??
    asString(parent.pedagogicalReference)
  );
}

function questionVersion(question: JsonRecord, parent: JsonRecord): string | null {
  const raw = question.version ?? parent.schemaVersion;
  if (typeof raw === "number") return String(raw);
  return asString(raw);
}

function collectQuestions(files: AuditInputFile[]): QuestionRef[] {
  const questions: QuestionRef[] = [];
  for (const file of files) {
    const path = normalizePath(file.path);
    const data = asRecord(file.data);
    if (!data || !activeQuestionFile(path, data)) continue;
    const parentId = asString(data.id);
    for (const value of asArray(data.items)) {
      const question = asRecord(value);
      if (!question) continue;
      const answers = answerRecords(question);
      const id = asString(question.id) ?? "";
      const metadata = asRecord(question.metadata);
      const declaredLessonId =
        asString(question.lessonId) ?? asString(metadata?.lessonId) ?? parentId;
      const lessonId = declaredLessonId?.match(/^dea-p\d{2}-l\d{2}$/u) ? declaredLessonId : null;
      questions.push({
        id,
        file: path,
        data: question,
        parentId: parentId ?? undefined,
        lessonId,
        prompt: asString(question.question) ?? asString(question.prompt) ?? "",
        type: questionType(question),
        difficulty: questionDifficulty(question),
        answers,
        correctAnswerIds: correctAnswerIds(question, answers),
        knowledgeReferences: knowledgeReferences(question),
        source: questionSource(question, data),
        version: questionVersion(question, data),
        parent: data,
      });
    }
  }
  return questions;
}

function duplicateGroups(
  entities: EntityRef[],
  kind: AuditDuplicateGroup["kind"],
  text: (entity: EntityRef) => string,
  sameParentIsError = true,
): AuditDuplicateGroup[] {
  const byText = new Map<string, EntityRef[]>();
  for (const entity of entities) {
    const normalized = normalizeText(text(entity));
    if (!normalized) continue;
    const entries = byText.get(normalized) ?? [];
    entries.push(entity);
    byText.set(normalized, entries);
  }
  return [...byText.entries()].flatMap(([normalizedText, entries]) => {
    if (entries.length < 2) return [];
    const parents = unique(entries.map((entry) => entry.parentId ?? ""));
    const classification =
      sameParentIsError && parents.length === 1 ? ("error" as const) : ("acceptable" as const);
    return [
      {
        kind,
        normalizedText,
        entityIds: entries.map((entry) => entry.id),
        files: unique(entries.map((entry) => entry.file)),
        classification,
        reason:
          classification === "error"
            ? "Le même contenu apparaît plusieurs fois dans le même contexte pédagogique."
            : "La répétition se trouve dans des contextes distincts et peut correspondre à une réutilisation volontaire.",
      },
    ];
  });
}

function numericSequenceIssues(
  entries: EntityRef[],
  category: AuditCategory,
  add: (issue: Omit<AuditIssue, "id">) => void,
): void {
  const groups = new Map<string, Array<{ number: number; entry: EntityRef }>>();
  for (const entry of entries) {
    const match = entry.id.match(/^(.*?)(\d+)$/u);
    if (!match) continue;
    const key = `${entry.file}|${match[1]}`;
    const values = groups.get(key) ?? [];
    values.push({ number: Number(match[2]), entry });
    groups.set(key, values);
  }
  for (const values of groups.values()) {
    if (values.length < 3) continue;
    values.sort((left, right) => left.number - right.number);
    for (let index = 1; index < values.length; index += 1) {
      const previous = values[index - 1];
      const current = values[index];
      if (current.number <= previous.number + 1) continue;
      const missing = Array.from(
        { length: current.number - previous.number - 1 },
        (_, offset) => previous.number + offset + 1,
      );
      add({
        severity: "WARNING",
        category,
        code: "ID_SEQUENCE_GAP",
        message: `Séquence interrompue entre ${previous.entry.id} et ${current.entry.id} (${missing.join(", ")} manquant(s)).`,
        file: current.entry.file,
        entityType: "question",
        entityId: current.entry.id,
      });
    }
  }
}

function nullPaths(value: unknown, prefix = "$", output: string[] = []): string[] {
  if (value === null) {
    output.push(prefix);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => nullPaths(entry, `${prefix}[${index}]`, output));
    return output;
  }
  const record = asRecord(value);
  if (record) {
    for (const [key, entry] of Object.entries(record)) {
      nullPaths(entry, `${prefix}.${key}`, output);
    }
  }
  return output;
}

function scoreSection(maximum: number, issues: AuditIssue[], categories: AuditCategory[]): number {
  const penalty = issues
    .filter((issue) => categories.includes(issue.category))
    .reduce((total, issue) => {
      if (issue.severity === "CRITICAL") return total + 5;
      if (issue.severity === "ERROR") return total + 2;
      if (issue.severity === "WARNING") return total + 0.2;
      return total;
    }, 0);
  return round(Math.max(0, maximum - Math.min(maximum, penalty)), 1);
}

function qualityBreakdown(issues: AuditIssue[]): AuditQualityBreakdown {
  return {
    structure: scoreSection(20, issues, ["structure"]),
    coherence: scoreSection(20, issues, ["pedagogy", "references"]),
    duplicates: scoreSection(15, issues, ["duplicates"]),
    integrity: scoreSection(25, issues, ["ids", "answers", "json"]),
    performance: scoreSection(5, issues, ["performance"]),
    completeness: scoreSection(15, issues, ["required_fields", "feedback"]),
  };
}

export function runContentAudit(
  inputFiles: AuditInputFile[],
  options: RunAuditOptions = {},
): AuditReport {
  const startedAt = options.analysisStartedAt ?? performance.now();
  const files = inputFiles.map((file) => ({ ...file, path: normalizePath(file.path) }));
  const validFiles = files.filter((file) => file.data !== undefined && !file.parseError);
  const roadmapFile = validFiles.find((file) => file.path.endsWith("/roadmap-v2.json"));
  const knowledgeFile = validFiles.find((file) =>
    file.path.endsWith("/master-knowledge-base.json"),
  );
  const roadmap = asRecord(roadmapFile?.data);
  const masterKnowledge = asRecord(knowledgeFile?.data);
  const blocks = asArray(roadmap?.blocks).flatMap((value) => {
    const data = asRecord(value);
    return data
      ? [{ id: asString(data.id) ?? "", file: roadmapFile?.path ?? "", data } satisfies EntityRef]
      : [];
  });
  const parcours = asArray(roadmap?.parcours).flatMap((value) => {
    const data = asRecord(value);
    return data
      ? [
          {
            id: asString(data.id) ?? "",
            file: roadmapFile?.path ?? "",
            data,
            parentId: asString(data.blocId) ?? undefined,
          } satisfies EntityRef,
        ]
      : [];
  });
  const lessons = parcours.flatMap((parcoursEntry) =>
    asArray(parcoursEntry.data.lessonBlueprints).flatMap((value) => {
      const data = asRecord(value);
      return data
        ? [
            {
              id: asString(data.id) ?? "",
              file: parcoursEntry.file,
              data,
              parentId: parcoursEntry.id,
            } satisfies EntityRef,
          ]
        : [];
    }),
  );
  const bosses = asArray(roadmap?.bosses).flatMap((value) => {
    const data = asRecord(value);
    return data
      ? [
          {
            id: asString(data.id) ?? "",
            file: roadmapFile?.path ?? "",
            data,
            parentId: asString(data.parcoursId) ?? undefined,
          } satisfies EntityRef,
        ]
      : [];
  });
  const knowledge = asArray(masterKnowledge?.competencies).flatMap((value) => {
    const data = asRecord(value);
    return data
      ? [
          {
            id: asString(data.id) ?? "",
            file: knowledgeFile?.path ?? "",
            data,
            parentId: asString(data.domain) ?? undefined,
          } satisfies EntityRef,
        ]
      : [];
  });
  const contentLessons = validFiles.flatMap((file) => {
    const data = asRecord(file.data);
    if (!data || !activeLessonFile(file.path)) return [];
    return [
      {
        id: asString(data.id) ?? "",
        file: file.path,
        data,
        parentId: asString(data.parcours) ?? undefined,
      } satisfies EntityRef,
    ];
  });
  const populatedBosses = contentLessons.filter((lesson) => lesson.data.kind === "boss");
  const questions = collectQuestions(files);
  const issues: AuditIssue[] = [];
  let issueCounter = 0;
  const add = (issue: Omit<AuditIssue, "id">) => {
    issueCounter += 1;
    issues.push({ ...issue, id: `AUD-${String(issueCounter).padStart(5, "0")}` });
  };

  for (const file of files) {
    if (file.parseError) {
      add({
        severity: "CRITICAL",
        category: "json",
        code: "INVALID_JSON",
        message: file.parseError,
        file: file.path,
      });
    }
    if (!file.utf8Valid) {
      add({
        severity: "CRITICAL",
        category: "json",
        code: "INVALID_UTF8",
        message: "Le fichier n'est pas encodé en UTF-8 valide.",
        file: file.path,
      });
    }
    if (file.data !== undefined && !file.path.includes("/archive/")) {
      for (const path of nullPaths(file.data)) {
        add({
          severity: "INFO",
          category: "json",
          code: "NULL_VALUE",
          message: `Valeur nulle détectée à ${path}.`,
          file: file.path,
        });
      }
    }
  }

  const entitySets: Array<{
    name: AuditIssue["entityType"];
    entries: EntityRef[];
    pattern: RegExp;
  }> = [
    { name: "bloc", entries: blocks, pattern: /^bloc-\d{2}$/u },
    { name: "parcours", entries: parcours, pattern: /^parcours-\d{2}$/u },
    { name: "lesson", entries: lessons, pattern: /^dea-p\d{2}-l\d{2}$/u },
    { name: "boss", entries: bosses, pattern: /^dea-p\d{2}-boss$/u },
    {
      name: "knowledge",
      entries: knowledge,
      pattern: /^[a-z0-9][a-z0-9._-]*$/u,
    },
  ];
  for (const { name, entries, pattern } of entitySets) {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.id) {
        add({
          severity: "CRITICAL",
          category: "ids",
          code: "MISSING_ID",
          message: `Identifiant manquant pour un objet ${name}.`,
          file: entry.file,
          entityType: name,
        });
        continue;
      }
      counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);
      if (!pattern.test(entry.id)) {
        add({
          severity: "ERROR",
          category: "ids",
          code: "MALFORMED_ID",
          message: `Identifiant mal formaté : ${entry.id}.`,
          file: entry.file,
          entityType: name,
          entityId: entry.id,
        });
      }
    }
    for (const [id, count] of counts) {
      if (count > 1) {
        add({
          severity: "CRITICAL",
          category: "ids",
          code: "DUPLICATE_ID",
          message: `${count} objets ${name} partagent l'identifiant ${id}.`,
          entityType: name,
          entityId: id,
        });
      }
    }
  }

  const questionIdCounts = new Map<string, QuestionRef[]>();
  for (const question of questions) {
    const entries = questionIdCounts.get(question.id) ?? [];
    entries.push(question);
    questionIdCounts.set(question.id, entries);
    if (!question.id) {
      add({
        severity: "CRITICAL",
        category: "ids",
        code: "MISSING_ID",
        message: "Une question ne possède pas d'identifiant.",
        file: question.file,
        entityType: "question",
      });
    } else if (!/^[a-z0-9][a-z0-9._-]*$/u.test(question.id)) {
      add({
        severity: "ERROR",
        category: "ids",
        code: "MALFORMED_ID",
        message: `Identifiant de question mal formaté : ${question.id}.`,
        file: question.file,
        entityType: "question",
        entityId: question.id,
      });
    }
  }
  for (const [id, entries] of questionIdCounts) {
    if (id && entries.length > 1) {
      add({
        severity: "CRITICAL",
        category: "ids",
        code: "DUPLICATE_QUESTION_ID",
        message: `${entries.length} questions actives partagent l'identifiant ${id}.`,
        entityType: "question",
        entityId: id,
        relatedIds: entries.map((entry) => entry.file),
      });
    }
  }
  numericSequenceIssues(questions, "ids", add);

  const blockOrders = blocks.map((entry) => asNumber(entry.data.order)).filter((v) => v !== null);
  const parcoursOrders = parcours
    .map((entry) => asNumber(entry.data.order))
    .filter((v) => v !== null);
  for (const [label, orders] of [
    ["blocs", blockOrders],
    ["parcours", parcoursOrders],
  ] as const) {
    const sorted = [...orders].sort((left, right) => left - right);
    sorted.forEach((order, index) => {
      if (order !== index + 1) {
        add({
          severity: "ERROR",
          category: "ids",
          code: "ORDER_SEQUENCE_BROKEN",
          message: `Ordre des ${label} cassé : ${order} trouvé à la position ${index + 1}.`,
        });
      }
    });
  }
  for (const path of parcours) {
    const blueprints = asArray(path.data.lessonBlueprints)
      .map(asRecord)
      .filter((entry): entry is JsonRecord => entry !== null);
    blueprints.forEach((blueprint, index) => {
      const order = asNumber(blueprint.order);
      if (order !== index + 1) {
        add({
          severity: "ERROR",
          category: "ids",
          code: "LESSON_ORDER_SEQUENCE_BROKEN",
          message: `Ordre de leçon cassé dans ${path.id} : ${String(order)} au lieu de ${index + 1}.`,
          file: path.file,
          entityType: "lesson",
          entityId: asString(blueprint.id) ?? undefined,
        });
      }
    });
    const planned = asNumber(path.data.plannedLessonCount);
    if (planned !== null && planned !== blueprints.length) {
      add({
        severity: "ERROR",
        category: "structure",
        code: "LESSON_COUNT_MISMATCH",
        message: `${path.id} annonce ${planned} leçons mais en référence ${blueprints.length}.`,
        file: path.file,
        entityType: "parcours",
        entityId: path.id,
      });
    }
  }

  const blockIds = new Set(blocks.map((entry) => entry.id));
  const parcoursIds = new Set(parcours.map((entry) => entry.id));
  const lessonIds = new Set(lessons.map((entry) => entry.id));
  const bossIds = new Set(bosses.map((entry) => entry.id));
  const knowledgeIds = new Set(knowledge.map((entry) => entry.id));
  const questionIds = new Set(questions.map((entry) => entry.id).filter(Boolean));
  for (const path of parcours) {
    const blockId = asString(path.data.blocId);
    if (!blockId || !blockIds.has(blockId)) {
      add({
        severity: "CRITICAL",
        category: "references",
        code: "BROKEN_BLOCK_REFERENCE",
        message: `${path.id} référence un bloc inexistant : ${String(blockId)}.`,
        file: path.file,
        entityType: "parcours",
        entityId: path.id,
      });
    }
    const bossId = asString(path.data.bossId);
    if (!bossId || !bossIds.has(bossId)) {
      add({
        severity: "ERROR",
        category: "references",
        code: "BROKEN_BOSS_REFERENCE",
        message: `${path.id} référence un Boss inexistant : ${String(bossId)}.`,
        file: path.file,
        entityType: "parcours",
        entityId: path.id,
      });
    }
    const unlocks = asString(path.data.unlocksParcoursId);
    if (unlocks && !parcoursIds.has(unlocks)) {
      add({
        severity: "ERROR",
        category: "references",
        code: "BROKEN_UNLOCK_REFERENCE",
        message: `${path.id} débloque un parcours inexistant : ${unlocks}.`,
        file: path.file,
        entityType: "parcours",
        entityId: path.id,
      });
    }
    for (const prerequisite of stringArray(path.data.prerequisiteIds)) {
      if (!bossIds.has(prerequisite) && !parcoursIds.has(prerequisite)) {
        add({
          severity: "ERROR",
          category: "references",
          code: "BROKEN_PREREQUISITE_REFERENCE",
          message: `${path.id} possède un prérequis inexistant : ${prerequisite}.`,
          file: path.file,
          entityType: "parcours",
          entityId: path.id,
        });
      }
    }
  }

  const contentById = new Map(contentLessons.map((entry) => [entry.id, entry]));
  for (const lesson of lessons) {
    const content = contentById.get(lesson.id);
    if (!content) {
      add({
        severity: "WARNING",
        category: "pedagogy",
        code: "EMPTY_LESSON",
        message: `${lesson.id} est prévu dans la roadmap mais ne possède pas de fichier de contenu actif.`,
        file: lesson.file,
        entityType: "lesson",
        entityId: lesson.id,
      });
    } else if (asArray(content.data.items).length === 0) {
      add({
        severity: "WARNING",
        category: "pedagogy",
        code: "EMPTY_LESSON",
        message: `${lesson.id} possède un fichier mais aucune question.`,
        file: content.file,
        entityType: "lesson",
        entityId: lesson.id,
      });
    }
  }
  for (const path of parcours) {
    const contentCount = lessons
      .filter((lesson) => lesson.parentId === path.id)
      .filter((lesson) => contentById.has(lesson.id)).length;
    if (contentCount === 0) {
      add({
        severity: "WARNING",
        category: "pedagogy",
        code: "EMPTY_PARCOURS",
        message: `${path.id} ne possède aucune leçon avec un fichier de contenu actif.`,
        file: path.file,
        entityType: "parcours",
        entityId: path.id,
      });
    }
  }
  const populatedBossIds = new Set(populatedBosses.map((entry) => entry.id));
  for (const boss of bosses) {
    if (!populatedBossIds.has(boss.id)) {
      add({
        severity: "WARNING",
        category: "pedagogy",
        code: "EMPTY_BOSS",
        message: `${boss.id} ne possède pas encore de banque de questions active.`,
        file: boss.file,
        entityType: "boss",
        entityId: boss.id,
      });
    }
  }

  const referencedKnowledge = new Set<string>();
  for (const question of questions) {
    if (!question.lessonId) {
      add({
        severity: "ERROR",
        category: "references",
        code: "ORPHAN_QUESTION",
        message: `${question.id || "Question sans ID"} n'est reliée à aucune leçon structurée.`,
        file: question.file,
        entityType: "question",
        entityId: question.id || undefined,
      });
    } else if (!lessonIds.has(question.lessonId)) {
      add({
        severity: "ERROR",
        category: "references",
        code: "BROKEN_LESSON_REFERENCE",
        message: `${question.id} référence une leçon absente de la roadmap : ${question.lessonId}.`,
        file: question.file,
        entityType: "question",
        entityId: question.id,
      });
    }
    if (question.knowledgeReferences.length === 0) {
      add({
        severity: "ERROR",
        category: "pedagogy",
        code: "QUESTION_WITHOUT_KNOWLEDGE",
        message: `${question.id} ne référence aucune connaissance ou compétence.`,
        file: question.file,
        entityType: "question",
        entityId: question.id,
        field: "knowledgeReferences",
      });
    }
    for (const reference of question.knowledgeReferences) {
      referencedKnowledge.add(reference);
      if (!knowledgeIds.has(reference)) {
        add({
          severity: "ERROR",
          category: "references",
          code: "BROKEN_KNOWLEDGE_REFERENCE",
          message: `${question.id} référence une connaissance inexistante : ${reference}.`,
          file: question.file,
          entityType: "question",
          entityId: question.id,
          field: "knowledgeReferences",
          relatedIds: [reference],
        });
      }
    }
  }
  for (const entry of knowledge) {
    if (!referencedKnowledge.has(entry.id)) {
      add({
        severity: "WARNING",
        category: "pedagogy",
        code: "ORPHAN_KNOWLEDGE",
        message: `${entry.id} n'est utilisée par aucune question active.`,
        file: entry.file,
        entityType: "knowledge",
        entityId: entry.id,
      });
    }
    for (const lessonId of stringArray(entry.data.lessonIds)) {
      if (!lessonIds.has(lessonId) && !bossIds.has(lessonId)) {
        add({
          severity: "ERROR",
          category: "references",
          code: "BROKEN_KNOWLEDGE_LESSON_REFERENCE",
          message: `${entry.id} référence une leçon ou un Boss inexistant : ${lessonId}.`,
          file: entry.file,
          entityType: "knowledge",
          entityId: entry.id,
          relatedIds: [lessonId],
        });
      }
    }
    for (const questionId of stringArray(entry.data.questionIds)) {
      if (!questionIds.has(questionId)) {
        add({
          severity: "WARNING",
          category: "references",
          code: "KNOWLEDGE_QUESTION_NOT_ACTIVE",
          message: `${entry.id} référence une question absente du catalogue actif : ${questionId}.`,
          file: entry.file,
          entityType: "knowledge",
          entityId: entry.id,
          relatedIds: [questionId],
        });
      }
    }
  }

  const questionTypes: Record<string, number> = {};
  const difficulties: Record<string, number> = {};
  const difficultiesByLesson = new Map<string, { file: string; values: string[] }>();
  for (const question of questions) {
    questionTypes[question.type] = (questionTypes[question.type] ?? 0) + 1;
    difficulties[question.difficulty] = (difficulties[question.difficulty] ?? 0) + 1;
    const lessonKey = question.lessonId ?? question.parentId ?? question.file;
    const lessonDifficulty = difficultiesByLesson.get(lessonKey) ?? {
      file: question.file,
      values: [],
    };
    lessonDifficulty.values.push(question.difficulty);
    difficultiesByLesson.set(lessonKey, lessonDifficulty);

    const metadata = asRecord(question.data.metadata);
    const required: Record<(typeof REQUIRED_QUESTION_FIELDS)[number], boolean> = {
      id: Boolean(question.id),
      type: Boolean(asString(question.data.type)),
      difficulty:
        asString(question.data.difficulty) !== null || typeof question.data.difficulty === "number",
      question: Boolean(question.prompt),
      answers: question.answers.length > 0,
      correctAnswer: question.correctAnswerIds.length > 0,
      explanation: Boolean(asString(question.data.explanation)),
      knowledgeReferences: question.knowledgeReferences.length > 0,
      tags: stringArray(question.data.tags).length > 0,
      source: Boolean(question.source),
      version: Boolean(question.version),
      createdAt: Boolean(asString(question.data.createdAt)),
      updatedAt: Boolean(asString(question.data.updatedAt)),
    };
    for (const field of REQUIRED_QUESTION_FIELDS) {
      if (!required[field]) {
        add({
          severity: field === "id" || field === "question" ? "ERROR" : "WARNING",
          category: "required_fields",
          code: "MISSING_REQUIRED_FIELD",
          message: `${question.id || "Question sans ID"} : champ obligatoire ${field} absent.`,
          file: question.file,
          entityType: "question",
          entityId: question.id || undefined,
          field,
        });
      }
    }
    if (metadata && metadata.reviewStatus === null) {
      add({
        severity: "WARNING",
        category: "json",
        code: "NULL_REVIEW_STATUS",
        message: `${question.id} possède un statut de révision nul.`,
        file: question.file,
        entityType: "question",
        entityId: question.id,
      });
    }
    for (const field of FEEDBACK_FIELDS) {
      if (!asString(question.data[field])) {
        add({
          severity: "WARNING",
          category: "feedback",
          code: "MISSING_PEDAGOGICAL_FEEDBACK",
          message: `${question.id} : contenu pédagogique ${field} absent.`,
          file: question.file,
          entityType: "question",
          entityId: question.id,
          field,
        });
      }
    }

    const answerIds = question.answers.map((answer) => asString(answer.id) ?? "");
    const answerTexts = question.answers.map((answer) => asString(answer.text) ?? "");
    if (question.answers.length === 0) {
      add({
        severity: "ERROR",
        category: "answers",
        code: "NO_ANSWERS",
        message: `${question.id} ne possède aucune réponse.`,
        file: question.file,
        entityType: "question",
        entityId: question.id,
      });
    }
    question.answers.forEach((answer, index) => {
      if (!asString(answer.text)) {
        add({
          severity: "ERROR",
          category: "answers",
          code: "EMPTY_ANSWER",
          message: `${question.id} possède une réponse vide à l'index ${index}.`,
          file: question.file,
          entityType: "question",
          entityId: question.id,
        });
      }
    });
    if (new Set(answerIds).size !== answerIds.length) {
      add({
        severity: "ERROR",
        category: "answers",
        code: "DUPLICATE_ANSWER_ID",
        message: `${question.id} possède des identifiants de réponse dupliqués.`,
        file: question.file,
        entityType: "question",
        entityId: question.id,
      });
    }
    const normalizedAnswers = answerTexts.map(normalizeText).filter(Boolean);
    if (new Set(normalizedAnswers).size !== normalizedAnswers.length) {
      add({
        severity: "ERROR",
        category: "answers",
        code: "DUPLICATE_ANSWER_TEXT",
        message: `${question.id} possède des réponses textuellement identiques.`,
        file: question.file,
        entityType: "question",
        entityId: question.id,
      });
    }
    if (question.correctAnswerIds.length === 0) {
      add({
        severity: "ERROR",
        category: "answers",
        code: "NO_CORRECT_ANSWER",
        message: `${question.id} ne possède aucune bonne réponse.`,
        file: question.file,
        entityType: "question",
        entityId: question.id,
      });
    }
    for (const correctId of question.correctAnswerIds) {
      if (!answerIds.includes(correctId)) {
        add({
          severity: "CRITICAL",
          category: "answers",
          code: "CORRECT_ANSWER_NOT_FOUND",
          message: `${question.id} désigne une bonne réponse inexistante : ${correctId}.`,
          file: question.file,
          entityType: "question",
          entityId: question.id,
          relatedIds: [correctId],
        });
      }
    }
    if (
      question.correctAnswerIds.length > 1 &&
      question.type !== "multiple_choice" &&
      question.type !== "matching" &&
      question.type !== "ordering" &&
      question.type !== "fill_blank"
    ) {
      add({
        severity: "ERROR",
        category: "answers",
        code: "UNEXPECTED_MULTIPLE_CORRECT_ANSWERS",
        message: `${question.id} possède plusieurs bonnes réponses pour le type ${question.type}.`,
        file: question.file,
        entityType: "question",
        entityId: question.id,
      });
    }
  }

  const lessonsOnlyEasy = [...difficultiesByLesson.entries()].flatMap(([lessonId, entry]) =>
    entry.values.length > 0 && entry.values.every((difficulty) => difficulty === "easy")
      ? [{ lessonId, questionCount: entry.values.length, file: entry.file }]
      : [],
  );
  for (const lesson of lessonsOnlyEasy) {
    add({
      severity: "WARNING",
      category: "difficulty",
      code: "LESSON_ONLY_EASY",
      message: `${lesson.lessonId} contient uniquement ${lesson.questionCount} question(s) faciles.`,
      file: lesson.file,
      entityType: "lesson",
      entityId: lesson.lessonId,
    });
  }

  const questionEntities: EntityRef[] = questions.map((question) => ({
    id: question.id,
    file: question.file,
    data: question.data,
    parentId: question.lessonId ?? question.parentId,
  }));
  const duplicateQuestions = duplicateGroups(
    questionEntities,
    "question",
    (entry) => asString(entry.data.question) ?? asString(entry.data.prompt) ?? "",
  );
  const duplicateKnowledge = duplicateGroups(
    knowledge,
    "knowledge",
    (entry) => asString(entry.data.competence) ?? "",
  );
  const titledEntities = [...blocks, ...parcours, ...lessons, ...bosses];
  const duplicateTitles = duplicateGroups(
    titledEntities,
    "title",
    (entry) => asString(entry.data.title) ?? "",
  );
  const duplicates = [...duplicateQuestions, ...duplicateKnowledge, ...duplicateTitles];
  for (const duplicate of duplicates) {
    add({
      severity: duplicate.classification === "error" ? "ERROR" : "INFO",
      category: "duplicates",
      code:
        duplicate.classification === "error"
          ? "DUPLICATE_CONTENT_ERROR"
          : "DUPLICATE_CONTENT_ACCEPTABLE",
      message: duplicate.reason,
      classification: duplicate.classification,
      relatedIds: duplicate.entityIds,
      file: duplicate.files[0],
    });
  }

  const jsonQuestionIds = unique(questions.map((question) => question.id).filter(Boolean)).sort();
  const supabaseIds = options.supabaseQuestionIds
    ? unique(options.supabaseQuestionIds.filter(Boolean)).sort()
    : null;
  const supabase = supabaseIds
    ? {
        status: "compared" as const,
        jsonQuestionCount: jsonQuestionIds.length,
        supabaseQuestionCount: supabaseIds.length,
        missingInSupabase: jsonQuestionIds.filter((id) => !supabaseIds.includes(id)),
        additionalInSupabase: supabaseIds.filter((id) => !jsonQuestionIds.includes(id)),
        differentIds: [],
        message: "Comparaison effectuée par identifiant stable.",
      }
    : {
        status: "not_configured" as const,
        jsonQuestionCount: jsonQuestionIds.length,
        missingInSupabase: [],
        additionalInSupabase: [],
        differentIds: [],
        message:
          "Aucune table pédagogique de questions n'est déclarée dans les types Supabase actuels ; comparaison non exécutée.",
      };
  if (supabase.status === "compared") {
    if (supabase.missingInSupabase.length > 0 || supabase.additionalInSupabase.length > 0) {
      add({
        severity: "ERROR",
        category: "supabase",
        code: "SUPABASE_COUNT_MISMATCH",
        message: `${supabase.missingInSupabase.length} question(s) absente(s) et ${supabase.additionalInSupabase.length} supplémentaire(s) dans Supabase.`,
      });
    }
  } else {
    add({
      severity: "INFO",
      category: "supabase",
      code: "SUPABASE_COMPARISON_NOT_CONFIGURED",
      message: supabase.message,
    });
  }

  const finishedAt = performance.now();
  const totalSizeBytes = files.reduce((total, file) => total + file.sizeBytes, 0);
  const analysisTimeMs = round(Math.max(0, finishedAt - startedAt), 3);
  const performanceResult = {
    fileCount: files.length,
    totalSizeBytes,
    estimatedMemoryBytes: totalSizeBytes * 2,
    analysisTimeMs,
    averageTimePerQuestionMs: round(
      questions.length === 0 ? 0 : analysisTimeMs / questions.length,
      5,
    ),
  };
  if (performanceResult.averageTimePerQuestionMs > 2) {
    add({
      severity: "WARNING",
      category: "performance",
      code: "SLOW_ANALYSIS",
      message: `Temps moyen élevé : ${performanceResult.averageTimePerQuestionMs} ms par question.`,
    });
  }

  const issuesBySeverity = emptyCount(AUDIT_SEVERITIES);
  const issuesByCategory = emptyCount(AUDIT_CATEGORIES);
  for (const issue of issues) {
    issuesBySeverity[issue.severity] += 1;
    issuesByCategory[issue.category] += 1;
  }
  const breakdown = qualityBreakdown(issues);

  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    scope: {
      root: options.rootLabel ?? "src/content",
      activeDefinition:
        "Roadmap officielle, Master Knowledge Base, fichiers de leçons hors archives/imports bruts et banques JSON actives.",
      excludedFromActiveCounts: [
        "src/content/archive",
        "dossiers archive",
        "imports bruts déjà projetés",
        "spécifications pédagogiques",
      ],
    },
    summary: {
      blocks: blocks.length,
      parcours: parcours.length,
      lessons: lessons.length,
      contentLessons: contentLessons.length,
      knowledge: knowledge.length,
      questions: questions.length,
      bosses: bosses.length,
      populatedBosses: populatedBosses.length,
    },
    files: {
      total: files.length,
      validJson: validFiles.length,
      invalidJson: files.filter((file) => Boolean(file.parseError)).length,
      invalidUtf8: files.filter((file) => !file.utf8Valid).length,
    },
    questionTypes,
    difficulties,
    lessonsOnlyEasy,
    duplicates,
    issuesBySeverity,
    issuesByCategory,
    issues,
    supabase,
    performance: performanceResult,
    qualityScore: {
      total: round(
        Object.values(breakdown).reduce((total, score) => total + score, 0),
        1,
      ),
      breakdown,
    },
  };
}
