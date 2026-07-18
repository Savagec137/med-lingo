import { DEA_FORMATION } from "./formation-registry";
import type { Parcours } from "@/lib/curriculum";

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

export const DATA_DRIVEN_PARCOURS: Parcours[] = DEA_FORMATION.parcours.flatMap((parcours) => {
  const publishedLessons = parcours.lessons.filter((lesson) => lesson.status === "published");
  if (publishedLessons.length === 0) return [];

  return [
    {
      id: parcours.id,
      title: parcours.title,
      subtitle: parcours.subtitle,
      color: THEME_COLOR[parcours.theme] ?? "primary",
      icon: parcours.id,
      lessons: publishedLessons.map((lesson) => ({
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
    },
  ];
});
