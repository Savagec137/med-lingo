import assert from "node:assert/strict";
import test from "node:test";
import { prepareContentInteraction } from "./lesson-runtime.ts";
import { PEDAGOGICAL_CONTENT_CATALOG, requirePedagogicalLesson } from "./pedagogical-content.ts";

const lesson = requirePedagogicalLesson("b1-u1-l1");

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

test("B1 U1 L1 contient une carte Pulse et exactement cinq interactions", () => {
  assert.equal(lesson.interactions.length, 5);
  assert.equal(lesson.estimatedMinutes, 3);
  assert.ok(lesson.pulse.length > 40 && lesson.pulse.length <= 240);
  assert.equal(lesson.pulse.includes("\n"), false);

  const counts = lesson.interactions.reduce<Record<string, number>>((result, item) => {
    result[item.type] = (result[item.type] ?? 0) + 1;
    return result;
  }, {});
  assert.equal(counts.mcq, 3);
  assert.equal(counts.true_false_contextual, 1);
  assert.equal(counts.association, 1);
});

test("chaque interaction référence uniquement le support B1.M1 et possède un feedback", () => {
  assert.equal(lesson.sourceDocument, "B1.M1 - Support Etudiant");
  assert.deepEqual(lesson.sourcePages, [4, 5, 6, 15, 16]);
  for (const item of lesson.interactions) {
    assert.equal(item.metadata?.sourceDocument, lesson.sourceDocument, item.id);
    assert.ok(item.metadata?.sourcePages, item.id);
    assert.ok(item.explanation.length >= 30, item.id);
    for (const answer of item.answers) assert.ok(answer.explanation.length >= 30, answer.id);
  }
});

test("les réponses et les définitions d'association sont mélangées à chaque tentative", () => {
  for (const item of lesson.interactions) {
    const orders = new Set<string>();
    for (let attempt = 1; attempt <= 40; attempt += 1) {
      const prepared = prepareContentInteraction(item, seededRandom(attempt * 97));
      const order =
        prepared.type === "association"
          ? prepared.matchOptions.map((option) => option.id)
          : prepared.answers.map((answer) => answer.id);
      orders.add(order.join("|"));
    }
    assert.ok(orders.size > 1, `${item.id} ne change jamais d'ordre`);
  }
});

test("le mélange ne modifie jamais la correction par identifiant", () => {
  for (const item of lesson.interactions) {
    const correctIds = Array.isArray(item.correctAnswer)
      ? item.correctAnswer
      : [item.correctAnswer];
    assert.equal(PEDAGOGICAL_CONTENT_CATALOG.evaluate(item.id, correctIds).isCorrect, true);

    if (item.type === "association") {
      assert.equal(
        PEDAGOGICAL_CONTENT_CATALOG.evaluate(item.id, [...correctIds].reverse()).isCorrect,
        false,
      );
    } else {
      const incorrect = item.answers.find((answer) => !correctIds.includes(answer.id));
      assert.ok(incorrect, item.id);
      assert.equal(PEDAGOGICAL_CONTENT_CATALOG.evaluate(item.id, [incorrect.id]).isCorrect, false);
    }
  }
});
