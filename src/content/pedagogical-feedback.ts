import type { ContentItem, ContentPedagogicalFeedback } from "./content-domain.ts";

type FeedbackSource = Pick<
  ContentItem,
  "why_correct" | "common_mistake" | "key_takeaway" | "memory_tip"
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

export function readPedagogicalFeedback(source: FeedbackSource): ContentPedagogicalFeedback {
  return {
    why_correct: nonEmpty(source.why_correct),
    common_mistake: nonEmpty(source.common_mistake),
    key_takeaway: nonEmpty(source.key_takeaway),
    memory_tip: nonEmpty(source.memory_tip),
  };
}

export function hasPedagogicalFeedback(feedback: ContentPedagogicalFeedback) {
  return Boolean(
    feedback.why_correct || feedback.common_mistake || feedback.key_takeaway || feedback.memory_tip,
  );
}
