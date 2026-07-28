import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { mondayOfWeekIso, todayIso } from "@/lib/gamification";
import type { Wallet } from "@/lib/use-wallet";
import type { Badge, Mission } from "@/lib/use-gamification";
import { aggregateXpHistory, type HomeXpDay } from "./home-dashboard-utils";

const HOME_CACHE_VERSION = 1;
const HOME_STALE_TIME = 60_000;
const HOME_CACHE_MAX_AGE = 15 * 60_000;

export interface HomeBadge {
  badge_code: string;
  earned_at: string;
  badge: Badge;
}

export interface HomeMission extends Mission {
  progress: number;
  completed: boolean;
}

export interface HomeDashboard {
  wallet: Wallet | null;
  badgeCount: number;
  recentBadges: HomeBadge[];
  dailyMissions: HomeMission[];
  xpHistory: HomeXpDay[];
}

interface PersistedHomeDashboard {
  version: number;
  updatedAt: number;
  data: HomeDashboard;
}

function cacheKey(userId: string) {
  return `medlingo-home-dashboard-v${HOME_CACHE_VERSION}:${userId}`;
}

function readHomeCache(userId: string): PersistedHomeDashboard | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(cacheKey(userId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PersistedHomeDashboard;
    if (
      parsed.version !== HOME_CACHE_VERSION ||
      Date.now() - parsed.updatedAt > HOME_CACHE_MAX_AGE
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

function writeHomeCache(userId: string, data: HomeDashboard) {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedHomeDashboard = {
      version: HOME_CACHE_VERSION,
      updatedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(cacheKey(userId), JSON.stringify(payload));
  } catch {
    // Le cache navigateur reste une optimisation facultative.
  }
}

async function fetchHomeDashboardFallback(days: number): Promise<HomeDashboard> {
  const today = todayIso();
  const monday = mondayOfWeekIso();
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const [walletResult, badgesResult, missionsResult, userMissionsResult, xpResult] =
    await Promise.all([
      supabase
        .from("wallets" as never)
        .select("coins, gems, keys, energy, energy_max, energy_updated_at")
        .maybeSingle(),
      supabase
        .from("user_badges" as never)
        .select(
          "badge_code, earned_at, badge:badges(code, title, description, icon, rarity, threshold)",
        )
        .order("earned_at", { ascending: false }),
      supabase
        .from("missions" as never)
        .select("code, title, description, icon, period, metric, target, xp_reward")
        .eq("active", true)
        .eq("period", "daily"),
      supabase
        .from("user_missions" as never)
        .select("mission_code, period_start, progress, completed")
        .in("period_start", [today, monday]),
      supabase
        .from("xp_transactions" as never)
        .select("amount, created_at")
        .gte("created_at", since.toISOString()),
    ]);

  const firstError = [
    walletResult.error,
    badgesResult.error,
    missionsResult.error,
    userMissionsResult.error,
    xpResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  const badges = (badgesResult.data ?? []) as unknown as HomeBadge[];
  const missions = (missionsResult.data ?? []) as unknown as Mission[];
  const userMissions = (userMissionsResult.data ?? []) as unknown as {
    mission_code: string;
    progress: number;
    completed: boolean;
  }[];
  const missionProgress = new Map(userMissions.map((mission) => [mission.mission_code, mission]));

  return {
    wallet: (walletResult.data as unknown as Wallet | null) ?? null,
    badgeCount: badges.length,
    recentBadges: badges.slice(0, 5),
    dailyMissions: missions.slice(0, 3).map((mission) => ({
      ...mission,
      progress: missionProgress.get(mission.code)?.progress ?? 0,
      completed: missionProgress.get(mission.code)?.completed ?? false,
    })),
    xpHistory: aggregateXpHistory(
      (xpResult.data ?? []) as unknown as { amount: number; created_at: string }[],
      days,
    ),
  };
}

async function fetchHomeDashboard(days: number): Promise<HomeDashboard> {
  const { data, error } = await supabase.rpc(
    "get_home_dashboard" as never,
    { _days: days } as never,
  );
  if (!error && data) return data as unknown as HomeDashboard;
  return fetchHomeDashboardFallback(days);
}

export function useDeferredHomeData(delay = 180) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let idleId: number | undefined;
    const animationFrame = window.requestAnimationFrame(() => {
      if (typeof idleWindow.requestIdleCallback === "function") {
        idleId = idleWindow.requestIdleCallback(() => setReady(true), { timeout: delay });
      } else {
        timeoutId = globalThis.setTimeout(() => setReady(true), delay);
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, [delay]);

  return ready;
}

export function useHomeDashboard(enabled: boolean, days = 7) {
  const { user } = useAuth();
  const userId = user?.id;
  const cached = useMemo(() => (userId ? readHomeCache(userId) : undefined), [userId]);

  return useQuery({
    queryKey: ["home-dashboard", userId ?? "anon", days],
    enabled: enabled && !!userId,
    staleTime: HOME_STALE_TIME,
    gcTime: 30 * 60_000,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    queryFn: async () => {
      if (!userId) throw new Error("Utilisateur non connecté");
      const dashboard = await fetchHomeDashboard(days);
      writeHomeCache(userId, dashboard);
      return dashboard;
    },
  });
}
