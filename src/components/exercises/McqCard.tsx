import { useState } from "react";
import { Check, X } from "lucide-react";

export interface McqOption {
  id: string;
  label: string;
  correct?: boolean;
}
interface McqCardProps {
  question: string;
  options: McqOption[];
  multi?: boolean;
  onSubmit?: (selected: string[]) => void;
  disabled?: boolean;
  reveal?: boolean;
}

/**
 * QCM générique — mono ou multi-sélection. Le composant gère seulement l'UI ;
 * le parent brancher la logique (correction, XP, etc.).
 */
export function McqCard({
  question,
  options,
  multi = false,
  onSubmit,
  disabled = false,
  reveal = false,
}: McqCardProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (disabled) return;
    setSelected((prev) =>
      multi ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id],
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h2 className="mb-6 text-xl font-extrabold leading-tight sm:text-2xl">{question}</h2>
      <div className="grid gap-3">
        {options.map((o) => {
          const chosen = selected.includes(o.id);
          const showCorrect = reveal && o.correct;
          const showWrong = reveal && chosen && !o.correct;
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              aria-pressed={chosen}
              onClick={() => toggle(o.id)}
              className={`panel press flex w-full items-center justify-between gap-3 border-2 px-4 py-3.5 text-left font-bold transition ${
                showCorrect
                  ? "border-[color:var(--color-success)] bg-[color:var(--color-success)]/10"
                  : showWrong
                    ? "border-[color:var(--color-destructive)] bg-[color:var(--color-destructive)]/10"
                    : chosen
                      ? "border-[color:var(--color-primary)] glow-primary"
                      : "border-transparent"
              }`}
            >
              <span className="min-w-0 flex-1">{o.label}</span>
              {showCorrect ? (
                <Check className="h-5 w-5 text-[color:var(--color-success)]" />
              ) : showWrong ? (
                <X className="h-5 w-5 text-[color:var(--color-destructive)]" />
              ) : null}
            </button>
          );
        })}
      </div>
      {onSubmit ? (
        <button
          type="button"
          onClick={() => onSubmit(selected)}
          disabled={disabled || selected.length === 0}
          className="btn-primary press mt-6 w-full rounded-2xl px-4 py-3.5 text-base font-extrabold disabled:opacity-50"
        >
          Valider
        </button>
      ) : null}
    </div>
  );
}
