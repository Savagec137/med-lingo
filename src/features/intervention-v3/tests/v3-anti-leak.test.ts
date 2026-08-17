import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import {
  toSessionView,
  type FactId,
  type InterventionSession,
  type PlayerActionId,
} from "../v3-domain.ts";
import { getFact } from "../facts/fact-registry.ts";
import { readFact } from "../facts/read-fact.ts";
import { PLAYER_ACTIONS, getAction } from "../actions/action-catalog.ts";
import { applyAction } from "../engine/apply-action.ts";
import { buildCentre15Transmission } from "../engine/v3-transmission.ts";
import { createDebriefReport } from "../engine/v3-debrief.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "../scenarios/v3-catalog.ts";
import { newCallScreenModel } from "../ui/new-call-screen.ts";
import { arrivalScreenModel } from "../ui/arrival-screen.ts";
import { vitalsScreenModel } from "../ui/vitals-screen.ts";

/**
 * La règle centrale du Mode Intervention V3, et rien d'autre.
 *
 * **Aucune donnée clinique importante n'apparaît si le joueur n'a pas fait
 * l'action correspondante.** Le moteur connaît les constantes du patient dès la
 * première seconde de la mission : c'est justement pourquoi cette règle a besoin
 * d'un test, et pas seulement d'une intention. Sans lui, une seule ligne
 * d'affichage ajoutée par distraction suffit à donner gratuitement ce que la
 * mission entière est faite d'aller chercher.
 *
 * Le fichier vérifie la règle sur deux plans, parce qu'aucun des deux ne suffit.
 *
 * **Le plan structurel** interroge `readFact` : la seule porte d'accès. Il est
 * exact et ne peut pas produire de faux positif, mais il ne voit que ce qui
 * passe par la porte.
 *
 * **Le plan textuel** ratisse tout le texte que les écrans, le débrief et la
 * transmission produisent, et y cherche les formes exactes sous lesquelles une
 * donnée apparaîtrait — « 138/84 », « Anticoagulant oral quotidien ». Il attrape
 * ce qui aurait contourné la porte.
 */

const scenario = getV3Scenario(PILOT_SCENARIO_ID);

interface ProtectedData {
  factId: FactId;
  /** Nom de la donnée telle que le métier la désigne. */
  name: string;
  /**
   * Comment la donnée se vérifie.
   *
   * `measured` — une constante que le moteur clinique produit. Sa valeur
   * **dérive dans le temps** : le patient évolue, et une mesure prise à la
   * deuxième minute ne rend pas le chiffre de départ. Chercher « 92 /min » dans
   * le texte ne protégerait donc qu'un instant de la mission. Ces données se
   * vérifient par l'absence de tout chiffre sur leur carte, ce qui est à la fois
   * plus fort et indépendant du temps.
   *
   * `authored` — une donnée écrite dans le scénario : antécédents, traitements,
   * heure de la chute. Elle ne dérive jamais, donc sa phrase exacte est un motif
   * de fuite fiable, où qu'elle apparaisse.
   */
  kind: "measured" | "authored";
  /** Phrases exactes, pour les données `authored` seulement. */
  phrases: string[];
}

const PROTECTED: readonly ProtectedData[] = [
  { factId: "fact.spo2", name: "SpO₂", kind: "measured", phrases: [] },
  { factId: "fact.fc", name: "pouls", kind: "measured", phrases: [] },
  { factId: "fact.ta", name: "tension artérielle", kind: "measured", phrases: [] },
  { factId: "fact.fr", name: "fréquence respiratoire", kind: "measured", phrases: [] },
  { factId: "fact.glycemie", name: "glycémie", kind: "measured", phrases: [] },
  { factId: "fact.eva", name: "douleur", kind: "measured", phrases: [] },
  { factId: "fact.glasgow", name: "Glasgow", kind: "measured", phrases: [] },
  {
    factId: "fact.antecedents",
    name: "antécédents",
    kind: "authored",
    phrases: ["Hypertension artérielle traitée", "fibrillation auriculaire connue"],
  },
  {
    factId: "fact.traitements",
    name: "traitements",
    kind: "authored",
    phrases: ["Anticoagulant oral quotidien", "antihypertenseur"],
  },
  {
    factId: "fact.allergies",
    name: "allergies",
    kind: "authored",
    phrases: ["Aucune allergie connue"],
  },
  {
    factId: "fact.heure-debut",
    name: "heure de début",
    kind: "authored",
    phrases: ["Chute vers 22:35"],
  },
  {
    factId: "fact.pci",
    name: "perte de connaissance initiale",
    kind: "authored",
    phrases: ["perte de connaissance initiale rapportée"],
  },
];

