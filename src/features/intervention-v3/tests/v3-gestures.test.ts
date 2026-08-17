import assert from "node:assert/strict";
import test from "node:test";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import type { InterventionSession, PlayerActionId } from "../v3-domain.ts";
import { applyAction } from "../engine/apply-action.ts";
import { readFact } from "../facts/read-fact.ts";
import {
  allRefusedGestures,
  deselectGesture,
  gestureRoundTimeLeft,
  isGestureJustified,
  isGestureRoundExpired,
  missingJustifications,
  resolveGestureRound,
  selectGesture,
  GESTURE_NOT_INDICATED_FLAG,
  GESTURE_SCORES,
  GESTURE_UNJUSTIFIED_FLAG,
} from "../engine/v3-gestures.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "../scenarios/v3-catalog.ts";

/**
 * Les gestes prioritaires doivent être des décisions, pas des cases à cocher.
 * Ces tests vérifient qu'un bon geste rapporte, qu'un geste non indiqué coûte,
 * qu'un geste hors champ est refusé et expliqué, et qu'un bon geste choisi sans
 * l'élément clinique qui le fonde ne vaut pas le même prix qu'un geste raisonné.
 */

const scenario = getV3Scenario(PILOT_SCENARIO_ID);
const ROUND = "round.gestes-prioritaires";

const play = (session: InterventionSession, ...actionIds: PlayerActionId[]): InterventionSession =>
  actionIds.reduce((current, actionId) => applyAction(current, actionId).session, session);

/**
 * Session au tour des gestes.
 *
 * `withFacts` joue le recueil complet qui justifie les trois gestes recommandés.
 * Sans lui, on obtient un joueur arrivé aux gestes sans avoir rien évalué : c'est
 * le cas que le mode doit sanctionner, et il faut donc pouvoir le construire.
 */
function atPriorityActions({ withFacts }: { withFacts: boolean }): InterventionSession {
  const base: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "arrival",
    status: "active",
  };
  const gathered = withFacts
    ? play(
        base,
        "action.securiser-scene",
        "action.observer-environnement",
        "action.approcher-patient",
      )
    : base;
  const atVitals: InterventionSession = { ...gathered, phase: "vitals" };
  const measured = withFacts
    ? play(atVitals, "action.poser-saturometre", "action.evaluer-conscience")
    : atVitals;
  // Le temps est ramené au moment du dernier relevé : les constantes doivent être
  // fraîches pour que le test porte sur la justification, pas sur la péremption,
  // qui a son propre test plus bas.
  const fresh: InterventionSession = withFacts
    ? { ...measured, simulatedTimeSeconds: measured.simulatedTimeSeconds }
    : measured;
  return play(fresh, "action.appeler-centre15", "action.transmettre-bilan");
}

const roundOf = (session: InterventionSession) =>
  session.gestureRounds.find((entry) => entry.id === ROUND)!;

const gestureOf = (session: InterventionSession, gestureId: string) =>
  roundOf(session).offered.find((entry) => entry.id === gestureId)!;

/* -------------------------------------------------------------------------- */
/* Le tour existe et s'ouvre au bon moment                                    */
/* -------------------------------------------------------------------------- */

test("le tour de gestes attend trois choix parmi douze", () => {
  const round = roundOf(atPriorityActions({ withFacts: true }));
  assert.equal(round.requiredSelections, 3);
  assert.equal(round.offered.length, 12);
  assert.equal(round.offered.filter((gesture) => gesture.recommended).length, 3);
  assert.equal(round.offered.filter((gesture) => gesture.outOfScope).length, 4);
  assert.equal(round.resolved, false);
  assert.deepEqual(round.selected, []);
  assert.deepEqual(round.choices, []);
});

test("aucun geste ne se choisit avant la transmission du bilan", () => {
  const early: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "vitals",
    status: "active",
  };
  const result = selectGesture(early, ROUND, "geste.maintenir-axe");
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusal?.kind, "wrong_phase");
  assert.equal(result.session.score, early.score, "un refus ne touche pas au score");
});

/* -------------------------------------------------------------------------- */
/* Hors champ : refusé, expliqué, conservé                                    */
/* -------------------------------------------------------------------------- */

