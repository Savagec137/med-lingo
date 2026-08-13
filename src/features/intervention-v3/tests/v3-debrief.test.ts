import assert from "node:assert/strict";
import test from "node:test";
import { applyAction } from "../engine/apply-action.ts";
import { createDebriefReport } from "../engine/v3-debrief.ts";
import { rewardFromPerformance, scoreFromActionLog } from "../engine/v3-scoring.ts";
import { formatGlycemiaForUi } from "../format-glycemia.ts";
import { readFact } from "../facts/read-fact.ts";
import { revealFacts } from "../facts/reveal-fact.ts";
import { PILOT_SCENARIO_ID, getV3Scenario } from "../scenarios/v3-catalog.ts";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";

const scenario = getV3Scenario(PILOT_SCENARIO_ID);

test("DebriefReport reflète uniquement l'actionLog réel", () => {
  const initial = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "scene_assessment" as const,
    status: "active" as const,
  };
  const session = applyAction(initial, "action.approcher-patient").session;
  const report = createDebriefReport(session, scenario);
  assert.equal(report.score, scoreFromActionLog(session.actionLog));
  assert.equal(report.criticalErrorCount, 1);
  assert.equal(report.livesRemaining, 4);
  assert.ok(report.review.some((entry) => /Approcher le patient/.test(entry.label)));
  assert.equal(report.totalSeconds, 30);

  const tampered = revealFacts(
    {
      ...session,
      score: 100,
      lives: 5,
      patientState: 100,
      xpBonus: 10_000,
      rewardBonus: 10_000,
      equipment: session.equipment.map((entry) => ({
        ...entry,
        prepared: !entry.prepared,
      })),
    },
    scenario.expectedHandoverFactIds,
    "action.test",
  );
  assert.deepEqual(createDebriefReport(tampered, scenario), report);
});

test("les vies ne diminuent que sur une faute grave", () => {
  const initial = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "patient_assessment" as const,
    status: "active" as const,
  };
  const nonGrave = applyAction(initial, "action.interroger-patient").session;
  assert.equal(nonGrave.lives, 5);

  const grave = applyAction(
    { ...initial, phase: "scene_assessment" as const },
    "action.approcher-patient",
  ).session;
  assert.equal(grave.lives, 4);
});

test("un échec n'est jamais profitable", () => {
  const initial = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "scene_assessment" as const,
    status: "active" as const,
  };
  const failed = applyAction(initial, "action.approcher-patient").session;
  const reward = rewardFromPerformance(scenario, failed);
  assert.equal(reward.rewardFactor, 0);
  assert.equal(reward.xp, 0);
  assert.equal(reward.coins, 0);
  assert.equal(createDebriefReport(failed, scenario).passed, false);
});

test("la glycémie reste en mmol/L dans le moteur et s'affiche en g/L sans interprétation", () => {
  const initial = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "vitals" as const,
    status: "active" as const,
  };
  const session = applyAction(initial, "action.faire-glycemie").session;
  const read = readFact(session, "fact.glycemie");
  assert.equal(read.status, "known");
  assert.equal(session.vitals.glycemia, 5.4);
  if (read.status === "known" && read.value.kind === "numeric") {
    assert.equal(read.value.value, 5.4);
    assert.equal(read.value.formatted, formatGlycemiaForUi(5.4));
    assert.match(read.value.formatted, /g\/L$/);
    assert.doesNotMatch(read.value.formatted, /normal|bas|haut|hypo|hyper/i);
  }
});
