import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEDOCA_RARITY_CLASSES } from "./tokens";
import type { MedocaRarity } from "./types";

export interface RarityBadgeProps {
  rarity: MedocaRarity;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function RarityBadge({ rarity, label, size = "sm", className }: RarityBadgeProps) {
  const meta = MEDOCA_RARITY_CLASSES[rarity];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-black uppercase tracking-[0.12em]",
        meta.accent,
        meta.surface,
        meta.border,
        size === "sm" ? "gap-1 px-2 py-1 text-[9px]" : "gap-1.5 px-2.5 py-1.5 text-[10px]",
        className,
      )}
    >
      {rarity !== "common" ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : null}
      {label ?? meta.label}
    </span>
  );
}
