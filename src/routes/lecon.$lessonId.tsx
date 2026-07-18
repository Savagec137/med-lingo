import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  X,
  Heart,
  ArrowRight,
  Home as HomeIcon,
  Trophy,
  PartyPopper,
  Dumbbell,
  Star,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { findLesson, type Question } from "@/lib/curriculum";
import { useProgress, MAX_HEARTS } from "@/lib/use-progress";
import { getPedagogicalLesson, PEDAGOGICAL_CONTENT_CATALOG } from "@/content/pedagogical-content";
import { createContentCatalog } from "@/content/content-engine";
import { loadPedagogicalLessonV2 } from "@/content/pedagogical-content-v2";
import {
  prepareContentInteraction,
  selectContentItems,
  type PreparedLessonInteraction,
} from "@/content/lesson-runtime";

export const Route = createFileRoute("/lecon/$lessonId")({
  loader: async ({ params }) => {
    const found = findLesson(params.lessonId);
    if (!found?.lesson.contentFile || !found.lesson.formationId) return null;
    return loadPedagogicalLessonV2(found.lesson.formationId, found.lesson.id);
  },
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

interface PlayableInteraction extends PreparedLessonInteraction {
  contentDriven: boolean;
}

function legacyInteractions(questions: Question[]): PlayableInteraction[] {
  return shuffle(questions).map((question) => ({
    id: question.id,
    type: "choice",
    question: question.question,
    answers: question.choices.map((choice, index) => ({
      id: `${question.id}-answer-${index}`,
      text: choice,
      explanation: question.explanation ?? "",
    })),
    matchOptions: [],
    correctAnswerIds: [`${question.id}-answer-${question.answer}`],
    requiredSelections: 1,
    explanation: question.explanation,
    contentDriven: false,
  }));
}

function LessonPage() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const found = findLesson(lessonId);
  const contentLessonV2 = Route.useLoaderData();
  const legacyContentLesson =
    found?.lesson.contentLessonId && !found.lesson.contentFile
      ? getPedagogicalLesson(found.lesson.contentLessonId)
      : null;
  const contentLesson = contentLessonV2 ?? legacyContentLesson;
  const contentCatalogV2 = useMemo(
    () =>
      contentLessonV2
        ? createContentCatalog({ schemaVersion: 1, items: contentLessonV2.interactions })
        : null,
    [contentLessonV2],
  );
  const contentCatalog = contentCatalogV2 ?? PEDAGOGICAL_CONTENT_CATALOG;
  const { progress, hydrated, completeLesson, loseHeart } = useProgress();

  // Les questions historiques conservent leur comportement. Les nouvelles
  // leçons gardent leur ordre pédagogique et mélangent seulement les réponses.
  const questions = useMemo<PlayableInteraction[]>(
    () =>
      contentLesson
        ? (contentLessonV2
            ? selectContentItems(contentLessonV2.interactions, contentLessonV2.selection)
            : contentLesson.interactions
          ).map((item: unknown) => ({
            ...prepareContentInteraction(item as Parameters<typeof prepareContentInteraction>[0]),
            contentDriven: true,
          }))
        : found
          ? legacyInteractions(found.lesson.questions)
          : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessonId, contentLesson, contentLessonV2],
  );

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedMultiple, setSelectedMultiple] = useState<string[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [associations, setAssociations] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [responseCorrect, setResponseCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{
    stars: number;
    score: number;
    xpGained: number;
  } | null>(null);
  const [pulseDismissed, setPulseDismissed] = useState(false);

  useEffect(() => {
    setPulseDismissed(false);
  }, [lessonId]);

  if (!found) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="mb-4 text-lg font-bold">Leçon introuvable.</p>
          <Link
            to="/"
            className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const total = questions.length;
  const current = questions[idx];
  const progressPct = total === 0 ? 0 : ((idx + (checked ? 1 : 0)) / total) * 100;
  const outOfHearts = hydrated && progress.hearts <= 0 && !finished;
  const showPulse = Boolean(contentLesson?.pulse && !pulseDismissed);
  const canCheck = current
    ? current.type === "association"
      ? current.answers.every((answer) => Boolean(associations[answer.id]))
      : current.type === "multiple_choice"
        ? selectedMultiple.length === current.requiredSelections
        : current.type === "ordering"
          ? current.answers.length > 0
          : selected !== null
    : false;

  const onCheck = () => {
    if (!current || !canCheck) return;
    const selectedIds =
      current.type === "association"
        ? current.answers.map((answer) => associations[answer.id] ?? "")
        : current.type === "multiple_choice"
          ? selectedMultiple
          : current.type === "ordering"
            ? orderedIds.length > 0
              ? orderedIds
              : current.answers.map((answer) => answer.id)
            : selected
              ? [selected]
              : [];
    const isCorrect = current.contentDriven
      ? contentCatalog.evaluate(current.id, selectedIds).isCorrect
      : selectedIds.length === 1 && current.correctAnswerIds.includes(selectedIds[0]);
    setChecked(true);
    setResponseCorrect(isCorrect);
    if (isCorrect) setCorrectCount((c) => c + 1);
    else {
      setWrongCount((c) => c + 1);
      loseHeart();
    }
  };

  const onNext = () => {
    if (idx + 1 >= total) {
      const r = completeLesson(lessonId, correctCount, total, contentLessonV2?.xp ?? undefined);
      setResult(r);
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setSelectedMultiple([]);
    setOrderedIds([]);
    setAssociations({});
    setChecked(false);
    setResponseCorrect(null);
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

  if (showPulse && contentLesson) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate({ to: "/" })}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Quitter"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-0 rounded-full bg-[color:var(--color-success)]" />
            </div>
            <span className="flex items-center gap-1 text-sm font-bold text-[color:var(--color-destructive)]">
              <Heart className="h-5 w-5 fill-current" />
              {hydrated ? progress.hearts : MAX_HEARTS}
            </span>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
            Carte Pulse
          </p>
          <div className="rounded-3xl border-2 border-[color:var(--color-primary)]/35 bg-[color:var(--color-primary)]/10 p-6 shadow-[0_6px_0_0_var(--color-border)] sm:p-8">
            <Sparkles
              className="mb-5 h-10 w-10 text-[color:var(--color-primary)]"
              strokeWidth={2.25}
              aria-hidden="true"
            />
            <p className="text-xl font-extrabold leading-relaxed sm:text-2xl">
              {contentLesson.pulse}
            </p>
          </div>
        </main>

        <footer className="border-t-2 border-border bg-background">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <button
              onClick={() => setPulseDismissed(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-extrabold uppercase tracking-wide text-primary-foreground shadow-[0_4px_0_0_oklch(from_var(--color-primary)_calc(l-0.12)_c_h)] active:translate-y-[2px] active:shadow-[0_2px_0_0_oklch(from_var(--color-primary)_calc(l-0.12)_c_h)]"
            >
              Commencer <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </footer>
      </div>
    );
  }

  if (finished && result) {
    const pct = Math.round(result.score * 100);
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <div
          className={`mb-4 flex h-24 w-24 items-center justify-center rounded-3xl border-2 shadow-[0_6px_0_0_var(--color-border)] ${result.stars === 3 ? "border-[color:var(--color-warning)] bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]" : result.stars >= 1 ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]" : "border-border bg-secondary text-foreground"}`}
        >
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
            <p className="text-2xl font-extrabold text-[color:var(--color-primary)]">
              +{result.xpGained}
            </p>
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
                setSelectedMultiple([]);
                setOrderedIds([]);
                setAssociations({});
                setChecked(false);
                setResponseCorrect(null);
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

  const isCorrect = checked && responseCorrect === true;
  const isWrong = checked && responseCorrect === false;
  const selectedAnswer =
    current.type === "choice"
      ? current.answers.find((answer) => answer.id === selected)
      : undefined;
  const correctAnswer = current.answers.find((answer) => answer.id === current.correctAnswerIds[0]);

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
          {found.parcours.title} · {found.lesson.title}
        </p>
        <h1 className="mb-6 text-2xl font-extrabold leading-tight sm:text-3xl">
          {current.question}
        </h1>

        {current.type === "association" ? (
          <div className="grid gap-3">
            {current.answers.map((answer) => {
              const selectedMatch = associations[answer.id] ?? "";
              const rowCorrect = checked && selectedMatch === answer.id;
              const rowWrong = checked && selectedMatch !== answer.id;
              return (
                <label
                  key={answer.id}
                  className={`rounded-2xl border-2 bg-card p-4 transition ${
                    rowCorrect
                      ? "border-[color:var(--color-success)] bg-[color:var(--color-success)]/10"
                      : rowWrong
                        ? "border-[color:var(--color-destructive)] bg-[color:var(--color-destructive)]/10"
                        : "border-border"
                  }`}
                >
                  <span className="mb-3 block font-extrabold">{answer.text}</span>
                  <select
                    value={selectedMatch}
                    disabled={checked}
                    onChange={(event) =>
                      setAssociations((currentAssociations) => ({
                        ...currentAssociations,
                        [answer.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-border bg-background px-3 py-3 text-sm font-bold text-foreground outline-none focus:border-[color:var(--color-primary)]"
                    aria-label={`Associer ${answer.text}`}
                  >
                    <option value="">Choisir une définition</option>
                    {current.matchOptions.map((option) => {
                      const usedElsewhere = Object.entries(associations).some(
                        ([answerId, optionId]) => answerId !== answer.id && optionId === option.id,
                      );
                      return (
                        <option key={option.id} value={option.id} disabled={usedElsewhere}>
                          {option.text}
                        </option>
                      );
                    })}
                  </select>
                  {rowWrong && (
                    <span className="mt-2 block text-sm font-semibold text-[color:var(--color-success)]">
                      {answer.match}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        ) : current.type === "ordering" ? (
          <div className="grid gap-3">
            {(orderedIds.length > 0 ? orderedIds : current.answers.map((answer) => answer.id)).map(
              (answerId, position, currentOrder) => {
                const answer = current.answers.find((item) => item.id === answerId);
                if (!answer) return null;
                const move = (direction: -1 | 1) => {
                  const source = orderedIds.length > 0 ? orderedIds : currentOrder;
                  const target = position + direction;
                  if (target < 0 || target >= source.length) return;
                  const next = [...source];
                  [next[position], next[target]] = [next[target]!, next[position]!];
                  setOrderedIds(next);
                };
                return (
                  <div
                    key={answer.id}
                    className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-extrabold">
                      {position + 1}
                    </span>
                    <span className="flex-1 font-bold">{answer.text}</span>
                    <button
                      type="button"
                      disabled={checked || position === 0}
                      onClick={() => move(-1)}
                      className="rounded-lg border border-border p-2 disabled:opacity-30"
                      aria-label={`Monter ${answer.text}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={checked || position === currentOrder.length - 1}
                      onClick={() => move(1)}
                      className="rounded-lg border border-border p-2 disabled:opacity-30"
                      aria-label={`Descendre ${answer.text}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                );
              },
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {current.answers.map((answer) => {
              const chosen =
                current.type === "multiple_choice"
                  ? selectedMultiple.includes(answer.id)
                  : selected === answer.id;
              const showCorrect = checked && current.correctAnswerIds.includes(answer.id);
              const showWrong = checked && chosen && !current.correctAnswerIds.includes(answer.id);
              return (
                <button
                  key={answer.id}
                  disabled={checked}
                  aria-pressed={chosen}
                  onClick={() => {
                    if (current.type === "multiple_choice") {
                      setSelectedMultiple((currentSelection) =>
                        currentSelection.includes(answer.id)
                          ? currentSelection.filter((id) => id !== answer.id)
                          : currentSelection.length < current.requiredSelections
                            ? [...currentSelection, answer.id]
                            : currentSelection,
                      );
                    } else {
                      setSelected(answer.id);
                    }
                  }}
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
                  {answer.text}
                </button>
              );
            })}
          </div>
        )}

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
              {!isCorrect && current.type === "choice" && correctAnswer && (
                <p className="mt-1 text-sm">
                  Bonne réponse : <span className="font-bold">{correctAnswer.text}</span>
                </p>
              )}
              {isWrong && selectedAnswer?.explanation && (
                <p className="mt-1 text-sm text-muted-foreground">{selectedAnswer.explanation}</p>
              )}
              {current.explanation && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {isWrong && selectedAnswer?.explanation ? "À retenir : " : ""}
                  {current.explanation}
                </p>
              )}
            </div>
          )}
          {!checked ? (
            <button
              onClick={onCheck}
              disabled={!canCheck}
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
