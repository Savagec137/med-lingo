import assert from "node:assert/strict";
import test from "node:test";

import formationInput from "./formations/dea/formation.json" with { type: "json" };
import { FormationCatalog } from "./formation-catalog.ts";
import { buildOfficialRoadmap } from "./curriculum-roadmap.ts";

const formation = new FormationCatalog([formationInput]).getFormation("dea");
const roadmap = buildOfficialRoadmap(formation);
const parcours = roadmap.flatMap((bloc) => bloc.parcours);

test("la feuille de route visible expose les 10 blocs et les 50 parcours officiels", () => {
  assert.equal(roadmap.length, 10);
  assert.equal(parcours.length, 50);
  assert.deepEqual(
    parcours.map((item) => item.order),
    Array.from({ length: 50 }, (_, index) => index + 1),
  );
  assert.deepEqual(
    parcours.slice(0, 3).map((item) => item.title),
    ["Découvrir le corps humain", "Langage médical", "Anatomie générale"],
  );
});

test("seules les leçons publiées deviennent jouables dans la feuille de route", () => {
  assert.deepEqual(
    parcours[0]?.publishedLessons.map((lesson) => lesson.id),
    ["dea-p01-l01", "dea-p01-l03"],
  );
  assert.equal(parcours[0]?.plannedLessonCount, 12);
  assert.equal(parcours[1]?.plannedLessonCount, 13);
  assert.equal(parcours[1]?.publishedLessonCount, 0);
  assert.ok(parcours.slice(2).every((item) => item.publishedLessonCount === 0));
});
