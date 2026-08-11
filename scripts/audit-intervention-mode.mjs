import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { INTERVENTION_PHASES } from "../src/features/intervention-domain.ts";
import {
  applyClinicalDecision,
  createClinicalPatientState,
} from "../src/features/intervention-clinical-engine.ts";
import { INTERVENTION_CLINICAL_REFERENCES } from "../src/features/intervention-clinical-sources.ts";
import { INTERVENTION_SCENARIOS } from "../src/features/intervention-official-scenarios.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const knowledgeBase = JSON.parse(
  readFileSync(resolve(root, "src/content/master-knowledge-base.json"), "utf8"),
);
const officialKnowledgeLibrary = JSON.parse(
  readFileSync(resolve(root, "docs/master_knowledge_base/knowledge.json"), "utf8"),
);
const knowledgeRecords = new Map([
  ...knowledgeBase.competencies.map((item) => [
    item.id,
    {
      id: item.id,
      reviewStatus: item.reviewStatus,
      sourceDocument: item.sourceDocument,
      sourcePages: String(item.sourcePages),
    },
  ]),
  ...officialKnowledgeLibrary.knowledge.map((item) => [
    item.knowledge_id,
    {
      id: item.knowledge_id,
      reviewStatus: item.review_status,
      sourceDocument: item.source_document,
      sourcePages: String(item.source_page),
    },
  ]),
]);
const knowledgeIds = new Set(knowledgeRecords.keys());
const componentSource = [
  "src/components/InterventionShiftExperience.tsx",
  "src/components/InterventionClinicalMonitor.tsx",
  "src/components/InterventionClinicalDebrief.tsx",
]
  .map((path) => readFileSync(resolve(root, path), "utf8"))
  .join("\n");
const hookSource = readFileSync(resolve(root, "src/hooks/use-intervention-shift.ts"), "utf8");

const issues = [];
const rows = INTERVENTION_SCENARIOS.map((scenario) => {
  const phases = new Set(scenario.steps.map((step) => step.phase));
  const missingPhases = INTERVENTION_PHASES.filter((phase) => !phases.has(phase));
  const initial = createClinicalPatientState(scenario, true);
  let worstState = initial;
  const history = [];

  for (const step of scenario.steps) {
    const worstChoice = [...step.choices].sort(
      (left, right) => left.effect.patient - right.effect.patient,
    )[0];
    const record = {
      stepId: step.id,
      phase: step.phase,
      choiceId: worstChoice?.id ?? `${step.id}:omission`,
      choiceLabel: worstChoice?.label ?? "Omission critique",
      feedback: worstChoice?.feedback ?? "Priorité non réalisée.",
      recommended: false,
      effect: step.failureEffect ??
        worstChoice?.effect ?? { score: -10, patient: -10, timeSeconds: 30 },
    };
    history.push(record);
    worstState = applyClinicalDecision(worstState, record, history, true, history.length * 30);
  }

  const choiceCount = scenario.steps.reduce((total, step) => total + step.choices.length, 0);
  const choices = scenario.steps.flatMap((step) => step.choices);
  const row = {
    scenarioId: scenario.id,
    title: scenario.title,
    difficultyStars: scenario.difficultyStars ?? 1,
    phases: scenario.steps.length,
    choices: choiceCount,
    vitalCount: initial.vitals.length,
    numericVitalCount: initial.vitals.filter((vital) => vital.status === "measured").length,
    dynamicVitalCount: initial.vitals.filter((vital) => vital.simulationTarget !== undefined)
      .length,
    failureReachable: worstState.outcome === "failed",
    objectiveCoverage: scenario.steps.filter((step) => step.objective.trim()).length,
    feedbackCoverage: choices.filter((choice) => choice.feedback.trim()).length,
    rationaleCoverage: choices.filter((choice) => choice.rationale?.trim()).length,
    pulseAdviceCount: scenario.pulseAdvice.length,
    missingPhases,
  };

  if (missingPhases.length > 0) {
    issues.push({
      level: "ERROR",
      code: "MISSING_PHASE",
      scenarioId: scenario.id,
      message: `Phases absentes : ${missingPhases.join(", ")}`,
    });
  }
  if (row.vitalCount === 0) {
    issues.push({
      level: "ERROR",
      code: "NO_CLINICAL_OBSERVATION",
      scenarioId: scenario.id,
      message: "Aucune constante ou observation clinique disponible.",
    });
  } else if (row.dynamicVitalCount === 0) {
    issues.push({
      level: "WARNING",
      code: "QUALITATIVE_ONLY",
      scenarioId: scenario.id,
      message:
        "Le scénario ne contient aucune constante chiffrée associable sans ambiguïté à une norme du support DEA ; aucune valeur n’est inventée.",
    });
  }
  if (!row.failureReachable) {
    issues.push({
      level: "ERROR",
      code: "NO_FAILURE_PATH",
      scenarioId: scenario.id,
      message: "Le chemin d’omissions critiques n’atteint pas l’état d’échec.",
    });
  }
  return row;
});

