import assert from "node:assert/strict";
import test from "node:test";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import {
  GRAVE_FAULT_FLAGS,
  toSessionView,
  type EquipmentId,
  type InterventionSession,
  type InterventionSessionView,
  type PlayerActionId,
} from "../v3-domain.ts";
import { getAction } from "../actions/action-catalog.ts";
import { applyAction } from "../engine/apply-action.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { hudModel, xpProgress, HUD_VARIANTS, type PlayerHud } from "../ui/hud-model.ts";
import { newCallScreenModel, receivedInformation } from "../ui/new-call-screen.ts";
import {
  arrivalScreenModel,
  weatherFromDispatch,
  ARRIVAL_MOCKUP_ACTIONS,
} from "../ui/arrival-screen.ts";
import {
  splitFormattedValue,
  vitalsScreenModel,
  type VitalsScreenModel,
} from "../ui/vitals-screen.ts";

/**
 * La couche présentation est la seule partie de l'interface vérifiable dans cet
 * environnement : ni `vite build` ni serveur de dev ne s'exécutent ici, et le
 * dépôt n'a pas d'outillage de rendu DOM. Ces tests valident donc ce qu'un écran
 * **doit afficher** et **quels boutons sont actifs**, pas son apparence.
 */

const scenario = getV3Scenario("v3-pilot-trauma-cranien");

/**
 * Vue que reçoit l'interface. Les constantes réelles et leur historique sont
 * retirés : c'est la barrière qui empêche un écran de les lire. Les tests la
 * respectent plutôt que de la contourner par un cast.
 */
function view(overrides: Partial<InterventionSessionView> = {}): InterventionSessionView {
  return { ...toSessionView(createV3Session(scenario)), ...overrides };
}

const session = view();

/** Profil joueur des maquettes 1 à 4 : 2 450 pièces, niveau 12, 2 850 / 4 000 XP. */
const PLAYER: PlayerHud = {
  coins: 2450,
  level: 12,
  xp: 2850,
  xpToNextLevel: 4000,
  maxLives: 5,
  clock: "14:37",
  dateChip: "MAR 13",
  online: true,
};

/* -------------------------------------------------------------------------- */
/* Le bandeau : quatre dispositions pour cinq maquettes                       */
/* -------------------------------------------------------------------------- */

test("les quatre dispositions de bandeau sont déclarées", () => {
  assert.deepEqual([...HUD_VARIANTS], ["dispatch", "field", "monitoring", "critical"]);
});

test("maquette 1 — le bandeau porte la date, les pièces, les vies, le niveau et l'avatar", () => {
  const hud = hudModel(session, "dispatch", PLAYER);
  assert.deepEqual(
    hud.slots.map((slot) => slot.kind),
    ["date", "coins", "lives", "level", "avatar"],
  );
  // Pas de logo sur cet écran : la maquette n'en montre pas.
  assert.ok(!hud.slots.some((slot) => slot.kind === "logo"));
  const lives = hud.slots.find((slot) => slot.kind === "lives")!;
  assert.equal(lives.kind === "lives" && lives.caption, "Vies");
  assert.equal(lives.kind === "lives" && lives.max, 5);
  const avatar = hud.slots.find((slot) => slot.kind === "avatar")!;
  // Point de présence sur la maquette 1, pas de pastille de niveau.
  assert.equal(avatar.kind === "avatar" && avatar.online, true);
  assert.equal(avatar.kind === "avatar" && avatar.badgeLevel, null);
});

test("maquette 2 — le bandeau porte le menu à gauche et le logo au centre", () => {
  const hud = hudModel(session, "field", PLAYER);
  assert.deepEqual(
    hud.slots.map((slot) => slot.kind),
    ["menu", "lives", "logo", "coins", "avatar"],
  );
  const coins = hud.slots.find((slot) => slot.kind === "coins")!;
  assert.equal(coins.kind === "coins" && coins.caption, "Pièces");
  const avatar = hud.slots.find((slot) => slot.kind === "avatar")!;
  // Pastille de niveau sur l'avatar, pas de point de présence.
  assert.equal(avatar.kind === "avatar" && avatar.badgeLevel, 12);
});

test("maquettes 3 et 4 — même bandeau, avec l'heure et « Niveau »", () => {
  const hud = hudModel(session, "monitoring", PLAYER);
  assert.deepEqual(
    hud.slots.map((slot) => slot.kind),
    ["clock", "lives", "coins", "logo", "level", "avatar"],
  );
  const clock = hud.slots.find((slot) => slot.kind === "clock")!;
  assert.equal(clock.kind === "clock" && clock.value, "14:37");
  const level = hud.slots.find((slot) => slot.kind === "level")!;
  assert.equal(level.kind === "level" && level.caption, "Niveau");
});

