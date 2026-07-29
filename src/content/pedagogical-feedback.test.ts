import assert from "node:assert/strict";
import test from "node:test";
import type { ContentItem } from "./content-domain.ts";
import {
  derivePedagogicalFeedback,
  isAnswerTextCopy,
  responseErrorExplanation,
} from "./pedagogical-feedback.ts";

function question(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: "question-1",
    unit: "parcours-01",
    lesson: "lesson-01",
    difficulty: "easy",
    type: "mcq",
    question: "Que décrit l'anatomie ?",
    answers: [
      {
        id: "structure",
        text: "La structure du corps",
        explanation: "L'anatomie étudie l'organisation et les rapports des structures.",
      },
      {
        id: "fonction",
        text: "Le fonctionnement des organes",
        explanation: "Cette confusion est fréquente : le fonctionnement relève de la physiologie.",
        distractorType: "frequent-error",
      },
    ],
    correctAnswer: "structure",
    explanation:
      "Structure et fonctionnement sont complémentaires, mais correspondent à deux disciplines distinctes.",
    tags: ["anatomie"],
    ...overrides,
  };
}

test("structure un contenu pédagogique sans recopier la bonne réponse", () => {
  const feedback = derivePedagogicalFeedback(question());

  assert.equal(
    feedback.correctExplanation,
    "L'anatomie étudie l'organisation et les rapports des structures.",
  );
  assert.equal(
    feedback.commonErrorExplanation,
    "Cette confusion est fréquente : le fonctionnement relève de la physiologie.",
  );
  assert.equal(
    feedback.takeaway,
    "Structure et fonctionnement sont complémentaires, mais correspondent à deux disciplines distinctes.",
  );
  assert.notEqual(feedback.takeaway, "La structure du corps");
});

test("utilise l'explication du choix incorrect effectué par l'apprenant", () => {
  const feedback = derivePedagogicalFeedback(question());
  const mistake = responseErrorExplanation({
    answers: question().answers,
    correctAnswerIds: ["structure"],
    selectedAnswerIds: ["fonction"],
    isCorrect: false,
    commonErrorExplanation: feedback.commonErrorExplanation,
  });

  assert.equal(
    mistake,
    "Cette confusion est fréquente : le fonctionnement relève de la physiologie.",
  );
});

test("conserve une astuce mnémotechnique éditoriale lorsqu'elle est pertinente", () => {
  const feedback = derivePedagogicalFeedback(
    question({
      pedagogicalFeedback: {
        correctExplanation: "L'anatomie décrit la forme et la position des structures.",
        commonErrorExplanation: "Ne pas la confondre avec l'étude du fonctionnement.",
        takeaway: "Anatomie pour la structure, physiologie pour le fonctionnement.",
        mnemonic: "A comme Anatomie et Architecture.",
      },
    }),
  );

  assert.equal(feedback.mnemonic, "A comme Anatomie et Architecture.");
});

test("écarte une explication qui n'est qu'une copie de la réponse", () => {
  assert.equal(isAnswerTextCopy("La structure du corps", "La structure du corps"), true);
  assert.equal(
    isAnswerTextCopy("La bonne réponse est : la structure du corps.", "La structure du corps"),
    true,
  );
  assert.equal(
    isAnswerTextCopy(
      "L'anatomie étudie l'organisation et les rapports des structures.",
      "La structure du corps",
    ),
    false,
  );
});
