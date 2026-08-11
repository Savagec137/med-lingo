import type {
  ContentDifficulty,
  ContentItem,
  ContentPedagogicalFeedback,
} from "./content-domain.ts";
import type { LessonContentPool, LessonKind, LessonSelectionPolicy } from "./learning-domain.ts";
import { readPedagogicalFeedback } from "./pedagogical-feedback.ts";

function isMatchingAssociation(item: ContentItem) {
  return item.type === "association" && item.metadata?.associationMode === "matching";
}

export interface PreparedLessonAnswer {
  id: string;
  text: string;
  explanation: string;
  match?: string;
  detail?: string;
  distractorType?: ContentItem["answers"][number]["distractorType"];
}

export interface PreparedLessonInteraction {
  id: string;
  type:
    "choice" | "multiple_choice" | "association" | "ordering" | "fill_blank" | "anatomy_location";
  question: string;
  answers: PreparedLessonAnswer[];
  matchOptions: Array<{ id: string; text: string }>;
  correctAnswerIds: string[];
  requiredSelections: number;
  explanation?: string;
  pedagogicalFeedback: ContentPedagogicalFeedback;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function shuffled<T>(values: T[], random: () => number = Math.random): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

export function prepareContentInteraction(
  item: ContentItem,
  random: () => number = Math.random,
): PreparedLessonInteraction {
  const association = isMatchingAssociation(item);
  const ordering = item.type === "ordering";
  const multipleChoice = item.type === "multiple_choice";
  const fillBlank = item.type === "fill_blank";
  const anatomyLocation = item.type === "anatomy_location";
  const answers = association ? item.answers : shuffled(item.answers, random);
  return {
    id: item.id,
    type: association
      ? "association"
      : ordering
        ? "ordering"
        : multipleChoice
          ? "multiple_choice"
          : fillBlank
            ? "fill_blank"
            : anatomyLocation
              ? "anatomy_location"
              : "choice",
    question: item.question,
    answers: answers.map((answer) => ({
      id: answer.id,
      text: answer.text,
      explanation: answer.explanation,
      match: answer.match,
      detail: answer.detail,
      distractorType: answer.distractorType,
    })),
    matchOptions: association
      ? shuffled(
          item.answers.map((answer) => ({
            id: answer.id,
            text: answer.match ?? "",
          })),
          random,
        )
      : [],
    correctAnswerIds: Array.isArray(item.correctAnswer) ? item.correctAnswer : [item.correctAnswer],
    requiredSelections: fillBlank
      ? 1
      : Array.isArray(item.correctAnswer)
        ? item.correctAnswer.length
        : 1,
    explanation: item.explanation,
    pedagogicalFeedback: readPedagogicalFeedback(item),
  };
}

export function selectContentItems(
  items: ContentItem[],
  policy: LessonSelectionPolicy,
  random: () => number = Math.random,
) {
  if (policy.strategy === "all") return [...items];
  const count = Math.min(policy.count ?? items.length, items.length);
  return shuffled(items, random).slice(0, count);
}

const DIFFICULTY_ORDER: Record<ContentDifficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};

export interface LessonDifficultyContext {
  lessonOrder: number;
  kind: LessonKind;
}

function difficultyDistribution(context: LessonDifficultyContext) {
  if (context.kind !== "lesson") return null;
  if (context.lessonOrder <= 1) return { easy: 1, medium: 0, hard: 0, expert: 0 };
  if (context.lessonOrder <= 2) return { easy: 0.8, medium: 0.2, hard: 0, expert: 0 };
  if (context.lessonOrder <= 5) return { easy: 0.65, medium: 0.35, hard: 0, expert: 0 };
  return { easy: 0.5, medium: 0.4, hard: 0.1, expert: 0 };
}

/**
 * Construit une tentative avec une difficulté progressive.
 *
 * Les premières leçons ne peuvent plus tirer une question difficile au hasard.
 * Les évaluations conservent toute la banque, tandis que les leçons ordinaires
 * commencent par les notions accessibles puis montent graduellement.
 */
