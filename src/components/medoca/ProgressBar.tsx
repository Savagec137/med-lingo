import { cn } from "@/lib/utils";
import { MEDOCA_TONE_CLASSES } from "./tokens";
import type { MedocaTone } from "./types";
import { getProgressPercent } from "./utils";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  tone?: MedocaTone;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

const FILL_CLASSES: Record<MedocaTone, string> = {
  cyan: "bg-[#69d7f2] shadow-[0_0_12px_rgba(105,215,242,0.35)]",
  emerald: "bg-[#26d878] shadow-[0_0_12px_rgba(38,216,120,0.32)]",
  gold: "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.65)]",
  violet: "bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.65)]",
  rose: "bg-rose-300 shadow-[0_0_14px_rgba(253,164,175,0.65)]",
  neutral: "bg-slate-300",
};

export function ProgressBar({
  value,
  max = 100,
  label = "Progression",
  tone = "emerald",
  size = "md",
  showValue = false,
  className,
}: ProgressBarProps) {
  const percent = getProgressPercent(value, max);

  return (
    <div className={cn("min-w-0", className)}>
      {showValue ? (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-bold">
          <span className="truncate text-[#b7c1cd]">{label}</span>
          <span className={cn("shrink-0 tabular-nums", MEDOCA_TONE_CLASSES[tone].accent)}>
            {Math.round(value)} / {Math.round(max)}
          </span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(max, Math.max(0, value))}
        className={cn(
          "overflow-hidden rounded-full bg-[#283548]",
          size === "sm" && "h-1.5",
          size === "md" && "h-2.5",
          size === "lg" && "h-3.5",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
            FILL_CLASSES[tone],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
