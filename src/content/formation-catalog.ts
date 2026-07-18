import type {
  FormationDefinition,
  FormationLessonReference,
  ParcoursDefinition,
} from "./learning-domain.ts";
import { parseFormationDefinition } from "./learning-schema.ts";

export class FormationCatalog {
  private readonly formations: ReadonlyMap<string, FormationDefinition>;
  private readonly lessons: ReadonlyMap<
    string,
    {
      formation: FormationDefinition;
      parcours: ParcoursDefinition;
      lesson: FormationLessonReference;
    }
  >;

  constructor(inputs: unknown[]) {
    const parsed = inputs.map(parseFormationDefinition);
    if (new Set(parsed.map((formation) => formation.id)).size !== parsed.length) {
      throw new Error("Les identifiants de formation doivent être uniques.");
    }

    this.formations = new Map(parsed.map((formation) => [formation.id, formation]));
    const lessons = new Map<
      string,
      {
        formation: FormationDefinition;
        parcours: ParcoursDefinition;
        lesson: FormationLessonReference;
      }
    >();
    for (const formation of parsed) {
      for (const parcours of formation.parcours) {
        for (const lesson of parcours.lessons) {
          const key = `${formation.id}:${lesson.id}`;
          if (lessons.has(key)) throw new Error(`Leçon dupliquée : ${key}`);
          lessons.set(key, { formation, parcours, lesson });
        }
      }
    }
    this.lessons = lessons;
  }

  getFormation(id: string): FormationDefinition {
    const formation = this.formations.get(id);
    if (!formation) throw new Error(`Formation introuvable : ${id}`);
    return formation;
  }

  getParcours(formationId: string, parcoursId: string): ParcoursDefinition {
    const parcours = this.getFormation(formationId).parcours.find((item) => item.id === parcoursId);
    if (!parcours) throw new Error(`Parcours introuvable : ${formationId}/${parcoursId}`);
    return parcours;
  }

  findLesson(formationId: string, lessonId: string) {
    return this.lessons.get(`${formationId}:${lessonId}`) ?? null;
  }
}
