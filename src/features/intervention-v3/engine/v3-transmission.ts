/**
 * La transmission au Centre 15.
 *
 * C'est le moment où le mode cesse d'être un jeu de collecte pour devenir un jeu
 * de communication. Le joueur ne dit pas « j'appelle » : il **choisit ce qu'il
 * transmet**, et le régulateur l'interroge sur ce qui manque.
 *
 * Quatre issues par élément du bilan, et c'est là que tient toute la pédagogie :
 *
 * | issue               | l'information       | le joueur              |
 * | ------------------- | ------------------- | ---------------------- |
 * | `transmitted`       | recueillie, fraîche | l'a transmise          |
 * | `disclosed_missing` | manquante ou datée  | l'a annoncée manquante |
 * | `omitted`           | recueillie          | ne l'a pas transmise   |
 * | `silent_gap`        | manquante           | n'a rien dit           |
 *
 * L'ordre de gravité n'est pas celui qu'on attend. **Le trou silencieux est le
 * pire**, pire que l'oubli : un régulateur qui ignore qu'une donnée manque croit
 * disposer d'un bilan complet et décide sur du faux. Annoncer « je n'ai pas pris
 * la tension » vaut donc mieux que se taire, et le barème le dit.
 *
 * Deux barèmes distincts se cumulent sans se confondre. `applyAction` sanctionne
 * les **trous du bilan** — ne pas avoir mesuré. Ce module sanctionne la **qualité
 * de la communication** — ne pas avoir dit. Un joueur qui n'a pas pris la tension
 * paie une fois pour ne pas l'avoir prise, puis est jugé sur ce qu'il en dit.
 */

import type {
  Centre15Transmission,
  FactId,
  HandoverItem,
  HandoverItemState,
  InterventionScenario,
  InterventionSession,
  RegulatorQuestion,
} from "../v3-domain.ts";
import { readFact } from "../facts/read-fact.ts";
import { getFact } from "../facts/fact-registry.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { regulatorQuestionsForSession } from "./v3-gaps.ts";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Barème de la communication.
 *
 * L'écart entre `disclosedMissing` et `silentGap` est volontairement le plus
 * grand du barème : c'est la leçon centrale de la transmission.
 */
export const HANDOVER_SCORES = {
  transmitted: 3,
  disclosedMissing: 1,
  omitted: -3,
  silentGap: -5,
  /** Un ajout libre pertinent, plafonné plus bas. */
  relevantAddition: 1,
} as const;

/** Plafond des points d'ajouts libres, pour qu'énumérer ne remplace pas choisir. */
export const MAX_ADDITION_BONUS = 3;

/** Marqueur d'un bilan transmis avec un trou passé sous silence. */
export const SILENT_GAP_FLAG = "silent-handover-gap";

/** Marqueur d'une formulation diagnostique tentée. Hors du champ de l'ambulancier. */
export const DIAGNOSTIC_FORMULATION_FLAG = "diagnostic-formulation";

/** Points d'une réponse au régulateur, juste ou fausse. */
export const REGULATOR_ANSWER_SCORES = { correct: 2, incorrect: -2 } as const;

/* -------------------------------------------------------------------------- */
/* Ce que l'écran propose                                                     */
/* -------------------------------------------------------------------------- */

export type HandoverFactStatus = "known" | "stale" | "unknown";

export interface HandoverFactOffer {
  factId: FactId;
  label: string;
  status: HandoverFactStatus;
}

export interface HandoverItemOffer {
  id: string;
  label: string;
  /** Attendu dans le bilan de ce scénario. Le taire coûte. */
  expected: boolean;
  /** Le joueur peut annoncer « non recueilli » plutôt que se taire. */
  disclosable: boolean;
  facts: HandoverFactOffer[];
  /** Tous ses faits recueillis et frais. */
  complete: boolean;
  /**
   * Élément sans fait rattaché — identité, gestes réalisés, demande de renfort.
   * Il est toujours transmissible : rien ne conditionne le fait de le dire.
   */
  narrative: boolean;
}

const factStatus = (session: InterventionSession, factId: FactId): HandoverFactStatus => {
  const read = readFact(session, factId);
  if (read.status === "unknown") return "unknown";
  return read.isStale ? "stale" : "known";
};

const isComplete = (session: InterventionSession, item: HandoverItem): boolean =>
  item.factIds.length === 0 ||
  item.factIds.every((factId) => factStatus(session, factId) === "known");

/**
 * Les éléments du bilan, tels que l'écran d'appel doit les présenter.
 *
 * Chaque élément dit **quels faits il porte et où ils en sont**, sans jamais
 * donner leur valeur : l'écran d'appel affiche « Tension — non mesurée », pas la
 * tension. Le joueur choisit sur ce qu'il sait avoir, pas sur ce que le moteur
 * sait.
 */