test("maquette 5 — les vies et les pièces perdent leur libellé, le menu passe à droite", () => {
  const hud = hudModel(view({ lives: 3 }), "critical", { ...PLAYER, coins: 1250 });
  assert.deepEqual(
    hud.slots.map((slot) => slot.kind),
    ["clock", "lives", "coins", "logo", "level", "avatar", "menu"],
  );
  const lives = hud.slots.find((slot) => slot.kind === "lives")!;
  // La maquette 5 affiche « 3 » seul, sans total ni libellé.
  assert.equal(lives.kind === "lives" && lives.value, 3);
  assert.equal(lives.kind === "lives" && lives.max, null);
  assert.equal(lives.kind === "lives" && lives.caption, null);
  const level = hud.slots.find((slot) => slot.kind === "level")!;
  assert.equal(level.kind === "level" && level.caption, "NIVEAU");
});

test("les vies du bandeau viennent de la session, jamais du profil", () => {
  const wounded = view({ lives: 2 });
  for (const variant of HUD_VARIANTS) {
    const hud = hudModel(wounded, variant, PLAYER);
    const lives = hud.slots.find((slot) => slot.kind === "lives")!;
    assert.equal(lives.kind === "lives" && lives.value, 2, variant);
  }
});

test("la barre d'XP reste bornée entre 0 et 1", () => {
  assert.equal(xpProgress({ xp: 2850, xpToNextLevel: 4000 }), 0.7125);
  assert.equal(xpProgress({ xp: 0, xpToNextLevel: 4000 }), 0);
  assert.equal(xpProgress({ xp: 9000, xpToNextLevel: 4000 }), 1);
  assert.equal(xpProgress({ xp: -10, xpToNextLevel: 4000 }), 0);
  // Un palier à zéro ne doit pas produire de division par zéro.
  assert.equal(xpProgress({ xp: 100, xpToNextLevel: 0 }), 0);
});

/* -------------------------------------------------------------------------- */
/* Écran 1 — Nouvel appel                                                     */
/* -------------------------------------------------------------------------- */

test("l'écran d'appel reprend le motif, le lieu et la priorité du scénario", () => {
  const model = newCallScreenModel(session);
  assert.equal(model.title, "Nouvel appel — Centre 15");
  assert.equal(model.reason, "Traumatisme crânien sur chute avec inconscience");
  const byLabel = new Map(model.lines.map((line) => [line.label, line.value]));
  assert.equal(byLabel.get("Lieu"), "Axe N104, borne 24");
  assert.equal(byLabel.get("Priorité"), "Élevée");
  assert.equal(byLabel.get("Équipe engagée"), "Ambulance + binôme DEA");
  assert.equal(byLabel.get("Contexte"), "Appel témoin");
});

test("une priorité élevée déclenche le bandeau « Mission prioritaire »", () => {
  const model = newCallScreenModel(session);
  assert.equal(model.priorityBanner, "Mission prioritaire");
  const priority = model.lines.find((line) => line.label === "Priorité")!;
  assert.equal(priority.emphasis, true);
});

test("les informations reçues viennent de la note de dispatch, sans réécriture", () => {
  const received = receivedInformation(scenario.alert.dispatchNote);
  assert.equal(received.length, 3);
  for (const line of received) {
    assert.ok(line.length > 0);
    // Première lettre en capitale, comme la maquette l'affiche.
    assert.equal(line[0], line[0]!.toLocaleUpperCase("fr"));
    // Chaque puce doit provenir de la note, jamais d'un texte ajouté.
    const words = line.toLocaleLowerCase("fr").split(/\s+/u);
    assert.ok(
      words.every((word) =>
        scenario.alert.dispatchNote.toLocaleLowerCase("fr").includes(word.replace(/[.,;]/gu, "")),
      ),
      line,
    );
  }
});

/**
 * Les puces sont propres au scénario : « Patient retrouvé inconscient au bord de
 * la voie » ne vaut que pour un patient retrouvé inconscient. Rien n'est écrit
 * en dur, et le découpage doit donc tenir sur des notes de dispatch de natures
 * très différentes sans produire de fragment illisible.
 */
