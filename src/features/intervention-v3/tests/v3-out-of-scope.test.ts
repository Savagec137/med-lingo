import assert from "node:assert/strict";
import test from "node:test";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import { toSessionView, type InterventionSession, type PlayerActionId } from "../v3-domain.ts";
import { applyAction } from "../engine/apply-action.ts";
import { commitGestureRound, transmitHandover } from "../engine/v3-handover.ts";
import { selectGesture } from "../engine/v3-gestures.ts";
import { createDebriefReport } from "../engine/v3-debrief.ts";
import {
  outOfScopeActionForTerm,
  outOfScopeActionsForPhase,
  OUT_OF_SCOPE_TERMS,
} from "../engine/out-of-scope.ts";
import { priorityActionsScreenModel } from "../ui/priority-actions-screen.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "../scenarios/v3-catalog.ts";

/**
 * Le périmètre de l'ambulancier, sous les mots du terrain.
 *
 * L'article R. 6311-17 est une liste **limitative** : ce qui n'y figure pas est
 * hors champ. Le refus n'est donc pas une restriction de jeu, c'est le droit — et
 * l'écran doit l'enseigner, pas seulement l'appliquer.
 *
 * Le défaut que ces tests ferment : trois des termes qu'un apprenant emploie
 * — cathéter, seringue, médicament IV — n'apparaissaient nulle part dans le
 * catalogue. Un joueur cherchant le geste sous son nom courant ne trouvait rien,
 * et n'apprenait donc pas qu'il est interdit.
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

/** Les huit catégories nommées comme devant être refusées. */
const FORBIDDEN_CATEGORIES = [
  "perfusion",
  "voie veineuse",
  "cathéter",
  "seringue",
  "injection",
  "médicament IV",
  "diagnostic médical définitif",
  "geste invasif",
] as const;

const play = (session: InterventionSession, ...actionIds: PlayerActionId[]): InterventionSession =>
  actionIds.reduce((current, actionId) => applyAction(current, actionId).session, session);

/** Session au tour des gestes prioritaires. */
function atGestures(): InterventionSession {
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
  const called = play({ ...scene, phase: "vitals" }, "action.appeler-centre15");
  return transmitHandover(called, { itemIds: EXPECTED_ITEMS }).session;
}

/* -------------------------------------------------------------------------- */
/* Les huit catégories sont toutes couvertes                                  */
/* -------------------------------------------------------------------------- */

test("chacune des huit catégories interdites a un refus qui lui répond", () => {
  for (const term of FORBIDDEN_CATEGORIES) {
    const action = outOfScopeActionForTerm(term);
    assert.ok(action, `« ${term} » ne correspond à aucun acte refusé`);
    assert.equal(action.outOfScope, true, term);
    assert.ok(action.outOfScopeReason, `« ${term} » est refusé sans explication`);
  }
});

test("le refus explique la règle et sa source, jamais « ce n'est pas autorisé »", () => {
  // « Ce n'est pas autorisé » n'apprend rien. « Aucun acte de l'article
  // R. 6311-17 ne prévoit d'abord vasculaire pour l'ambulancier » apprend la
  // règle et son fondement.
  const reasons = new Set<string>();
  for (const term of FORBIDDEN_CATEGORIES) {
    const reason = outOfScopeActionForTerm(term)!.outOfScopeReason!;
    assert.ok(reason.length > 55, `« ${term} » : motif trop court — « ${reason} »`);
    reasons.add(reason);
  }
  // Au moins un motif cite le texte : le périmètre a une source, pas un usage.
  assert.ok(
    [...reasons].some((reason) => /R\.\s*6311-17/.test(reason)),
    "aucun refus ne cite l'article qui fonde le périmètre",
  );
});

