import roadmapInput from "./formations/dea/roadmap-v2.json" with { type: "json" };
import { parseOfficialRoadmap } from "./roadmap-schema.ts";

export const OFFICIAL_ROADMAP = parseOfficialRoadmap(roadmapInput);

const blocksById = new Map(OFFICIAL_ROADMAP.blocks.map((block) => [block.id, block]));
const parcoursById = new Map(OFFICIAL_ROADMAP.parcours.map((parcours) => [parcours.id, parcours]));
const bossesById = new Map(OFFICIAL_ROADMAP.bosses.map((boss) => [boss.id, boss]));
const lessonsById = new Map(
  OFFICIAL_ROADMAP.parcours.flatMap((parcours) =>
    parcours.lessonBlueprints.map((lesson) => [
      lesson.id,
      {
        ...lesson,
        parcoursId: parcours.id,
      },
    ]),
  ),
);

export function getRoadmapBlock(id: string) {
  return blocksById.get(id) ?? null;
}

export function getRoadmapParcours(id: string) {
  return parcoursById.get(id) ?? null;
}

export function getRoadmapBoss(id: string) {
  return bossesById.get(id) ?? null;
}

export function getLessonBlueprint(id: string) {
  return lessonsById.get(id) ?? null;
}

export function getBlockParcours(blockId: string) {
  return OFFICIAL_ROADMAP.parcours.filter((parcours) => parcours.blocId === blockId);
}

export function getParcoursBlock(parcoursId: string) {
  const parcours = getRoadmapParcours(parcoursId);
  return parcours ? getRoadmapBlock(parcours.blocId) : null;
}
