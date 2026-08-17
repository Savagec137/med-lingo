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
  type DebriefStrength,
  type FactId,
  type GestureReviewEntry,
  type HandoverItemState,
  type HandoverReviewEntry,
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
  scoreFromSession,
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
 *
 * Cette propriété est vérifiée par un test qui retourne tout le matériel, gonfle
 * le score et révèle de force les faits attendus, puis exige un débrief identique.
 * Les sections gestes et transmission, elles, ne peuvent pas s'en tenir au
 * journal : un geste retenu n'est pas une action du catalogue, et la qualité d'une
 * transmission ne se lit pas dans l'action qui l'a envoyée. Elles lisent donc
 * `gestureRounds` et `transmission`, qui sont aussi des états de session.
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

  // « Hors d'atteinte » se déduit du journal, et de lui seul : une tentative
  // refusée pour matériel manquant prouve que l'appareil n'était pas embarqué.
  // Lire `session.equipment` serait plus simple et plus complet, mais romprait la
  // propriété que ce module tient — un état modifié après coup ne doit pas pouvoir
  // changer le débrief, et un test le vérifie en retournant tout le matériel. Un
  // joueur qui n'a jamais tenté la mesure reste donc en « non mesurée », ce qui
  // est juste : il n'a pas essayé.
  const unreachable = new Set<FactId>();
  for (const entry of actionLog) {
    if (entry.outcome !== "refused") continue;
    if (entry.refusalKind !== "equipment_missing") continue;
    for (const factId of getAction(entry.actionId).reveals) unreachable.add(factId);
  }
  const expected = new Set(scenario.expectedHandoverFactIds);

  return scenario.factIds.map((factId) => {
    const fact = getFact(factId);
    return {
      factId,
      label: fact.label,
      state: known.has(factId)
        ? "measured"
        : unreachable.has(factId)
          ? "not_measurable"
          : "not_measured",
      expected: expected.has(factId),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Ce que le joueur a bien fait                                               */
/* -------------------------------------------------------------------------- */

/**
 * Réussites relevées avec la même exigence que les fautes : à partir de ce qui a
 * été joué, jamais par un compliment générique. Un débriefing qui ne liste que
 * les erreurs n'enseigne qu'à moitié — l'apprenant ne sait pas quoi reproduire.
 */
function strengthsFromSession(
  session: InterventionSession,
  scenario: InterventionScenario,
  coverage: DebriefReport["factCoverage"],
): DebriefStrength[] {
  const strengths: DebriefStrength[] = [];

  const secured = session.actionLog.some(
    (entry) => entry.actionId === "action.securiser-scene" && entry.outcome === "applied",
  );
  if (secured) {
    strengths.push({ label: "Zone sécurisée avant d'approcher le patient.", axis: "securite" });
  }

  const measured = coverage.filter((item) => item.expected && item.state === "measured").length;
  const expectedCount = coverage.filter((item) => item.expected).length;
  if (expectedCount > 0 && measured === expectedCount) {
    strengths.push({
      label: "Bilan complet : toutes les données attendues ont été recueillies.",
      axis: "bilan",
    });
  } else if (measured >= Math.ceil(expectedCount * 0.75)) {
    strengths.push({
      label: `Bilan largement recueilli : ${measured} données attendues sur ${expectedCount}.`,
      axis: "bilan",
    });
  }

  const transmission = session.transmission;
  if (transmission) {
    const states = Object.values(transmission.itemStates);
    if (!states.includes("silent_gap")) {
      strengths.push({
        label: "Aucun trou passé sous silence dans la transmission.",
        axis: "communication",
      });
    }
    const answered = Object.entries(transmission.answers).filter(([questionId, answerId]) => {
      const question = scenario.regulatorQuestions.find((entry) => entry.id === questionId);
      return question?.answers.find((entry) => entry.id === answerId)?.correct === true;
    }).length;
    if (answered > 0) {
      strengths.push({
        label: `${answered} question${answered > 1 ? "s" : ""} du régulateur traitée${answered > 1 ? "s" : ""} correctement.`,
        axis: "communication",
      });
    }
  }

  const goodGestures = session.gestureRounds
    .flatMap((round) => round.choices)
    .filter((choice) => choice.recommended && choice.justified).length;
  if (goodGestures > 0) {
    strengths.push({
      label: `${goodGestures} geste${goodGestures > 1 ? "s" : ""} prioritaire${goodGestures > 1 ? "s" : ""} fondé${goodGestures > 1 ? "s" : ""} sur le bilan recueilli.`,
      axis: "gestes",
    });
  }

  const reevaluated = session.reevaluations.filter((cycle) => cycle.validated).length;
  if (reevaluated > 0) {
    strengths.push({
      label: `${reevaluated} réévaluation${reevaluated > 1 ? "s" : ""} menée${reevaluated > 1 ? "s" : ""} à son terme.`,
      axis: "transport",
    });
  }
  return strengths;
}

/* -------------------------------------------------------------------------- */
/* Les erreurs de transmission                                                */
/* -------------------------------------------------------------------------- */

const HANDOVER_DETAILS: Record<HandoverItemState, string | null> = {
  transmitted: null,
  disclosed_missing:
    "Manquant, mais annoncé au régulateur : la régulation savait sur quoi elle décidait.",
  omitted: "L'information avait été recueillie et n'a pas été transmise.",
  silent_gap:
    "Information manquante et passée sous silence : le régulateur a décidé en croyant le bilan complet.",
};

function handoverReviewFromSession(
  session: InterventionSession,
  scenario: InterventionScenario,
): HandoverReviewEntry[] {
  const transmission = session.transmission;
  if (!transmission) return [];
  return scenario.handoverItems
    .filter((item) => item.expected)
    .map((item) => ({ item, state: transmission.itemStates[item.id] ?? "silent_gap" }))
    .filter(({ state }) => state !== "transmitted")
    .map(({ item, state }) => ({
      itemId: item.id,
      label: item.label,
      state,
      silent: state === "silent_gap",
      detail: HANDOVER_DETAILS[state] ?? "",
    }));
}

/* -------------------------------------------------------------------------- */
/* Les gestes                                                                 */
/* -------------------------------------------------------------------------- */

function gestureReviewFromSession(session: InterventionSession): GestureReviewEntry[] {
  const entries: GestureReviewEntry[] = [];
  for (const round of session.gestureRounds) {
    const offered = new Map(round.offered.map((gesture) => [gesture.id, gesture]));

    for (const attempt of round.refused) {
      entries.push({
        gestureId: attempt.gestureId,
        label: offered.get(attempt.gestureId)?.label ?? attempt.gestureId,
        kind: "refused",
        detail: attempt.reason,
      });
    }
    for (const choice of round.choices) {
      const gesture = offered.get(choice.gestureId);
      if (!choice.recommended) {
        entries.push({
          gestureId: choice.gestureId,
          label: gesture?.label ?? choice.gestureId,
          kind: "not_indicated",
          detail: "Geste retenu sans élément clinique le rattachant à ce tableau.",
        });
      } else if (!choice.justified) {
        entries.push({
          gestureId: choice.gestureId,
          label: gesture?.label ?? choice.gestureId,
          kind: "unjustified",
          detail: "Bon geste, choisi sans avoir recueilli ce qui le fonde.",
        });
      }
    }
    const selected = new Set(round.selected);
    for (const gesture of round.offered) {
      if (!gesture.recommended || selected.has(gesture.id)) continue;
      entries.push({
        gestureId: gesture.id,
        label: gesture.label,
        kind: "missing",
        detail: gesture.hint,
      });
    }
  }
  return entries;
}

/* -------------------------------------------------------------------------- */
/* La conduite attendue                                                       */
/* -------------------------------------------------------------------------- */

/**
 * La conduite attendue, **assemblée depuis le scénario** et non rédigée.
 *
 * Une conduite écrite en prose finirait par contredire les données : un geste
 * retiré du scénario resterait dans le texte. Ici chaque ligne vient d'une
 * déclaration existante.
 */
function expectedConductFromScenario(scenario: InterventionScenario): string[] {
  const lines: string[] = [];
  const recommended = scenario.gestureRounds
    .flatMap((round) => round.offered)
    .filter((gesture) => gesture.recommended)
    .map((gesture) => gesture.label);
  const expectedItems = scenario.handoverItems
    .filter((item) => item.expected)
    .map((item) => item.label);

  lines.push(`Sécuriser la zone, puis approcher le patient : ${scenario.learningObjective}`);
  if (expectedItems.length > 0) {
    lines.push(`Recueillir et transmettre : ${expectedItems.join(", ")}.`);
  }
  if (recommended.length > 0) {
    lines.push(`Gestes attendus : ${recommended.join(", ")}.`);
  }
  lines.push("Réévaluer les constantes avant le départ, et annoncer tout élément non recueilli.");
  lines.push(scenario.regulatorInstruction);
  return lines;
}

/* -------------------------------------------------------------------------- */
/* Les points à réviser                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Fiches à revoir, tirées des **erreurs commises** et non des actions jouées.
 *
 * `references` liste ce que la mission a mobilisé ; celles-ci listent ce que le
 * joueur doit reprendre. Confondre les deux donnerait à réviser ce qu'il maîtrise
 * déjà.
 */
function revisionPointsFromSession(session: InterventionSession): DebriefReference[] {
  const knowledgeIds = new Set<string>();

  for (const entry of session.actionLog) {
    if (entry.outcome === "applied" && entry.scoreDelta >= 0) continue;
    const knowledgeId = getAction(entry.actionId).knowledgeId;
    if (knowledgeId) knowledgeIds.add(knowledgeId);
  }
  for (const round of session.gestureRounds) {
    const offered = new Map(round.offered.map((gesture) => [gesture.id, gesture]));
    const faulty = [
      ...round.refused.map((attempt) => attempt.gestureId),
      ...round.choices
        .filter((choice) => !choice.recommended || !choice.justified)
        .map((choice) => choice.gestureId),
      ...round.offered
        .filter((gesture) => gesture.recommended && !round.selected.includes(gesture.id))
        .map((gesture) => gesture.id),
    ];
    for (const gestureId of faulty) {
      const knowledgeId = offered.get(gestureId)?.knowledgeId;
      if (knowledgeId) knowledgeIds.add(knowledgeId);
    }
  }
  return [...knowledgeIds]
    .map(referenceFor)
    .filter((reference): reference is DebriefReference => Boolean(reference));
}

/**
 * Débrief déterministe : deux sessions portant le même `actionLog` produisent
 * la même note, les mêmes erreurs, la même trajectoire et les mêmes gains.
 */
export function createDebriefReport(
  session: InterventionSession,
  scenario: InterventionScenario,
): DebriefReport {
  const score = scoreFromSession(session, scenario);
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
  const coverage = factCoverageFromLog(session.actionLog, scenario);
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
    factCoverage: coverage,
    strengths: strengthsFromSession(session, scenario, coverage),
    handoverReview: handoverReviewFromSession(session, scenario),
    gestureReview: gestureReviewFromSession(session),
    expectedConduct: expectedConductFromScenario(scenario),
    revisionPoints: revisionPointsFromSession(session),
  };
}
