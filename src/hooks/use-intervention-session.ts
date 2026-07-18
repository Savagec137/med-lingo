import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  InterventionScenario,
  InterventionSession,
  MissionProgressMap,
} from "@/features/intervention-domain";
import {
  acceptInterventionMission,
  calculateMissionResult,
  continueIntervention,
  createInterventionSession,
  getCurrentScenarioStep,
  mergeMissionProgress,
  selectInterventionChoice,
  submitInterventionAnswers,
} from "@/features/intervention-engine";

const STORAGE_KEY = "medlingo:intervention-progress:v1";

function readProgress(): MissionProgressMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as MissionProgressMap;
  } catch {
    return {};
  }
}

export function useInterventionSession() {
  const [progress, setProgress] = useState<MissionProgressMap>({});
  const [scenario, setScenario] = useState<InterventionScenario | null>(null);
  const [session, setSession] = useState<InterventionSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const persistedSessionRef = useRef<InterventionSession | null>(null);

  useEffect(() => setProgress(readProgress()), []);

  useEffect(() => {
    if (session?.status !== "active" || startedAtRef.current === null) return;
    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000));
    };
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [session?.status]);

  useEffect(() => {
    if (!scenario || session?.status !== "debrief" || persistedSessionRef.current === session)
      return;
    const result = calculateMissionResult(scenario, session, elapsedSeconds);
    setProgress((previous) => {
      const updated = {
        ...previous,
        [scenario.id]: mergeMissionProgress(previous[scenario.id], result),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    persistedSessionRef.current = session;
  }, [elapsedSeconds, scenario, session]);

  const selectMission = useCallback((nextScenario: InterventionScenario) => {
    setScenario(nextScenario);
    setSession(createInterventionSession(nextScenario));
    setElapsedSeconds(0);
    startedAtRef.current = null;
    persistedSessionRef.current = null;
  }, []);

  const acceptMission = useCallback(() => {
    setSession((current) => {
      if (!current) return current;
      const next = acceptInterventionMission(current);
      if (next !== current) startedAtRef.current = Date.now();
      return next;
    });
  }, []);

  const choose = useCallback(
    (choiceId: string) => {
      if (!scenario) return;
      setSession((current) =>
        current ? selectInterventionChoice(scenario, current, choiceId) : current,
      );
    },
    [scenario],
  );

  const submitAnswers = useCallback(
    (choiceIds: string[]) => {
      if (!scenario) return;
      setSession((current) =>
        current ? submitInterventionAnswers(scenario, current, choiceIds) : current,
      );
    },
    [scenario],
  );

  const continueMission = useCallback(() => {
    if (!scenario) return;
    setSession((current) => {
      if (!current) return current;
      return continueIntervention(scenario, current);
    });
  }, [scenario]);

  const leaveMission = useCallback(() => {
    setScenario(null);
    setSession(null);
    setElapsedSeconds(0);
    startedAtRef.current = null;
    persistedSessionRef.current = null;
  }, []);

  const restartMission = useCallback(() => {
    if (scenario) selectMission(scenario);
  }, [scenario, selectMission]);

  const currentStep = useMemo(
    () => (scenario && session ? getCurrentScenarioStep(scenario, session) : undefined),
    [scenario, session],
  );
  const result = useMemo(
    () =>
      scenario && session?.status === "debrief"
        ? calculateMissionResult(scenario, session, elapsedSeconds)
        : null,
    [elapsedSeconds, scenario, session],
  );

  return {
    progress,
    scenario,
    session,
    currentStep,
    result,
    elapsedSeconds,
    selectMission,
    acceptMission,
    choose,
    submitAnswers,
    continueMission,
    leaveMission,
    restartMission,
  };
}
