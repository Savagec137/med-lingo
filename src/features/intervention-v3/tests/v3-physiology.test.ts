import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { applyAction } from "../engine/apply-action.ts";
import { readFact } from "../facts/read-fact.ts";
import {
  DETRESSE_RESPIRATOIRE,
  TRAUMA_CRANIEN_N104,
  profileFromScenario,
} from "../physiology/clinical-profiles.ts";
import {
  createPhysiology,
  physiologySeed,
  samplePhysiology,
  withPhysiologyEvent,
} from "../physiology/physiology-engine.ts";
import {
  getVisibleLiveVitals,
  monitoringSnapshot,
  getVisibleMonitoringState,
  getVisibleStaleVitals,
  getVisibleWaveformState,
} from "../physiology/physiology-selectors.ts";
import { SIGNAL_DYNAMICS } from "../physiology/vital-trends.ts";
import { VITAL_SIGNALS, type VitalSignal } from "../physiology/physiology-types.ts";
import { PILOT_SCENARIO_ID, getV3Scenario } from "../scenarios/v3-catalog.ts";
import { ALL_EQUIPMENT, createV3Session } from "../v3-session.ts";
import { SESSION_VIEW_FIELDS, toSessionView } from "../v3-domain.ts";
import { vitalsScreenModel } from "../ui/vitals-screen.ts";
import type { InterventionPhase, InterventionSession } from "../v3-domain.ts";

/**
 * Le moteur physiologique, vérifié sur les deux exigences qui le définissent :
 * **il fait vivre les constantes de façon plausible**, et **il n'en laisse rien
 * filtrer sans une action du joueur**.
 *
 * Les deux vont ensemble. Un moteur qui anime bien mais laisse lire une valeur
 * non mesurée transforme la simulation en démonstration ; un moteur étanche mais
 * figé la ramène au quiz de valeurs fixes.
 */

const scenario = getV3Scenario(PILOT_SCENARIO_ID);

const activeAt = (phase: InterventionPhase): InterventionSession => ({
  ...createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT }),
  phase,
  status: "active" as const,
});

const play = (session: InterventionSession, ...actionIds: string[]): InterventionSession =>
  actionIds.reduce((current, actionId) => applyAction(current, actionId).session, session);

/* -------------------------------------------------------------------------- */
/* 1. Session vierge : rien ne se lit                                         */
/* -------------------------------------------------------------------------- */

test("une session vierge n'expose aucune constante en direct", () => {
  const session = activeAt("vitals");
  assert.deepEqual(getVisibleLiveVitals(session, 0), []);
  assert.equal(getVisibleMonitoringState(session, 0).anyLive, false);
});

test("une session vierge n'expose aucun tracé", () => {
  const session = activeAt("vitals");
  const waveform = getVisibleWaveformState(session, 0);
  assert.deepEqual(waveform.pulse.points, []);
  assert.deepEqual(waveform.respiration.points, []);
  assert.equal(waveform.pulse.ratePerMinute, null);
  assert.equal(waveform.respiration.ratePerMinute, null);
});

test("aucune des sept constantes protégées n'est lisible sans action", () => {
  const session = activeAt("vitals");
  for (const factId of [
    "fact.spo2",
    "fact.fc",
    "fact.fr",
    "fact.ta",
    "fact.glycemie",
    "fact.temperature",
    "fact.glasgow",
  ]) {
    assert.equal(readFact(session, factId).status, "unknown", factId);
  }
});

test("le bandeau du moniteur ne dit rien du patient tant que rien n'est posé", () => {
  const state = getVisibleMonitoringState(activeAt("vitals"), 0);
  assert.equal(state.statusLabel, "Saturomètre non posé");
  assert.deepEqual(state.sensors, []);
});

/* -------------------------------------------------------------------------- */
/* 2. Après la pose du saturomètre                                            */
/* -------------------------------------------------------------------------- */

const withSaturometer = () => play(activeAt("vitals"), "action.poser-saturometre");

test("poser le saturomètre rend la SpO₂ et le pouls surveillés en direct", () => {
  const session = withSaturometer();
  const live = getVisibleLiveVitals(session, session.simulatedTimeSeconds);
  const signals = live.map((entry) => entry.signal).sort();
  assert.deepEqual(signals, ["hr", "spo2"]);
  for (const entry of live) {
    assert.equal(entry.isLive, true);
    assert.equal(entry.isMeasured, true);
    assert.equal(entry.isStale, false);
    assert.ok(entry.numericValue !== null, `${entry.signal} sans valeur`);
  }
});

