import assert from "node:assert/strict";
import test from "node:test";
import charterInput from "./medlingo-charter.json" with { type: "json" };
import formationInput from "./formations/dea/formation.json" with { type: "json" };
import { CONTENT_DIFFICULTIES, CONTENT_TYPES } from "./content-domain.ts";
import { parseFormationDefinition } from "./learning-schema.ts";
import { parseMedlingoOfficialCharter } from "./medlingo-charter-schema.ts";
import { CHEST_TIERS, RARITIES } from "../features/gamification/domain.ts";

const charter = parseMedlingoOfficialCharter(charterInput);
const formation = parseFormationDefinition(formationInput);

const EXPECTED_BLOC_COUNTS = [3, 8, 2, 2, 3, 6, 9, 5, 5, 7];

test("la charte officielle couvre exactement le contrat actuel du moteur", () => {
  assert.equal(charter.id, "medlingo-official-charter");
  assert.equal(formation.charterId, charter.id);
  assert.deepEqual(
    charter.exerciseTypes.map((exercise) => exercise.id),
    [...CONTENT_TYPES],
  );
  assert.deepEqual(
    charter.difficultyLevels.map((difficulty) => difficulty.id),
    [...CONTENT_DIFFICULTIES],
  );
  assert.deepEqual(charter.chests.rarities, [...RARITIES]);
  assert.deepEqual(
    charter.chests.tiers.map((tier) => tier.id),
    [...CHEST_TIERS],
  );
});

test("la feuille de route DEA contient 10 blocs et 50 parcours uniques", () => {
  assert.equal(formation.blocs?.length, 10);
  assert.equal(formation.parcours.length, 50);
  assert.equal(new Set(formation.parcours.map((parcours) => parcours.id)).size, 50);
  assert.deepEqual(
    formation.parcours.map((parcours) => parcours.order),
    Array.from({ length: 50 }, (_, index) => index + 1),
  );

  const counts = formation.blocs?.map(
    (bloc) => formation.parcours.filter((parcours) => parcours.blocId === bloc.id).length,
  );
  assert.deepEqual(counts, EXPECTED_BLOC_COUNTS);
});

test("les contenus actifs existants sont conservés et les nouveaux parcours restent invisibles", () => {
  assert.equal(formation.parcours[0]?.lessons.length, 12);
  assert.equal(formation.parcours[1]?.lessons.length, 13);
  assert.equal(formation.parcours[0]?.lessons[0]?.id, "dea-p01-l01");
  assert.equal(formation.parcours[0]?.lessons[2]?.id, "dea-p01-l03");
  assert.equal(formation.parcours[1]?.lessons[0]?.id, "dea-p02-l01");
  assert.equal(formation.parcours[1]?.lessons.at(-1)?.id, "dea-p02-l13");
  assert.ok(formation.parcours.slice(2).every((parcours) => parcours.lessons.length === 0));
});

test("les seuils de réussite, le SRS et les récompenses sont déterministes", () => {
  assert.deepEqual(
    charter.progression.stars.map((entry) => entry.minimumAccuracy),
    [0, 0.5, 0.75, 0.95],
  );
  assert.equal(charter.progression.successCriteria.lessonMinimumAccuracy, 0.5);
  assert.equal(charter.progression.successCriteria.quizMinimumAccuracy, 0.75);
  assert.equal(charter.progression.successCriteria.bossMinimumAccuracy, 0.8);
  assert.deepEqual(charter.srs.scheduleDays, [1, 3, 7, 14, 30, 90]);
  assert.deepEqual(charter.rewards.lesson.xpMultiplierByStars, {
    "0": 0.4,
    "1": 0.6,
    "2": 0.8,
    "3": 1,
  });
  assert.equal(charter.rewards.lesson.coinsBase, 5);
  assert.equal(charter.rewards.lesson.coinsPerStar, 5);
});
