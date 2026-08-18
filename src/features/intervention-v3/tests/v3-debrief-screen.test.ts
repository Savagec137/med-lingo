import assert from "node:assert/strict";
import test from "node:test";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import type { InterventionSession, PlayerActionId } from "../v3-domain.ts";
import { applyAction } from "../engine/apply-action.ts";
import { createDebriefReport } from "../engine/v3-debrief.ts";
import { commitGestureRound, transmitHandover } from "../engine/v3-handover.ts";
import { selectGesture } from "../engine/v3-gestures.ts";
import { debriefScreenModel, formatDuration, DEBRIEF_SECTION_IDS } from "../ui/debrief-screen.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "../scenarios/v3-catalog.ts";

/**
 * Écran 7 — le débriefing.
 *
 * Deux exigences que les tests portent. D'abord l'ordre : ce qui a été bien fait
 * vient en premier, parce qu'un débriefing qui ouvre sur les fautes fait retenir
 * les fautes et laisse l'apprenant sans modèle à reproduire. Ensuite la sincérité :
 * une section vide est retirée, jamais affichée avec « aucun » — sur une mission
 * qui n'a rien transmis, « aucune erreur de transmission » serait une félicitation
 * imméritée.
 */

const scenario = getV3Scenario(PILOT_SCENARIO_ID);
const ROUND = "round.gestes-prioritaires";
const EXPECTED_ITEMS = scenario.handoverItems
  .filter((item) => item.expected)
  .map((item) => item.id);
const RECOMMENDED = scenario.gestureRounds
  .flatMap((round) => round.offered)
  .filter((gesture) => gesture.recommended)
  .map((gesture) => gesture.id);

const play = (session: InterventionSession, ...actionIds: PlayerActionId[]): InterventionSession =>
  actionIds.reduce((current, actionId) => applyAction(current, actionId).session, session);

const GATHER: readonly PlayerActionId[] = [
  "action.interroger-temoin",
  "action.consulter-documents",
  "action.faire-glycemie",
  "action.evaluer-douleur",
  "action.prendre-tension",
  "action.compter-fr",
  "action.evaluer-conscience",
  "action.poser-saturometre",
  "action.reevaluer-patient",
];

function started(): InterventionSession {
  const base: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "arrival",
    status: "active",
  };
  return play(
    base,
    "action.securiser-scene",
    "action.observer-environnement",
    "action.approcher-patient",
  );
}

/** La mission menée correctement de bout en bout. */
function exemplary(): InterventionSession {
  const called = play(
    play({ ...started(), phase: "vitals" }, ...GATHER),
    "action.appeler-centre15",
  );
  let session = transmitHandover(called, { itemIds: EXPECTED_ITEMS }).session;
  for (const gestureId of RECOMMENDED) session = selectGesture(session, ROUND, gestureId).session;
  return commitGestureRound(session, ROUND).session;
}

/** La mission bâclée : rien recueilli, rien transmis, gestes au hasard. */
function careless(): InterventionSession {
  const called = play({ ...started(), phase: "vitals" }, "action.appeler-centre15");
  let session = transmitHandover(called, { itemIds: [] }).session;
  session = selectGesture(session, ROUND, "geste.rassurer-surveiller").session;
  session = selectGesture(session, ROUND, "geste.transporter-sans-reevaluation").session;
  return commitGestureRound(session, ROUND).session;
}

const modelOf = (session: InterventionSession) =>
  debriefScreenModel(createDebriefReport(session, scenario));

/* -------------------------------------------------------------------------- */
/* L'ordre et la sincérité des sections                                       */
/* -------------------------------------------------------------------------- */

test("le débriefing ouvre sur ce qui a été bien fait", () => {
  // Un débriefing qui commence par les fautes fait retenir les fautes.
  const model = modelOf(exemplary());
  assert.equal(model.sections[0]!.id, "strengths");
  assert.equal(model.sections[0]!.tone, "positive");
  assert.ok(model.sections[0]!.entries.length >= 4);
});

test("les sections suivent l'ordre déclaré, sans en inventer une", () => {
  const model = modelOf(careless());
  const order = model.sections.map((entry) => entry.id);
  const declared = [...DEBRIEF_SECTION_IDS];
  // Chaque section affichée existe dans l'ordre déclaré, et l'ordre est respecté.
  for (const id of order) assert.ok(declared.includes(id), `section inconnue : ${id}`);
  const positions = order.map((id) => declared.indexOf(id));
  assert.deepEqual(
    positions,
    [...positions].sort((a, b) => a - b),
  );
});

