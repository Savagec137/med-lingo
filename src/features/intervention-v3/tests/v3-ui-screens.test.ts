import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import { toSessionView, type InterventionSession, type PlayerActionId } from "../v3-domain.ts";
import { applyAction } from "../engine/apply-action.ts";
import { selectGesture, resolveGestureRound } from "../engine/v3-gestures.ts";
import { commitGestureRound, transmitHandover } from "../engine/v3-handover.ts";
import { answerRegulatorQuestion } from "../engine/v3-transmission.ts";
import { openReevaluation, validateReevaluation } from "../engine/v3-reevaluation.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "../scenarios/v3-catalog.ts";
import { centre15ScreenModel } from "../ui/centre15-screen.ts";
import { priorityActionsScreenModel } from "../ui/priority-actions-screen.ts";
import { reevaluationScreenModel } from "../ui/reevaluation-screen.ts";
import { vitalsScreenModel } from "../ui/vitals-screen.ts";
import { monitoringSnapshot } from "../physiology/physiology-selectors.ts";

/**
 * Les écrans 4, 5 et 6 en couche présentation.
 *
 * Chaque bouton de maquette doit être relié à un effet réel du moteur, et chaque
 * écran doit rester étanche : nommer les données sans jamais en donner la valeur.
 * Ces tests vérifient les deux.
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

/**
 * Le relevé qui remet à jour **tout** ce qui périme au bilan attendu.
 *
 * L'ordre suit les délais : la glycémie tient quinze minutes, la douleur dix, les
 * cinq constantes surveillées cinq. Les plus fragiles se relèvent donc en dernier,
 * sans quoi la première mesure de la série a vieilli avant la fin de la série.
 */
const REFRESH_ALL: readonly PlayerActionId[] = [
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

/** Session à l'appel du 15, bilan complet ou vide. */
function atCall(complete: boolean): InterventionSession {
  const atVitals: InterventionSession = { ...started(), phase: "vitals" };
  const gathered = complete ? play(atVitals, ...GATHER) : atVitals;
  return play(gathered, "action.appeler-centre15");
}

/** Session au tour des gestes, bilan complet. */
const atGestures = () => transmitHandover(atCall(true), { itemIds: EXPECTED_ITEMS }).session;

/**
 * Session à la réévaluation : bilan complet, gestes retenus puis **validés**.
 *
 * La validation passe par `commitGestureRound`, qui clôt le tour et fait avancer
 * la phase d'un seul geste. Appeler `resolveGestureRound` seul laisserait la
 * mission à la phase des gestes, où aucune mesure n'est proposée.
 */
function atReevaluation(): InterventionSession {
  let session = atGestures();
  for (const gestureId of RECOMMENDED) session = selectGesture(session, ROUND, gestureId).session;
  return commitGestureRound(session, ROUND).session;
}

/** Toutes les chaînes atteignables, pour les contrôles d'étanchéité. */
function allStrings(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) for (const item of value) allStrings(item, into);
  else if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value)) allStrings(nested, into);
  }
  return into;
}

/* -------------------------------------------------------------------------- */
/* Écran 4 — Appel au 15                                                      */
/* -------------------------------------------------------------------------- */

test("l'écran d'appel liste les éléments du bilan avec ce que la sélection produirait", () => {
  const session = toSessionView(atCall(true));
  const model = centre15ScreenModel(session, ["item.constantes"]);
  assert.equal(model.title, "Appel au 15");
  assert.equal(model.items.length, scenario.handoverItems.length);

  const constants = model.items.find((item) => item.id === "item.constantes")!;
  assert.equal(constants.selected, true);
  assert.equal(constants.complete, true);
  assert.equal(constants.outcome, "transmitted");
  assert.equal(constants.outcomeLabel, "Transmise");

  // Un élément possédé mais non coché : le joueur voit l'oubli avant de le commettre.
  const glycemia = model.items.find((item) => item.id === "item.glycemie")!;
  assert.equal(glycemia.selected, false);
  assert.equal(glycemia.outcome, "omitted");
  assert.ok(glycemia.outcomeLabel.includes("connue"));
});

