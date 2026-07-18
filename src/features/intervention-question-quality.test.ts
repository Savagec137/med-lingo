import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ScenarioStep } from "./intervention-domain.ts";
import {
  buildChoiceOrderByStep,
  createInterventionSession,
  isInterventionAnswerCorrect,
  submitInterventionAnswers,
} from "./intervention-engine.ts";
import {
  buildOfficialCatalog,
  type OfficialMissionProfile,
} from "./intervention-scenario-builder.ts";

const catalog = JSON.parse(
  readFileSync(new URL("./intervention-missions.json", import.meta.url), "utf8"),
) as { missions: OfficialMissionProfile[] };
const scenarios = buildOfficialCatalog(catalog.missions);
const steps = scenarios.flatMap((scenario) => scenario.steps);

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

function orderStep(step: ScenarioStep, order: string[]) {
  const choices = new Map(step.choices.map((choice) => [choice.id, choice]));
  return { ...step, choices: order.map((choiceId) => choices.get(choiceId)!) };
}

function expectedAnswer(step: ScenarioStep) {
  if (step.format === "sequence") {
    return [...step.choices]
      .sort((left, right) => (left.sequenceRank ?? 0) - (right.sequenceRank ?? 0))
      .map((choice) => choice.id);
  }
  return step.choices.filter((choice) => choice.recommended).map((choice) => choice.id);
}

function normalizedTokens(value: string) {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function tokenSimilarity(left: string, right: string) {
  const leftTokens = normalizedTokens(left);
  const rightTokens = normalizedTokens(right);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 1 : intersection / union;
}

test("les niveaux imposent 3, 4 ou 4 à 5 choix selon la difficulté", () => {
  for (const scenario of scenarios) {
    for (const step of scenario.steps) {
      const count = step.choices.length;
      if (step.format === "sequence") {
        assert.equal(count, 4, `${scenario.title} / ${step.phase}`);
      } else if (scenario.difficultyStars === 1) {
        assert.equal(count, 3, `${scenario.title} / ${step.phase}`);
      } else if ((scenario.difficultyStars ?? 1) <= 3) {
        assert.equal(count, 4, `${scenario.title} / ${step.phase}`);
      } else {
        assert.ok(count === 4 || count === 5, `${scenario.title} / ${step.phase}`);
      }
    }
  }
});

test("les formats imposent le bon nombre de réponses attendues et des identifiants uniques", () => {
  const globalChoiceIds = new Set<string>();
  const formats = new Set<string>();
  for (const step of steps) {
    formats.add(step.format ?? "single");
    const ids = step.choices.map((choice) => choice.id);
    assert.equal(new Set(ids).size, ids.length, step.id);
    for (const id of ids) {
      assert.ok(!globalChoiceIds.has(id), `Identifiant de réponse dupliqué : ${id}`);
      globalChoiceIds.add(id);
    }
    const correctCount = step.choices.filter((choice) => choice.recommended).length;
    if (step.format === "multiple") assert.equal(correctCount, 2, step.id);
    else if (step.format === "sequence") {
      assert.equal(correctCount, step.choices.length, step.id);
      assert.equal(new Set(step.choices.map((choice) => choice.sequenceRank)).size, 4, step.id);
    } else assert.equal(correctCount, 1, step.id);
  }
  assert.deepEqual([...formats].sort(), [
    "association",
    "contextual-true-false",
    "equipment",
    "error-identification",
    "handover",
    "multiple",
    "regulatory",
    "sequence",
    "single",
  ]);
});

test("la correction reste exacte après chaque mélange", () => {
  for (let attempt = 1; attempt <= 100; attempt += 1) {
    for (const scenario of scenarios) {
      const orderByStep = buildChoiceOrderByStep(
        scenario,
        seededRandom(attempt * 101 + (scenario.minimumLevel ?? 1)),
      );
      for (const step of scenario.steps) {
        const shuffled = orderStep(step, orderByStep[step.id]!);
        assert.equal(isInterventionAnswerCorrect(shuffled, expectedAnswer(step)), true, step.id);
        const incorrect = shuffled.choices.find((choice) => !choice.recommended);
        if (incorrect) {
          assert.equal(isInterventionAnswerCorrect(shuffled, [incorrect.id]), false, step.id);
        }
      }
    }
  }
});

test("le moteur attribue la correction aux identifiants pour les formats composés", () => {
  for (const scenario of scenarios) {
    for (const step of scenario.steps.filter(
      (candidate) => candidate.format === "multiple" || candidate.format === "sequence",
    )) {
      const session = {
        ...createInterventionSession(scenario, seededRandom(42)),
        status: "active" as const,
        currentStepId: step.id,
      };
      const correct = submitInterventionAnswers(scenario, session, expectedAnswer(step));
      assert.equal(correct.pendingDecision?.recommended, true, step.id);
      if (step.format === "sequence") {
        const reversed = submitInterventionAnswers(
          scenario,
          session,
          [...expectedAnswer(step)].reverse(),
        );
        assert.equal(reversed.pendingDecision?.recommended, false, step.id);
      }
    }
  }
});

test("une nouvelle tentative produit de nouveaux ordres visuels", () => {
  const observedOrders = new Map<string, Set<string>>();
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    for (const scenario of scenarios) {
      const orderByStep = buildChoiceOrderByStep(scenario, seededRandom(attempt * 577));
      for (const step of scenario.steps) {
        const orders = observedOrders.get(step.id) ?? new Set<string>();
        orders.add(orderByStep[step.id]!.join("|"));
        observedOrders.set(step.id, orders);
      }
    }
  }
  for (const step of steps) assert.ok((observedOrders.get(step.id)?.size ?? 0) > 1, step.id);
});

