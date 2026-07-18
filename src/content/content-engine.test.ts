import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import type { ContentBank } from "./content-domain.ts";
import { createContentCatalog } from "./content-engine.ts";
import { INTERVENTION_CONTENT_CATALOG } from "./intervention-content-catalog.ts";

const testBank = {
  schemaVersion: 1,
  items: [
    {
      id: "communication_001",
      unit: "Communication",
      lesson: "Se présenter au patient",
      difficulty: "easy",
      type: "mcq",
      question: "Quelle formulation ouvre correctement l'échange ?",
      answers: [
        {
          id: "communication_001-introduction",
          text: "Se présenter, préciser son rôle et vérifier l'identité du patient",
          explanation: "Cette formulation établit le cadre de l'échange.",
        },
        {
          id: "communication_001-question-directe",
          text: "Commencer immédiatement par une question clinique détaillée",
          explanation: "La question clinique est utile après une brève présentation.",
        },
        {
          id: "communication_001-dossier",
          text: "Consulter le dossier sans expliquer sa présence",
          explanation: "Le dossier ne remplace pas la présentation au patient.",
        },
      ],
      correctAnswer: "communication_001-introduction",
      explanation:
        "Une présentation claire sécurise l'échange et permet au patient de vous situer.",
      tags: ["communication", "bloc1", "patient"],
    },
    {
      id: "communication_002",
      unit: "Communication",
      lesson: "Transmettre une information",
      difficulty: "medium",
      type: "multiple_choice",
      question: "Quels éléments structurent la transmission ?",
      answers: [
        { id: "situation", text: "Situation", explanation: "Elle expose le problème actuel." },
        { id: "background", text: "Contexte", explanation: "Il apporte les données utiles." },
        { id: "digression", text: "Digression", explanation: "Elle nuit à la hiérarchisation." },
      ],
      correctAnswer: ["situation", "background"],
      explanation: "La situation et le contexte rendent le message immédiatement exploitable.",
      tags: ["communication", "transmission"],
      metadata: { requiredSelections: 2 },
    },
    {
      id: "communication_003",
      unit: "Communication",
      lesson: "Structurer un échange",
      difficulty: "hard",
      type: "ordering",
      question: "Replace les étapes dans l'ordre.",
      answers: [
        { id: "step-1", text: "Se présenter", explanation: "Première étape.", sequenceRank: 1 },
        { id: "step-2", text: "Écouter", explanation: "Deuxième étape.", sequenceRank: 2 },
        { id: "step-3", text: "Reformuler", explanation: "Troisième étape.", sequenceRank: 3 },
      ],
      correctAnswer: ["step-1", "step-2", "step-3"],
      explanation: "La chronologie va de la présentation à la reformulation.",
      tags: ["communication", "chronologie"],
      metadata: { requiredSelections: 3 },
    },
  ],
} satisfies ContentBank;

test("le catalogue valide et recherche du contenu sans connaître l'interface React", () => {
  const catalog = createContentCatalog(testBank);
  assert.equal(catalog.size, 3);
  assert.equal(catalog.get("communication_001").lesson, "Se présenter au patient");
  assert.deepEqual(
    catalog
      .query({ unit: "Communication", difficulty: "easy", tags: ["patient"] })
      .map((item) => item.id),
    ["communication_001"],
  );
});

test("la correction utilise les identifiants et gère les trois familles de réponse", () => {
  const catalog = createContentCatalog(testBank);
  assert.equal(
    catalog.evaluate("communication_001", ["communication_001-introduction"]).isCorrect,
    true,
  );
  assert.equal(catalog.evaluate("communication_002", ["background", "situation"]).isCorrect, true);
  assert.equal(
    catalog.evaluate("communication_003", ["step-1", "step-2", "step-3"]).isCorrect,
    true,
  );
  assert.equal(
    catalog.evaluate("communication_003", ["step-2", "step-1", "step-3"]).isCorrect,
    false,
  );
});

test("le schéma refuse une réponse correcte absente et les identifiants dupliqués", () => {
  const invalid = structuredClone(testBank);
  invalid.items[0].correctAnswer = "answer-that-does-not-exist";
  assert.throws(() => createContentCatalog(invalid), ZodError);

  const duplicated = structuredClone(testBank);
  duplicated.items[1].id = duplicated.items[0].id;
  assert.throws(() => createContentCatalog(duplicated), ZodError);
});

test("les 120 questions Intervention sont des données conformes au moteur générique", () => {
  assert.equal(INTERVENTION_CONTENT_CATALOG.size, 120);
  assert.equal(INTERVENTION_CONTENT_CATALOG.query({ unit: "Mode Intervention" }).length, 120);
  assert.equal(
    INTERVENTION_CONTENT_CATALOG.query({ metadata: { missionId: "mission-01-malaise-domicile" } })
      .length,
    8,
  );
});
