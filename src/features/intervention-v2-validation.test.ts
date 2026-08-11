import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { INTERVENTION_SCENARIOS } from "./intervention-official-scenarios.ts";
import {
  findOutOfScopeRecommendedActions,
  isClinicalVitalWithinDisplayBounds,
  replayInterventionScenario,
} from "./intervention-v2-validation.ts";

test("les 15 scénarios passent les parcours idéal, moyen et catastrophique", () => {
  assert.equal(INTERVENTION_SCENARIOS.length, 15);

  for (const scenario of INTERVENTION_SCENARIOS) {
    const ideal = replayInterventionScenario(scenario, "ideal");
    const average = replayInterventionScenario(scenario, "average");
    const catastrophic = replayInterventionScenario(scenario, "catastrophic");

    assert.notEqual(ideal.clinicalState.outcome, "failed", `${scenario.id}: idéal en échec`);
    assert.notEqual(average.clinicalState.outcome, "failed", `${scenario.id}: moyen en échec`);
    assert.equal(catastrophic.clinicalState.outcome, "failed", `${scenario.id}: échec absent`);
    assert.ok(ideal.finalState > ideal.initialState, `${scenario.id}: aucune amélioration idéale`);
    assert.ok(
      catastrophic.finalState < catastrophic.initialState,
      `${scenario.id}: aucune aggravation catastrophique`,
    );
    assert.ok(ideal.missionResult.xp > average.missionResult.xp, `${scenario.id}: XP non graduée`);
    assert.ok(
      ideal.missionResult.coins > average.missionResult.coins,
      `${scenario.id}: pièces non graduées`,
    );
    assert.equal(catastrophic.missionResult.xp, 0, `${scenario.id}: échec rentable en XP`);
    assert.equal(catastrophic.missionResult.coins, 0, `${scenario.id}: échec rentable en pièces`);
    assert.equal(catastrophic.missionResult.chest, undefined);
    assert.equal(catastrophic.missionResult.badge, undefined);
    assert.ok(ideal.debrief.successfulActions.length > 0);
    assert.ok(catastrophic.debrief.errors.length > 0);
    assert.ok(ideal.debrief.consequences.length > 0);
    assert.ok(ideal.debrief.knowledgeReferences.length > 0);
    for (const replay of [ideal, average, catastrophic]) {
      assert.ok(
        replay.clinicalState.vitals.every(isClinicalVitalWithinDisplayBounds),
        `${scenario.id}/${replay.strategy}: constante hors limites`,
      );
    }
  }
});

test("les références du débrief sont vérifiées, relatives et présentes dans le dépôt", () => {
  const seen = new Map<string, string>();
  for (const scenario of INTERVENTION_SCENARIOS) {
    const replay = replayInterventionScenario(scenario, "ideal");
    for (const reference of replay.debrief.knowledgeReferences) {
      seen.set(reference.id, reference.repositoryPath);
      assert.equal(reference.reviewStatus, "source_verified");
      assert.ok(reference.repositoryPath.startsWith("docs/"));
      assert.equal(/^[A-Za-z]:[\\/]/.test(reference.repositoryPath), false);
      assert.equal(reference.repositoryPath.includes("\\"), false);
      assert.ok(existsSync(resolve(reference.repositoryPath)), reference.repositoryPath);
    }
  }
  assert.ok(seen.size > 0);
});

test("aucune action recommandée n’excède explicitement le champ DEA", () => {
  const findings = INTERVENTION_SCENARIOS.flatMap((scenario) =>
    findOutOfScopeRecommendedActions(scenario).map((finding) => ({
      scenarioId: scenario.id,
      ...finding,
    })),
  );
  assert.deepEqual(findings, []);
});

test("identifier une erreur n’enregistre pas l’action dangereuse comme geste réalisé", () => {
  const scenario = INTERVENTION_SCENARIOS.find(
    (item) => item.id === "mission-03-detresse-respiratoire",
  );
  assert.ok(scenario);
  const replay = replayInterventionScenario(scenario, "ideal");
  const identified = replay.debrief.successfulActions.find((action) =>
    action.startsWith("Erreur correctement identifiée :"),
  );
  assert.ok(identified);
  assert.ok(
    replay.debrief.consequences.some(
      (entry) =>
        entry.action.startsWith("Erreur correctement identifiée :") &&
        entry.consequence.includes("n’est pas exécutée"),
    ),
  );
});
