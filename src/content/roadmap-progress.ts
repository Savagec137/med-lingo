import type { Progress } from "@/lib/use-progress";
import type { RoadmapBlock, RoadmapParcours } from "./roadmap-domain.ts";
import { OFFICIAL_ROADMAP } from "./roadmap-registry.ts";

export interface EntityProgress {
  completed: number;
  total: number;
  percentage: number;
}

function percentage(completed: number, total: number) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export function getParcoursProgress(
  parcours: RoadmapParcours,
  progress: Pick<Progress, "completedLessons">,
): EntityProgress {
  const entryIds = [...parcours.lessonBlueprints.map((lesson) => lesson.id), parcours.bossId];
  const completed = entryIds.filter((id) => Boolean(progress.completedLessons[id])).length;
  return {
    completed,
    total: entryIds.length,
    percentage: percentage(completed, entryIds.length),
  };
}

export function getBlockProgress(
  block: RoadmapBlock,
  progress: Pick<Progress, "completedLessons">,
): EntityProgress {
  const parcours = OFFICIAL_ROADMAP.parcours.filter((item) => item.blocId === block.id);
  const totals = parcours.map((item) => getParcoursProgress(item, progress));
  const completed = totals.reduce((sum, item) => sum + item.completed, 0);
  const total = totals.reduce((sum, item) => sum + item.total, 0);
  return { completed, total, percentage: percentage(completed, total) };
}

export function getGlobalRoadmapProgress(
  progress: Pick<Progress, "completedLessons">,
): EntityProgress {
  const totals = OFFICIAL_ROADMAP.parcours.map((item) => getParcoursProgress(item, progress));
  const completed = totals.reduce((sum, item) => sum + item.completed, 0);
  const total = totals.reduce((sum, item) => sum + item.total, 0);
  return { completed, total, percentage: percentage(completed, total) };
}

export function isParcoursUnlocked(
  parcours: RoadmapParcours,
  progress: Pick<Progress, "completedLessons">,
) {
  if (parcours.order === 1) return true;
  return parcours.prerequisiteIds.every((id) => Boolean(progress.completedLessons[id]));
}
