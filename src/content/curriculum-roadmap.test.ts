import assert from "node:assert/strict";
import test from "node:test";

import formationInput from "./formations/dea/formation.json" with { type: "json" };
import { FormationCatalog } from "./formation-catalog.ts";
import { buildOfficialRoadmap } from "./curriculum-roadmap.ts";

const formation = new FormationCatalog([formationInput]).getFormation("dea");
const roadmap = buildOfficialRoadmap(formation);
const parcours = roadmap.flatMap((bloc) => bloc.parcours);

test("la feuille de route visible expose les 15 blocs et les 75 parcours officiels", () => {
  assert.equal(roadmap.length, 15);
  assert.equal(parcours.length, 75);
  assert.deepEqual(
    parcours.map((item) => item.order),
    Array.from({ length: 75 }, (_, index) => index + 1),
  );
  assert.deepEqual(
    parcours.slice(0, 3).map((item) => item.title),
    ["Découvrir le corps humain", "Langage médical", "Anatomie générale"],
  );
});

test("les banques publiées ou en révision deviennent testables dans la feuille de route", () => {
  assert.deepEqual(
    parcours[0]?.publishedLessons.map((lesson) => lesson.id),
    [
      "dea-p01-l01",
      "dea-p01-l02",
      "dea-p01-l03",
      "dea-p01-l04",
      "dea-p01-l05",
      "dea-p01-l06",
      "dea-p01-l07",
      "dea-p01-l08",
      "dea-p01-boss",
    ],
  );
  assert.equal(parcours[0]?.plannedLessonCount, 8);
  assert.equal(parcours[0]?.publishedLessonCount, 8);
  assert.equal(parcours[1]?.plannedLessonCount, 8);
  assert.equal(parcours[1]?.publishedLessonCount, 8);
  assert.equal(parcours[2]?.publishedLessonCount, 7);
});
