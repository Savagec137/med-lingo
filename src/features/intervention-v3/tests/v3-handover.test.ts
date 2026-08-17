import assert from "node:assert/strict";
import test from "node:test";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import type { InterventionSession, PlayerActionId } from "../v3-domain.ts";
import { applyAction } from "../engine/apply-action.ts";
import {
  answerRegulatorQuestion,
  handoverItemStates,
  handoverOffers,
  regulatorQuestionsForTransmission,
  reviewAdditions,
  unansweredQuestions,
  DIAGNOSTIC_FORMULATION_FLAG,
  HANDOVER_SCORES,
  MAX_ADDITION_BONUS,
  REGULATOR_ANSWER_SCORES,
  SILENT_GAP_FLAG,
} from "../engine/v3-transmission.ts";
import { transmitHandover } from "../engine/v3-handover.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "../scenarios/v3-catalog.ts";

/**
 * La transmission au Centre 15.
 *
 * Le joueur ne clique pas « appeler » : il choisit ce qu'il transmet, et le
 * régulateur l'interroge sur ce qui manque. Ces tests portent surtout sur l'ordre
 * de gravité, qui n'est pas celui qu'on attend : **se taire sur un trou est pire
 * que d'oublier une donnée qu'on avait**, parce qu'un régulateur qui ignore qu'une
 * donnée manque croit disposer d'un bilan complet.
 */

const scenario = getV3Scenario(PILOT_SCENARIO_ID);

const EXPECTED_ITEMS = scenario.handoverItems
  .filter((item) => item.expected)
  .map((item) => item.id);

const play = (session: InterventionSession, ...actionIds: PlayerActionId[]): InterventionSession =>
  actionIds.reduce((current, actionId) => applyAction(current, actionId).session, session);

/**
 * Session prête à transmettre.
 *
 * `complete` joue le recueil entier ; sinon le joueur a seulement approché le
 * patient et joint la régulation, ce qui est exactement le cas à sanctionner.
 */
function readyToTransmit({ complete }: { complete: boolean }): InterventionSession {
  const base: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "arrival",
    status: "active",
  };
  const scene = play(
    base,
    "action.securiser-scene",
    "action.observer-environnement",
    "action.approcher-patient",
  );
  // L'ordre compte, et il enseigne quelque chose. Les données d'interrogatoire
  // ne périment pas : elles se recueillent d'abord. Les constantes périment en
  // cinq minutes : elles se relèvent juste avant de transmettre. Un joueur qui
  // prend la tension puis passe un quart d'heure à interroger l'entourage
  // transmet une tension datée, et c'est le comportement attendu.
  const atVitals: InterventionSession = { ...scene, phase: "vitals" };
  const gathered = complete
    ? play(
        atVitals,
        "action.interroger-temoin",
        "action.consulter-documents",
        "action.faire-glycemie",
        "action.evaluer-douleur",
        "action.poser-saturometre",
        "action.prendre-tension",
        "action.compter-fr",
        "action.evaluer-conscience",
        "action.reevaluer-patient",
      )
    : atVitals;
  return play(gathered, "action.appeler-centre15");
}

/* -------------------------------------------------------------------------- */
/* Ce que l'écran propose                                                     */
/* -------------------------------------------------------------------------- */

test("l'écran d'appel propose les éléments du bilan avec leur état", () => {
  const offers = handoverOffers(readyToTransmit({ complete: false }));
  assert.equal(offers.length, scenario.handoverItems.length);

  const constants = offers.find((offer) => offer.id === "item.constantes")!;
  assert.equal(constants.expected, true);
  assert.equal(constants.complete, false);
  assert.equal(constants.narrative, false);
  assert.deepEqual(
    constants.facts.map((fact) => fact.status),
    ["unknown", "unknown", "unknown", "unknown"],
  );

  // Les éléments sans fait rattaché sont toujours transmissibles.
  const reinforcement = offers.find((offer) => offer.id === "item.demande-de-renfort")!;
  assert.equal(reinforcement.narrative, true);
  assert.equal(reinforcement.complete, true);
});

test("l'écran d'appel nomme les données sans en donner la valeur", () => {
  // La règle centrale tient aussi sur cet écran : le joueur choisit sur ce qu'il
  // sait avoir recueilli, pas sur ce que le moteur sait du patient.
  const offers = handoverOffers(readyToTransmit({ complete: true }));
  const fields = offers.flatMap((offer) => [
    offer.label,
    ...offer.facts.map((fact) => `${fact.label} ${fact.status}`),
  ]);
  for (const field of fields) {
    assert.ok(!/\d/.test(field), `l'écran d'appel laisse fuir « ${field} »`);
  }
});

