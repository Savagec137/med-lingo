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
  { to: "/", label: "Accueil", icon: Home, match: (path) => path === "/" },
  { to: "/pulse", label: "Pulse", icon: Sparkles, match: (path) => path.startsWith("/pulse") },
  {
    to: "/boutique",
    label: "Boutique",
    icon: ShoppingBag,
    match: (path) => path.startsWith("/boutique") || path.startsWith("/inventaire"),
  },
  {
    to: "/classement",
    label: "Ligue",
    icon: Trophy,
    match: (path) => path.startsWith("/classement"),
  },
  { to: "/profil", label: "Profil", icon: UserIcon, match: (path) => path.startsWith("/profil") },
];

const HIDDEN_PREFIXES = ["/lecon", "/auth", "/onboarding"];

/**
 * Une intervention engagée est un contexte fermé, comme une leçon.
 *
 * La barre principale s'y efface au profit de la barre de mission, qui dit où
 * l'on en est du bilan. Deux barres empilées se recouvriraient, et surtout la
 * seconde perdrait son sens : on ne quitte pas une intervention en cours pour
 * aller à la boutique.
 *
 * Le contrôle porte sur le paramètre de mission et non sur la seule adresse :
 * `/intervention-v3` sans mission engagée est l'écran de choix, où la barre
 * principale reste utile.
 */
const isEngagedIntervention = (pathname: string, search: string): boolean =>
  pathname.startsWith("/intervention-v3") && /(^|[?&])scenario=/.test(search);

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const searchString = useRouterState({ select: (state) => state.location.searchStr });

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  if (isEngagedIntervention(pathname, searchString)) return null;

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
                  {active ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{ boxShadow: "var(--glow-primary)" }}
                    />
                  ) : null}
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