test("le tracé de pouls apparaît avec le capteur, pas avant", () => {
  const before = getVisibleWaveformState(activeAt("vitals"), 0);
  assert.deepEqual(before.pulse.points, []);

  const session = withSaturometer();
  const after = getVisibleWaveformState(session, session.simulatedTimeSeconds);
  assert.ok(after.pulse.points.length > 0);
  assert.ok(after.pulse.ratePerMinute !== null);
  // Le tracé bat à la fréquence **mesurée**, jamais à une autre.
  const measured = getVisibleLiveVitals(session, session.simulatedTimeSeconds).find(
    (entry) => entry.signal === "hr",
  );
  assert.equal(after.pulse.ratePerMinute, measured?.numericValue);
});

test("le saturomètre ne donne ni tension ni glycémie", () => {
  const session = withSaturometer();
  assert.equal(readFact(session, "fact.ta").status, "unknown");
  assert.equal(readFact(session, "fact.glycemie").status, "unknown");
  const live = getVisibleLiveVitals(session, session.simulatedTimeSeconds);
  assert.equal(
    live.some((entry) => entry.signal === "sbp" || entry.signal === "glycemia"),
    false,
  );
});

test("la valeur en direct bouge d'un instant à l'autre", () => {
  const session = withSaturometer();
  const start = session.simulatedTimeSeconds;
  const series = Array.from(
    { length: 30 },
    (_, index) =>
      getVisibleLiveVitals(session, start + index * 4).find((entry) => entry.signal === "spo2")
        ?.numericValue ?? null,
  );
  assert.ok(new Set(series).size > 1, "la SpO₂ affichée ne bouge jamais");
});

test("le capteur cherche son signal avant d'afficher un chiffre", () => {
  const session = withSaturometer();
  // La pose est journalisée à l'instant où elle commence : juste après, le
  // capteur est en acquisition et n'affiche pas encore de valeur.
  const live = getVisibleLiveVitals(session, 1);
  assert.ok(live.length > 0);
  for (const entry of live) {
    assert.equal(entry.signalQuality, "measuring");
    assert.equal(entry.value, null);
    assert.equal(entry.numericValue, null);
  }
});

/* -------------------------------------------------------------------------- */
/* 3. Plausibilité des variations                                             */
/* -------------------------------------------------------------------------- */

/** Le plus grand écart entre deux échantillons espacés de `stepSeconds`. */
function maxStep(
  state: InterventionSession["physiology"],
  signal: VitalSignal,
  options: { untilSeconds: number; stepSeconds: number },
): number {
  let worst = 0;
  for (let time = 0; time < options.untilSeconds; time += options.stepSeconds) {
    const from = samplePhysiology(state, time)[signal];
    const to = samplePhysiology(state, time + options.stepSeconds)[signal];
    worst = Math.max(worst, Math.abs(to - from));
  }
  return worst;
}

test("aucune constante ne saute au-delà de son pas admissible", () => {
  const state = activeAt("vitals").physiology;
  for (const signal of VITAL_SIGNALS) {
    const observed = maxStep(state, signal, { untilSeconds: 1800, stepSeconds: 2 });
    assert.ok(
      observed <= SIGNAL_DYNAMICS[signal].maxStepPerSample,
      `${signal} saute de ${observed}, au-delà de ${SIGNAL_DYNAMICS[signal].maxStepPerSample}`,
    );
  }
});

test("la SpO₂ ne bouge pas de plus de deux points sans événement", () => {
  const state = activeAt("vitals").physiology;
  assert.ok(maxStep(state, "spo2", { untilSeconds: 1800, stepSeconds: 2 }) <= 2);
});

test("même un patient qui se dégrade vite ne saute pas d'un échantillon à l'autre", () => {
  const state = createPhysiology(DETRESSE_RESPIRATOIRE, physiologySeed("test-degradation"));
  assert.ok(maxStep(state, "spo2", { untilSeconds: 1800, stepSeconds: 2 }) <= 2);
  assert.ok(maxStep(state, "hr", { untilSeconds: 1800, stepSeconds: 2 }) <= 5);
});

