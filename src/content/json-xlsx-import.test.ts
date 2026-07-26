import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import formationInput from "./formations/dea/formation.json" with { type: "json" };
import importManifest from "./formations/dea/imports/json-xlsx-v1/import-manifest.json" with { type: "json" };
import roadmapInput from "./formations/dea/roadmap-v2.json" with { type: "json" };
import knowledgeInput from "./master-knowledge-base.json" with { type: "json" };
import { createContentCatalog } from "./content-engine.ts";
import { FormationCatalog } from "./formation-catalog.ts";
import { normalizeLearningItem, parseLessonContentFile } from "./learning-schema.ts";
import { MasterKnowledgeCatalog } from "./master-knowledge-catalog.ts";
import { prepareContentInteraction } from "./lesson-runtime.ts";

interface SourceQuestion {
  id: string;
  question: string;
}

interface SourceFile {
  questions: SourceQuestion[];
}

const deaRoot = new URL("./formations/dea/", import.meta.url);
const sourceRoot = new URL("./formations/dea/imports/json-xlsx-v1/source/", import.meta.url);
const formation = new FormationCatalog([formationInput]).getFormation("dea");
const knowledge = new MasterKnowledgeCatalog(knowledgeInput);

function readJson<T>(url: URL): T {
  return JSON.parse(readFileSync(url, "utf8")) as T;
}

function sourceFiles(folder: "lessons" | "bosses") {
  const directory = new URL(`${folder}/`, sourceRoot);
  return readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson<SourceFile>(new URL(file, directory)));
}

function normalizePrompt(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
}

const generatedBanks = importManifest.generatedTargets.map((target) => ({
  target,
  bank: parseLessonContentFile(readJson<unknown>(new URL(target.file, deaRoot))),
}));

test("l'import conserve les 460 questions sources et publie 446 exercices uniques", () => {
  const lessons = sourceFiles("lessons");
  const bosses = sourceFiles("bosses");
  const sourceQuestionCount = [...lessons, ...bosses].reduce(
    (total, source) => total + source.questions.length,
    0,
  );
  const integratedQuestionCount = generatedBanks.reduce(
    (total, { bank }) => total + bank.items.length,
    0,
  );

  assert.equal(lessons.length, 40);
  assert.equal(bosses.length, 4);
  assert.equal(sourceQuestionCount, 460);
  assert.equal(importManifest.sourceQuestionCount, 460);
  assert.equal(importManifest.integratedQuestionCount, 446);
  assert.equal(integratedQuestionCount, 446);
  assert.equal(importManifest.suppressedDuplicateCount, 14);
  assert.equal(importManifest.preservedOfficialQuestionCount, 100);
});

test("chaque fichier source est affecté une fois et les contenus P04 ne remplacent pas le parcours 04", () => {
  assert.equal(importManifest.assignedSourceKeys.length, 44);
  assert.equal(new Set(importManifest.assignedSourceKeys).size, 44);

  for (const target of importManifest.generatedTargets) {
    if (target.sourceKeys.some((sourceKey) => sourceKey.startsWith("P04:"))) {
      assert.notEqual(target.file.startsWith("parcours-04/"), true, target.id);
    }
  }
});

test("toutes les banques générées respectent le schéma, les identifiants et la correction", () => {
  const allQuestionIds = new Set<string>();
  for (const { target, bank } of generatedBanks) {
    assert.equal(bank.id, target.id);
    assert.equal(bank.status, "review");
    assert.equal(bank.items.length, target.questionCount);
    assert.equal(
      formation.parcours
        .flatMap((parcours) => parcours.lessons)
        .some((lesson) => lesson.id === target.id && lesson.file === target.file),
      true,
      target.id,
    );

    const normalizedItems = bank.items.map((item) => normalizeLearningItem(bank, item));
    const catalog = createContentCatalog({ schemaVersion: 1, items: normalizedItems });
    for (const item of normalizedItems) {
      assert.equal(allQuestionIds.has(item.id), false, item.id);
      allQuestionIds.add(item.id);
      const prepared = prepareContentInteraction(item, () => 0.37);
      assert.equal(prepared.answers.length, item.answers.length);
      const correctIds = Array.isArray(item.correctAnswer)
        ? item.correctAnswer
        : [item.correctAnswer];
      const submittedIds = item.type === "fill_blank" ? [correctIds[0]!] : correctIds;
      assert.equal(catalog.evaluate(item.id, submittedIds).isCorrect, true, item.id);
      assert.equal(item.metadata?.reviewStatus, "draft");
      assert.equal(item.metadata?.sourceDocument, "JSON.xlsx");
      assert.equal(item.metadata?.sourcePages, "non fournies");
      const competencyIds = item.metadata?.competencyIds ?? [];
      for (const competencyId of competencyIds) {
        const competency = knowledge.get(competencyId);
        assert.equal(competency.reviewStatus, "draft");
        assert.equal(competency.questionIds.includes(item.id), true, item.id);
      }
    }
  }
  assert.equal(allQuestionIds.size, 446);
});

test("aucun exercice exactement identique ne reste dans les leçons ni dans les Boss jouables", () => {
  for (const kind of ["lesson", "boss"] as const) {
    const signatures = generatedBanks
      .filter(({ target }) => target.kind === kind)
      .flatMap(({ bank }) =>
        bank.items.map((item) =>
          JSON.stringify({
            prompt: normalizePrompt(item.question),
            answers: item.answers
              .map((answer) => ({
                text: normalizePrompt(answer.text),
                match: answer.match ? normalizePrompt(answer.match) : null,
              }))
              .sort((left, right) =>
                `${left.text}:${left.match}`.localeCompare(`${right.text}:${right.match}`),
              ),
            correctAnswers: (Array.isArray(item.correctAnswer)
              ? item.correctAnswer
              : [item.correctAnswer]
            ).map(
              (answerId) => item.answers.find((answer) => answer.id === answerId)?.text ?? answerId,
            ),
          }),
        ),
      );
    assert.equal(new Set(signatures).size, signatures.length, kind);
  }
});

test("les 14 doublons supprimés restent auditables et pointent vers leur question canonique", () => {
  assert.equal(importManifest.suppressedDuplicates.length, 14);
  const integratedIds = new Set(importManifest.integratedQuestionIds);
  for (const duplicate of importManifest.suppressedDuplicates) {
    assert.ok(duplicate.sourceFile.endsWith(".json"));
    assert.ok(duplicate.sourceQuestionId.length > 0);
    assert.ok(duplicate.prompt.length > 0);
    assert.equal(integratedIds.has(duplicate.canonical.importedQuestionId), true);
  }
});

test("la feuille de route expose le contenu testable sans le présenter comme validé médicalement", () => {
  const generatedIds = new Set(importManifest.generatedTargets.map((target) => target.id));
  const roadmapEntries = roadmapInput.parcours.filter((parcours) =>
    parcours.lessonBlueprints.some((lesson) => generatedIds.has(lesson.id)),
  );
  assert.ok(roadmapEntries.length > 0);
  assert.ok(
    knowledge.knowledgeBase.competencies
      .filter((competency) => competency.id.startsWith("import.json-xlsx."))
      .every(
        (competency) =>
          competency.reviewStatus === "draft" &&
          competency.sourceConfirmationRequired &&
          competency.sourcePages.length === 0,
      ),
  );
  assert.equal(
    knowledge.knowledgeBase.competencies.some(
      (competency) =>
        competency.id.startsWith("import.json-xlsx.") &&
        competency.reviewStatus === "trainer_validated",
    ),
    false,
  );
});