test("une section sans contenu est retirée, pas affichée avec « aucun »", () => {
  // La mission exemplaire n'a ni erreur de transmission, ni geste dangereux, ni
  // geste manqué. Ces sections ne doivent pas apparaître vides.
  const model = modelOf(exemplary());
  const shown = new Set(model.sections.map((entry) => entry.id));
  assert.ok(!shown.has("handover_errors"));
  assert.ok(!shown.has("dangerous_gestures"));
  assert.ok(!shown.has("missed_gestures"));
  // Et aucune section affichée n'est vide.
  for (const entry of model.sections) {
    assert.ok(entry.entries.length > 0, `${entry.id} est affichée sans contenu`);
  }
});

test("une mission bâclée fait apparaître les sections de faute", () => {
  const model = modelOf(careless());
  const shown = new Set(model.sections.map((entry) => entry.id));
  for (const id of [
    "handover_errors",
    "dangerous_gestures",
    "missed_gestures",
    "expected_conduct",
    "revision",
  ] as const) {
    assert.ok(shown.has(id), `${id} devrait apparaître`);
  }
});

/* -------------------------------------------------------------------------- */
/* Deux oublis de nature différente                                           */
/* -------------------------------------------------------------------------- */

test("les données non recherchées et les constantes non mesurées sont séparées", () => {
  // L'une se demande au patient ou aux documents, l'autre se prend avec un
  // appareil. Les mêler priverait le débriefing de sa précision, et l'apprenant
  // ne saurait pas quoi corriger.
  const model = modelOf(careless());
  const notSought = model.sections.find((entry) => entry.id === "not_sought")!;
  const notMeasured = model.sections.find((entry) => entry.id === "not_measured")!;

  const sought = notSought.entries.map((entry) => entry.id);
  const measured = notMeasured.entries.map((entry) => entry.id);
  assert.ok(sought.includes("fact.antecedents"), `non recherchées : ${sought.join(", ")}`);
  assert.ok(sought.includes("fact.pci"));
  assert.ok(measured.includes("fact.ta"), `non mesurées : ${measured.join(", ")}`);
  assert.ok(measured.includes("fact.spo2"));

  // Aucune donnée des deux côtés à la fois.
  const overlap = sought.filter((id) => measured.includes(id));
  assert.deepEqual(overlap, []);
});

test("une donnée hors d'atteinte est distinguée d'un oubli", () => {
  // Reprocher un oubli que le joueur ne pouvait pas commettre lui apprendrait une
  // fausse leçon.
  const withoutGlucometer: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ["saturometre", "brancard"] }),
    phase: "vitals",
    status: "active",
  };
  const attempted = play(withoutGlucometer, "action.faire-glycemie");
  const model = debriefScreenModel(createDebriefReport(attempted, scenario));
  const notMeasured = model.sections.find((entry) => entry.id === "not_measured")!;
  const glycemia = notMeasured.entries.find((entry) => entry.id === "fact.glycemie")!;
  assert.match(glycemia.detail, /Hors d'atteinte/);

  const tension = notMeasured.entries.find((entry) => entry.id === "fact.ta")!;
  assert.equal(tension.detail, "Non recueillie");
});

/* -------------------------------------------------------------------------- */
/* Les gestes                                                                 */
/* -------------------------------------------------------------------------- */

test("les gestes dangereux et les gestes manqués sont dans deux sections", () => {
  const model = modelOf(careless());
  const dangerous = model.sections.find((entry) => entry.id === "dangerous_gestures")!;
  const missed = model.sections.find((entry) => entry.id === "missed_gestures")!;

  assert.ok(dangerous.entries.some((entry) => /Tenté et refusé/.test(entry.label)));
  assert.ok(dangerous.entries.some((entry) => /sans indication/.test(entry.label)));
  assert.equal(missed.entries.length, RECOMMENDED.length);
  // Chaque geste manqué porte son indice, pas un reproche vide.
  for (const entry of missed.entries) assert.ok(entry.detail.length > 0, entry.id);
});

/* -------------------------------------------------------------------------- */
/* L'en-tête et les axes                                                      */
/* -------------------------------------------------------------------------- */

