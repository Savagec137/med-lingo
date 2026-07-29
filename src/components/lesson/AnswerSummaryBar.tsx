import { BookOpenCheck } from "lucide-react";

interface AnswerSummaryBarProps {
  summary: string;
}

export function AnswerSummaryBar({ summary }: AnswerSummaryBarProps) {
  return (
    <aside
      role="status"
      aria-live="polite"
      className="mt-3 rounded-2xl border border-[color:var(--color-primary)]/35 bg-[color:var(--color-primary)]/10 p-3"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]">
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--color-primary)]">
            Résumé à retenir
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">{summary}</p>
        </div>
      </div>
    </aside>
  );
}