const DISPATCH_NOTES: readonly string[] = [
  "Appel du patient : douleur thoracique depuis 40 minutes, sueurs, gêne respiratoire. Domicile, 3e étage sans ascenseur.",
  "Appel de l'épouse : malaise avec perte de connaissance brève, patient conscient à notre appel, diabétique connu.",
  "Appel du collègue : difficulté respiratoire d'aggravation progressive, patient assis, parle par phrases courtes.",
  "Chute de sa hauteur chez une personne âgée, douleur de hanche, ne peut plus se relever.",
  "Femme enceinte, contractions rapprochées depuis une heure.",
];

test("le découpage des informations reçues tient sur d'autres scénarios", () => {
  for (const note of DISPATCH_NOTES) {
    const received = receivedInformation(note);
    assert.ok(received.length >= 2, `${note} : ${received.length} puce(s)`);
    assert.ok(received.length <= 3, "la maquette n'en affiche pas plus de trois");
    for (const line of received) {
      // Une puce commence par une capitale et porte au moins deux mots : un
      // fragment comme « Ne peut plus » ne serait pas lisible dans la maquette.
      assert.equal(line[0], line[0]!.toLocaleUpperCase("fr"), line);
      assert.ok(line.split(/\s+/u).length >= 2, `puce trop courte : « ${line} »`);
      // Le préfixe « Appel de … : » est retiré, il n'est pas une information reçue.
      assert.ok(!/^Appel /u.test(line), `le préfixe d'appel subsiste : « ${line} »`);
    }
  }
});

test("le découpage ne coupe pas sur une virgule suivie d'un nombre", () => {
  // « Domicile, 3e étage » est une seule information, pas deux.
  const received = receivedInformation("Chute à domicile, 3e étage sans ascenseur.");
  assert.deepEqual(received, ["Chute à domicile, 3e étage sans ascenseur"]);
});

test("une note sans ponctuation forte reste une puce unique", () => {
  assert.deepEqual(receivedInformation("Patient inconscient"), ["Patient inconscient"]);
});

test("l'écran d'appel n'expose aucune donnée clinique", () => {
  // Le régulateur n'a pas donné de constantes : l'écran ne doit pas en montrer.
  const model = newCallScreenModel(session);
  const text = JSON.stringify(model);
  for (const forbidden of ["92", "138", "98", "36,8", "glycém", "SpO"]) {
    assert.ok(!text.includes(forbidden), `l'écran d'appel laisse fuir « ${forbidden} »`);
  }
});

test("les trois boutons de l'écran d'appel sont ceux de la maquette", () => {
  const model = newCallScreenModel(session);
  assert.deepEqual(
    model.actions.map((action) => [action.id, action.role]),
    [
      ["accept", "primary"],
      ["details", "secondary"],
      ["prepare", "tertiary"],
    ],
  );
  assert.ok(model.actions.every((action) => action.enabled));
});

/* -------------------------------------------------------------------------- */
/* Écran 2 — Arrivée sur les lieux                                            */
/* -------------------------------------------------------------------------- */

test("l'écran d'arrivée reprend heure, localisation et distance du scénario", () => {
  const model = arrivalScreenModel(view({ phase: "arrival" }), { totalSteps: 12 });
  assert.equal(model.title, "Arrivée sur les lieux");
  assert.equal(model.subtitle, "Traumatisme crânien sur chute avec inconscience");
  assert.deepEqual(
    model.meta.map((entry) => [entry.label, entry.value]),
    [
      ["Heure", "22:47"],
      ["Localisation", "Axe N104, borne 24"],
      ["Distance", "2,4 km"],
    ],
  );
});

test("la météo est extraite de la note de dispatch, pas inventée", () => {
  assert.equal(weatherFromDispatch("Pluie, 18 °C."), "18 °C");
  assert.equal(weatherFromDispatch("Pluie, 18°C"), "18 °C");
  assert.equal(weatherFromDispatch("-3 °C, verglas"), "-3 °C");
  // Sans température dans la note, l'écran n'affiche pas de météo.
  assert.equal(weatherFromDispatch("Appel d'un témoin, chute suspectée."), null);
  const model = arrivalScreenModel(view({ phase: "arrival" }), { totalSteps: 12 });
  assert.equal(model.weather, "18 °C");
});

