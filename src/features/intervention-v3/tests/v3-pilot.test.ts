import assert from "node:assert/strict";
import test from "node:test";
import { getFact } from "../facts/fact-registry.ts";
import { gapFactIds, readFact } from "../facts/read-fact.ts";
import { revealFacts } from "../facts/reveal-fact.ts";
import { sourceTrust } from "../facts/source-trust.ts";
import { findKnowledge, findLibraryKnowledge } from "../../../content/library/library-catalog.ts";
import { PILOT_SCENARIO_ID, V3_SCENARIOS, getV3Scenario } from "../scenarios/v3-catalog.ts";
import { scenarioSchema } from "../scenarios/scenario-schema.ts";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import { MAX_EXPECTED_HANDOVER_FACTS, V3_PHASES } from "../v3-domain.ts";

const scenario = getV3Scenario(PILOT_SCENARIO_ID);

/* -------------------------------------------------------------------------- */
/* Périmètre de livraison                                                     */
/* -------------------------------------------------------------------------- */

test("le catalogue V3 ne contient que le scénario pilote", () => {
  // Un seul scénario livré : c'est la condition du premier lot.
  assert.equal(V3_SCENARIOS.length, 1);
  assert.equal(V3_SCENARIOS[0]?.id, PILOT_SCENARIO_ID);
});

test("le scénario pilote valide son schéma", () => {
  assert.equal(scenarioSchema.safeParse(scenario).success, true);
});

/* -------------------------------------------------------------------------- */
/* Décisions produit                                                          */
/* -------------------------------------------------------------------------- */

test("le bilan attendu compte exactement douze faits", () => {
  assert.equal(scenario.expectedHandoverFactIds.length, MAX_EXPECTED_HANDOVER_FACTS);
  assert.equal(new Set(scenario.expectedHandoverFactIds).size, MAX_EXPECTED_HANDOVER_FACTS);
});

test("la température est mobilisée mais n'est pas attendue au bilan", () => {
  // Décision produit : le plafond de douze n'est pas relevé, la température sort
  // du bilan attendu. Elle reste mesurable et rapporte du temps, pas des points.
  assert.ok(scenario.factIds.includes("fact.temperature"));
  assert.ok(!scenario.expectedHandoverFactIds.includes("fact.temperature"));
});

test("les circonstances sont un contexte de régulation, pas un fait à recueillir", () => {
  const fact = getFact("fact.circonstances");
  assert.equal(fact.category, "dispatch");
  assert.equal(fact.visibility, "always");
  assert.ok(!scenario.expectedHandoverFactIds.includes("fact.circonstances"));
  // Elles sont lisibles dès l'écran d'appel, sans aucune action.
  const session = createV3Session(scenario);
  assert.equal(readFact(session, "fact.circonstances").status, "known");
});

test("la glycémie est déclarée pertinente malgré une famille traumatique", () => {
  // Patient confus avec perte de connaissance initiale : la glycémie fait partie
  // du bilan. La famille `trauma` ne l'active pas, il faut donc le déclarer.
  assert.equal(scenario.clinical.glycemiaRelevant, true);
  assert.ok(scenario.expectedHandoverFactIds.includes("fact.glycemie"));
});

test("le schéma refuse une glycémie attendue sans profil la déclarant pertinente", () => {
  const broken = {
    ...scenario,
    clinical: { ...scenario.clinical, glycemiaRelevant: false },
  };
  const result = scenarioSchema.safeParse(broken);
  assert.equal(result.success, false);
  assert.ok(
    result.error!.issues.some((issue) => /ne la déclare pas pertinente/.test(issue.message)),
  );
});

/* -------------------------------------------------------------------------- */
/* Constantes initiales                                                       */
/* -------------------------------------------------------------------------- */

test("sept constantes sur huit sont normales, seule la conscience alerte", () => {
  // C'est tout le piège pédagogique du scénario : un joueur qui mesure la SpO₂
  // et le pouls les trouve rassurants et peut partir sans avoir vu l'essentiel.
  const baseline = scenario.clinical.baseline;
  assert.equal(baseline.spo2, 98);
  assert.equal(baseline.hr, 92);
  assert.equal(baseline.rr, 18);
  assert.equal(baseline.sbp, 138);
  assert.equal(baseline.gcs, 13);
  assert.ok(baseline.gcs < 14, "le Glasgow doit être le signal du scénario");
  assert.equal(scenario.clinical.cardiacArrest, false);
});

test("les valeurs cliniques sont marquées comme restant à valider", () => {
  assert.equal(scenario.clinicalTrust, "internal_to_validate");
  assert.match(scenario.clinicalReviewNote, /relues par le binôme/);
});

/* -------------------------------------------------------------------------- */
/* Transmission et régulation                                                 */
/* -------------------------------------------------------------------------- */

test("chaque question du régulateur naît d'un fait attendu au bilan", () => {
  assert.equal(scenario.regulatorQuestions.length, 4);
  for (const question of scenario.regulatorQuestions) {
    assert.ok(scenario.expectedHandoverFactIds.includes(question.triggeredByFactId), question.id);
    assert.equal(question.answers.filter((answer) => answer.correct).length, 1, question.id);
  }
});

