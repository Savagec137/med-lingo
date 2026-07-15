// Pure helpers for XP / levels / streaks / dates.

// XP needed to REACH level L (cumulative): 50 * L * (L-1)
// L=1 → 0, L=2 → 100, L=3 → 300, L=10 → 4 500, L=25 → 30 000, L=50 → 122 500, L=100 → 495 000
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 50 * l * (l - 1);
}

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  // solve 50L(L-1) <= xp  →  L <= (1 + sqrt(1 + xp/12.5)) / 2
  const L = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
  return Math.max(1, L);
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = xp - base;
  const span = next - base;
  return {
    level,
    xpIntoLevel: into,
    xpForNextLevel: span,
    pct: span === 0 ? 0 : Math.min(1, into / span),
    xpToNext: Math.max(0, next - xp),
  };
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function mondayOfWeekIso(base = new Date()): string {
  const d = new Date(base);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Badge unlock thresholds — evaluated client-side.
export interface BadgeUnlockContext {
  xp: number;
  streak: number;
  level: number;
  completedCount: number;
  perfectLesson: boolean;   // just did a 3-star lesson
  lessonUnitId?: string;    // unit of last lesson
  anatomyDone: boolean;     // all "os" + "organes" lessons done
  vocabDone: boolean;       // all "prefixes" + "suffixes" + "radicaux" done
}

export function badgesToAward(ctx: BadgeUnlockContext): string[] {
  const out: string[] = [];
  if (ctx.completedCount >= 1) out.push("first_lesson");
  if (ctx.streak >= 3) out.push("streak_3");
  if (ctx.streak >= 7) out.push("streak_7");
  if (ctx.streak >= 30) out.push("streak_30");
  if (ctx.streak >= 100) out.push("streak_100");
  if (ctx.xp >= 100) out.push("xp_100");
  if (ctx.xp >= 1000) out.push("xp_1000");
  if (ctx.xp >= 10000) out.push("xp_10000");
  if (ctx.level >= 10) out.push("level_10");
  if (ctx.level >= 25) out.push("level_25");
  if (ctx.level >= 50) out.push("level_50");
  if (ctx.perfectLesson) out.push("perfect_lesson");
  if (ctx.anatomyDone) out.push("anatomy_expert");
  if (ctx.vocabDone) out.push("vocab_master");
  if (ctx.lessonUnitId && ctx.lessonUnitId.startsWith("dea-")) out.push("first_aid");
  return out;
}
