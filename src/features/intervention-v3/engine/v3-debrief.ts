import {
  findKnowledge,
  findLibraryKnowledge,
  getDocument,
} from "../../../content/library/library-catalog.ts";
import { getAction } from "../actions/action-catalog.ts";
import { getFact } from "../facts/fact-registry.ts";
import { sourceTrust } from "../facts/source-trust.ts";
import {
  PHASE_LABELS,
  V3_PHASES,
  type ActionLogEntry,
  type DebriefReference,
  type DebriefReport,
  type DebriefReviewEntry,
  type InterventionScenario,
  type InterventionSession,
  type TimelineNode,
} from "../v3-domain.ts";
import {
  graveFaultCount,
  isV3Failure,
  livesFromActionLog,
  rewardFromPerformance,
  scoreAxesFromLog,
  scoreFromActionLog,
} from "./v3-scoring.ts";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const totalTimeFromLog = (actionLog: readonly ActionLogEntry[]) =>
  actionLog.reduce((sum, entry) => {
    if (entry.outcome === "refused") return sum;
    return sum + getAction(entry.actionId).timeSeconds;
  }, 0);

function timelineFromLog(actionLog: readonly ActionLogEntry[]): TimelineNode[] {
  return V3_PHASES.filter((phase) => phase !== "new_call" && phase !== "debrief").map((phase) => {
    const entries = actionLog.filter((entry) => entry.phase === phase);
    const hasError = entries.some((entry) => entry.scoreDelta < 0);
    const hasRefusal = entries.some((entry) => entry.outcome === "refused");
    return {
      id: `timeline.${phase}`,
      label: PHASE_LABELS[phase],
      phases: [phase],
      durationSeconds: entries.reduce(
        (sum, entry) =>
          sum + (entry.outcome === "refused" ? 0 : getAction(entry.actionId).timeSeconds),
        0,
      ),
      status: hasError ? "error" : hasRefusal || entries.length === 0 ? "partial" : "success",
      ...(hasError
        ? { reason: "Une décision a eu une conséquence négative pendant cette phase." }
        : {}),
    };
  });
}

function reviewFromLog(actionLog: readonly ActionLogEntry[]): DebriefReviewEntry[] {
  return actionLog.flatMap((entry) => {
    if (entry.outcome === "applied" && entry.scoreDelta >= 0) return [];
    const action = getAction(entry.actionId);
    const severity =
      entry.flag === "unsafe-approach" || entry.flag === "premature-transport"
        ? ("error" as const)
        : ("warning" as const);
    const label =
      entry.outcome === "refused"
        ? `${action.label} : ${entry.refusalReason ?? "action impossible"}`
        : `${action.label} : décision réalisée sans les prérequis attendus.`;
    return [
      {
        severity,
        label,
        ...(action.knowledgeId ? { knowledgeId: action.knowledgeId } : {}),
        replayFromSeconds: entry.atSeconds,
      },
    ];
  });
}

function referenceFor(knowledgeId: string): DebriefReference | undefined {
  if (knowledgeId.startsWith("library.")) {
    const knowledge = findLibraryKnowledge(knowledgeId);
    if (!knowledge) return undefined;
    const document = getDocument(knowledge.sourceDocument);
    return {
      knowledgeId,
      title: knowledge.title,
      subtitle: `${document.title} · ${knowledge.sourceSection}`,
      trust: sourceTrust(document.documentId),
    };
  }
  const knowledge = findKnowledge(knowledgeId);
  if (!knowledge) return undefined;
  const document = getDocument(knowledge.sourceDocument);
  return {
    knowledgeId,
    title: knowledge.title,
    subtitle: `${document.title} · ${knowledge.sourceSection}`,
    trust: sourceTrust(document.documentId),
  };
}

function referencesFromLog(actionLog: readonly ActionLogEntry[]): DebriefReference[] {
  const ids = Array.from(
    new Set(
      actionLog
        .map((entry) => getAction(entry.actionId).knowledgeId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  return ids
    .map(referenceFor)
    .filter((reference): reference is DebriefReference => Boolean(reference));
}

/**
 * Reconstruit la couverture sans consulter `revealedFacts`, le matériel ou la
 * phase courante. Un état de session altéré après coup ne peut ainsi modifier
 * le débrief. Les faits de régulation/scène sont connus par définition ; les
 * autres doivent apparaître dans une action réellement exécutée.
 */
function factCoverageFromLog(
  actionLog: readonly ActionLogEntry[],
  scenario: InterventionScenario,
): DebriefReport["factCoverage"] {
  const known = new Set(
    scenario.factIds.filter((factId) => {
      const visibility = getFact(factId).visibility;
      return visibility === "always" || visibility === "on_arrival";
    }),
  );

  for (const entry of actionLog) {
    if (entry.outcome === "refused") continue;
    for (const factId of entry.revealedFactIds) known.add(factId);
  }

  let addedDependency = true;
  while (addedDependency) {
    addedDependency = false;
    for (const factId of scenario.factIds) {
      const fact = getFact(factId);
      if (
        fact.visibility === "on_dependency" &&
        fact.dependsOn.every((dependency) => known.has(dependency)) &&
        !known.has(factId)
      ) {
        known.add(factId);
        addedDependency = true;
      }
    }
  }

  return scenario.factIds.map((factId) => ({
    factId,
    label: getFact(factId).label,
    state: known.has(factId) ? "measured" : "not_measured",
  }));
}

/**
 * Débrief déterministe : deux sessions portant le même `actionLog` produisent
 * la même note, les mêmes erreurs, la même trajectoire et les mêmes gains.
 */
export function createDebriefReport(
  session: InterventionSession,
  scenario: InterventionScenario,
): DebriefReport {
  const score = scoreFromActionLog(session.actionLog);
  const lives = livesFromActionLog(session.actionLog);
  const patientState = clamp(
    scenario.startingPatient +
      session.actionLog.reduce((sum, entry) => sum + entry.patientDelta, 0),
    0,
    100,
  );
  const failed = isV3Failure(score, patientState, lives);
  const patientDelta = patientState - scenario.startingPatient;
  const trajectory = failed
    ? ("echec" as const)
    : patientDelta > 2
      ? ("amelioration" as const)
      : patientDelta < -2
        ? ("aggravation" as const)
        : ("stabilisation" as const);
  const timeline = timelineFromLog(session.actionLog);
  return {
    scenarioId: scenario.id,
    passed: !failed,
    ...(failed
      ? {
          failureReason:
            lives <= 0
              ? "Toutes les vies ont été perdues."
              : patientState <= 0
                ? "Le patient a été perdu."
                : "Le score minimal de prise en charge n'est pas atteint.",
        }
      : {}),
    score,
    stars: Math.max(1, Math.round((score / 20) * 2) / 2),
    globalRating:
      score >= 90
        ? "Performance excellente"
        : score >= 75
          ? "Très bonne prise en charge"
          : score >= 60
            ? "Prise en charge satisfaisante"
            : "Prise en charge à revoir",
    totalSeconds: totalTimeFromLog(session.actionLog),
    axes: scoreAxesFromLog(session.actionLog),
    criticalErrorCount: graveFaultCount(session.actionLog),
    livesRemaining: lives,
    timeline,
    trajectory,
    reward: rewardFromPerformance(scenario, {
      actionLog: session.actionLog,
      xpBonus: 0,
      rewardBonus: 0,
    }),
    review: reviewFromLog(session.actionLog),
    references: referencesFromLog(session.actionLog),
    factCoverage: factCoverageFromLog(session.actionLog, scenario),
  };
}
