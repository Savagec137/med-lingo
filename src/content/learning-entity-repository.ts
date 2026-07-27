import type { LearningEntityBundle } from "./learning-activity-domain.ts";
import { parseLearningEntityBundle } from "./learning-activity-schema.ts";

export type LearningBundleLoader = () => Promise<unknown>;

export class LearningEntityRepository {
  private readonly cache = new Map<string, Promise<LearningEntityBundle>>();

  constructor(private readonly loaders: Readonly<Record<string, LearningBundleLoader>>) {}

  load(file: string) {
    const existing = this.cache.get(file);
    if (existing) return existing;
    const loader = this.loaders[file];
    if (!loader) return Promise.reject(new Error(`Bundle pédagogique introuvable : ${file}`));
    const pending = loader().then(parseLearningEntityBundle);
    this.cache.set(file, pending);
    return pending;
  }

  clear(file?: string) {
    if (file) this.cache.delete(file);
    else this.cache.clear();
  }
}

const modules = import.meta.glob("./formations/*/entities/**/*.json", {
  import: "default",
});

export const LEARNING_ENTITY_REPOSITORY = new LearningEntityRepository(
  Object.fromEntries(
    Object.entries(modules).map(([file, loader]) => [
      file.replace("./formations/", ""),
      loader as LearningBundleLoader,
    ]),
  ),
);