test("un geste hors du champ de l'ambulancier est refusé avec son explication", () => {
  const session = atPriorityActions({ withFacts: true });
  const result = selectGesture(session, ROUND, "geste.transporter-sans-reevaluation");

  assert.equal(result.outcome, "refused");
  assert.equal(result.refusal?.kind, "out_of_scope");
  // L'explication vient du scénario, jamais d'un texte générique.
  assert.equal(
    result.refusal?.reason,
    gestureOf(session, "geste.transporter-sans-reevaluation").outOfScopeReason,
  );
  assert.ok(result.refusal!.reason.length > 60, "le refus doit expliquer, pas seulement refuser");
  assert.equal(result.choice, null);
  assert.equal(result.session.score, session.score);
  assert.deepEqual(roundOf(result.session).selected, []);
});

test("les quatre gestes à refuser sont tous refusés", () => {
  const session = atPriorityActions({ withFacts: true });
  for (const gesture of roundOf(session).offered.filter((entry) => entry.outOfScope)) {
    const result = selectGesture(session, ROUND, gesture.id);
    assert.equal(result.outcome, "refused", gesture.id);
    assert.equal(result.refusal?.kind, "out_of_scope", gesture.id);
    assert.ok(gesture.outOfScopeReason, `${gesture.id} refusé sans explication`);
  }
});

test("une tentative refusée est conservée pour le débriefing", () => {
  // Un geste dangereux tenté puis refusé n'a aucun effet clinique, mais c'est une
  // information pédagogique : l'oublier reviendrait à ne rien apprendre de la
  // tentative.
  const session = atPriorityActions({ withFacts: true });
  const after = selectGesture(session, ROUND, "geste.retirer-immobilisation").session;
  const refused = allRefusedGestures(after);
  assert.equal(refused.length, 1);
  assert.equal(refused[0]!.gestureId, "geste.retirer-immobilisation");
  assert.ok(refused[0]!.reason.includes("relais médical"));
});

/* -------------------------------------------------------------------------- */
/* Le barème : le raisonnement compte, pas seulement le geste                  */
/* -------------------------------------------------------------------------- */

test("un geste recommandé et fondé sur le bilan rapporte des points", () => {
  const session = atPriorityActions({ withFacts: true });
  const gesture = gestureOf(session, "geste.maintenir-axe");
  assert.ok(isGestureJustified(session, gesture), "les faits du geste doivent être recueillis");

  const result = selectGesture(session, ROUND, "geste.maintenir-axe");
  assert.equal(result.outcome, "selected");
  assert.equal(result.choice?.recommended, true);
  assert.equal(result.choice?.justified, true);
  assert.equal(result.choice?.scoreDelta, GESTURE_SCORES.recommendedJustified);
  assert.equal(result.choice?.flag, null);
  assert.equal(result.session.score, session.score + GESTURE_SCORES.recommendedJustified);
});

test("le même geste choisi sans le bilan qui le fonde vaut moins", () => {
  // Immobiliser un traumatisé crânien est le bon geste. Le choisir sans avoir
  // évalué la conscience ni relevé le mécanisme, c'est avoir raison par hasard :
  // le geste compte, le raisonnement manque.
  const blind = atPriorityActions({ withFacts: false });
  const gesture = gestureOf(blind, "geste.maintenir-axe");
  assert.equal(isGestureJustified(blind, gesture), false);
  assert.deepEqual(missingJustifications(blind, gesture), [
    "fact.conscience-qualitative",
    "fact.indices-mecanisme",
  ]);

  const result = selectGesture(blind, ROUND, "geste.maintenir-axe");
  assert.equal(result.outcome, "selected");
  assert.equal(result.choice?.justified, false);
  assert.equal(result.choice?.scoreDelta, GESTURE_SCORES.recommendedUnjustified);
  assert.equal(result.choice?.flag, GESTURE_UNJUSTIFIED_FLAG);
  assert.ok(result.session.flags.includes(GESTURE_UNJUSTIFIED_FLAG));
  assert.ok(
    GESTURE_SCORES.recommendedUnjustified < GESTURE_SCORES.recommendedJustified,
    "le geste raisonné doit valoir davantage",
  );
  assert.ok(GESTURE_SCORES.recommendedUnjustified > 0, "le bon geste reste bénéfique au patient");
});

