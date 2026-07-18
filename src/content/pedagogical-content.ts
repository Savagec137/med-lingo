import { z } from "zod";
import lessonContent from "./banks/b1-u1-l1-content.json" with { type: "json" };
import lessonManifest from "./banks/pedagogical-lessons.json" with { type: "json" };
import { createContentCatalog } from "./content-engine.ts";
import type { ContentItem } from "./content-domain.ts";

const pedagogicalLessonSchema = z.object({
  id: z.string().trim().min(1),
  unitId: z.string().trim().min(1),
  unitTitle: z.string().trim().min(1),
  unitSubtitle: z.string().trim().min(1),
  title: z.string().trim().min(1),
  pulse: z.string().trim().min(1).max(240),
  estimatedMinutes: z.number().int().min(2).max(3),
  sourceDocument: z.string().trim().min(1),
  sourcePages: z.array(z.number().int().positive()).min(1),
  interactionIds: z.array(z.string().trim().min(1)).min(1),
});

const pedagogicalLessonBankSchema = z
  .object({
    schemaVersion: z.literal(1),
    lessons: z.array(pedagogicalLessonSchema).min(1),
  })
  .superRefine((bank, context) => {
    const ids = bank.lessons.map((lesson) => lesson.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lessons"],
        message: "Les identifiants de leçon doivent être uniques.",
      });
    }
    for (const [index, lesson] of bank.lessons.entries()) {
      if (new Set(lesson.interactionIds).size !== lesson.interactionIds.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lessons", index, "interactionIds"],
          message: "Une interaction ne peut apparaître qu'une fois dans une leçon.",
        });
      }
    }
  });

export const PEDAGOGICAL_CONTENT_CATALOG = createContentCatalog(lessonContent);
const parsedManifest = pedagogicalLessonBankSchema.parse(lessonManifest);

export type PedagogicalLessonDefinition = (typeof parsedManifest.lessons)[number];
export interface PedagogicalLesson extends PedagogicalLessonDefinition {
  interactions: ContentItem[];
}

const lessons = new Map<string, PedagogicalLesson>();

for (const definition of parsedManifest.lessons) {
  const interactions = definition.interactionIds.map((interactionId) => {
    const item = PEDAGOGICAL_CONTENT_CATALOG.get(interactionId);
    if (item.metadata?.lessonId !== definition.id) {
      throw new Error(`L'interaction ${item.id} n'appartient pas à la leçon ${definition.id}.`);
    }
    return item;
  });
  lessons.set(definition.id, { ...definition, interactions });
}

export function getPedagogicalLesson(id: string): PedagogicalLesson | null {
  return lessons.get(id) ?? null;
}

export function requirePedagogicalLesson(id: string): PedagogicalLesson {
  const lesson = getPedagogicalLesson(id);
  if (!lesson) throw new Error(`Leçon pédagogique introuvable : ${id}`);
  return lesson;
}

export function isMatchingAssociation(item: ContentItem) {
  return item.type === "association" && item.metadata?.associationMode === "matching";
}