/** Phrases d'une donnée trouvées dans les champs lisibles. Vide si protégée. */
function phrasesFound(entry: ProtectedData, fields: readonly string[]): string[] {
  return entry.phrases.filter((phrase) => fields.some((field) => field.includes(phrase)));
}

/** Session complète, tout le matériel embarqué, amenée à la phase voulue. */
function sessionAt(phase: InterventionSession["phase"]): InterventionSession {
  return {
    ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
    phase,
    status: phase === "new_call" ? "briefing" : "active",
  };
}

const play = (session: InterventionSession, ...actionIds: PlayerActionId[]): InterventionSession =>
  actionIds.reduce((current, actionId) => applyAction(current, actionId).session, session);

/**
 * Carte de constante d'un fait, telle que l'écran 3 la présente.
 *
 * La phase est forcée à `vitals` pour que la grille existe : la carte décrit ce
 * qui a été relevé, pas la phase courante, et un fait relevé reste lisible d'un
 * écran à l'autre.
 */
function cardOf(session: InterventionSession, factId: FactId) {
  const model = vitalsScreenModel(toSessionView({ ...session, phase: "vitals" }));
  const card = model.vitals.find((entry) => entry.factId === factId);
  assert.ok(card, `${factId} n'a pas de carte sur l'écran des constantes`);
  return card;
}

/** Toutes les chaînes atteignables dans une valeur, à n'importe quelle profondeur. */
function allStrings(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) for (const item of value) allStrings(item, into);
  else if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value)) allStrings(nested, into);
  }
  return into;
}

/**
 * Tous les champs de texte qu'une session produit, écrans compris. C'est la
 * surface qu'un joueur peut lire, donc la surface exacte où une fuite compte.
 * Les champs sont gardés séparés, et non concaténés : une valeur et son unité
 * vivent dans deux champs distincts, et les recoller inventerait des voisinages
 * qui n'existent pas à l'écran.
 */
function readableFields(session: InterventionSession): string[] {
  const viewOf = toSessionView(session);
  const surfaces: unknown[] = [
    newCallScreenModel(viewOf),
    vitalsScreenModel(viewOf),
    createDebriefReport(session, scenario),
    buildCentre15Transmission(session, scenario),
  ];
  // L'écran d'arrivée n'existe qu'aux phases où le catalogue propose des actions.
  if (session.phase !== "new_call") surfaces.push(arrivalScreenModel(viewOf, { totalSteps: 12 }));
  return allStrings(surfaces);
}

/* -------------------------------------------------------------------------- */
/* La table protège ce qu'elle prétend protéger                               */
/* -------------------------------------------------------------------------- */

test("les douze données protégées ne sont lisibles que sur action", () => {
  assert.equal(PROTECTED.length, 12);
  for (const entry of PROTECTED) {
    const fact = getFact(entry.factId);
    assert.equal(
      fact.visibility,
      "on_action",
      `${entry.name} doit dépendre d'une action, or sa visibilité est ${fact.visibility}`,
    );
    assert.ok(fact.revealedBy.length > 0, `${entry.name} ne nomme aucune action révélatrice`);
    for (const actionId of fact.revealedBy) {
      // Une action révélatrice inexistante rendrait la donnée inatteignable.
      assert.doesNotThrow(() => getAction(actionId), `${entry.name} → ${actionId}`);
    }
  }
});