test("un geste non indiqué coûte des points et pose une alerte", () => {
  const session = atPriorityActions({ withFacts: true });
  const result = selectGesture(session, ROUND, "geste.rassurer-surveiller");
  assert.equal(result.outcome, "selected", "il n'est pas interdit, il est inutile ici");
  assert.equal(result.choice?.recommended, false);
  assert.ok(result.choice!.scoreDelta < 0, "un geste non indiqué doit coûter");
  assert.equal(result.choice?.flag, GESTURE_NOT_INDICATED_FLAG);
  assert.ok(result.session.score < session.score);
});

test("une constante périmée ne justifie plus un geste", () => {
  // La règle de fraîcheur s'applique aux gestes comme aux actions : un relevé
  // fait à la première minute ne peut pas justifier un geste une demi-heure plus
  // tard, sinon la réévaluation ne servirait à rien.
  const session = atPriorityActions({ withFacts: true });
  const gesture = gestureOf(session, "geste.reevaluer-constantes");
  assert.ok(isGestureJustified(session, gesture));

  const stale: InterventionSession = { ...session, simulatedTimeSeconds: 100_000 };
  const spo2 = readFact(stale, "fact.spo2");
  assert.equal(spo2.status, "known", "la mesure reste connue, elle est seulement datée");
  assert.equal(spo2.status === "known" && spo2.isStale, true);
  assert.equal(isGestureJustified(stale, gesture), false);
  const result = selectGesture(stale, ROUND, "geste.reevaluer-constantes");
  assert.equal(result.choice?.justified, false);
});

/* -------------------------------------------------------------------------- */
/* Les bornes du tour                                                         */
/* -------------------------------------------------------------------------- */

test("le tour refuse un quatrième geste", () => {
  let session = atPriorityActions({ withFacts: true });
  for (const gestureId of [
    "geste.maintenir-axe",
    "geste.surveiller-conscience-ventilation",
    "geste.reevaluer-constantes",
  ]) {
    session = selectGesture(session, ROUND, gestureId).session;
  }
  assert.equal(roundOf(session).selected.length, 3);

  const extra = selectGesture(session, ROUND, "geste.preparer-le-transport");
  assert.equal(extra.outcome, "refused");
  assert.equal(extra.refusal?.kind, "round_full");
  assert.equal(extra.session.score, session.score);
});

test("un même geste ne se choisit pas deux fois", () => {
  const session = atPriorityActions({ withFacts: true });
  const once = selectGesture(session, ROUND, "geste.maintenir-axe").session;
  const twice = selectGesture(once, ROUND, "geste.maintenir-axe");
  assert.equal(twice.outcome, "refused");
  assert.equal(twice.refusal?.kind, "already_selected");
  assert.equal(twice.session.score, once.score, "le score ne double pas");
});

test("retirer un geste rend exactement les points, et retire son alerte", () => {
  const session = atPriorityActions({ withFacts: true });
  const chosen = selectGesture(session, ROUND, "geste.rassurer-surveiller").session;
  assert.ok(chosen.flags.includes(GESTURE_NOT_INDICATED_FLAG));

  const undone = deselectGesture(chosen, ROUND, "geste.rassurer-surveiller");
  assert.equal(undone.score, session.score, "se corriger ne doit pas punir deux fois");
  assert.deepEqual(roundOf(undone).selected, []);
  assert.deepEqual(roundOf(undone).choices, []);
  assert.ok(!undone.flags.includes(GESTURE_NOT_INDICATED_FLAG));
});

test("retirer un geste ne retire pas l'alerte qu'un autre porte encore", () => {
  let session = atPriorityActions({ withFacts: true });
  session = selectGesture(session, ROUND, "geste.rassurer-surveiller").session;
  session = selectGesture(session, ROUND, "geste.installer-selon-tolerance").session;
  const undone = deselectGesture(session, ROUND, "geste.rassurer-surveiller");
  assert.ok(
    undone.flags.includes(GESTURE_NOT_INDICATED_FLAG),
    "un second geste non indiqué reste retenu : l'alerte doit tenir",
  );
});

test("un tour validé n'accepte plus rien", () => {
  const session = atPriorityActions({ withFacts: true });
  const chosen = selectGesture(session, ROUND, "geste.maintenir-axe").session;
  const resolved = resolveGestureRound(chosen, ROUND).session;
  const late = selectGesture(resolved, ROUND, "geste.reevaluer-constantes");
  assert.equal(late.outcome, "refused");
  assert.equal(late.refusal?.kind, "round_resolved");
  // Et retirer n'est plus possible non plus : le tour est clos.
  assert.deepEqual(deselectGesture(resolved, ROUND, "geste.maintenir-axe"), resolved);
});

