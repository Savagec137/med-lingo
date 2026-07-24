import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  Star,
  Lock,
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
import { UnitArtwork, LessonIcon, MissionIcon, BadgeIcon } from "@/lib/icon-map";
import { PARCOURS, allLessonsInOrder, findLesson } from "@/lib/curriculum";
import { useProgress } from "@/lib/use-progress";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/use-auth";
import { levelProgress } from "@/lib/gamification";
import {
  useBadgesCatalog,
  useUserBadges,
  useMissionsCatalog,
  useUserMissions,
  useXpHistory,
} from "@/lib/use-gamification";

// ============================================
// BACKGROUND ENGINE — IMPORTS
// ============================================
import { BackgroundEngine } from "@/features/background/BackgroundEngine";
import { THEMES } from "@/features/background/themes";

export const Route = createFileRoute("/")({
  component: Home,
});

const OFFSETS = [0, 64, 96, 64, 0, -64, -96, -64];

function Home() {
  const { progress, hydrated } = useProgress();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !progress.onboarded) navigate({ to: "/onboarding" });
  }, [hydrated, progress.onboarded, navigate]);

  const order = allLessonsInOrder();
  const unlockedSet = new Set<string>();
  if (order.length > 0) unlockedSet.add(order[0].lessonId);
  for (let i = 0; i < order.length - 1; i++) {
    if (progress.completedLessons[order[i].lessonId]) unlockedSet.add(order[i + 1].lessonId);
  }
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

  const lp = levelProgress(progress.xp);
  const dailyPct = Math.min(1, progress.xpToday / Math.max(1, progress.dailyGoalXp));

  const { data: badges = [] } = useBadgesCatalog();
  const { data: userBadges = [] } = useUserBadges();
  const { data: missions = [] } = useMissionsCatalog();
  const { data: userMissions = [] } = useUserMissions();
  const { data: xpHistory = [] } = useXpHistory(7);

  const dailyMissions = missions.filter((m) => m.period === "daily").slice(0, 3);
  const badgeMap = new Map(badges.map((b) => [b.code, b]));
  const recentBadges = userBadges.slice(0, 5);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ minHeight: '100vh' }}>
      
      {/* ========================================== */}
      {/* BACKGROUND ENGINE — SAMU REGULATION CENTER */}
      {/* ========================================== */}
      <BackgroundEngine
        theme={THEMES.samu}
        intensity="medium"
      />

      {/* ========================================== */}
      {/* CONTENU PRINCIPAL (par-dessus le décor)    */}
      {/* ========================================== */}
      <div className="relative z-10 min-h-screen pb-24">
        <TopBar />

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
                  <div className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Niv</div>
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
                    {userBadges.length}
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
                <div className="truncate text-sm text-white/60">
                  {currentLesson.unit.title}
                </div>
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
                  {
                    userMissions.filter(
                      (um) => um.completed && dailyMissions.some((m) => m.code === um.mission_code),
                    ).length
                  }
                  /{dailyMissions.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {dailyMissions.map((m) => {
                  const um = userMissions.find((u) => u.mission_code === m.code);
                  const done = um?.completed ?? false;
                  const prog = Math.min(m.target, um?.progress ?? 0);
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
                          <div className="truncate font-display font-extrabold text-white">{m.title}</div>
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

          {/* Weekly XP */}
          {xpHistory.length > 0 && (
            <div className="mb-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-white/80">
                  Cette semaine
                </h2>
                <span className="text-sm font-bold text-cyan-400">
                  {xpHistory.reduce((s, d) => s + d.xp, 0)} XP
                </span>
              </div>
              <WeeklyBars data={xpHistory} goal={progress.dailyGoalXp} />
            </div>
          )}

          {/* Recent badges */}
          {recentBadges.length > 0 && (
            <div className="mb-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-white/80">
                  Badges récents
                </h2>
                <Link
                  to="/profil"
                  className="text-sm font-bold text-cyan-400 hover:text-cyan-300"
                >
                  Tout voir →
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentBadges.map((ub) => {
                  const b = badgeMap.get(ub.badge_code);
                  if (!b) return null;
                  return (
                    <div
                      key={ub.badge_code}
                      className="flex w-20 shrink-0 flex-col items-center rounded-lg border border-white/20 bg-white/10 p-2"
                    >
                      <BadgeIcon code={ub.badge_code} className="h-8 w-8" strokeWidth={2.25} />
                      <div className="mt-1 line-clamp-2 text-center text-xs font-bold leading-tight text-white">
                        {b.title}
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

          {/* Parcours */}
          <h2 className="mb-4 font-display text-lg font-extrabold text-white drop-shadow-lg">Ton parcours</h2>
          <div className="space-y-8">
            {PARCOURS.map((parcours, parcoursIdx) => (
              <section key={parcours.id}>
                <div className="mb-4 flex items-center gap-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl">
                  <UnitArtwork unitId={parcours.id} />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
                      Parcours {parcoursIdx + 1}
                    </p>
                    <h2 className="truncate font-display text-lg font-extrabold text-white">{parcours.title}</h2>
                    <p className="truncate text-sm text-white/60">{parcours.subtitle}</p>
                  </div>
                </div>

                <div className="relative mx-auto flex flex-col items-center gap-6 py-2">
                  {parcours.lessons.map((lesson, i) => {
                    const done = hydrated ? progress.completedLessons[lesson.id] : undefined;
                    const unlocked = !hydrated ? false : unlockedSet.has(lesson.id);
                    const stars = done?.stars ?? 0;
                    const isCurrent = lesson.id === currentLessonId;
                    const offset = OFFSETS[i % OFFSETS.length];
                    return (
                      <div
                        key={lesson.id}
                        className="relative flex flex-col items-center"
                        style={{ transform: `translateX(${offset}px)` }}
                      >
                        <LessonNode
                          lessonId={lesson.id}
                          unitId={parcours.id}
                          title={lesson.title}
                          unlocked={unlocked}
                          done={!!done}
                          stars={stars}
                          isCurrent={isCurrent}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-14 text-center text-sm text-white/40 drop-shadow-md">
            Contenu à visée éducative — ne remplace pas un cours ou un avis médical.
          </p>
        </main>
      </div>
    </div>
  );
}

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

function WeeklyBars({ data, goal }: { data: { date: string; xp: number }[]; goal: number }) {
  const max = Math.max(goal, ...data.map((d) => d.xp), 10);
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  return (
    <div className="flex items-end justify-between gap-1.5 h-24">
      {data.map((d, i) => {
        const day = new Date(d.date + "T00:00:00").getDay();
        const li = day === 0 ? 6 : day - 1;
        const h = (d.xp / max) * 100;
        const met = d.xp >= goal;
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative flex h-full w-full items-end">
              <div
                className={`w-full rounded-t-md ${
                  met
                    ? "bg-emerald-400"
                    : d.xp > 0
                    ? "bg-cyan-400"
                    : "bg-white/10"
                }`}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
            </div>
            <div className="text-xs font-bold text-white/40">{labels[li]}</div>
          </div>
        );
      })}
    </div>
  );
}

function LessonNode({
  lessonId,
  unitId,
  title,
  unlocked,
  done,
  stars,
  isCurrent,
}: {
  lessonId: string;
  unitId: string;
  title: string;
  unlocked: boolean;
  done: boolean;
  stars: number;
  isCurrent: boolean;
}) {
  const bubble = (
    <div className="group relative flex flex-col items-center">
      {isCurrent && (
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="whitespace-nowrap rounded-lg bg-cyan-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-900 shadow-lg">
            À toi !
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={!unlocked}
        className={`relative flex h-16 w-16 items-center justify-center rounded-xl transition-all ${
          !unlocked
            ? "cursor-not-allowed border-2 border-dashed border-white/20 bg-white/5 text-white/30"
            : done
            ? "border-2 border-emerald-400 bg-emerald-400/20 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.2)] hover:shadow-[0_0_40px_rgba(52,211,153,0.3)] active:scale-95"
            : isCurrent
            ? "border-2 border-cyan-400 bg-cyan-400/20 text-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.3)] ring-4 ring-cyan-400/30 active:scale-95"
            : "border-2 border-white/20 bg-white/10 text-white/60 hover:border-white/40 active:scale-95"
        }`}
      >
        {!unlocked ? (
          <Lock className="h-5 w-5" />
        ) : done ? (
          <Check className="h-7 w-7" strokeWidth={3.5} />
        ) : (
          <LessonIcon lessonId={lessonId} unitId={unitId} className="h-7 w-7" strokeWidth={2.25} />
        )}
        {done && stars > 0 && (
          <div className="absolute -bottom-2 flex items-center gap-0.5 rounded-full bg-white/20 backdrop-blur-sm px-1.5 py-0.5 shadow-md">
            {[0, 1, 2].map((s) => (
              <Star
                key={s}
                className={`h-3 w-3 ${
                  s < stars
                    ? "fill-amber-400 text-amber-400"
                    : "text-white/20"
                }`}
              />
            ))}
          </div>
        )}
      </button>
      <p
        className={`mt-3 max-w-[160px] text-center text-xs font-bold leading-tight ${
          unlocked ? "text-white drop-shadow-md" : "text-white/40"
        }`}
      >
        {title}
      </p>
    </div>
  );
  if (!unlocked) return bubble;
  return (
    <Link to="/lecon/$lessonId" params={{ lessonId }} className="block">
      {bubble}
    </Link>
  );
}