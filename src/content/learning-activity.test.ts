import assert from "node:assert/strict";
import test from "node:test";

import { EXTENSIBLE_EXERCISE_TYPES } from "./learning-activity-domain.ts";
import { parseLearningEntityBundle } from "./learning-activity-schema.ts";

function createBundle() {
  const exercises = EXTENSIBLE_EXERCISE_TYPES.map((type, index) => ({
    id: `exercise-${index + 1}`,
    lessonId: "dea-p03-l01",
    type,
    instruction: `Consigne ${index + 1}`,
    questionIds: [`question-${index + 1}`],
    configuration: {},
  }));
  return {
    schemaVersion: 1 as const,
    lesson: {
      id: "dea-p03-l01",
      parcoursId: "parcours-03",
      order: 1,
      title: "Leçon de validation",
      status: "published" as const,
      contentSections: [],
      illustrationIds: [],
      exerciseIds: exercises.map((exercise) => exercise.id),
      summary: "Résumé de validation.",
      validation: { minimumAccuracy: 0.8, minimumExercises: 8 },
    },
    illustrations: [],
    exercises,
    questions: exercises.map((exercise, index) => ({
      id: `question-${index + 1}`,
      exerciseId: exercise.id,
      competencyIds: ["validation.competence"],
      difficulty: "easy" as const,
      prompt: `Question ${index + 1}`,
      payload: {},
      feedback: "Retour.",
      explanation: "Explication.",
      sourceDocument: "Support DEA de validation",
      sourcePages: [1],
      reviewStatus: "source_verified" as const,
    })),
  };
}

test("le moteur accepte les dix types d'exercices extensibles", () => {
  const bundle = parseLearningEntityBundle(createBundle());
  assert.deepEqual(
    bundle.exercises.map((exercise) => exercise.type),
    [...EXTENSIBLE_EXERCISE_TYPES],
  );
  assert.equal(bundle.questions.length, EXTENSIBLE_EXERCISE_TYPES.length);
});

test("une référence de question orpheline est refusée", () => {
  const bundle = createBundle();
  bundle.exercises[0]!.questionIds = ["question-inconnue"];
  assert.throws(() => parseLearningEntityBundle(bundle));
});

test("une leçon publiée ne peut contenir une question draft", () => {
  const bundle = createBundle();
  (bundle.questions[0] as { reviewStatus: string }).reviewStatus = "draft";
  assert.throws(() => parseLearningEntityBundle(bundle));
});