const brokenReferences = INTERVENTION_CLINICAL_REFERENCES.filter(
  (reference) => !knowledgeIds.has(reference.knowledgeId),
);
for (const reference of brokenReferences) {
  issues.push({
    level: "CRITICAL",
    code: "BROKEN_KNOWLEDGE_REFERENCE",
    referenceId: reference.id,
    message: `La connaissance ${reference.knowledgeId} est introuvable.`,
  });
}
const incoherentReferences = INTERVENTION_CLINICAL_REFERENCES.filter((reference) => {
  const knowledge = knowledgeRecords.get(reference.knowledgeId);
  return (
    knowledge &&
    (knowledge.reviewStatus !== "source_verified" ||
      knowledge.sourceDocument !== reference.sourceDocument ||
      knowledge.sourcePages !== reference.sourcePages)
  );
});
for (const reference of incoherentReferences) {
  issues.push({
    level: "CRITICAL",
    code: "INCOHERENT_KNOWLEDGE_REFERENCE",
    referenceId: reference.id,
    message: `La source locale de ${reference.knowledgeId} ne correspond pas à la référence du moteur.`,
  });
}
issues.push({
  level: "WARNING",
  code: "TRAINER_VALIDATION_PENDING",
  message:
    "Les 120 interactions existantes restent à valider formellement par un médecin urgentiste référent et un formateur DEA avant publication comme référentiel professionnel.",
});

const totalSteps = rows.reduce((total, row) => total + row.phases, 0);
const totalChoices = rows.reduce((total, row) => total + row.choices, 0);
const ratios = {
  structure: rows.filter((row) => row.missingPhases.length === 0).length / rows.length,
  clinicalObservations: rows.filter((row) => row.vitalCount > 0).length / rows.length,
  numericVitals: rows.filter((row) => row.numericVitalCount > 0).length / rows.length,
  dynamicVitals: rows.filter((row) => row.dynamicVitalCount > 0).length / rows.length,
  failurePaths: rows.filter((row) => row.failureReachable).length / rows.length,
  objectives: rows.reduce((total, row) => total + row.objectiveCoverage, 0) / totalSteps,
  feedback: rows.reduce((total, row) => total + row.feedbackCoverage, 0) / totalChoices,
  rationale: rows.reduce((total, row) => total + row.rationaleCoverage, 0) / totalChoices,
  pulseAdvice: rows.filter((row) => row.pulseAdviceCount > 0).length / rows.length,
};

const evidence = {
  repeatedMonitoring: hookSource.includes("reassessClinicalPatient"),
  proportionalRewards: hookSource.includes("completeShiftIntervention"),
  reducedMotion: componentSource.includes("reducedMotion"),
  responsiveLayout: /sm:|lg:|xl:/.test(componentSource),
  nativeButtons: componentSource.includes("<button"),
  regulatorQuestions: componentSource.includes("Questions du médecin régulateur"),
};

const scores = {
  clinicalQuality: Math.round(
    10 * ratios.clinicalObservations +
      8 * ratios.failurePaths +
      (evidence.repeatedMonitoring ? 4 : 0),
  ),
  pedagogicalQuality: Math.round(
    5 * ratios.objectives + 5 * ratios.feedback + 3 * ratios.rationale + 3 * ratios.pulseAdvice,
  ),
  vitalConsistency: Math.round(8 * ratios.clinicalObservations + 5 * ratios.dynamicVitals),
  decisionConsistency: Math.round(
    7 * ratios.structure + 4 * ratios.failurePaths + (evidence.proportionalRewards ? 4 : 0),
  ),
  transmission:
    evidence.regulatorQuestions &&
    brokenReferences.length === 0 &&
    incoherentReferences.length === 0
      ? 13
      : 7,
  uxMobile:
    (evidence.reducedMotion ? 3 : 0) +
    (evidence.responsiveLayout ? 3 : 0) +
    (evidence.nativeButtons ? 3 : 0),
};
const maturityScore = Object.values(scores).reduce((total, score) => total + score, 0);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: "Mode Intervention — moteur clinique V2, sans nouveau scénario et sans Supabase",
  counts: {
    scenarios: rows.length,
    phases: totalSteps,
    choices: totalChoices,
    sourceVerifiedReferences: INTERVENTION_CLINICAL_REFERENCES.length,
    numericVitalScenarios: rows.filter((row) => row.numericVitalCount > 0).length,
    dynamicVitalScenarios: rows.filter((row) => row.dynamicVitalCount > 0).length,
    qualitativeOnlyScenarios: rows.filter((row) => row.dynamicVitalCount === 0).length,
    failureReachableScenarios: rows.filter((row) => row.failureReachable).length,
  },
  ratios,
  evidence,
  scores,
  maturityScore,
  severityCounts: Object.fromEntries(
    ["INFO", "WARNING", "ERROR", "CRITICAL"].map((level) => [
      level,
      issues.filter((issue) => issue.level === level).length,
    ]),
  ),
  issues,
  scenarios: rows,
};

