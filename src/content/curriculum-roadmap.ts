import type {
  FormationDefinition,
  FormationLessonReference,
  ParcoursDefinition,
} from "./learning-domain.ts";

export interface OfficialRoadmapParcoursDefinition extends Omit<ParcoursDefinition, "lessons"> {
  blocOrder: number;
  blocTitle: string;
  plannedLessonCount: number;
  publishedLessonCount: number;
  publishedLessons: FormationLessonReference[];
}

export interface OfficialRoadmapBlocDefinition {
  id: string;
  order: number;
  title: string;
  parcours: OfficialRoadmapParcoursDefinition[];
}

export function buildOfficialRoadmap(
  formation: FormationDefinition,
): OfficialRoadmapBlocDefinition[] {
  const blocs = [...(formation.blocs ?? [])].sort((left, right) => left.order - right.order);
  const parcours = [...formation.parcours].sort((left, right) => left.order - right.order);

  return blocs.map((bloc) => ({
    ...bloc,
    parcours: parcours
      .filter((item) => item.blocId === bloc.id)
      .map((item) => {
        const publishedLessons = item.lessons.filter(
          (lesson) => lesson.status === "published" || lesson.status === "review",
        );
        return {
          ...item,
          blocOrder: bloc.order,
          blocTitle: bloc.title,
          plannedLessonCount: item.lessons.filter((lesson) => lesson.kind !== "boss").length,
          publishedLessonCount: publishedLessons.filter((lesson) => lesson.kind !== "boss").length,
          publishedLessons,
        };
      }),
  }));
}