test("un élément relevé mais périmé n'est pas présenté comme recueilli", () => {
  const stale: InterventionSession = {
    ...readyToTransmit({ complete: true }),
    simulatedTimeSeconds: 100_000,
  };
  const constants = handoverOffers(stale).find((offer) => offer.id === "item.constantes")!;
  assert.equal(constants.complete, false);
  assert.ok(constants.facts.every((fact) => fact.status === "stale"));
});

/* -------------------------------------------------------------------------- */
/* Les quatre issues                                                          */
/* -------------------------------------------------------------------------- */

test("un élément recueilli et transmis est transmis", () => {
  const session = readyToTransmit({ complete: true });
  const states = handoverItemStates(session, scenario, EXPECTED_ITEMS);
  assert.equal(states["item.constantes"], "transmitted");
  assert.equal(states["item.antecedents"], "transmitted");
});

test("un élément recueilli et non transmis est un oubli", () => {
  const session = readyToTransmit({ complete: true });
  const states = handoverItemStates(
    session,
    scenario,
    EXPECTED_ITEMS.filter((id) => id !== "item.constantes"),
  );
  assert.equal(states["item.constantes"], "omitted");
});

test("un élément manquant mais annoncé vaut mieux qu'un silence", () => {
  const session = readyToTransmit({ complete: false });
  const disclosed = handoverItemStates(session, scenario, EXPECTED_ITEMS);
  const silent = handoverItemStates(session, scenario, []);
  assert.equal(disclosed["item.constantes"], "disclosed_missing");
  assert.equal(silent["item.constantes"], "silent_gap");
  assert.ok(
    HANDOVER_SCORES.disclosedMissing > HANDOVER_SCORES.silentGap,
    "annoncer un trou doit valoir mieux que le taire",
  );
});

test("se taire sur un trou est plus grave que d'oublier une donnée qu'on avait", () => {
  // L'ordre de gravité central. Un régulateur qui ignore qu'une donnée manque
  // croit disposer d'un bilan complet et décide sur du faux ; celui à qui on
  // n'a pas répété une donnée peut au moins la redemander.
  assert.ok(HANDOVER_SCORES.silentGap < HANDOVER_SCORES.omitted);
  assert.ok(HANDOVER_SCORES.omitted < 0, "l'oubli reste une faute");
  assert.ok(HANDOVER_SCORES.disclosedMissing > 0, "l'honnêteté reste positive");
  assert.ok(HANDOVER_SCORES.transmitted > HANDOVER_SCORES.disclosedMissing);
});

/* -------------------------------------------------------------------------- */
/* La note de communication                                                   */
/* -------------------------------------------------------------------------- */

test("un bilan complet et entièrement transmis rapporte le maximum", () => {
  const session = readyToTransmit({ complete: true });
  const result = transmitHandover(session, { itemIds: EXPECTED_ITEMS });
  assert.equal(result.refusalReason, null);
  assert.equal(result.communicationScore, EXPECTED_ITEMS.length * HANDOVER_SCORES.transmitted);
  assert.deepEqual(result.omitted, []);
  assert.deepEqual(result.silentGaps, []);
  assert.deepEqual(result.disclosed, []);
  assert.ok(!result.session.flags.includes(SILENT_GAP_FLAG));
});

test("transmettre un bilan vide en silence pose le marqueur du trou silencieux", () => {
  const session = readyToTransmit({ complete: false });
  const result = transmitHandover(session, { itemIds: [] });
  assert.equal(result.silentGaps.length, EXPECTED_ITEMS.length);
  assert.ok(result.communicationScore < 0);
  assert.ok(result.session.flags.includes(SILENT_GAP_FLAG));
});

test("annoncer ses trous au lieu de les taire remonte la note", () => {
  const session = readyToTransmit({ complete: false });
  const silent = transmitHandover(session, { itemIds: [] });
  const honest = transmitHandover(session, { itemIds: EXPECTED_ITEMS });
  assert.ok(
    honest.communicationScore > silent.communicationScore,
    `honnête ${honest.communicationScore} devrait dépasser silencieux ${silent.communicationScore}`,
  );
  assert.ok(!honest.session.flags.includes(SILENT_GAP_FLAG));
});

test("transmettre le motif d'appel ne rapporte rien, et le taire ne coûte rien", () => {
  // Récompenser l'évident ferait monter le score sans rien apprendre.
  const session = readyToTransmit({ complete: true });
  const withMotive = transmitHandover(session, {
    itemIds: [...EXPECTED_ITEMS, "item.motif", "item.identite"],
  });
  const without = transmitHandover(session, { itemIds: EXPECTED_ITEMS });
  assert.equal(withMotive.communicationScore, without.communicationScore);
});

/* -------------------------------------------------------------------------- */
/* Les deux barèmes ne se confondent pas                                      */
/* -------------------------------------------------------------------------- */

