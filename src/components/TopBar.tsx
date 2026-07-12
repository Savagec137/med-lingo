import { Link } from "@tanstack/react-router";
import { Heart, Flame, Zap } from "lucide-react";
import { useProgress, MAX_HEARTS } from "@/lib/use-progress";

export function TopBar() {
  const { progress, hydrated } = useProgress();
  return (
    <header className="sticky top-0 z-20 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">⚕️</span>
          <span className="font-display text-lg font-extrabold tracking-tight">MedLingo</span>
        </Link>
        <div className="flex items-center gap-4 text-sm font-bold">
          <span className="flex items-center gap-1 text-[color:var(--color-warning)]">
            <Flame className="h-5 w-5" /> {hydrated ? progress.streak : 0}
          </span>
          <span className="flex items-center gap-1 text-[color:var(--color-primary)]">
            <Zap className="h-5 w-5" /> {hydrated ? progress.xp : 0}
          </span>
          <span className="flex items-center gap-1 text-[color:var(--color-destructive)]">
            <Heart className="h-5 w-5 fill-current" /> {hydrated ? progress.hearts : MAX_HEARTS}
          </span>
        </div>
      </div>
    </header>
  );
}
