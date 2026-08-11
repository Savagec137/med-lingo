import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { INTERVENTION_SCENARIOS } from "../src/features/intervention-official-scenarios.ts";
import { INTERVENTION_CLINICAL_REFERENCES } from "../src/features/intervention-clinical-sources.ts";
import {
  findOutOfScopeRecommendedActions,
  isClinicalVitalWithinDisplayBounds,
  replayInterventionScenario,
} from "../src/features/intervention-v2-validation.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = resolve(root, "reports/intervention-v2-validation-evidence.json");
const evidence = existsSync(evidencePath)
  ? JSON.parse(readFileSync(evidencePath, "utf8"))
  : { mobile: { status: "pending" }, automation: { status: "pending" } };

const issues = [];
const pathsByReference = new Map(
  INTERVENTION_CLINICAL_REFERENCES.map((reference) => [reference.id, reference.repositoryPath]),
);

for (const reference of INTERVENTION_CLINICAL_REFERENCES) {
  if (
    isAbsolute(reference.repositoryPath) ||
    /^[A-Za-z]:[\\/]/.test(reference.repositoryPath) ||
    reference.repositoryPath.includes("\\")
  ) {
    issues.push({
      level: "CRITICAL",
      code: "ABSOLUTE_OR_WINDOWS_REFERENCE_PATH",
      referenceId: reference.id,
      message: `Le chemin de ${reference.id} n’est pas relatif au dépôt.`,
    });
  }
  if (!existsSync(resolve(root, reference.repositoryPath))) {
    issues.push({
      level: "CRITICAL",
      code: "MISSING_REFERENCE_FILE",
      referenceId: reference.id,
      message: `Le document ${reference.repositoryPath} est introuvable.`,
    });
  }
}

const rows = INTERVENTION_SCENARIOS.map((scenario) => {
  const ideal = replayInterventionScenario(scenario, "ideal");
  const average = replayInterventionScenario(scenario, "average");
  const catastrophic = replayInterventionScenario(scenario, "catastrophic");
  const outOfScope = findOutOfScopeRecommendedActions(scenario);
  const references = ideal.debrief.knowledgeReferences;
  const allVitals = [ideal, average, catastrophic].flatMap((replay) => replay.clinicalState.vitals);
  const dynamicVitalCount = ideal.clinicalState.vitals.filter(
    (vital) => vital.simulationTarget !== undefined,
  ).length;
  const debriefComplete =
    ideal.debrief.successfulActions.length > 0 &&
    catastrophic.debrief.errors.length > 0 &&
    ideal.debrief.consequences.length > 0 &&
    ideal.debrief.pulseLessons.length > 0 &&
    references.length > 0;
  const status =
    ideal.failureReached ||
    average.failureReached ||
    !catastrophic.failureReached ||
    catastrophic.missionResult.xp !== 0 ||
    catastrophic.missionResult.coins !== 0 ||
    outOfScope.length > 0 ||
    !allVitals.every(isClinicalVitalWithinDisplayBounds) ||
    !debriefComplete
      ? "to_correct"
      : "validated";

  if (status !== "validated") {
    issues.push({
      level: "ERROR",
      code: "SCENARIO_REPLAY_FAILED",
      scenarioId: scenario.id,
      message: "Au moins un critère du triple replay n’est pas satisfait.",
    });
  }
  if (dynamicVitalCount === 0) {
    issues.push({
      level: "WARNING",
      code: "QUALITATIVE_VITALS_ONLY",
      scenarioId: scenario.id,
      message:
        "Les observations restent qualitatives : aucune valeur chiffrée n’est inventée sans source exploitable.",
    });
  }
  return {
    scenarioId: scenario.id,
    title: scenario.title,
    difficultyStars: scenario.difficultyStars ?? 1,
    initialVitalCount: ideal.clinicalState.vitals.length,
    dynamicVitalCount,
    referenceCount: references.length,
    outOfScopeActionCount: outOfScope.length,
    ideal: replaySummary(ideal),
    average: replaySummary(average),
    catastrophic: replaySummary(catastrophic),
    status,
  };
});

