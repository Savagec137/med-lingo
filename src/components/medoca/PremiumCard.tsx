import { Crown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./GlassPanel";

export interface PremiumCardProps {
  title: string;
  description: string;
  eyebrow?: string;
  features?: string[];
  artwork?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PremiumCard({
  title,
  description,
  eyebrow = "Medoca Premium",
  features = [],
  artwork,
  actionLabel = "Découvrir Premium",
  onAction,
  disabled = false,
  className,
}: PremiumCardProps) {
  return (
    <GlassPanel
      strength="strong"
      className={cn(
        "border-[#5a4825] bg-[#111a25] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#f5c758]">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            {eyebrow}
          </p>
          <h3 className="mt-2 text-xl font-black text-white">{title}</h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[#b2bdc9]">{description}</p>
        </div>
        {artwork ? (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-[#5a4825] bg-[#211d15] text-[#f5c758]">
            {artwork}
          </div>
        ) : null}
      </div>
      {features.length > 0 ? (
        <ul className="mt-4 grid gap-2 text-xs text-[#d4dbe3] sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f5c758]"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="mt-5 min-h-12 w-full rounded-[12px] border border-[#d8aa42] bg-[#f5c758] px-4 text-sm font-black text-[#101820] shadow-[0_8px_24px_rgba(245,199,88,0.12)] transition-[transform,filter] hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
      >
        {actionLabel}
      </button>
    </GlassPanel>
  );
}
