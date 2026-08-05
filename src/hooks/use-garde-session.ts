import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GardeState } from "@/features/garde/garde-domain";
import {
  acceptCall,
  answerQuestion,
  createGardeState,
  endShift,
  nextIntervention,
  nextQuestion,
  startShift,
} from "@/features/garde/garde-engine";

export function useGardeSession() {
  const [state, setState] = useState<GardeState>(createGardeState);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (state.status !== "running") return;
    if (startedAt.current === null) startedAt.current = Date.now();
    const tick = () =>
      setSeconds(Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [state.status]);

  const question = useMemo(
    () => state.currentCase?.questions[state.questionIndex] ?? null,
    [state.currentCase, state.questionIndex],
  );

  return {
    state,
    seconds,
    question,
    start: useCallback(() => setState((s) => startShift(s)), []),
    accept: useCallback(() => setState((s) => acceptCall(s)), []),
    answer: useCallback((ids: string[]) => setState((s) => answerQuestion(s, ids)), []),
    next: useCallback(() => setState((s) => nextQuestion(s)), []),
    nextCall: useCallback(() => setState((s) => nextIntervention(s)), []),
    finish: useCallback(() => setState((s) => endShift(s)), []),
    reset: useCallback(() => {
      startedAt.current = null;
      setSeconds(0);
      setState(createGardeState());
    }, []),
  };
}
