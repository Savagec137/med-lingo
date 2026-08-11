import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { MissionResult } from "./intervention-domain.ts";
import {
  buildOfficialCatalog,
  type OfficialMissionProfile,
} from "./intervention-scenario-builder.ts";
import { AFTRAL_CASE_CATALOG, PLAYABLE_AFTRAL_CASES } from "./intervention-shift-catalog.ts";
import {
  answerShiftCall,
  applyDispatchAction,
  arriveOnScene,
  calculateShiftSummary,
  completeShiftIntervention,
  configureShiftDifficulty,
  createInterventionShift,
  departToCall,
  finishInterventionShift,
  getScenariosForSimulationLevel,
  isPersistedInterventionShift,
  randomFloat,
  requestNextShiftCall,
  selectTravelDecision,
  startInterventionShift,
  validateAftralCatalog,
} from "./intervention-shift-engine.ts";
import type {
  InterventionShiftSession,
  InterventionSimulationLevel,
} from "./intervention-shift-domain.ts";

const missionCatalog = JSON.parse(
  readFileSync(new URL("./intervention-missions.json", import.meta.url), "utf8"),
) as { missions: OfficialMissionProfile[] };
const INTERVENTION_SCENARIOS = buildOfficialCatalog(missionCatalog.missions);

function startPlayableShift(
  seed = "guard-test-seed",
  level: InterventionSimulationLevel = "beginner",
) {
  let shift = createInterventionShift(seed, 1000, level);
  shift = startInterventionShift(shift, INTERVENTION_SCENARIOS, 1100);
  shift = answerShiftCall(shift, 1200);
  for (const actionId of ["locate", "engage", "question", "advice"] as const) {
    shift = applyDispatchAction(shift, actionId, 1300);
  }
  shift = departToCall(shift, 1400);
  shift = selectTravelDecision(shift, "update-regulation", 1500);
  shift = arriveOnScene(shift, INTERVENTION_SCENARIOS, 1600);
  return shift;
}

const successfulResult: MissionResult = {
  score: 88,
  grade: "A",
  xp: 240,
  coins: 120,
  chest: "Coffre Or",
  patientState: 80,
  errors: [],
  goodDecisions: [
    {
      stepId: "one",
      phase: "primary",
      choiceId: "correct",
      choiceLabel: "Bonne priorité",
      feedback: "Correct",
      recommended: true,
      effect: { score: 10, patient: 5, timeSeconds: 20 },
    },
  ],
  elapsedSeconds: 520,
};

test("le catalogue AFTRAL contient les 20 cas reçus sans identifiant dupliqué", () => {
  assert.equal(AFTRAL_CASE_CATALOG.length, 20);
  assert.equal(new Set(AFTRAL_CASE_CATALOG.map((item) => item.id)).size, 20);
  assert.equal(PLAYABLE_AFTRAL_CASES.length, 15);
  assert.equal(
    AFTRAL_CASE_CATALOG.filter((item) => item.availability === "requires-validated-content").length,
    5,
  );
});

test("toutes les variantes AFTRAL jouables référencent un scénario officiel", () => {
  assert.deepEqual(validateAftralCatalog(INTERVENTION_SCENARIOS), []);
});

test("la génération par clé est stable et bornée", () => {
  const first = randomFloat("seed", "call:1:weather");
  assert.equal(first, randomFloat("seed", "call:1:weather"));
  assert.ok(first >= 0 && first < 1);
  assert.notEqual(first, randomFloat("seed", "call:2:weather"));
});

test("une même graine produit exactement le même premier appel", () => {
  const left = startInterventionShift(
    createInterventionShift("stable-seed", 1),
    INTERVENTION_SCENARIOS,
    2,
  );
  const right = startInterventionShift(
    createInterventionShift("stable-seed", 1),
    INTERVENTION_SCENARIOS,
    2,
  );
  assert.deepEqual(left.activeCall, right.activeCall);
});

