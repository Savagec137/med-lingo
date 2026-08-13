import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlayerAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  level?: number;
  online?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
} as const;

export function PlayerAvatar({
  src,
  alt = "Avatar du joueur",
  fallback,
  level,
  online = false,
  size = "md",
  className,
}: PlayerAvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 rounded-full border border-[#375069] bg-[#0a1522] p-0.5 shadow-[0_0_20px_rgba(38,216,120,0.08)]",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#172536] text-sm font-black text-[#dce5ed]">
        {src ? (
          <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        ) : fallback ? (
          <span aria-label={alt}>{fallback.slice(0, 2).toUpperCase()}</span>
        ) : (
          <UserRound className="h-1/2 w-1/2 text-[#b7c4d1]" aria-label={alt} />
        )}
      </span>
      {typeof level === "number" ? (
        <span
          aria-label={`Niveau ${level}`}
          className="absolute -bottom-1 -right-1 flex min-h-5 min-w-5 items-center justify-center rounded-lg border border-[#26d878]/55 bg-[#07111d] px-1 text-[10px] font-black text-[#26d878]"
        >
          {Math.max(0, Math.round(level))}
        </span>
      ) : null}
      {online ? (
        <span
          aria-label="En ligne"
          className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-[#07111d] bg-[#26d878]"
        />
      ) : null}
    </span>
  );
}
