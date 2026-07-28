import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, memo, Suspense, useEffect, useMemo } from "react";
import {
  Check,
  Sparkles,
  Zap,
  Flame,
  Trophy,
  Target,
  ChevronRight,
  User as UserIcon,
  Ambulance as AmbulanceIcon,
} from "lucide-react";
import { LessonIcon, MissionIcon } from "@/lib/icon-map";
import { allLessonsInOrder, findLesson } from "@/lib/curriculum";
import { useProgress } from "@/lib/use-progress";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/use-auth";
import { levelProgress } from "@/lib/gamification";
import { useDeferredHomeData, useHomeDashboard } from "@/features/home/home-dashboard";

// ============================================
// BACKGROUND ENGINE — IMPORTS
// ============================================
const LazyHomeBackground = lazy(() =>
  import("@/features/home/HomeBackground").then((module) => ({
    default: module.HomeBackground,
  })),
);
const LazyHomeRoadmap = lazy(() =>
  import("@/features/home/HomeRoadmap").then((module) => ({
    default: module.HomeRoadmap,
  })),
);
const LESSON_ORDER = allLessonsInOrder();

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

function HomeRoute() {
  return <Home />;
}

const Home = memo(function Home() {
  const { progress, hydrated } = useProgress();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !progress.onboarded) navigate({ to: "/onboarding" });
  }, [hydrated, progress.onboarded, navigate]);

  const order = LESSON_ORDER;
  const unlockedLessonIds = useMemo(() => {
    const ids: string[] = [];
    if (order.length > 0) ids.push(order[0].lessonId);
    for (let i = 0; i < order.length - 1; i++) {
      if (progress.completedLessons[order[i].lessonId]) ids.push(order[i + 1].lessonId);
    }
    return ids;
  }, [order, progress.completedLessons]);
  const unlockedSet = useMemo(() => new Set(unlockedLessonIds), [unlockedLessonIds]);
  const currentLessonId = hydrated
    ? order.find((l) => unlockedSet.has(l.lessonId) && !progress.completedLessons[l.lessonId])
        ?.lessonId
    : undefined;

  const currentLesson = currentLessonId ? findLesson(currentLessonId) : null;

  const firstName = useMemo(() => {
    const full =
      (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || "";
    if (full) return full.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "toi";
  }, [user]);

  const lp = useMemo(() => levelProgress(progress.xp), [progress.xp]);
  const dailyPct = useMemo(
    () => Math.min(1, progress.xpToday / Math.max(1, progress.dailyGoalXp)),
    [progress.dailyGoalXp, progress.xpToday],
  );
  const deferredHomeData = useDeferredHomeData();
  const { data: dashboard } = useHomeDashboard(deferredHomeData);
  const dailyMissions = dashboard?.dailyMissions ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ minHeight: "100vh" }}>
      {/* ========================================== */}
      {/* BACKGROUND ENGINE — SAMU REGULATION CENTER */}
      {/* ========================================== */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-950 via-slate-950 to-cyan-950"
      />
      {deferredHomeData && (
        <Suspense fallback={null}>
          <LazyHomeBackground />
        </Suspense>
      )}

      {/* ========================================== */}
      {/* CONTENU PRINCIPAL (par-dessus le décor)    */}
      {/* ========================================== */}
      <div className="relative z-10 min-h-screen pb-24">
        <TopBar wallet={dashboard?.wallet ?? null} />

        <main className="mx-auto max-w-2xl px-4 pt-4">
          {/* Greeting */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-extrabold leading-tight text-white drop-shadow-lg">
                Bonjour {firstName}
              </h1>
              <p className="text-sm text-slate-300 drop-shadow-md">
                {progress.streak > 0
                  ? `${progress.streak} jour${progress.streak > 1 ? "s" : ""} de série — continue !`
                  : "Prêt pour ta première leçon du jour ?"}
              </p>
            </div>
            <Link
              to="/profil"
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all"
              aria-label="Profil"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
          </div>

          {/* Level + Daily goal card - Glassmorphism */}
          <div className="mb-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-5 shadow-xl">
            <div className="flex items-center gap-4">
              <ProgressRing pct={lp.pct} size={72} color="#22d3ee">
                <div className="text-center leading-none">
                  <div className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">
                    Niv
                  </div>
                  <div className="font-display text-2xl font-extrabold text-white">{lp.level}</div>
                </div>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-display text-sm font-extrabold uppercase tracking-wider text-white/80">
                    Niveau {lp.level}
                  </div>
                  <div className="text-sm font-bold text-white/70">
                    {lp.xpIntoLevel}/{lp.xpForNextLevel} XP
                  </div>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] to-[#34d399] transition-all"
                    style={{ width: `${lp.pct * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm font-bold text-white/80">
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-400" />
                    {progress.streak}j
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    {progress.xp} XP
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    {dashboard?.badgeCount ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm font-extrabold uppercase tracking-wider text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  Objectif du jour
                </span>
                <span>
                  {progress.xpToday}/{progress.dailyGoalXp} XP
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[#34d399] transition-all"
                  style={{ width: `${dailyPct * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Continue lesson CTA */}
          {currentLesson && (
            <Link
              to="/lecon/$lessonId"
              params={{ lessonId: currentLesson.lesson.id }}
              className="mb-4 flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl hover:bg-white/20 transition-all active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#22d3ee]/20 text-[#22d3ee]">
                <LessonIcon
                  lessonId={currentLesson.lesson.id}
                  unitId={currentLesson.unit.id}
                  className="h-7 w-7"
                  strokeWidth={2.25}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#22d3ee]">
                  Continuer
                </div>
                <div className="truncate font-display text-base font-extrabold text-white">
                  {currentLesson.lesson.title}
                </div>
                <div className="truncate text-sm text-white/60">{currentLesson.unit.title}</div>
              </div>
              <ChevronRight className="h-6 w-6 text-[#22d3ee]" />
            </Link>
          )}

          {/* Mode Intervention CTA */}
          <Link
            to="/intervention"
            className="mb-4 flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 backdrop-blur-md border border-cyan-400/30 p-4 shadow-xl hover:shadow-2xl transition-all active:scale-95"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-slate-900">
              <AmbulanceIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                Nouveau mode
              </div>
              <div className="font-display text-base font-extrabold text-white">
                Mode Intervention
              </div>
              <div className="text-sm text-cyan-200/70">
                Missions préhospitalières et décisions immersives
              </div>
            </div>
            <ChevronRight className="h-6 w-6 text-cyan-300" />
          </Link>

          {/* Daily missions */}
          {user && dailyMissions.length > 0 && (
            <div className="mb-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-white/80">
                  Missions du jour
                </h2>
                <span className="text-sm font-bold text-white/60">
                  {dailyMissions.filter((mission) => mission.completed).length}/
                  {dailyMissions.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {dailyMissions.map((m) => {
                  const done = m.completed;
                  const prog = Math.min(m.target, m.progress);
                  const pct = (prog / m.target) * 100;
                  return (
                    <div key={m.code} className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          done ? "bg-emerald-500/30 text-emerald-400" : "bg-white/10 text-white/60"
                        }`}
                      >
                        {done ? (
                          <Check className="h-5 w-5" strokeWidth={3} />
                        ) : (
                          <MissionIcon code={m.code} className="h-5 w-5" strokeWidth={2.25} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="truncate font-display font-extrabold text-white">
                            {m.title}
                          </div>
                          <div className="shrink-0 text-sm font-bold text-white/60">
                            {prog}/{m.target} · +{m.xp_reward}XP
                          </div>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
                          <div
                            className={`h-full rounded-full ${done ? "bg-emerald-400" : "bg-cyan-400"} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pulse CTA */}
          <Link
            to="/pulse"
            className="mb-8 flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl hover:bg-white/20 transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#22d3ee]/20 text-[#22d3ee]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-extrabold text-white">Pulse IA</div>
              <div className="truncate text-sm text-white/60">
                Ton tuteur médical — demande-lui n'importe quoi.
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[#22d3ee]" />
          </Link>

          {deferredHomeData && (
            <Suspense fallback={null}>
              <LazyHomeRoadmap
                completedLessons={progress.completedLessons}
                currentLessonId={currentLessonId}
                hydrated={hydrated}
                unlockedLessonIds={unlockedLessonIds}
              />
            </Suspense>
          )}

          <p className="mt-14 text-center text-sm text-white/40 drop-shadow-md">
            Contenu à visée éducative — ne remplace pas un cours ou un avis médical.
          </p>
        </main>
      </div>
    </div>
  );
});

// ============================================
// COMPOSANTS UI
// ============================================

function ProgressRing({
  pct,
  size = 64,
  color = "#22d3ee",
  children,
}: {
  pct: number;
  size?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, pct)))}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
