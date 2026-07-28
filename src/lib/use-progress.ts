import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { UNITS, findLesson } from "@/lib/curriculum";
import { lessonXpForResult } from "@/content/learning-rewards";
import { getRoadmapParcours } from "@/content/roadmap-registry";
import { grantRoadmapBossRewards } from "@/content/roadmap-rewards";
import { awardBadges, bumpMissions, logXpTransaction } from "@/lib/use-gamification";
import { awardCoins } from "@/lib/use-wallet";
import { badgesToAward, levelFromXp, todayIso } from "@/lib/gamification";

const KEY = "medlingo-progress-v1";

export interface Progress {
  completedLessons: Record<string, { stars: number; bestScore: number }>;
  xp: number;
  streak: number;
  lastStudyDate: string | null; // yyyy-mm-dd
  hearts: number;
  heartsUpdatedAt: number;
  onboarded: boolean;
  dailyGoalXp: number;
  xpToday: number;
  xpTodayDate: string;
  roadmapRewards: Record<string, { badge: string | null; chest: string | null; earnedAt: string }>;
}

const DEFAULT: Progress = {
  completedLessons: {},
  xp: 0,
  streak: 0,
  lastStudyDate: null,
  hearts: 5,
  heartsUpdatedAt: Date.now(),
  onboarded: false,
  dailyGoalXp: 30,
  xpToday: 0,
  xpTodayDate: todayIso(),
  roadmapRewards: {},
};