test("un patient stable reste autour de sa base une demi-heure durant", () => {
  const state = activeAt("vitals").physiology;
  for (let time = 0; time <= 1800; time += 30) {
    const vitals = samplePhysiology(state, time);
    assert.ok(Math.abs(vitals.spo2 - TRAUMA_CRANIEN_N104.baselineSpO2) <= 2, `SpO₂ à ${time} s`);
    assert.ok(Math.abs(vitals.hr - TRAUMA_CRANIEN_N104.baselineHeartRate) <= 5, `FC à ${time} s`);
    assert.ok(
      Math.abs(vitals.rr - TRAUMA_CRANIEN_N104.baselineRespiratoryRate) <= 3,
      `FR à ${time} s`,
    );
  }
});

test("un patient qui se dégrade glisse sans jamais franchir l'impossible", () => {
  const state = createPhysiology(DETRESSE_RESPIRATOIRE, physiologySeed("test-degradation"));
  const early = samplePhysiology(state, 60);
  const late = samplePhysiology(state, 1200);
  assert.ok(late.spo2 < early.spo2, "la saturation devrait baisser");
  assert.ok(late.hr > early.hr, "la fréquence cardiaque devrait monter");
  // La dégradation s'aplatit : elle tend vers une destination, elle ne file pas.
  const veryLate = samplePhysiology(state, 3600);
  assert.ok(veryLate.spo2 > 70, `saturation invraisemblable à une heure : ${veryLate.spo2}`);
});

test("la tension ne se surveille pas en continu", () => {
  const session = play(activeAt("vitals"), "action.poser-saturometre", "action.prendre-tension");
  const live = getVisibleLiveVitals(session, session.simulatedTimeSeconds + 300);
  assert.equal(
    live.some((entry) => entry.signal === "sbp"),
    false,
    "une tension affichée en direct inventerait un appareil qui n'existe pas",
  );
  // Elle reste lisible : c'est un instantané, pas une valeur perdue.
  assert.equal(readFact(session, "fact.ta").status, "known");
});

test("la diastolique suit la systolique sans jamais la dépasser", () => {
  const state = createPhysiology(DETRESSE_RESPIRATOIRE, physiologySeed("test-tension"));
  for (let time = 0; time <= 1800; time += 60) {
    const vitals = samplePhysiology(state, time);
    assert.ok(vitals.dbp < vitals.sbp, `diastolique ≥ systolique à ${time} s`);
    assert.ok(vitals.sbp - vitals.dbp >= 10, `pression différentielle nulle à ${time} s`);
  }
});

test("le patient part exactement de sa ligne de base, couplages compris", () => {
  // Les couplages sont différentiels : un patient déclaré tachypnéique ne se voit
  // pas ajouter sa propre tachypnée à la première seconde.
  const state = createPhysiology(DETRESSE_RESPIRATOIRE, physiologySeed("test-base"));
  const vitals = samplePhysiology(state, 0);
  assert.ok(Math.abs(vitals.rr - DETRESSE_RESPIRATOIRE.baselineRespiratoryRate) <= 2);
  assert.ok(Math.abs(vitals.hr - DETRESSE_RESPIRATOIRE.baselineHeartRate) <= 4);
});

/* -------------------------------------------------------------------------- */
/* 4. Retrait du capteur                                                      */
/* -------------------------------------------------------------------------- */

test("retirer le capteur arrête le direct et conserve la dernière mesure", () => {
  const attached = withSaturometer();
  const measured = getVisibleLiveVitals(attached, attached.simulatedTimeSeconds).find(
    (entry) => entry.signal === "spo2",
  );
  assert.ok(measured?.numericValue !== null);

  const removed = play(attached, "action.retirer-saturometre");
  assert.deepEqual(getVisibleLiveVitals(removed, removed.simulatedTimeSeconds), []);
  assert.equal(getVisibleMonitoringState(removed, removed.simulatedTimeSeconds).anyLive, false);

  // La valeur relevée demeure : ce que le joueur a gagné ne lui est pas repris.
  const frozen = readFact(removed, "fact.spo2");
  assert.equal(frozen.status, "known");
});

test("retirer le capteur masque le tracé", () => {
  const removed = play(withSaturometer(), "action.retirer-saturometre");
  const waveform = getVisibleWaveformState(removed, removed.simulatedTimeSeconds);
  assert.deepEqual(waveform.pulse.points, []);
  assert.equal(waveform.pulse.quality, "lost");
});