test("les actions de l'écran viennent du catalogue, avec leur indice", () => {
  const model = arrivalScreenModel(view({ phase: "arrival" }), { totalSteps: 12 });
  const byId = new Map(model.actions.map((action) => [action.id, action]));
  const secure = byId.get("action.securiser-scene")!;
  assert.ok(secure, "l'action de sécurisation doit être proposée à l'arrivée");
  assert.equal(secure.label, "Sécuriser la zone");
  assert.equal(secure.hint, "Mettre en sécurité le patient et l'environnement");
  assert.equal(secure.enabled, true);
  const observe = byId.get("action.observer-environnement")!;
  assert.equal(observe.hint, "Rechercher des dangers, témoins, indices");
});

test("une action déjà réalisée est présentée désactivée, avec sa raison", () => {
  const played = view({
    phase: "arrival",
    actionLog: [
      {
        actionId: "action.securiser-scene" as const,
        phase: "arrival" as const,
        atSeconds: 30,
        outcome: "applied" as const,
        revealedFactIds: [],
        scoreDelta: 5,
        patientDelta: 0,
      },
    ],
  });
  const model = arrivalScreenModel(played, { totalSteps: 12 });
  const secure = model.actions.find((action) => action.id === "action.securiser-scene")!;
  assert.equal(secure.enabled, false);
  assert.equal(secure.disabledReason, "Action déjà réalisée.");
  // L'action reste affichée : la maquette ne fait pas disparaître les cartes.
  assert.ok(model.actions.length >= 2);
});

test("aucune action proposée à l'arrivée n'est hors du champ DEA", () => {
  const model = arrivalScreenModel(view({ phase: "arrival" }), { totalSteps: 12 });
  for (const action of model.actions) {
    assert.equal(action.outOfScope, false, action.id);
  }
});

/* -------------------------------------------------------------------------- */
/* La maquette 2 est désormais couverte en entier                             */
/* -------------------------------------------------------------------------- */

/**
 * Il manquait deux actions au catalogue : « Approcher le patient » n'était
 * déclarée qu'à partir de `scene_assessment`, et « Demander renfort » n'existait
 * pas. Le catalogue a été étendu, l'écart est nul, et ce test interdit qu'il se
 * rouvre.
 */
test("les quatre actions de la maquette 2 sont toutes proposées à l'arrivée", () => {
  const model = arrivalScreenModel(view({ phase: "arrival" }), { totalSteps: 12 });
  const offered = new Set(model.actions.map((action) => action.label));
  const missing = ARRIVAL_MOCKUP_ACTIONS.filter((label) => !offered.has(label));
  assert.deepEqual(missing, [], "une action de la maquette 2 a disparu du catalogue");
});

test("l'ordre des actions de la maquette 2 est respecté", () => {
  const model = arrivalScreenModel(view({ phase: "arrival" }), { totalSteps: 12 });
  const labels = model.actions.map((action) => action.label);
  const positions = ARRIVAL_MOCKUP_ACTIONS.map((label) => labels.indexOf(label));
  assert.ok(
    positions.every((position, index) => index === 0 || position > positions[index - 1]!),
    `ordre obtenu : ${labels.join(", ")}`,
  );
});

test("demander renfort sans avoir observé la scène reste jouable mais fautif", () => {
  // Le prérequis est souple : l'action n'est pas refusée, elle est sanctionnée.
  // C'est le principe du mode — l'erreur est possible, et elle coûte.
  const reinforcement = getAction("action.demander-renfort");
  assert.deepEqual(reinforcement.requires.justifyingActions, ["action.observer-environnement"]);
  assert.deepEqual(reinforcement.requires.blockingActions, []);
  assert.ok(reinforcement.unjustifiedEffect, "l'effet du manque de justification doit être décrit");
  assert.ok(reinforcement.unjustifiedEffect!.score < 0);
  assert.equal(reinforcement.unjustifiedEffect!.therapeutic, false);
  assert.equal(reinforcement.unjustifiedEffect!.patient, 0);
  // Le prérequis souple n'empêche pas l'action d'être affichée active.
  const model = arrivalScreenModel(view({ phase: "arrival" }), { totalSteps: 12 });
  const card = model.actions.find((action) => action.id === "action.demander-renfort")!;
  assert.equal(card.enabled, true);
  assert.equal(card.hint, "Solliciter un moyen supplémentaire si nécessaire");
});

