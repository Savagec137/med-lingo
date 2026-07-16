import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { UNITS, findLesson } from "@/lib/curriculum";
import {
  awardBadges,
  bumpMissions,
  logXpTransaction,
} from "@/lib/use-gamification";
import { awardCoins } from "@/lib/use-wallet";
import {
  badgesToAward,
  levelFromXp,
  todayIso,
} from "@/lib/gamification";

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
    onboarded: r.onboarded ?? ((r.xp ?? 0) > 0 || Object.keys(r.completed_lessons ?? {}).length > 0),
    dailyGoalXp: r.daily_goal_xp ?? 30,
    xpToday: r.xp_today ?? 0,
    xpTodayDate: r.xp_today_date ?? todayIso(),
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
    lastStudyDate:
      !a.lastStudyDate ? b.lastStudyDate : !b.lastStudyDate ? a.lastStudyDate : a.lastStudyDate > b.lastStudyDate ? a.lastStudyDate : b.lastStudyDate,
    hearts: Math.min(a.hearts, b.hearts),
    heartsUpdatedAt: Math.max(a.heartsUpdatedAt, b.heartsUpdatedAt),
    completedLessons: completed,
    onboarded: a.onboarded || b.onboarded,
    dailyGoalXp: Math.max(a.dailyGoalXp, b.dailyGoalXp),
    xpToday: a.xpTodayDate === b.xpTodayDate ? Math.max(a.xpToday, b.xpToday) : (a.xpTodayDate > b.xpTodayDate ? a.xpToday : b.xpToday),
    xpTodayDate: a.xpTodayDate > b.xpTodayDate ? a.xpTodayDate : b.xpTodayDate,
  };
}

function allLessonIdsForUnit(unitId: string): string[] {
  const u = UNITS.find((x) => x.id === unitId);
  return u ? u.lessons.map((l) => l.id) : [];
}

export function useProgress() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<Progress>(DEFAULT);
  const cloudSyncing = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    (async () => {
      const local = rollDaily(regenHearts(loadLocal()));
      if (!user) {
        if (!cancelled) {
          setProgress(local);
          setHydrated(true);
          userIdRef.current = null;
        }
        return;
      }
      userIdRef.current = user.id;
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setProgress(local);
        setHydrated(true);
        return;
      }
      const cloud = rollDaily(regenHearts(rowToProgress(data as unknown as Row)));
      const merged = mergeProgress(cloud, local);
      setProgress(merged);
      setHydrated(true);
      if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
        cloudSyncing.current = true;
        await supabase.from("user_progress").upsert({ user_id: user.id, ...progressToRow(merged) });
        cloudSyncing.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!hydrated) return;
    saveLocal(progress);
  }, [progress, hydrated]);

  useEffect(() => {
    if (!hydrated || !userIdRef.current) return;
    const uid = userIdRef.current;
    const t = setTimeout(() => {
      supabase.from("user_progress").upsert({ user_id: uid, ...progressToRow(progress) });
    }, 500);
    return () => clearTimeout(t);
  }, [progress, hydrated]);

  const completeLesson = useCallback((lessonId: string, correct: number, total: number) => {
    const score = total === 0 ? 0 : correct / total;
    const stars = score >= 0.95 ? 3 : score >= 0.75 ? 2 : score >= 0.5 ? 1 : 0;
    const gainedXp = 10 + stars * 5;
    const t = todayIso();

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
        completedLessons: { ...rolled.completedLessons, [lessonId]: { stars: bestStars, bestScore } },
        xp: rolled.xp + gainedXp,
        xpToday: rolled.xpToday + gainedXp,
        streak,
        lastStudyDate: t,
      };
      nextProgress = updated;
      return updated;
    });

    const uid = userIdRef.current;
    if (uid) {
      // Log attempt + XP
      supabase.from("lesson_attempts").insert({ user_id: uid, lesson_id: lessonId, correct, total, stars });
      logXpTransaction(uid, gainedXp, "lesson", lessonId);

      // Missions
      const isNewDay = nextProgress.lastStudyDate !== progress.lastStudyDate;
      bumpMissions(uid, "xp", gainedXp);
      bumpMissions(uid, "lessons", 1);
      if (stars === 3) bumpMissions(uid, "perfect_lessons", 1);
      if (isNewDay) bumpMissions(uid, "study_days", 1);

      // Badges
      const found = findLesson(lessonId);
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
    }
    return { stars, score, xpGained: gainedXp };
  }, [progress.lastStudyDate]);

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

  return {
    progress,
    hydrated,
    completeLesson,
    loseHeart,
    resetAll,
    applyPlacement,
    markOnboarded,
    setDailyGoal,
  };
}

export { MAX_HEARTS };
