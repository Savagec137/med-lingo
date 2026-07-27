import { useCallback, useEffect, useState } from "react";

const KEY = "medlingo-learning-history-v1";
const SRS_DAYS = [1, 3, 7, 14, 30, 90] as const;

export interface QuestionLearningState {
  attempts: number;
  correctAttempts: number;
  errorCount: number;
  srsStage: number;
  lastAttemptAt: string;
  nextReviewAt: string;
}

export interface LearningHistory {
  questions: Record<string, QuestionLearningState>;
}

const EMPTY: LearningHistory = { questions: {} };

function loadHistory(): LearningHistory {
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "") as LearningHistory;
    return parsed?.questions ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function nextReviewDate(stage: number, now: Date) {
  const target = new Date(now);
  target.setDate(target.getDate() + SRS_DAYS[Math.min(stage, SRS_DAYS.length - 1)]);
  return target.toISOString();
}

export function updateQuestionLearningState(
  previous: QuestionLearningState | undefined,
  correct: boolean,
  now = new Date(),
): QuestionLearningState {
  const stage = correct
    ? Math.min((previous?.srsStage ?? -1) + 1, SRS_DAYS.length - 1)
    : Math.max((previous?.srsStage ?? 0) - 1, 0);
  return {
    attempts: (previous?.attempts ?? 0) + 1,
    correctAttempts: (previous?.correctAttempts ?? 0) + (correct ? 1 : 0),
    errorCount: (previous?.errorCount ?? 0) + (correct ? 0 : 1),
    srsStage: stage,
    lastAttemptAt: now.toISOString(),
    nextReviewAt: nextReviewDate(stage, now),
  };
}

export function useLearningHistory() {
  const [history, setHistory] = useState<LearningHistory>(loadHistory);

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify(history));
  }, [history]);

  const recordAttempt = useCallback((questionId: string, correct: boolean) => {
    setHistory((current) => ({
      questions: {
        ...current.questions,
        [questionId]: updateQuestionLearningState(current.questions[questionId], correct),
      },
    }));
  }, []);

  const dueQuestionIds = Object.entries(history.questions)
    .filter(([, state]) => new Date(state.nextReviewAt).getTime() <= Date.now())
    .sort((left, right) => {
      const errorDifference = right[1].errorCount - left[1].errorCount;
      return errorDifference || left[1].nextReviewAt.localeCompare(right[1].nextReviewAt);
    })
    .map(([id]) => id);

  return { history, recordAttempt, dueQuestionIds };
}
