import assert from "node:assert/strict";
import test from "node:test";
import { applyAction } from "../engine/apply-action.ts";
import { createDebriefReport } from "../engine/v3-debrief.ts";
import { resolveGestureRound, selectGesture } from "../engine/v3-gestures.ts";
import { transmitHandover } from "../engine/v3-handover.ts";
import { readFact } from "../facts/read-fact.ts";
import { profileFromScenario } from "../physiology/clinical-profiles.ts";
import { hasPhysiologyEvent, samplePhysiology } from "../physiology/physiology-engine.ts";
import { getVisibleLiveVitals } from "../physiology/physiology-selectors.ts";
import {
  PILOT_SCENARIO_ID,
  RESPIRATORY_SCENARIO_ID,
  V3_SCENARIOS,
  getV3Scenario,
} from "../scenarios/v3-catalog.ts";
import { missionListScreenModel } from "../ui/mission-list-screen.ts";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import type { InterventionPhase, InterventionSession } from "../v3-domain.ts";

/**
 * Le deuxième scénario, et ce qu'il enseigne que le premier ne peut pas.
 *
 * Le traumatisme crânien est un patient dont **toutes les constantes sont
 * normales** : son danger est neurologique, et aucun moniteur ne le montre. La
 * détresse respiratoire est l'exact inverse — le danger est dans les chiffres,
 * il se dégrade pendant que le joueur recueille, et un geste le corrige.
 *
 * Ces tests vérifient cette complémentarité, parce qu'elle est la raison d'être
 * du second cas : un deuxième scénario qui se jouerait comme le premier ne
 * mériterait pas d'exister.
 */

const scenario = getV3Scenario(RESPIRATORY_SCENARIO_ID);

const activeAt = (phase: InterventionPhase): InterventionSession => ({
  ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
  phase,
  status: "active" as const,
});

const play = (session: InterventionSession, ...actionIds: string[]): InterventionSession =>
  actionIds.reduce((current, actionId) => applyAction(current, actionId).session, session);

/* -------------------------------------------------------------------------- */
/* Le catalogue                                                               */
/* -------------------------------------------------------------------------- */

test("le scénario respiratoire est au catalogue et branché sur son profil", () => {
  assert.ok(V3_SCENARIOS.some((entry) => entry.id === RESPIRATORY_SCENARIO_ID));
  const profile = profileFromScenario(scenario.id, scenario.clinical);
  assert.equal(profile.id, "v3_detresse_respiratoire");
  assert.equal(profile.trend, "slow_deterioration");
  assert.equal(profile.oxygenIndicated, true);
});

test("la ligne de base du scénario et celle du profil disent la même chose", () => {
  // Deux sources pour un même patient finiraient par diverger, et l'écart ne se
  // verrait que sur un chiffre affiché — c'est-à-dire trop tard.
  const profile = profileFromScenario(scenario.id, scenario.clinical);
  const baseline = scenario.clinical.baseline;
  assert.equal(profile.baselineSpO2, baseline.spo2);
  assert.equal(profile.baselineHeartRate, baseline.hr);
  assert.equal(profile.baselineRespiratoryRate, baseline.rr);
  assert.equal(profile.baselineSystolic, baseline.sbp);
  assert.equal(profile.glasgow, baseline.gcs);
});

/* -------------------------------------------------------------------------- */
/* La complémentarité des deux cas                                            */
/* -------------------------------------------------------------------------- */

test("les deux scénarios n'enseignent pas la même chose", () => {
  const trauma = getV3Scenario(PILOT_SCENARIO_ID);
  const traumaProfile = profileFromScenario(trauma.id, trauma.clinical);
  const respiratoryProfile = profileFromScenario(scenario.id, scenario.clinical);

  // Le traumatisé crânien sature normalement : l'oxygène ne corrige rien, et son
  // état ne glisse pas tout seul.
  assert.equal(traumaProfile.oxygenIndicated, false);
  assert.equal(traumaProfile.trend, "stable");
  assert.ok(traumaProfile.baselineSpO2 >= 95);

  // La détresse respiratoire est l'inverse sur les trois points.
  assert.equal(respiratoryProfile.oxygenIndicated, true);
  assert.notEqual(respiratoryProfile.trend, "stable");
  assert.ok(respiratoryProfile.baselineSpO2 < 92);
});

test("l'oxygène est recommandé ici, et ne l'était pas dans le pilote", () => {
  const oxygenIn = (scenarioId: string) =>
    getV3Scenario(scenarioId)
      .gestureRounds.flatMap((round) => round.offered)
      .find((gesture) => gesture.id === "geste.administrer-oxygene");

  assert.equal(oxygenIn(PILOT_SCENARIO_ID)?.recommended, false);
  assert.equal(oxygenIn(RESPIRATORY_SCENARIO_ID)?.recommended, true);
});