test("les cinq niveaux limitent le nombre d’appels et le catalogue sans réécrire les scénarios", () => {
  const expectations = [
    ["beginner", 1, (stars: number) => stars <= 1],
    ["intermediate", 2, (stars: number) => stars <= 2],
    ["advanced", 3, (stars: number) => stars <= 3],
    ["critical", 4, (stars: number) => stars >= 4],
    ["full-shift", 14, () => true],
  ] as const;

  for (const [level, maxCalls, accepts] of expectations) {
    const configured = configureShiftDifficulty(createInterventionShift("levels", 1), level, 2);
    const available = getScenariosForSimulationLevel(INTERVENTION_SCENARIOS, level);
    assert.equal(configured.difficultyLevel, level);
    assert.equal(configured.maxCalls, maxCalls);
    assert.ok(available.length > 0);
    assert.ok(available.every((item) => accepts(item.difficultyStars ?? 1)));
  }
});

test("les actions de qualification sont idempotentes", () => {
  let shift = startInterventionShift(
    createInterventionShift("idempotent", 1),
    INTERVENTION_SCENARIOS,
    2,
  );
  shift = answerShiftCall(shift, 3);
  const applied = applyDispatchAction(shift, "locate", 4);
  const duplicate = applyDispatchAction(applied, "locate", 5);
  assert.strictEqual(duplicate, applied);
  assert.equal(duplicate.activeCall?.dispatchRecords.length, 1);
});

test("les transitions invalides ne sautent aucune phase", () => {
  const briefing = createInterventionShift("transitions", 1);
  assert.strictEqual(departToCall(briefing, 2), briefing);
  const ringing = startInterventionShift(briefing, INTERVENTION_SCENARIOS, 3);
  assert.strictEqual(arriveOnScene(ringing, INTERVENTION_SCENARIOS, 4), ringing);
});

test("le flux appel, qualification, trajet et arrivée démarre la mission existante", () => {
  const shift = startPlayableShift();
  assert.equal(shift.status, "mission");
  assert.equal(shift.activeCall?.missionSession?.status, "active");
  assert.ok(shift.activeCall?.missionStartedAtMs);
  assert.ok((shift.activeCall?.missionSession?.simulatedTimeSeconds ?? 0) > 0);
});

test("la fin d'une intervention n'est comptabilisée qu'une fois", () => {
  const active = startPlayableShift("complete-once");
  const scenario = INTERVENTION_SCENARIOS.find((item) => item.id === active.activeCall?.scenarioId);
  assert.ok(scenario);
  const completed = completeShiftIntervention(active, scenario, successfulResult, 2000);
  const duplicate = completeShiftIntervention(completed, scenario, successfulResult, 2100);
  assert.strictEqual(duplicate, completed);
  assert.equal(completed.stats.interventions, 1);
  assert.equal(completed.stats.xp, completed.completedInterventions[0]?.xp);
  assert.ok(completed.stats.xp < successfulResult.xp);
  assert.ok(completed.vigilance < 100);
});

test("une garde enchaîne un nouvel appel et conserve ses agrégats", () => {
  const active = startPlayableShift("next-call", "intermediate");
  const scenario = INTERVENTION_SCENARIOS.find((item) => item.id === active.activeCall?.scenarioId);
  assert.ok(scenario);
  const completed = completeShiftIntervention(active, scenario, successfulResult, 2000);
  const next = requestNextShiftCall(completed, INTERVENTION_SCENARIOS, 2100);
  assert.equal(next.status, "ringing");
  assert.equal(next.stats.interventions, 1);
  assert.notEqual(next.activeCall?.id, active.activeCall?.id);
});

test("le résumé calcule précision, temps moyen et grade", () => {
  const active = startPlayableShift("summary");
  const scenario = INTERVENTION_SCENARIOS.find((item) => item.id === active.activeCall?.scenarioId);
  assert.ok(scenario);
  const completed = completeShiftIntervention(active, scenario, successfulResult, 2000);
  const finished = finishInterventionShift(completed, 2100);
  const summary = calculateShiftSummary(finished);
  assert.equal(finished.status, "shift-summary");
  assert.equal(summary.accuracy, 100);
  assert.ok(summary.averageResponseMinutes > 0);
  assert.ok(summary.rank.length > 0);
});

test("la validation de persistance rejette un snapshot incomplet", () => {
  const valid = createInterventionShift("persisted", 1);
  assert.equal(isPersistedInterventionShift(valid), true);
  assert.equal(isPersistedInterventionShift({ schemaVersion: 1 }), false);
  assert.equal(
    isPersistedInterventionShift({ ...valid, vigilance: 120 } as InterventionShiftSession),
    false,
  );
});
