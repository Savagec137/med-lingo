import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

interface TrueFalseCardProps {
  statement: string;
  onAnswer?: (value: boolean) => void;
  reveal?: { correct: boolean } | null;
  disabled?: boolean;
}

export function TrueFalseCard({ statement, onAnswer, reveal, disabled }: TrueFalseCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel mb-8 p-6 text-center text-xl font-extrabold leading-tight"
      >
        {statement}
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { value: true, label: "Vrai", icon: Check, tone: "success" },
            { value: false, label: "Faux", icon: X, tone: "destructive" },
          ] as const
        ).map((btn) => {
          const isRevealCorrect = reveal?.correct === btn.value;
          return (
            <button
              key={btn.label}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer?.(btn.value)}
              className={`panel press flex items-center justify-center gap-2 border-2 px-4 py-6 text-lg font-black transition ${
                reveal && isRevealCorrect
                  ? "border-[color:var(--color-success)] bg-[color:var(--color-success)]/10"
                  : reveal && !isRevealCorrect
                    ? "border-[color:var(--color-destructive)]/40 opacity-60"
                    : "border-transparent hover:border-[color:var(--color-primary)]/50"
              }`}
            >
              <btn.icon className="h-6 w-6" strokeWidth={3} />
              {btn.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
