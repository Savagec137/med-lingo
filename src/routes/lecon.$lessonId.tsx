import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, X, Heart, ArrowRight, Home as HomeIcon, Trophy, PartyPopper, Dumbbell, Star } from "lucide-react";
import { findLesson } from "@/lib/curriculum";
import { useProgress, MAX_HEARTS } from "@/lib/use-progress";

export const Route = createFileRoute("/lecon/$lessonId")({
  component: LessonPage,
  head: ({ params }) => {
    const found = findLesson(params.lessonId);
    const title = found ? `${found.lesson.title} — MedLingo` : "Leçon — MedLingo";
    return {
      meta: [
        { title },
        { name: "description", content: "Mini-quiz de vocabulaire médical." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function LessonPage() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const found = findLesson(lessonId);
  const { progress, hydrated, completeLesson, loseHeart } = useProgress();

  // Shuffle questions once per mount for freshness (stable enough for a session).
  const questions = useMemo(
    () => (found ? shuffle(found.lesson.questions) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessonId],
  );

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{ stars: number; score: number } | null>(null);

  if (!found) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="mb-4 text-lg font-bold">Leçon introuvable.</p>
          <Link to="/" className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const total = questions.length;
  const current = questions[idx];
  const progressPct = ((idx + (checked ? 1 : 0)) / total) * 100;
  const outOfHearts = hydrated && progress.hearts <= 0 && !finished;

  const onCheck = () => {
    if (selected === null) return;
    const isCorrect = selected === current.answer;
    setChecked(true);
    if (isCorrect) setCorrectCount((c) => c + 1);
    else {
      setWrongCount((c) => c + 1);
      loseHeart();
    }
  };

  const onNext = () => {
    if (idx + 1 >= total) {
      const r = completeLesson(lessonId, correctCount, total);
      setResult(r);
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setChecked(false);
  };

  if (outOfHearts) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <Heart className="mb-4 h-16 w-16 text-[color:var(--color-destructive)]" />
        <h1 className="mb-2 text-2xl font-extrabold">Plus de cœurs !</h1>
        <p className="mb-6 text-muted-foreground">
          Reviens dans quelques minutes — un cœur se régénère toutes les 15 min.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-extrabold text-primary-foreground"
        >
          <HomeIcon className="h-4 w-4" /> Accueil
        </Link>
      </div>
    );
  }

  if (finished && result) {
    const pct = Math.round(result.score * 100);
    const xpGained = 10 + result.stars * 5;
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <div className={`mb-4 flex h-24 w-24 items-center justify-center rounded-3xl border-2 shadow-[0_6px_0_0_var(--color-border)] ${result.stars === 3 ? "border-[color:var(--color-warning)] bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]" : result.stars >= 1 ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]" : "border-border bg-secondary text-foreground"}`}>
          {result.stars === 3 ? (
            <Trophy className="h-12 w-12" strokeWidth={2.25} />
          ) : result.stars >= 1 ? (
            <PartyPopper className="h-12 w-12" strokeWidth={2.25} />
          ) : (
            <Dumbbell className="h-12 w-12" strokeWidth={2.25} />
          )}
        </div>
        <h1 className="mb-1 text-3xl font-extrabold">
          {result.stars === 0 ? "Presque !" : "Bien joué !"}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {correctCount} bonnes réponses sur {total} ({pct}%)
        </p>
        <div className="mb-6 flex gap-8 text-center">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Étoiles</p>
            <div className="mt-1 flex items-center justify-center gap-0.5">
              {[0, 1, 2].map((s) => (
                <Star
                  key={s}
                  className={`h-6 w-6 ${s < result.stars ? "fill-[color:var(--color-warning)] text-[color:var(--color-warning)]" : "text-border"}`}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">XP gagnés</p>
            <p className="text-2xl font-extrabold text-[color:var(--color-primary)]">+{xpGained}</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <button
            onClick={() => navigate({ to: "/" })}
            className="rounded-2xl bg-primary px-6 py-3 font-extrabold text-primary-foreground shadow-[0_4px_0_0_oklch(from_var(--color-primary)_calc(l-0.12)_c_h)] active:translate-y-[2px] active:shadow-[0_2px_0_0_oklch(from_var(--color-primary)_calc(l-0.12)_c_h)]"
          >
            Continuer
          </button>
          {result.stars < 3 && (
            <button
              onClick={() => {
                setIdx(0);
                setSelected(null);
                setChecked(false);
                setCorrectCount(0);
                setWrongCount(0);
                setFinished(false);
                setResult(null);
              }}
              className="rounded-2xl border-2 border-border px-6 py-3 font-bold text-foreground"
            >
              Refaire la leçon
            </button>
          )}
        </div>
      </div>
    );
  }

  const isCorrect = checked && selected === current.answer;
  const isWrong = checked && selected !== current.answer;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header with progress + hearts */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => {
              if (confirm("Quitter la leçon ? Ta progression sera perdue.")) navigate({ to: "/" });
            }}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Quitter"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-[color:var(--color-success)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="flex items-center gap-1 text-sm font-bold text-[color:var(--color-destructive)]">
            <Heart className="h-5 w-5 fill-current" />
            {hydrated ? progress.hearts : MAX_HEARTS}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {found.unit.title} · {found.lesson.title}
        </p>
        <h1 className="mb-6 text-2xl font-extrabold leading-tight sm:text-3xl">
          {current.question}
        </h1>

        <div className="grid gap-3">
          {current.choices.map((choice, i) => {
            const chosen = selected === i;
            const showCorrect = checked && i === current.answer;
            const showWrong = checked && chosen && i !== current.answer;
            return (
              <button
                key={i}
                disabled={checked}
                onClick={() => setSelected(i)}
                className={`rounded-2xl border-2 px-4 py-4 text-left font-bold transition ${
                  showCorrect
                    ? "border-[color:var(--color-success)] bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]"
                    : showWrong
                      ? "border-[color:var(--color-destructive)] bg-[color:var(--color-destructive)]/10 text-[color:var(--color-destructive)]"
                      : chosen
                        ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10"
                        : "border-border bg-card hover:border-[color:var(--color-primary)]/60"
                }`}
              >
                {choice}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />
      </main>

      {/* Footer: check / next */}
      <footer
        className={`border-t-2 ${
          isCorrect
            ? "border-[color:var(--color-success)] bg-[color:var(--color-success)]/10"
            : isWrong
              ? "border-[color:var(--color-destructive)] bg-[color:var(--color-destructive)]/10"
              : "border-border bg-background"
        }`}
      >
        <div className="mx-auto max-w-2xl px-4 py-4">
          {checked && (
            <div className="mb-3">
              <p
                className={`flex items-center gap-2 text-lg font-extrabold ${
                  isCorrect
                    ? "text-[color:var(--color-success)]"
                    : "text-[color:var(--color-destructive)]"
                }`}
              >
                {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                {isCorrect ? "Bonne réponse !" : "Pas tout à fait"}
              </p>
              {!isCorrect && (
                <p className="mt-1 text-sm">
                  Bonne réponse :{" "}
                  <span className="font-bold">{current.choices[current.answer]}</span>
                </p>
              )}
              {current.explanation && (
                <p className="mt-1 text-sm text-muted-foreground">{current.explanation}</p>
              )}
            </div>
          )}
          {!checked ? (
            <button
              onClick={onCheck}
              disabled={selected === null}
              className="w-full rounded-2xl bg-primary py-4 font-extrabold uppercase tracking-wide text-primary-foreground shadow-[0_4px_0_0_oklch(from_var(--color-primary)_calc(l-0.12)_c_h)] transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none active:translate-y-[2px] active:shadow-[0_2px_0_0_oklch(from_var(--color-primary)_calc(l-0.12)_c_h)]"
            >
              Vérifier
            </button>
          ) : (
            <button
              onClick={onNext}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-extrabold uppercase tracking-wide text-primary-foreground shadow-[0_4px_0_0_oklch(from_var(--color-primary)_calc(l-0.12)_c_h)] active:translate-y-[2px] active:shadow-[0_2px_0_0_oklch(from_var(--color-primary)_calc(l-0.12)_c_h)] ${
                isCorrect
                  ? "bg-[color:var(--color-success)]"
                  : "bg-[color:var(--color-destructive)]"
              }`}
            >
              Continuer <ArrowRight className="h-5 w-5" />
              <span className="ml-2 text-xs opacity-80">
                ({wrongCount + correctCount}/{total})
              </span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
