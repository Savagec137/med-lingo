import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import {
  toSessionView,
  HIDDEN_SESSION_FIELDS,
  SESSION_VIEW_FIELDS,
  type InterventionSession,
} from "../v3-domain.ts";
import { applyAction } from "../engine/apply-action.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "../scenarios/v3-catalog.ts";

/**
 * Le verrou de `InterventionSessionView`.
 *
 * La vue est ce que l'interface reçoit. Tout ce qui y entre devient affichable,
 * et la règle centrale du mode tombe si une donnée clinique s'y glisse.
 *
 * Ces tests portent sur **la forme de la vue**, pas sur son contenu — les fuites
 * de valeurs sont couvertes par `v3-anti-leak.test.ts`. La question posée ici est
 * plus fondamentale : *quels champs* traversent la barrière. Le défaut qu'ils
 * ferment est structurel : la vue était définie par exclusion (`Omit`), et une
 * liste d'exclusion laisse passer par défaut tout champ ajouté ensuite. Deux
 * données cliniques cachées étaient ainsi exposées sans que personne l'ait décidé.
 */

const scenario = getV3Scenario(PILOT_SCENARIO_ID);

const fullSession = (): InterventionSession =>
  createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT });

/* -------------------------------------------------------------------------- */
/* La liste d'autorisation couvre la session, sans trou ni recouvrement        */
/* -------------------------------------------------------------------------- */

test("tout champ de la session est soit autorisé, soit caché avec sa raison", () => {
  // Le test qui fait échouer l'ajout d'un champ non classé. Ajouter une donnée à
  // `InterventionSession` sans dire de quel côté de la barrière elle tombe est
  // exactement la façon dont une fuite s'installe sans que personne la décide.
  const sessionFields = Object.keys(fullSession()).sort();
  const allowed = [...SESSION_VIEW_FIELDS];
  const hidden = Object.keys(HIDDEN_SESSION_FIELDS);
  const classified = [...allowed, ...hidden].sort();

  assert.deepEqual(
    classified,
    sessionFields,
    "un champ de session n'est ni dans SESSION_VIEW_FIELDS ni dans HIDDEN_SESSION_FIELDS",
  );

  // Aucun champ des deux côtés à la fois : la classification doit trancher.
  const overlap = allowed.filter((field) => hidden.includes(field));
  assert.deepEqual(overlap, [], "un champ ne peut pas être à la fois autorisé et caché");
});

test("chaque champ caché dit pourquoi il l'est", () => {
  // Une rétention sans motif finit par être levée « puisqu'on ne sait plus
  // pourquoi ». Le motif vit à côté du champ.
  for (const [field, reason] of Object.entries(HIDDEN_SESSION_FIELDS)) {
    assert.ok(reason.length > 40, `${field} : motif trop court — « ${reason} »`);
    assert.ok(reason.trim().endsWith("."), `${field} : le motif doit être une phrase`);
  }
});

test("les quatre données cliniques cachées sont bien retenues", () => {
  const hidden = Object.keys(HIDDEN_SESSION_FIELDS);
  for (const field of ["vitals", "vitalsHistory", "patientState", "roscAchieved"]) {
    assert.ok(hidden.includes(field), `${field} doit rester hors de la vue`);
    assert.ok(
      !(SESSION_VIEW_FIELDS as readonly string[]).includes(field),
      `${field} ne doit pas figurer dans la liste d'autorisation`,
    );
  }
});

/* -------------------------------------------------------------------------- */
/* La vue produite ne porte que ce qui est autorisé                           */
/* -------------------------------------------------------------------------- */

test("la vue produite porte exactement les champs autorisés", () => {
  const view = toSessionView(fullSession());
  assert.deepEqual(Object.keys(view).sort(), [...SESSION_VIEW_FIELDS].sort());
});

test("aucun champ caché n'apparaît dans la vue, même en cours de mission", () => {
  // Une session vierge est le cas facile. La vérification porte donc aussi sur
  // une mission engagée, où le moteur a rempli l'historique physiologique et fait
  // évoluer l'état du patient.
  let session: InterventionSession = { ...fullSession(), phase: "arrival", status: "active" };
  for (const actionId of [
    "action.securiser-scene",
    "action.observer-environnement",
    "action.approcher-patient",
  ]) {
    session = applyAction(session, actionId).session;
  }
  assert.ok(session.vitalsHistory.length > 0, "le moteur doit avoir alimenté l'historique");

  const view = toSessionView(session) as Record<string, unknown>;
  for (const field of Object.keys(HIDDEN_SESSION_FIELDS)) {
    assert.ok(!(field in view), `${field} traverse la barrière`);
    assert.equal(view[field], undefined, field);
  }
});

