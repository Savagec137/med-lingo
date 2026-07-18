export function lessonXpForResult(stars: number, configuredXp?: number) {
  const boundedStars = Math.max(0, Math.min(3, Math.trunc(stars)));
  if (configuredXp === undefined) return 10 + boundedStars * 5;
  return Math.max(0, Math.round(configuredXp * (0.4 + boundedStars * 0.2)));
}
