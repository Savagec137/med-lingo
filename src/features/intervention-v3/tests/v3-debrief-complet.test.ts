import assert from "node:assert/strict";
import test from "node:test";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import type { EquipmentId, InterventionSession, PlayerActionId } from "../v3-domain.ts";
import { applyAction } from "../engine/apply-action.ts";
import { createDebriefReport } from "../engine/v3-debrief.ts";
import {
  gestureScoreFromSession,
  handoverScoreFromSession,
  scoreFromSession,
} from "../engine/v3-scoring.ts";
import { resolveGestureRound, selectGesture } from "../engine/v3-gestures.ts";
import { transmitHandover } from "../engine/v3-handover.ts";
import { answerRegulatorQuestion } from "../engine/v3-transmission.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "../scenarios/v3-catalog.ts";

/**
 * Le débriefing final.
 *
 * Un débriefing qui ne liste que les fautes n'enseigne qu'à moitié : l'apprenant
 * sait ce qu'il a raté et pas ce qu'il doit reproduire. Ces tests vérifient les
 * huit sections attendues, et surtout que **la note du débrief tient compte des
 * gestes et de la transmission** — ni l'un ni l'autre ne passe par le journal
 * d'actions, et les ignorer donnait un débrief qui contredisait le score affiché
 * pendant la partie.
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

/**
 * Le recueil complet, dans l'ordre qui permet une partie parfaite.
 *
 * L'ordre n'est pas indifférent, et c'est le cœur de la leçon. Le tour de gestes
 * s'ouvre cent vingt secondes après la dernière mesure — trente pour joindre la
 * régulation, quatre-vingt-dix pour transmettre — et les constantes périment en
 * trois cents. Un joueur qui pose le saturomètre au milieu de son bilan arrive
 * aux gestes avec une SpO₂ datée et ne peut plus fonder « réévaluer les
 * constantes ». Les périssables se relèvent donc en dernier.
 */
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

/** Le même recueil, saturomètre pris trop tôt. */
const GATHER_EARLY_PROBE: readonly PlayerActionId[] = [
  "action.interroger-temoin",
  "action.consulter-documents",
  "action.faire-glycemie",
  "action.evaluer-douleur",
  "action.poser-saturometre",
  "action.prendre-tension",
  "action.compter-fr",
  "action.evaluer-conscience",
  "action.reevaluer-patient",
];

/** Session engagée : scène sécurisée, patient approché. */
function started(equipment: readonly EquipmentId[] = ALL_EQUIPMENT): InterventionSession {
  const base: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: equipment }),
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
  const gathered = play({ ...started(), phase: "vitals" }, ...GATHER);
  const called = play(gathered, "action.appeler-centre15");
  let session = transmitHandover(called, { itemIds: EXPECTED_ITEMS }).session;
  for (const gestureId of RECOMMENDED) session = selectGesture(session, ROUND, gestureId).session;
  return resolveGestureRound(session, ROUND).session;
}

/** La mission bâclée : rien recueilli, rien transmis, gestes au hasard. */
function careless(): InterventionSession {
  const called = play({ ...started(), phase: "vitals" }, "action.appeler-centre15");
  let session = transmitHandover(called, { itemIds: [] }).session;
  session = selectGesture(session, ROUND, "geste.rassurer-surveiller").session;
  session = selectGesture(session, ROUND, "geste.transporter-sans-reevaluation").session;
  return resolveGestureRound(session, ROUND).session;
}

/* -------------------------------------------------------------------------- */
/* La note tient compte de tout ce que le joueur a fait                       */
/* -------------------------------------------------------------------------- */

test("la note du débrief compte les gestes et la transmission", () => {
  // Le défaut que ce test ferme : gestes et communication modifient le score en
  // cours de partie sans passer par le journal d'actions. Un débrief qui ne lisait
  // que le journal affichait donc une autre note que celle vue pendant la partie.
  const session = exemplary();
  assert.notEqual(gestureScoreFromSession(session), 0, "les gestes doivent peser");
  assert.notEqual(handoverScoreFromSession(session, scenario), 0, "la transmission doit peser");

  const report = createDebriefReport(session, scenario);
  assert.equal(report.score, scoreFromSession(session, scenario));
});

test("une mission exemplaire est mieux notée qu'une mission bâclée", () => {
  const good = createDebriefReport(exemplary(), scenario);
  const bad = createDebriefReport(careless(), scenario);
  assert.ok(good.score > bad.score, `exemplaire ${good.score} vs bâclée ${bad.score}`);
  assert.equal(good.passed, true);
  assert.ok(good.stars > bad.stars);
});