test("les trous du bilan et la qualité de la communication se notent à part", () => {
  // Ne pas avoir mesuré est une faute de recueil, sanctionnée par l'action. Ne
  // pas l'avoir dit est une faute de communication. Un joueur qui n'a pas pris la
  // tension paie une fois pour ne pas l'avoir prise, puis est jugé sur ce qu'il
  // en dit — et les deux notes doivent rester lisibles séparément.
  const session = readyToTransmit({ complete: false });
  const bare = applyAction(session, "action.transmettre-bilan");
  assert.ok(bare.logEntry.scoreDelta < 0, "les trous du bilan coûtent déjà");
  assert.equal(bare.logEntry.flag, "incomplete-handover");

  const honest = transmitHandover(session, { itemIds: EXPECTED_ITEMS });
  const silent = transmitHandover(session, { itemIds: [] });
  // Même sanction de recueil, notes de communication différentes.
  assert.notEqual(honest.communicationScore, silent.communicationScore);
});

/* -------------------------------------------------------------------------- */
/* Les questions du régulateur                                                */
/* -------------------------------------------------------------------------- */

test("le régulateur interroge sur ce qui n'a pas été recueilli", () => {
  const session = readyToTransmit({ complete: false });
  const result = transmitHandover(session, { itemIds: EXPECTED_ITEMS });
  const asked = result.questions.map((question) => question.id);
  assert.ok(asked.includes("question.tension"), `questions posées : ${asked.join(", ")}`);
  assert.ok(asked.includes("question.antecedents"));
  assert.ok(asked.length >= 3, "un bilan vide doit susciter plusieurs questions");
});

test("le régulateur interroge aussi sur ce que le joueur avait et n'a pas dit", () => {
  // Le cas le plus instructif, et celui que le champ `onOmission` du scénario
  // décrit : la donnée existe, le joueur ne l'a pas transmise.
  const session = readyToTransmit({ complete: true });
  const states = handoverItemStates(
    session,
    scenario,
    EXPECTED_ITEMS.filter((id) => id !== "item.conscience" && id !== "item.glycemie"),
  );
  assert.equal(states["item.conscience"], "omitted");
  const asked = regulatorQuestionsForTransmission(session, scenario, states).map(
    (question) => question.id,
  );
  assert.ok(asked.includes("question.conscience-exacte"), `posées : ${asked.join(", ")}`);
  assert.ok(asked.includes("question.glycemie"));
});

test("un bilan complet et entièrement transmis ne suscite aucune question", () => {
  // Le meilleur retour que le jeu puisse donner, et il ne coûte aucun texte.
  const session = readyToTransmit({ complete: true });
  const result = transmitHandover(session, { itemIds: EXPECTED_ITEMS });
  assert.deepEqual(result.questions, []);
  assert.deepEqual(result.transmission!.questionsAsked, []);
});

test("répondre juste rapporte, répondre faux coûte, et les deux expliquent", () => {
  const session = readyToTransmit({ complete: false });
  const transmitted = transmitHandover(session, { itemIds: EXPECTED_ITEMS }).session;
  const question = scenario.regulatorQuestions.find((entry) => entry.id === "question.tension")!;
  const right = question.answers.find((answer) => answer.correct)!;
  const wrong = question.answers.find((answer) => !answer.correct)!;

  const good = answerRegulatorQuestion(transmitted, question.id, right.id);
  assert.equal(good.correct, true);
  assert.equal(good.scoreDelta, REGULATOR_ANSWER_SCORES.correct);
  assert.equal(good.rationale, right.rationale);

  const bad = answerRegulatorQuestion(transmitted, question.id, wrong.id);
  assert.equal(bad.correct, false);
  assert.equal(bad.scoreDelta, REGULATOR_ANSWER_SCORES.incorrect);
  // L'explication est rendue dans les deux cas : c'est elle qui enseigne.
  assert.ok(bad.rationale && bad.rationale.length > 30);
});

test("on ne répond qu'une fois à une question", () => {
  // Sans quoi le joueur essaierait les trois réponses et garderait la bonne.
  const session = readyToTransmit({ complete: false });
  const transmitted = transmitHandover(session, { itemIds: EXPECTED_ITEMS }).session;
  const question = scenario.regulatorQuestions.find((entry) => entry.id === "question.tension")!;
  const wrong = question.answers.find((answer) => !answer.correct)!;
  const right = question.answers.find((answer) => answer.correct)!;

  const first = answerRegulatorQuestion(transmitted, question.id, wrong.id);
  const retry = answerRegulatorQuestion(first.session, question.id, right.id);
  assert.equal(retry.correct, null);
  assert.match(retry.refusalReason!, /déjà reçu une réponse/);
  assert.equal(retry.session.score, first.session.score);
});

