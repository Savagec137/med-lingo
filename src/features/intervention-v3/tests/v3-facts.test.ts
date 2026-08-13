import assert from "node:assert/strict";
import test from "node:test";
import { CLINICAL_FACTS, getFact } from "../facts/fact-registry.ts";
import { factRegistrySchema } from "../facts/fact-schema.ts";
import { factCoverage, gapFactIds, isFactVisible, readFact } from "../facts/read-fact.ts";
import { revealFact } from "../facts/reveal-fact.ts";
import { PILOT_SCENARIO_ID, getV3Scenario } from "../scenarios/v3-catalog.ts";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import { displayValue, type InterventionSession } from "../v3-domain.ts";

const scenario = getV3Scenario(PILOT_SCENARIO_ID);

const fresh = (equipment = ALL_EQUIPMENT) =>
  createV3Session(scenario, { preparedEquipment: equipment });

const onScene = (session: InterventionSession): InterventionSession => ({
  ...session,
  phase: "vitals",
  status: "active",
});

const at = (session: InterventionSession, seconds: number): InterventionSession => ({
  ...session,
  simulatedTimeSeconds: seconds,
});

/* -------------------------------------------------------------------------- */
/* Registre                                                                   */
/* -------------------------------------------------------------------------- */

test("aucun gabarit de fait ne contient de chiffre", () => {
  // L'invariant central du registre : un gabarit chiffré laisserait deviner un
  // ordre de grandeur avant que la mesure soit prise.
  for (const fact of CLINICAL_FACTS) {
    assert.ok(!/[0-9]/.test(fact.placeholder), `${fact.id} : « ${fact.placeholder} »`);
  }
});

test("un fait visible sur action nomme au moins une action, et l'inverse", () => {
  for (const fact of CLINICAL_FACTS) {
    if (fact.visibility === "on_action") {
      assert.ok(fact.revealedBy.length > 0, fact.id);
    } else {
      assert.equal(fact.revealedBy.length, 0, fact.id);
    }
  }
});

test("aucun fait dérivé ne dépend d'un fait dérivé", () => {
  for (const fact of CLINICAL_FACTS) {
    for (const dependency of fact.dependsOn) {
      assert.notEqual(getFact(dependency).category, "derived", `${fact.id} → ${dependency}`);
    }
  }
});

test("le schéma refuse un gabarit chiffré", () => {
  const result = factRegistrySchema.safeParse({
    schemaVersion: 1,
    facts: [
      {
        id: "fact.essai",
        category: "probe",
        visibility: "on_action",
        label: "Essai",
        valueKind: "numeric",
        unit: "%",
        placeholder: "98",
        vitalKey: "spo2",
        requiresEquipment: [],
        revealedBy: ["action.essai"],
        dependsOn: [],
        freshnessSeconds: 300,
      },
    ],
  });
  assert.equal(result.success, false);
  assert.match(result.error!.issues[0]!.message, /contient un chiffre/);
});

test("le schéma refuse une dépendance entre faits dérivés", () => {
  const derived = (id: string, dependsOn: string[]) => ({
    id,
    category: "derived" as const,
    visibility: "on_dependency" as const,
    label: id,
    valueKind: "enum" as const,
    unit: null,
    placeholder: "Non disponible",
    vitalKey: null,
    requiresEquipment: [],
    revealedBy: [],
    dependsOn,
    freshnessSeconds: null,
  });
  const result = factRegistrySchema.safeParse({
    schemaVersion: 1,
    facts: [derived("fact.premier", ["fact.second"]), derived("fact.second", ["fact.premier"])],
  });
  assert.equal(result.success, false);
});

/* -------------------------------------------------------------------------- */
/* readFact                                                                   */
/* -------------------------------------------------------------------------- */

test("sur une session neuve, aucune constante n'est lisible", () => {
  const session = fresh();
  for (const factId of scenario.factIds) {
    const fact = getFact(factId);
    if (fact.category !== "probe") continue;
    const read = readFact(session, factId);
    assert.equal(read.status, "unknown", factId);
    if (read.status === "unknown") {
      assert.equal(read.reason, "not_revealed");
      // Le libellé d'absence ne doit pas non plus porter de chiffre.
      assert.ok(!/[0-9]/.test(read.label), `${factId} : ${read.label}`);
      assert.ok(!/[0-9]/.test(read.placeholder), factId);
    }
  }
});

test("une constante non mesurée est annoncée « Non mesurée »", () => {
  const read = readFact(fresh(), "fact.ta");
  assert.equal(read.status, "unknown");
  if (read.status === "unknown") {
    assert.equal(read.label, "Non mesurée");
    assert.equal(read.placeholder, "--/--");
  }
});

test("sans le matériel, l'absence est motivée par le matériel", () => {
  const session = fresh([]);
  const read = readFact(session, "fact.glycemie");
  assert.equal(read.status, "unknown");
  if (read.status === "unknown") {
    assert.equal(read.reason, "equipment_missing");
    assert.match(read.label, /Glucomètre non embarqué/);
  }
});

