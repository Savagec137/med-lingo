import assert from "node:assert/strict";
import test from "node:test";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import type { FactId, InterventionSession, PlayerActionId } from "../v3-domain.ts";
import { applyAction } from "../engine/apply-action.ts";
import { readFact } from "../facts/read-fact.ts";
import { getFact } from "../facts/fact-registry.ts";
import {
  currentReevaluation,
  missingExpectedFactIds,
  openReevaluation,
  perishableExpectedFactIds,
  reevaluationStatus,
  refreshedSince,
  reinforcementStatus,
  staleExpectedFactIds,
  staleTransportPenalty,
  transportReadiness,
  validateReevaluation,
  REINFORCEMENT_EN_ROUTE_SECONDS,
  REINFORCEMENT_ON_SCENE_SECONDS,
  STALE_TRANSPORT_FLAG,
  STALE_TRANSPORT_PENALTY_CAP,
  STALE_TRANSPORT_PENALTY_PER_FACT,
} from "../engine/v3-reevaluation.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "../scenarios/v3-catalog.ts";
import { PLAYER_ACTIONS } from "../actions/action-catalog.ts";

/**
 * La réévaluation, et la sanction du départ.
 *
 * Le trou que ces tests ferment : « Réévaluer le patient » rapportait huit points
 * sans rien exiger, et partir avec un bilan d'un quart d'heure ne coûtait rien. Un
 * joueur pouvait relever ses constantes à la deuxième minute et s'en tenir là.
 */

const scenario = getV3Scenario(PILOT_SCENARIO_ID);

/** Les cinq constantes surveillées, celles qui périment et qu'on reprend. */
const MONITORED: readonly FactId[] = ["fact.spo2", "fact.fc", "fact.ta", "fact.fr", "fact.glasgow"];

/** Les actions qui les reprennent toutes les cinq. */
const REMEASURE: readonly PlayerActionId[] = [
  "action.poser-saturometre",
  "action.prendre-tension",
  "action.compter-fr",
  "action.evaluer-conscience",
];

/**
 * Le relevé complet de tout ce qui périme au bilan attendu.
 *
 * Arriver à la réévaluation coûte tellement de temps simulé — huit mesures, un
 * appel, quatre-vingt-dix secondes de transmission, un tour de gestes — que le
 * premier relevé est **déjà daté** en arrivant. Ce n'est pas un défaut : c'est
 * précisément la leçon. Reconstituer un bilan à jour demande donc de tout
 * reprendre, y compris la douleur et la glycémie.
 */
const REMEASURE_ALL: readonly PlayerActionId[] = [
  ...REMEASURE,
  "action.reevaluer-patient",
  "action.evaluer-douleur",
  "action.faire-glycemie",
];

const play = (session: InterventionSession, ...actionIds: PlayerActionId[]): InterventionSession =>
  actionIds.reduce((current, actionId) => applyAction(current, actionId).session, session);

const at = (session: InterventionSession, seconds: number): InterventionSession => ({
  ...session,
  simulatedTimeSeconds: seconds,
});

/**
 * Session à la phase de réévaluation, avec un bilan complet mais **périmé** —
 * l'état exact d'un joueur qui a bien travaillé puis laissé le temps passer.
 * C'est le cas que le mode doit reprendre en main.
 */
function atReevaluation(): InterventionSession {
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
  const measured = play(
    { ...scene, phase: "vitals" },
    ...REMEASURE,
    "action.faire-glycemie",
    "action.evaluer-douleur",
    "action.interroger-temoin",
    "action.consulter-documents",
  );
  return play(
    measured,
    "action.appeler-centre15",
    "action.transmettre-bilan",
    "action.choisir-gestes-prioritaires",
  );
}

/* -------------------------------------------------------------------------- */
/* Ce qui périme, et ce qui ne périme pas                                     */
/* -------------------------------------------------------------------------- */

test("les données d'interrogatoire ne périment jamais", () => {
  // Un antécédent ne vieillit pas. Demander de « réévaluer les allergies » serait
  // un contresens, et la liste des constantes à reprendre est donc tirée du délai
  // déclaré au registre, pas d'une liste écrite à la main.
  const perishable = perishableExpectedFactIds(scenario);
  for (const factId of MONITORED) {
    assert.ok(perishable.includes(factId), `${factId} devrait périmer`);
  }
  for (const factId of ["fact.antecedents", "fact.traitements", "fact.pci"] as const) {
    assert.ok(!perishable.includes(factId), `${factId} ne devrait pas périmer`);
    assert.equal(getFact(factId).freshnessSeconds, null);
  }
});

