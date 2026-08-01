import { useEffect, useState } from "react";

export type SceneQuality = "low" | "high";

/**
 * Détecte la qualité de rendu adaptée à l'appareil.
 * Mobile / faible mémoire / animations réduites => "low" (moins d'éléments animés).
 */
export function useSceneQuality(): SceneQuality {
  // SSR et premier rendu : on part sur "low" (le moins coûteux, pas de flash de lag).
  const [quality, setQuality] = useState<SceneQuality>("low");

  useEffect(() => {
    const compute = (): SceneQuality => {
      if (typeof window === "undefined") return "low";
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";
      if (window.matchMedia("(max-width: 900px)").matches) return "low";
      const nav = navigator as Navigator & { deviceMemory?: number };
      if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return "low";
      if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) return "low";
      return "high";
    };

    setQuality(compute());

    const queries = [
      window.matchMedia("(prefers-reduced-motion: reduce)"),
      window.matchMedia("(max-width: 900px)"),
    ];
    const handler = () => setQuality(compute());
    queries.forEach((q) => q.addEventListener("change", handler));
    return () => queries.forEach((q) => q.removeEventListener("change", handler));
  }, []);

  return quality;
}
