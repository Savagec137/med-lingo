import { Coins, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CurrencyKind, MedocaIcon } from "./types";
import { formatMedocaNumber } from "./utils";

export interface CurrencyPillProps {
  kind: CurrencyKind;
  amount: number;
  label?: string;
  icon?: MedocaIcon;
  compact?: boolean;
  className?: string;
}

export function CurrencyPill({
  kind,
  amount,
  label,
  icon,
  compact = false,
  className,
}: CurrencyPillProps) {
  const Icon = icon ?? (kind === "coins" ? Coins : Gem);
  const accessibleLabel = label ?? (kind === "coins" ? "Pièces" : "Gemmes");

  return (
    <span
      aria-label={`${accessibleLabel} : ${formatMedocaNumber(amount)}`}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border px-2.5 py-1 text-sm font-black tabular-nums",
        kind === "coins"
          ? "border-[#574724] bg-[#211d15] text-[#f5c758]"
          : "border-[#4b3c65] bg-[#1a1726] text-[#b99af3]",
        compact && "min-h-8 px-2 text-xs",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4", compact && "h-3.5 w-3.5")} aria-hidden="true" />
      <span>{formatMedocaNumber(amount)}</span>
    </span>
  );
}
