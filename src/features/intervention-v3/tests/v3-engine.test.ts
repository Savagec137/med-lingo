import assert from "node:assert/strict";
import test from "node:test";
import { playableActions } from "../actions/action-catalog.ts";
import { applyAction } from "../engine/apply-action.ts";
import {
  calculateBilanGaps,
  equipmentBlockedFactIds,
  regulatorQuestionsForSession,
} from "../engine/v3-gaps.ts";
import { advanceV3Phase } from "../engine/v3-phases.ts";
import { readFact } from "../facts/read-fact.ts";
import { revealFacts } from "../facts/reveal-fact.ts";
import { PILOT_SCENARIO_ID, getV3Scenario } from "../scenarios/v3-catalog.ts";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import type { InterventionPhase, InterventionSession } from "../v3-domain.ts";

const scenario = getV3Scenario(PILOT_SCENARIO_ID);

const activeAt = (phase: InterventionPhase): InterventionSession => ({
  ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
  phase,
  status: "active" as const,
});

test("applyAction révèle et fige les facts attendus", () => {
  const initial = activeAt("vitals");
  const result = applyAction(initial, "action.poser-saturometre");
  assert.equal(result.classification, "valid");
  assert.deepEqual(result.logEntry.revealedFactIds, ["fact.spo2", "fact.fc"]);
  assert.equal(readFact(result.session, "fact.spo2").status, "known");
  assert.equal(result.session.simulatedTimeSeconds, 30);
  assert.equal(
    result.session.equipment.find((entry) => entry.id === "saturometre")?.attached,
    true,
  );
});

test("une action impossible est journalisée sans consommer de temps", () => {
  const initial = activeAt("vitals");
  const result = applyAction(initial, "action.retirer-saturometre");
  assert.equal(result.classification, "impossible");
  assert.equal(result.logEntry.outcome, "refused");
  assert.match(result.reason ?? "", /pas posé/);
  assert.equal(result.session.simulatedTimeSeconds, initial.simulatedTimeSeconds);
  assert.equal(result.session.score, initial.score);
  assert.equal(result.session.actionLog.length, 1);
});

test("approcher sans sécuriser reste possible mais fautif", () => {
  const initial = activeAt("scene_assessment");
  const result = applyAction(initial, "action.approcher-patient");
  assert.equal(result.classification, "fault");
  assert.equal(result.logEntry.outcome, "unjustified");
  assert.equal(result.logEntry.flag, "unsafe-approach");
  assert.equal(result.session.simulatedTimeSeconds, 30);
  assert.equal(result.session.lives, initial.lives - 1);
  assert.equal(readFact(result.session, "fact.conscience-qualitative").status, "known");
});

test("une faute non grave consomme du temps sans retirer de vie", () => {
  const result = applyAction(activeAt("patient_assessment"), "action.interroger-patient");
  assert.equal(result.classification, "fault");
  assert.equal(result.session.simulatedTimeSeconds, 45);
  assert.equal(result.logEntry.flag, "interview-before-assessment");
  assert.equal(result.session.lives, 5);
});

test("une mesure reste figée alors que le moteur clinique évolue", () => {
  let session: InterventionSession = activeAt("vitals");
  session = applyAction(session, "action.poser-saturometre").session;
  const first = readFact(session, "fact.fc");
  assert.equal(first.status, "known");
  const frozen =
    first.status === "known" && first.value.kind === "numeric" ? first.value.value : -1;
  session = applyAction(session, "action.interroger-patient").session;
  const second = readFact(session, "fact.fc");
  assert.equal(second.status, "known");
  assert.notEqual(session.vitals.hr, frozen);
  if (second.status === "known" && second.value.kind === "numeric")
    assert.equal(second.value.value, frozen);
});

test("une mesure stale redevient un trou de bilan", () => {
  let session: InterventionSession = activeAt("vitals");
  session = applyAction(session, "action.prendre-tension").session;
  session = { ...session, simulatedTimeSeconds: session.simulatedTimeSeconds + 301 };
  assert.equal(
    calculateBilanGaps(session, scenario).find((gap) => gap.factId === "fact.ta")?.kind,
    "stale",
  );
});

test("le bilan distingue les facts bloqués par le matériel", () => {
  const session: InterventionSession = {
    ...createV3Session(scenario),
    phase: "vitals",
    status: "active",
  };
  const blocked = equipmentBlockedFactIds(session, scenario);
  assert.ok(blocked.includes("fact.ta"));
  assert.ok(blocked.includes("fact.spo2"));
  assert.ok(blocked.includes("fact.glycemie"));
});

test("un bilan complet ne déclenche aucune question du régulateur", () => {
  let session: InterventionSession = activeAt("vitals");
  session = revealFacts(session, scenario.expectedHandoverFactIds, "action.test");
  assert.deepEqual(regulatorQuestionsForSession(session, scenario), []);
});

test("un bilan sans TA déclenche la question exacte sur la tension", () => {
  let session: InterventionSession = activeAt("vitals");
  session = revealFacts(
    session,
    scenario.expectedHandoverFactIds.filter((factId) => factId !== "fact.ta"),
    "action.test",
  );
  const questions = regulatorQuestionsForSession(session, scenario);
  assert.equal(questions.length, 1);
  assert.equal(questions[0]?.id, "question.tension");
  assert.equal(questions[0]?.text, "Avez-vous pris la tension ?");
});

test("les questions douleur, antécédents et perte de connaissance sont pilotées par les gaps", () => {
  let session: InterventionSession = activeAt("vitals");
  const absent = new Set(["fact.eva", "fact.antecedents", "fact.pci"]);
  session = revealFacts(
    session,
    scenario.expectedHandoverFactIds.filter((factId) => !absent.has(factId)),
    "action.test",
  );
  assert.deepEqual(
    new Set(regulatorQuestionsForSession(session, scenario).map((question) => question.id)),
    new Set(["question.douleur", "question.antecedents", "question.perte-de-connaissance"]),
  );
});

test("les dix phases s'enchaînent sans saut", () => {
  let session: InterventionSession = createV3Session(scenario, {
    preparedEquipment: ALL_EQUIPMENT,
  });
  session = advanceV3Phase(session).session;
  assert.equal(session.phase, "arrival");
  session = applyAction(session, "action.securiser-scene").session;
  session = advanceV3Phase(session).session;
  assert.equal(session.phase, "scene_assessment");
  session = applyAction(session, "action.approcher-patient").session;
  session = advanceV3Phase(session).session;
  assert.equal(session.phase, "patient_assessment");
  session = advanceV3Phase(session).session;
  assert.equal(session.phase, "vitals");
  session = applyAction(session, "action.appeler-centre15").session;
  assert.equal(session.phase, "centre15_call");
  session = applyAction(session, "action.transmettre-bilan").session;
  assert.equal(session.phase, "priority_actions");
  session = applyAction(session, "action.choisir-gestes-prioritaires").session;
  assert.equal(session.phase, "reevaluation");
  session = applyAction(session, "action.reevaluer-patient").session;
  session = applyAction(session, "action.preparer-transport").session;
  assert.equal(session.phase, "transport");
  session = advanceV3Phase(session).session;
  assert.equal(session.phase, "debrief");
  assert.equal(session.status, "debrief");
});

test("aucun geste hors champ DEA ne figure parmi les actions jouables", () => {
  assert.equal(
    playableActions().some((action) => action.outOfScope),
    false,
  );
  assert.equal(
    playableActions().some((action) =>
      /inject|perfus|voie veineuse|cathéter|seringue/i.test(`${action.label} ${action.hint}`),
    ),
    false,
  );
});