test("l'écran d'appel compte les trous que la sélection laisserait silencieux", () => {
  // La faute doit être visible avant d'être commise, pas seulement au débriefing.
  const empty = centre15ScreenModel(toSessionView(atCall(false)), []);
  assert.equal(empty.silentGapCount, EXPECTED_ITEMS.length);
  assert.equal(empty.omittedCount, 0, "rien n'était recueilli : rien n'est oublié");

  const disclosed = centre15ScreenModel(toSessionView(atCall(false)), EXPECTED_ITEMS);
  assert.equal(disclosed.silentGapCount, 0, "annoncer un trou n'est pas le taire");

  const full = centre15ScreenModel(toSessionView(atCall(true)), EXPECTED_ITEMS);
  assert.equal(full.silentGapCount, 0);
  assert.equal(full.omittedCount, 0);
});

test("l'écran d'appel nomme les données sans jamais en donner la valeur", () => {
  const model = centre15ScreenModel(toSessionView(atCall(true)), EXPECTED_ITEMS);
  const fields = model.items.flatMap((item) => [
    item.label,
    item.outcomeLabel,
    ...item.facts.map((fact) => `${fact.label} ${fact.statusLabel}`),
  ]);
  for (const field of fields) {
    assert.ok(!/\d/.test(field), `l'écran d'appel laisse fuir « ${field} »`);
  }
});

test("l'écran d'appel annonce les questions que la régulation posera", () => {
  const model = centre15ScreenModel(toSessionView(atCall(false)), EXPECTED_ITEMS);
  assert.ok(model.questions.length >= 3, `questions annoncées : ${model.questions.length}`);
  for (const question of model.questions) {
    assert.ok(question.text.endsWith("?"), question.text);
    assert.ok(question.answers.length >= 3, question.id);
    assert.equal(question.answeredWith, null);
    // L'écran ne dit pas laquelle est la bonne : ce serait donner la réponse.
    const fields = allStrings(question.answers);
    assert.ok(!fields.some((field) => /correct|juste|bonne réponse/i.test(field)));
  }
});

test("l'écran d'appel mêle constats et formulations diagnostiques sans les distinguer", () => {
  // Distinguer les ajouts refusables à l'écran retirerait la décision : c'est au
  // joueur de reconnaître qu'une conclusion n'est pas de son ressort.
  const model = centre15ScreenModel(toSessionView(atCall(true)), EXPECTED_ITEMS);
  const texts = model.additions.map((addition) => addition.text);
  for (const observation of scenario.freeAdditions) assert.ok(texts.includes(observation));
  for (const diagnosis of scenario.rejectedAdditions) assert.ok(texts.includes(diagnosis));
  assert.equal(
    model.additions.length,
    scenario.freeAdditions.length + scenario.rejectedAdditions.length,
  );
});

test("après transmission, l'écran d'appel montre la consigne et les réponses données", () => {
  const transmitted = transmitHandover(atCall(false), { itemIds: EXPECTED_ITEMS });
  const question = transmitted.questions[0]!;
  const answer = question.answers.find((entry) => entry.correct)!;
  const answered = answerRegulatorQuestion(transmitted.session, question.id, answer.id).session;

  const model = centre15ScreenModel(toSessionView(answered), EXPECTED_ITEMS);
  assert.equal(model.transmitted, true);
  assert.equal(model.instruction, scenario.regulatorInstruction);
  const shown = model.questions.find((entry) => entry.id === question.id)!;
  assert.equal(shown.answeredWith, answer.id);
  assert.ok(!model.pendingQuestionIds.includes(question.id));
});

/* -------------------------------------------------------------------------- */
/* Écran 5 — Gestes prioritaires                                              */
/* -------------------------------------------------------------------------- */

test("l'écran des gestes affiche les douze cartes, hors périmètre comprises", () => {
  // Masquer les cartes hors périmètre supprimerait la décision. Le mode repose sur
  // le fait que l'erreur soit possible, et le refus expliqué est le moment
  // pédagogique.
  const model = priorityActionsScreenModel(toSessionView(atGestures()));
  assert.equal(model.title, "Gestes prioritaires");
  assert.equal(model.cards.length, 12);
  const outOfScope = model.cards.filter((card) => card.outOfScope);
  assert.equal(outOfScope.length, 4);
  for (const card of outOfScope) {
    assert.equal(card.selectable, true, `${card.id} doit rester cliquable`);
    assert.ok(card.refusalReason && card.refusalReason.length > 60, card.id);
  }
});

