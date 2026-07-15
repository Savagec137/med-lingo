import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Flame, Zap, LogOut, LogIn, User as UserIcon, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useProgress, MAX_HEARTS } from "@/lib/use-progress";
import { useAuth, signOut } from "@/lib/use-auth";

export function TopBar() {
  const { progress, hydrated } = useProgress();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const initials = (user?.user_metadata?.full_name || user?.email || "?")
    .toString()
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">⚕️</span>
          <span className="font-display text-lg font-extrabold tracking-tight">MedLingo</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-bold sm:gap-4">
          <Link
            to="/pulse"
            aria-label="Pulse IA"
            className="hidden items-center gap-1 rounded-full bg-[color:var(--color-primary)]/15 px-2.5 py-1 text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/25 sm:inline-flex"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-extrabold uppercase tracking-wide">Pulse</span>
          </Link>
          <span className="flex items-center gap-1 text-[color:var(--color-warning)]">
            <Flame className="h-5 w-5" /> {hydrated ? progress.streak : 0}
          </span>
          <span className="flex items-center gap-1 text-[color:var(--color-primary)]">
            <Zap className="h-5 w-5" /> {hydrated ? progress.xp : 0}
          </span>
          <span className="flex items-center gap-1 text-[color:var(--color-destructive)]">
            <Heart className="h-5 w-5 fill-current" /> {hydrated ? progress.hearts : MAX_HEARTS}
          </span>

          {user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Compte"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-sm font-extrabold text-primary-foreground"
              >
                {initials}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                    Connecté en tant que
                    <div className="truncate font-bold text-foreground">{user.email}</div>
                  </div>
                  <Link
                    to="/profil"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-secondary"
                  >
                    <UserIcon className="h-4 w-4" /> Mon profil
                  </Link>
                  <button
                    onClick={async () => {
                      await signOut();
                      setMenuOpen(false);
                      navigate({ to: "/" });
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-secondary"
                  >
                    <LogOut className="h-4 w-4" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-foreground hover:bg-secondary/80"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connexion</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