test("approcher le patient sans scène sécurisée est une faute grave, pas un refus", () => {
  const approach = getAction("action.approcher-patient");
  assert.ok(approach.requires.phases.includes("arrival"), "la maquette la montre dès l'arrivée");
  assert.deepEqual(approach.requires.justifyingFacts, ["fact.scene-securisee"]);
  assert.deepEqual(approach.requires.blockingActions, [], "le garde-fou est souple, pas bloquant");
  assert.equal(approach.unjustifiedEffect!.flag, "unsafe-approach");
  assert.ok(
    GRAVE_FAULT_FLAGS.includes(
      approach.unjustifiedEffect!.flag as (typeof GRAVE_FAULT_FLAGS)[number],
    ),
    "une approche sur scène non sécurisée doit rester une faute grave",
  );
});

test("les deux actions de la maquette que le catalogue couvre sont bien proposées", () => {
  const model = arrivalScreenModel(view({ phase: "arrival" }), { totalSteps: 12 });
  const offered = new Set(model.actions.map((action) => action.label));
  assert.ok(offered.has("Sécuriser la zone"));
  assert.ok(offered.has("Observer l'environnement"));
});

test("la progression de mission part de l'étape 1 sur 12, comme la maquette", () => {
  const model = arrivalScreenModel(view({ phase: "arrival" }), { totalSteps: 12 });
  assert.equal(model.progress.label, "01: Arrivée");
  assert.equal(model.progress.completedSteps, 1);
  assert.equal(model.progress.totalSteps, 12);
});

/* -------------------------------------------------------------------------- */
/* Écran 3 — Constantes en direct                                             */
/* -------------------------------------------------------------------------- */

/**
 * Session complète amenée à la phase des constantes. Elle sert à jouer de vraies
 * actions avec le moteur : les tests de cet écran ne fabriquent pas de faits
 * révélés à la main, ils les obtiennent en mesurant, comme un joueur.
 */
function atVitals(equipment: readonly EquipmentId[] = ALL_EQUIPMENT): InterventionSession {
  return {
    ...createV3Session(scenario, { preparedEquipment: equipment }),
    phase: "vitals",
    status: "active",
  };
}

const play = (session: InterventionSession, ...actionIds: PlayerActionId[]): InterventionSession =>
  actionIds.reduce((current, actionId) => applyAction(current, actionId).session, session);

const cardOf = (model: VitalsScreenModel, factId: string) =>
  model.vitals.find((card) => card.factId === factId)!;

const measureOf = (model: VitalsScreenModel, actionId: string) =>
  [...model.quickMeasures, ...model.sensorControls].find((measure) => measure.id === actionId)!;

test("sur une session vierge, aucune constante n'est affichée", () => {
  const model = vitalsScreenModel(toSessionView(atVitals()));
  assert.equal(model.title, "Constantes en direct");
  assert.ok(model.vitals.length >= 8, `seulement ${model.vitals.length} constantes`);
  for (const card of model.vitals) {
    assert.equal(card.measured, false, card.factId);
    assert.equal(card.severity, null, card.factId);
    assert.equal(card.trend, null, card.factId);
    assert.equal(card.value, card.value.trim());
  }
  assert.equal(model.measuredCount, 0);
  assert.ok(model.expectedCount >= 6);
});

test("aucun chiffre ne s'affiche avant la première mesure", () => {
  // La règle centrale du mode, vérifiée sur l'écran qui la met le plus à
  // l'épreuve : les huit constantes du patient existent dans le moteur dès la
  // première seconde, et aucune ne doit apparaître sans un relevé.
  const model = vitalsScreenModel(toSessionView(atVitals()));
  const shown = [
    ...model.vitals.flatMap((card) => [card.value, card.missingLabel ?? ""]),
    ...model.evaluations.map((entry) => entry.value),
    model.narrative,
  ];
  for (const text of shown) {
    assert.ok(!/[0-9]/.test(text), `l'écran des constantes laisse fuir « ${text} »`);
  }
});

test("la grille ne contient que les constantes chiffrées du patient", () => {
  const model = vitalsScreenModel(toSessionView(atVitals()));
  const ids = model.vitals.map((card) => card.factId);
  for (const expected of [
    "fact.spo2",
    "fact.fc",
    "fact.ta",
    "fact.fr",
    "fact.temperature",
    "fact.glycemie",
    "fact.eva",
    "fact.glasgow",
  ]) {
    assert.ok(ids.includes(expected), `${expected} manque à la grille`);
  }
  // Les faits de scène appartiennent au bilan circonstanciel, pas à cet écran.
  for (const scene of ["fact.scene-securisee", "fact.dangers", "fact.indices-mecanisme"]) {
    assert.ok(!ids.includes(scene), `${scene} n'a rien à faire dans les constantes`);
  }
  // Les faits non chiffrés vont au panneau des évaluations, pas à la grille.
  const evaluationIds = model.evaluations.map((entry) => entry.factId);
  assert.ok(evaluationIds.includes("fact.coloration"));
  assert.ok(!ids.includes("fact.coloration"));
});

