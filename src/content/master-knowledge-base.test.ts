import assert from "node:assert/strict";
import test from "node:test";

import lessonInput from "./formations/dea/parcours-01/lesson-01.json" with { type: "json" };
import { parseLessonContentFile } from "./learning-schema.ts";
import knowledgeInput from "./master-knowledge-base.json" with { type: "json" };
import { MasterKnowledgeCatalog } from "./master-knowledge-catalog.ts";

const lesson = parseLessonContentFile(lessonInput);
const catalog = new MasterKnowledgeCatalog(knowledgeInput);
const knowledgeBase = catalog.knowledgeBase;
const itemById = new Map(lesson.items.map((item) => [item.id, item]));

test("la base maîtresse relie les 50 exercices à des compétences DEA", () => {
  assert.equal(knowledgeBase.competencies.length, 10);
  assert.deepEqual(knowledgeBase.formations, ["dea"]);
  assert.deepEqual(knowledgeBase.lessonRegistry, [lesson.id]);
  assert.equal(lesson.items.length, 50);

  for (const item of lesson.items) {
    assert.ok(item.competencyIds.length > 0, item.id);
    for (const competencyId of item.competencyIds) {
      const competency = catalog.get(competencyId);
      assert.ok(competency.questionIds.includes(item.id), `${item.id} -> ${competencyId}`);
    }
  }

  for (const competency of knowledgeBase.competencies) {
    assert.deepEqual(competency.formationIds, ["dea"]);
    assert.deepEqual(competency.lessonIds, [lesson.id]);
    for (const questionId of competency.questionIds) {
      const item = itemById.get(questionId);
      assert.ok(item, `${competency.id} -> ${questionId}`);
      assert.ok(item.competencyIds.includes(competency.id));
    }
  }
});

test("la banque conserve les six formats d'origine attendus", () => {
  const counts = lesson.items.reduce<Record<string, number>>((result, item) => {
    const originalType = String(item.metadata?.originalType);
    result[originalType] = (result[originalType] ?? 0) + 1;
    return result;
  }, {});

  assert.deepEqual(counts, {
    mcq: 15,
    true_false: 10,
    matching: 10,
    ordering: 5,
    clinical_case: 5,
    prioritization: 5,
  });
});

test("chaque exercice publié cite le support DEA et des pages vérifiées", () => {
  for (const item of lesson.items) {
    assert.equal(item.metadata?.sourceDocument, "B2.M4 - Support Etudiant.pdf", item.id);
    assert.match(String(item.metadata?.sourcePages), /^\d+(, \d+)*$/, item.id);
    assert.match(item.pedagogicalReference ?? "", /B2\.M4 - Support Etudiant\.pdf/);
    assert.equal(item.metadata?.reviewStatus, "source_verified");
  }

  const serialized = JSON.stringify(lessonInput).toLocaleLowerCase("fr");
  for (const forbidden of [
    "dea-support-to-reconcile",
    "uness-anapath-intro",
    "esr-med-disciplines",
    "boutique",
    "badges",
    "couleur du matériel",
    "récompenses aléatoires",
    "choix d'un avatar",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