export function selectProgressiveContentItems(
  items: ContentItem[],
  policy: LessonSelectionPolicy,
  context: LessonDifficultyContext,
  random: () => number = Math.random,
): ContentItem[] {
  if (policy.strategy === "all") {
    return [...items].sort(
      (left, right) => DIFFICULTY_ORDER[left.difficulty] - DIFFICULTY_ORDER[right.difficulty],
    );
  }

  const distribution = difficultyDistribution(context);
  if (!distribution) return selectContentItems(items, policy, random);

  const requestedCount = Math.min(policy.count ?? items.length, items.length);
  const selected: ContentItem[] = [];
  const selectedIds = new Set<string>();
  const queues = Object.fromEntries(
    (Object.keys(DIFFICULTY_ORDER) as ContentDifficulty[]).map((difficulty) => [
      difficulty,
      shuffled(
        items.filter((item) => item.difficulty === difficulty),
        random,
      ),
    ]),
  ) as Record<ContentDifficulty, ContentItem[]>;

  for (const difficulty of Object.keys(DIFFICULTY_ORDER) as ContentDifficulty[]) {
    const target = Math.floor(requestedCount * distribution[difficulty]);
    for (const item of queues[difficulty].slice(0, target)) {
      selected.push(item);
      selectedIds.add(item.id);
    }
  }

  const permittedDifficulties = (Object.keys(DIFFICULTY_ORDER) as ContentDifficulty[]).filter(
    (difficulty) => distribution[difficulty] > 0,
  );
  for (const difficulty of permittedDifficulties) {
    for (const item of queues[difficulty]) {
      if (selected.length >= requestedCount) break;
      if (selectedIds.has(item.id)) continue;
      selected.push(item);
      selectedIds.add(item.id);
    }
  }

  return selected.sort(
    (left, right) => DIFFICULTY_ORDER[left.difficulty] - DIFFICULTY_ORDER[right.difficulty],
  );
}

export interface ContentPoolSource {
  lessonId: string;
  items: ContentItem[];
}

export function selectContentPoolItems(
  sources: ContentPoolSource[],
  pool: LessonContentPool,
  requestedCount: number | null,
  random: () => number = Math.random,
): ContentItem[] {
  const byLesson = new Map(sources.map((source) => [source.lessonId, source.items]));
  for (const sourceLessonId of pool.sourceLessonIds) {
    if (!byLesson.has(sourceLessonId)) {
      throw new Error(`Banque source introuvable : ${sourceLessonId}`);
    }
  }
  if (requestedCount !== null) {
    if (pool.minimumItems !== null && requestedCount < pool.minimumItems) {
      throw new Error(`La sélection doit contenir au moins ${pool.minimumItems} exercices.`);
    }
    if (pool.maximumItems !== null && requestedCount > pool.maximumItems) {
      throw new Error(`La sélection ne peut pas dépasser ${pool.maximumItems} exercices.`);
    }
  }

  const queues = shuffled(pool.sourceLessonIds, random).map((lessonId) => ({
    lessonId,
    items: shuffled(byLesson.get(lessonId) ?? [], random),
    cursor: 0,
  }));
  const selected: ContentItem[] = [];
  const selectedIds = new Set<string>();
  const availableUniqueIds = new Set(queues.flatMap((queue) => queue.items.map((item) => item.id)));
  const target = Math.min(requestedCount ?? availableUniqueIds.size, availableUniqueIds.size);

  while (selected.length < target) {
    let progressed = false;
    for (const queue of queues) {
      while (queue.cursor < queue.items.length) {
        const item = queue.items[queue.cursor++]!;
        if (selectedIds.has(item.id)) continue;
        selectedIds.add(item.id);
        selected.push(item);
        progressed = true;
        break;
      }
      if (selected.length >= target) break;
    }
    if (!progressed) break;
  }

  return selected;
}
