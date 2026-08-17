import assert from "node:assert/strict";
import test from "node:test";
import { createV3Session } from "../v3-session.ts";
import { GRAVE_FAULT_FLAGS, type InterventionSessionView } from "../v3-domain.ts";
import { getAction } from "../actions/action-catalog.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { hudModel, xpProgress, HUD_VARIANTS, type PlayerHud } from "../ui/hud-model.ts";
import { newCallScreenModel, receivedInformation } from "../ui/new-call-screen.ts";
import {
  arrivalScreenModel,
  weatherFromDispatch,
  ARRIVAL_MOCKUP_ACTIONS,
} from "../ui/arrival-screen.ts";

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
  const { vitals: _vitals, vitalsHistory: _history, ...rest } = createV3Session(scenario);
  return { ...rest, ...overrides };
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
