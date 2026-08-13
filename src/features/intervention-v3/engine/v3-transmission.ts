import type {
  Centre15Transmission,
  HandoverItemState,
  InterventionScenario,
  InterventionSession,
} from "../v3-domain.ts";
import { readFact } from "../facts/read-fact.ts";
import { regulatorQuestionsForSession } from "./v3-gaps.ts";

const factIsCurrent = (session: InterventionSession, factId: string) => {
  const read = readFact(session, factId);
  return read.status === "known" && !read.isStale;
};

/**
 * Construit la transmission depuis les faits effectivement recueillis. Les
 * constantes cachées ne sont jamais consultées. La sélection peut ensuite être
 * fournie par l'UI finale ; par défaut le moteur tente de transmettre tous les
 * éléments attendus et annonce explicitement ceux qui manquent.
 */
export function buildCentre15Transmission(
  session: InterventionSession,
  scenario: InterventionScenario,
  selectedItemIds: readonly string[] = scenario.handoverItems
    .filter((item) => item.expected)
    .map((item) => item.id),
): Centre15Transmission {
  const selected = new Set(selectedItemIds);
  const itemStates: Record<string, HandoverItemState> = {};
  for (const item of scenario.handoverItems) {
    const complete =
      item.factIds.length === 0 || item.factIds.every((factId) => factIsCurrent(session, factId));
    if (selected.has(item.id)) {
      itemStates[item.id] = complete
        ? "transmitted"
        : item.disclosable
          ? "disclosed_missing"
          : "silent_gap";
    } else {
      itemStates[item.id] = complete ? "omitted" : "silent_gap";
    }
  }
  return {
    startedAtSeconds: session.simulatedTimeSeconds,
    durationSeconds: 90,
    selection: [...selected],
    itemStates,
    questionsAsked: regulatorQuestionsForSession(session, scenario).map((question) => question.id),
    answers: {},
    instruction: scenario.regulatorInstruction,
    freeAdditions: [],
    rejectedAdditions: [],
  };
}