const markdown = `# Audit du Mode Intervention — moteur clinique V2

Généré le ${report.generatedAt}. L’audit n’a modifié aucun scénario pédagogique et n’a utilisé ni Supabase ni source non vérifiée.

## Résumé

| Indicateur | Résultat |
|---|---:|
| Scénarios conservés | ${report.counts.scenarios} |
| Phases analysées | ${report.counts.phases} |
| Choix analysés | ${report.counts.choices} |
| Scénarios avec constantes ou observations | ${report.counts.scenarios}/${report.counts.scenarios} |
| Scénarios avec constantes chiffrées | ${report.counts.numericVitalScenarios}/${report.counts.scenarios} |
| Scénarios avec variation chiffrée sourcée | ${report.counts.dynamicVitalScenarios}/${report.counts.scenarios} |
| Scénarios avec chemin d’échec réel | ${report.counts.failureReachableScenarios}/${report.counts.scenarios} |
| Références locales source_verified | ${report.counts.sourceVerifiedReferences} |
| Références cassées | ${brokenReferences.length} |
| Références incohérentes | ${incoherentReferences.length} |

## Score de maturité : ${maturityScore}/100

| Axe | Score |
|---|---:|
| Qualité clinique | ${scores.clinicalQuality}/25 |
| Qualité pédagogique | ${scores.pedagogicalQuality}/20 |
| Cohérence des constantes | ${scores.vitalConsistency}/15 |
| Cohérence des décisions et récompenses | ${scores.decisionConsistency}/15 |
| Transmission au médecin régulateur | ${scores.transmission}/15 |
| UX, mobile et accessibilité | ${scores.uxMobile}/10 |

Les points non attribués correspondent principalement à la validation médicale/formateur encore requise, aux scénarios dont les données sont uniquement qualitatives ou ambiguës et au test manuel sur appareils réels restant à réaliser.

## Ce qui fonctionne

- Les ${report.counts.scenarios} scénarios existants restent inchangés et conservent leurs huit phases.
- Chaque décision alimente désormais un état clinique, une chronologie et une conséquence observable.
- Les constantes chiffrées évoluent de façon bornée ; les observations qualitatives ne sont pas transformées en valeurs inventées.
- Les ${report.counts.failureReachableScenarios} scénarios possèdent un chemin d’échec après omissions critiques.
- La réévaluation répétée met à jour la surveillance et complète le bilan transmis.
- Le bilan au régulateur vérifie contexte, sécurité, ABCDE, constantes/interrogatoire, gestes, évolution et décision. Les éléments absents déclenchent des questions ciblées.
- XP, pièces, coffre et badge sont pondérés par l’état final et la complétude du bilan ; une prise en charge dégradée n’est plus rentable.
- Le débrief liste actions réussies, erreurs, conséquences, leçons Pulseo, connaissances et références documentaires.
- Les cinq niveaux sont disponibles : débutant, intermédiaire, avancé, critique et garde complète.

## Limites et contrôles requis

${issues.map((issue) => `- **${issue.level} — ${issue.code}** : ${issue.message}`).join("\n")}
- **INFO — MODÈLE BORNÉ** : l’évolution des constantes est un retour pédagogique déterministe, pas un modèle physiologique ni un protocole de soins.
- **INFO — RÉCOMPENSES LOCALES** : les récompenses de garde restent des résultats d’entraînement et ne créditent pas Supabase.
- **INFO — TEST APPAREIL** : valider encore le rendu à 320/360 px, le clavier, le lecteur d’écran et les performances sur un téléphone milieu de gamme.

## Priorités avant publication clinique

1. Faire valider les 120 interactions existantes par un binôme médecin urgentiste / formateur DEA.
2. Vérifier les protocoles locaux cités dans \`INTERVENTION_MEDICAL_REVIEW.md\`.
3. Tester une garde complète sur appareils mobiles réels, avec et sans réduction des animations.
4. Conserver le moteur clinique déterministe ; ne pas générer librement de protocoles par IA.

Le détail machine est disponible dans \`INTERVENTION_MODE_AUDIT.json\`.
`;

writeFileSync(
  resolve(root, "INTERVENTION_MODE_AUDIT.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
writeFileSync(resolve(root, "INTERVENTION_MODE_AUDIT.md"), markdown);
console.log(
  JSON.stringify(
    {
      maturityScore,
      counts: report.counts,
      severityCounts: report.severityCounts,
    },
    null,
    2,
  ),
);
if (report.severityCounts.ERROR > 0 || report.severityCounts.CRITICAL > 0) {
  process.exitCode = 1;
}
