import assert from "node:assert/strict";
import test from "node:test";

import archivedBankInput from "./formations/dea/parcours-01/archive/lesson-01.generated-question-bank.json" with { type: "json" };
import officialProjectionInput from "./formations/dea/parcours-01/archive/lesson-01.official-projection-v1.json" with { type: "json" };
import lessonInput from "./formations/dea/parcours-01/lesson-01.json" with { type: "json" };
import parcoursInput from "./formations/dea/parcours-01/parcours.json" with { type: "json" };
import specificationInput from "./formations/dea/parcours-01/lesson-01.specification.json" with { type: "json" };
import { parseLessonContentFile } from "./learning-schema.ts";
import knowledgeInput from "./master-knowledge-base.json" with { type: "json" };
import { MasterKnowledgeCatalog } from "./master-knowledge-catalog.ts";
import { PedagogicalSpecificationCatalog } from "./pedagogical-specification-catalog.ts";

const lesson = parseLessonContentFile(lessonInput);
const officialProjection = parseLessonContentFile(officialProjectionInput);
const specification = new PedagogicalSpecificationCatalog([specificationInput]).get(lesson.id);
const catalog = new MasterKnowledgeCatalog(knowledgeInput);
const knowledgeBase = catalog.knowledgeBase;
const trackedSpecificationIds = new Set([
  ...specification.integration.projectedContentIds,
  ...specification.integration.nonProjectedContentIds,
]);
const activeQuestionIds = new Set(lesson.items.map((item) => item.id));
const knownContentIds = new Set([...trackedSpecificationIds, ...activeQuestionIds]);

test("la base maîtresse couvre le Parcours 1 et sa spécification officielle", () => {
  assert.equal(knowledgeBase.competencies.length, 60);
  assert.deepEqual(knowledgeBase.formations, ["dea"]);
  assert.deepEqual(knowledgeBase.lessonRegistry, parcoursInput.completion.orderedEntryIds);

  const primary = catalog.get("dea.p01.l01.anatomy-foundations");
  assert.equal(primary.competence, "Comprendre les bases de l'anatomie humaine.");
  assert.deepEqual(primary.learningObjectives, specification.learningObjectives);
  assert.deepEqual(new Set(primary.contentIds), trackedSpecificationIds);
  assert.equal(primary.sourceLocation, lesson.id);
});

test("les cinquante exercices actifs référencent uniquement des compétences existantes", () => {
  assert.equal(lesson.items.length, 50);
  for (const item of lesson.items) {
    for (const competencyId of item.competencyIds) {
      assert.doesNotThrow(() => catalog.get(competencyId), `${item.id} -> ${competencyId}`);
      assert.ok(catalog.get(competencyId).questionIds.includes(item.id));
    }
  }
});

test("chaque référence active de la Master Knowledge Base reste adressable", () => {
  const lessonIds = new Set(knowledgeBase.lessonRegistry);
  for (const competency of knowledgeBase.competencies) {
    assert.deepEqual(competency.formationIds, ["dea"]);
    assert.ok(competency.sourceDocument.length > 0);
    assert.ok(Array.isArray(competency.sourcePages));
    for (const lessonId of competency.lessonIds) assert.ok(lessonIds.has(lessonId));
    for (const questionId of competency.questionIds) {
      assert.ok(knownContentIds.has(questionId), `${competency.id} -> ${questionId}`);
    }
    for (const contentId of competency.contentIds) {
      assert.ok(knownContentIds.has(contentId), `${competency.id} -> ${contentId}`);
    }
  }
});

test("les nouvelles compétences sans support DEA confirmé restent explicitement en draft", () => {
  const pending = knowledgeBase.competencies.filter(
    (competency) => competency.sourceConfirmationRequired,
  );
  assert.equal(pending.length, 49);
  for (const competency of pending) {
    assert.equal(competency.reviewStatus, "draft");
    assert.deepEqual(competency.sourcePages, []);
    assert.equal(competency.masteryCriteria.status, "pending_confirmation");
    assert.equal(competency.masteryCriteria.minimumAccuracy, null);
  }
  assert.equal(
    knowledgeBase.competencies.some(
      (competency) => competency.reviewStatus === "trainer_validated",
    ),
    false,
  );
});

test("la banque de 50 exercices et la projection officielle V1 sont conservées sans réécriture", () => {
  assert.deepEqual(lessonInput, archivedBankInput);
  assert.equal(officialProjection.items.length, 9);
  assert.deepEqual(
    officialProjection.items.map((item) => item.metadata?.sourceId),
    specification.integration.projectedContentIds,
  );
});
