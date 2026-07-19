import type { PedagogicalSpecification } from "./pedagogical-specification-domain.ts";
import { parsePedagogicalSpecification } from "./pedagogical-specification-schema.ts";
import { mergePedagogicalSpecifications } from "./pedagogical-specification-merge.ts";

export function specificationContentIds(specification: PedagogicalSpecification): string[] {
  return [
    ...specification.flashcards.items.map((item) => item.id),
    ...specification.exercises.mcq.map((item) => item.id),
    ...specification.exercises.trueFalse.map((item) => item.id),
    ...specification.exercises.associations.map((item) => item.id),
    ...specification.exercises.dragAndDrop.map((item) => item.id),
    ...specification.exercises.clinicalCases.map((item) => item.id),
    ...specification.exercises.traps.map((item) => item.id),
  ];
}

export class PedagogicalSpecificationCatalog {
  private readonly byLessonId: ReadonlyMap<string, PedagogicalSpecification>;

  constructor(inputs: unknown[]) {
    const specifications = inputs.map(parsePedagogicalSpecification);
    const grouped = new Map<string, PedagogicalSpecification[]>();
    for (const specification of specifications) {
      const versions = grouped.get(specification.lesson) ?? [];
      versions.push(specification);
      grouped.set(specification.lesson, versions);
    }
    this.byLessonId = new Map(
      [...grouped.entries()].map(([lessonId, versions]) => {
        const ordered = versions.sort(
          (left, right) => left.contentRevision - right.contentRevision,
        );
        const merged = ordered
          .slice(1)
          .reduce(
            (current, addition) => mergePedagogicalSpecifications(current, addition),
            ordered[0]!,
          );
        return [lessonId, merged];
      }),
    );
  }

  get(lessonId: string): PedagogicalSpecification {
    const specification = this.byLessonId.get(lessonId);
    if (!specification) throw new Error(`Spécification inconnue : ${lessonId}`);
    return specification;
  }

  has(lessonId: string): boolean {
    return this.byLessonId.has(lessonId);
  }
}
