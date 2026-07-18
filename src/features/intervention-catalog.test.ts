import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { INTERVENTION_PHASES } from "./intervention-domain.ts";
import {
  buildOfficialCatalog,
  type OfficialMissionProfile,
} from "./intervention-scenario-builder.ts";

const catalog = JSON.parse(
  readFileSync(new URL("./intervention-missions.json", import.meta.url), "utf8"),
) as { missions: OfficialMissionProfile[] };
const scenarios = buildOfficialCatalog(catalog.missions);

test("le catalogue officiel contient 15 missions uniques et ordonnées", () => {
  assert.equal(scenarios.length, 15);
  assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, 15);
  assert.equal(scenarios[0]?.title, "Malaise à domicile");
  assert.equal(scenarios[14]?.title, "Intervention complexe");
});

test("chaque mission suit les huit phases du moteur existant", () => {
  for (const scenario of scenarios) {
    assert.deepEqual(
      scenario.steps.map((step) => step.phase),
      [...INTERVENTION_PHASES],
      scenario.title,
    );
    assert.ok(scenario.minimumLevel && scenario.minimumLevel >= 1);
    assert.ok(scenario.difficultyStars && scenario.difficultyStars >= 1);
    assert.ok(scenario.difficultyStars && scenario.difficultyStars <= 5);
    assert.ok(scenario.baseXp > 0);
    assert.ok(scenario.reward.coins > 0);
  }
});

test("la première mission est libre et chaque suivante dépend de la précédente", () => {
  assert.equal(scenarios[0]?.unlockAfter, undefined);
  for (let index = 1; index < scenarios.length; index += 1) {
    assert.equal(scenarios[index]?.unlockAfter, scenarios[index - 1]?.id);
  }
});

test("la mission 7 respecte l'alerte et le parcours arrêt cardio-respiratoire", () => {
  const acr = scenarios.find((scenario) => scenario.id === "mission-07-arret-cardio-respiratoire");
  assert.ok(acr);
  assert.deepEqual(
    {
      patient: acr.alert.patient,
      age: acr.alert.age,
      reason: acr.alert.reason,
      elapsed: acr.alert.elapsed,
      distance: acr.alert.distance,
      priority: acr.alert.priority,
    },
    {
      patient: "Homme",
      age: "64 ans",
      reason: "Arrêt cardio-respiratoire",
      elapsed: "3 minutes",
      distance: "4,2 km",
      priority: "Urgence absolue",
    },
  );
  const missionText = JSON.stringify(acr);
  assert.match(missionText, /appel du SAMU/i);
  assert.match(missionText, /départ de l'ambulance/i);
  assert.match(missionText, /RCP/);
  assert.match(missionText, /DAE/);
  assert.match(missionText, /transmission/i);
  assert.match(missionText, /transport/i);
});
