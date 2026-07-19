import assert from "node:assert/strict";
import test from "node:test";

import specificationInput from "./formations/dea/parcours-01/lesson-01.specification.json" with { type: "json" };
import { mergePedagogicalSpecifications } from "./pedagogical-specification-merge.ts";
import { parsePedagogicalSpecification } from "./pedagogical-specification-schema.ts";

const specification = parsePedagogicalSpecification(specificationInput);

test("la spécification officielle conserve les métadonnées et objectifs sans reformulation", () => {
  assert.equal(specification.specificationVersion, "1.0.0");
  assert.equal(specification.contentRevision, 1);
  assert.equal(specification.title, "Pourquoi apprendre l'anatomie ?");
  assert.deepEqual(specification.duration, {
    minimumMinutes: 10,
    maximumMinutes: 15,
    label: "10 à 15 minutes",
  });
  assert.equal(specification.difficulty.label, "Débutant");
  assert.deepEqual(specification.prerequisites, []);
  assert.equal(specification.primaryCompetency.text, "Comprendre les bases de l'anatomie humaine.");
  assert.deepEqual(specification.learningObjectives, [
    "Définir l'anatomie.",
    "Définir la physiologie.",
    "Différencier anatomie et physiologie.",
    "Expliquer pourquoi un ambulancier doit maîtriser l'anatomie.",
    "Décrire les niveaux d'organisation du corps humain.",
  ]);
});

test("aucun bloc pédagogique fourni n'est perdu", () => {
  assert.equal(specification.course.sections.length, 4);
  assert.equal(specification.vocabulary.terms.length, 9);
  assert.equal(specification.flashcards.items.length, 5);
  assert.equal(specification.exercises.mcq.length, 3);
  assert.equal(specification.exercises.trueFalse.length, 4);
  assert.equal(specification.exercises.associations.length, 1);
  assert.equal(specification.exercises.dragAndDrop.length, 1);
  assert.equal(specification.exercises.clinicalCases.length, 1);
  assert.equal(specification.exercises.traps.length, 1);
  assert.equal(specification.anecdote.text, "La peau est le plus grand organe du corps humain.");

  assert.equal(specification.flashcards.items[0]?.id, "F001");
  assert.equal(specification.exercises.mcq[0]?.id, "Q001");
  assert.equal(
    specification.exercises.clinicalCases[0]?.correctAnswer,
    "Utiliser les repères anatomiques pour localiser précisément la douleur.",
  );
});

test("le quiz et le boss incomplets sont conservés en pending_content", () => {
  assert.equal(specification.finalQuiz.questionCount, 20);
  assert.equal(
    specification.finalQuiz.distribution.reduce((total, entry) => total + entry.count, 0),
    20,
  );
  assert.equal(specification.finalQuiz.status, "pending_content");
  assert.equal(specification.boss.status, "pending_content");
  assert.equal(specification.boss.reward.xp, 100);
  assert.equal(specification.boss.reward.badge, null);
  assert.deepEqual(specification.boss.unresolvedSourceFragments, [
    "l\nPremiers repères anatomiques.ocaliser la douleur ;",
    "Badge :",
  ]);
});

test("la projection suit explicitement tous les contenus officiels", () => {
  assert.equal(specification.integration.sourceStatus, "official");
  assert.equal(specification.integration.mergeStrategy, "merge_by_stable_id");
  assert.equal(specification.integration.projectedContentIds.length, 9);
  assert.equal(specification.integration.nonProjectedContentIds.length, 10);
});

test("une future révision s'ajoute par fusion sans remplacer le contenu existant", () => {
  const addition = structuredClone(specification);
  addition.specificationVersion = "1.1.0";
  addition.contentRevision = 2;
  addition.openQuestions.push({
    id: "QUESTION-OUVERTE-001",
    type: "open_question",
    status: "pending_content",
    question: "Contenu futur",
  });
  addition.integration.nonProjectedContentIds.push("QUESTION-OUVERTE-001");

  const merged = mergePedagogicalSpecifications(specification, addition);
  assert.equal(merged.contentRevision, 2);
  assert.equal(merged.openQuestions.length, 1);
  assert.equal(
    merged.flashcards.items[0]?.answer,
    "Science décrivant la structure du corps humain.",
  );

  const conflicting = structuredClone(addition);
  conflicting.contentRevision = 3;
  conflicting.flashcards.items[0]!.answer = "Texte remplacé";
  assert.throws(() => mergePedagogicalSpecifications(specification, conflicting));
});