test("poser le saturomètre affiche la SpO₂ et le pouls, et rien d'autre", () => {
  const played = play(atVitals(), "action.poser-saturometre");
  const model = vitalsScreenModel(toSessionView(played));
  const spo2 = cardOf(model, "fact.spo2");
  assert.equal(spo2.measured, true);
  // La valeur et son unité sont séparées : la maquette compose un grand nombre
  // et une petite unité, et « 98 % % » serait le résultat d'un doublon.
  assert.match(spo2.value, /^\d+$/);
  assert.equal(spo2.unit, "%");
  assert.equal(cardOf(model, "fact.fc").measured, true);
  // Le saturomètre ne donne pas la tension : elle reste un trou.
  const tension = cardOf(model, "fact.ta");
  assert.equal(tension.measured, false);
  assert.equal(tension.missingLabel, "Non mesurée");
  assert.equal(model.measuredCount, 2);
});

test("le matériel non embarqué rend la mesure hors d'atteinte, pas oubliée", () => {
  // Distinction que le joueur doit voir : un trou qu'il peut combler et un trou
  // qu'il ne peut plus combler ne se corrigent pas de la même façon.
  const model = vitalsScreenModel(toSessionView(atVitals(["saturometre"])));
  const glycemia = cardOf(model, "fact.glycemie");
  assert.equal(glycemia.measured, false);
  assert.equal(glycemia.outOfReach, true);
  assert.equal(glycemia.missingLabel, "Glucomètre non embarqué");
  const pulse = cardOf(model, "fact.fc");
  assert.equal(pulse.outOfReach, false, "le pouls se palpe sans appareil");
});

test("une mesure impossible est présentée désactivée avec le nom du matériel", () => {
  const model = vitalsScreenModel(toSessionView(atVitals(["saturometre"])));
  const glycemia = measureOf(model, "action.faire-glycemie");
  assert.equal(glycemia.enabled, false);
  assert.equal(glycemia.disabledReason, "Matériel non embarqué : Glucomètre.");
  assert.deepEqual(glycemia.equipment, ["Glucomètre"]);
  // La carte reste affichée : le joueur doit comprendre ce qui lui manque.
  assert.equal(glycemia.label, getAction("action.faire-glycemie").label);
});

test("retirer un capteur qui n'est pas posé est refusé par l'écran aussi", () => {
  // C'est la règle que la première version de l'écran d'arrivée avait oubliée en
  // réécrivant les prérequis de son côté. L'écran interroge désormais le moteur.
  const model = vitalsScreenModel(toSessionView(atVitals()));
  const remove = measureOf(model, "action.retirer-saturometre");
  assert.equal(remove.enabled, false);
  assert.equal(remove.disabledReason, "Le saturomètre n'est pas posé.");

  const posed = play(atVitals(), "action.poser-saturometre");
  const after = measureOf(vitalsScreenModel(toSessionView(posed)), "action.retirer-saturometre");
  assert.equal(after.enabled, true);
});

test("une mesure déjà prise est marquée, sans disparaître", () => {
  const played = play(atVitals(), "action.prendre-tension");
  const model = vitalsScreenModel(toSessionView(played));
  const tension = measureOf(model, "action.prendre-tension");
  assert.equal(tension.alreadyDone, true);
  // Le tensiomètre n'a pas de plafond d'utilisation : reprendre la TA est permis.
  assert.equal(tension.enabled, true);
});

test("la glycémie porte ses deux unités, sans interprétation", () => {
  // Le registre décrit la glycémie en mmol/L, le relevé est formaté en g/L pour
  // le terrain. Annoncer « mmol/L » à côté d'une valeur en g/L afficherait une
  // mesure fausse d'un facteur cinq : l'unité vient donc de la valeur affichée.
  const model = vitalsScreenModel(toSessionView(play(atVitals(), "action.faire-glycemie")));
  const glycemia = cardOf(model, "fact.glycemie");
  assert.equal(glycemia.measured, true);
  assert.equal(glycemia.unit, "g/L");
  assert.match(glycemia.value, /^\d+,\d{2}$/);
  assert.match(glycemia.secondaryValue!, /^\d+,\d mmol\/L$/);
  // Aucune qualification de la valeur n'accompagne le changement d'unité.
  for (const word of ["normale", "basse", "élevée", "hypo", "hyper"]) {
    assert.ok(!glycemia.secondaryValue!.toLowerCase().includes(word));
  }
  // Les autres constantes n'ont qu'une unité.
  assert.equal(cardOf(model, "fact.fr").secondaryValue, null);
});