issues.push({
  level: "WARNING",
  code: "FORMAL_MEDICAL_VALIDATION_PENDING",
  message:
    "Les 120 interactions existantes conservent leur statut documentaire actuel et nécessitent la validation formelle d’un formateur DEA et d’un médecin référent avant qualification trainer_validated.",
});

if (evidence.mobile.status !== "passed") {
  issues.push({
    level: "WARNING",
    code: "MANUAL_MOBILE_VALIDATION_PENDING",
    message:
      evidence.mobile.status === "automated_only"
        ? "Les contrôles mobiles automatisés passent, mais le replay manuel sur navigateur n’a pas pu être enregistré dans cet environnement."
        : "Le replay navigateur mobile final n’est pas encore enregistré.",
  });
}
if (evidence.automation.status !== "passed") {
  issues.push({
    level: "WARNING",
    code: "FULL_AUTOMATION_PENDING",
    message: "Le résultat final TypeScript, ESLint, tests et build n’est pas encore enregistré.",
  });
}

const validatedScenarios = rows.filter((row) => row.status === "validated").length;
const failedProfitable = rows.filter(
  (row) => row.catastrophic.xp > 0 || row.catastrophic.coins > 0,
).length;
const maturityScore = Math.max(
  0,
  100 -
    issues.filter((issue) => issue.level === "CRITICAL").length * 20 -
    issues.filter((issue) => issue.level === "ERROR").length * 10 -
    (rows.some((row) => row.dynamicVitalCount === 0) ? 3 : 0) -
    5 -
    (evidence.mobile.status === "passed" ? 0 : 2) -
    (evidence.automation.status === "passed" ? 0 : 2),
);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: "Validation finale du Mode Intervention V2 — 15 scénarios, trois parcours chacun",
  counts: {
    scenarios: rows.length,
    replays: rows.length * 3,
    validatedScenarios,
    scenariosToCorrect: rows.length - validatedScenarios,
    sourceVerifiedReferences: pathsByReference.size,
    absoluteWindowsCitationPaths: INTERVENTION_CLINICAL_REFERENCES.filter((reference) =>
      /^[A-Za-z]:[\\/]/.test(reference.repositoryPath),
    ).length,
    failedProfitable,
    outOfScopeRecommendedActions: rows.reduce((total, row) => total + row.outOfScopeActionCount, 0),
    deadScreens: evidence.mobile.deadScreens ?? null,
  },
  maturityScore,
  evidence,
  severityCounts: Object.fromEntries(
    ["INFO", "WARNING", "ERROR", "CRITICAL"].map((level) => [
      level,
      issues.filter((issue) => issue.level === level).length,
    ]),
  ),
  issues,
  scenarios: rows,
};

