import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InterventionScenario } from "@/features/intervention-domain";
import {
  calculateMissionResult,
  continueIntervention,
  getCurrentScenarioStep,
  submitInterventionAnswers,
} from "@/features/intervention-engine";
import {
  answerShiftCall,
  applyDispatchAction,
  arriveOnScene,
  completeShiftIntervention,
  createInterventionShift,
  departToCall,
  finishInterventionShift,
  isPersistedInterventionShift,
  requestNextShiftCall,
  selectTravelDecision,
  startInterventionShift,
} from "@/features/intervention-shift-engine";
import type {
  DispatchActionId,
  InterventionShiftSession,
  TravelDecisionId,
} from "@/features/intervention-shift-domain";

const STORAGE_KEY = "medlingo:intervention-shift:v1";

function createSeed() {
  return `medoka-${Date.now().toString(36)}-${Math.round(performance.now()).toString(36)}`;
}

function readPersistedShift(): InterventionShiftSession | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isPersistedInterventionShift(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function useInterventionShift(scenarios: readonly InterventionScenario[]) {
  const [session, setSession] = useState<InterventionShiftSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const sessionRef = useRef<InterventionShiftSession | null>(null);

  useEffect(() => {
    setSession(readPersistedShift() ?? createInterventionShift(createSeed()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    sessionRef.current = session;
    if (!hydrated || !session || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [hydrated, session]);

  useEffect(() => {
    if (session?.status !== "mission") return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [session?.status]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibilityChange = () => {
      const timestamp = Date.now();
      setNowMs(timestamp);
      setSession((current) => {
        const call = current?.activeCall;
        if (!current || current.status !== "mission" || !call) return current;
        if (document.hidden && call.missionStartedAtMs) {
          const elapsed =
            (call.missionElapsedSeconds ?? 0) +
            Math.max(0, Math.floor((timestamp - call.missionStartedAtMs) / 1000));
          return {
            ...current,
            activeCall: {
              ...call,
              missionElapsedSeconds: elapsed,
              missionStartedAtMs: undefined,
            },
            updatedAtMs: timestamp,
          };
        }
        if (!document.hidden && !call.missionStartedAtMs) {
          return {
            ...current,
            activeCall: { ...call, missionStartedAtMs: timestamp },
            updatedAtMs: timestamp,
          };
        }
        return current;
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persistImmediately = () => {
      if (sessionRef.current) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionRef.current));
      }
    };
    window.addEventListener("pagehide", persistImmediately);
    return () => window.removeEventListener("pagehide", persistImmediately);
  }, []);

  const startShift = useCallback(() => {
    setSession((current) =>
      current ? startInterventionShift(current, scenarios, Date.now()) : current,
    );
  }, [scenarios]);

  const answerCall = useCallback(() => {
    setSession((current) => (current ? answerShiftCall(current, Date.now()) : current));
  }, []);

  const selectDispatchAction = useCallback((actionId: DispatchActionId) => {
    setSession((current) =>
      current ? applyDispatchAction(current, actionId, Date.now()) : current,
    );
  }, []);

  const depart = useCallback(() => {
    setSession((current) => (current ? departToCall(current, Date.now()) : current));
  }, []);

  const chooseTravelDecision = useCallback((decisionId: TravelDecisionId) => {
    setSession((current) =>
      current ? selectTravelDecision(current, decisionId, Date.now()) : current,
    );
  }, []);

  const arrive = useCallback(() => {
    setSession((current) => (current ? arriveOnScene(current, scenarios, Date.now()) : current));
    setNowMs(Date.now());
  }, [scenarios]);

  const submitMissionAnswers = useCallback(
    (choiceIds: string[]) => {
      setSession((current) => {
        const call = current?.activeCall;
        if (!current || current.status !== "mission" || !call?.missionSession) return current;
        const scenario = scenarios.find((item) => item.id === call.scenarioId);
        if (!scenario) return current;
        return {
          ...current,
          activeCall: {
            ...call,
            missionSession: submitInterventionAnswers(scenario, call.missionSession, choiceIds),
          },
          updatedAtMs: Date.now(),
        };
      });
    },
    [scenarios],
  );

  const continueMission = useCallback(() => {
    setSession((current) => {
      const call = current?.activeCall;
      if (!current || current.status !== "mission" || !call?.missionSession) return current;
      const scenario = scenarios.find((item) => item.id === call.scenarioId);
      if (!scenario) return current;
      const nextMissionSession = continueIntervention(scenario, call.missionSession);
      const timestamp = Date.now();
      const elapsedSeconds =
        (call.missionElapsedSeconds ?? 0) +
        (call.missionStartedAtMs
          ? Math.max(0, Math.floor((timestamp - call.missionStartedAtMs) / 1000))
          : 0);
      const updated = {
        ...current,
        activeCall: { ...call, missionSession: nextMissionSession },
        updatedAtMs: timestamp,
      };
      if (nextMissionSession.status !== "debrief") return updated;
      const result = calculateMissionResult(scenario, nextMissionSession, elapsedSeconds);
      return completeShiftIntervention(updated, scenario, result, timestamp);
    });
  }, [scenarios]);

  const nextCall = useCallback(() => {
    setSession((current) =>
      current ? requestNextShiftCall(current, scenarios, Date.now()) : current,
    );
  }, [scenarios]);

  const finishShift = useCallback(() => {
    setSession((current) => (current ? finishInterventionShift(current, Date.now()) : current));
  }, []);

  const resetShift = useCallback(() => {
    const fresh = createInterventionShift(createSeed());
    setSession(fresh);
    setNowMs(Date.now());
  }, []);

  const activeScenario = useMemo(() => {
    const scenarioId = session?.activeCall?.scenarioId;
    return scenarioId ? scenarios.find((item) => item.id === scenarioId) : undefined;
  }, [scenarios, session?.activeCall?.scenarioId]);

  const currentStep = useMemo(() => {
    const missionSession = session?.activeCall?.missionSession;
    return activeScenario && missionSession
      ? getCurrentScenarioStep(activeScenario, missionSession)
      : undefined;
  }, [activeScenario, session?.activeCall?.missionSession]);

  const elapsedSeconds = useMemo(() => {
    const call = session?.activeCall;
    if (!call || session?.status !== "mission") return 0;
    return (
      (call.missionElapsedSeconds ?? 0) +
      (call.missionStartedAtMs
        ? Math.max(0, Math.floor((nowMs - call.missionStartedAtMs) / 1000))
        : 0)
    );
  }, [nowMs, session?.activeCall, session?.status]);

  return {
    hydrated,
    session,
    activeScenario,
    currentStep,
    elapsedSeconds,
    startShift,
    answerCall,
    selectDispatchAction,
    depart,
    chooseTravelDecision,
    arrive,
    submitMissionAnswers,
    continueMission,
    nextCall,
    finishShift,
    resetShift,
  };
}
