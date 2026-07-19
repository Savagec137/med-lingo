import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  /** % change vs previous period */
  delta?: number;
  accent?: "primary" | "accent" | "success" | "warning" | "destructive";
}

const ACCENT: Record<NonNullable<StatTileProps["accent"]>, string> = {
  primary: "text-[color:var(--color-primary)]",
  accent: "text-[color:var(--color-accent)]",
  success: "text-[color:var(--color-success)]",
  warning: "text-[color:var(--color-warning)]",
  destructive: "text-[color:var(--color-destructive)]",
};

export function StatTile({ label, value, hint, icon, delta, accent = "primary" }: StatTileProps) {
  const Trend = delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor =
    delta == null
      ? "text-muted-foreground"
      : delta > 0
        ? "text-[color:var(--color-success)]"
        : delta < 0
          ? "text-[color:var(--color-destructive)]"
          : "text-muted-foreground";
  return (
    <div className="panel card-interactive p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="section-eyebrow">{label}</span>
        {icon ? <span className={`${ACCENT[accent]}`}>{icon}</span> : null}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-black tabular-nums">{value}</p>
        {delta != null ? (
          <span className={`inline-flex items-center gap-1 text-xs font-bold ${trendColor}`}>
            <Trend className="h-3.5 w-3.5" />
            {delta > 0 ? "+" : ""}
            {delta}%
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