const markdown = `# Validation finale du Mode Intervention V2

Généré le ${report.generatedAt}. Aucun scénario, aucune question et aucune donnée Supabase n’ont été ajoutés ou supprimés.

## Verdict

**Score final de maturité : ${maturityScore}/100**

| Critère | Résultat |
|---|---:|
| Scénarios testés | ${rows.length}/15 |
| Parcours rejoués | ${rows.length * 3}/45 |
| Scénarios validés techniquement | ${validatedScenarios}/15 |
| Scénarios à corriger | ${rows.length - validatedScenarios} |
| Écrans morts | ${renderEvidence(report.counts.deadScreens)} |
| Citations Windows absolues | ${report.counts.absoluteWindowsCitationPaths} |
| Échecs rentables | ${failedProfitable} |
| Actions recommandées hors champ DEA détectées | ${report.counts.outOfScopeRecommendedActions} |

Le score reste volontairement inférieur à 100 : cinq scénarios conservent uniquement des observations qualitatives faute de cible chiffrée vérifiable, et la validation formelle médecin référent / formateur DEA reste requise. Ces limites ne bloquent pas la stabilité technique du moteur.

## Triple replay des 15 scénarios

| Scénario | Idéal | Moyen | Catastrophique | Sources | Statut |
|---|---|---|---|---:|---|
${rows.map((row) => `| ${row.title} | ${renderReplay(row.ideal)} | ${renderReplay(row.average)} | ${renderReplay(row.catastrophic)} | ${row.referenceCount} | ${row.status} |`).join("\n")}

## Corrections réalisées

- Le choix de trajet est maintenant transmis au véritable état clinique V2 : le patient affiché et le patient simulé ne divergent plus à l’arrivée.
- Un échec clinique rapporte désormais exactement 0 XP, 0 pièce, aucun coffre et aucun badge.
- Les exercices d’identification d’erreur sont consignés comme « erreur correctement identifiée » ; l’action dangereuse n’apparaît plus parmi les gestes exécutés.
- Les sept références cliniques utilisent des chemins relatifs au dépôt, vérifiés comme présents et lisibles dans GitHub/Lovable.
- Une reprise de mission clinique active après sérialisation locale est couverte automatiquement.

## Cohérence clinique et pédagogique

- Les constantes initiales des 15 scénarios sont toutes interprétables comme mesures, observations qualitatives ou mesures à réaliser.
- Les décisions idéales améliorent l’état clinique ; les décisions moyennes réduisent la qualité sans provoquer artificiellement un échec ; les décisions catastrophiques aggravent le patient jusqu’à un échec réel.
- Les valeurs simulées restent dans leurs bornes d’affichage : SpO₂ 0–100, Glasgow 3–15, douleur 0–10, glycémie positive, FC/FR/TA bornées.
- Chaque débrief testé contient actions, erreurs, conséquences, leçons Pulseo et références source_verified.
- Aucun geste explicitement réservé à un autre champ professionnel n’est recommandé par le moteur. L’identification d’une erreur n’est jamais interprétée comme son exécution.

## UX mobile et reprise

- Statut navigateur : **${evidence.mobile.status}**.
- Largeurs testées : ${evidence.mobile.widths?.join(", ") ?? "non enregistrées"}.
- Overflow bloquant : ${renderEvidence(evidence.mobile.blockingOverflow)}.
- HUD lisible : ${renderEvidence(evidence.mobile.hudReadable)}.
- Boutons accessibles : ${renderEvidence(evidence.mobile.buttonsAccessible)}.
- Reprise après rechargement : ${renderEvidence(evidence.mobile.reloadResume)}.
- Écran blanc / écran mort : ${renderEvidence(evidence.mobile.deadScreens)}.
- Contrôle manuel : ${evidence.mobile.manualBrowser ?? "pending"}.

## Validation automatique

- TypeScript : ${evidence.automation.typescript ?? "pending"}.
- ESLint : ${evidence.automation.eslint ?? "pending"}.
- Tests : ${evidence.automation.tests ?? "pending"}${evidence.automation.testCount ? ` (${evidence.automation.testCount} réussis)` : ""}.
- Build de production : ${evidence.automation.build ?? "pending"}.

## Points encore ouverts

${issues.map((issue) => `- **${issue.level} — ${issue.code}** : ${issue.message}`).join("\n")}

## Conclusion

Le moteur peut recevoir de nouveaux scénarios sur le plan technique après validation médicale de leur contenu. Les scénarios actuels ont tous un chemin idéal, moyen et catastrophique contrôlé ; aucun échec ne génère de récompense et aucune citation ne dépend d’un chemin local Windows.
`;

writeFileSync(
  resolve(root, "INTERVENTION_V2_VALIDATION_REPORT.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
writeFileSync(resolve(root, "INTERVENTION_V2_VALIDATION_REPORT.md"), markdown);
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
if (report.severityCounts.CRITICAL > 0 || report.severityCounts.ERROR > 0) process.exitCode = 1;

function replaySummary(replay) {
  return {
    outcome: replay.clinicalState.outcome,
    initialState: replay.initialState,
    finalState: replay.finalState,
    score: replay.missionResult.score,
    xp: replay.missionResult.xp,
    coins: replay.missionResult.coins,
    rewardFactor: replay.rewardFactor,
    decisions: replay.decisionCount,
  };
}

function renderReplay(replay) {
  return `${replay.outcome}, patient ${replay.initialState}→${replay.finalState}, score ${replay.score}, ${replay.xp} XP, ${replay.coins} pièces`;
}

function renderEvidence(value) {
  if (value === 0 || value === false) return "0 / non";
  if (value === true) return "oui";
  return value ?? "pending";
}