test("l'unité collée à la valeur est détachée sans reformater la mesure", () => {
  // Glasgow et douleur s'écrivent « 13/15 » et « 6/10 » : aucune espace ne
  // sépare la valeur de son unité, et la découper à l'espace les laisserait
  // entières. Le découpage retombe alors sur l'unité déclarée au registre.
  assert.deepEqual(splitFormattedValue("13/15", "/15"), { value: "13", unit: "/15" });
  assert.deepEqual(splitFormattedValue("138/84 mmHg", "mmHg"), {
    value: "138/84",
    unit: "mmHg",
  });
  assert.deepEqual(splitFormattedValue("36,8 °C", "°C"), { value: "36,8", unit: "°C" });
  // Une valeur sans unité reste intacte.
  assert.deepEqual(splitFormattedValue("Pâleur marquée", null), {
    value: "Pâleur marquée",
    unit: null,
  });

  const model = vitalsScreenModel(
    toSessionView(play(atVitals(), "action.evaluer-conscience", "action.evaluer-douleur")),
  );
  const glasgow = cardOf(model, "fact.glasgow");
  assert.equal(glasgow.unit, "/15");
  assert.match(glasgow.value, /^\d+$/);
  assert.equal(cardOf(model, "fact.eva").unit, "/10");
});

test("une tendance n'apparaît qu'à partir de la deuxième mesure", () => {
  const once = play(atVitals(), "action.palper-pouls");
  assert.equal(cardOf(vitalsScreenModel(toSessionView(once)), "fact.fc").trend, null);
  const twice = play(once, "action.palper-pouls");
  const card = cardOf(vitalsScreenModel(toSessionView(twice)), "fact.fc");
  assert.ok(card.trend, "deux relevés doivent produire une tendance");
  assert.ok(card.delta, "la tendance s'accompagne de son écart");
});

test("une mesure périmée reste affichée mais signalée", () => {
  const played = play(atVitals(), "action.poser-saturometre");
  const stale = toSessionView({ ...played, simulatedTimeSeconds: 100_000 });
  const card = cardOf(vitalsScreenModel(stale), "fact.spo2");
  assert.equal(card.measured, true, "la valeur relevée ne s'effface pas");
  assert.equal(card.isStale, true);
  assert.ok(card.ageSeconds! > 0);
  // Une constante périmée ne compte plus comme relevée dans la jauge du bilan.
  assert.equal(vitalsScreenModel(stale).measuredCount, 0);
});

test("un constat non établi propose le geste qui l'établirait", () => {
  const model = vitalsScreenModel(toSessionView(atVitals()));
  const complaints = model.evaluations.find((entry) => entry.factId === "fact.plaintes")!;
  assert.equal(complaints.known, false);
  assert.equal(complaints.action?.id, "action.interroger-patient");
  assert.equal(complaints.action?.enabled, true);

  const played = play(atVitals(), "action.interroger-patient");
  const after = vitalsScreenModel(toSessionView(played)).evaluations.find(
    (entry) => entry.factId === "fact.plaintes",
  )!;
  assert.equal(after.known, true);
  assert.equal(after.action, null, "un constat établi n'a plus de geste à proposer");
  assert.ok(after.value.length > 0);
});

test("« matériel embarqué » et « matériel utilisé » sont deux panneaux distincts", () => {
  // Une seule liste avec un marqueur laissait le composant afficher, sous le
  // titre « Matériel utilisé », un tensiomètre resté dans le sac. Les deux
  // notions ne se mélangent plus : l'une dit ce que l'équipe avait, l'autre ce
  // qu'elle a sorti.
  const played = play(atVitals(["saturometre", "tensiometre"]), "action.prendre-tension");
  const model = vitalsScreenModel(toSessionView(played));

  assert.equal(model.equipmentPanelLabels.carried, "Matériel embarqué");
  assert.equal(model.equipmentPanelLabels.used, "Matériel utilisé");

  assert.deepEqual(
    model.carriedEquipment.map((chip) => [chip.label, chip.stateLabel]),
    [
      ["Saturomètre", "Non utilisé"],
      ["Tensiomètre", "Utilisé"],
    ],
  );
  // Le panneau « utilisé » ne contient que ce qui a réellement servi.
  assert.deepEqual(
    model.usedEquipment.map((chip) => chip.label),
    ["Tensiomètre"],
  );
  // Et il reste un sous-ensemble strict : rien n'y apparaît qui ne soit embarqué.
  const carried = new Set(model.carriedEquipment.map((chip) => chip.id));
  assert.ok(model.usedEquipment.every((chip) => carried.has(chip.id)));
});