test("une constante relevée puis oubliée devient périmée, sans disparaître", () => {
  const session = atReevaluation();
  const stale = staleExpectedFactIds(at(session, 100_000), scenario);
  for (const factId of MONITORED) {
    assert.ok(stale.includes(factId), `${factId} devrait être signalée à réévaluer`);
    // La valeur relevée reste lisible : elle est datée, pas effacée.
    assert.equal(readFact(at(session, 100_000), factId).status, "known", factId);
  }
});

test("toute constante attendue qui périme peut être reprise pendant la réévaluation", () => {
  // L'invariant qui manquait. `fact.conscience-qualitative` périmait en cinq
  // minutes, était attendue au bilan, et aucune action de la phase de
  // réévaluation ne pouvait la reprendre : le joueur restait pénalisé sans
  // recours possible. « Réévaluer le patient » ne révélait rien du tout, alors
  // que comparer l'état à ce qu'il était est exactement cela.
  const refreshable = new Set(
    PLAYER_ACTIONS.filter(
      (action) => !action.outOfScope && action.requires.phases.includes("reevaluation"),
    ).flatMap((action) => action.reveals),
  );
  for (const factId of perishableExpectedFactIds(scenario)) {
    assert.ok(
      refreshable.has(factId),
      `${factId} périme et aucune action de la réévaluation ne la reprend`,
    );
  }
});

test("une constante jamais relevée est manquante, pas périmée", () => {
  // Deux trous de nature différente : l'un se comble en mesurant, l'autre en
  // remesurant. Les confondre priverait l'écran de la distinction.
  const bare: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "reevaluation",
    status: "active",
  };
  const missing = missingExpectedFactIds(bare, scenario);
  assert.ok(missing.includes("fact.ta"));
  assert.deepEqual(staleExpectedFactIds(bare, scenario), []);
});

/* -------------------------------------------------------------------------- */
/* « Réévaluer le patient » exige de remesurer                                */
/* -------------------------------------------------------------------------- */

test("réévaluer sans avoir remesuré est une faute, pas un gain", () => {
  const stale = at(atReevaluation(), 100_000);
  const result = applyAction(stale, "action.reevaluer-patient");

  assert.equal(result.classification, "fault");
  assert.ok(result.logEntry.scoreDelta < 0, `score obtenu : ${result.logEntry.scoreDelta}`);
  assert.equal(result.logEntry.flag, "reevaluation-without-measures");
  assert.equal(result.logEntry.outcome, "unjustified");
});

test("réévaluer après avoir repris les constantes rapporte des points", () => {
  const stale = at(atReevaluation(), 100_000);
  const remeasured = play(stale, ...REMEASURE);
  for (const factId of MONITORED) {
    const read = readFact(remeasured, factId);
    assert.equal(read.status === "known" && read.isStale, false, `${factId} devrait être fraîche`);
  }

  const result = applyAction(remeasured, "action.reevaluer-patient");
  assert.equal(result.classification, "valid");
  assert.ok(result.logEntry.scoreDelta > 0, `score obtenu : ${result.logEntry.scoreDelta}`);
  assert.equal(result.logEntry.flag, undefined);
});

/* -------------------------------------------------------------------------- */
/* Le cycle                                                                   */
/* -------------------------------------------------------------------------- */

test("ouvrir un cycle constate ce qui a vieilli", () => {
  const stale = at(atReevaluation(), 100_000);
  const opened = openReevaluation(stale);
  const cycle = currentReevaluation(opened)!;

  assert.equal(cycle.cycle, 1);
  assert.equal(cycle.startedAtSeconds, stale.simulatedTimeSeconds);
  assert.equal(cycle.validated, false);
  assert.deepEqual(cycle.refreshedFactIds, []);
  for (const factId of MONITORED) {
    assert.ok(cycle.gapFactIds.includes(factId), `${factId} devrait figurer dans les trous`);
  }
});

