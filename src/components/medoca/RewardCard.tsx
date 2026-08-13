import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./GlassPanel";
import { RarityBadge } from "./RarityBadge";
import { MEDOCA_TONE_CLASSES } from "./tokens";
import type { MedocaRarity, MedocaTone } from "./types";

export interface RewardCardProps {
  title: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  tone?: MedocaTone;
  rarity?: MedocaRarity;
  className?: string;
}

export function RewardCard({
  title,
  value,
  description,
  icon,
  tone = "emerald",
  rarity,
  className,
}: RewardCardProps) {
  const palette = MEDOCA_TONE_CLASSES[tone];

  return (
    <GlassPanel
      interactive
      className={cn("flex min-h-32 flex-col justify-between gap-3 p-4", palette.border, className)}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            palette.accent,
            palette.surface,
            palette.border,
            palette.glow,
          )}
        >
          {icon}
        </span>
        {rarity ? <RarityBadge rarity={rarity} /> : null}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8e9aa9]">{title}</p>
        <div className={cn("mt-1 text-xl font-black tabular-nums", palette.accent)}>{value}</div>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-[#9ba8b6]">{description}</p>
        ) : null}
      </div>
    </GlassPanel>
  );
}
