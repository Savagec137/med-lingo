import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";

/**
 * Naval Battles — jeu de combat naval en 3D, sur sa propre route.
 *
 * Le jeu (Three.js compris) est chargé à la demande, côté client uniquement :
 * il ne pèse rien sur le reste de l'application et ne s'exécute jamais au
 * rendu serveur.
 */

export const Route = createFileRoute("/naval")({
  head: () => ({
    meta: [
      { title: "Naval Battles — combats de pirates" },
      { name: "theme-color", content: "#0b1428" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&display=swap",
      },
    ],
  }),
  component: NavalRoute,
});

type AppComponent = ComponentType<{ onExit(): void }>;

function NavalRoute() {
  const navigate = useNavigate();
  const [App, setApp] = useState<AppComponent | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@/features/naval/ui/NavalBattlesApp")
      .then((m) => {
        if (!cancelled) setApp(() => m.NavalBattlesApp);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (App) return <App onExit={() => void navigate({ to: "/" })} />;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-[#0b1428] text-[#f3c25b]">
      <div
        className="text-2xl font-black tracking-widest"
        style={{ fontFamily: "Cinzel, Georgia, serif" }}
      >
        NAVAL BATTLES
      </div>
      <div className="text-sm text-[#c9d6ea]">
        {failed ? "Le jeu n'a pas pu se charger. Rechargez la page." : "Hissez les voiles…"}
      </div>
    </div>
  );
}