test("la mesure conservée après retrait finit par se périmer", () => {
  const removed = play(withSaturometer(), "action.retirer-saturometre");
  const later: InterventionSession = {
    ...removed,
    simulatedTimeSeconds: removed.simulatedTimeSeconds + 600,
  };
  const stale = getVisibleStaleVitals(later, later.simulatedTimeSeconds);
  assert.ok(
    stale.some((entry) => entry.factId === "fact.spo2"),
    "une saturation vieille de dix minutes doit être signalée comme datée",
  );
  assert.equal(stale.find((entry) => entry.factId === "fact.spo2")?.noticeLabel, "À réévaluer");
});

test("une constante surveillée en direct n'est jamais périmée", () => {
  const attached = withSaturometer();
  const later: InterventionSession = {
    ...attached,
    simulatedTimeSeconds: attached.simulatedTimeSeconds + 900,
  };
  const stale = getVisibleStaleVitals(later, later.simulatedTimeSeconds);
  assert.equal(
    stale.some((entry) => entry.factId === "fact.spo2"),
    false,
  );
});

/* -------------------------------------------------------------------------- */
/* 5. Effet des gestes                                                        */
/* -------------------------------------------------------------------------- */

test("l'oxygène améliore progressivement une saturation basse, sans miracle", () => {
  const base = createPhysiology(DETRESSE_RESPIRATOIRE, physiologySeed("test-oxygene"));
  const treated = withPhysiologyEvent(base, "oxygen_started", 120, "geste.administrer-oxygene");

  // Immédiatement après la pose, rien n'a encore changé.
  assert.ok(Math.abs(samplePhysiology(treated, 121).spo2 - samplePhysiology(base, 121).spo2) <= 1);

  // À trois minutes, l'écart est net ; à dix, il est franc.
  assert.ok(samplePhysiology(treated, 300).spo2 > samplePhysiology(base, 300).spo2);
  assert.ok(samplePhysiology(treated, 600).spo2 > samplePhysiology(base, 600).spo2 + 3);
});

test("l'oxygène ne fait rien à un patient qui sature déjà bien", () => {
  const base = createPhysiology(TRAUMA_CRANIEN_N104, physiologySeed("test-oxygene-inutile"));
  const treated = withPhysiologyEvent(base, "oxygen_started", 120, "geste.administrer-oxygene");
  for (const time of [180, 300, 600, 1200]) {
    assert.equal(
      samplePhysiology(treated, time).spo2,
      samplePhysiology(base, time).spo2,
      `l'oxygène ne doit rien changer à ${time} s`,
    );
  }
});

test("retirer l'oxygène fait redescendre la saturation progressivement", () => {
  const base = createPhysiology(DETRESSE_RESPIRATOIRE, physiologySeed("test-retrait-o2"));
  const treated = withPhysiologyEvent(base, "oxygen_started", 60, "geste.administrer-oxygene");
  const stopped = withPhysiologyEvent(treated, "oxygen_stopped", 600, "retrait");
  assert.ok(samplePhysiology(stopped, 1200).spo2 < samplePhysiology(treated, 1200).spo2);
});

test("l'immobilisation freine une dégradation sans la soigner", () => {
  const base = createPhysiology(DETRESSE_RESPIRATOIRE, physiologySeed("test-immobilisation"));
  const held = withPhysiologyEvent(base, "immobilised", 60, "geste.maintenir-axe");
  const late = samplePhysiology(held, 900).spo2;
  assert.ok(late > samplePhysiology(base, 900).spo2, "la dégradation devrait être freinée");
  assert.ok(late < DETRESSE_RESPIRATOIRE.baselineSpO2, "elle ne devrait pas être annulée");
});

test("un geste dangereux aggrave le patient", () => {
  const base = createPhysiology(TRAUMA_CRANIEN_N104, physiologySeed("test-geste-dangereux"));
  const harmed = withPhysiologyEvent(base, "dangerous_act", 60, "geste.retirer-immobilisation");
  assert.ok(samplePhysiology(harmed, 600).hr > samplePhysiology(base, 600).hr);
  assert.ok(samplePhysiology(harmed, 600).spo2 < samplePhysiology(base, 600).spo2);
});