/* -------------------------------------------------------------------------- */
/* Ce que le joueur a bien fait                                               */
/* -------------------------------------------------------------------------- */

test("le débrief dit ce qui a été bien fait, pas seulement ce qui a manqué", () => {
  const report = createDebriefReport(exemplary(), scenario);
  assert.ok(report.strengths.length >= 4, `réussites relevées : ${report.strengths.length}`);
  const axes = new Set(report.strengths.map((strength) => strength.axis));
  assert.ok(axes.has("securite"));
  assert.ok(axes.has("bilan"));
  assert.ok(axes.has("communication"));
  assert.ok(axes.has("gestes"));
  // Chaque réussite est une phrase, pas un compliment vide.
  for (const strength of report.strengths) {
    assert.ok(strength.label.length > 25, strength.label);
    assert.ok(strength.label.endsWith("."), strength.label);
  }
});

test("une mission bâclée ne se voit pas attribuer de réussite imméritée", () => {
  const report = createDebriefReport(careless(), scenario);
  const labels = report.strengths.map((strength) => strength.label).join(" ");
  assert.ok(!/[Bb]ilan complet/.test(labels), labels);
  assert.ok(!/[Aa]ucun trou/.test(labels), labels);
});

/* -------------------------------------------------------------------------- */
/* Les données non recherchées                                                */
/* -------------------------------------------------------------------------- */

test("le débrief distingue les données attendues des données disponibles", () => {
  // Ne pas avoir pris la température n'est pas du même ordre que ne pas avoir pris
  // la tension : l'une était attendue au bilan, l'autre seulement disponible.
  const report = createDebriefReport(careless(), scenario);
  const byId = new Map(report.factCoverage.map((item) => [item.factId, item]));
  assert.equal(byId.get("fact.ta")!.expected, true);
  assert.equal(byId.get("fact.temperature")!.expected, false);
  assert.equal(byId.get("fact.ta")!.state, "not_measured");
});

test("une donnée dont le matériel manquait est hors d'atteinte, pas oubliée", () => {
  // Reprocher au joueur un oubli qu'il ne pouvait pas commettre lui apprendrait
  // une fausse leçon. La preuve vient du journal : une tentative refusée faute de
  // matériel montre que l'appareil n'était pas embarqué.
  const withoutGlucometer = { ...started(["saturometre", "brancard"]), phase: "vitals" as const };
  const attempted = play(withoutGlucometer, "action.faire-glycemie");
  const report = createDebriefReport(attempted, scenario);
  const glycemia = report.factCoverage.find((item) => item.factId === "fact.glycemie")!;
  assert.equal(glycemia.state, "not_measurable");

  // Sans tentative, le doute profite à la rigueur : c'est un non-mesuré.
  const untried = createDebriefReport(withoutGlucometer, scenario);
  assert.equal(
    untried.factCoverage.find((item) => item.factId === "fact.glycemie")!.state,
    "not_measured",
  );
});

/* -------------------------------------------------------------------------- */
/* Les erreurs de transmission                                                */
/* -------------------------------------------------------------------------- */

test("le débrief relève les erreurs de transmission, le silence en premier", () => {
  const report = createDebriefReport(careless(), scenario);
  assert.equal(report.handoverReview.length, EXPECTED_ITEMS.length);
  assert.ok(report.handoverReview.every((entry) => entry.silent));
  for (const entry of report.handoverReview) {
    assert.equal(entry.state, "silent_gap");
    assert.ok(entry.detail.includes("bilan complet"), entry.detail);
  }
});

test("un bilan entièrement transmis ne laisse aucune erreur de transmission", () => {
  const report = createDebriefReport(exemplary(), scenario);
  assert.deepEqual(report.handoverReview, []);
});

test("annoncer un trou est relevé autrement que le taire", () => {
  const called = play({ ...started(), phase: "vitals" }, "action.appeler-centre15");
  const honest = transmitHandover(called, { itemIds: EXPECTED_ITEMS }).session;
  const report = createDebriefReport(honest, scenario);
  assert.ok(report.handoverReview.length > 0);
  assert.ok(report.handoverReview.every((entry) => entry.state === "disclosed_missing"));
  assert.ok(report.handoverReview.every((entry) => !entry.silent));
  assert.ok(report.handoverReview[0]!.detail.includes("annoncé"));
});