test("le vocabulaire du terrain est visible dans le catalogue, pas seulement dans la table", () => {
  // La table de correspondance permet de répondre à un terme. Encore faut-il que
  // le joueur croise le mot : les intitulés et indices des actes refusés doivent
  // porter le vocabulaire courant, sans quoi il ne le rencontre jamais.
  const catalogueText = Object.values(OUT_OF_SCOPE_TERMS)
    .map((actionId) => {
      const action = outOfScopeActionForTerm(
        Object.keys(OUT_OF_SCOPE_TERMS).find((term) => OUT_OF_SCOPE_TERMS[term] === actionId)!,
      )!;
      return `${action.label} ${action.hint} ${action.outOfScopeReason}`;
    })
    .join(" ")
    .toLocaleLowerCase("fr");

  for (const term of ["perfusion", "voie veineuse", "cathéter", "seringue", "invasif"]) {
    assert.ok(catalogueText.includes(term), `« ${term} » n'apparaît nulle part dans le catalogue`);
  }
  // « Injection » et « intraveineuse » désignent le même acte sous deux formes.
  assert.ok(/inject/.test(catalogueText));
  assert.ok(/intraveineuse|iv\b/.test(catalogueText));
  assert.ok(/diagnostic/.test(catalogueText));
});

/* -------------------------------------------------------------------------- */
/* Le moteur refuse effectivement                                             */
/* -------------------------------------------------------------------------- */

test("tenter un acte hors périmètre est refusé, sans effet et sans coût de temps", () => {
  const session = atGestures();
  for (const term of FORBIDDEN_CATEGORIES) {
    const action = outOfScopeActionForTerm(term)!;
    const result = applyAction(session, action.id);
    assert.equal(result.classification, "impossible", `${term} → ${action.id}`);
    assert.equal(result.logEntry.outcome, "refused", action.id);
    assert.equal(result.logEntry.refusalKind, "out_of_scope", action.id);
    assert.equal(result.reason, action.outOfScopeReason, action.id);
    // Un refus ne consomme rien : ni temps, ni score, ni vie.
    assert.equal(result.session.simulatedTimeSeconds, session.simulatedTimeSeconds, action.id);
    assert.equal(result.session.score, session.score, action.id);
    assert.equal(result.session.lives, session.lives, action.id);
    assert.deepEqual(result.logEntry.revealedFactIds, [], action.id);
  }
});

test("un acte hors périmètre ne révèle aucune donnée clinique", () => {
  const session = atGestures();
  const before = Object.keys(session.revealedFacts).length;
  let after = session;
  for (const term of FORBIDDEN_CATEGORIES) {
    after = applyAction(after, outOfScopeActionForTerm(term)!.id).session;
  }
  assert.equal(Object.keys(after.revealedFacts).length, before);
});

/* -------------------------------------------------------------------------- */
/* L'écran les présente barrés plutôt que de les cacher                       */
/* -------------------------------------------------------------------------- */

test("l'écran des gestes présente les actes hors périmètre, barrés et expliqués", () => {
  // Les masquer serait plus simple et n'enseignerait rien. Un acte présenté,
  // tenté et refusé avec son motif est le moment où la limite s'apprend.
  const model = priorityActionsScreenModel(toSessionView(atGestures()));
  assert.ok(model.outOfScopeActs.length >= 5, `seulement ${model.outOfScopeActs.length} actes`);

  const offered = new Set(model.outOfScopeActs.map((act) => act.id));
  for (const actionId of [
    "action.perfuser",
    "action.poser-voie-veineuse",
    "action.injecter-produit",
    "action.sonder-invasif",
    "action.poser-diagnostic",
  ]) {
    assert.ok(offered.has(actionId), `${actionId} doit être visible à cette phase`);
  }
  for (const act of model.outOfScopeActs) {
    assert.equal(act.enabled, false, act.id);
    assert.ok(act.refusalReason.length > 55, act.id);
  }
});

