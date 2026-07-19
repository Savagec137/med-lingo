import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import deaFormation from "./formations/dea/formation.json" with { type: "json" };
import archivedBankInput from "./formations/dea/parcours-01/archive/lesson-01.generated-question-bank.json" with { type: "json" };
import lessonOneInput from "./formations/dea/parcours-01/lesson-01.json" with { type: "json" };
import parcoursInput from "./formations/dea/parcours-01/parcours.json" with { type: "json" };
import { FormationCatalog } from "./formation-catalog.ts";
import { normalizeLearningItem, parseLessonContentFile } from "./learning-schema.ts";
import knowledgeInput from "./master-knowledge-base.json" with { type: "json" };
import { MasterKnowledgeCatalog } from "./master-knowledge-catalog.ts";
import { selectContentPoolItems } from "./lesson-runtime.ts";
import { parseParcoursManifest } from "./parcours-manifest-schema.ts";

const formation = new FormationCatalog([deaFormation]).getFormation("dea");
const parcours = formation.parcours[0]!;
const manifest = parseParcoursManifest(parcoursInput);
const knowledge = new MasterKnowledgeCatalog(knowledgeInput);
const lessonOne = parseLessonContentFile(lessonOneInput);
const lessonOneInteractions = lessonOne.items.map((item) => normalizeLearningItem(lessonOne, item));

test("le manifeste enregistre dix leçons, un quiz et un Boss dans l'ordre imposé", () => {
  assert.equal(manifest.id, "dea-p01");
  assert.equal(
    manifest.entries.filter((entry) => ["lesson", "review"].includes(entry.type)).length,
    10,
  );
  assert.equal(manifest.entries.at(-2)?.id, "dea-p01-quiz");
  assert.equal(manifest.entries.at(-1)?.id, "dea-p01-boss");
  assert.deepEqual(
    manifest.entries.map((entry) => entry.order),
    Array.from({ length: 12 }, (_, index) => index + 1),
  );
  assert.deepEqual(
    manifest.completion.orderedEntryIds,
    manifest.entries.map((entry) => entry.id),
  );
  assert.equal(manifest.completion.unlocksParcoursId, "dea-p02");
});

test("formation.json référence le manifeste et les douze contenus du Parcours 1", () => {
  assert.equal(parcours.contentId, manifest.id);
  assert.equal(parcours.manifestFile, "parcours-01/parcours.json");
  assert.equal(parcours.objective, manifest.globalObjective);
  assert.equal(parcours.subtitle, "Les bases indispensables de l’anatomie");
  assert.deepEqual(
    parcours.lessons.map((entry) => entry.id),
    manifest.entries.map((entry) => entry.id),
  );
});

test("les prérequis forment une chaîne stricte et le Boss débloque le Parcours 2", () => {
  manifest.entries.forEach((entry, index) => {
    assert.deepEqual(entry.prerequisiteIds, index === 0 ? [] : [manifest.entries[index - 1]!.id]);
  });
  assert.equal(manifest.entries.at(-1)?.prerequisiteIds[0], "dea-p01-quiz");
});

test("toutes les banques sont valides et seuls les contenus publiables sont visibles", () => {
  for (const [index, reference] of parcours.lessons.entries()) {
    const input = JSON.parse(
      readFileSync(new URL(`./formations/dea/${reference.file}`, import.meta.url), "utf8"),
    ) as unknown;
    const bank = parseLessonContentFile(input);
    assert.equal(bank.id, reference.id);
    assert.equal(bank.kind, reference.kind);
    assert.equal(bank.status, reference.status);
    if (index === 0) {
      assert.equal(bank.status, "published");
      assert.equal(bank.items.length, 50);
    } else {
      assert.equal(bank.status, "awaiting_content");
      assert.deepEqual(bank.items, []);
    }
  }
  assert.deepEqual(
    parcours.lessons.filter((entry) => entry.status === "published").map((entry) => entry.id),
    ["dea-p01-l01"],
  );
});

test("chaque leçon directe référence des compétences existantes", () => {
  for (const entry of manifest.entries) {
    const competencyIds =
      entry.competencyIds.length > 0
        ? entry.competencyIds
        : (entry.contentPool?.sourceLessonIds.flatMap(
            (sourceId) =>
              manifest.entries.find((candidate) => candidate.id === sourceId)?.competencyIds ?? [],
          ) ?? []);
    assert.ok(competencyIds.length > 0, entry.id);
    for (const competencyId of competencyIds) {
      assert.doesNotThrow(() => knowledge.get(competencyId), `${entry.id} -> ${competencyId}`);
    }
  }
});

test("le quiz sélectionne 20 à 30 exercices dans plusieurs banques sans doublon", () => {
  const quiz = manifest.entries.find((entry) => entry.id === "dea-p01-quiz")!;
  const origins = new Map<string, string>();
  const sources = quiz.contentPool!.sourceLessonIds.map((lessonId, index) => {
    const items = lessonOneInteractions.slice(index * 5, index * 5 + 5);
    for (const item of items) origins.set(item.id, lessonId);
    return { lessonId, items };
  });
  sources[1]!.items.push(sources[0]!.items[0]!);

  const selected = selectContentPoolItems(sources, quiz.contentPool!, 20, () => 0.42);
  assert.equal(selected.length, 20);
  assert.equal(new Set(selected.map((item) => item.id)).size, 20);
  assert.ok(new Set(selected.map((item) => origins.get(item.id))).size > 1);
  assert.throws(() => selectContentPoolItems(sources, quiz.contentPool!, 19));
  assert.throws(() => selectContentPoolItems(sources, quiz.contentPool!, 31));
});

test("la révision réutilise les neuf banques sans imposer de questions dupliquées", () => {
  const review = manifest.entries.find((entry) => entry.id === "dea-p01-l10")!;
  assert.deepEqual(
    review.contentPool?.sourceLessonIds,
    manifest.entries.slice(0, 9).map((entry) => entry.id),
  );
  assert.equal(review.contentPool?.deduplicateBy, "id");
  assert.equal(review.contentPool?.futurePriority, "least_mastered");
});

test("la banque de la leçon 1 est strictement conservée", () => {
  assert.deepEqual(lessonOneInput, archivedBankInput);
  assert.equal(lessonOne.items.length, 50);
});
