import type { ContentItem } from "./content-domain.ts";
import { isMatchingAssociation } from "./pedagogical-content.ts";

export interface PreparedLessonAnswer {
  id: string;
  text: string;
  explanation: string;
  match?: string;
}

export interface PreparedLessonInteraction {
  id: string;
  type: "choice" | "association";
  question: string;
  answers: PreparedLessonAnswer[];
  matchOptions: Array<{ id: string; text: string }>;
  correctAnswerIds: string[];
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
  const answers = association ? item.answers : shuffled(item.answers, random);
  return {
    id: item.id,
    type: association ? "association" : "choice",
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
    explanation: item.explanation,
  };
}
