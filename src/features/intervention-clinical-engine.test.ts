import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { DecisionRecord, MissionResult } from "./intervention-domain.ts";
import {
  applyClinicalDecision,
  applyClinicalQualityToResult,
  assessClinicalHandover,
  buildClinicalDebrief,
  createClinicalPatientState,
  parseClinicalVital,
  reassessClinicalPatient,
} from "./intervention-clinical-engine.ts";
import {
  buildOfficialCatalog,
  type OfficialMissionProfile,
} from "./intervention-scenario-builder.ts";

const missionCatalog = JSON.parse(
  readFileSync(new URL("./intervention-missions.json", import.meta.url), "utf8"),
) as { missions: OfficialMissionProfile[] };
const scenarios = buildOfficialCatalog(missionCatalog.missions);

function scenario(id: string) {
  const selected = scenarios.find((candidate) => candidate.id === id);
  assert.ok(selected, `Scénario ${id} introuvable`);
  return selected;
}

function decision(
  stepId: string,
  phase: DecisionRecord["phase"],
  recommended: boolean,
  patientDelta: number,
): DecisionRecord {
  return {
    stepId,
    phase,
    choiceId: `${stepId}:${recommended ? "recommended" : "error"}`,
    choiceLabel: recommended ? "Priorité adaptée" : "Priorité retardée",
    feedback: recommended ? "Décision cohérente." : "La priorité clinique n’est pas respectée.",
    recommended,
    effect: { score: recommended ? 10 : -10, patient: patientDelta, timeSeconds: 30 },
  };
}

const baseResult: MissionResult = {
  score: 92,
  grade: "A+",
  xp: 300,
  coins: 150,
  chest: "Coffre Or",
  badge: "Prise en charge maîtrisée",
  patientState: 90,
  errors: [],
  goodDecisions: [],
  elapsedSeconds: 480,
};

test("les constantes utiles sont converties sans dépendre de leur libellé visuel", () => {
  assert.deepEqual(parseClinicalVital({ label: "FC", value: "132/min" }), {
    id: "heart-rate",
    sourceLabel: "FC",
    label: "FC",
    value: 132,
    secondaryValue: undefined,
    unit: "/min",
    initialValue: 132,
    initialSecondaryValue: undefined,
    tone: "stable",
    trend: "unknown",
    status: "measured",
  });
  const pressure = parseClinicalVital({ label: "Tension artérielle", value: "84/52" });
  assert.equal(pressure.id, "blood-pressure");
  assert.equal(pressure.value, 84);
  assert.equal(pressure.secondaryValue, 52);
  assert.equal(parseClinicalVital({ label: "SpO₂", value: "94 %" }).id, "oxygen-saturation");
  const elapsed = parseClinicalVital({ label: "Début", value: "15:42" });
  assert.equal(elapsed.id, "observation");
  assert.equal(elapsed.status, "qualitative");
});

test("une décision correcte améliore le patient et fait évoluer ses constantes numériques", () => {
  const selected = scenario("mission-03-detresse-respiratoire");
  const initial = createClinicalPatientState(selected, true);
  const record = decision("primary-good", "primary", true, 6);
  const evolved = applyClinicalDecision(initial, record, [record], true, 60);

  assert.equal(evolved.overallState, initial.overallState + 6);
  assert.equal(evolved.timeline.length, 1);
  assert.ok(evolved.timeline[0]!.vitalChanges.length > 0);
  assert.ok(["improving", "stabilized"].includes(evolved.outcome));
});

test("la fréquence respiratoire pédiatrique utilise la tranche d’âge du support DEA", () => {
  const selected = scenario("mission-11-enfant-febrile");
  const initial = createClinicalPatientState(selected, true);
  const respiratoryRate = initial.vitals.find((vital) => vital.id === "respiratory-rate");
  assert.equal(respiratoryRate?.value, 54);
  assert.equal(respiratoryRate?.simulationTarget, 45);
  assert.equal(respiratoryRate?.targetSourcePages, "71-72");

  const record = decision("primary-pediatric", "primary", true, 7);
  const evolved = applyClinicalDecision(initial, record, [record], true, 60);
  const nextRate = evolved.vitals.find((vital) => vital.id === "respiratory-rate");
  assert.ok(typeof nextRate?.value === "number" && nextRate.value < 54 && nextRate.value >= 45);
});

test("deux omissions critiques successives peuvent provoquer un échec réel", () => {
  const selected = scenario("mission-07-arret-cardio-respiratoire");
  const initial = createClinicalPatientState(selected, true);
  const first = decision("primary-error", "primary", false, -9);
  const afterFirst = applyClinicalDecision(initial, first, [first], true, 30);
  const second = decision("care-error", "care", false, -9);
  const afterSecond = applyClinicalDecision(afterFirst, second, [first, second], true, 60);

  assert.equal(afterSecond.outcome, "failed");
  assert.ok(afterSecond.failureReason);
  assert.deepEqual(afterSecond.criticalOmissions, ["primary", "care"]);
});

test("la surveillance répétée trace les réévaluations et actualise la transmission", () => {
  const selected = scenario("mission-02-douleur-thoracique");
  const initial = createClinicalPatientState(selected, true);
  const first = reassessClinicalPatient(initial, "secondary", "secondary-step", [], true, 45);
  const second = reassessClinicalPatient(first, "care", "care-step", [], true, 90);

  assert.equal(second.reassessmentCount, 2);
  assert.equal(second.timeline.length, 2);
  assert.equal(second.handover.fields.find((field) => field.id === "evolution")?.complete, true);
});

test("un bilan incomplet déclenche des questions ciblées du médecin régulateur", () => {
  const primary = decision("primary-good", "primary", true, 5);
  const handover = assessClinicalHandover([primary], 0, true, "improving");

  assert.ok(handover.completeness < 100);
  assert.ok(handover.regulatorQuestions.some((question) => question.includes("constantes")));
  assert.equal(handover.finalDecision, "regulation-required");
});

test("une mauvaise prise en charge n’est plus rentable", () => {
  const selected = scenario("mission-07-arret-cardio-respiratoire");
  const first = decision("primary-error", "primary", false, -9);
  const second = decision("care-error", "care", false, -9);
  let state = createClinicalPatientState(selected, true);
  state = applyClinicalDecision(state, first, [first], true, 30);
  state = applyClinicalDecision(state, second, [first, second], true, 60);
  const adjusted = applyClinicalQualityToResult(baseResult, state);

  assert.equal(state.outcome, "failed");
  assert.ok(adjusted.result.xp < baseResult.xp / 4);
  assert.ok(adjusted.result.coins < baseResult.coins / 4);
  assert.equal(adjusted.result.chest, undefined);
  assert.equal(adjusted.result.badge, undefined);
  assert.ok(adjusted.result.score < 40);
});

test("le débrief relie les décisions, les conséquences et des sources vérifiées", () => {
  const selected = scenario("mission-03-detresse-respiratoire");
  const record = decision("primary-good", "primary", true, 6);
  const state = applyClinicalDecision(
    createClinicalPatientState(selected, true),
    record,
    [record],
    true,
    60,
  );
  const debrief = buildClinicalDebrief(selected, { ...baseResult, goodDecisions: [record] }, state);

  assert.deepEqual(debrief.successfulActions, [record.choiceLabel]);
  assert.equal(debrief.consequences.length, 1);
  assert.ok(debrief.pulseLessons.length > 0);
  assert.ok(debrief.knowledgeReferences.length > 0);
  assert.ok(
    debrief.knowledgeReferences.every((reference) => reference.reviewStatus === "source_verified"),
  );
});
