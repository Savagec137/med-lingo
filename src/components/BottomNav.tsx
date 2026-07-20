import { Link, useRouterState } from "@tanstack/react-router";
import bottomBar from "@/assets/bottom-nav-bar.png";

const ITEMS = [
  { to: "/", label: "Accueil", match: (p: string) => p === "/" },
  { to: "/pulse", label: "Pulse", match: (p: string) => p.startsWith("/pulse") },
  {
    to: "/",
    label: "MedLingo",
    match: (p: string) => p === "/",
  },
  { to: "/classement", label: "Ligue", match: (p: string) => p.startsWith("/classement") },
  { to: "/profil", label: "Profil", match: (p: string) => p.startsWith("/profil") },
] as const;

const HIDDEN_PREFIXES = ["/lecon", "/auth", "/onboarding"];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative mx-auto w-full max-w-3xl">
        <img
          src={bottomBar}
          alt=""
          aria-hidden
          className="block h-auto w-full select-none"
          draggable={false}
        />
        <ul className="absolute inset-0 grid grid-cols-5">
          {ITEMS.map((item, i) => {
            const active = item.match(pathname);
            return (
              <li key={i} className="flex">
                <Link
                  to={item.to}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="flex-1 press"
                >
                  <span className="sr-only">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
