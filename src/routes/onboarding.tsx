import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LEVEL_MILESTONES, lessonsForLevel, type LevelKey } from "@/lib/curriculum";
import { useProgress } from "@/lib/use-progress";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

type Choice = { key: LevelKey; emoji: string; title: string; desc: string };

const CHOICES: Choice[] = [
  {
    key: "debutant",
    emoji: "🌱",
    title: "Je débute",
    desc: "Je découvre le vocabulaire médical. Je commence tout depuis le début.",
  },
  {
    key: "vocabulaire",
    emoji: "🔤",
    title: "Je connais le vocabulaire",
    desc: "Je maîtrise préfixes, suffixes et radicaux. Direct l'anatomie.",
  },
  {
    key: "anatomie",
    emoji: "🫀",
    title: "Je maîtrise l'anatomie",
    desc: "Vocabulaire + os + organes + pathologies acquis. Cap sur les cas terrain.",
  },
  {
    key: "dea",
    emoji: "🚑",
    title: "Je révise le DEA",
    desc: "Je suis déjà en formation ambulancier — je vais direct aux gestes et bilans.",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const { applyPlacement, markOnboarded } = useProgress();
  const [selected, setSelected] = useState<LevelKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function start() {
    if (!selected) return;
    setSubmitting(true);
    const lessons = lessonsForLevel(selected);
    if (lessons.length > 0) applyPlacement(lessons);
    else markOnboarded();
    setTimeout(() => navigate({ to: "/" }), 120);
  }

  function skip() {
    markOnboarded();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 text-5xl">⚕️</div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            Où en es-tu aujourd'hui ?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            On te place au bon endroit du parcours pour ne pas répéter ce que tu sais déjà.
          </p>
        </div>

        <div className="space-y-3">
          {CHOICES.map((c) => {
            const active = selected === c.key;
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
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-warning)]/25 text-2xl">
                  {c.emoji}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-base font-extrabold">{c.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
                  {LEVEL_MILESTONES[c.key].length > 0 && (
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
                      {LEVEL_MILESTONES[c.key].length} unité·s validée·s automatiquement
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selected || submitting}
          onClick={start}
          className="mt-8 w-full rounded-2xl border-2 border-[oklch(0.55_0.17_145)] bg-[color:var(--color-primary)] px-6 py-4 font-display text-base font-extrabold uppercase tracking-wide text-primary-foreground shadow-[0_5px_0_0_oklch(0.55_0.17_145)] transition active:translate-y-[3px] active:shadow-[0_2px_0_0_oklch(0.55_0.17_145)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Commencer
        </button>

        <button
          type="button"
          onClick={skip}
          className="mt-3 w-full text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          Ignorer et tout parcourir depuis le début
        </button>
      </div>
    </div>
  );
}
