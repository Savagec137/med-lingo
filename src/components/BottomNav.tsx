import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Sparkles, ShoppingBag, Trophy, User as UserIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  to: "/" | "/pulse" | "/boutique" | "/classement" | "/profil";
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  match: (path: string) => boolean;
};

const ITEMS: NavItem[] = [
  { to: "/", label: "Accueil", icon: Home, match: (p) => p === "/" },
  { to: "/pulse", label: "Pulse", icon: Sparkles, match: (p) => p.startsWith("/pulse") },
  { to: "/boutique", label: "Boutique", icon: ShoppingBag, match: (p) => p.startsWith("/boutique") || p.startsWith("/inventaire") },
  { to: "/classement", label: "Ligue", icon: Trophy, match: (p) => p.startsWith("/classement") },
  { to: "/profil", label: "Profil", icon: UserIcon, match: (p) => p.startsWith("/profil") },
];

// Routes qui masquent la bottom nav (immersion totale).
const HIDDEN_PREFIXES = ["/lecon", "/auth", "/onboarding"];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-background/70 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-5 px-2 py-1.5">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className="group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 press"
              >
                <span
                  className={`relative flex h-9 w-14 items-center justify-center rounded-2xl transition-all ${
                    active
                      ? "bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)]"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`}
                    strokeWidth={active ? 2.6 : 2.1}
                  />
                  {active && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{ boxShadow: "var(--glow-primary)" }}
                    />
                  )}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
                    active ? "text-[color:var(--color-primary)]" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