test("la protection porte sur des données réellement affichables", () => {
  // Sans ce garde, la protection pourrait devenir décorative : une phrase de
  // scénario réécrite, et le motif ne correspondrait plus à rien — le test
  // passerait sur du vide. Chaque donnée est donc relevée, puis on vérifie
  // qu'elle apparaît : une constante par un chiffre sur sa carte, une donnée
  // écrite par sa phrase exacte.
  for (const entry of PROTECTED) {
    const actionId = getFact(entry.factId).revealedBy[0]!;
    const session = play(sessionAt("vitals"), actionId);
    assert.equal(
      readFact(session, entry.factId).status,
      "known",
      `${entry.name} n'est pas relevé par ${actionId}`,
    );

    if (entry.kind === "authored") {
      assert.deepEqual(
        phrasesFound(entry, readableFields(session)),
        entry.phrases,
        `les phrases de ${entry.name} n'apparaissent pas une fois la donnée obtenue`,
      );
      continue;
    }
    const card = cardOf(session, entry.factId);
    assert.equal(card.measured, true, entry.name);
    assert.ok(/[0-9]/.test(card.value), `${entry.name} relevé sans chiffre affiché`);
  }
});

/* -------------------------------------------------------------------------- */
/* Session vierge : rien n'est donné                                          */
/* -------------------------------------------------------------------------- */

test("sur session vierge, aucune des douze données n'est lisible", () => {
  for (const phase of ["new_call", "arrival", "patient_assessment", "vitals"] as const) {
    const session = sessionAt(phase);
    for (const entry of PROTECTED) {
      const read = readFact(session, entry.factId);
      assert.equal(
        read.status,
        "unknown",
        `${entry.name} est lisible sans action, à la phase ${phase}`,
      );
    }
  }
});

test("sur session vierge, aucune des douze données n'apparaît à l'écran", () => {
  for (const phase of ["new_call", "arrival", "patient_assessment", "vitals"] as const) {
    const session = sessionAt(phase);
    const fields = readableFields(session);
    for (const entry of PROTECTED) {
      assert.deepEqual(
        phrasesFound(entry, fields),
        [],
        `${entry.name} est affiché sans action, à la phase ${phase}`,
      );
      if (entry.kind !== "measured") continue;
      // Indépendant de la valeur : quelle que soit l'heure de la mission et
      // quelle que soit la dérive du patient, une constante non relevée n'affiche
      // aucun chiffre. L'unité en est exclue — le « /15 » du Glasgow en porte un
      // sans rien dire de la mesure.
      const card = cardOf(session, entry.factId);
      assert.equal(card.measured, false, entry.name);
      assert.ok(!/[0-9]/.test(card.value), `${entry.name} : valeur « ${card.value} »`);
      assert.ok(
        !/[0-9]/.test(card.missingLabel ?? ""),
        `${entry.name} : absence « ${card.missingLabel} »`,
      );
    }
  }
});

test("le temps qui passe ne révèle rien", () => {
  // Une session laissée en attente ne doit rien donner : seule une action
  // révèle. Le patient continue d'évoluer, l'écran continue de ne rien savoir.
  const waited = { ...sessionAt("vitals"), simulatedTimeSeconds: 3600 };
  const fields = readableFields(waited);
  for (const entry of PROTECTED) {
    assert.deepEqual(phrasesFound(entry, fields), [], `${entry.name} apparaît après une attente`);
    assert.equal(readFact(waited, entry.factId).status, "unknown", entry.name);
    if (entry.kind === "measured") {
      assert.ok(!/[0-9]/.test(cardOf(waited, entry.factId).value), entry.name);
    }
  }
});

test("une action refusée ne révèle rien", () => {
  // Sans glucomètre embarqué, la glycémie est refusée. Le refus est journalisé,
  // et le journal ne doit pas devenir une porte de sortie.
  const withoutGlucometer: InterventionSession = {
    ...createV3Session(scenario, { preparedEquipment: ["saturometre"] }),
    phase: "vitals",
    status: "active",
  };
  const result = applyAction(withoutGlucometer, "action.faire-glycemie");
  assert.equal(result.classification, "impossible");
  assert.deepEqual(result.logEntry.revealedFactIds, []);
  assert.equal(readFact(result.session, "fact.glycemie").status, "unknown");
  const fields = readableFields(result.session);
  for (const entry of PROTECTED) {
    assert.deepEqual(
      phrasesFound(entry, fields),
      [],
      `${entry.name} apparaît après une action refusée`,
    );
  }
});