test("la vue se construit par recopie de l'autorisation, pas par retrait", () => {
  // La différence est celle qui compte. Un champ inconnu de la liste d'exclusion
  // — parce qu'ajouté après elle — passerait une copie par retrait. Ici l'objet
  // produit ne peut porter que ce qui est déclaré, et un champ surnuméraire
  // introduit de force dans la session ne le traverse pas.
  const contaminated = {
    ...fullSession(),
    secretDiagnosis: "hémorragie intracrânienne",
  } as unknown as InterventionSession;

  const view = toSessionView(contaminated) as Record<string, unknown>;
  assert.ok(!("secretDiagnosis" in view), "un champ non déclaré ne doit pas traverser");
  assert.deepEqual(Object.keys(view).sort(), [...SESSION_VIEW_FIELDS].sort());
});

test("aucune valeur clinique n'est atteignable depuis la vue", () => {
  // Contrôle de dernier recours : la vue est parcourue en profondeur et
  // confrontée aux constantes de départ du scénario. Un champ mal classé qui
  // porterait une valeur serait attrapé ici même si son nom n'évoquait rien.
  const view = toSessionView(fullSession());
  const serialised = JSON.stringify(view);
  const baseline = scenario.clinical.baseline as unknown as Record<string, number>;

  for (const [key, value] of Object.entries(baseline)) {
    // Les constantes de départ sont des nombres distinctifs — 92, 138, 36.8. Les
    // chercher dans la vue sérialisée d'une session vierge ne peut pas produire
    // de faux positif : la vue n'y contient aucun autre nombre clinique.
    assert.ok(
      !new RegExp(`\\b${value}\\b`).test(serialised),
      `la vue laisse fuir ${key} = ${value}`,
    );
  }
});

/* -------------------------------------------------------------------------- */
/* Les présentateurs ne connaissent que la vue                                */
/* -------------------------------------------------------------------------- */

test("aucun présentateur ne nomme la session complète", () => {
  // Le type complet est le seul moyen d'atteindre les champs cachés en restant
  // typé. Qu'aucun présentateur ne le nomme est donc la contrepartie de la liste
  // d'autorisation : l'une retire les champs, l'autre interdit d'en redemander.
  const uiDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "ui");
  const files = readdirSync(uiDirectory).filter((name) => name.endsWith(".ts"));
  assert.ok(files.length >= 7, `seulement ${files.length} présentateurs`);

  for (const file of files) {
    const source = readFileSync(join(uiDirectory, file), "utf8");
    // `InterventionSessionView` contient `InterventionSession` : le contrôle
    // porte donc sur le nom complet suivi d'une limite de mot.
    assert.ok(
      !/\bInterventionSession\b(?!View)/.test(source),
      `${file} nomme la session complète : il pourrait lire les champs cachés`,
    );
    // Le contrôle porte sur l'**accès** au champ, et non sur le mot : un écran
    // de constantes s'appelle légitimement `vitalsScreenModel` et rend un tableau
    // `vitals` de cartes déjà dérivées. Ce qui est interdit, c'est de lire le
    // champ sur un objet — `session.vitals` — quelle qu'en soit la provenance.
    //
    // Le point doit être précédé d'un identifiant. Sans cette exigence, le
    // segment `../physiology/` d'un chemin d'import se lit comme un accès à
    // `.physiology`, et la garde se déclenche sur l'import des **types** de
    // surveillance — les seuls que la couche présentation ait le droit de nommer.
    for (const field of Object.keys(HIDDEN_SESSION_FIELDS)) {
      assert.ok(
        !new RegExp(`[\\w\\)\\]]\\.${field}\\b`).test(source),
        `${file} lit « .${field} » : c'est un champ caché de la session`,
      );
    }
  }
});

/**
 * Ce que les composants reçoivent.
 *
 * La vue est ce que les **présentateurs** reçoivent ; les composants React, eux,
 * ne reçoivent que des modèles d'écran — faits révélés, constantes mesurées,
 * états de matériel dérivés, actions actives ou refusées, éléments transmissibles
 * et questions du régulateur. Aucun modèle d'écran n'expose la session.
 */
