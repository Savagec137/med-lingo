import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Star, Lock, Check, RotateCcw, Sparkles } from "lucide-react";
import { UNITS, allLessonsInOrder } from "@/lib/curriculum";
import { useProgress } from "@/lib/use-progress";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/")({
  component: Home,
});

// Serpentine horizontal offsets (px) for a zig-zag path
const OFFSETS = [0, 64, 96, 64, 0, -64, -96, -64];

function Home() {
  const { progress, hydrated, resetAll } = useProgress();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !progress.onboarded) {
      navigate({ to: "/onboarding" });
    }
  }, [hydrated, progress.onboarded, navigate]);

  const order = allLessonsInOrder();
  const unlockedSet = new Set<string>();
  if (order.length > 0) unlockedSet.add(order[0].lessonId);
  for (let i = 0; i < order.length - 1; i++) {
    const cur = order[i].lessonId;
    if (progress.completedLessons[cur]) unlockedSet.add(order[i + 1].lessonId);
  }

  // Current lesson = first unlocked & not completed
  const currentLessonId =
    hydrated
      ? order.find(
          (l) => unlockedSet.has(l.lessonId) && !progress.completedLessons[l.lessonId],
        )?.lessonId
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        {/* Hero */}
        <section className="relative mb-10 overflow-hidden rounded-3xl border-2 border-[color:var(--color-primary)] bg-gradient-to-br from-[oklch(0.78_0.19_145)] to-[color:var(--color-primary)] p-6 text-primary-foreground shadow-[0_6px_0_0_oklch(0.55_0.17_145)]">
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">
              DEA · Ambulancier
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              Prends la route<br />de tes révisions.
            </h1>
            <p className="mt-3 max-w-md text-sm opacity-95">
              Bilans, gestes d'urgence, pathologies. Une leçon par jour, ta série grandit.
            </p>
            {hydrated && progress.xp > 0 && (
              <button
                onClick={() => {
                  if (confirm("Réinitialiser toute ta progression ?")) resetAll();
                }}
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider hover:bg-white/30"
              >
                <RotateCcw className="h-3 w-3" /> Réinitialiser
              </button>
            )}
          </div>
          <AmbulanceSVG className="absolute -bottom-2 -right-3 h-24 w-24 rotate-[8deg] opacity-95 drop-shadow-lg sm:h-28 sm:w-28" />
        </section>

        <div className="space-y-14">
          {UNITS.map((unit, unitIdx) => (
            <section key={unit.id}>
              {/* Unit banner */}
              <div className="mb-6 flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-warning)]/25 text-3xl">
                  {unit.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
                    Unité {unitIdx + 1}
                  </p>
                  <h2 className="truncate font-display text-lg font-extrabold">
                    {unit.title}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">{unit.subtitle}</p>
                </div>
              </div>

              {/* Serpentine path */}
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
      {/* Ambulance marker for current lesson */}
      {isCurrent && (
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="relative flex flex-col items-center">
            <div className="mb-1 whitespace-nowrap rounded-full bg-[color:var(--color-foreground)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-background shadow">
              À toi !
            </div>
            <AmbulanceSVG className="h-12 w-12 drop-shadow" />
          </div>
        </div>
      )}

      {/* Circular button */}
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
                  s < stars
                    ? "fill-[color:var(--color-warning)] text-[color:var(--color-warning)]"
                    : "text-border"
                }`}
              />
            ))}
          </div>
        )}
      </button>

      {/* Title */}
      <p
        className={`mt-3 max-w-[160px] text-center text-xs font-bold leading-tight ${
          unlocked ? "text-foreground" : "text-muted-foreground"
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

function AmbulanceSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
      {/* Body */}
      <rect x="2" y="10" width="42" height="20" rx="3" fill="#ffffff" stroke="#0F172A" strokeWidth="2" />
      {/* Cab */}
      <path
        d="M44 14 L58 14 L62 22 L62 30 L44 30 Z"
        fill="#ffffff"
        stroke="#0F172A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Window */}
      <path d="M46 16 L57 16 L60 22 L46 22 Z" fill="#7DD3FC" stroke="#0F172A" strokeWidth="1.5" />
      {/* Red cross */}
      <rect x="18" y="15" width="10" height="10" fill="#EF4444" />
      <rect x="21.5" y="13" width="3" height="14" fill="#ffffff" />
      <rect x="16" y="18.5" width="14" height="3" fill="#ffffff" />
      {/* Lightbar */}
      <rect x="10" y="6" width="24" height="4" rx="1" fill="#EF4444" stroke="#0F172A" strokeWidth="1.5" />
      <rect x="14" y="6" width="6" height="4" fill="#3B82F6" />
      <rect x="24" y="6" width="6" height="4" fill="#3B82F6" />
      {/* Wheels */}
      <circle cx="14" cy="32" r="5" fill="#0F172A" />
      <circle cx="14" cy="32" r="2" fill="#ffffff" />
      <circle cx="50" cy="32" r="5" fill="#0F172A" />
      <circle cx="50" cy="32" r="2" fill="#ffffff" />
    </svg>
  );
}
