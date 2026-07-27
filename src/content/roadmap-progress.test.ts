import assert from "node:assert/strict";
import test from "node:test";

import {
  getBlockProgress,
  getGlobalRoadmapProgress,
  getParcoursProgress,
  isParcoursUnlocked,
} from "./roadmap-progress.ts";
import { OFFICIAL_ROADMAP } from "./roadmap-registry.ts";

const first = OFFICIAL_ROADMAP.parcours[0]!;
const second = OFFICIAL_ROADMAP.parcours[1]!;
const firstBlock = OFFICIAL_ROADMAP.blocks[0]!;

test("le premier parcours est ouvert et le suivant dépend du Boss précédent", () => {
  assert.equal(isParcoursUnlocked(first, { completedLessons: {} }), true);
  assert.equal(isParcoursUnlocked(second, { completedLessons: {} }), false);
  assert.equal(
    isParcoursUnlocked(second, {
      completedLessons: {
        [first.bossId]: { stars: 2, bestScore: 0.8 },
      },
    }),
    true,
  );
});

test("la progression se calcule au niveau parcours, bloc et formation", () => {
  const completedLessons = {
    [first.lessonBlueprints[0]!.id]: { stars: 3, bestScore: 1 },
    [first.bossId]: { stars: 2, bestScore: 0.8 },
  };
  const pathProgress = getParcoursProgress(first, { completedLessons });
  const blockProgress = getBlockProgress(firstBlock, { completedLessons });
  const globalProgress = getGlobalRoadmapProgress({ completedLessons });

  assert.equal(pathProgress.completed, 2);
  assert.equal(pathProgress.total, first.plannedLessonCount + 1);
  assert.ok(pathProgress.percentage > blockProgress.percentage);
  assert.ok(blockProgress.percentage >= globalProgress.percentage);
});