test("rouvrir un cycle en cours ne l'efface pas", () => {
  // Revenir sur l'écran ne doit pas remettre le compteur à zéro : les mesures
  // déjà reprises seraient perdues, et le joueur puni d'avoir navigué.
  const opened = openReevaluation(at(atReevaluation(), 100_000));
  const remeasured = play(opened, "action.prendre-tension");
  const reopened = openReevaluation(remeasured);
  assert.equal(reopened.reevaluations.length, 1);
  assert.equal(
    currentReevaluation(reopened)!.startedAtSeconds,
    currentReevaluation(opened)!.startedAtSeconds,
  );
});

test("les mesures reprises sont déduites du journal, pas stockées", () => {
  const opened = openReevaluation(at(atReevaluation(), 100_000));
  const startedAt = currentReevaluation(opened)!.startedAtSeconds;
  assert.deepEqual(refreshedSince(opened, startedAt), []);

  const remeasured = play(opened, "action.prendre-tension", "action.compter-fr");
  const refreshed = refreshedSince(remeasured, startedAt);
  assert.ok(refreshed.includes("fact.ta"));
  assert.ok(refreshed.includes("fact.fr"));
  assert.ok(!refreshed.includes("fact.glasgow"), "le Glasgow n'a pas été repris");
});

test("valider sans avoir rien repris est refusé", () => {
  const opened = openReevaluation(at(atReevaluation(), 100_000));
  const attempt = validateReevaluation(opened);
  assert.equal(attempt.validated, false);
  assert.match(attempt.reason!, /Aucune mesure/);
  assert.equal(currentReevaluation(attempt.session)!.validated, false);
});

test("valider après avoir tout repris clôt le cycle", () => {
  const opened = openReevaluation(at(atReevaluation(), 100_000));
  const remeasured = play(opened, ...REMEASURE_ALL);
  const status = reevaluationStatus(remeasured);
  assert.deepEqual(status.stale, []);
  assert.deepEqual(status.missing, []);
  assert.equal(status.complete, true);

  const validated = validateReevaluation(remeasured, "Patient stable, conscience inchangée.");
  assert.equal(validated.validated, true);
  const cycle = validated.session.reevaluations[0]!;
  assert.equal(cycle.validated, true);
  assert.equal(cycle.note, "Patient stable, conscience inchangée.");
  assert.deepEqual(cycle.gapFactIds, []);
  assert.ok(cycle.refreshedFactIds.length >= MONITORED.length);
  assert.equal(currentReevaluation(validated.session), undefined);
});

test("un cycle où tout était frais se valide sans exiger de geste", () => {
  // Inventer une obligation de remesurer une constante fraîche apprendrait
  // l'inverse de ce qu'on veut : la réévaluation répond à un besoin, pas à un
  // rituel. Un bilan à jour se construit — le simple fait d'arriver à cette
  // phase suffit à dater le premier relevé.
  const fresh = play(atReevaluation(), ...REMEASURE_ALL);
  const opened = openReevaluation(fresh);
  assert.deepEqual(currentReevaluation(opened)!.gapFactIds, []);
  assert.equal(validateReevaluation(opened).validated, true);
});

test("un second cycle s'ouvre après validation du premier", () => {
  const first = validateReevaluation(
    play(openReevaluation(at(atReevaluation(), 100_000)), ...REMEASURE_ALL),
  ).session;
  const second = openReevaluation(at(first, 200_000));
  assert.equal(second.reevaluations.length, 2);
  assert.equal(currentReevaluation(second)!.cycle, 2);
});

/* -------------------------------------------------------------------------- */
/* Le renfort                                                                 */
/* -------------------------------------------------------------------------- */

test("le renfort progresse avec le temps, sans être stocké", () => {
  const session = atReevaluation();
  assert.equal(reinforcementStatus(session), "none");

  const requested = play(session, "action.demander-renfort");
  const askedAt = requested.simulatedTimeSeconds;
  assert.equal(reinforcementStatus(requested), "requested");
  assert.equal(
    reinforcementStatus(at(requested, askedAt + REINFORCEMENT_EN_ROUTE_SECONDS)),
    "en_route",
  );
  assert.equal(
    reinforcementStatus(at(requested, askedAt + REINFORCEMENT_ON_SCENE_SECONDS)),
    "on_scene",
  );
});