test("une omission est distinguée d'un trou", () => {
  const gathered = play({ ...started(), phase: "vitals" }, ...GATHER);
  const called = play(gathered, "action.appeler-centre15");
  const partial = transmitHandover(called, {
    itemIds: EXPECTED_ITEMS.filter((id) => id !== "item.constantes"),
  }).session;
  const report = createDebriefReport(partial, scenario);
  const constants = report.handoverReview.find((entry) => entry.itemId === "item.constantes")!;
  assert.equal(constants.state, "omitted");
  assert.equal(constants.silent, false);
  assert.ok(constants.detail.includes("avait été recueillie"));
});

/* -------------------------------------------------------------------------- */
/* Les gestes                                                                 */
/* -------------------------------------------------------------------------- */

test("le débrief rapporte les gestes dangereux tentés", () => {
  const report = createDebriefReport(careless(), scenario);
  const refused = report.gestureReview.filter((entry) => entry.kind === "refused");
  assert.equal(refused.length, 1);
  assert.equal(refused[0]!.gestureId, "geste.transporter-sans-reevaluation");
  // Le détail est l'explication du scénario, pas un texte générique.
  assert.ok(refused[0]!.detail.includes("sans réévaluer"), refused[0]!.detail);
});

test("le débrief rapporte les gestes non indiqués et les gestes manqués", () => {
  const report = createDebriefReport(careless(), scenario);
  const notIndicated = report.gestureReview.filter((entry) => entry.kind === "not_indicated");
  const missing = report.gestureReview.filter((entry) => entry.kind === "missing");
  assert.equal(notIndicated.length, 1);
  assert.equal(notIndicated[0]!.gestureId, "geste.rassurer-surveiller");
  assert.equal(missing.length, RECOMMENDED.length, "les trois gestes attendus manquent");
});

test("un bon geste choisi sans raisonnement est relevé comme tel", () => {
  // Ni une réussite, ni une faute franche : le geste était le bon, rien ne le
  // fondait. Le joueur a sécurisé et approché le patient, donc la conscience et la
  // ventilation sont établies — deux des trois gestes sont fondés. Seul
  // « réévaluer les constantes » ne l'est pas, faute d'avoir relevé quoi que ce
  // soit. C'est cette précision que le débriefing doit rendre.
  const called = play({ ...started(), phase: "vitals" }, "action.appeler-centre15");
  let session = transmitHandover(called, { itemIds: EXPECTED_ITEMS }).session;
  for (const gestureId of RECOMMENDED) session = selectGesture(session, ROUND, gestureId).session;
  const report = createDebriefReport(resolveGestureRound(session, ROUND).session, scenario);
  const unjustified = report.gestureReview.filter((entry) => entry.kind === "unjustified");
  assert.deepEqual(
    unjustified.map((entry) => entry.gestureId),
    ["geste.reevaluer-constantes"],
  );
  assert.ok(unjustified[0]!.detail.includes("Bon geste"));
});

test("l'ordre du recueil décide si un geste peut être fondé", () => {
  // La leçon que le moteur enseigne sans qu'aucun texte ne le dise. Le même bilan,
  // aussi complet, aussi bien transmis : seul l'ordre change. Relever la SpO₂ au
  // milieu du bilan la rend datée au moment des gestes, et « réévaluer les
  // constantes » n'est plus fondé sur rien.
  const build = (order: readonly PlayerActionId[]) => {
    const gathered = play({ ...started(), phase: "vitals" }, ...order);
    const called = play(gathered, "action.appeler-centre15");
    let session = transmitHandover(called, { itemIds: EXPECTED_ITEMS }).session;
    for (const gestureId of RECOMMENDED) session = selectGesture(session, ROUND, gestureId).session;
    return createDebriefReport(resolveGestureRound(session, ROUND).session, scenario);
  };
  const late = build(GATHER);
  const early = build(GATHER_EARLY_PROBE);

  assert.deepEqual(late.gestureReview, [], "les périssables relevés en dernier : rien à reprocher");
  assert.deepEqual(
    early.gestureReview.map((entry) => [entry.gestureId, entry.kind]),
    [["geste.reevaluer-constantes", "unjustified"]],
  );

  // L'écart ne se lit pas dans la note finale : les deux parties sont assez
  // bonnes pour saturer le plafond de cent. Il se lit là où il se produit, dans
  // les points des gestes — et surtout dans le reproche que l'une reçoit et
  // l'autre pas.
  const buildSession = (order: readonly PlayerActionId[]) => {
    const gathered = play({ ...started(), phase: "vitals" }, ...order);
    const called = play(gathered, "action.appeler-centre15");
    let session = transmitHandover(called, { itemIds: EXPECTED_ITEMS }).session;
    for (const gestureId of RECOMMENDED) session = selectGesture(session, ROUND, gestureId).session;
    return session;
  };
  assert.ok(
    gestureScoreFromSession(buildSession(GATHER)) >
      gestureScoreFromSession(buildSession(GATHER_EARLY_PROBE)),
    "le geste fondé doit rapporter davantage que le geste choisi à l'aveugle",
  );
});