test("on ne répond pas à une question qui n'a pas été posée", () => {
  const session = readyToTransmit({ complete: true });
  const transmitted = transmitHandover(session, { itemIds: EXPECTED_ITEMS }).session;
  const attempt = answerRegulatorQuestion(transmitted, "question.tension", "a1");
  assert.equal(attempt.correct, null);
  assert.match(attempt.refusalReason!, /n'a pas posé/);
});

test("les questions restées sans réponse sont retenues pour le débriefing", () => {
  const session = readyToTransmit({ complete: false });
  const transmitted = transmitHandover(session, { itemIds: EXPECTED_ITEMS }).session;
  const pending = unansweredQuestions(transmitted);
  assert.ok(pending.length > 0);

  const answered = answerRegulatorQuestion(transmitted, pending[0]!, "a1").session;
  assert.equal(unansweredQuestions(answered).length, pending.length - 1);
});

/* -------------------------------------------------------------------------- */
/* Les ajouts libres, et le refus de conclure                                 */
/* -------------------------------------------------------------------------- */

test("un constat s'ajoute au bilan, une conclusion est refusée", () => {
  // L'ambulancier décrit et transmet, il ne conclut pas. C'est la limite du
  // périmètre, et le scénario porte les deux listes pour l'enseigner.
  const observation = scenario.freeAdditions[0]!;
  const diagnosis = scenario.rejectedAdditions[0]!;
  const review = reviewAdditions(scenario, [observation, diagnosis]);
  assert.deepEqual(review.accepted, [observation]);
  assert.deepEqual(review.rejected, [diagnosis]);
});

test("une formulation inconnue est refusée plutôt qu'acceptée par défaut", () => {
  // Accepter l'inconnu laisserait passer n'importe quelle phrase, y compris un
  // diagnostic qu'aucune liste n'aurait prévu.
  const review = reviewAdditions(scenario, ["Je pense à une rupture d'anévrisme"]);
  assert.deepEqual(review.accepted, []);
  assert.equal(review.rejected.length, 1);
});

test("tenter une formulation diagnostique pose son marqueur", () => {
  const session = readyToTransmit({ complete: true });
  const result = transmitHandover(session, {
    itemIds: EXPECTED_ITEMS,
    additions: [scenario.rejectedAdditions[0]!],
  });
  assert.equal(result.rejectedAdditions.length, 1);
  assert.ok(result.session.flags.includes(DIAGNOSTIC_FORMULATION_FLAG));
  assert.deepEqual(result.transmission!.freeAdditions, []);
});

test("les ajouts pertinents sont plafonnés", () => {
  // Énumérer tout ce qu'on a vu ne doit pas remplacer le fait de choisir.
  const session = readyToTransmit({ complete: true });
  const all = transmitHandover(session, {
    itemIds: EXPECTED_ITEMS,
    additions: scenario.freeAdditions,
  });
  const baseline = transmitHandover(session, { itemIds: EXPECTED_ITEMS });
  assert.ok(scenario.freeAdditions.length > MAX_ADDITION_BONUS);
  assert.equal(all.communicationScore - baseline.communicationScore, MAX_ADDITION_BONUS);
});

/* -------------------------------------------------------------------------- */
/* Les barrières de l'action restent celles du moteur                          */
/* -------------------------------------------------------------------------- */

test("transmettre sans avoir joint la régulation est refusé", () => {
  const notCalled: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "centre15_call",
    status: "active",
  };
  const result = transmitHandover(notCalled, { itemIds: EXPECTED_ITEMS });
  assert.equal(result.transmission, null);
  assert.ok(result.refusalReason);
  assert.equal(result.communicationScore, 0);
  assert.equal(result.session.score, notCalled.score, "un refus ne touche pas au score");
});

test("transmettre fait passer aux gestes prioritaires", () => {
  const session = readyToTransmit({ complete: true });
  const result = transmitHandover(session, { itemIds: EXPECTED_ITEMS });
  assert.equal(result.session.phase, "priority_actions");
  assert.equal(result.session.transmission?.instruction, scenario.regulatorInstruction);
});

test("la transmission rapporte ce que le joueur savait en décrochant", () => {
  // Les quatre-vingt-dix secondes de l'appel ne doivent pas faire vieillir une
  // constante entre le moment du choix et celui de l'évaluation : le joueur
  // serait jugé sur un état qu'il ne pouvait pas voir.
  const session = readyToTransmit({ complete: true });
  const result = transmitHandover(session, { itemIds: EXPECTED_ITEMS });
  assert.equal(result.transmission!.startedAtSeconds, session.simulatedTimeSeconds);
  assert.equal(result.transmission!.itemStates["item.constantes"], "transmitted");
});