test("les données de régulation sont lisibles dès l'appel, la scène seulement à l'arrivée", () => {
  const session = fresh();
  assert.equal(readFact(session, "fact.motif-appel").status, "known");
  assert.equal(readFact(session, "fact.position-patient").status, "unknown");
  const arrived = { ...session, phase: "arrival" as const };
  assert.equal(readFact(arrived, "fact.position-patient").status, "known");
});

test("la valeur relevée est figée : elle ne suit pas l'évolution du patient", () => {
  const session = onScene(fresh());
  const measured = revealFact(session, "fact.spo2", "action.poser-saturometre");
  const first = readFact(measured, "fact.spo2");
  assert.equal(first.status, "known");
  const measuredValue = first.status === "known" ? first.value : undefined;

  // Le patient se dégrade, mais aucun nouveau relevé n'a été fait.
  const drifted = { ...measured, vitals: { ...measured.vitals, spo2: 88 } };
  const second = readFact(drifted, "fact.spo2");
  assert.equal(second.status, "known");
  if (second.status === "known") {
    assert.deepEqual(second.value, measuredValue);
  }
});

test("une mesure devient périmée passé son délai de fraîcheur", () => {
  const session = onScene(fresh());
  const measured = revealFact(session, "fact.spo2", "action.poser-saturometre");
  const fact = getFact("fact.spo2");
  assert.equal(fact.freshnessSeconds, 300);

  const justBefore = readFact(at(measured, 300), "fact.spo2");
  assert.equal(justBefore.status === "known" && justBefore.isStale, false);

  const after = readFact(at(measured, 301), "fact.spo2");
  assert.equal(after.status === "known" && after.isStale, true);
  assert.equal(after.status === "known" ? after.ageSeconds : -1, 301);
});

test("un fait sans délai de fraîcheur ne périme jamais", () => {
  const session = onScene(fresh());
  const measured = revealFact(session, "fact.antecedents", "action.consulter-documents");
  const read = readFact(at(measured, 100_000), "fact.antecedents");
  assert.equal(read.status === "known" && read.isStale, false);
});

test("aucune tendance à une mesure, une tendance à deux", () => {
  const session = onScene(fresh());
  const once = revealFact(session, "fact.fc", "action.palper-pouls");
  const firstRead = readFact(once, "fact.fc");
  assert.equal(firstRead.status === "known" && firstRead.trend, undefined);

  const drifted = { ...at(once, 120), vitals: { ...once.vitals, hr: 112 } };
  const twice = revealFact(drifted, "fact.fc", "action.palper-pouls");
  const secondRead = readFact(twice, "fact.fc");
  assert.equal(secondRead.status === "known" && secondRead.trend, "up");
  assert.equal(secondRead.status === "known" ? secondRead.delta : "", "+20");
});

test("une révélation ne s'annule pas", () => {
  const session = onScene(fresh());
  const measured = revealFact(session, "fact.ta", "action.prendre-tension");
  assert.ok(isFactVisible(measured, "fact.ta"));
  // Reculer la phase ne dé-révèle rien : sans cette garantie, annuler une action
  // permettrait de sonder les constantes sans conséquence.
  const back = { ...measured, phase: "arrival" as const };
  assert.ok(isFactVisible(back, "fact.ta"));
});

test("un fait dérivé attend tous ses prérequis", () => {
  let session = onScene(fresh());
  assert.equal(readFact(session, "fact.stabilite-parametres").status, "unknown");
  session = revealFact(session, "fact.spo2", "action.poser-saturometre");
  session = revealFact(session, "fact.fc", "action.palper-pouls");
  assert.equal(readFact(session, "fact.stabilite-parametres").status, "unknown");
  session = revealFact(session, "fact.fr", "action.compter-fr");
  const read = readFact(session, "fact.stabilite-parametres");
  assert.equal(read.status, "known");
  assert.equal(read.status === "known" ? displayValue(read.value) : "", "Paramètres stables");
});

/* -------------------------------------------------------------------------- */
/* Trous et couverture                                                        */
/* -------------------------------------------------------------------------- */

test("sur une session neuve, tous les faits attendus sont des trous", () => {
  const gaps = gapFactIds(fresh(), scenario);
  assert.deepEqual([...gaps].sort(), [...scenario.expectedHandoverFactIds].sort());
});

test("une mesure périmée redevient un trou", () => {
  let session = onScene(fresh());
  session = revealFact(session, "fact.ta", "action.prendre-tension");
  assert.ok(!gapFactIds(session, scenario).includes("fact.ta"));
  assert.ok(gapFactIds(at(session, 400), scenario).includes("fact.ta"));
});

test("la couverture distingue non mesuré et hors d'atteinte", () => {
  const coverage = factCoverage(fresh([]), scenario);
  const glycemia = coverage.find((entry) => entry.factId === "fact.glycemie");
  const respiratoryRate = coverage.find((entry) => entry.factId === "fact.fr");
  assert.equal(glycemia?.state, "not_measurable");
  assert.equal(respiratoryRate?.state, "not_measured");
});
