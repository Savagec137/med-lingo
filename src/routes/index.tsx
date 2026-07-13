import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, Lock, CheckCircle2, RotateCcw } from "lucide-react";
import { UNITS, allLessonsInOrder } from "@/lib/curriculum";
import { useProgress } from "@/lib/use-progress";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { progress, hydrated, resetAll } = useProgress();

  const order = allLessonsInOrder();
  // The first lesson is always unlocked. A lesson is unlocked if the previous is completed (any stars).
  const unlockedSet = new Set<string>();
  if (order.length > 0) unlockedSet.add(order[0].lessonId);
  for (let i = 0; i < order.length - 1; i++) {
    const cur = order[i].lessonId;
    if (progress.completedLessons[cur]) unlockedSet.add(order[i + 1].lessonId);
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <section className="mb-8 rounded-2xl bg-gradient-to-br from-[color:var(--color-primary)] to-[color:oklch(0.58_0.16_190)] p-6 text-primary-foreground shadow-md">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
            MedLingo — DEA Ambulancier
          </h1>
          <p className="mt-2 max-w-xl text-sm opacity-95 sm:text-base">
            Hygiène, bilans, gestes d'urgence, pathologies, réglementation.
            Des mini-quiz courts pour réviser chaque jour et progresser.
          </p>
          {hydrated && progress.xp > 0 && (
            <button
              onClick={() => {
                if (confirm("Réinitialiser toute ta progression ?")) resetAll();
              }}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-white/25"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </button>
          )}
        </section>

        <div className="space-y-10">
          {UNITS.map((unit, unitIdx) => (
            <section key={unit.id}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-2xl">
                  {unit.icon}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Unité {unitIdx + 1}
                  </p>
                  <h2 className="text-xl font-extrabold">{unit.title}</h2>
                  <p className="text-sm text-muted-foreground">{unit.subtitle}</p>
                </div>
              </div>

              <ol className="relative ml-6 space-y-4 border-l-2 border-dashed border-border pl-6">
                {unit.lessons.map((lesson, i) => {
                  const done = hydrated ? progress.completedLessons[lesson.id] : undefined;
                  const unlocked = !hydrated ? false : unlockedSet.has(lesson.id);
                  const stars = done?.stars ?? 0;
                  return (
                    <li key={lesson.id} className="relative">
                      <span
                        className={`absolute -left-[34px] top-3 h-4 w-4 rounded-full border-2 ${
                          done
                            ? "border-[color:var(--color-success)] bg-[color:var(--color-success)]"
                            : unlocked
                              ? "border-[color:var(--color-primary)] bg-background"
                              : "border-border bg-background"
                        }`}
                      />
                      <LessonCard
                        lessonId={lesson.id}
                        title={lesson.title}
                        emoji={lesson.emoji}
                        index={i + 1}
                        unlocked={unlocked}
                        done={!!done}
                        stars={stars}
                      />
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Contenu à visée éducative uniquement — ne remplace pas un cours ou un
          avis médical professionnel.
        </p>
      </main>
    </div>
  );
}

function LessonCard({
  lessonId,
  title,
  emoji,
  index,
  unlocked,
  done,
  stars,
}: {
  lessonId: string;
  title: string;
  emoji: string;
  index: number;
  unlocked: boolean;
  done: boolean;
  stars: number;
}) {
  const inner = (
    <div
      className={`flex items-center gap-4 rounded-2xl border-2 p-4 transition ${
        !unlocked
          ? "border-border bg-muted/40 opacity-70"
          : done
            ? "border-[color:var(--color-success)] bg-card hover:-translate-y-0.5"
            : "border-[color:var(--color-primary)] bg-card hover:-translate-y-0.5"
      }`}
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl">
        {!unlocked ? <Lock className="h-5 w-5 text-muted-foreground" /> : emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Leçon {index}
        </p>
        <p className="truncate font-bold">{title}</p>
        {done && (
          <div className="mt-1 flex items-center gap-0.5">
            {[0, 1, 2].map((s) => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${
                  s < stars
                    ? "fill-[color:var(--color-warning)] text-[color:var(--color-warning)]"
                    : "text-border"
                }`}
              />
            ))}
          </div>
        )}
      </div>
      {done ? (
        <CheckCircle2 className="h-6 w-6 text-[color:var(--color-success)]" />
      ) : unlocked ? (
        <span className="rounded-full bg-[color:var(--color-primary)] px-3 py-1 text-xs font-extrabold text-primary-foreground">
          Commencer
        </span>
      ) : null}
    </div>
  );
  if (!unlocked) return inner;
  return (
    <Link to="/lecon/$lessonId" params={{ lessonId }} className="block">
      {inner}
    </Link>
  );
}