test("un bilan complet ne déclenche aucune question du régulateur", () => {
  // Le meilleur retour que le jeu puisse donner, et il ne coûte aucun texte.
  let session = createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT });
  session = { ...session, phase: "vitals", status: "active" };
  session = revealFacts(session, scenario.expectedHandoverFactIds, "action.test");
  const gaps = gapFactIds(session, scenario);
  const asked = scenario.regulatorQuestions.filter((question) =>
    gaps.includes(question.triggeredByFactId),
  );
  assert.equal(gaps.length, 0);
  assert.equal(asked.length, 0);
});

test("un bilan sans tension déclenche exactement la question sur la tension", () => {
  let session = createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT });
  session = { ...session, phase: "vitals", status: "active" };
  const withoutBloodPressure = scenario.expectedHandoverFactIds.filter(
    (factId) => factId !== "fact.ta",
  );
  session = revealFacts(session, withoutBloodPressure, "action.test");
  const gaps = gapFactIds(session, scenario);
  assert.deepEqual(gaps, ["fact.ta"]);
  const asked = scenario.regulatorQuestions.filter((question) =>
    gaps.includes(question.triggeredByFactId),
  );
  assert.equal(asked.length, 1);
  assert.equal(asked[0]?.id, "question.tension");
});

test("aucune option de transmission ne propose de choisir une destination", () => {
  for (const item of scenario.handoverItems) {
    assert.ok(!/h[oô]pital|service d'accueil|destination|orientation/i.test(item.label), item.id);
  }
  for (const addition of scenario.freeAdditions) {
    assert.ok(!/h[oô]pital|neurochirurgie|scanner/i.test(addition), addition);
  }
});

test("les formulations diagnostiques figurent parmi les ajouts refusés", () => {
  assert.ok(scenario.rejectedAdditions.length >= 3);
  // La consigne d'orientation est reçue, jamais choisie.
  assert.match(scenario.regulatorInstruction, /médecin régulateur/);
});

/* -------------------------------------------------------------------------- */
/* Gestes                                                                     */
/* -------------------------------------------------------------------------- */

test("le tour de gestes demande autant de sélections qu'il recommande de gestes", () => {
  const round = scenario.gestureRounds[0]!;
  const recommended = round.offered.filter((gesture) => gesture.recommended);
  assert.equal(round.requiredSelections, 3);
  assert.equal(recommended.length, 3);
});

test("le tour de gestes expose quatre limites motivées", () => {
  const round = scenario.gestureRounds[0]!;
  const refused = round.offered.filter((gesture) => gesture.outOfScope);
  assert.equal(refused.length, 4);
  for (const gesture of refused) {
    assert.ok(gesture.outOfScopeReason && gesture.outOfScopeReason.length >= 20, gesture.id);
    assert.equal(gesture.recommended, false, gesture.id);
  }
});

test("la tuile oxygène ne cite aucun acte", () => {
  // R. 6311-17, II, 3 ne couvre que les aérosols de produits non médicamenteux,
  // et les deux documents ANSM sur l'oxygène médical sont en `listing_only`.
  // Rattacher un acte à cette tuile serait inventer une base réglementaire.
  const oxygen = scenario.gestureRounds[0]!.offered.find(
    (gesture) => gesture.id === "geste.administrer-oxygene",
  );
  assert.ok(oxygen);
  assert.equal(oxygen!.actId, null);
  assert.equal(oxygen!.knowledgeId, null);
});

test("toute fiche citée par un geste se résout dans la bibliothèque", () => {
  for (const round of scenario.gestureRounds) {
    for (const gesture of round.offered) {
      if (!gesture.knowledgeId) continue;
      const resolved = gesture.knowledgeId.startsWith("library.")
        ? findLibraryKnowledge(gesture.knowledgeId)
        : findKnowledge(gesture.knowledgeId);
      assert.ok(resolved, `${gesture.id} → ${gesture.knowledgeId}`);
    }
  }
});

/* -------------------------------------------------------------------------- */
/* Récit et confiance dans les sources                                        */
/* -------------------------------------------------------------------------- */

test("chaque phase porte un texte de scène", () => {
  for (const phase of V3_PHASES) {
    assert.ok(scenario.narrative[phase], phase);
  }
});

test("le débriefing attribue l'hypothèse au service d'accueil", () => {
  // Le seul écran qui peut nommer une pathologie ne l'attribue jamais au joueur.
  assert.match(scenario.narrative.debrief, /service d'accueil a retenu l'hypothèse/);
});

test("un texte officiel non lu ne vaut pas mieux qu'une note interne", () => {
  // La garantie du modèle de confiance : croiser « qui publie » et « quelqu'un
  // a-t-il lu » interdit d'afficher « source officielle vérifiée » sur une URL.
  assert.equal(sourceTrust("decret-2022-629"), "official_verified");
  assert.equal(sourceTrust("csp-dae-r6311-14-16"), "official_verified");
  assert.equal(sourceTrust("decret-2018-1186-dae"), "internal_to_validate");
  assert.equal(sourceTrust("b2-m4-support-etudiant"), "training_source");
  assert.equal(sourceTrust("intervention-medical-review"), "internal_to_validate");
});
