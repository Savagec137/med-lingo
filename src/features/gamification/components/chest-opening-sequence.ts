export type ChestOpeningPhase = "rest" | "preopening" | "unlocking" | "opening" | "rewards";

export const CHEST_OPENING_TIMING = {
  preopening: 450,
  unlocking: 300,
  opening: 650,
  rewardDelay: 120,
  rewardDuration: 420,
  continueDelay: 500,
} as const;

export function canStartChestOpening(phase: ChestOpeningPhase, hasStarted: boolean) {
  return phase === "rest" && !hasStarted;
}

export function getRewardsRevealDuration(rewardCount: number) {
  return Math.max(0, rewardCount - 1) * CHEST_OPENING_TIMING.rewardDelay + CHEST_OPENING_TIMING.rewardDuration;
}

export function getContinueDelay(rewardCount: number) {
  return getRewardsRevealDuration(rewardCount) + CHEST_OPENING_TIMING.continueDelay;
}