test("l'écran des gestes dit ce qui manque pour fonder un geste, pas lequel choisir", () => {
  const blind = toSessionView(transmitHandover(atCall(false), { itemIds: [] }).session);
  const model = priorityActionsScreenModel(blind);
  const constants = model.cards.find((card) => card.id === "geste.reevaluer-constantes")!;
  assert.equal(constants.justified, false);
  assert.deepEqual(
    constants.missingJustifications.map((fact) => fact.factId),
    ["fact.spo2", "fact.fc"],
  );
  // L'écran n'expose jamais `recommended` : ce serait la réponse.
  assert.ok(!("recommended" in constants));
  const fields = allStrings(model.cards);
  assert.ok(!fields.some((field) => /recommand/i.test(field)));
});

test("un geste fondé sur le bilan est marqué comme tel", () => {
  const model = priorityActionsScreenModel(toSessionView(atGestures()));
  for (const gestureId of RECOMMENDED) {
    const card = model.cards.find((entry) => entry.id === gestureId)!;
    assert.equal(card.justified, true, gestureId);
    assert.deepEqual(card.missingJustifications, [], gestureId);
  }
});

test("le tour complet bloque les cartes restantes, sauf celles hors périmètre", () => {
  let session = atGestures();
  for (const gestureId of RECOMMENDED) session = selectGesture(session, ROUND, gestureId).session;
  const model = priorityActionsScreenModel(toSessionView(session));

  assert.equal(model.selectedCount, 3);
  assert.equal(model.canResolve, true);
  const spare = model.cards.find((card) => card.id === "geste.preparer-le-transport")!;
  assert.equal(spare.selectable, false);
  assert.ok(spare.blockedReason!.includes("3 gestes"));
  // Les cartes hors périmètre restent cliquables : leur refus est l'enseignement.
  const forbidden = model.cards.find((card) => card.id === "geste.non-indique")!;
  assert.equal(forbidden.selectable, true);
  // Et les gestes retenus sont marqués sans disparaître.
  const chosen = model.cards.find((card) => card.id === RECOMMENDED[0])!;
  assert.equal(chosen.selected, true);
  assert.equal(chosen.blockedReason, "Déjà retenu.");
});

test("un tour validé ferme toutes les cartes", () => {
  const resolved = resolveGestureRound(atGestures(), ROUND).session;
  const model = priorityActionsScreenModel(toSessionView(resolved));
  assert.equal(model.resolved, true);
  assert.equal(model.canResolve, false);
  assert.ok(model.cards.every((card) => !card.selectable));
});

test("l'écran des gestes rappelle les tentatives refusées", () => {
  const attempted = selectGesture(atGestures(), ROUND, "geste.retirer-immobilisation").session;
  const model = priorityActionsScreenModel(toSessionView(attempted));
  assert.equal(model.refusedAttempts.length, 1);
  assert.equal(model.refusedAttempts[0]!.label, "Retirer l'immobilisation trop tôt");
  assert.ok(model.refusedAttempts[0]!.reason.includes("relais médical"));
});

test("le chronomètre du tour est affiché et s'épuise", () => {
  const model = priorityActionsScreenModel(toSessionView(atGestures()));
  assert.ok(model.secondsLeft !== null && model.secondsLeft > 0);
  const late = priorityActionsScreenModel(
    toSessionView({ ...atGestures(), simulatedTimeSeconds: 100_000 }),
  );
  assert.equal(late.secondsLeft, 0);
  assert.equal(late.expired, true);
});

/* -------------------------------------------------------------------------- */
/* Écran 6 — Réévaluation patient                                             */
/* -------------------------------------------------------------------------- */

