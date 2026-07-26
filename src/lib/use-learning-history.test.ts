import assert from "node:assert/strict";
import test from "node:test";

import { updateQuestionLearningState } from "./use-learning-history.ts";

test("une réussite avance la répétition espacée et conserve l'historique", () => {
  const firstDate = new Date("2026-07-24T08:00:00.000Z");
  const secondDate = new Date("2026-07-25T08:00:00.000Z");
  const first = updateQuestionLearningState(undefined, true, firstDate);
  const second = updateQuestionLearningState(first, true, secondDate);

  assert.equal(first.srsStage, 0);
  assert.equal(second.srsStage, 1);
  assert.equal(second.attempts, 2);
  assert.equal(second.correctAttempts, 2);
  assert.equal(second.errorCount, 0);
  assert.equal(second.nextReviewAt, "2026-07-28T08:00:00.000Z");
});

test("une erreur est historisée et rapproche la prochaine révision", () => {
  const previous = {
    attempts: 3,
    correctAttempts: 3,
    errorCount: 0,
    srsStage: 2,
    lastAttemptAt: "2026-07-20T08:00:00.000Z",
    nextReviewAt: "2026-07-27T08:00:00.000Z",
  };
  const result = updateQuestionLearningState(previous, false, new Date("2026-07-24T08:00:00.000Z"));

  assert.equal(result.srsStage, 1);
  assert.equal(result.attempts, 4);
  assert.equal(result.correctAttempts, 3);
  assert.equal(result.errorCount, 1);
  assert.equal(result.nextReviewAt, "2026-07-27T08:00:00.000Z");
});