export function handoverOffers(session: InterventionSession): HandoverItemOffer[] {
  const scenario = getV3Scenario(session.scenarioId);
  return scenario.handoverItems.map((item) => ({
    id: item.id,
    label: item.label,
    expected: item.expected,
    disclosable: item.disclosable,
    narrative: item.factIds.length === 0,
    complete: isComplete(session, item),
    facts: item.factIds.map((factId) => ({
      factId,
      label: getFact(factId).label,
      status: factStatus(session, factId),
    })),
  }));
}

/* -------------------------------------------------------------------------- */
/* L'état de chaque élément après transmission                                */
/* -------------------------------------------------------------------------- */

export function handoverItemStates(
  session: InterventionSession,
  scenario: InterventionScenario,
  selectedItemIds: readonly string[],
): Record<string, HandoverItemState> {
  const selected = new Set(selectedItemIds);
  const states: Record<string, HandoverItemState> = {};
  for (const item of scenario.handoverItems) {
    const complete = isComplete(session, item);
    if (selected.has(item.id)) {
      // Transmettre un élément incomplet, c'est annoncer ce qui manque — quand
      // l'élément le permet. Sinon le trou reste silencieux malgré la sélection.
      states[item.id] = complete
        ? "transmitted"
        : item.disclosable
          ? "disclosed_missing"
          : "silent_gap";
    } else {
      states[item.id] = complete ? "omitted" : "silent_gap";
    }
  }
  return states;
}

const scoreForState = (state: HandoverItemState): number => {
  switch (state) {
    case "transmitted":
      return HANDOVER_SCORES.transmitted;
    case "disclosed_missing":
      return HANDOVER_SCORES.disclosedMissing;
    case "omitted":
      return HANDOVER_SCORES.omitted;
    case "silent_gap":
      return HANDOVER_SCORES.silentGap;
  }
};

/**
 * Note de la communication.
 *
 * Seuls les éléments **attendus** sont notés. Transmettre le motif d'appel ou
 * l'identité est normal et ne rapporte rien : récompenser l'évident ferait monter
 * le score sans rien apprendre, et le taire n'est pas une faute.
 */
export function handoverCommunicationScore(
  scenario: InterventionScenario,
  states: Record<string, HandoverItemState>,
): number {
  return scenario.handoverItems
    .filter((item) => item.expected)
    .reduce((sum, item) => sum + scoreForState(states[item.id] ?? "silent_gap"), 0);
}

/* -------------------------------------------------------------------------- */
/* Les questions du régulateur                                               */
/* -------------------------------------------------------------------------- */

/**
 * Questions posées, sur deux déclencheurs distincts.
 *
 * Une question **sur trou** naît d'une donnée non recueillie ou périmée : « avez-
 * vous pris la tension ? ». Une question **sur omission** naît d'une donnée que
 * le joueur possédait et n'a pas transmise : « quel est l'état de conscience
 * exact ? ». Le second cas est le plus instructif, et c'est ce que le champ
 * `onOmission` du scénario décrit.
 */
export function regulatorQuestionsForTransmission(
  session: InterventionSession,
  scenario: InterventionScenario,
  states: Record<string, HandoverItemState>,
): RegulatorQuestion[] {
  const onGaps = regulatorQuestionsForSession(session, scenario);
  const asked = new Map(onGaps.map((question) => [question.id, question]));

  // Faits portés par un élément que le joueur avait et n'a pas transmis.
  const omittedFactIds = new Set<FactId>();
  for (const item of scenario.handoverItems) {
    if (states[item.id] !== "omitted") continue;
    for (const factId of item.factIds) omittedFactIds.add(factId);
  }

  for (const question of scenario.regulatorQuestions) {
    if (!question.onOmission) continue;
    if (asked.has(question.id)) continue;
    if (omittedFactIds.has(question.triggeredByFactId)) asked.set(question.id, question);
  }
  return [...asked.values()];
}

/* -------------------------------------------------------------------------- */
/* Les ajouts libres                                                          */
/* -------------------------------------------------------------------------- */

export interface AdditionReview {
  /** Ajouts retenus : des constats, transmissibles tels quels. */
  accepted: string[];
  /**
   * Ajouts refusés : des formulations diagnostiques. L'ambulancier décrit et
   * transmet, il ne conclut pas. Le refus est la leçon.
   */
  rejected: string[];
}

/**
 * Trie les ajouts libres du joueur.
 *
 * Un ajout inconnu du scénario est refusé plutôt qu'accepté par défaut : accepter
 * l'inconnu laisserait passer n'importe quelle phrase, y compris un diagnostic
 * qu'aucune liste n'aurait prévu.
 */
