import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPedagogicalFeedback,
  isAnswerTextCopy,
  readPedagogicalFeedback,
} from "./pedagogical-feedback.ts";

test("lit exclusivement les quatre champs pédagogiques du JSON", () => {
  const feedback = readPedagogicalFeedback({
    why_correct: "L'anatomie décrit l'organisation et les rapports des structures.",
    common_mistake: "Le fonctionnement des organes relève de la physiologie.",
    key_takeaway: "Structure et fonctionnement sont deux notions complémentaires.",
    memory_tip: "A comme Anatomie et Architecture.",
  });

  assert.deepEqual(feedback, {
    why_correct: "L'anatomie décrit l'organisation et les rapports des structures.",
    common_mistake: "Le fonctionnement des organes relève de la physiologie.",
    key_takeaway: "Structure et fonctionnement sont deux notions complémentaires.",
    memory_tip: "A comme Anatomie et Architecture.",
  });
  assert.equal(hasPedagogicalFeedback(feedback), true);
});

test("ne génère aucun texte lorsque les champs JSON sont absents", () => {
  const feedback = readPedagogicalFeedback({});

  assert.deepEqual(feedback, {
    why_correct: undefined,
    common_mistake: undefined,
    key_takeaway: undefined,
    memory_tip: undefined,
  });
  assert.equal(hasPedagogicalFeedback(feedback), false);
});

test("ignore les champs vides afin que leurs cartes restent masquées", () => {
  const feedback = readPedagogicalFeedback({
    why_correct: "   ",
    key_takeaway: "Un contenu réel.",
  });

  assert.equal(feedback.why_correct, undefined);
  assert.equal(feedback.key_takeaway, "Un contenu réel.");
});

test("écarte toujours un contenu qui ne serait qu'une copie de la réponse", () => {
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
