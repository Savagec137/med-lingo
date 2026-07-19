import assert from "node:assert/strict";
import test from "node:test";

import archivedLessonInput from "./formations/dea/parcours-01/archive/lesson-01.generated-question-bank.json" with { type: "json" };
import lessonInput from "./formations/dea/parcours-01/lesson-01.json" with { type: "json" };
import specificationInput from "./formations/dea/parcours-01/lesson-01.specification.json" with { type: "json" };
import { parseLessonContentFile } from "./learning-schema.ts";
import knowledgeInput from "./master-knowledge-base.json" with { type: "json" };
import { MasterKnowledgeCatalog } from "./master-knowledge-catalog.ts";
import {
  PedagogicalSpecificationCatalog,
  specificationContentIds,
} from "./pedagogical-specification-catalog.ts";

const lesson = parseLessonContentFile(lessonInput);
const specification = new PedagogicalSpecificationCatalog([specificationInput]).get(lesson.id);
const catalog = new MasterKnowledgeCatalog(knowledgeInput);
const knowledgeBase = catalog.knowledgeBase;
const trackedIds = new Set([
  ...specification.integration.projectedContentIds,
  ...specification.integration.nonProjectedContentIds,
]);

test("la base maîtresse référence la spécification officielle de dea-p01-l01", () => {
  assert.equal(knowledgeBase.competencies.length, 11);
  assert.deepEqual(knowledgeBase.formations, ["dea"]);
  assert.deepEqual(knowledgeBase.lessonRegistry, [lesson.id]);

  const primary = catalog.get("dea.p01.l01.anatomy-foundations");
  assert.equal(primary.competence, "Comprendre les bases de l'anatomie humaine.");
  assert.deepEqual(primary.learningObjectives, specification.learningObjectives);
  assert.deepEqual(new Set(primary.contentIds), trackedIds);
  assert.equal(primary.sourceLocation, lesson.id);
  assert.deepEqual(primary.sourcePages, []);
});

test("chaque référence active de la Master Knowledge Base existe dans la source officielle", () => {
  const officialIds = trackedIds;
  for (const competency of knowledgeBase.competencies) {
    assert.deepEqual(competency.formationIds, ["dea"]);
    assert.deepEqual(competency.lessonIds, [lesson.id]);
    for (const contentId of competency.contentIds) {
      assert.ok(officialIds.has(contentId), `${competency.id} -> ${contentId}`);
    }
    for (const questionId of competency.questionIds) {
      assert.ok(officialIds.has(questionId), `${competency.id} -> ${questionId}`);
    }
  }
});

test("la projection exécutable ne contient que les neuf exercices officiellement projetés", () => {
  assert.equal(lesson.items.length, 9);
  assert.deepEqual(
    lesson.items.map((item) => item.metadata?.sourceId),
    specification.integration.projectedContentIds,
  );
  for (const item of lesson.items) {
    assert.equal(item.metadata?.sourceSpecification, specification.id);
    assert.ok(item.competencyIds.includes(specification.primaryCompetency.id));
  }
});

test("les seize contenus interactifs officiels restent adressables par identifiant stable", () => {
  assert.deepEqual(specificationContentIds(specification), [
    "F001",
    "F002",
    "F003",
    "F004",
    "F005",
    "Q001",
    "Q002",
    "Q003",
    "VF001",
    "VF002",
    "VF003",
    "VF004",
    "ASSOCIATION-001",
    "GLISSER-DEPOSER-001",
    "CAS-001",
    "PIEGE-001",
  ]);
});

test("l'ancienne banque générée reste archivée sans être chargée comme source officielle", () => {
  assert.equal(archivedLessonInput.items.length, 50);
  assert.equal(
    lesson.items.some((item) => item.id === "dea-p1-l1-mcq-01"),
    false,
  );
});