/* -------------------------------------------------------------------------- */
/* La validation exige les deux moitiés                                       */
/* -------------------------------------------------------------------------- */

test("le tour est juste quand les trois gestes recommandés sont retenus", () => {
  let session = atPriorityActions({ withFacts: true });
  for (const gestureId of [
    "geste.maintenir-axe",
    "geste.surveiller-conscience-ventilation",
    "geste.reevaluer-constantes",
  ]) {
    session = selectGesture(session, ROUND, gestureId).session;
  }
  const resolution = resolveGestureRound(session, ROUND);
  assert.equal(resolution.correct, true);
  assert.deepEqual(resolution.missing, []);
  assert.deepEqual(resolution.notIndicated, []);
  assert.deepEqual(resolution.unjustified, []);
  assert.equal(roundOf(resolution.session).resolved, true);
  assert.equal(roundOf(resolution.session).correct, true);
});

test("le bon nombre de gestes ne suffit pas s'ils ne sont pas les bons", () => {
  // Trois gestes inutiles font trois sélections : compter ne suffit donc pas.
  let session = atPriorityActions({ withFacts: true });
  for (const gestureId of [
    "geste.rassurer-surveiller",
    "geste.installer-selon-tolerance",
    "geste.preparer-le-transport",
  ]) {
    session = selectGesture(session, ROUND, gestureId).session;
  }
  const resolution = resolveGestureRound(session, ROUND);
  assert.equal(roundOf(resolution.session).selected.length, 3);
  assert.equal(resolution.correct, false);
  assert.equal(resolution.missing.length, 3, "les trois gestes recommandés manquent");
  assert.equal(resolution.notIndicated.length, 3);
});

test("la validation rapporte les gestes justes choisis sans raisonnement", () => {
  let session = atPriorityActions({ withFacts: false });
  for (const gestureId of [
    "geste.maintenir-axe",
    "geste.surveiller-conscience-ventilation",
    "geste.reevaluer-constantes",
  ]) {
    session = selectGesture(session, ROUND, gestureId).session;
  }
  const resolution = resolveGestureRound(session, ROUND);
  // Les bons gestes, sans le bilan : le tour est « juste » sur le choix, et le
  // débriefing doit pouvoir dire que rien ne les fondait.
  assert.equal(resolution.correct, true);
  assert.deepEqual(resolution.missing, []);
  assert.equal(resolution.unjustified.length, 3);
});

/* -------------------------------------------------------------------------- */
/* Le chronomètre                                                             */
/* -------------------------------------------------------------------------- */

test("le chronomètre du tour part de la transmission du bilan", () => {
  const session = atPriorityActions({ withFacts: true });
  const round = roundOf(session);
  assert.equal(round.timerSeconds, 300);
  const left = gestureRoundTimeLeft(session, round);
  assert.ok(left !== null && left > 0 && left <= 300, `restant : ${left}`);
  assert.equal(isGestureRoundExpired(session, round), false);

  const late: InterventionSession = { ...session, simulatedTimeSeconds: 100_000 };
  assert.equal(gestureRoundTimeLeft(late, round), 0);
  assert.equal(isGestureRoundExpired(late, round), true);
});

/* -------------------------------------------------------------------------- */
/* Les gestes ne donnent aucune information                                   */
/* -------------------------------------------------------------------------- */

test("choisir un geste ne révèle aucune donnée clinique", () => {
  // Sans quoi cocher les douze cartes deviendrait un moyen de sonder le patient
  // sans rien mesurer.
  const session = atPriorityActions({ withFacts: false });
  const before = Object.keys(session.revealedFacts).length;
  let after = session;
  for (const gesture of roundOf(session).offered) {
    after = selectGesture(after, ROUND, gesture.id).session;
  }
  assert.equal(Object.keys(after.revealedFacts).length, before);
  for (const factId of ["fact.spo2", "fact.ta", "fact.glasgow", "fact.antecedents"]) {
    assert.equal(readFact(after, factId).status, "unknown", factId);
  }
});
