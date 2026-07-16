import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Star, Lock, Check, Sparkles, Zap, Flame, Trophy, Target, ChevronRight, User as UserIcon } from "lucide-react";
import { UnitIcon, LessonIcon, MissionIcon, BadgeIcon } from "@/lib/icon-map";
import { UNITS, allLessonsInOrder, findLesson } from "@/lib/curriculum";
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
    ? order.find((l) => unlockedSet.has(l.lessonId) && !progress.completedLessons[l.lessonId])?.lessonId
    : undefined;

  const currentLesson = currentLessonId ? findLesson(currentLessonId) : null;

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || "";
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
    <div className="min-h-screen bg-background pb-24">
      <TopBar />

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {/* Greeting */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-tight">
              Bonjour {firstName} 👋
            </h1>
            <p className="text-xs text-muted-foreground">
              {progress.streak > 0
                ? `${progress.streak} jour${progress.streak > 1 ? "s" : ""} de série — continue !`
                : "Prêt pour ta première leçon du jour ?"}
            </p>
          </div>
          <Link
            to="/profil"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-[0_3px_0_0_var(--color-border)] hover:border-[color:var(--color-primary)]"
            aria-label="Profil"
          >
            <UserIcon className="h-5 w-5" />
          </Link>
        </div>

        {/* Level + Daily goal card */}
        <section className="mb-4 rounded-3xl border-2 border-[color:var(--color-primary)] bg-gradient-to-br from-[oklch(0.78_0.19_145)] to-[color:var(--color-primary)] p-5 text-primary-foreground shadow-[0_6px_0_0_oklch(0.55_0.17_145)]">
          <div className="flex items-center gap-4">
            {/* Level ring */}
            <ProgressRing pct={lp.pct} size={72}>
              <div className="text-center leading-none">
                <div className="text-[10px] font-bold uppercase opacity-80">Niv</div>
                <div className="font-display text-2xl font-extrabold">{lp.level}</div>
              </div>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-display text-sm font-extrabold uppercase tracking-wider">
                  Niveau {lp.level}
                </div>
                <div className="text-[11px] font-bold opacity-90">
                  {lp.xpIntoLevel}/{lp.xpForNextLevel} XP
                </div>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${lp.pct * 100}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] font-bold opacity-95">
                <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{progress.streak}j</span>
                <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{progress.xp} XP</span>
                <span className="inline-flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{userBadges.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />Objectif du jour</span>
              <span>{progress.xpToday}/{progress.dailyGoalXp} XP</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-[color:var(--color-warning)] transition-all"
                style={{ width: `${dailyPct * 100}%` }}
              />
            </div>
          </div>
        </section>

        {/* Continue lesson CTA */}
        {currentLesson && (
          <Link
            to="/lecon/$lessonId"
            params={{ lessonId: currentLesson.lesson.id }}
            className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_4px_0_0_var(--color-border)] transition hover:border-[color:var(--color-primary)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-primary)]/15 text-3xl">
              {currentLesson.lesson.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
                Continuer
              </div>
              <div className="truncate font-display text-base font-extrabold">{currentLesson.lesson.title}</div>
              <div className="truncate text-[11px] text-muted-foreground">{currentLesson.unit.title}</div>
            </div>
            <ChevronRight className="h-6 w-6 text-[color:var(--color-primary)]" />
          </Link>
        )}

        {/* Daily missions */}
        {user && dailyMissions.length > 0 && (
          <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">Missions du jour</h2>
              <span className="text-[10px] font-bold text-muted-foreground">
                {userMissions.filter((um) => um.completed && dailyMissions.some((m) => m.code === um.mission_code)).length}
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
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${done ? "bg-[color:var(--color-success)]/20" : "bg-secondary"}`}>
                      {done ? <Check className="h-5 w-5 text-[color:var(--color-success)]" strokeWidth={3} /> : m.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-sm font-extrabold">{m.title}</div>
                        <div className="shrink-0 text-[11px] font-bold text-muted-foreground">
                          {prog}/{m.target} · +{m.xp_reward}XP
                        </div>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${done ? "bg-[color:var(--color-success)]" : "bg-[color:var(--color-primary)]"} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Weekly XP */}
        {xpHistory.length > 0 && (
          <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">Cette semaine</h2>
              <span className="text-[11px] font-bold text-[color:var(--color-primary)]">
                {xpHistory.reduce((s, d) => s + d.xp, 0)} XP
              </span>
            </div>
            <WeeklyBars data={xpHistory} goal={progress.dailyGoalXp} />
          </section>
        )}

        {/* Recent badges */}
        {recentBadges.length > 0 && (
          <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">Badges récents</h2>
              <Link to="/profil" className="text-[11px] font-bold text-[color:var(--color-primary)]">
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
                    className={`flex w-20 shrink-0 flex-col items-center rounded-xl border-2 p-2 ${rarityBorder(b.rarity)}`}
                  >
                    <div className="text-3xl">{b.icon}</div>
                    <div className="mt-1 line-clamp-2 text-center text-[10px] font-bold leading-tight">
                      {b.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pulse CTA */}
        <Link
          to="/pulse"
          className="mb-8 flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)] transition hover:border-[color:var(--color-primary)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-extrabold">Pulse IA</div>
            <div className="truncate text-xs text-muted-foreground">
              Ton tuteur médical — demande-lui n'importe quoi.
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[color:var(--color-primary)]" />
        </Link>

        {/* Parcours */}
        <h2 className="mb-4 font-display text-lg font-extrabold">Ton parcours</h2>
        <div className="space-y-14">
          {UNITS.map((unit, unitIdx) => (
            <section key={unit.id}>
              <div className="mb-6 flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-warning)]/25 text-3xl">
                  {unit.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
                    Unité {unitIdx + 1}
                  </p>
                  <h2 className="truncate font-display text-lg font-extrabold">{unit.title}</h2>
                  <p className="truncate text-xs text-muted-foreground">{unit.subtitle}</p>
                </div>
              </div>

              <div className="relative mx-auto flex flex-col items-center gap-6 py-2">
                {unit.lessons.map((lesson, i) => {
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
                        title={lesson.title}
                        emoji={lesson.emoji}
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

        <p className="mt-14 text-center text-xs text-muted-foreground">
          Contenu à visée éducative — ne remplace pas un cours ou un avis médical.
        </p>
      </main>
    </div>
  );
}

// -------- UI bits --------

function ProgressRing({ pct, size = 64, children }: { pct: number; size?: number; children?: React.ReactNode }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#fff"
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
                className={`w-full rounded-t-md ${met ? "bg-[color:var(--color-success)]" : d.xp > 0 ? "bg-[color:var(--color-primary)]" : "bg-secondary"}`}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
            </div>
            <div className="text-[10px] font-bold text-muted-foreground">{labels[li]}</div>
          </div>
        );
      })}
    </div>
  );
}

function rarityBorder(rarity: string): string {
  switch (rarity) {
    case "legendary":
      return "border-[color:var(--color-warning)] bg-[color:var(--color-warning)]/10";
    case "epic":
      return "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10";
    case "rare":
      return "border-[color:var(--color-info,#3B82F6)] bg-[color:var(--color-info,#3B82F6)]/10";
    default:
      return "border-border bg-secondary";
  }
}

function LessonNode({
  lessonId,
  title,
  emoji,
  unlocked,
  done,
  stars,
  isCurrent,
}: {
  lessonId: string;
  title: string;
  emoji: string;
  unlocked: boolean;
  done: boolean;
  stars: number;
  isCurrent: boolean;
}) {
  const bubble = (
    <div className="group relative flex flex-col items-center">
      {isCurrent && (
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="whitespace-nowrap rounded-full bg-[color:var(--color-foreground)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-background shadow">
            À toi !
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={!unlocked}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full text-3xl transition-transform ${
          !unlocked
            ? "cursor-not-allowed border-2 border-dashed border-border bg-muted text-muted-foreground"
            : done
              ? "border-2 border-[oklch(0.55_0.17_145)] bg-[color:var(--color-success)] text-primary-foreground shadow-[0_5px_0_0_oklch(0.55_0.17_145)] active:translate-y-[3px] active:shadow-[0_2px_0_0_oklch(0.55_0.17_145)]"
              : isCurrent
                ? "border-2 border-[oklch(0.55_0.17_145)] bg-[color:var(--color-primary)] text-primary-foreground shadow-[0_5px_0_0_oklch(0.55_0.17_145)] ring-4 ring-[color:var(--color-primary)]/25 active:translate-y-[3px] active:shadow-[0_2px_0_0_oklch(0.55_0.17_145)]"
                : "border-2 border-border bg-card text-foreground shadow-[0_5px_0_0_var(--color-border)] active:translate-y-[3px] active:shadow-[0_2px_0_0_var(--color-border)]"
        }`}
      >
        {!unlocked ? (
          <Lock className="h-6 w-6" />
        ) : done ? (
          <Check className="h-8 w-8" strokeWidth={3.5} />
        ) : (
          <span>{emoji}</span>
        )}
        {done && stars > 0 && (
          <div className="absolute -bottom-2 flex items-center gap-0.5 rounded-full bg-card px-1.5 py-0.5 shadow">
            {[0, 1, 2].map((s) => (
              <Star
                key={s}
                className={`h-3 w-3 ${
                  s < stars ? "fill-[color:var(--color-warning)] text-[color:var(--color-warning)]" : "text-border"
                }`}
              />
            ))}
          </div>
        )}
      </button>
      <p className={`mt-3 max-w-[160px] text-center text-xs font-bold leading-tight ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
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
