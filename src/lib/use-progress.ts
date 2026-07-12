import { useCallback, useEffect, useState } from "react";

const KEY = "medlingo-progress-v1";

export interface Progress {
  completedLessons: Record<string, { stars: number; bestScore: number }>;
  xp: number;
  streak: number;
  lastStudyDate: string | null; // yyyy-mm-dd
  hearts: number;
  heartsUpdatedAt: number;
}

const DEFAULT: Progress = {
  completedLessons: {},
  xp: 0,
  streak: 0,
  lastStudyDate: null,
  hearts: 5,
  heartsUpdatedAt: Date.now(),
};

const HEART_REGEN_MS = 15 * 60 * 1000; // 15 min per heart
const MAX_HEARTS = 5;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function load(): Progress {
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

function regenHearts(p: Progress): Progress {
  if (p.hearts >= MAX_HEARTS) return { ...p, heartsUpdatedAt: Date.now() };
  const elapsed = Date.now() - p.heartsUpdatedAt;
  const gained = Math.floor(elapsed / HEART_REGEN_MS);
  if (gained <= 0) return p;
  const newHearts = Math.min(MAX_HEARTS, p.hearts + gained);
  return { ...p, hearts: newHearts, heartsUpdatedAt: p.heartsUpdatedAt + gained * HEART_REGEN_MS };
}

export function useProgress() {
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<Progress>(DEFAULT);

  useEffect(() => {
    setProgress(regenHearts(load()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      /* ignore */
    }
  }, [progress, hydrated]);

  const completeLesson = useCallback((lessonId: string, correct: number, total: number) => {
    const score = total === 0 ? 0 : correct / total;
    const stars = score >= 0.95 ? 3 : score >= 0.75 ? 2 : score >= 0.5 ? 1 : 0;
    setProgress((p) => {
      const prev = p.completedLessons[lessonId];
      const bestScore = Math.max(prev?.bestScore ?? 0, score);
      const bestStars = Math.max(prev?.stars ?? 0, stars);
      const gainedXp = 10 + stars * 5;
      const t = today();
      let streak = p.streak;
      if (p.lastStudyDate !== t) {
        if (p.lastStudyDate && daysBetween(p.lastStudyDate, t) === 1) streak += 1;
        else streak = 1;
      }
      return {
        ...p,
        completedLessons: { ...p.completedLessons, [lessonId]: { stars: bestStars, bestScore } },
        xp: p.xp + gainedXp,
        streak,
        lastStudyDate: t,
      };
    });
    return { stars, score };
  }, []);

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

  const resetAll = useCallback(() => setProgress(DEFAULT), []);

  return { progress, hydrated, completeLesson, loseHeart, resetAll };
}

export { MAX_HEARTS };
