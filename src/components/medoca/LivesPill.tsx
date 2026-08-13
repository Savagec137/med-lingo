import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LivesPillProps {
  current: number;
  max: number;
  showLabel?: boolean;
  className?: string;
}

export function LivesPill({ current, max, showLabel = true, className }: LivesPillProps) {
  const safeMax = Math.max(1, Math.round(max));
  const safeCurrent = Math.min(safeMax, Math.max(0, Math.round(current)));
  const isLow = safeCurrent <= Math.ceil(safeMax / 3);

  return (
    <span
      aria-label={`${safeCurrent} vies sur ${safeMax}`}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-[12px] border px-2.5 py-1",
        isLow
          ? "border-[#ff4267]/35 bg-[#2a1420] text-[#ff4267]"
          : "border-[#2b3b4d] bg-[#101b29] text-[#f5f7fa]",
        className,
      )}
    >
      <Heart
        className={cn("h-4 w-4 fill-current text-[#ff315f]", isLow && "text-[#ff4267]")}
        aria-hidden="true"
      />
      <span className="text-sm font-black tabular-nums">
        {safeCurrent}/{safeMax}
      </span>
      {showLabel ? <span className="text-[10px] font-bold text-[#8c99a8]">Vies</span> : null}
    </span>
  );
}