test("rassurer n'agit que sur un patient que la douleur fait monter", () => {
  const painful = createPhysiology(TRAUMA_CRANIEN_N104, physiologySeed("test-rassurer"));
  const soothed = withPhysiologyEvent(painful, "reassured", 60, "geste.rassurer-surveiller");
  assert.ok(samplePhysiology(soothed, 600).hr < samplePhysiology(painful, 600).hr);

  const calm = createPhysiology(
    { ...TRAUMA_CRANIEN_N104, painLevel: 1 },
    physiologySeed("test-rassurer-calme"),
  );
  const calmSoothed = withPhysiologyEvent(calm, "reassured", 60, "geste.rassurer-surveiller");
  assert.equal(samplePhysiology(calmSoothed, 600).hr, samplePhysiology(calm, 600).hr);
});

/* -------------------------------------------------------------------------- */
/* 6. Déterminisme                                                            */
/* -------------------------------------------------------------------------- */

test("même graine, même temps, mêmes valeurs", () => {
  const first = createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT });
  const second = createV3Session(scenario, { preparedEquipment: ALL_EQUIPMENT });
  for (const time of [0, 37, 120, 455, 1800]) {
    assert.deepEqual(
      samplePhysiology(first.physiology, time),
      samplePhysiology(second.physiology, time),
    );
  }
});

test("même graine, mêmes actions : la mission se rejoue à l'identique", () => {
  const sequence = ["action.poser-saturometre", "action.compter-fr", "action.prendre-tension"];
  const first = play(activeAt("vitals"), ...sequence);
  const second = play(activeAt("vitals"), ...sequence);

  assert.equal(first.simulatedTimeSeconds, second.simulatedTimeSeconds);
  for (const factId of ["fact.spo2", "fact.fc", "fact.fr", "fact.ta"]) {
    assert.deepEqual(readFact(first, factId), readFact(second, factId), factId);
  }
});

test("un sel différent produit un patient différent", () => {
  const first = createV3Session(scenario, { physiologySalt: 1 });
  const second = createV3Session(scenario, { physiologySalt: 2 });
  const differs = [0, 60, 120, 300, 600].some(
    (time) =>
      samplePhysiology(first.physiology, time).spo2 !==
        samplePhysiology(second.physiology, time).spo2 ||
      samplePhysiology(first.physiology, time).hr !== samplePhysiology(second.physiology, time).hr,
  );
  assert.ok(differs, "deux sels devraient donner deux tracés");
});

test("le moteur physiologique n'utilise aucun aléa non maîtrisé", () => {
  const directory = path.resolve(import.meta.dirname, "../physiology");
  for (const name of readdirSync(directory)) {
    if (!name.endsWith(".ts")) continue;
    // Les commentaires sont retirés avant l'examen : ce module **explique**
    // pourquoi il n'emploie pas `Math.random`, et une garde qui lirait sa propre
    // documentation se déclencherait sur l'explication plutôt que sur la faute.
    const source = strippedCode(readFileSync(path.join(directory, name), "utf8"));
    assert.equal(
      /Math\s*\.\s*random/u.test(source),
      false,
      `${name} appelle Math.random : le rejeu et les tests deviennent impossibles`,
    );
    assert.equal(/Date\s*\.\s*now/u.test(source), false, `${name} lit l'horloge réelle`);
  }
});

/* -------------------------------------------------------------------------- */
/* 7. Étanchéité                                                              */
/* -------------------------------------------------------------------------- */

test("la physiologie ne figure pas dans la vue de session", () => {
  assert.equal(
    (SESSION_VIEW_FIELDS as readonly string[]).includes("physiology"),
    false,
    "la physiologie permettrait de calculer toutes les constantes sans les mesurer",
  );
  const view = toSessionView(createV3Session(scenario));
  assert.equal("physiology" in view, false);
  assert.equal("vitals" in view, false);
});

/** Fichiers d'interface : composants React et modèles d'écran. */
function interfaceSources(): Array<{ file: string; source: string }> {
  const roots = [
    path.resolve(import.meta.dirname, "../ui"),
    path.resolve(import.meta.dirname, "../../../components/intervention-v3"),
  ];
  const found: Array<{ file: string; source: string }> = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (/\.tsx?$/u.test(entry.name)) {
        found.push({
          file: path.relative(path.resolve(import.meta.dirname, "../../.."), child),
          source: readFileSync(child, "utf8"),
        });
      }
    }
  };
  for (const root of roots) walk(root);
  return found;
}

/**
 * Retire les commentaires.
 *
 * Un module qui **explique** pourquoi il n'appelle pas `Math.random` nomme
 * forcément `Math.random`. Sans ce nettoyage, la garde se déclencherait sur sa
 * propre documentation et pousserait à retirer l'explication plutôt que la faute.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, " ").replace(/\/\/[^\n]*/gu, " ");
}