test("une mission exemplaire ne laisse aucun reproche sur les gestes", () => {
  const report = createDebriefReport(exemplary(), scenario);
  assert.deepEqual(report.gestureReview, []);
});

/* -------------------------------------------------------------------------- */
/* La conduite attendue                                                       */
/* -------------------------------------------------------------------------- */

test("la conduite attendue est assemblée depuis le scénario, jamais rédigée", () => {
  // Une conduite écrite en prose finirait par contredire les données : un geste
  // retiré du scénario resterait dans le texte.
  const report = createDebriefReport(careless(), scenario);
  const text = report.expectedConduct.join("\n");
  for (const gesture of RECOMMENDED) {
    const label = scenario.gestureRounds
      .flatMap((round) => round.offered)
      .find((entry) => entry.id === gesture)!.label;
    assert.ok(text.includes(label), `« ${label} » absent de la conduite attendue`);
  }
  assert.ok(text.includes(scenario.regulatorInstruction));
  assert.ok(text.includes(scenario.learningObjective));
  assert.ok(/[Rr]éévaluer/.test(text), "la réévaluation doit figurer dans la conduite attendue");
});

test("la conduite attendue est la même quelle que soit la partie jouée", () => {
  // Elle décrit ce qu'il fallait faire, pas ce qui a été fait.
  assert.deepEqual(
    createDebriefReport(exemplary(), scenario).expectedConduct,
    createDebriefReport(careless(), scenario).expectedConduct,
  );
});

/* -------------------------------------------------------------------------- */
/* Les points à réviser                                                       */
/* -------------------------------------------------------------------------- */

test("les points à réviser viennent des erreurs, pas des actions jouées", () => {
  // `references` liste ce que la mission a mobilisé ; les points à réviser listent
  // ce que le joueur doit reprendre. Les confondre donnerait à réviser ce qu'il
  // maîtrise déjà.
  const bad = createDebriefReport(careless(), scenario);
  const good = createDebriefReport(exemplary(), scenario);
  assert.ok(bad.revisionPoints.length > 0, "une mission bâclée doit donner à réviser");
  assert.ok(
    bad.revisionPoints.length > good.revisionPoints.length,
    `bâclée ${bad.revisionPoints.length} vs exemplaire ${good.revisionPoints.length}`,
  );
  for (const point of bad.revisionPoints) {
    assert.ok(point.title.length > 0);
    assert.ok(point.subtitle.includes("·"), point.subtitle);
    assert.ok(
      ["official_verified", "training_source", "internal_to_validate"].includes(point.trust),
    );
  }
});

test("chaque point à réviser est une fiche réellement résolue", () => {
  // Une référence non résolue serait un lien mort au moment où l'apprenant en a
  // le plus besoin.
  const report = createDebriefReport(careless(), scenario);
  const ids = new Set(report.revisionPoints.map((point) => point.knowledgeId));
  assert.equal(ids.size, report.revisionPoints.length, "aucun doublon");
});

/* -------------------------------------------------------------------------- */
/* Le débrief reste reconstruit, jamais lu dans la session                    */
/* -------------------------------------------------------------------------- */

test("un score gonflé après coup ne change pas le débrief", () => {
  const session = exemplary();
  const report = createDebriefReport(session, scenario);
  const tampered: InterventionSession = {
    ...session,
    score: 100,
    lives: 5,
    patientState: 100,
    xpBonus: 10_000,
    rewardBonus: 10_000,
  };
  assert.deepEqual(createDebriefReport(tampered, scenario), report);
});

test("répondre au régulateur pèse sur la note du débrief", () => {
  const called = play({ ...started(), phase: "vitals" }, "action.appeler-centre15");
  const transmitted = transmitHandover(called, { itemIds: EXPECTED_ITEMS });
  const question = transmitted.questions[0]!;
  const right = question.answers.find((answer) => answer.correct)!;
  const wrong = question.answers.find((answer) => !answer.correct)!;

  const good = answerRegulatorQuestion(transmitted.session, question.id, right.id).session;
  const bad = answerRegulatorQuestion(transmitted.session, question.id, wrong.id).session;
  assert.ok(
    createDebriefReport(good, scenario).score > createDebriefReport(bad, scenario).score,
    "une bonne réponse doit valoir mieux qu'une mauvaise, jusque dans le débrief",
  );
});