test("chaque acte hors périmètre affiché est bien refusé par le moteur", () => {
  // L'accord entre l'écran et le moteur, sur cette catégorie précise : ce qui est
  // montré barré doit être ce que le moteur rejette.
  const session = atGestures();
  const model = priorityActionsScreenModel(toSessionView(session));
  for (const act of model.outOfScopeActs) {
    const result = applyAction(session, act.id);
    assert.equal(result.classification, "impossible", act.id);
    assert.equal(result.reason, act.refusalReason, act.id);
  }
});

test("aucun acte hors périmètre ne figure parmi les gestes sélectionnables", () => {
  // Les deux listes ne se mélangent pas : un acte interdit n'est jamais une carte
  // qu'on peut retenir dans le tour.
  const model = priorityActionsScreenModel(toSessionView(atGestures()));
  const actIds = new Set(model.outOfScopeActs.map((act) => act.id));
  for (const card of model.cards) {
    assert.ok(!actIds.has(card.id), `${card.id} apparaît dans les deux listes`);
  }
});

/* -------------------------------------------------------------------------- */
/* Les six critères de l'écran Gestes prioritaires                            */
/* -------------------------------------------------------------------------- */

test("critère 1 — un geste correct donne un score positif", () => {
  const session = atGestures();
  const result = selectGesture(session, ROUND, RECOMMENDED[0]!);
  assert.equal(result.outcome, "selected");
  assert.ok(result.choice!.scoreDelta > 0, `score : ${result.choice!.scoreDelta}`);
  assert.ok(result.session.score > session.score);
});

test("critère 2 — un geste dangereux donne une alerte", () => {
  const session = atGestures();
  const notIndicated = selectGesture(session, ROUND, "geste.rassurer-surveiller");
  assert.equal(notIndicated.choice!.flag, "gesture-not-indicated");
  assert.ok(notIndicated.session.flags.includes("gesture-not-indicated"));

  const dangerous = selectGesture(session, ROUND, "geste.transporter-sans-reevaluation");
  assert.equal(dangerous.outcome, "refused");
  assert.equal(dangerous.refusal!.kind, "out_of_scope");
});

test("critère 3 — les gestes hors champ sont refusés, avec leur motif", () => {
  const session = atGestures();
  const outOfScopeGestures = session.gestureRounds
    .flatMap((round) => round.offered)
    .filter((gesture) => gesture.outOfScope);
  assert.equal(outOfScopeGestures.length, 4);
  for (const gesture of outOfScopeGestures) {
    const result = selectGesture(session, ROUND, gesture.id);
    assert.equal(result.outcome, "refused", gesture.id);
    assert.equal(result.refusal!.reason, gesture.outOfScopeReason, gesture.id);
    assert.deepEqual(result.session.gestureRounds[0]!.selected, [], gesture.id);
  }
});

test("critère 4 — les gestes sélectionnés sont visibles", () => {
  let session = atGestures();
  session = selectGesture(session, ROUND, RECOMMENDED[0]!).session;
  session = selectGesture(session, ROUND, RECOMMENDED[1]!).session;
  const model = priorityActionsScreenModel(toSessionView(session));

  assert.equal(model.selectedCount, 2);
  const selected = model.cards.filter((card) => card.selected).map((card) => card.id);
  assert.deepEqual(selected, [RECOMMENDED[0], RECOMMENDED[1]]);
  // Les cartes retenues restent affichées, marquées plutôt que retirées.
  assert.equal(model.cards.length, 12);
});

test("critère 5 — les gestes manquants apparaissent au débrief", () => {
  const session = commitGestureRound(atGestures(), ROUND).session;
  const report = createDebriefReport(session, scenario);
  const missing = report.gestureReview.filter((entry) => entry.kind === "missing");
  assert.deepEqual(
    missing.map((entry) => entry.gestureId).sort(),
    [...RECOMMENDED].sort(),
    "les trois gestes attendus et non retenus doivent figurer au débrief",
  );
  for (const entry of missing) {
    assert.ok(entry.label.length > 0, entry.gestureId);
    assert.ok(entry.detail.length > 0, entry.gestureId);
  }
});