/**
 * Retire aussi les chaînes.
 *
 * Réservé aux gardes qui cherchent un **accès** — `session.physiology`. Une garde
 * qui cherche un **import** ne doit surtout pas passer par ici : le chemin du
 * module est une chaîne, et l'effacer rendrait la garde aveugle exactement à ce
 * qu'elle surveille. C'est l'erreur que la vérification par injection a révélée.
 */
function strippedCode(source: string): string {
  return withoutComments(source)
    .replace(/"(?:[^"\\]|\\.)*"/gu, '""')
    .replace(/'(?:[^'\\]|\\.)*'/gu, "''");
}

test("aucun écran n'importe le moteur physiologique", () => {
  const offenders = interfaceSources()
    .filter(({ source }) =>
      // `withoutComments` et non `strippedCode` : le chemin d'un import **est**
      // une chaîne. L'effacer rendrait cette garde aveugle à ce qu'elle
      // surveille — c'est exactement ce qu'une vérification par injection a
      // révélé ici, la garde passait sur un import volontairement fautif.
      /from\s+["'][^"']*physiology\/(physiology-engine|physiology-selectors|clinical-profiles|vital-trends|vital-noise)/u.test(
        withoutComments(source),
      ),
    )
    .map(({ file }) => file);
  assert.deepEqual(
    offenders,
    [],
    "un écran qui importe le moteur peut échantillonner une constante que personne n'a mesurée",
  );
});

test("aucun écran ne lit la physiologie ni les constantes réelles d'une session", () => {
  const offenders = interfaceSources()
    .filter(({ source }) => {
      const code = strippedCode(source);
      return /\bsession\s*\.\s*(physiology|vitals|vitalsHistory|patientState|roscAchieved)\b/u.test(
        code,
      );
    })
    .map(({ file }) => file);
  assert.deepEqual(offenders, []);
});

test("les vues rendues à l'interface ne portent aucune donnée cachée", () => {
  const session = play(activeAt("vitals"), "action.poser-saturometre");
  const at = session.simulatedTimeSeconds;
  const payload = JSON.stringify({
    live: getVisibleLiveVitals(session, at),
    monitoring: getVisibleMonitoringState(session, at),
    waveform: getVisibleWaveformState(session, at),
    stale: getVisibleStaleVitals(session, at),
  });

  for (const forbidden of [
    "baselineSpO2",
    "clinicalStability",
    "oxygenIndicated",
    "seed",
    "events",
    "profile",
  ]) {
    assert.equal(
      payload.includes(forbidden),
      false,
      `${forbidden} ne doit pas voyager jusqu'à l'interface`,
    );
  }
});

test("les sélecteurs ne rendent que des constantes réellement mesurées", () => {
  // Le patient a une glycémie, une température et une tension dans le moteur.
  // Aucune ne doit apparaître tant que le joueur ne les a pas prises.
  const session = play(activeAt("vitals"), "action.poser-saturometre");
  const at = session.simulatedTimeSeconds;
  const exposed = new Set(getVisibleLiveVitals(session, at).map((entry) => entry.signal));
  for (const signal of ["sbp", "dbp", "glycemia", "temperature", "gcs", "pain", "rr"] as const) {
    assert.equal(exposed.has(signal), false, `${signal} exposée sans mesure`);
  }
});

/* -------------------------------------------------------------------------- */
/* L'écran des constantes                                                     */
/* -------------------------------------------------------------------------- */

test("sans instantané, l'écran reste juste : aucune carte en direct", () => {
  const session = play(activeAt("vitals"), "action.poser-saturometre");
  const model = vitalsScreenModel(toSessionView(session));
  assert.equal(
    model.vitals.some((card) => card.isLive),
    false,
  );
  assert.equal(model.monitoring.waveform, null);
  assert.equal(model.monitoring.statusLabel, "Saturomètre non posé");
});

