import { Activity, ArrowLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import { CurrencyPill } from "./CurrencyPill";
import { LivesPill } from "./LivesPill";
import { PlayerAvatar, type PlayerAvatarProps } from "./PlayerAvatar";
import { ProgressBar } from "./ProgressBar";

export interface MedocaHUDProps {
  title?: string;
  subtitle?: string;
  progress?: { value: number; max: number; label?: string };
  coins?: number;
  gems?: number;
  lives: number;
  maxLives?: number;
  level?: number;
  xp?: number;
  xpGoal?: number;
  player?: Omit<PlayerAvatarProps, "level" | "size">;
  onBack?: () => void;
  onSettings?: () => void;
  compact?: boolean;
  className?: string;
}

export function MedocaHUD({
  title,
  subtitle,
  progress,
  coins,
  gems,
  lives,
  maxLives = 5,
  level,
  xp,
  xpGoal,
  player,
  onBack,
  onSettings,
  compact = false,
  className,
}: MedocaHUDProps) {
  const gameplayMode = Boolean(title || subtitle || onBack);
  const resolvedProgress =
    progress ??
    (typeof xp === "number" && typeof xpGoal === "number"
      ? { value: xp, max: xpGoal, label: typeof level === "number" ? `Niveau ${level}` : "XP" }
      : undefined);

  return (
    <header
      className={cn(
        "grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-[#243548] bg-[#07111d]/98 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,1fr)_auto] sm:px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Revenir à l'écran précédent"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111d2b] text-[#d2dae3] transition-colors hover:bg-[#172536] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d878]/75 motion-reduce:transition-none"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#26d878]/30 bg-[#102a25] text-[#26d878]">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <span className="block truncate text-sm font-extrabold text-[#f4f7fa]">
            {title ?? APP_NAME}
          </span>
          <span className="block truncate text-[11px] font-medium text-[#8290a0]">
            {subtitle ?? "Formation médicale"}
          </span>
        </div>
      </div>

      {resolvedProgress ? (
        <ProgressBar
          value={resolvedProgress.value}
          max={resolvedProgress.max}
          label={resolvedProgress.label ?? "Progression"}
          showValue
          size="sm"
          className="order-3 col-span-2 w-full sm:order-none sm:col-span-1 sm:max-w-[280px] sm:justify-self-center"
        />
      ) : (
        <div className="hidden sm:block" />
      )}

      <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
        {!gameplayMode && typeof coins === "number" ? (
          <CurrencyPill kind="coins" amount={coins} compact={compact} />
        ) : null}
        {!gameplayMode && typeof gems === "number" ? (
          <CurrencyPill
            kind="gems"
            amount={gems}
            compact
            className="hidden min-[430px]:inline-flex"
          />
        ) : null}
        <LivesPill current={lives} max={maxLives} showLabel={!compact && !gameplayMode} />
        {onSettings ? (
          <button
            type="button"
            onClick={onSettings}
            aria-label="Ouvrir les réglages"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111d2b] text-[#cbd4de] transition-colors hover:bg-[#172536] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d878]/75 motion-reduce:transition-none"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
        {!gameplayMode && player ? (
          <PlayerAvatar {...player} level={level} size={compact ? "sm" : "md"} />
        ) : null}
      </div>
    </header>
  );
}
