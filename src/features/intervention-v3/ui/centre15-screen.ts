import type {
  FactId,
  InterventionSessionView,
  RegulatorQuestion,
  HandoverItemState,
} from "../v3-domain.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import {
  handoverItemStates,
  handoverOffers,
  regulatorQuestionsForTransmission,
  unansweredQuestions,
  type HandoverFactStatus,
} from "../engine/queries.ts";

/**
 * Écran 4 — « Appel au 15 ».
 *
 * L'écran où le joueur **choisit ce qu'il transmet**. Il n'appuie pas sur un
 * bouton « transmettre » : il coche des éléments, et chaque case cochée ou laissée
 * vide a une conséquence différente selon qu'il possédait ou non l'information.
 *
 * Rien de la valeur des données n'apparaît ici. Une ligne dit « Constantes
 * mesurées — non recueillies », jamais la tension. Le joueur choisit sur ce qu'il
 * sait avoir fait, ce qui est précisément la difficulté du bilan réel : on
 * transmet de mémoire, sans relire le dossier.
 *
 * L'écran affiche aussi ce que la sélection courante produirait — combien de
 * trous resteraient silencieux — parce que le mode laisse commettre l'erreur mais
 * ne la cache pas.
 */

/** État d'un élément du bilan pour l'affichage de la carte. */
export interface Centre15ItemModel {
  id: string;
  label: string;
  /** Attendu au bilan : la maquette le marque, et le taire coûte. */
  expected: boolean;
  /** Coché par le joueur dans la sélection courante. */
  selected: boolean;
  /** Toutes ses données recueillies et fraîches. */
  complete: boolean;
  /** Données portées par l'élément, nommées sans être chiffrées. */
  facts: Array<{ factId: FactId; label: string; status: HandoverFactStatus; statusLabel: string }>;
  /**
   * Ce que produirait la sélection courante pour cet élément. C'est l'information
   * qui rend le choix éclairé sans le faire à la place du joueur.
   */
  outcome: HandoverItemState;
  outcomeLabel: string;
}

export interface Centre15QuestionModel {
  id: string;
  text: string;
  /** Vrai si la question naît d'une donnée possédée et non transmise. */
  onOmission: boolean;
  answers: Array<{ id: string; text: string }>;
  /** Réponse déjà donnée. Une question ne se répond qu'une fois. */
  answeredWith: string | null;
}

export interface Centre15ScreenModel {
  eyebrow: string;
  title: string;
  narrative: string;
  items: Centre15ItemModel[];
  /** Ajouts libres proposés, constats et formulations diagnostiques mêlés. */
  additions: Array<{ text: string; selected: boolean }>;
  /**
   * Combien d'éléments attendus resteraient sans mention. Le chiffre est affiché
   * parce que la faute doit être visible avant d'être commise, pas seulement au
   * débriefing.
   */
  silentGapCount: number;
  /** Éléments attendus possédés et non cochés. */
  omittedCount: number;
  /** Questions que la régulation posera en l'état. */
  questions: Centre15QuestionModel[];
  /** Questions posées et restées sans réponse. */
  pendingQuestionIds: string[];
  /** Consigne de la régulation, reçue et jamais choisie. Nulle avant transmission. */
  instruction: string | null;
  transmitted: boolean;
}

const FACT_STATUS_LABELS: Record<HandoverFactStatus, string> = {
  known: "recueillie",
  stale: "datée",
  unknown: "non recueillie",
};

const OUTCOME_LABELS: Record<HandoverItemState, string> = {
  transmitted: "Transmise",
  disclosed_missing: "Annoncée non recueillie",
  omitted: "Non transmise alors qu'elle est connue",
  silent_gap: "Manquante et passée sous silence",
};

/**
 * L'écran d'appel, pour une sélection en cours.
 *
 * `selectedItemIds` est un état d'interface, pas un état de jeu : le joueur coche
 * et décoche librement, et rien n'est engagé avant la transmission. Le passer en
 * argument plutôt que de le stocker dans la session évite d'avoir à défaire des
 * choix dans le moteur.
 */
export function centre15ScreenModel(
  session: InterventionSessionView,
  selectedItemIds: readonly string[] = [],
  selectedAdditions: readonly string[] = [],
): Centre15ScreenModel {
  const scenario = getV3Scenario(session.scenarioId);
  const selected = new Set(selectedItemIds);
  const chosenAdditions = new Set(selectedAdditions);
  const states = handoverItemStates(session, scenario, selectedItemIds);

  const items = handoverOffers(session).map((offer): Centre15ItemModel => {
    const outcome = states[offer.id] ?? "silent_gap";
    return {
      id: offer.id,
      label: offer.label,
      expected: offer.expected,
      selected: selected.has(offer.id),
      complete: offer.complete,
      facts: offer.facts.map((fact) => ({
        factId: fact.factId,
        label: fact.label,
        status: fact.status,
        statusLabel: FACT_STATUS_LABELS[fact.status],
      })),
      outcome,
      outcomeLabel: OUTCOME_LABELS[outcome],
    };
  });

  const expectedItems = items.filter((item) => item.expected);
  const transmission = session.transmission;
  const questions: RegulatorQuestion[] = transmission
    ? scenario.regulatorQuestions.filter((question) =>
        transmission.questionsAsked.includes(question.id),
      )
    : regulatorQuestionsForTransmission(session, scenario, states);

  return {
    eyebrow: "Intervention en cours",
    title: "Appel au 15",
    narrative: scenario.narrative.centre15_call,
    items,
    additions: [...scenario.freeAdditions, ...scenario.rejectedAdditions].map((text) => ({
      text,
      selected: chosenAdditions.has(text),
    })),
    silentGapCount: expectedItems.filter((item) => item.outcome === "silent_gap").length,
    omittedCount: expectedItems.filter((item) => item.outcome === "omitted").length,
    questions: questions.map((question) => ({
      id: question.id,
      text: question.text,
      onOmission: question.onOmission,
      answers: question.answers.map((answer) => ({ id: answer.id, text: answer.text })),
      answeredWith: transmission?.answers[question.id] ?? null,
    })),
    pendingQuestionIds: unansweredQuestions(session),
    instruction: transmission?.instruction ?? null,
    transmitted: transmission !== null,
  };
}
