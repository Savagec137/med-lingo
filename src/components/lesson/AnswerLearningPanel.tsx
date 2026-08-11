import { useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
} from "lucide-react";
import type { ContentPedagogicalFeedback } from "@/content/content-domain";
import { hasPedagogicalFeedback } from "@/content/pedagogical-feedback";

interface AnswerLearningPanelProps {
  feedback: ContentPedagogicalFeedback;
}

export function AnswerLearningPanel({ feedback }: AnswerLearningPanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = "answer-learning-panel";

  if (!hasPedagogicalFeedback(feedback)) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-[color:var(--color-primary)]/45 bg-[color:var(--color-primary)]/10 px-4 py-3 text-left font-extrabold text-[color:var(--color-primary)] transition hover:bg-[color:var(--color-primary)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/15">
            <Brain className="h-5 w-5" aria-hidden="true" />
          </span>
          Comprendre la réponse
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <section
          id={panelId}
          aria-label="Explication pédagogique"
          className="mt-3 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          {feedback.why_correct && (
            <article className="rounded-xl bg-[color:var(--color-success)]/10 p-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[color:var(--color-success)]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Pourquoi cette réponse est correcte
              </h3>
              <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
                {feedback.why_correct}
              </p>
            </article>
          )}

          {feedback.common_mistake && (
            <article className="rounded-xl bg-[color:var(--color-warning)]/10 p-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[color:var(--color-warning)]">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Erreur fréquente à éviter
              </h3>
              <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
                {feedback.common_mistake}
              </p>
            </article>
          )}

          {feedback.key_takeaway && (
            <article className="rounded-xl bg-[color:var(--color-primary)]/10 p-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[color:var(--color-primary)]">
                <BookOpenCheck className="h-4 w-4" aria-hidden="true" />À retenir
              </h3>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">
                {feedback.key_takeaway}
              </p>
            </article>
          )}

          {feedback.memory_tip && (
            <article className="rounded-xl bg-secondary p-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                <Lightbulb
                  className="h-4 w-4 text-[color:var(--color-warning)]"
                  aria-hidden="true"
                />
                Astuce mnémotechnique
              </h3>
              <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
                {feedback.memory_tip}
              </p>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
