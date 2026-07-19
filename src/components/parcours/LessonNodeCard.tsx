import { Link } from "@tanstack/react-router";
import { Lock, Check, Play, Clock, Sparkles, Star } from "lucide-react";
import type { ReactNode } from "react";

export type LessonState = "locked" | "available" | "in_progress" | "completed";
export type Difficulty = "easy" | "medium" | "hard" | "boss";

interface LessonNodeCardProps {
  title: string;
  subtitle?: string;
  href?: string;
  state: LessonState;
  difficulty?: Difficulty;
  xp?: number;
  minutes?: number;
  /** 0..1 */
  progress?: number;
  /** 0..3 */
  stars?: number;
  icon?: ReactNode;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Facile",
  medium: "Intermédiaire",
  hard: "Avancé",
  boss: "Boss",
};
const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: "text-[color:var(--color-success)]",
  medium: "text-[color:var(--color-info)]",
  hard: "text-[color:var(--color-accent)]",
  boss: "text-[color:var(--color-destructive)]",
};

/**
 * Carte de leçon riche pour la carte de parcours.
 * Affiche : état (verrouillé/dispo/en cours/terminé), difficulté, XP, durée,
 * progression et étoiles. Aucune logique — le parent décide state/progress.
 */
export function LessonNodeCard({
  title,
  subtitle,
  href,
  state,
  difficulty = "easy",
  xp,
  minutes,
  progress = 0,
  stars = 0,
  icon,
}: LessonNodeCardProps) {
  const locked = state === "locked";
  const completed = state === "completed";
  const inProgress = state === "in_progress";

  const inner = (
    <div
      className={`panel card-interactive press relative flex items-stretch gap-3 p-3.5 ${
        locked ? "opacity-60" : ""
      } ${completed ? "border-[color:var(--color-success)]/50" : ""} ${
        inProgress ? "glow-primary" : ""
      }`}
      aria-disabled={locked}
    >
      {/* Icône / statut */}
      <div
        className={`relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${
          completed
            ? "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]"
            : inProgress
              ? "text-[color:var(--color-primary-foreground)]"
              : locked
                ? "bg-muted text-muted-foreground"
                : "bg-secondary text-foreground"
        }`}
        style={inProgress ? { background: "var(--gradient-primary)" } : undefined}
      >
        {locked ? (
          <Lock className="h-6 w-6" strokeWidth={2.4} />
        ) : completed ? (
          <Check className="h-7 w-7" strokeWidth={3} />
        ) : icon ? (
          icon
        ) : (
          <Play className="h-6 w-6" strokeWidth={2.6} />
        )}
        {difficulty === "boss" && !locked ? (
          <span className="absolute -right-1 -top-1 chip glow-gold" style={{ padding: "2px 6px", fontSize: 9 }}>
            BOSS
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-extrabold">{title}</h3>
          </div>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {/* Meta chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`chip ${DIFFICULTY_COLOR[difficulty]}`}>
            {DIFFICULTY_LABEL[difficulty]}
          </span>
          {xp != null ? (
            <span className="chip">
              <Sparkles className="h-3 w-3" /> {xp} XP
            </span>
          ) : null}
          {minutes != null ? (
            <span className="chip">
              <Clock className="h-3 w-3" /> {minutes} min
            </span>
          ) : null}
        </div>

        {/* Progress or stars */}
        {completed ? (
          <div className="mt-2 flex items-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < stars
                    ? "fill-[color:var(--color-warning)] text-[color:var(--color-warning)]"
                    : "text-muted"
                }`}
                strokeWidth={2}
              />
            ))}
          </div>
        ) : progress > 0 && !locked ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round(progress * 100))}%`,
                background: "var(--gradient-primary)",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  if (locked || !href) return inner;
  return (
    <Link to={href} className="block">
      {inner}
    </Link>
  );
}