test("aucun modèle d'écran n'expose la session à un composant", () => {
  const uiDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "ui");
  const files = readdirSync(uiDirectory).filter((name) => name.endsWith("-screen.ts"));
  assert.ok(files.length >= 5, `seulement ${files.length} écrans`);

  for (const file of files) {
    const source = readFileSync(join(uiDirectory, file), "utf8");
    // Un modèle d'écran ne doit pas reconduire la vue vers le composant : il la
    // consomme et rend des données déjà dérivées.
    const modelInterfaces = source.match(/export interface \w*ScreenModel \{[\s\S]*?\n\}/g) ?? [];
    assert.ok(modelInterfaces.length > 0, `${file} ne déclare aucun modèle d'écran`);
    for (const declaration of modelInterfaces) {
      assert.ok(
        !/InterventionSessionView/.test(declaration),
        `${file} reconduit la vue de session dans son modèle d'écran`,
      );
    }
  }
});

/* -------------------------------------------------------------------------- */
/* Les composants n'atteignent rien de plus que leurs propriétés              */
/* -------------------------------------------------------------------------- */

/**
 * Le contrôle sur les composants React.
 *
 * Ils ne sont pas exécutables ici — ni `vite build` ni outillage de rendu DOM ne
 * tournent dans cet environnement. Ce qui reste vérifiable est leur **surface
 * d'accès** : de quoi ils dépendent. Un composant qui n'importe que des types de
 * modèle et des icônes ne peut, par construction, lire aucune donnée cachée,
 * qu'on puisse le rendre ou non.
 */
test("aucun composant du Mode Intervention V3 n'atteint le moteur ni le scénario", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const componentsDir = join(root, "components", "intervention-v3");

  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) files.push(path);
    }
  };
  walk(componentsDir);
  assert.ok(files.length >= 7, `seulement ${files.length} composants`);

  const forbidden = [
    "intervention-vitals",
    "reveal-fact",
    "read-fact",
    "engine/apply-action",
    "engine/v3-",
    "engine/index",
    "v3-session",
    "scenarios/",
    "v3-catalog",
    "fact-registry",
    "action-catalog",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const imports = source.match(/^import[\s\S]*?from\s+"[^"]+";/gm) ?? [];
    const specifiers = imports.join("\n");
    for (const pattern of forbidden) {
      assert.ok(
        !specifiers.includes(pattern),
        `${file.split("/").pop()} importe « ${pattern} » : un composant reçoit des propriétés, il ne va rien chercher`,
      );
    }
    // Et jamais l'accès à un champ caché de la **session**.
    //
    // Le contrôle ne peut pas porter sur le mot seul : l'écran des constantes rend
    // légitimement un tableau `vitals` de cartes déjà dérivées, et `model.vitals`
    // n'a rien à voir avec `session.vitals`. Trois des quatre champs cachés n'ont
    // aucun sens dans un modèle d'écran et sont donc interdits partout ; pour le
    // quatrième, c'est la lecture sur une session qui est interdite.
    for (const field of ["vitalsHistory", "patientState", "roscAchieved"]) {
      assert.ok(
        !new RegExp(`\\b${field}\\b`).test(source),
        `${file.split("/").pop()} mentionne « ${field} »`,
      );
    }
    assert.ok(
      !/\bsession\s*[.?]/.test(source),
      `${file.split("/").pop()} lit une session : un composant reçoit un modèle`,
    );
  }
});

test("les composants animés ne reçoivent que des cadences déjà dérivées", () => {
  // Une animation est une fuite comme une autre : une onde qui bat à la fréquence
  // réelle du patient la révèle aussi sûrement qu'un chiffre. Les composants
  // animés reçoivent donc une cadence en propriété — nulle tant que la mesure
  // n'est pas prise — et n'ont aucun moyen d'en calculer une.
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const monitoringDir = join(root, "components", "intervention-v3", "monitoring");
  const files = readdirSync(monitoringDir).filter((name) => name.endsWith(".tsx"));
  assert.ok(files.length >= 5, `seulement ${files.length} composants animés`);

  for (const file of files) {
    const source = readFileSync(join(monitoringDir, file), "utf8");
    // Chaque composant animé doit savoir se taire.
    assert.ok(/reducedMotion/.test(source), `${file} ignore la préférence d'animation réduite`);
    // Aucun n'importe quoi que ce soit du domaine hors les types de modèle.
    const imports = (source.match(/from\s+"([^"]+)"/g) ?? []).join("\n");
    assert.ok(
      !/features\/intervention-v3\/(?!ui\/)/.test(imports),
      `${file} importe hors de la couche présentation`,
    );
  }
});
