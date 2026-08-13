import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { DEFAULT_HOTSPOT_RADIUS } from "@/features/anatomy/anatomy-domain";

export interface Hotspot {
  id: string;
  /** Coordonnées 0..1 relatives à l'image. */
  x: number;
  y: number;
  label: string;
  /** Rayon en pourcentage de la largeur (défaut 7). */
  radius?: number;
}

interface ImageHotspotProps {
  imageUrl: string;
  imageAlt: string;
  hotspots: Hotspot[];
  /** Identifiant à trouver ; `null` conserve le mode observation libre. */
  target?: string | null;
  onGuess?: (result: { hit: Hotspot | null; correct: boolean }) => void;
}

/**
 * Image interactive générique, conservée pour `interactive_image`.
 * `anatomy_location` utilise désormais AnatomyBoard sans supprimer ce contrat.
 */
export function ImageHotspot({ imageUrl, imageAlt, hotspots, target, onGuess }: ImageHotspotProps) {
  const [feedback, setFeedback] = useState<null | { at: { x: number; y: number }; ok: boolean }>(
    null,
  );

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!target) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const hit = hotspots.find((hotspot) => {
      const radius = (hotspot.radius ?? DEFAULT_HOTSPOT_RADIUS) / 100;
      return Math.hypot(hotspot.x - x, hotspot.y - y) <= radius;
    });
    const isCorrect = hit?.id === target;
    setFeedback({ at: { x, y }, ok: isCorrect });
    onGuess?.({ hit: hit ?? null, correct: isCorrect });
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        onClick={handleClick}
        className="panel relative overflow-hidden p-0"
        style={{ cursor: target ? "crosshair" : "default" }}
      >
        <img src={imageUrl} alt={imageAlt} className="block w-full select-none" draggable={false} />

        {!target
          ? hotspots.map((hotspot) => (
              <span
                key={hotspot.id}
                className="chip absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
              >
                {hotspot.label}
              </span>
            ))
          : null}

        {feedback ? (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`pointer-events-none absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white ${feedback.ok ? "bg-[color:var(--color-success)]" : "bg-[color:var(--color-destructive)]"}`}
            style={{ left: `${feedback.at.x * 100}%`, top: `${feedback.at.y * 100}%` }}
          >
            {feedback.ok ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </motion.span>
        ) : null}
      </div>
      {target ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Sélectionne la zone demandée sur l’image.
        </p>
      ) : null}
    </div>
  );
}
