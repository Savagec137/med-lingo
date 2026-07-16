import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Flame, Zap, LogOut, LogIn, User as UserIcon, Sparkles, Coins, Gem, Key, Stethoscope, Battery, Trophy } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useProgress, MAX_HEARTS } from "@/lib/use-progress";
import { useAuth, signOut } from "@/lib/use-auth";
import { useWallet } from "@/lib/use-wallet";
import { useChest } from "@/lib/use-chest";
import { ChestOpeningModal } from "@/components/ChestOpeningModal";

export function TopBar() {
  const { progress, hydrated } = useProgress();
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const chest = useChest();

  // Trigger compensation chest when hearts drop to 0 (silent cooldown handling)
  const lastZeroRef = useRef<boolean>(false);
  useEffect(() => {
    if (!user || !hydrated) return;
    const isZero = progress.hearts <= 0;
    if (isZero && !lastZeroRef.current) {
      lastZeroRef.current = true;
      chest.claimCompensation();
    } else if (!isZero) {
      lastZeroRef.current = false;
    }
  }, [progress.hearts, user, hydrated, chest]);


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
    <header className="sticky top-0 z-20 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground glow-primary" style={{ backgroundImage: "var(--gradient-primary)" }}>
            <Stethoscope className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-gradient-primary">MedLingo</span>
        </Link>
        <div className="flex items-center gap-2 text-sm font-bold sm:gap-3">
          <Link
            to="/classement"
            aria-label="Classement"
            className="hidden items-center gap-1 rounded-full bg-[color:var(--color-accent)]/15 px-2.5 py-1 text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/25 sm:inline-flex"
          >
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-extrabold uppercase tracking-wide">Ligue</span>
          </Link>
          <Link
            to="/pulse"
            aria-label="Pulse IA"
            className="hidden items-center gap-1 rounded-full bg-[color:var(--color-primary)]/15 px-2.5 py-1 text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/25 sm:inline-flex"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-extrabold uppercase tracking-wide">Pulse</span>
          </Link>
          <Link
            to="/boutique"
            aria-label="Boutique"
            className="flex items-center gap-1 rounded-full bg-[color:var(--color-warning)]/15 px-2.5 py-1 text-[color:var(--color-warning)] hover:bg-[color:var(--color-warning)]/25"
          >
            <Coins className="h-4 w-4" />
            <span className="tabular-nums">{wallet?.coins ?? 0}</span>
          </Link>
          <Link
            to="/boutique"
            aria-label="Gemmes"
            className="hidden items-center gap-1 rounded-full bg-[color:var(--color-accent)]/15 px-2.5 py-1 text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/25 sm:inline-flex"
          >
            <Gem className="h-4 w-4" />
            <span className="tabular-nums">{wallet?.gems ?? 0}</span>
          </Link>
          <Link
            to="/boutique"
            aria-label="Clés"
            className="hidden items-center gap-1 rounded-full bg-[color:var(--color-info)]/15 px-2.5 py-1 text-[color:var(--color-info)] hover:bg-[color:var(--color-info)]/25 sm:inline-flex"
          >
            <Key className="h-4 w-4" />
            <span className="tabular-nums">{wallet?.keys ?? 0}</span>
          </Link>
          <span
            className="hidden items-center gap-1 rounded-full bg-[color:var(--color-success)]/15 px-2.5 py-1 text-[color:var(--color-success)] sm:inline-flex"
            aria-label="Énergie"
            title="Régénère 1 point / 6 min"
          >
            <Battery className="h-4 w-4" />
            <span className="tabular-nums">{wallet?.energy ?? 5}/{wallet?.energy_max ?? 5}</span>
          </span>
          <span className="flex items-center gap-1 text-[color:var(--color-warning)]">
            <Flame className="h-5 w-5" /> {hydrated ? progress.streak : 0}
          </span>
          <span className="hidden items-center gap-1 text-[color:var(--color-primary)] sm:flex">
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
                  <Link
                    to="/classement"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-secondary sm:hidden"
                  >
                    <Trophy className="h-4 w-4" /> Classement
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
      <ChestOpeningModal result={chest.pending} onClose={chest.close} />
    </header>
  );
}

