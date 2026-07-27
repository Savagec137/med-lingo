import { DEA_FORMATION } from "./formation-registry";
import type { Parcours } from "@/lib/curriculum";
import { buildOfficialRoadmap } from "./curriculum-roadmap";
import { getRoadmapParcours } from "./roadmap-registry";

const THEME_COLOR: Record<string, string> = {
  green: "success",
  blue: "primary",
  purple: "accent",
  orange: "warning",
  red: "destructive",
  yellow: "warning",
  teal: "success",
  cyan: "primary",
  pink: "accent",
  indigo: "primary",
  slate: "secondary",
};

export interface OfficialRoadmapParcours extends Parcours {
  order: number;
  blocId: string;
  plannedLessonCount: number;
  publishedLessonCount: number;
}

export interface OfficialRoadmapBloc {
  id: string;
  order: number;
  title: string;
  parcours: OfficialRoadmapParcours[];
}

const roadmap = buildOfficialRoadmap(DEA_FORMATION);

export const OFFICIAL_ROADMAP_BLOCS: OfficialRoadmapBloc[] = roadmap.map((bloc) => ({
  id: bloc.id,
  order: bloc.order,
  title: bloc.title,
  parcours: bloc.parcours.map((parcours) => ({
    id: parcours.id,
    title: parcours.title,
    subtitle: parcours.subtitle,
    color: THEME_COLOR[parcours.theme] ?? "primary",
    icon: parcours.id,
    order: parcours.order,
    blocId: bloc.id,
    plannedLessonCount:
      getRoadmapParcours(parcours.id)?.plannedLessonCount ?? parcours.plannedLessonCount,
    publishedLessonCount: parcours.publishedLessonCount,
    lessons: parcours.publishedLessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      emoji: lesson.kind,
      kind: lesson.kind,
      questions: [],
      formationId: DEA_FORMATION.id,
      parcoursId: parcours.id,
      contentLessonId: lesson.id,
      contentFile: lesson.file,
    })),
  })),
}));

export const OFFICIAL_ROADMAP_PARCOURS = OFFICIAL_ROADMAP_BLOCS.flatMap((bloc) => bloc.parcours);

export const DATA_DRIVEN_PARCOURS: Parcours[] = OFFICIAL_ROADMAP_PARCOURS.filter(
  (parcours) => parcours.publishedLessonCount > 0,
);
