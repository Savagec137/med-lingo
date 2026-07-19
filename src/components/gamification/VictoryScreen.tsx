import { motion } from "framer-motion";
import { Trophy, Star, Sparkles, ArrowRight } from "lucide-react";
import { Confetti } from "@/components/Confetti";

interface Stat {
  label: string;
  value: string | number;
  hint?: string;
}

interface VictoryScreenProps {
  title?: string;
  subtitle?: string;
  stars?: 0 | 1 | 2 | 3;
  xpGained?: number;
  coinsGained?: number;
  stats?: Stat[];
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  celebrate?: boolean;
}

/**
 * Écran de victoire réutilisable — confettis, étoiles animées, résumé XP/pièces,
 * grille de stats libre. Aucune logique métier : le parent injecte les valeurs.
 */
export function VictoryScreen({
  title = "Leçon terminée !",
  subtitle = "Belle progression, continue comme ça.",
  stars = 3,
  xpGained,
  coinsGained,
  stats = [],
  primaryLabel = "Continuer",
  onPrimary,
  secondaryLabel,
  onSecondary,
  celebrate = true,
}: VictoryScreenProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10">
      {celebrate ? <Confetti /> : null}

      {/* Halo lumineux */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, oklch(0.82 0.16 80 / 0.30), transparent 60%)",
        }}
      />

      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
        className="glow-gold mb-6 grid h-24 w-24 place-items-center rounded-full"
        style={{ background: "var(--gradient-gold)" }}
      >
        <Trophy className="h-12 w-12" strokeWidth={2.4} color="oklch(0.22 0.05 60)" />
      </motion.div>

      <h1 className="text-gradient-gold text-center text-4xl font-black">{title}</h1>
      <p className="mt-2 max-w-md text-center text-muted-foreground">{subtitle}</p>

      {/* Étoiles */}
      <div className="mt-6 flex items-center gap-2">
        {[0, 1, 2].map((i) => {
          const filled = i < stars;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15 + i * 0.15, type: "spring", stiffness: 260 }}
            >
              <Star
                className={`h-10 w-10 ${
                  filled
                    ? "fill-[color:var(--color-warning)] text-[color:var(--color-warning)] glow-gold"
                    : "text-muted"
                }`}
                strokeWidth={2}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Récompenses */}
      {(xpGained != null || coinsGained != null) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {xpGained != null && (
            <div className="chip glow-primary" style={{ padding: "0.5rem 0.9rem", fontSize: "0.95rem" }}>
              <Sparkles className="h-4 w-4" />
              +{xpGained} XP
            </div>
          )}
          {coinsGained != null && (
            <div className="chip" style={{ padding: "0.5rem 0.9rem", fontSize: "0.95rem" }}>
              🪙 +{coinsGained}
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      {stats.length > 0 && (
        <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="panel px-3 py-3 text-center">
              <p className="section-eyebrow">{s.label}</p>
              <p className="mt-1 text-xl font-black tabular-nums">{s.value}</p>
              {s.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p> : null}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-10 flex w-full max-w-md flex-col gap-3">
        {onPrimary && (
          <button
            onClick={onPrimary}
            className="btn-primary press flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-extrabold"
          >
            {primaryLabel}
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
        {onSecondary && secondaryLabel && (
          <button
            onClick={onSecondary}
            className="press glass rounded-2xl px-6 py-3 text-sm font-bold text-foreground"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
