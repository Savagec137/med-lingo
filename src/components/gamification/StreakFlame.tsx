import { Flame } from "lucide-react";

interface StreakFlameProps {
  days: number;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}

const SIZES = {
  sm: { icon: "h-4 w-4", text: "text-sm", pad: "px-2 py-1" },
  md: { icon: "h-5 w-5", text: "text-base", pad: "px-3 py-1.5" },
  lg: { icon: "h-7 w-7", text: "text-2xl", pad: "px-4 py-2" },
} as const;

/**
 * Flamme animée qui pulse quand la série est active. Grise si inactive.
 */
export function StreakFlame({ days, size = "md", active = true }: StreakFlameProps) {
  const s = SIZES[size];
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-extrabold ${s.pad} ${s.text} ${
        active
          ? "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)] glow-gold"
          : "bg-muted text-muted-foreground"
      }`}
      aria-label={`Série de ${days} jours`}
    >
      <Flame
        className={`${s.icon} ${active ? "animate-flame fill-current" : ""}`}
        strokeWidth={2.4}
      />
      <span className="tabular-nums">{days}</span>
    </div>
  );
}
