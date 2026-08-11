import type { ClinicalKnowledgeReference } from "./intervention-clinical-domain.ts";

/**
 * Références déjà présentes dans la Master Knowledge Base et marquées
 * source_verified. Elles documentent le moteur sans transformer une valeur de
 * simulation en protocole de soins.
 */
export const INTERVENTION_CLINICAL_REFERENCES: readonly ClinicalKnowledgeReference[] = [
  {
    id: "intervention-clinical-data",
    knowledgeId: "K-JORF-DEA-004",
    title: "Données cliniques, soins et transmission",
    sourceDocument: "DOC-JORF-2022-04-17-0091-0039",
    sourcePages: "10",
    reviewStatus: "source_verified",
    phases: ["primary", "secondary", "care", "decision", "transport", "debrief"],
  },
  {
    id: "intervention-safe-driving",
    knowledgeId: "K-SEC-2026-032",
    title: "Priorité et obligation de sécurité",
    sourceDocument: "DOC-SECURITE-ROUTIERE-URGENCE-2026",
    sourcePages: "14",
    reviewStatus: "source_verified",
    phases: ["arrival", "safety"],
  },
  {
    id: "intervention-time-versus-safety",
    knowledgeId: "K-SEC-2026-033",
    title: "Gain de temps et sécurité routière",
    sourceDocument: "DOC-SECURITE-ROUTIERE-URGENCE-2026",
    sourcePages: "14-15",
    reviewStatus: "source_verified",
    phases: ["arrival", "safety"],
  },
  {
    id: "intervention-blood-pressure",
    knowledgeId: "K-DEA-P05-013",
    title: "Mesure manuelle de la pression artérielle",
    sourceDocument: "DOC-AFTRAL-DEA-B2-M4-2022",
    sourcePages: "66,67",
    reviewStatus: "source_verified",
    phases: ["primary", "secondary", "transport"],
    vitalIds: ["blood-pressure"],
  },
  {
    id: "intervention-pulse",
    knowledgeId: "K-DEA-P05-014",
    title: "Évaluation du pouls",
    sourceDocument: "DOC-AFTRAL-DEA-B2-M4-2022",
    sourcePages: "67,68",
    reviewStatus: "source_verified",
    phases: ["primary", "secondary", "transport"],
    vitalIds: ["heart-rate"],
  },
  {
    id: "intervention-respiratory-rate",
    knowledgeId: "K-DEA-P06-010",
    title: "Mesure de la fréquence respiratoire",
    sourceDocument: "DOC-AFTRAL-DEA-B2-M4-2022",
    sourcePages: "71,72",
    reviewStatus: "source_verified",
    phases: ["primary", "secondary", "transport"],
    vitalIds: ["respiratory-rate"],
  },
  {
    id: "intervention-spo2",
    knowledgeId: "K-DEA-P06-012",
    title: "Oxymètre de pouls et SpO₂",
    sourceDocument: "DOC-AFTRAL-DEA-B2-M4-2022",
    sourcePages: "72",
    reviewStatus: "source_verified",
    phases: ["primary", "secondary", "transport"],
    vitalIds: ["oxygen-saturation"],
  },
] as const;

export function getClinicalReferences(
  phases: readonly ClinicalKnowledgeReference["phases"][number][],
  vitalIds: readonly NonNullable<ClinicalKnowledgeReference["vitalIds"]>[number][],
) {
  const phaseSet = new Set(phases);
  const vitalSet = new Set(vitalIds);
  return INTERVENTION_CLINICAL_REFERENCES.filter(
    (reference) =>
      reference.phases.some((phase) => phaseSet.has(phase)) ||
      reference.vitalIds?.some((vitalId) => vitalSet.has(vitalId)),
  );
}