test("le cycle retient l'état du renfort au moment où il se clôt", () => {
  const requested = play(atReevaluation(), "action.demander-renfort");
  const opened = openReevaluation(requested);
  const later = play(at(opened, requested.simulatedTimeSeconds + 1000), ...REMEASURE_ALL);
  const validated = validateReevaluation(later);
  assert.equal(validated.session.reevaluations[0]!.reinforcement, "on_scene");
});

/* -------------------------------------------------------------------------- */
/* La sanction du départ                                                      */
/* -------------------------------------------------------------------------- */

test("partir avec des constantes datées coûte des points, pas une vie", () => {
  const stale = at(atReevaluation(), 100_000);
  // Le joueur a bien réévalué — la démarche est là, le résultat ne l'est pas.
  const reevaluated = play(play(stale, ...REMEASURE), "action.reevaluer-patient");
  const drifted = at(reevaluated, reevaluated.simulatedTimeSeconds + 100_000);
  assert.ok(staleExpectedFactIds(drifted, scenario).length > 0);

  const result = applyAction(drifted, "action.preparer-transport");
  const penalty = staleTransportPenalty(drifted, scenario);
  assert.ok(penalty > 0, "un départ sur constantes datées doit coûter");
  assert.equal(result.logEntry.flag, STALE_TRANSPORT_FLAG);
  assert.equal(result.session.lives, drifted.lives, "aucune vie ne doit être perdue");
  assert.equal(result.logEntry.scoreDelta, 6 - penalty);
});

test("partir sans avoir réévalué du tout coûte une vie", () => {
  const stale = at(atReevaluation(), 100_000);
  const readiness = transportReadiness(stale);
  assert.equal(readiness.graveFault, true);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.stale.length > 0);

  const result = applyAction(stale, "action.preparer-transport");
  assert.equal(result.logEntry.flag, "premature-transport");
  assert.equal(result.session.lives, stale.lives - 1);
});

test("partir sur un bilan à jour ne coûte rien", () => {
  const fresh = play(atReevaluation(), ...REMEASURE_ALL);
  const readiness = transportReadiness(fresh);
  assert.equal(readiness.ready, true);
  assert.equal(readiness.penalty, 0);
  assert.equal(readiness.graveFault, false);

  const result = applyAction(fresh, "action.preparer-transport");
  assert.equal(result.classification, "valid");
  assert.ok(result.logEntry.scoreDelta > 0);
  assert.equal(result.logEntry.flag, undefined);
  assert.equal(result.session.lives, fresh.lives);
});

test("la sanction du départ est plafonnée", () => {
  // Un joueur qui n'a rien réévalué perd déjà une vie. Empiler une pénalité sans
  // borne par-dessus ferait tomber le score à zéro sur une seule décision, et un
  // score à zéro n'apprend plus rien.
  const stale = at(atReevaluation(), 1_000_000);
  const penalty = staleTransportPenalty(stale, scenario);
  assert.equal(penalty, STALE_TRANSPORT_PENALTY_CAP);
  assert.ok(
    STALE_TRANSPORT_PENALTY_CAP < MONITORED.length * STALE_TRANSPORT_PENALTY_PER_FACT + 1,
    "le plafond doit mordre",
  );
});

test("l'avertissement de départ est lu dans le catalogue, jamais réécrit", () => {
  // Si les prérequis de « Préparer le transport » changent, l'avertissement doit
  // changer avec eux : le contraire produirait un écran qui ment.
  const stale = at(atReevaluation(), 100_000);
  assert.equal(transportReadiness(stale).graveFault, true);
  const reevaluated = play(stale, ...REMEASURE_ALL);
  assert.equal(transportReadiness(reevaluated).graveFault, false);
});

/* -------------------------------------------------------------------------- */
/* La réévaluation ne donne rien gratuitement                                  */
/* -------------------------------------------------------------------------- */

test("ouvrir et valider une réévaluation ne révèle aucune donnée", () => {
  const bare: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "reevaluation",
    status: "active",
  };
  const opened = openReevaluation(bare);
  assert.deepEqual(Object.keys(opened.revealedFacts), []);
  for (const factId of MONITORED) {
    assert.equal(readFact(opened, factId).status, "unknown", factId);
  }
  // Et la liste des trous nomme les constantes sans en donner la valeur.
  const status = reevaluationStatus(opened);
  for (const factId of status.missing) {
    assert.equal(readFact(opened, factId).status, "unknown", factId);
  }
});