const HEART_REGEN_MS = 15 * 60 * 1000;
const MAX_HEARTS = 5;

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}
function loadLocal(): Progress {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return { ...DEFAULT, ...parsed, completedLessons: parsed.completedLessons ?? {} };
  } catch {
    return DEFAULT;
  }
}
function saveLocal(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
function regenHearts(p: Progress): Progress {
  if (p.hearts >= MAX_HEARTS) return { ...p, heartsUpdatedAt: Date.now() };
  const elapsed = Date.now() - p.heartsUpdatedAt;
  const gained = Math.floor(elapsed / HEART_REGEN_MS);
  if (gained <= 0) return p;
  const newHearts = Math.min(MAX_HEARTS, p.hearts + gained);
  return { ...p, hearts: newHearts, heartsUpdatedAt: p.heartsUpdatedAt + gained * HEART_REGEN_MS };
}
function rollDaily(p: Progress): Progress {
  const t = todayIso();
  if (p.xpTodayDate === t) return p;
  return { ...p, xpTodayDate: t, xpToday: 0 };
}

type Row = {
  xp: number;
  streak: number;
  last_study_date: string | null;
  hearts: number;
  hearts_updated_at: string;
  completed_lessons: Record<string, { stars: number; bestScore: number }>;
  onboarded?: boolean | null;
  daily_goal_xp?: number | null;
  xp_today?: number | null;
  xp_today_date?: string | null;
};
function rowToProgress(r: Row): Progress {
  return {
    xp: r.xp ?? 0,
    streak: r.streak ?? 0,
    lastStudyDate: r.last_study_date,
    hearts: r.hearts ?? MAX_HEARTS,
    heartsUpdatedAt: r.hearts_updated_at ? new Date(r.hearts_updated_at).getTime() : Date.now(),
    completedLessons: r.completed_lessons ?? {},
    onboarded:
      r.onboarded ?? ((r.xp ?? 0) > 0 || Object.keys(r.completed_lessons ?? {}).length > 0),
    dailyGoalXp: r.daily_goal_xp ?? 30,
    xpToday: r.xp_today ?? 0,
    xpTodayDate: r.xp_today_date ?? todayIso(),
    roadmapRewards: {},
  };
}
function progressToRow(p: Progress) {
  return {
    xp: p.xp,
    streak: p.streak,
    last_study_date: p.lastStudyDate,
    hearts: p.hearts,
    hearts_updated_at: new Date(p.heartsUpdatedAt).toISOString(),
    completed_lessons: p.completedLessons,
    level: levelFromXp(p.xp),
    daily_goal_xp: p.dailyGoalXp,
    xp_today: p.xpToday,
    xp_today_date: p.xpTodayDate,
    updated_at: new Date().toISOString(),
  };
}
function mergeProgress(a: Progress, b: Progress): Progress {
  const completed: Progress["completedLessons"] = { ...a.completedLessons };
  for (const [k, v] of Object.entries(b.completedLessons ?? {})) {
    const prev = completed[k];
    completed[k] = prev
      ? { stars: Math.max(prev.stars, v.stars), bestScore: Math.max(prev.bestScore, v.bestScore) }
      : v;
  }
  return {
    xp: Math.max(a.xp, b.xp),
    streak: Math.max(a.streak, b.streak),
    lastStudyDate: !a.lastStudyDate
      ? b.lastStudyDate
      : !b.lastStudyDate
        ? a.lastStudyDate
        : a.lastStudyDate > b.lastStudyDate
          ? a.lastStudyDate
          : b.lastStudyDate,
    hearts: Math.min(a.hearts, b.hearts),
    heartsUpdatedAt: Math.max(a.heartsUpdatedAt, b.heartsUpdatedAt),
    completedLessons: completed,
    onboarded: a.onboarded || b.onboarded,
    dailyGoalXp: Math.max(a.dailyGoalXp, b.dailyGoalXp),
    xpToday:
      a.xpTodayDate === b.xpTodayDate
        ? Math.max(a.xpToday, b.xpToday)
        : a.xpTodayDate > b.xpTodayDate
          ? a.xpToday
          : b.xpToday,
    xpTodayDate: a.xpTodayDate > b.xpTodayDate ? a.xpTodayDate : b.xpTodayDate,
    roadmapRewards: { ...a.roadmapRewards, ...b.roadmapRewards },
  };
}

function allLessonIdsForUnit(unitId: string): string[] {
  const u = UNITS.find((x) => x.id === unitId);
  return u ? u.lessons.map((l) => l.id) : [];
}

interface ProgressContextValue {
  progress: Progress;
  hydrated: boolean;
  completeLesson: (
    lessonId: string,
    correct: number,
    total: number,
    configuredXp?: number,
  ) => {
    stars: number;
    score: number;
    xpGained: number;
    coinsGained: number;
  };
  loseHeart: () => void;
  resetAll: () => void;
  applyPlacement: (lessonIds: string[]) => void;
  markOnboarded: () => void;
  setDailyGoal: (xp: number) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<Progress>(DEFAULT);
  const userIdRef = useRef<string | null>(null);
  const localScopeRef = useRef<string | null>(null);

  const cloudProgress = useQuery({
    queryKey: ["progress", user?.id ?? "anon"],
    enabled: !authLoading && !!user,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<Row | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_progress")
        .select(
          "xp, streak, last_study_date, hearts, hearts_updated_at, completed_lessons, onboarded, daily_goal_xp, xp_today, xp_today_date",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Row | null;
    },
  });

  useEffect(() => {
    if (authLoading) return;
    const scope = user?.id ?? "anon";
    if (localScopeRef.current === scope) return;
    localScopeRef.current = scope;
    userIdRef.current = user?.id ?? null;
    setProgress(rollDaily(regenHearts(loadLocal())));
    setHydrated(true);
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (!hydrated || !user || !cloudProgress.data) return;
    const cloud = rollDaily(regenHearts(rowToProgress(cloudProgress.data)));
    setProgress((local) => {
      const merged = mergeProgress(cloud, local);
      return JSON.stringify(merged) === JSON.stringify(local) ? local : merged;
    });
  }, [cloudProgress.data, hydrated, user]);

  useEffect(() => {
    if (!hydrated) return;
    saveLocal(progress);
  }, [progress, hydrated]);

  useEffect(() => {
    if (!hydrated || !userIdRef.current) return;
    if (!cloudProgress.isFetched && !cloudProgress.isError) return;
    const uid = userIdRef.current;
    const t = setTimeout(() => {
      const row = progressToRow(progress);
      void supabase
        .from("user_progress")
        .upsert({ user_id: uid, ...row })
        .then(({ error }) => {
          if (!error) qc.setQueryData(["progress", uid], row as unknown as Row);
        });
    }, 500);
    return () => clearTimeout(t);
  }, [cloudProgress.isError, cloudProgress.isFetched, hydrated, progress, qc]);

  const completeLesson = useCallback(
    (lessonId: string, correct: number, total: number, configuredXp?: number) => {
      const score = total === 0 ? 0 : correct / total;
      const stars = score >= 0.95 ? 3 : score >= 0.75 ? 2 : score >= 0.5 ? 1 : 0;
      const gainedXp = lessonXpForResult(stars, configuredXp);
      const t = todayIso();
      const foundLesson = findLesson(lessonId);
      const roadmapParcours =
        foundLesson?.lesson.kind === "boss" ? getRoadmapParcours(foundLesson.parcours.id) : null;
      const bossPassed = Boolean(roadmapParcours && score >= 0.8);

      let nextProgress: Progress = DEFAULT;
      setProgress((p) => {
        const rolled = rollDaily(p);
        const prev = rolled.completedLessons[lessonId];
        const bestScore = Math.max(prev?.bestScore ?? 0, score);
        const bestStars = Math.max(prev?.stars ?? 0, stars);
        let streak = rolled.streak;
        if (rolled.lastStudyDate !== t) {
          if (rolled.lastStudyDate && daysBetween(rolled.lastStudyDate, t) === 1) streak += 1;
          else streak = 1;
        }
        const updated: Progress = {
          ...rolled,
          completedLessons: {
            ...rolled.completedLessons,
            [lessonId]: { stars: bestStars, bestScore },
          },
          xp: rolled.xp + gainedXp,
          xpToday: rolled.xpToday + gainedXp,
          streak,
          lastStudyDate: t,
          roadmapRewards:
            bossPassed && roadmapParcours
              ? {
                  ...rolled.roadmapRewards,
                  [roadmapParcours.bossId]: rolled.roadmapRewards[roadmapParcours.bossId] ?? {
                    badge: roadmapParcours.badge,
                    chest: roadmapParcours.chest,
                    earnedAt: new Date().toISOString(),
                  },
                }
              : rolled.roadmapRewards,
        };
        nextProgress = updated;
        return updated;
      });

      const uid = userIdRef.current;
      if (uid) {
        // Log attempt + XP
        supabase
          .from("lesson_attempts")
          .insert({ user_id: uid, lesson_id: lessonId, correct, total, stars });
        logXpTransaction(uid, gainedXp, "lesson", lessonId);

        // Missions
        const isNewDay = nextProgress.lastStudyDate !== progress.lastStudyDate;
        bumpMissions(uid, "xp", gainedXp);
        bumpMissions(uid, "lessons", 1);
        if (stars === 3) bumpMissions(uid, "perfect_lessons", 1);
        if (isNewDay) bumpMissions(uid, "study_days", 1);

        // Badges
        const found = foundLesson;
        const completedIds = Object.keys(nextProgress.completedLessons);
        const anatomyDone =
          allLessonIdsForUnit("os").every((id) => completedIds.includes(id)) &&
          allLessonIdsForUnit("organes").every((id) => completedIds.includes(id));
        const vocabDone =
          allLessonIdsForUnit("prefixes").every((id) => completedIds.includes(id)) &&
          allLessonIdsForUnit("suffixes").every((id) => completedIds.includes(id)) &&
          allLessonIdsForUnit("radicaux").every((id) => completedIds.includes(id));
        const codes = badgesToAward({
          xp: nextProgress.xp,
          streak: nextProgress.streak,
          level: levelFromXp(nextProgress.xp),
          completedCount: completedIds.length,
          perfectLesson: stars === 3,
          lessonUnitId: found?.unit.id,
          anatomyDone,
          vocabDone,
        });
        awardBadges(uid, codes);

        // Coins: 5 base + 5 par étoile (5-20)
        const coinsGained = 5 + stars * 5;
        awardCoins(coinsGained, "lesson", lessonId)
          .then(() => {
            qc.invalidateQueries({ queryKey: ["wallet"] });
          })
          .catch(() => {});
        if (bossPassed && roadmapParcours) {
          grantRoadmapBossRewards(roadmapParcours)
            .then(() => {
              qc.invalidateQueries({ queryKey: ["game-inventory"] });
              qc.invalidateQueries({ queryKey: ["inventory"] });
            })
            .catch(() => {});
        }
        void qc.invalidateQueries({ queryKey: ["home-dashboard"] });
      }
      return { stars, score, xpGained: gainedXp, coinsGained: 5 + stars * 5 };
    },
    [progress.lastStudyDate, qc],
  );

  const loseHeart = useCallback(() => {
    setProgress((p) => {
      const regened = regenHearts(p);
      if (regened.hearts <= 0) return regened;
      return {
        ...regened,
        hearts: regened.hearts - 1,
        heartsUpdatedAt: regened.hearts === MAX_HEARTS ? Date.now() : regened.heartsUpdatedAt,
      };
    });
  }, []);

  const resetAll = useCallback(() => {
    setProgress(DEFAULT);
    const uid = userIdRef.current;
    if (uid) {
      supabase.from("user_progress").upsert({ user_id: uid, ...progressToRow(DEFAULT) });
    }
  }, []);

  const applyPlacement = useCallback((lessonIds: string[]) => {
    setProgress((p) => {
      const completed = { ...p.completedLessons };
      for (const id of lessonIds) {
        if (!completed[id]) completed[id] = { stars: 2, bestScore: 0.8 };
      }
      return { ...p, completedLessons: completed, onboarded: true };
    });
  }, []);

  const markOnboarded = useCallback(() => {
    setProgress((p) => (p.onboarded ? p : { ...p, onboarded: true }));
  }, []);

  const setDailyGoal = useCallback((xp: number) => {
    setProgress((p) => ({ ...p, dailyGoalXp: Math.max(10, Math.min(200, xp)) }));
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      hydrated,
      completeLesson,
      loseHeart,
      resetAll,
      applyPlacement,
      markOnboarded,
      setDailyGoal,
    }),
    [
      applyPlacement,
      completeLesson,
      hydrated,
      loseHeart,
      markOnboarded,
      progress,
      resetAll,
      setDailyGoal,
    ],
  );

  return createElement(ProgressContext.Provider, { value }, children);
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) {
    throw new Error("useProgress doit être utilisé dans ProgressProvider");
  }
  return value;
}

export { MAX_HEARTS };