export function reviewAdditions(
  scenario: InterventionScenario,
  additions: readonly string[],
): AdditionReview {
  const allowed = new Set(scenario.freeAdditions);
  const accepted: string[] = [];
  const rejected: string[] = [];
  for (const addition of additions) {
    if (allowed.has(addition)) accepted.push(addition);
    else rejected.push(addition);
  }
  return { accepted, rejected };
}

/* -------------------------------------------------------------------------- */
/* La transmission                                                            */
/* -------------------------------------------------------------------------- */

export interface HandoverSelection {
  /** Éléments que le joueur choisit de transmettre. */
  itemIds: readonly string[];
  /** Ajouts libres qu'il formule. */
  additions?: readonly string[];
}

/**
 * Transmission construite depuis les seuls faits recueillis.
 *
 * Les constantes cachées ne sont jamais consultées. Par défaut le moteur transmet
 * tous les éléments attendus : c'est le comportement historique, conservé pour
 * que `applyAction` seul reste utilisable, mais ce n'est **pas** le chemin du jeu
 * — le joueur choisit, par `transmitHandover`.
 */
export function buildCentre15Transmission(
  session: InterventionSession,
  scenario: InterventionScenario,
  selectedItemIds: readonly string[] = scenario.handoverItems
    .filter((item) => item.expected)
    .map((item) => item.id),
  additions: readonly string[] = [],
): Centre15Transmission {
  const itemStates = handoverItemStates(session, scenario, selectedItemIds);
  const review = reviewAdditions(scenario, additions);
  return {
    startedAtSeconds: session.simulatedTimeSeconds,
    durationSeconds: 90,
    selection: [...selectedItemIds],
    itemStates,
    questionsAsked: regulatorQuestionsForTransmission(session, scenario, itemStates).map(
      (question) => question.id,
    ),
    answers: {},
    instruction: scenario.regulatorInstruction,
    freeAdditions: review.accepted,
    rejectedAdditions: review.rejected,
  };
}

/* -------------------------------------------------------------------------- */
/* Les réponses au régulateur                                                 */
/* -------------------------------------------------------------------------- */

export interface RegulatorAnswerResult {
  session: InterventionSession;
  /** Nul si la question n'était pas posée, ou si elle a déjà reçu une réponse. */
  correct: boolean | null;
  /** Explication du scénario, quelle que soit la réponse. C'est le retour. */
  rationale: string | null;
  scoreDelta: number;
  refusalReason: string | null;
}

/**
 * Répond à une question du régulateur.
 *
 * Une seule réponse par question : sans cela le joueur essaierait les trois et
 * garderait la bonne. L'explication est rendue dans les deux cas — c'est elle qui
 * enseigne, pas le score.
 */
export function answerRegulatorQuestion(
  session: InterventionSession,
  questionId: string,
  answerId: string,
): RegulatorAnswerResult {
  const scenario = getV3Scenario(session.scenarioId);
  const transmission = session.transmission;
  const unanswerable = (refusalReason: string): RegulatorAnswerResult => ({
    session,
    correct: null,
    rationale: null,
    scoreDelta: 0,
    refusalReason,
  });

  if (!transmission) return unanswerable("Le bilan n'a pas encore été transmis.");
  if (!transmission.questionsAsked.includes(questionId)) {
    return unanswerable("Le régulateur n'a pas posé cette question.");
  }
  if (questionId in transmission.answers) {
    return unanswerable("Cette question a déjà reçu une réponse.");
  }

  const question =
    scenario.regulatorQuestions.find((entry) => entry.id === questionId) ??
    regulatorQuestionsForSession(session, scenario).find((entry) => entry.id === questionId);
  if (!question) return unanswerable("Question inconnue du scénario.");

  const answer = question.answers.find((entry) => entry.id === answerId);
  if (!answer) return unanswerable("Réponse inconnue pour cette question.");

  const scoreDelta = answer.correct
    ? REGULATOR_ANSWER_SCORES.correct
    : REGULATOR_ANSWER_SCORES.incorrect;

  return {
    correct: answer.correct,
    rationale: answer.rationale,
    scoreDelta,
    refusalReason: null,
    session: {
      ...session,
      score: clamp(session.score + scoreDelta, 0, 100),
      transmission: {
        ...transmission,
        answers: { ...transmission.answers, [questionId]: answerId },
      },
    },
  };
}

/** Questions posées et restées sans réponse. Alimente le débriefing. */
export function unansweredQuestions(session: InterventionSession): string[] {
  const transmission = session.transmission;
  if (!transmission) return [];
  return transmission.questionsAsked.filter((questionId) => !(questionId in transmission.answers));
}
