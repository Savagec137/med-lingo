import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import deaFormation from "./formations/dea/formation.json" with { type: "json" };
import { FormationCatalog } from "./formation-catalog.ts";
import { LessonContentRepository } from "./lesson-content-repository.ts";
import { lessonXpForResult } from "./learning-rewards.ts";
import { parseLessonContentFile } from "./learning-schema.ts";
import { selectContentItems } from "./lesson-runtime.ts";

const DEA_FORMATION = new FormationCatalog([deaFormation]).getFormation("dea");

const PARCOURS_01_TITLES = [
  "Pourquoi apprendre l'anatomie ?",
  "Cellules et tissus",
  "Les organes",
  "Les systèmes du corps",
  "La position anatomique",
  "Les plans anatomiques",
  "L’orientation anatomique",
  "Les régions du corps",
  "Les repères anatomiques en intervention",
  "Révision du corps humain",
  "Quiz final — Découvrir le corps humain",
  "Boss — Localiser et transmettre",
];

const PARCOURS_02_TITLES = [
  "Construire un mot médical",
  "Préfixes",
  "Préfixes quantité",
  "Préfixes position",
  "Suffixes",
  "Suffixes pathologie",
  "Suffixes chirurgie",
  "Radicaux",
  "Radicaux organes",
  "Radicaux tissus",
  "Décoder un mot complexe",
  "Quiz",
  "Boss",
];

function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...allKeys(child)]);
}

test("la formation DEA expose les 50 parcours officiels dans le nouvel ordre", () => {
  assert.equal(DEA_FORMATION.parcours.length, 50);
  assert.deepEqual(
    DEA_FORMATION.parcours.map((parcours) => parcours.order),
    Array.from({ length: 50 }, (_, index) => index + 1),
  );
  assert.equal(DEA_FORMATION.parcours[0]?.title, "Découvrir le corps humain");
  assert.equal(DEA_FORMATION.parcours[49]?.title, "Cas cliniques complets DEA (Boss final)");
});

test("les parcours 1 et 2 possèdent les leçons, quiz et boss demandés", () => {
  assert.deepEqual(
    DEA_FORMATION.parcours[0]?.lessons.map((lesson) => lesson.title),
    PARCOURS_01_TITLES,
  );
  assert.deepEqual(
    DEA_FORMATION.parcours[1]?.lessons.map((lesson) => lesson.title),
    PARCOURS_02_TITLES,
  );
  assert.equal(DEA_FORMATION.parcours[0]?.lessons.at(-2)?.kind, "quiz");
  assert.equal(DEA_FORMATION.parcours[0]?.lessons.at(-1)?.kind, "boss");
  assert.equal(DEA_FORMATION.parcours[0]?.lessons[9]?.kind, "review");
  assert.equal(DEA_FORMATION.parcours[1]?.lessons.at(-2)?.kind, "quiz");
  assert.equal(DEA_FORMATION.parcours[1]?.lessons.at(-1)?.kind, "boss");
});

test("chaque leçon possède un JSON indépendant sans unit ni chapter", () => {
  const publishedItemCounts = new Map([
    ["dea-p01-l01", 50],
    ["dea-p01-l03", 50],
  ]);
  for (const parcours of DEA_FORMATION.parcours.slice(0, 2)) {
    for (const reference of parcours.lessons) {
      const url = new URL(`./formations/dea/${reference.file}`, import.meta.url);
      const raw = JSON.parse(readFileSync(url, "utf8")) as unknown;
      const lesson = parseLessonContentFile(raw);
      assert.equal(lesson.id, reference.id);
      assert.equal(lesson.parcours, parcours.id);
      assert.equal(lesson.title, reference.title);
      if (publishedItemCounts.has(lesson.id)) {
        assert.equal(lesson.status, "published");
        assert.equal(lesson.items.length, publishedItemCounts.get(lesson.id));
        assert.deepEqual(lesson.selection, { strategy: "random", count: 10 });
        if (lesson.id === "dea-p01-l01") {
          assert.equal(reference.specificationFile, "parcours-01/lesson-01.specification.json");
        }
      } else {
        assert.equal(lesson.status, "awaiting_content");
        assert.deepEqual(lesson.items, []);
      }
      const keys = allKeys(raw);
      assert.equal(keys.includes("unit"), false, reference.file);
      assert.equal(keys.includes("chapter"), false, reference.file);
    }
  }
});

test("une banque vide ou incomplète ne peut jamais être publiée", () => {
  const draftUrl = new URL("./formations/dea/parcours-01/lesson-01.json", import.meta.url);
  const draft = JSON.parse(readFileSync(draftUrl, "utf8")) as Record<string, unknown>;
  assert.throws(() => parseLessonContentFile({ ...draft, status: "published", items: [] }));
});

test("le dépôt charge une banque publiée une seule fois et la conserve en cache", async () => {
  const published = {
    schemaVersion: 2,
    formation: "test",
    parcours: "parcours-01",
    id: "test-p01-l01",
    title: "Leçon validée",
    kind: "lesson",
    status: "published",
    difficulty: "easy",
    estimatedMinutes: 3,
    level: 1,
    xp: 20,
    tags: ["validation"],
    pedagogicalReference: "Banque validée",
    pulse: null,
    selection: { strategy: "all", count: null },
    items: [
      {
        id: "test-question-01",
        difficulty: "easy",
        type: "mcq",
        question: "Question validée ?",
        answers: [
          { id: "answer-a", text: "Réponse A", explanation: "Feedback A" },
          { id: "answer-b", text: "Réponse B", explanation: "Feedback B" },
        ],
        correctAnswer: "answer-b",
        explanation: "Explication validée",
        tags: ["validation"],
        competencyIds: ["test.competency"],
      },
    ],
  };
  const catalog = new FormationCatalog([
    {
      schemaVersion: 2,
      id: "test",
      title: "Formation test",
      parcours: [
        {
          id: "parcours-01",
          order: 1,
          title: "Parcours test",
          subtitle: "Validation",
          theme: "blue",
          lessons: [
            {
              id: "test-p01-l01",
              title: "Leçon validée",
              kind: "lesson",
              status: "published",
              file: "parcours-01/lesson-01.json",
            },
          ],
        },
      ],
    },
  ]);
  let calls = 0;
  const repository = new LessonContentRepository(catalog, {
    "test/parcours-01/lesson-01.json": async () => {
      calls += 1;
      return published;
    },
  });

  const first = await repository.load("test", "test-p01-l01");
  const second = await repository.load("test", "test-p01-l01");
  assert.equal(calls, 1);
  assert.equal(first, second);
  assert.equal(first.interactions[0]?.metadata?.parcours, "parcours-01");
});

test("la sélection de questions respecte la politique JSON", () => {
  const items = Array.from({ length: 10 }, (_, index) => ({ id: `question-${index}` })) as never[];
  const selected = selectContentItems(items, { strategy: "random", count: 5 }, () => 0.25);
  assert.equal(selected.length, 5);
  assert.equal(new Set(selected.map((item) => item.id)).size, 5);
});

test("les anciennes récompenses XP restent inchangées et les nouvelles utilisent le JSON", () => {
  assert.deepEqual(
    [0, 1, 2, 3].map((stars) => lessonXpForResult(stars)),
    [10, 15, 20, 25],
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((stars) => lessonXpForResult(stars, 50)),
    [20, 30, 40, 50],
  );
});
