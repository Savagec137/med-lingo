import assert from "node:assert/strict";
import test from "node:test";
import { runContentAudit } from "./audit-engine.ts";
import type { AuditInputFile } from "./audit-domain.ts";

function file(path: string, data: unknown): AuditInputFile {
  return {
    path,
    data,
    sizeBytes: JSON.stringify(data).length,
    utf8Valid: true,
  };
}

const roadmap = {
  blocks: [{ id: "bloc-01", order: 1, title: "Fondamentaux" }],
  parcours: [
    {
      id: "parcours-01",
      blocId: "bloc-01",
      order: 1,
      title: "Corps humain",
      plannedLessonCount: 1,
      lessonBlueprints: [{ id: "dea-p01-l01", order: 1, title: "Anatomie", status: "published" }],
      bossId: "dea-p01-boss",
      prerequisiteIds: [],
    },
  ],
  bosses: [{ id: "dea-p01-boss", parcoursId: "parcours-01", title: "Boss anatomie" }],
};

const knowledge = {
  competencies: [
    {
      id: "anatomy.definition",
      domain: "anatomy",
      competence: "Définir l'anatomie",
      lessonIds: ["dea-p01-l01"],
      questionIds: ["dea-p1-l1-q01"],
    },
  ],
};

const completeQuestion = {
  id: "dea-p1-l1-q01",
  type: "mcq",
  difficulty: "easy",
  question: "Que décrit l'anatomie ?",
  answers: [
    { id: "a", text: "La structure du corps" },
    { id: "b", text: "La prescription" },
  ],
  correctAnswer: "a",
  explanation: "L'anatomie décrit les structures.",
  competencyIds: ["anatomy.definition"],
  tags: ["anatomie"],
  metadata: { sourceDocument: "Support DEA", lessonId: "dea-p01-l01" },
  version: "1",
  createdAt: "2026-07-30T00:00:00Z",
  updatedAt: "2026-07-30T00:00:00Z",
  why_correct: "La structure est l'objet de l'anatomie.",
  common_mistake: "Confondre anatomie et thérapeutique.",
  key_takeaway: "Anatomie signifie structure.",
  memory_tip: "A comme Anatomie et Architecture.",
  clinical_context: "La localisation précise soutient le bilan.",
};

test("l'audit compte les entités actives sans compter les archives", () => {
  const report = runContentAudit(
    [
      file("/src/content/formations/dea/roadmap-v2.json", roadmap),
      file("/src/content/master-knowledge-base.json", knowledge),
      file("/src/content/formations/dea/parcours-01/lesson-01.json", {
        id: "dea-p01-l01",
        parcours: "parcours-01",
        kind: "lesson",
        schemaVersion: 2,
        items: [completeQuestion],
      }),
      file("/src/content/formations/dea/parcours-01/archive/lesson-01.json", {
        id: "dea-p01-l01",
        items: [completeQuestion],
      }),
    ],
    { generatedAt: "2026-07-30T00:00:00Z" },
  );

  assert.deepEqual(report.summary, {
    blocks: 1,
    parcours: 1,
    lessons: 1,
    contentLessons: 1,
    knowledge: 1,
    questions: 1,
    bosses: 1,
    populatedBosses: 0,
  });
  assert.equal(report.files.total, 4);
  assert.equal(report.questionTypes.multiple_choice, 1);
  assert.equal(report.difficulties.easy, 1);
});

test("l'audit détecte les champs et références manquants sans modifier la donnée", () => {
  const incomplete = {
    ...completeQuestion,
    id: "dea-p1-l1-q02",
    competencyIds: ["knowledge.absent"],
    answers: [
      { id: "a", text: "Même réponse" },
      { id: "b", text: "Même réponse" },
    ],
    correctAnswer: "missing",
    why_correct: undefined,
    common_mistake: undefined,
    key_takeaway: undefined,
    memory_tip: undefined,
    clinical_context: undefined,
  };
  const sourceBefore = JSON.stringify(incomplete);
  const report = runContentAudit([
    file("/src/content/formations/dea/roadmap-v2.json", roadmap),
    file("/src/content/master-knowledge-base.json", knowledge),
    file("/src/content/formations/dea/parcours-01/lesson-01.json", {
      id: "dea-p01-l01",
      parcours: "parcours-01",
      kind: "lesson",
      schemaVersion: 2,
      items: [incomplete],
    }),
  ]);

  assert.equal(JSON.stringify(incomplete), sourceBefore);
  assert.ok(report.issues.some((issue) => issue.code === "BROKEN_KNOWLEDGE_REFERENCE"));
  assert.ok(report.issues.some((issue) => issue.code === "CORRECT_ANSWER_NOT_FOUND"));
  assert.ok(report.issues.some((issue) => issue.code === "DUPLICATE_ANSWER_TEXT"));
  assert.equal(
    report.issues.filter((issue) => issue.code === "MISSING_PEDAGOGICAL_FEEDBACK").length,
    5,
  );
});

test("l'audit compare les IDs Supabase lorsqu'ils sont fournis", () => {
  const report = runContentAudit(
    [
      file("/src/content/formations/dea/roadmap-v2.json", roadmap),
      file("/src/content/master-knowledge-base.json", knowledge),
      file("/src/content/formations/dea/parcours-01/lesson-01.json", {
        id: "dea-p01-l01",
        parcours: "parcours-01",
        kind: "lesson",
        schemaVersion: 2,
        items: [completeQuestion],
      }),
    ],
    { supabaseQuestionIds: ["dea-p1-l1-q01", "supabase-only"] },
  );

  assert.equal(report.supabase.status, "compared");
  assert.deepEqual(report.supabase.missingInSupabase, []);
  assert.deepEqual(report.supabase.additionalInSupabase, ["supabase-only"]);
});
