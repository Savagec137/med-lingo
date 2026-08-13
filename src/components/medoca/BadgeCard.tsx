import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./GlassPanel";
import { ProgressBar } from "./ProgressBar";
import { RarityBadge } from "./RarityBadge";
import type { MedocaRarity } from "./types";

export interface BadgeCardProps {
  name: string;
  description: string;
  icon?: ReactNode;
  rarity?: MedocaRarity;
  unlocked?: boolean;
  equipped?: boolean;
  progress?: number;
  progressMax?: number;
  onSelect?: () => void;
  className?: string;
}

export function BadgeCard({
  name,
  description,
  icon,
  rarity = "common",
  unlocked = false,
  equipped = false,
  progress,
  progressMax = 100,
  onSelect,
  className,
}: BadgeCardProps) {
  const card = (
    <GlassPanel
      interactive={Boolean(onSelect && unlocked)}
      className={cn(
        "flex h-full min-h-48 flex-col p-4 text-left",
        !unlocked && "opacity-65",
        equipped && "border-[#26d878]/55 shadow-[0_0_22px_rgba(38,216,120,0.10)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-[14px] border border-[#2f4356] bg-[#142232] text-[#26d878]">
          {icon ??
            (unlocked ? <ShieldCheck className="h-7 w-7" /> : <LockKeyhole className="h-6 w-6" />)}
        </span>
        <RarityBadge rarity={rarity} />
      </div>
      <div className="mt-4 flex-1">
        <h3 className="text-base font-black text-white">{name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#96a3b1]">{description}</p>
      </div>
      {typeof progress === "number" ? (
        <ProgressBar
          value={progress}
          max={progressMax}
          label={`Progression du badge ${name}`}
          size="sm"
          className="mt-4"
        />
      ) : null}
      <div className="mt-3 flex min-h-5 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em]">
        {equipped ? (
          <span className="flex items-center gap-1 text-[#26d878]">
            <Check className="h-3.5 w-3.5" /> Équipé
          </span>
        ) : (
          <span className={unlocked ? "text-[#26d878]" : "text-[#657383]"}>
            {unlocked ? "Débloqué" : "Verrouillé"}
          </span>
        )}
      </div>
    </GlassPanel>
  );

  if (!onSelect) return card;

  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={onSelect}
      aria-pressed={equipped}
      className="block w-full rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d878]/75 disabled:cursor-not-allowed"
    >
      {card}
    </button>
  );
}