test("poser puis retirer un capteur distingue « posé » de « retiré »", () => {
  // Un saturomètre ôté a bien servi, mais il ne surveille plus. Confondre les
  // deux effacerait la surveillance interrompue.
  const posed = play(atVitals(), "action.poser-saturometre");
  const attached = vitalsScreenModel(toSessionView(posed)).carriedEquipment.find(
    (entry) => entry.id === "saturometre",
  )!;
  assert.equal(attached.state, "attached");
  assert.equal(attached.stateLabel, "Posé");
  assert.equal(attached.used, true);

  const removed = play(posed, "action.retirer-saturometre");
  const detached = vitalsScreenModel(toSessionView(removed)).carriedEquipment.find(
    (entry) => entry.id === "saturometre",
  )!;
  assert.equal(detached.state, "removed");
  assert.equal(detached.stateLabel, "Retiré");
  assert.equal(detached.used, true, "il a servi, même s'il n'est plus en place");
  assert.equal(detached.attached, false);
});

test("un matériel embarqué qui ne se pose pas reste « disponible »", () => {
  // « Non utilisé » ne se dit que d'un appareil qu'on aurait pu poser. Un
  // brancard qu'on n'a pas sorti est disponible, pas un oubli de surveillance.
  const model = vitalsScreenModel(toSessionView(atVitals(["brancard", "saturometre"])));
  const byId = new Map(model.carriedEquipment.map((chip) => [chip.id, chip]));
  assert.equal(byId.get("brancard")!.stateLabel, "Disponible");
  assert.equal(byId.get("saturometre")!.stateLabel, "Non utilisé");
  assert.deepEqual(model.usedEquipment, []);
});

/**
 * L'invariant qui compte pour tout l'écran : un bouton actif est un bouton que le
 * moteur accepte. Le vérifier action par action et sur plusieurs états ferme la
 * seule vraie classe de bugs d'une interface de jeu — proposer un geste qui sera
 * rejeté au clic, ou en cacher un qui était permis.
 */
test("un geste est actif si et seulement si le moteur l'accepte", () => {
  const states: InterventionSession[] = [
    atVitals(),
    atVitals([]),
    atVitals(["saturometre"]),
    play(atVitals(), "action.poser-saturometre"),
    play(atVitals(), "action.poser-saturometre", "action.palper-pouls", "action.compter-fr"),
    play(atVitals(), "action.demander-renfort"),
  ];
  let checked = 0;
  for (const state of states) {
    const model = vitalsScreenModel(toSessionView(state));
    for (const measure of model.quickMeasures) {
      const engineRefuses = applyAction(state, measure.id).classification === "impossible";
      assert.equal(
        measure.enabled,
        !engineRefuses,
        `${measure.id} : écran ${measure.enabled ? "actif" : "inactif"}, moteur ${
          engineRefuses ? "refuse" : "accepte"
        }`,
      );
      assert.equal(measure.disabledReason === null, measure.enabled, measure.id);
      checked += 1;
    }
  }
  assert.ok(checked >= 30, `seulement ${checked} vérifications`);
});

test("aucune mesure rapide de cette phase n'est hors du champ DEA", () => {
  const model = vitalsScreenModel(toSessionView(atVitals()));
  for (const measure of model.quickMeasures) {
    assert.ok(measure.reveals.length > 0, `${measure.id} ne renseigne rien`);
    assert.ok(measure.timeSeconds > 0, `${measure.id} doit coûter du temps`);
  }
  // Les actes hors périmètre existent au catalogue mais pas à cette phase.
  const ids = model.quickMeasures.map((measure) => measure.id);
  for (const forbidden of ["action.poser-voie-veineuse", "action.injecter-produit"]) {
    assert.ok(!ids.includes(forbidden), forbidden);
  }
});

test("le bandeau de cet écran est celui des maquettes 3 et 4", () => {
  const hud = hudModel(toSessionView(atVitals()), "monitoring", PLAYER);
  assert.deepEqual(
    hud.slots.map((slot) => slot.kind),
    ["clock", "lives", "coins", "logo", "level", "avatar"],
  );
});