/* -------------------------------------------------------------------------- */
/* Croisement : une action ne révèle que ce qu'elle déclare                   */
/* -------------------------------------------------------------------------- */

/**
 * Le test que la consigne demande, généralisé.
 *
 * « Après pose du saturomètre : SpO₂ visible, pouls visible, TA toujours cachée,
 * glycémie toujours cachée » n'est pas un cas particulier : c'est la règle. Elle
 * est donc vérifiée pour **chacune** des douze données contre **chacune** des
 * autres, plutôt que sur un couple choisi à la main.
 */
test("une action ne révèle que les données qu'elle déclare", () => {
  const revealingActions = new Set(PROTECTED.flatMap((entry) => getFact(entry.factId).revealedBy));
  let checks = 0;

  for (const actionId of revealingActions) {
    const revealed = new Set(getAction(actionId).reveals);
    const session = play(sessionAt("vitals"), actionId);

    for (const entry of PROTECTED) {
      const read = readFact(session, entry.factId);
      const shouldBeKnown = revealed.has(entry.factId);
      assert.equal(
        read.status,
        shouldBeKnown ? "known" : "unknown",
        shouldBeKnown
          ? `${actionId} déclare révéler ${entry.name} et ne le fait pas`
          : `${actionId} révèle ${entry.name} sans le déclarer`,
      );
      checks += 1;
    }

    // Et sur l'affichage : les autres données restent absentes de l'écran.
    const fields = readableFields(session);
    for (const entry of PROTECTED) {
      if (revealed.has(entry.factId)) continue;
      assert.deepEqual(phrasesFound(entry, fields), [], `${actionId} laisse fuir ${entry.name}`);
      if (entry.kind === "measured") {
        assert.ok(
          !/[0-9]/.test(cardOf(session, entry.factId).value),
          `${actionId} laisse fuir un chiffre de ${entry.name}`,
        );
      }
    }
  }

  assert.ok(checks >= 84, `seulement ${checks} croisements vérifiés`);
});

test("poser le saturomètre donne la SpO₂ et le pouls, et laisse le reste caché", () => {
  // Le cas nommé dans la consigne, gardé explicite pour être lisible sans
  // dérouler la boucle du test précédent.
  const session = play(sessionAt("vitals"), "action.poser-saturometre");
  assert.equal(readFact(session, "fact.spo2").status, "known");
  assert.equal(readFact(session, "fact.fc").status, "known");
  assert.equal(readFact(session, "fact.ta").status, "unknown");
  assert.equal(readFact(session, "fact.glycemie").status, "unknown");
  assert.equal(readFact(session, "fact.glasgow").status, "unknown");
  assert.equal(readFact(session, "fact.antecedents").status, "unknown");

  assert.ok(/[0-9]/.test(cardOf(session, "fact.spo2").value), "la SpO₂ relevée doit être affichée");
  assert.ok(/[0-9]/.test(cardOf(session, "fact.fc").value), "le pouls relevé doit être affiché");
  for (const hidden of ["fact.ta", "fact.glycemie", "fact.glasgow"] as const) {
    const card = cardOf(session, hidden);
    assert.equal(card.measured, false, hidden);
    assert.ok(!/[0-9]/.test(card.value), `${hidden} laisse fuir « ${card.value} »`);
  }
});

/* -------------------------------------------------------------------------- */
/* Le débrief ne dit pas mesuré ce qui ne l'a pas été                         */
/* -------------------------------------------------------------------------- */