test("avec l'instantané, la carte affiche la valeur du moniteur", () => {
  const session = play(activeAt("vitals"), "action.poser-saturometre");
  const at = session.simulatedTimeSeconds + 120;
  const model = vitalsScreenModel(toSessionView(session), monitoringSnapshot(session, at));

  const spo2 = model.vitals.find((card) => card.factId === "fact.spo2");
  assert.ok(spo2);
  assert.equal(spo2.isLive, true);
  assert.equal(spo2.measured, true);
  assert.equal(spo2.signalQuality, "good");
  // La valeur suit le moniteur, pas le relevé initial : c'est ce qu'un soignant
  // lit en levant les yeux deux minutes plus tard.
  assert.equal(spo2.value, String(samplePhysiology(session.physiology, at).spo2));
  assert.ok(model.monitoring.waveform!.pulse.points.length > 0);
});

test("la tension reste un instantané même sous surveillance", () => {
  const session = play(activeAt("vitals"), "action.poser-saturometre", "action.prendre-tension");
  const at = session.simulatedTimeSeconds + 60;
  const model = vitalsScreenModel(toSessionView(session), monitoringSnapshot(session, at));
  const tension = model.vitals.find((card) => card.factId === "fact.ta");
  assert.ok(tension);
  assert.equal(tension.measured, true);
  assert.equal(tension.isLive, false);
});

test("une carte non mesurée ne porte ni valeur, ni tracé, ni qualité de signal", () => {
  const session = play(activeAt("vitals"), "action.poser-saturometre");
  const at = session.simulatedTimeSeconds;
  const model = vitalsScreenModel(toSessionView(session), monitoringSnapshot(session, at));
  for (const card of model.vitals.filter((entry) => !entry.measured)) {
    assert.equal(card.numericValue, null, card.factId);
    assert.equal(card.signalQuality, null, card.factId);
    assert.equal(card.isLive, false, card.factId);
    // Le gabarit ne contient jamais de chiffre : c'est l'invariant du registre,
    // et c'est lui qui garde la grille vierge muette.
    assert.equal(/[0-9]/u.test(card.value), false, `${card.factId} : « ${card.value} »`);
  }
});

test("chaque constante chiffrée porte sa plage de référence", () => {
  const model = vitalsScreenModel(toSessionView(activeAt("vitals")));
  for (const card of model.vitals) {
    assert.ok(
      card.referenceRange,
      `${card.factId} n'a pas de plage de référence : le chiffre relevé restera sans repère`,
    );
  }
});

test("une plage de référence ne contient jamais la valeur du patient", () => {
  // La plage est une connaissance de formation. Si elle était dérivée du patient,
  // elle le décrirait — et l'afficherait avant toute mesure.
  const first = createV3Session(scenario, { physiologySalt: 1 });
  const second = createV3Session(scenario, { physiologySalt: 2 });
  const rangesOf = (session: InterventionSession) =>
    vitalsScreenModel(toSessionView(session)).vitals.map((card) => card.referenceRange);
  assert.deepEqual(rangesOf(first), rangesOf(second));
});

test("retirer le capteur éteint le direct dans le modèle d'écran", () => {
  const session = play(
    activeAt("vitals"),
    "action.poser-saturometre",
    "action.retirer-saturometre",
  );
  const at = session.simulatedTimeSeconds;
  const model = vitalsScreenModel(toSessionView(session), monitoringSnapshot(session, at));

  assert.equal(model.monitoring.anyLive, false);
  assert.equal(model.monitoring.statusLabel, "Saturomètre non posé");
  assert.deepEqual(model.monitoring.waveform!.pulse.points, []);

  // La dernière mesure demeure : ce que le joueur a gagné ne lui est pas repris.
  const spo2 = model.vitals.find((card) => card.factId === "fact.spo2");
  assert.equal(spo2?.measured, true);
  assert.equal(spo2?.isLive, false);
});

/* -------------------------------------------------------------------------- */
/* Profils                                                                    */
/* -------------------------------------------------------------------------- */

test("le scénario pilote est branché sur le profil du traumatisme crânien", () => {
  const profile = profileFromScenario(scenario.id, scenario.clinical);
  assert.equal(profile.id, "v3_trauma_cranien_chute_n104");
  // Le point pédagogique du cas : des constantes normales sur un patient à risque.
  assert.equal(profile.baselineSpO2, 98);
  assert.equal(profile.glasgow, 13);
  assert.equal(profile.trend, "stable");
  assert.equal(profile.oxygenIndicated, false);
});

test("un scénario sans profil déclaré ne se voit jamais inventer une gravité", () => {
  const derived = profileFromScenario("scenario-inconnu", scenario.clinical);
  assert.equal(derived.trend, "stable");
  assert.equal(derived.baselineHeartRate, scenario.clinical.baseline.hr);
});
