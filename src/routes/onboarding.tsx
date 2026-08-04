import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Sprout,
  Type,
  HeartPulse,
  Ambulance,
  Stethoscope,
  Check,
  X,
  ArrowRight,
  ClipboardCheck,
} from "lucide-react";
import { LEVEL_MILESTONES, type LevelKey } from "@/lib/curriculum";
import {
  buildPlacementTest,
  lessonsForUnits,
  scorePlacement,
  type PlacementResult,
} from "@/lib/placement-test";
import { useProgress } from "@/lib/use-progress";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

type Choice = { key: LevelKey; Icon: LucideIcon; title: string; desc: string };

const CHOICES: Choice[] = [
  {
    key: "debutant",
    Icon: Sprout,
    title: "Je débute",
    desc: "Je découvre le vocabulaire médical. Je commence tout depuis le début.",
  },
  {
    key: "vocabulaire",
    Icon: Type,
    title: "Je connais le vocabulaire",
    desc: "Je maîtrise préfixes, suffixes et radicaux. Direct l'anatomie.",
  },
  {
    key: "anatomie",
    Icon: HeartPulse,
    title: "Je maîtrise l'anatomie",
    desc: "Vocabulaire + os + organes + pathologies acquis. Cap sur les cas terrain.",
  },
  {
    key: "dea",
    Icon: Ambulance,
    title: "Je révise le DEA",
    desc: "Je suis déjà en formation ambulancier — je vais direct aux gestes et bilans.",
  },
];

type Step = "declare" | "test" | "result";

function Onboarding() {
  const navigate = useNavigate();
  const { applyPlacement, markOnboarded } = useProgress();
  const [selected, setSelected] = useState<LevelKey | null>(null);
  const [step, setStep] = useState<Step>("declare");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PlacementResult | null>(null);

  const questions = useMemo(
    () => (selected ? buildPlacementTest(selected) : []),
    [selected],
  );
  const current = questions[index];

  function beginTest() {
    if (!selected) return;
    if (questions.length === 0) {
      markOnboarded();
      navigate({ to: "/" });
      return;
    }
    setStep("test");
  }

  function answer(choiceIndex: number) {
    if (!current) return;
    const next = { ...answers, [current.question.id]: choiceIndex };
    setAnswers(next);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    const scored = scorePlacement(questions, next);
    setResult(scored);
    setStep("result");
  }

  function finish() {
    const lessons = result ? lessonsForUnits(result.validatedUnitIds) : [];
    if (lessons.length > 0) applyPlacement(lessons);
    else markOnboarded();
    navigate({ to: "/" });
  }

  function skip() {
    markOnboarded();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--color-primary)] text-primary-foreground shadow-[0_5px_0_0_oklch(0.55_0.17_145)]">
            {step === "declare" ? (
              <Stethoscope className="h-8 w-8" strokeWidth={2.25} />
            ) : (
              <ClipboardCheck className="h-8 w-8" strokeWidth={2.25} />
            )}
          </div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            {step === "declare"
              ? "Où en es-tu aujourd'hui ?"
              : step === "test"
                ? "Test de positionnement"
                : "Ton niveau réel"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "declare"
              ? "On vérifie ensuite avec un test court : tu ne sautes que ce que tu maîtrises vraiment."
              : step === "test"
                ? `Question ${index + 1} sur ${questions.length} — aucune vie perdue ici.`
                : "Chaque parcours est validé uniquement si tu as répondu juste à la majorité de ses questions."}
          </p>
        </div>

        {step === "declare" && (
          <>
            <div className="space-y-3">
              {CHOICES.map((c) => {
                const active = selected === c.key;
                const { Icon } = c;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelected(c.key)}
                    className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${
                      active
                        ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10"
                        : "border-border bg-card hover:border-[color:var(--color-primary)]/60"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${active ? "bg-[color:var(--color-primary)] text-primary-foreground" : "bg-[color:var(--color-warning)]/25 text-[color:var(--color-warning)]"}`}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-base font-extrabold">{c.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
                      {LEVEL_MILESTONES[c.key].length > 0 && (
                        <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
                          {LEVEL_MILESTONES[c.key].length} parcours à valider par le test
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!selected}
              onClick={beginTest}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[oklch(0.55_0.17_145)] bg-[color:var(--color-primary)] px-6 py-4 font-display text-base font-extrabold uppercase tracking-wide text-primary-foreground shadow-[0_5px_0_0_oklch(0.55_0.17_145)] transition active:translate-y-[3px] active:shadow-[0_2px_0_0_oklch(0.55_0.17_145)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selected === "debutant" ? "Commencer" : "Passer le test"}
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={skip}
              className="mt-3 w-full text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Ignorer et tout parcourir depuis le début
            </button>
          </>
        )}

        {step === "test" && current && (
          <div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[color:var(--color-primary)] transition-all duration-300"
                style={{ width: `${((index + 1) / questions.length) * 100}%` }}
              />
            </div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
              {current.unitTitle}
            </p>
            <h2 className="mb-5 font-display text-xl font-extrabold">
              {current.question.question}
            </h2>
            <div className="space-y-3">
              {current.question.choices.map((choice, i) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => answer(i)}
                  className="w-full rounded-2xl border-2 border-border bg-card p-4 text-left text-sm font-bold transition hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div>
            <div className="mb-5 rounded-2xl border-2 border-[color:var(--color-primary)]/40 bg-[color:var(--color-primary)]/10 p-5 text-center">
              <div className="font-display text-4xl font-extrabold">
                {result.correct}/{result.total}
              </div>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {result.validatedUnitIds.length} parcours validés
              </p>
            </div>
            <div className="space-y-2">
              {result.perUnit.map((unit) => {
                const ok = result.validatedUnitIds.includes(unit.unitId);
                return (
                  <div
                    key={unit.unitId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${ok ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-muted-foreground"}`}
                    >
                      {ok ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        <X className="h-4 w-4" strokeWidth={3} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold">{unit.unitTitle}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {ok ? "Validé — parcours débloqué" : "À travailler — on le garde au programme"}
                      </div>
                    </div>
                    <span className="text-xs font-black text-muted-foreground">
                      {unit.correct}/{unit.total}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={finish}
              className="mt-8 w-full rounded-2xl border-2 border-[oklch(0.55_0.17_145)] bg-[color:var(--color-primary)] px-6 py-4 font-display text-base font-extrabold uppercase tracking-wide text-primary-foreground shadow-[0_5px_0_0_oklch(0.55_0.17_145)] transition active:translate-y-[3px] active:shadow-[0_2px_0_0_oklch(0.55_0.17_145)]"
            >
              Démarrer mon parcours
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
