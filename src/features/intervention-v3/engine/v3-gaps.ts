import {
  EQUIPMENT_LABELS,
  type FactId,
  type InterventionScenario,
  type InterventionSession,
  type RegulatorQuestion,
} from "../v3-domain.ts";
import { readFact } from "../facts/read-fact.ts";

export type BilanGapKind = "missing" | "stale" | "equipment_missing";

export interface BilanGap {
  factId: FactId;
  label: string;
  kind: BilanGapKind;
  missingEquipmentIds: string[];
  detail: string;
}

/**
 * Calcule les trous à partir de `readFact`, jamais depuis les constantes réelles.
 * Une mesure périmée est un trou distinct d'une mesure jamais réalisée.
 */
export function calculateBilanGaps(
  session: InterventionSession,
  scenario: InterventionScenario,
): BilanGap[] {
  const gaps: BilanGap[] = [];
  for (const factId of scenario.expectedHandoverFactIds) {
    const read = readFact(session, factId);
    if (read.status === "known" && !read.isStale) continue;
    if (read.status === "known") {
      gaps.push({
        factId,
        label: read.fact.label,
        kind: "stale",
        missingEquipmentIds: [],
        detail: `Mesure périmée depuis ${read.ageSeconds} secondes.`,
      });
      continue;
    }
    const missingEquipmentIds =
      read.reason === "equipment_missing"
        ? read.fact.requiresEquipment.filter(
            (id) => !session.equipment.some((entry) => entry.id === id && entry.prepared),
          )
        : [];
    const equipment = missingEquipmentIds.map((id) => EQUIPMENT_LABELS[id]).join(", ");
    gaps.push({
      factId,
      label: read.fact.label,
      kind: read.reason === "equipment_missing" ? "equipment_missing" : "missing",
      missingEquipmentIds,
      detail: equipment ? `Matériel non préparé : ${equipment}.` : read.label,
    });
  }
  return gaps;
}

export const gapFactIdsV3 = (
  session: InterventionSession,
  scenario: InterventionScenario,
): FactId[] => calculateBilanGaps(session, scenario).map((gap) => gap.factId);

export const staleFactIds = (session: InterventionSession, scenario: InterventionScenario) =>
  calculateBilanGaps(session, scenario)
    .filter((gap) => gap.kind === "stale")
    .map((gap) => gap.factId);

export const equipmentBlockedFactIds = (
  session: InterventionSession,
  scenario: InterventionScenario,
) =>
  calculateBilanGaps(session, scenario)
    .filter((gap) => gap.kind === "equipment_missing")
    .map((gap) => gap.factId);

const painQuestion: RegulatorQuestion = {
  id: "question.douleur",
  text: "Avez-vous évalué la douleur ?",
  triggeredByFactId: "fact.eva",
  onOmission: false,
  answers: [
    {
      id: "a1",
      text: "Transmettre l'évaluation chiffrée et l'heure du relevé",
      correct: true,
      rationale: "La transmission rapporte une mesure horodatée, pas une impression.",
    },
    {
      id: "a2",
      text: "Dire seulement que le patient semble douloureux",
      correct: false,
      rationale: "Une impression ne remplace pas une évaluation reproductible.",
    },
    {
      id: "a3",
      text: "Attendre le transport pour l'évaluer",
      correct: false,
      rationale: "La régulation a besoin des éléments disponibles au moment du bilan.",
    },
  ],
};

/** Questions entièrement déclenchées par les trous réellement constatés. */
export function regulatorQuestionsForSession(
  session: InterventionSession,
  scenario: InterventionScenario,
): RegulatorQuestion[] {
  const gaps = new Set(gapFactIdsV3(session, scenario));
  if (gaps.size === 0) return [];
  const questions = scenario.regulatorQuestions.filter((question) =>
    gaps.has(question.triggeredByFactId),
  );
  if (
    gaps.has("fact.eva") &&
    !questions.some((question) => question.triggeredByFactId === "fact.eva")
  ) {
    questions.push(painQuestion);
  }
  return questions;
}
