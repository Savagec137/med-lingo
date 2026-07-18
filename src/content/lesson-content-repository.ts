import { createContentCatalog } from "./content-engine.ts";
import type { FormationCatalog } from "./formation-catalog.ts";
import type { LoadedLessonContent } from "./learning-domain.ts";
import { normalizeLearningItem, parseLessonContentFile } from "./learning-schema.ts";

export type LessonContentLoader = () => Promise<unknown>;

export type LoadedPedagogicalLesson = LoadedLessonContent;

export class LessonContentRepository {
  private readonly cache = new Map<string, Promise<LoadedPedagogicalLesson>>();
  private readonly formations: FormationCatalog;
  private readonly loaders: Readonly<Record<string, LessonContentLoader>>;

  constructor(
    formations: FormationCatalog,
    loaders: Readonly<Record<string, LessonContentLoader>>,
  ) {
    this.formations = formations;
    this.loaders = loaders;
  }

  load(formationId: string, lessonId: string): Promise<LoadedPedagogicalLesson> {
    const reference = this.formations.findLesson(formationId, lessonId);
    if (!reference) return Promise.reject(new Error(`Leçon inconnue : ${formationId}/${lessonId}`));
    if (reference.lesson.status !== "published") {
      return Promise.reject(new Error(`La leçon ${lessonId} n'est pas encore publiée.`));
    }

    const key = `${formationId}/${reference.lesson.file}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const loader = this.loaders[key];
    if (!loader) return Promise.reject(new Error(`Fichier de contenu introuvable : ${key}`));

    const pending = loader().then((input) => {
      const definition = parseLessonContentFile(input);
      if (
        definition.formation !== formationId ||
        definition.parcours !== reference.parcours.id ||
        definition.id !== lessonId ||
        definition.title !== reference.lesson.title ||
        definition.kind !== reference.lesson.kind ||
        definition.status !== reference.lesson.status
      ) {
        throw new Error(`Le manifeste et le fichier ${key} ne correspondent pas.`);
      }
      const interactions = definition.items.map((item) => normalizeLearningItem(definition, item));
      createContentCatalog({ schemaVersion: 1, items: interactions });
      return { ...definition, interactions };
    });

    this.cache.set(key, pending);
    pending.catch(() => this.cache.delete(key));
    return pending;
  }
}
