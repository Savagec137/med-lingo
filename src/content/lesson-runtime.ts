import type { ContentItem } from "./content-domain.ts";
import type { LessonSelectionPolicy } from "./learning-domain.ts";

function isMatchingAssociation(item: ContentItem) {
  return item.type === "association" && item.metadata?.associationMode === "matching";
}

export interface PreparedLessonAnswer {
  id: string;
  text: string;
  explanation: string;
  match?: string;
}

export interface PreparedLessonInteraction {
  id: string;
  type: "choice" | "multiple_choice" | "association" | "ordering";
  question: string;
  answers: PreparedLessonAnswer[];
  matchOptions: Array<{ id: string; text: string }>;
  correctAnswerIds: string[];
  requiredSelections: number;
  explanation?: string;
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
  const answers = association ? item.answers : shuffled(item.answers, random);
  return {
    id: item.id,
    type: association
      ? "association"
      : ordering
        ? "ordering"
        : multipleChoice
          ? "multiple_choice"
          : "choice",
    question: item.question,
    answers: answers.map((answer) => ({
      id: answer.id,
      text: answer.text,
      explanation: answer.explanation,
      match: answer.match,
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
    requiredSelections: Array.isArray(item.correctAnswer) ? item.correctAnswer.length : 1,
    explanation: item.explanation,
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
