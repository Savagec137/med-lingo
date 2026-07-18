import assert from "node:assert/strict";
import test from "node:test";
import type { InterventionScenario } from "./intervention-domain.ts";
import {
  acceptInterventionMission,
  calculateMissionResult,
  continueIntervention,
  createInterventionSession,
  getMissionState,
  mergeMissionProgress,
  selectInterventionChoice,
} from "./intervention-engine.ts";

const scenario: InterventionScenario = {
  id: "test-mission",
  specialty: "Test",
  title: "Mission test",
  summary: "Validation du moteur",
  difficulty: "initiation",
  estimatedMinutes: 4,
  baseXp: 100,
  illustration: "cardiac",
  alert: {
    patient: "Patient",
    reason: "Test",
    priority: "Absolue",
    distance: "1 km",
    location: "Rue test",
    time: "08:00",
    dispatchNote: "Test",
  },
  reward: {
    coins: 20,
    chest: "Coffre test",
    chestMinimumScore: 50,
    badge: "Badge test",
    badgeMinimumScore: 70,
  },
  startingPatient: 60,
  pulseAdvice: ["Conseil test"],
  steps: [
    {
      id: "arrival-first",
      phase: "arrival",
      eyebrow: "Test",
      title: "Première décision",
      narrative: "Narration",
      objective: "Choisir",
      patient: { label: "Stable", detail: "Test", tone: "stable", vitals: [] },
      choices: [
        {
          id: "safe",
          label: "Bonne réponse",
          detail: "Test",
          feedback: "Correct",
          recommended: true,
          nextStepId: "safety-second",
          effect: { score: 30, patient: 10, timeSeconds: 5, xpBonus: 5 },
        },
        {
          id: "unsafe",
          label: "Mauvaise réponse",
          detail: "Test",
          feedback: "Incorrect",
          recommended: false,
          effect: { score: -10, patient: -20, timeSeconds: 20, isError: true },
        },
      ],
    },
    {
      id: "safety-second",
      phase: "safety",
      eyebrow: "Test",
      title: "Fin",
      narrative: "Narration",
      objective: "Terminer",
      patient: { label: "Stable", detail: "Test", tone: "stable", vitals: [] },
      choices: [
        {
          id: "finish",
          label: "Terminer",
          detail: "Test",
          feedback: "Terminé",
          recommended: true,
          effect: { score: 10, patient: 0, timeSeconds: 5 },
        },
      ],
    },
  ],
};

test("une décision ne peut être appliquée qu'une fois avant de continuer", () => {
  const active = acceptInterventionMission(createInterventionSession(scenario));
  const selected = selectInterventionChoice(scenario, active, "safe");
  const duplicate = selectInterventionChoice(scenario, selected, "safe");
  assert.strictEqual(duplicate, selected);
  assert.equal(selected.history.length, 1);
  assert.equal(selected.score, 75);
});

test("le moteur suit l'embranchement puis termine en débriefing", () => {
  const active = acceptInterventionMission(createInterventionSession(scenario));
  const first = continueIntervention(scenario, selectInterventionChoice(scenario, active, "safe"));
  assert.equal(first.currentStepId, "safety-second");
  const finished = continueIntervention(
    scenario,
    selectInterventionChoice(scenario, first, "finish"),
  );
  assert.equal(finished.status, "debrief");
  assert.equal(finished.history.length, 2);
});

test("le résultat et la progression restent déterministes", () => {
  const active = acceptInterventionMission(createInterventionSession(scenario));
  const first = continueIntervention(scenario, selectInterventionChoice(scenario, active, "safe"));
  const finished = continueIntervention(
    scenario,
    selectInterventionChoice(scenario, first, "finish"),
  );
  const result = calculateMissionResult(scenario, finished, 10);
  assert.equal(result.grade, "A");
  assert.equal(result.badge, "Badge test");
  assert.equal(result.chest, "Coffre test");
  assert.equal(result.elapsedSeconds, 20);
  const progress = mergeMissionProgress(undefined, result);
  assert.equal(progress.attempts, 1);
  assert.equal(progress.bestScore, 85);
});

test("une mission dépendante reste verrouillée jusqu'à la réussite requise", () => {
  const locked = { ...scenario, id: "mission-2", unlockAfter: scenario.id };
  assert.equal(getMissionState(locked, {}), "locked");
  assert.equal(
    getMissionState(locked, {
      [scenario.id]: {
        attempts: 1,
        completed: true,
        bestScore: 70,
        bestGrade: "B",
        bestTimeSeconds: 90,
      },
    }),
    "new",
  );
});