test("un axe non mobilisé se dit, il ne se note pas à zéro", () => {
  // Afficher 0 % reprocherait au joueur une épreuve qu'il n'a pas passée.
  const model = modelOf(careless());
  const unassessed = model.axes.filter((axis) => axis.percentage === null);
  for (const axis of unassessed) {
    assert.equal(axis.ratingLabel, "Non évalué", axis.id);
    assert.equal(axis.rating, null, axis.id);
  }
  const assessed = model.axes.filter((axis) => axis.percentage !== null);
  assert.ok(assessed.length > 0, "au moins un axe doit être évalué");
  for (const axis of assessed) {
    assert.notEqual(axis.ratingLabel, "Non évalué", axis.id);
  }
});

test("la durée se lit en minutes, pas en secondes", () => {
  assert.equal(formatDuration(0), "0 min 00 s");
  assert.equal(formatDuration(90), "1 min 30 s");
  assert.equal(formatDuration(605), "10 min 05 s");
  const model = modelOf(exemplary());
  assert.match(model.duration, /^\d+ min \d{2} s$/);
});

test("l'en-tête reprend la note, les vies et la trajectoire", () => {
  const good = modelOf(exemplary());
  assert.equal(good.passed, true);
  assert.equal(good.failureReason, null);
  assert.ok(good.stars >= 1 && good.stars <= 5);
  assert.ok(good.globalRating.length > 0);
  assert.ok(good.trajectoryLabel !== null);
  assert.ok(good.reward.xp > 0);

  const bad = modelOf(careless());
  assert.ok(bad.score < good.score);
  assert.ok(bad.criticalErrorCount >= 0);
});

/* -------------------------------------------------------------------------- */
/* La conduite attendue et les points à réviser                               */
/* -------------------------------------------------------------------------- */

test("la conduite attendue est la même quelle que soit la partie", () => {
  // Elle décrit ce qu'il fallait faire, pas ce qui a été fait.
  const good = modelOf(exemplary()).sections.find((entry) => entry.id === "expected_conduct");
  const bad = modelOf(careless()).sections.find((entry) => entry.id === "expected_conduct")!;
  assert.ok(bad.entries.length > 0);
  if (good) assert.deepEqual(good.entries, bad.entries);
});

test("chaque point à réviser porte sa fiche", () => {
  const model = modelOf(careless());
  const revision = model.sections.find((entry) => entry.id === "revision")!;
  assert.ok(revision.entries.length > 0);
  for (const entry of revision.entries) {
    assert.ok(entry.knowledgeId, `${entry.label} sans fiche`);
    assert.ok(entry.detail.includes("·"), entry.detail);
  }
});

/* -------------------------------------------------------------------------- */
/* Étanchéité                                                                 */
/* -------------------------------------------------------------------------- */

test("le débriefing d'une mission sans relevé n'affiche aucune valeur clinique", () => {
  // La règle centrale tient jusqu'au dernier écran. Le débriefing nomme ce qui
  // manque, il ne le révèle pas.
  const model = modelOf(careless());
  const baseline = Object.values(scenario.clinical.baseline as unknown as Record<string, number>);
  const clinicalUnit = /\d\s*(%|\/min|mmHg|mmol\/L|g\/L|°C|\/15|\/10)/i;

  const fields = model.sections.flatMap((entry) => [
    entry.title,
    entry.caption,
    ...entry.entries.flatMap((item) => [item.label, item.detail]),
  ]);
  assert.ok(fields.length > 20, `seulement ${fields.length} champs contrôlés`);

  for (const field of fields) {
    assert.ok(!clinicalUnit.test(field), `valeur avec unité clinique : « ${field} »`);
    for (const value of baseline) {
      assert.ok(
        !new RegExp(`\\b${value}\\b`).test(field),
        `le débriefing laisse fuir ${value} : « ${field} »`,
      );
    }
  }
});

test("le débriefing ne reconduit pas la session vers le composant", () => {
  // Le modèle est construit depuis le rapport, jamais depuis la session : le
  // rapport a précisément fermé cette porte en se reconstruisant depuis le
  // journal.
  const model = modelOf(exemplary());
  const serialised = JSON.stringify(model);
  for (const field of [
    "vitals",
    "vitalsHistory",
    "patientState",
    "roscAchieved",
    "revealedFacts",
  ]) {
    assert.ok(!serialised.includes(field), `le modèle porte « ${field} »`);
  }
});
