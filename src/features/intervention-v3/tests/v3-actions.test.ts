import assert from "node:assert/strict";
import test from "node:test";
import {
  findAct,
  findCompetency,
  findKnowledge,
  findLibraryKnowledge,
} from "../../../content/library/library-catalog.ts";
import { CLINICAL_FACTS, factsRevealedBy, findFact } from "../facts/fact-registry.ts";
import {
  PLAYER_ACTIONS,
  actionsForPhase,
  getAction,
  outOfScopeActions,
  playableActions,
} from "../actions/action-catalog.ts";
import { EXCLUDED_GESTURE_PATTERN, actionCatalogSchema } from "../actions/action-schema.ts";
import { V3_PHASES } from "../v3-domain.ts";

/* -------------------------------------------------------------------------- */
/* Périmètre DEA                                                              */
/* -------------------------------------------------------------------------- */

test("aucune action jouable ne décrit une injection, une perfusion ou un abord vasculaire", () => {
  // La recherche porte sur l'identifiant, le libellé **et** l'indice : une
  // action peut être nommée sobrement et décrite par son geste.
  for (const action of playableActions()) {
    const haystack = `${action.id} ${action.label} ${action.hint}`;
    assert.ok(
      !EXCLUDED_GESTURE_PATTERN.test(haystack),
      `${action.id} décrit un geste exclu : « ${haystack} »`,
    );
  }
});

test("les actions hors périmètre sont les seules à décrire ces gestes, et elles sont motivées", () => {
  const refused = outOfScopeActions();
  assert.ok(refused.length >= 6, "le catalogue doit exposer les limites, pas les masquer");
  for (const action of refused) {
    assert.ok(action.outOfScopeReason, action.id);
    assert.ok(action.outOfScopeReason!.length >= 20, action.id);
    // Un refus ne révèle rien et ne consomme pas de temps.
    assert.deepEqual(action.reveals, []);
    assert.equal(action.timeSeconds, 0);
    assert.equal(action.effect.flag, "out-of-scope-act");
  }
});

test("la voie auto-injectable est absente du catalogue V3", () => {
  for (const action of PLAYER_ACTIONS) {
    assert.notEqual(action.actId, "acte.r6311-17.iii.3", action.id);
  }
});

test("aucune action ne référence un acte du paragraphe III", () => {
  // Le pilote ne mobilise que les actes du II, accomplis en lien constant avec
  // le médecin. Les intitulés du III sont pour partie relevés de façon abrégée.
  for (const action of PLAYER_ACTIONS) {
    if (action.actId) assert.match(action.actId, /^acte\.r6311-17\.ii\.\d$/, action.id);
  }
});

/* -------------------------------------------------------------------------- */
/* Résolubilité des références                                                */
/* -------------------------------------------------------------------------- */

test("tout acte cité existe dans la table des actes autorisés", () => {
  for (const action of PLAYER_ACTIONS) {
    if (!action.actId) continue;
    assert.ok(findAct(action.actId), `${action.id} → ${action.actId}`);
  }
});

test("toute compétence citée existe dans le référentiel DEA", () => {
  for (const action of PLAYER_ACTIONS) {
    for (const competencyId of action.competencyIds) {
      assert.ok(findCompetency(competencyId), `${action.id} → ${competencyId}`);
    }
  }
});

test("toute fiche citée se résout dans la bibliothèque", () => {
  for (const action of PLAYER_ACTIONS) {
    const knowledgeId = action.knowledgeId;
    if (!knowledgeId) continue;
    const resolved = knowledgeId.startsWith("library.")
      ? findLibraryKnowledge(knowledgeId)
      : findKnowledge(knowledgeId);
    assert.ok(resolved, `${action.id} → ${knowledgeId}`);
  }
});

test("une action jouable mobilise au moins une compétence", () => {
  for (const action of playableActions()) {
    assert.ok(action.competencyIds.length > 0, action.id);
  }
});