/* -------------------------------------------------------------------------- */
/* Le patient se dégrade pendant qu'on l'observe                              */
/* -------------------------------------------------------------------------- */

test("sans prise en charge, la saturation baisse et la respiration s'accélère", () => {
  const state = activeAt("vitals").physiology;
  const early = samplePhysiology(state, 60);
  const late = samplePhysiology(state, 900);

  assert.ok(late.spo2 < early.spo2, `SpO₂ ${early.spo2} → ${late.spo2}`);
  assert.ok(late.rr > early.rr, `FR ${early.rr} → ${late.rr}`);
  assert.ok(late.hr > early.hr, `FC ${early.hr} → ${late.hr}`);
});

test("la dégradation reste plausible : aucun saut d'un échantillon à l'autre", () => {
  const state = activeAt("vitals").physiology;
  for (let time = 0; time < 1800; time += 2) {
    const step = Math.abs(
      samplePhysiology(state, time + 2).spo2 - samplePhysiology(state, time).spo2,
    );
    assert.ok(step <= 2, `la SpO₂ saute de ${step} à ${time} s`);
  }
});

test("le joueur voit la dégradation, mais seulement s'il a posé le capteur", () => {
  const watched = play(activeAt("vitals"), "action.poser-saturometre");
  const start = watched.simulatedTimeSeconds;
  const first = getVisibleLiveVitals(watched, start + 10).find((entry) => entry.signal === "spo2");
  const later = getVisibleLiveVitals(watched, start + 600).find((entry) => entry.signal === "spo2");

  assert.ok(first?.numericValue !== null && later?.numericValue !== null);
  assert.ok(later!.numericValue! < first!.numericValue!, "la baisse devrait être visible");

  // Sans capteur, il n'y a rien à voir : la dégradation existe, elle ne se lit pas.
  assert.deepEqual(getVisibleLiveVitals(activeAt("vitals"), 600), []);
});

/* -------------------------------------------------------------------------- */
/* L'oxygène, de bout en bout                                                 */
/* -------------------------------------------------------------------------- */

/** Amène la session au tour de gestes, bilan transmis. */
function atGestureRound(): InterventionSession {
  const measured = play(
    activeAt("vitals"),
    "action.poser-saturometre",
    "action.compter-fr",
    "action.observer-peau",
    "action.appeler-centre15",
  );
  return { ...measured, phase: "priority_actions" };
}

test("retenir l'oxygène inscrit l'événement, et la saturation remonte", () => {
  const before = atGestureRound();
  const chosen = selectGesture(before, "round.gestes-prioritaires", "geste.administrer-oxygene");
  assert.equal(chosen.outcome, "selected");

  const resolved = resolveGestureRound(chosen.session, "round.gestes-prioritaires");
  assert.equal(hasPhysiologyEvent(resolved.session.physiology, "oxygen_started"), true);

  // La remontée est progressive : rien à la seconde suivante, un écart net à dix
  // minutes. Une correction instantanée ferait croire à un interrupteur.
  const at = resolved.session.simulatedTimeSeconds;
  const treated = samplePhysiology(resolved.session.physiology, at + 600).spo2;
  const untreated = samplePhysiology(before.physiology, at + 600).spo2;
  assert.ok(treated > untreated + 3, `sous oxygène ${treated} contre ${untreated} sans`);
});

test("le geste est justifié par ce que le joueur a mesuré, pas par le scénario", () => {
  // Sans saturation ni coloration relevées, l'oxygène reste retenable — c'est une
  // faute pédagogique, pas une impossibilité — mais il n'est plus fondé.
  const blind: InterventionSession = { ...activeAt("vitals"), phase: "priority_actions" };
  const chosen = selectGesture(blind, "round.gestes-prioritaires", "geste.administrer-oxygene");
  assert.equal(chosen.outcome, "selected");
  assert.equal(chosen.choice?.justified, false);
  assert.equal(chosen.choice?.flag, "unjustified-act");

  const informed = selectGesture(
    atGestureRound(),
    "round.gestes-prioritaires",
    "geste.administrer-oxygene",
  );
  assert.equal(informed.choice?.justified, true);
  assert.equal(informed.choice?.flag, null);
});

test("administrer un bronchodilatateur est refusé, avec son motif", () => {
  const round = atGestureRound();
  const attempt = selectGesture(
    round,
    "round.gestes-prioritaires",
    "geste.administrer-bronchodilatateur",
  );
  assert.equal(attempt.outcome, "refused");
  assert.equal(attempt.refusal?.kind, "out_of_scope");
  assert.match(attempt.refusal!.reason, /médicament/iu);
});

/* -------------------------------------------------------------------------- */
/* L'étanchéité tient sur ce scénario aussi                                   */
/* -------------------------------------------------------------------------- */

