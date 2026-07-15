import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { mondayOfWeekIso, todayIso } from "@/lib/gamification";

// --- Types (loose, DB is source of truth) ---------------------------
export interface Badge {
  code: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  threshold: number | null;
}
export interface UserBadge {
  badge_code: string;
  earned_at: string;
}
export interface Mission {
  code: string;
  title: string;
  description: string;
  icon: string;
  period: "daily" | "weekly";
  metric: string;
  target: number;
  xp_reward: number;
}
export interface UserMission {
  mission_code: string;
  period_start: string;
  progress: number;
  completed: boolean;
}

// --- Queries --------------------------------------------------------
export function useBadgesCatalog() {
  return useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badges" as never).select("*");
      if (error) throw error;
      return (data ?? []) as unknown as Badge[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserBadges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_badges", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges" as never)
        .select("badge_code, earned_at")
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as UserBadge[];
    },
  });
}

export function useMissionsCatalog() {
  return useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("missions" as never).select("*");
      if (error) throw error;
      return (data ?? []) as unknown as Mission[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserMissions() {
  const { user } = useAuth();
  const today = todayIso();
  const monday = mondayOfWeekIso();
  return useQuery({
    queryKey: ["user_missions", user?.id ?? "anon", today, monday],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_missions" as never)
        .select("*")
        .in("period_start", [today, monday]);
      if (error) throw error;
      return (data ?? []) as unknown as UserMission[];
    },
  });
}

export function useXpHistory(days = 7) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["xp_history", user?.id ?? "anon", days],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days + 1);
      since.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("xp_transactions" as never)
        .select("amount, created_at")
        .gte("created_at", since.toISOString());
      if (error) throw error;
      const rows = (data ?? []) as unknown as { amount: number; created_at: string }[];
      const byDay: Record<string, number> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        byDay[k] = 0;
      }
      for (const r of rows) {
        const d = new Date(r.created_at);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (k in byDay) byDay[k] += r.amount;
      }
      return Object.entries(byDay).map(([date, xp]) => ({ date, xp }));
    },
  });
}

// --- Mutations helpers ---------------------------------------------

/** Log an XP transaction (fire-and-forget). */
export async function logXpTransaction(
  userId: string,
  amount: number,
  source: string,
  lessonId?: string,
) {
  await supabase
    .from("xp_transactions" as never)
    .insert({ user_id: userId, amount, source, lesson_id: lessonId ?? null } as never);
}

/** Award badges (unique constraint handles duplicates). */
export async function awardBadges(userId: string, badgeCodes: string[]) {
  if (badgeCodes.length === 0) return [];
  const rows = badgeCodes.map((code) => ({ user_id: userId, badge_code: code }));
  const { data } = await supabase
    .from("user_badges" as never)
    .upsert(rows as never, { onConflict: "user_id,badge_code", ignoreDuplicates: true })
    .select("badge_code");
  return ((data ?? []) as unknown as { badge_code: string }[]).map((r) => r.badge_code);
}

/** Increment mission progress for a metric ("xp" | "lessons" | "perfect_lessons" | "study_days"). */
export async function bumpMissions(
  userId: string,
  metric: "xp" | "lessons" | "perfect_lessons" | "study_days",
  delta: number,
) {
  if (delta <= 0) return;
  const today = todayIso();
  const monday = mondayOfWeekIso();

  const { data: missions } = await supabase
    .from("missions" as never)
    .select("code, period, metric, target, xp_reward")
    .eq("metric", metric)
    .eq("active", true);
  const list = (missions ?? []) as unknown as Mission[];
  if (list.length === 0) return;

  for (const m of list) {
    const period_start = m.period === "daily" ? today : monday;
    // fetch current row
    const { data: existing } = await supabase
      .from("user_missions" as never)
      .select("progress, completed")
      .eq("user_id", userId)
      .eq("mission_code", m.code)
      .eq("period_start", period_start)
      .maybeSingle();
    const row = existing as unknown as { progress: number; completed: boolean } | null;
    const prevProgress = row?.progress ?? 0;
    const wasCompleted = row?.completed ?? false;
    const nextProgress = Math.min(m.target, prevProgress + delta);
    const nowCompleted = nextProgress >= m.target;

    await supabase.from("user_missions" as never).upsert(
      {
        user_id: userId,
        mission_code: m.code,
        period_start,
        progress: nextProgress,
        completed: nowCompleted,
        completed_at: nowCompleted && !wasCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id,mission_code,period_start" },
    );

    // Award XP bonus the first time it flips to completed
    if (nowCompleted && !wasCompleted && m.xp_reward > 0) {
      await logXpTransaction(userId, m.xp_reward, `mission:${m.code}`);
    }
  }
}

export function useInvalidateGamification() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["user_badges"] });
    qc.invalidateQueries({ queryKey: ["user_missions"] });
    qc.invalidateQueries({ queryKey: ["xp_history"] });
  };
}