test("critère 6 — aucune information clinique non révélée n'apparaît sur l'écran", () => {
  // Le tour de gestes est atteint sans avoir rien mesuré : l'écran ne doit
  // laisser filtrer aucune valeur, ni dans les cartes, ni dans les actes barrés,
  // ni dans la liste de ce qui manque pour fonder un geste.
  const model = priorityActionsScreenModel(toSessionView(atGestures()));
  const fields = [
    model.title,
    model.narrative,
    ...model.cards.flatMap((card) => [
      card.label,
      card.hint,
      card.refusalReason ?? "",
      card.blockedReason ?? "",
      ...card.missingJustifications.map((fact) => fact.label),
    ]),
    ...model.outOfScopeActs.flatMap((act) => [act.label, act.hint, act.refusalReason]),
  ];
  // Tous les chiffres ne sont pas des fuites : cet écran cite l'article
  // R. 6311-17 et la compétence 7 du bloc 3, qui fondent les refus. Le contrôle
  // vise donc ce qui ferait d'un nombre une donnée clinique — sa valeur de
  // départ, ou son accolement à une unité de mesure.
  const baseline = Object.values(scenario.clinical.baseline as unknown as Record<string, number>);
  const clinicalUnit = /\d\s*(%|\/min|mmHg|mmol\/L|g\/L|°C|\/15|\/10)/i;

  for (const field of fields) {
    assert.ok(!clinicalUnit.test(field), `valeur avec unité clinique : « ${field} »`);
    for (const value of baseline) {
      assert.ok(
        !new RegExp(`\\b${value}\\b`).test(field),
        `l'écran des gestes laisse fuir ${value} : « ${field} »`,
      );
    }
  }
});

test("l'écran nomme ce qui manque pour fonder un geste, sans en donner la valeur", () => {
  const model = priorityActionsScreenModel(toSessionView(atGestures()));
  const constants = model.cards.find((card) => card.id === "geste.reevaluer-constantes")!;
  assert.equal(constants.justified, false);
  assert.deepEqual(
    constants.missingJustifications.map((fact) => fact.label),
    ["SpO₂", "Pouls"],
  );
  // Nommer la donnée manquante aide à raisonner ; en donner la valeur la
  // révélerait sans mesure.
  for (const fact of constants.missingJustifications) {
    assert.ok(!/\d/.test(fact.label), fact.label);
  }
});

/* -------------------------------------------------------------------------- */
/* La phase compte : un acte interdit ailleurs l'est aussi ici                */
/* -------------------------------------------------------------------------- */

test("un acte hors périmètre l'est à toutes les phases où il est proposé", () => {
  for (const phase of ["patient_assessment", "vitals", "centre15_call", "priority_actions"]) {
    for (const action of outOfScopeActionsForPhase(phase)) {
      assert.equal(action.outOfScope, true, `${phase} → ${action.id}`);
      assert.ok(action.outOfScopeReason, `${phase} → ${action.id}`);
    }
  }
  // Et l'ensemble couvre bien les quatre gestes techniques de la phase des gestes.
  const atPriority = outOfScopeActionsForPhase("priority_actions").map((action) => action.id);
  for (const actionId of [
    "action.perfuser",
    "action.poser-voie-veineuse",
    "action.injecter-produit",
    "action.sonder-invasif",
  ]) {
    assert.ok(atPriority.includes(actionId), actionId);
  }
});

test("la recherche par terme est insensible à la casse et aux espaces", () => {
  // Un apprenant écrit « Cathéter », « CATHÉTER » ou « cathéter  ». Les trois
  // doivent trouver le même refus.
  const reference = outOfScopeActionForTerm("cathéter")!;
  for (const variant of ["Cathéter", "CATHÉTER", "  cathéter  "]) {
    assert.equal(outOfScopeActionForTerm(variant)?.id, reference.id, variant);
  }
  assert.equal(outOfScopeActionForTerm("prendre la tension"), undefined);
});
