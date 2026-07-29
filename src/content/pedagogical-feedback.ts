import type { ContentAnswer, ContentItem, ContentPedagogicalFeedback } from "./content-domain.ts";

export const PENDING_CORRECT_EXPLANATION =
  "L’explication détaillée de cette question attend encore une validation pédagogique.";
export const PENDING_COMMON_ERROR =
  "Les erreurs fréquentes associées à cette question sont encore en cours de validation.";
export const PENDING_TAKEAWAY =
  "Le point clé de cette question doit encore être validé avant publication.";

type FeedbackSource = Pick<
  ContentItem,
  "type" | "answers" | "correctAnswer" | "explanation" | "priorityReminder" | "pedagogicalFeedback"
>;

function nonEmpty(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalized(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[’']/g, " ")
    .replace(/[«»"“”.,:;!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAnswerTextCopy(explanation: string, answerText: string) {
  const answer = normalized(answerText);
  const candidate = normalized(explanation).replace(
    /^(exact|bonne reponse|la bonne reponse est|reponse attendue|il fallait choisir)\s+/,
    "",
  );
  return Boolean(answer && candidate === answer);
}

function validAnswerExplanation(answer: ContentAnswer | undefined) {
  const explanation = nonEmpty(answer?.explanation);
  if (!answer || !explanation || isAnswerTextCopy(explanation, answer.text)) return undefined;
  return explanation;
}

export function derivePedagogicalFeedback(source: FeedbackSource): ContentPedagogicalFeedback {
  const correctIds = Array.isArray(source.correctAnswer)
    ? source.correctAnswer
    : [source.correctAnswer];
  const correctAnswers = source.answers.filter((answer) => correctIds.includes(answer.id));
  const distractors = source.answers.filter((answer) => !correctIds.includes(answer.id));
  const preferredDistractor =
    distractors.find((answer) => answer.distractorType === "frequent-error") ?? distractors[0];
  const conceptExplanation = nonEmpty(source.explanation);
  const processErrorExplanation =
    source.type === "association" && conceptExplanation
      ? `L’erreur fréquente consiste à intervertir des associations proches. ${conceptExplanation}`
      : source.type === "ordering" && conceptExplanation
        ? `Une étape pertinente placée au mauvais rang modifie la logique attendue. ${conceptExplanation}`
        : source.type === "fill_blank" && conceptExplanation
          ? `Un terme voisin peut sembler plausible sans répondre exactement à l’énoncé. ${conceptExplanation}`
          : undefined;

  const correctExplanation =
    nonEmpty(source.pedagogicalFeedback?.correctExplanation) ??
    correctAnswers.map(validAnswerExplanation).find(Boolean) ??
    nonEmpty(source.explanation) ??
    PENDING_CORRECT_EXPLANATION;

  const commonErrorExplanation =
    nonEmpty(source.pedagogicalFeedback?.commonErrorExplanation) ??
    validAnswerExplanation(preferredDistractor) ??
    processErrorExplanation ??
    PENDING_COMMON_ERROR;

  const takeaway =
    nonEmpty(source.pedagogicalFeedback?.takeaway) ??
    nonEmpty(source.priorityReminder) ??
    nonEmpty(source.explanation) ??
    correctAnswers.map(validAnswerExplanation).find(Boolean) ??
    PENDING_TAKEAWAY;

  return {
    correctExplanation,
    commonErrorExplanation,
    takeaway,
    mnemonic: nonEmpty(source.pedagogicalFeedback?.mnemonic),
  };
}

interface ResponseErrorInput {
  answers: Array<Pick<ContentAnswer, "id" | "explanation">>;
  correctAnswerIds: string[];
  selectedAnswerIds: string[];
  isCorrect: boolean;
  commonErrorExplanation?: string;
}

export function responseErrorExplanation({
  answers,
  correctAnswerIds,
  selectedAnswerIds,
  isCorrect,
  commonErrorExplanation,
}: ResponseErrorInput) {
  if (!isCorrect) {
    const selectedErrors = answers
      .filter(
        (answer) => selectedAnswerIds.includes(answer.id) && !correctAnswerIds.includes(answer.id),
      )
      .map((answer) => nonEmpty(answer.explanation))
      .filter((value): value is string => Boolean(value));
    const uniqueErrors = [...new Set(selectedErrors)].slice(0, 2);
    if (uniqueErrors.length > 0) return uniqueErrors.join(" ");
  }

  return nonEmpty(commonErrorExplanation) ?? PENDING_COMMON_ERROR;
}