test("rien du patient n'est lisible sans action, y compris la cyanose", () => {
  const session = activeAt("vitals");
  for (const factId of [
    "fact.spo2",
    "fact.fr",
    "fact.fc",
    "fact.ta",
    "fact.temperature",
    "fact.coloration",
    "fact.antecedents",
    "fact.traitements",
    "fact.heure-debut",
  ]) {
    assert.equal(readFact(session, factId).status, "unknown", factId);
  }
});

/* -------------------------------------------------------------------------- */
/* La mission de bout en bout                                                 */
/* -------------------------------------------------------------------------- */

const ROUND = "round.gestes-prioritaires";

const EXPECTED_ITEMS = scenario.handoverItems
  .filter((item) => item.expected)
  .map((item) => item.id);

const RECOMMENDED = scenario.gestureRounds
  .flatMap((round) => round.offered)
  .filter((gesture) => gesture.recommended)
  .map((gesture) => gesture.id);

/**
 * La mission menée correctement, du départ au débriefing.
 *
 * L'ordre du recueil compte : les constantes périment en cinq minutes, et le
 * tour de gestes s'ouvre deux minutes après la transmission. Les périssables se
 * relèvent donc en dernier — c'est la même leçon que sur le scénario pilote, et
 * elle vaut ici aussi.
 */
function exemplary(): InterventionSession {
  const started = play(
    {
      ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
      phase: "arrival",
      status: "active" as const,
    },
    "action.securiser-scene",
    "action.observer-environnement",
    "action.approcher-patient",
  );
  const gathered = play(
    { ...started, phase: "vitals" },
    "action.interroger-temoin",
    "action.consulter-documents",
    "action.prendre-temperature",
    "action.observer-peau",
    "action.prendre-tension",
    "action.compter-fr",
    "action.poser-saturometre",
    "action.reevaluer-patient",
  );
  const called = play(gathered, "action.appeler-centre15");
  let session = transmitHandover(called, { itemIds: EXPECTED_ITEMS }).session;
  for (const gestureId of RECOMMENDED) session = selectGesture(session, ROUND, gestureId).session;
  return resolveGestureRound(session, ROUND).session;
}

test("la mission se joue de bout en bout et produit un débriefing complet", () => {
  const session = exemplary();
  const report = createDebriefReport({ ...session, phase: "debrief" }, scenario);

  assert.equal(report.scenarioId, RESPIRATORY_SCENARIO_ID);
  assert.ok(report.strengths.length > 0, "un parcours exemplaire doit avoir des réussites");
  assert.deepEqual(
    report.handoverReview.filter((entry) => entry.silent),
    [],
    "aucun trou ne devrait être passé sous silence",
  );
  assert.deepEqual(
    report.gestureReview.filter((entry) => entry.kind === "missing"),
    [],
    "les quatre gestes recommandés ont été retenus",
  );
  assert.ok(report.expectedConduct.length > 0);
});

test("un bilan complet ne laisse aucune constante attendue non relevée", () => {
  const report = createDebriefReport({ ...exemplary(), phase: "debrief" }, scenario);
  const missed = report.factCoverage.filter((item) => item.expected && item.state !== "measured");
  assert.deepEqual(
    missed.map((item) => item.factId),
    [],
  );
});

test("l'oxygène retenu apparaît dans la trajectoire du patient", () => {
  const session = exemplary();
  assert.equal(hasPhysiologyEvent(session.physiology, "oxygen_started"), true);
  assert.equal(hasPhysiologyEvent(session.physiology, "positioned"), true);
});

/* -------------------------------------------------------------------------- */
/* L'écran de choix de mission                                                */
/* -------------------------------------------------------------------------- */

test("la liste des missions propose les deux scénarios", () => {
  const model = missionListScreenModel();
  const ids = model.missions.map((mission) => mission.scenarioId);
  assert.ok(ids.includes(PILOT_SCENARIO_ID));
  assert.ok(ids.includes(RESPIRATORY_SCENARIO_ID));
  assert.equal(ids.length, V3_SCENARIOS.length);
});

test("la liste ne dit rien du patient", () => {
  // Ce qu'un formateur annonce avant l'exercice : la spécialité, la durée,
  // l'objectif. Ni constante, ni motif d'appel détaillé — le motif se découvre à
  // l'écran suivant, par la régulation, comme sur le terrain.
  const payload = JSON.stringify(missionListScreenModel());
  for (const forbidden of ["89", "112", "cyanos", "saturation", "Lilas"]) {
    assert.equal(
      payload.toLowerCase().includes(forbidden.toLowerCase()),
      false,
      `« ${forbidden} » ne devrait pas figurer sur une carte de mission`,
    );
  }
});