test("le débrief d'une mission sans aucun relevé ne déclare rien de mesuré", () => {
  const report = createDebriefReport(sessionAt("debrief"), scenario);
  for (const entry of PROTECTED) {
    const coverage = report.factCoverage.find((item) => item.factId === entry.factId)!;
    assert.notEqual(
      coverage.state,
      "measured",
      `le débrief déclare ${entry.name} mesuré alors qu'aucune action ne l'a relevé`,
    );
  }
});

test("le débrief ne déclare mesuré que ce qui figure au journal", () => {
  const session = play(sessionAt("vitals"), "action.poser-saturometre", "action.prendre-tension");
  const report = createDebriefReport(session, scenario);
  const state = (factId: FactId) =>
    report.factCoverage.find((item) => item.factId === factId)!.state;
  assert.equal(state("fact.spo2"), "measured");
  assert.equal(state("fact.fc"), "measured");
  assert.equal(state("fact.ta"), "measured");
  assert.notEqual(state("fact.glycemie"), "measured");
  assert.notEqual(state("fact.antecedents"), "measured");
});

/* -------------------------------------------------------------------------- */
/* Aucun bouton décoratif                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Chaque action du catalogue doit **faire quelque chose**. Une carte qui
 * n'ouvre aucune information, ne change rien au score et ne fait pas avancer la
 * mission est un décor : le joueur clique et le jeu ne bouge pas.
 */
test("chaque action jouable a un effet réel", () => {
  const phaseChanging = new Set([
    "action.appeler-centre15",
    "action.transmettre-bilan",
    "action.choisir-gestes-prioritaires",
    "action.preparer-transport",
  ]);
  const stateChanging = new Set(["action.poser-saturometre", "action.retirer-saturometre"]);

  for (const action of PLAYER_ACTIONS) {
    if (action.outOfScope) {
      // Un acte hors périmètre a pour effet pédagogique d'être refusé et expliqué.
      assert.ok(action.outOfScopeReason, `${action.id} est hors périmètre sans explication`);
      continue;
    }
    const effects = [
      action.reveals.length > 0,
      action.effect.score !== 0,
      action.effect.therapeutic,
      phaseChanging.has(action.id),
      stateChanging.has(action.id),
    ];
    assert.ok(
      effects.some(Boolean),
      `${action.id} n'a aucun effet : ni information, ni score, ni progression`,
    );
    assert.ok(action.timeSeconds > 0, `${action.id} doit coûter du temps`);
  }
});

test("toute donnée protégée est atteignable par au moins une action jouable", () => {
  // Le miroir de la règle : une information qu'aucune action ne peut ouvrir
  // serait un trou impossible à combler, pas une exigence pédagogique.
  for (const entry of PROTECTED) {
    const reachable = getFact(entry.factId).revealedBy.some((actionId) => {
      const action = getAction(actionId);
      return !action.outOfScope && action.requires.phases.length > 0;
    });
    assert.ok(reachable, `${entry.name} n'est atteignable par aucune action jouable`);
  }
});

/* -------------------------------------------------------------------------- */
/* La couche présentation n'a aucun moyen d'accès                             */
/* -------------------------------------------------------------------------- */

test("aucun présentateur n'atteint les constantes réelles", () => {
  // Garde de source, en plus de la règle ESLint : un test tourne à chaque
  // `npm test`, une règle de lint peut être contournée par une directive en
  // commentaire. Les deux disent la même chose, et c'est voulu.
  const uiDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "ui");
  const files = readdirSync(uiDirectory).filter((name) => name.endsWith(".ts"));
  assert.ok(files.length >= 4, `seulement ${files.length} présentateurs trouvés`);

  const forbidden = [
    "intervention-vitals",
    "reveal-fact",
    "engine/apply-action",
    "engine/index",
    "v3-session",
    "session.vitals",
    "vitalsHistory",
  ];
  for (const file of files) {
    const source = readFileSync(join(uiDirectory, file), "utf8");
    for (const pattern of forbidden) {
      assert.ok(
        !source.includes(pattern),
        `${file} mentionne « ${pattern} » : un écran ne doit pas pouvoir l'atteindre`,
      );
    }
  }
});