test("l'écran de réévaluation distingue à jour, datée et jamais mesurée", () => {
  // Les trois états sont nécessaires : une constante datée se remesure, une
  // constante jamais relevée se mesure pour la première fois.
  const stale: InterventionSession = { ...atReevaluation(), simulatedTimeSeconds: 100_000 };
  const model = reevaluationScreenModel(toSessionView(stale));
  assert.equal(model.title, "Réévaluation patient");
  const byId = new Map(model.rows.map((row) => [row.factId, row]));
  assert.equal(byId.get("fact.ta")!.freshness, "stale");
  assert.equal(byId.get("fact.ta")!.freshnessLabel, "À réévaluer");
  // Les données d'interrogatoire ne périment pas : elles restent à jour.
  assert.equal(byId.get("fact.antecedents")!.freshness, "fresh");

  const bare: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase: "reevaluation",
    status: "active",
  };
  const empty = reevaluationScreenModel(toSessionView(bare));
  assert.ok(empty.rows.every((row) => row.freshness === "never"));
  assert.equal(empty.missingCount, scenario.expectedHandoverFactIds.length);
});

test("l'écran de réévaluation ne propose de reprendre que ce qui a vieilli", () => {
  // Proposer de remesurer une constante fraîche inviterait à un geste inutile qui
  // coûterait du temps.
  const stale: InterventionSession = { ...atReevaluation(), simulatedTimeSeconds: 100_000 };
  const model = reevaluationScreenModel(toSessionView(stale));
  for (const row of model.rows) {
    if (row.freshness === "fresh") assert.equal(row.action, null, row.factId);
  }
  const tension = model.rows.find((row) => row.factId === "fact.ta")!;
  assert.equal(tension.action?.id, "action.prendre-tension");
  assert.equal(tension.action?.enabled, true);
});

test("l'écran de réévaluation n'affiche aucune valeur clinique", () => {
  const stale: InterventionSession = { ...atReevaluation(), simulatedTimeSeconds: 100_000 };
  const model = reevaluationScreenModel(toSessionView(stale));
  const fields = model.rows.flatMap((row) => [
    row.label,
    row.freshnessLabel,
    row.action?.label ?? "",
  ]);
  for (const field of fields) {
    assert.ok(!/\d/.test(field), `l'écran de réévaluation laisse fuir « ${field} »`);
  }
});

test("la validation se refuse tant que rien n'a été repris", () => {
  const stale: InterventionSession = { ...atReevaluation(), simulatedTimeSeconds: 100_000 };
  const opened = openReevaluation(stale);
  const blocked = reevaluationScreenModel(toSessionView(opened));
  assert.equal(blocked.open, true);
  assert.equal(blocked.cycle, 1);
  assert.equal(blocked.canValidate, false);
  assert.match(blocked.validationBlockedReason!, /Aucune mesure/);

  const remeasured = play(opened, ...REFRESH_ALL);
  const ready = reevaluationScreenModel(toSessionView(remeasured));
  assert.equal(ready.canValidate, true);
  assert.equal(ready.validationBlockedReason, null);
  assert.ok(ready.refreshedCount >= 5);
});

test("un cycle validé n'est plus ouvert", () => {
  const stale: InterventionSession = { ...atReevaluation(), simulatedTimeSeconds: 100_000 };
  const opened = openReevaluation(stale);
  const remeasured = play(opened, "action.prendre-tension");
  const validated = validateReevaluation(remeasured).session;
  const model = reevaluationScreenModel(toSessionView(validated));
  assert.equal(model.open, false);
  assert.match(model.validationBlockedReason!, /Aucune réévaluation en cours/);
});

test("l'écran de réévaluation annonce ce qu'un départ coûterait", () => {
  // Le mode laisse partir : il ne cache pas le prix. Et il distingue les deux
  // fautes, qui ne se paient pas de la même monnaie.

  // N'avoir jamais réévalué : faute grave, une vie.
  const neverReevaluated = commitGestureRound(
    transmitHandover(atCall(false), { itemIds: [] }).session,
    ROUND,
  ).session;
  const grave = reevaluationScreenModel(toSessionView(neverReevaluated));
  assert.equal(grave.transport.ready, false);
  assert.equal(grave.transport.graveFault, true);
  assert.match(grave.transport.warning!, /faute grave/);

  // Avoir réévalué, mais il y a longtemps : des points, pas une vie. Le joueur a
  // fait la démarche et l'a laissée vieillir.
  const stale: InterventionSession = { ...atReevaluation(), simulatedTimeSeconds: 100_000 };
  const dated = reevaluationScreenModel(toSessionView(stale));
  assert.equal(dated.transport.graveFault, false, "la démarche a bien eu lieu");
  assert.ok(dated.transport.penalty > 0, "mais le bilan est daté");
  assert.match(dated.transport.warning!, /datée/);

  // Bilan repris à l'instant : rien à payer.
  const reevaluated = play(stale, ...REFRESH_ALL);
  const ready = reevaluationScreenModel(toSessionView(reevaluated));
  assert.equal(ready.transport.graveFault, false);
  assert.equal(ready.transport.penalty, 0);
  assert.equal(ready.transport.warning, null);
  assert.equal(ready.transport.ready, true);
});

