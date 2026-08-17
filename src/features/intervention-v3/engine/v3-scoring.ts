import { getAction } from "../actions/action-catalog.ts";
import {
  handoverCommunicationScore,
  HANDOVER_SCORES,
  MAX_ADDITION_BONUS,
  REGULATOR_ANSWER_SCORES,
} from "./v3-transmission.ts";
import {
  GRAVE_FAULT_FLAGS,
  SCORE_AXIS_IDS,
  SCORE_AXIS_LABELS,
  V3_STARTING_LIVES,
  V3_STARTING_SCORE,
  type ActionLogEntry,
  type AxisRating,
  type InterventionScenario,
  type InterventionSession,
  type RewardResult,
  type ScoreAxis,
  type ScoreAxisId,
} from "../v3-domain.ts";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const graveFlags = new Set<string>(GRAVE_FAULT_FLAGS);

const axisForAction = (actionId: string): ScoreAxisId => {
  const category = getAction(actionId).category;
  switch (category) {
    case "secure":
    case "observe":
      return "securite";
    case "examine":
    case "interview":
      return "bilan";
    case "probe":
      return "constantes";
    case "communicate":
      return "communication";
    case "care":
      return "gestes";
    case "logistics":
      return "transport";
  }
};

export const scoreFromActionLog = (actionLog: readonly ActionLogEntry[]) =>
  clamp(V3_STARTING_SCORE + actionLog.reduce((sum, entry) => sum + entry.scoreDelta, 0), 0, 100);

/** Points des gestes retenus. Chaque choix porte le sien, figé au moment du choix. */
export const gestureScoreFromSession = (session: Pick<InterventionSession, "gestureRounds">) =>
  session.gestureRounds
    .flatMap((round) => round.choices)
    .reduce((sum, choice) => sum + choice.scoreDelta, 0);

/**
 * Points de la transmission : la qualité de la communication et les réponses au
 * régulateur.
 *
 * Recomposés depuis `transmission`, jamais lus dans `session.score`. Le débrief
 * doit pouvoir être reconstruit, sans quoi une session modifiée après coup
 * changerait la note sans rien changer à ce que le joueur a fait.
 */
export function handoverScoreFromSession(
  session: Pick<InterventionSession, "transmission">,
  scenario: InterventionScenario,
): number {
  const transmission = session.transmission;
  if (!transmission) return 0;

  const communication = handoverCommunicationScore(scenario, transmission.itemStates);
  const additions = Math.min(
    MAX_ADDITION_BONUS,
    transmission.freeAdditions.length * HANDOVER_SCORES.relevantAddition,
  );
  const answers = Object.entries(transmission.answers).reduce((sum, [questionId, answerId]) => {
    const question = scenario.regulatorQuestions.find((entry) => entry.id === questionId);
    const answer = question?.answers.find((entry) => entry.id === answerId);
    if (!answer) return sum;
    return (
      sum + (answer.correct ? REGULATOR_ANSWER_SCORES.correct : REGULATOR_ANSWER_SCORES.incorrect)
    );
  }, 0);
  return communication + additions + answers;
}

/**
 * La note de la mission entière.
 *
 * Les gestes et la transmission pèsent sur le score sans passer par le journal
 * d'actions : un geste retenu n'est pas une action du catalogue, et la qualité
 * d'une transmission ne se déduit pas de l'action qui l'a envoyée. Les ignorer
 * ferait un débrief qui contredit le score affiché en cours de partie.
 */
export const scoreFromSession = (
  session: Pick<InterventionSession, "actionLog" | "gestureRounds" | "transmission">,
  scenario: InterventionScenario,
) =>
  clamp(
    V3_STARTING_SCORE +
      session.actionLog.reduce((sum, entry) => sum + entry.scoreDelta, 0) +
      gestureScoreFromSession(session) +
      handoverScoreFromSession(session, scenario),
    0,
    100,
  );

export const graveFaultCount = (actionLog: readonly ActionLogEntry[]) =>
  actionLog.filter((entry) => entry.flag && graveFlags.has(entry.flag)).length;

export const livesFromActionLog = (actionLog: readonly ActionLogEntry[]) =>
  Math.max(0, V3_STARTING_LIVES - graveFaultCount(actionLog));

function rating(percentage: number): AxisRating {
  if (percentage >= 90) return "excellent";
  if (percentage >= 80) return "tres_bien";
  if (percentage >= 70) return "bien";
  if (percentage >= 60) return "suffisant";
  return "a_ameliorer";
}

/**
 * Les axes expliquent les actions qui ont coûté des points. Le score global ne
 * se recalcule jamais depuis ces pourcentages : il reste l'unique note.
 */
export function scoreAxesFromLog(actionLog: readonly ActionLogEntry[]): ScoreAxis[] {
  return SCORE_AXIS_IDS.map((id) => {
    const entries = actionLog.filter((entry) => axisForAction(entry.actionId) === id);
    if (entries.length === 0) {
      return {
        id,
        label: SCORE_AXIS_LABELS[id],
        percentage: null,
        earned: 0,
        available: 0,
        rating: null,
        lostOn: [],
      };
    }
    const lostOn = entries.filter((entry) => entry.scoreDelta < 0 || entry.outcome !== "applied");
    const positive = entries.reduce((sum, entry) => sum + Math.max(0, entry.scoreDelta), 0);
    const penalties = entries.reduce(
      (sum, entry) => sum + Math.abs(Math.min(0, entry.scoreDelta)),
      0,
    );
    const available = Math.max(1, positive + penalties);
    const earned = Math.max(0, positive - penalties);
    const percentage = clamp(Math.round((earned / available) * 100), 0, 100);
    return {
      id,
      label: SCORE_AXIS_LABELS[id],
      percentage,
      earned,
      available,
      rating: rating(percentage),
      lostOn,
    };
  });
}

export function isV3Failure(score: number, patientState: number, lives: number): boolean {
  return score < 50 || patientState <= 0 || lives <= 0;
}

export function rewardFromPerformance(
  scenario: InterventionScenario,
  session: Pick<InterventionSession, "actionLog" | "xpBonus" | "rewardBonus">,
): RewardResult {
  const score = scoreFromActionLog(session.actionLog);
  const patientState = clamp(
    scenario.startingPatient +
      session.actionLog.reduce((sum, entry) => sum + entry.patientDelta, 0),
    0,
    100,
  );
  const lives = livesFromActionLog(session.actionLog);
  const failed = isV3Failure(score, patientState, lives);
  const rewardFactor = failed ? 0 : clamp((score - 40) / 60, 0.2, 1);
  const xp = failed ? 0 : Math.round((scenario.baseXp + session.xpBonus) * rewardFactor);
  const coins = failed
    ? 0
    : Math.round((scenario.reward.coins + session.rewardBonus) * rewardFactor);
  return {
    nominalXp: scenario.baseXp,
    nominalCoins: scenario.reward.coins,
    rewardFactor,
    xp,
    coins,
    ...(scenario.reward.badge && score >= (scenario.reward.badgeMinimumScore ?? 100) && !failed
      ? { badge: scenario.reward.badge }
      : {}),
    rankBefore: 1,
    rankAfter: 1,
    rankBonusPercent: 0,
  };
}
