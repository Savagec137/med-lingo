import { useEffect, useState } from "react";

/**
 * Préférence système « réduire les animations ».
 *
 * Lue une fois et suivie ensuite : un utilisateur qui active la réduction pendant
 * la partie doit voir les ondes s'arrêter, pas attendre un rechargement.
 *
 * La valeur de départ est `true` côté serveur et avant le premier rendu client.
 * C'est délibéré : mieux vaut démarrer sans animation et en ajouter que faire
 * clignoter un écran de surveillance devant quelqu'un qui a demandé le contraire.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
