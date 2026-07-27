import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import roadmapInput from "./formations/dea/roadmap-v2.json" with { type: "json" };
import { parseOfficialRoadmap } from "./roadmap-schema.ts";

const roadmap = parseOfficialRoadmap(roadmapInput);
const lessonBlueprints = roadmap.parcours.flatMap((parcours) => parcours.lessonBlueprints);

test("la projection officielle contient 15 blocs, 75 parcours et 75 Boss", () => {
  assert.equal(roadmap.blocks.length, 15);
  assert.equal(roadmap.parcours.length, 75);
  assert.equal(roadmap.bosses.length, 75);
  assert.equal(new Set(roadmap.blocks.map((block) => block.id)).size, 15);
  assert.equal(new Set(roadmap.parcours.map((parcours) => parcours.id)).size, 75);
  assert.equal(new Set(roadmap.bosses.map((boss) => boss.id)).size, 75);
  assert.deepEqual(
    roadmap.parcours.map((parcours) => parcours.order),
    Array.from({ length: 75 }, (_, index) => index + 1),
  );
});

test("les 600 plans de leçon sont indépendants et rattachés à un parcours", () => {
  assert.equal(lessonBlueprints.length, 600);
  assert.equal(new Set(lessonBlueprints.map((lesson) => lesson.id)).size, 600);
  assert.ok(roadmap.parcours.every((parcours) => parcours.lessonBlueprints.length > 0));
  assert.ok(
    roadmap.parcours.every(
      (parcours) => parcours.plannedLessonCount === parcours.lessonBlueprints.length,
    ),
  );
});

test("la V1 DEA et l'extension avancée restent explicitement séparées", () => {
  assert.ok(roadmap.parcours.slice(0, 50).every((parcours) => parcours.stage === "core_dea"));
  assert.ok(roadmap.parcours.slice(50).every((parcours) => parcours.stage === "advanced"));
  assert.equal(roadmap.parcours[49]?.title, "Mission Finale DEA");
  assert.equal(roadmap.parcours[50]?.title, "Insuffisance cardiaque");
  assert.equal(roadmap.stages[0]?.capstoneBossId, "dea-p50-boss");
  assert.equal(roadmap.stages[1]?.prerequisiteBossId, "dea-p50-boss");
});

test("les métadonnées absentes restent signalées sans valeur médicale inventée", () => {
  const pending = roadmap.parcours.filter(
    (parcours) => parcours.metadataStatus === "pending_specification",
  );
  assert.ok(pending.length > 0);
  assert.ok(pending.every((parcours) => parcours.pendingFields.length > 0));
  assert.equal(roadmap.source.projection, "structure_only");
  assert.equal(roadmap.source.medicalValidation, "required_before_publication");
});

test("chaque ancre de projection existe dans la spécification officielle", () => {
  const source = readFileSync(
    new URL("./formations/dea/roadmap-v2.specification.txt", import.meta.url),
    "utf8",
  );
  for (const block of roadmap.blocks) assert.ok(source.includes(block.sourceAnchor));
  for (const parcours of roadmap.parcours) assert.ok(source.includes(parcours.sourceAnchor));
});