test("l'état du renfort est affiché en clair", () => {
  const model = reevaluationScreenModel(toSessionView(atReevaluation()));
  assert.equal(model.reinforcement, "none");
  assert.equal(model.reinforcementLabel, "Aucun renfort demandé");

  const requested = play(atReevaluation(), "action.demander-renfort");
  const asked = reevaluationScreenModel(toSessionView(requested));
  assert.equal(asked.reinforcement, "requested");
  assert.equal(asked.reinforcementLabel, "Renfort demandé");
});

/* -------------------------------------------------------------------------- */
/* La barrière tient sur les nouveaux écrans                                   */
/* -------------------------------------------------------------------------- */

test("aucun présentateur n'atteint le moteur mutant", () => {
  // La règle ESLint dit la même chose, mais un test tourne à chaque `npm test` et
  // une règle de lint se contourne par une directive en commentaire.
  const uiDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "ui");
  const files = readdirSync(uiDirectory).filter((name) => name.endsWith(".ts"));
  assert.ok(files.length >= 7, `seulement ${files.length} présentateurs`);

  const forbidden = [
    "engine/apply-action",
    "engine/index",
    "engine/v3-gestures",
    "engine/v3-reevaluation",
    "engine/v3-transmission",
    "engine/v3-handover",
    "engine/v3-debrief",
    "engine/v3-scoring",
    "v3-session",
    "intervention-vitals",
    "reveal-fact",
  ];
  for (const file of files) {
    const source = readFileSync(join(uiDirectory, file), "utf8");
    for (const pattern of forbidden) {
      assert.ok(!source.includes(pattern), `${file} mentionne « ${pattern} »`);
    }
  }
});

