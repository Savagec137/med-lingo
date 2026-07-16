import assert from "node:assert/strict";
import test from "node:test";
import {
  CHEST_OPENING_TIMING,
  canStartChestOpening,
  getContinueDelay,
} from "./chest-opening-sequence.ts";

test("a chest opening sequence can only start once", () => {
  assert.equal(canStartChestOpening("rest", false), true);
  assert.equal(canStartChestOpening("rest", true), false);
  assert.equal(canStartChestOpening("preopening", false), false);
  assert.equal(canStartChestOpening("opening", false), false);
});

test("continue waits for every reward reveal and its own delay", () => {
  const expected =
    CHEST_OPENING_TIMING.rewardDuration +
    CHEST_OPENING_TIMING.rewardDelay * 2 +
    CHEST_OPENING_TIMING.continueDelay;

  assert.equal(getContinueDelay(3), expected);
});
