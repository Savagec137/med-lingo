import { FORMATION_CATALOG } from "./formation-registry";
import { LessonContentRepository, type LessonContentLoader } from "./lesson-content-repository";

const modules = import.meta.glob("./formations/*/parcours-*/lesson-*.json", {
  import: "default",
});

const loaders = Object.fromEntries(
  Object.entries(modules).map(([path, loader]) => [
    path.replace("./formations/", ""),
    loader as LessonContentLoader,
  ]),
);

export const LESSON_CONTENT_REPOSITORY = new LessonContentRepository(FORMATION_CATALOG, loaders);

export function loadPedagogicalLessonV2(formationId: string, lessonId: string) {
  return LESSON_CONTENT_REPOSITORY.load(formationId, lessonId);
}
