import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/**
 * Marée Bleue — jeu de foule en 3D, sur sa propre route.
 *
 * Le moteur (Three.js) est chargé à la demande, côté client uniquement : il
 * ne pèse rien sur le reste de l'application et ne s'exécute jamais au rendu
 * serveur.
 */

export const Route = createFileRoute("/maree-bleue")({
  head: () => ({
    meta: [
      { title: "Marée Bleue — fais tomber la forteresse" },
      { name: "theme-color", content: "#0b1430" },
    ],
  }),
  component: MareeBleueRoute,
});

function MareeBleueRoute() {
  const host = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let handle: { dispose(): void } | null = null;
    void import("@/features/maree-bleue/game").then(({ createMareeBleue }) => {
      if (cancelled || !host.current) return;
      handle = createMareeBleue(host.current, { onExit: () => void navigate({ to: "/" }) });
    });
    return () => {
      cancelled = true;
      handle?.dispose();
    };
  }, [navigate]);

  return <div ref={host} className="fixed inset-0 z-[100] bg-[#0b1430]" />;
}