/* -------------------------------------------------------------------------- */
/* Cohérence avec le registre de faits                                        */
/* -------------------------------------------------------------------------- */

test("registre et catalogue se citent réciproquement", () => {
  // Un fait qui nomme une action inexistante serait inatteignable ; une action
  // qui révèle un fait ne la citant pas produirait une donnée orpheline.
  for (const fact of CLINICAL_FACTS) {
    for (const actionId of fact.revealedBy) {
      assert.ok(getAction(actionId), `${fact.id} → ${actionId}`);
    }
  }
  for (const action of PLAYER_ACTIONS) {
    for (const factId of action.reveals) {
      assert.ok(findFact(factId), `${action.id} → ${factId}`);
      assert.ok(
        factsRevealedBy(action.id).some((fact) => fact.id === factId),
        `${factId} ne déclare pas être révélé par ${action.id}`,
      );
    }
  }
});

test("les prérequis souples portent toujours l'effet de leur absence", () => {
  for (const action of playableActions()) {
    const soft =
      action.requires.justifyingFacts.length > 0 || action.requires.justifyingActions.length > 0;
    assert.equal(
      soft,
      action.unjustifiedEffect !== null,
      `${action.id} : prérequis souple ${soft}, effet injustifié ${action.unjustifiedEffect !== null}`,
    );
  }
});

test("seul un geste modifie l'état du patient", () => {
  for (const action of PLAYER_ACTIONS) {
    if (action.category !== "care") {
      assert.equal(action.effect.patient, 0, action.id);
      assert.equal(action.effect.therapeutic, false, action.id);
    }
  }
});

test("une mesure ne soigne pas", () => {
  for (const action of PLAYER_ACTIONS) {
    if (action.category !== "probe" && action.category !== "examine") continue;
    assert.equal(action.effect.therapeutic, false, action.id);
    assert.equal(action.effect.patient, 0, action.id);
  }
});

/* -------------------------------------------------------------------------- */
/* Disponibilité par phase                                                    */
/* -------------------------------------------------------------------------- */

test("chaque phase jouable propose au moins une action", () => {
  for (const phase of V3_PHASES) {
    if (phase === "new_call" || phase === "debrief") continue;
    assert.ok(actionsForPhase(phase).length > 0, phase);
  }
});

test("aucune action n'est proposée pendant l'appel ou le débriefing", () => {
  // L'écran d'appel prépare le matériel et accepte la mission ; le débriefing
  // n'accepte plus rien qui modifie la session.
  assert.deepEqual(actionsForPhase("new_call"), []);
  assert.deepEqual(actionsForPhase("debrief"), []);
});

test("le temps déclaré et le temps appliqué concordent", () => {
  for (const action of PLAYER_ACTIONS) {
    assert.equal(action.effect.timeSeconds, action.timeSeconds, action.id);
    if (action.unjustifiedEffect) {
      assert.equal(action.unjustifiedEffect.timeSeconds, action.timeSeconds, action.id);
    }
  }
});

test("le schéma refuse un geste invasif non marqué hors périmètre", () => {
  const result = actionCatalogSchema.safeParse({
    schemaVersion: 1,
    actions: [
      {
        id: "action.poser-un-catheter",
        label: "Poser un cathéter",
        hint: "Abord vasculaire",
        category: "care",
        requires: {
          phases: ["priority_actions"],
          equipment: [],
          blockingActions: [],
          justifyingFacts: [],
          justifyingActions: [],
          maxUses: null,
        },
        reveals: [],
        timeSeconds: 60,
        effect: { score: 0, patient: 0, timeSeconds: 60, flag: null, therapeutic: false },
        unjustifiedEffect: null,
        actId: null,
        competencyIds: ["dea.c05"],
        outOfScope: false,
        outOfScopeReason: null,
        knowledgeId: null,
      },
    ],
  });
  assert.equal(result.success, false);
  assert.match(result.error!.issues[0]!.message, /geste exclu du jouable V3/);
});