test("les requêtes du moteur ne rendent jamais de session", () => {
  // La propriété qui rend la barrière utile : ce que `queries.ts` expose est sans
  // effet. Une fonction qui rendrait une session modifiée y ouvrirait une brèche.
  const engineDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "engine");
  // Les commentaires nomment volontairement les fonctions absentes pour dire
  // pourquoi elles le sont : le contrôle ne porte donc que sur le code.
  const source = readFileSync(join(engineDirectory, "queries.ts"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  for (const mutator of [
    "applyAction",
    "selectGesture",
    "deselectGesture",
    "resolveGestureRound",
    "openReevaluation",
    "validateReevaluation",
    "transmitHandover",
    "answerRegulatorQuestion",
    "buildCentre15Transmission",
    "createDebriefReport",
  ]) {
    assert.ok(!source.includes(mutator), `queries.ts expose « ${mutator} », qui a un effet`);
  }
});

/* -------------------------------------------------------------------------- */
/* Écran 3 — les blocs de la maquette                                         */
/* -------------------------------------------------------------------------- */

/**
 * La maquette de l'écran des constantes porte trois blocs que le modèle doit
 * savoir produire : le panneau « État du patient », la liste à cocher
 * « Matériel utilisé », et le partage entre mesures rapides et évaluations
 * cliniques.
 *
 * Le premier est le plus exposé du mode : il donne une lecture clinique en trois
 * mots. Les tests qui suivent vérifient d'abord qu'il se tait.
 */

const atVitalsPhase = (): InterventionSession => ({
  ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
  phase: "vitals",
  status: "active" as const,
});

test("le panneau « État du patient » ne dit rien sur une session vierge", () => {
  const model = vitalsScreenModel(toSessionView(atVitalsPhase()));
  assert.equal(model.patientReadout.length, 3);
  for (const line of model.patientReadout) {
    assert.equal(line.known, false, line.id);
  }
  // Aucune des trois phrases n'affirme quoi que ce soit du patient.
  const labels = model.patientReadout.map((line) => line.label).join(" | ");
  assert.equal(/stable|conscient|répond/iu.test(labels), false, labels);
});

test("« Stable » n'apparaît qu'après trois constantes relevées", () => {
  // La stabilité est calculée depuis les sévérités de la SpO₂, du pouls et de la
  // fréquence respiratoire. Deux mesures ne suffisent pas : le panneau reste muet.
  const twoMeasures = play(atVitalsPhase(), "action.poser-saturometre");
  const partial = vitalsScreenModel(toSessionView(twoMeasures)).patientReadout;
  assert.equal(partial.find((line) => line.id === "stabilite")?.known, false);

  const threeMeasures = play(twoMeasures, "action.compter-fr");
  const complete = vitalsScreenModel(toSessionView(threeMeasures)).patientReadout;
  const stability = complete.find((line) => line.id === "stabilite");
  assert.equal(stability?.known, true);
  assert.equal(stability?.label, "Stable");
  assert.equal(stability?.tone, "positive");
});

test("« Répond aux questions » demande d'avoir interrogé le patient", () => {
  const before = vitalsScreenModel(toSessionView(atVitalsPhase())).patientReadout;
  assert.equal(before.find((line) => line.id === "communication")?.label, "Patient non interrogé");

  const asked = play(atVitalsPhase(), "action.interroger-patient");
  const after = vitalsScreenModel(toSessionView(asked)).patientReadout;
  assert.equal(after.find((line) => line.id === "communication")?.label, "Répond aux questions");
});

test("la liste « Matériel utilisé » tient en libellés courts, tous décochés au départ", () => {
  const model = vitalsScreenModel(toSessionView(atVitalsPhase()));
  assert.deepEqual(
    model.equipmentChecks.map((check) => check.label),
    // Le nom de l'appareil quand il y en a un, celui de la donnée relevée sinon :
    // exactement les six lignes de la maquette.
    ["Saturomètre", "Tensiomètre", "Glucomètre", "Thermomètre", "Douleur", "Glasgow"],
  );
  assert.equal(
    model.equipmentChecks.every((check) => !check.done),
    true,
  );

  const posed = play(atVitalsPhase(), "action.poser-saturometre");
  const after = vitalsScreenModel(toSessionView(posed)).equipmentChecks;
  assert.equal(after.find((check) => check.id === "action.poser-saturometre")?.done, true);
  assert.equal(after.find((check) => check.id === "action.prendre-tension")?.done, false);
});

test("mesures et évaluations se partagent comme dans la maquette", () => {
  const model = vitalsScreenModel(toSessionView(atVitalsPhase()));

  // Six mesures rapides : ce qui se lit sur un instrument.
  assert.deepEqual(model.quickMeasures.map((measure) => measure.id).sort(), [
    "action.compter-fr",
    "action.faire-glycemie",
    "action.palper-pouls",
    "action.poser-saturometre",
    "action.prendre-temperature",
    "action.prendre-tension",
  ]);
  // Trois évaluations : un score sur une échelle, ou un constat sans unité.
  assert.deepEqual(model.clinicalAssessments.map((measure) => measure.id).sort(), [
    "action.evaluer-conscience",
    "action.evaluer-douleur",
    "action.observer-peau",
  ]);
  // Le retrait du capteur n'est ni l'un ni l'autre : il ne relève rien.
  assert.deepEqual(
    model.sensorControls.map((measure) => measure.id),
    ["action.retirer-saturometre"],
  );
});

test("« Signes vitaux » ne retient que les constantes surveillables", () => {
  const session = atVitalsPhase();
  const model = vitalsScreenModel(
    toSessionView(session),
    monitoringSnapshot(session, session.simulatedTimeSeconds),
  );
  assert.deepEqual(model.monitoredVitals.map((card) => card.factId).sort(), [
    "fact.fc",
    "fact.spo2",
  ]);
  // Les autres restent visibles : c'est cette grille en gabarits qui montre au
  // joueur tout ce qu'il n'a pas encore relevé.
  assert.ok(model.otherVitals.length >= 4);
  assert.equal(
    model.otherVitals.some((card) => card.factId === "fact.ta"),
    true,
  );
});