test("une position correcte ne se répète jamais plus de deux fois de suite", () => {
  for (let attempt = 1; attempt <= 250; attempt += 1) {
    for (const scenario of scenarios) {
      const orderByStep = buildChoiceOrderByStep(scenario, seededRandom(attempt * 313));
      const positions: number[] = [];
      for (const step of scenario.steps) {
        if (step.format === "multiple" || step.format === "sequence") continue;
        const correctId = step.choices.find((choice) => choice.recommended)?.id;
        const position = orderByStep[step.id]?.indexOf(correctId ?? "") ?? -1;
        assert.ok(position >= 0, step.id);
        positions.push(position);
      }
      for (let index = 2; index < positions.length; index += 1) {
        assert.ok(
          !(positions[index] === positions[index - 1] && positions[index] === positions[index - 2]),
          `${scenario.id} : position ${positions[index]}`,
        );
      }
    }
  }
});

test("la distribution des bonnes réponses reste équilibrée par nombre de choix", () => {
  const distribution = new Map<number, number[]>();
  for (let attempt = 1; attempt <= 500; attempt += 1) {
    for (const scenario of scenarios) {
      const orderByStep = buildChoiceOrderByStep(
        scenario,
        seededRandom(attempt * 997 + (scenario.minimumLevel ?? 1)),
      );
      for (const step of scenario.steps) {
        if (step.format === "multiple" || step.format === "sequence") continue;
        const positions =
          distribution.get(step.choices.length) ??
          Array.from({ length: step.choices.length }, () => 0);
        const correctId = step.choices.find((choice) => choice.recommended)!.id;
        const position = orderByStep[step.id]!.indexOf(correctId);
        positions[position] = (positions[position] ?? 0) + 1;
        distribution.set(step.choices.length, positions);
      }
    }
  }

  for (const [choiceCount, positions] of distribution) {
    const total = positions.reduce((sum, value) => sum + value, 0);
    const expected = total / choiceCount;
    for (const value of positions) {
      assert.ok(
        Math.abs(value - expected) / expected < 0.04,
        `${choiceCount} choix : ${positions.join(", ")}`,
      );
    }
  }
});

test("chaque option possède un feedback et aucune paire n'est presque identique", () => {
  for (const step of steps) {
    for (const choice of step.choices) {
      assert.ok((choice.rationale ?? choice.feedback).length >= 70, `${step.id} / ${choice.id}`);
    }
    for (let left = 0; left < step.choices.length; left += 1) {
      for (let right = left + 1; right < step.choices.length; right += 1) {
        const similarity = tokenSimilarity(step.choices[left]!.label, step.choices[right]!.label);
        assert.ok(similarity < 0.88, `${step.id} : similarité ${similarity.toFixed(2)}`);
      }
    }
  }
});
