import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

export interface Hotspot {
  id: string;
  /** 0..1 coords relative to image */
  x: number;
  y: number;
  label: string;
  /** rayon en % de la largeur (défaut 6) */
  radius?: number;
}

interface ImageHotspotProps {
  imageUrl: string;
  imageAlt: string;
  hotspots: Hotspot[];
  /** Id à trouver ; si null, mode observation libre */
  target?: string | null;
  onGuess?: (result: { hit: Hotspot | null; correct: boolean }) => void;
}

/**
 * Image interactive : l'utilisateur touche une zone. Utilisé pour Identifier
 * (« Où est le radius ? »). En mode observation (target=null) : affiche les
 * labels au survol.
 */
export function ImageHotspot({ imageUrl, imageAlt, hotspots, target, onGuess }: ImageHotspotProps) {
  const [feedback, setFeedback] = useState<null | { at: { x: number; y: number }; ok: boolean }>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!target) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const hit = hotspots.find((h) => {
      const r = (h.radius ?? 6) / 100;
      return Math.hypot(h.x - x, h.y - y) <= r;
    });
    const correct = hit?.id === target;
    setFeedback({ at: { x, y }, ok: correct });
    onGuess?.({ hit: hit ?? null, correct });
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        onClick={handleClick}
        className="panel relative overflow-hidden p-0"
        style={{ cursor: target ? "crosshair" : "default" }}
      >
        <img src={imageUrl} alt={imageAlt} className="block w-full select-none" draggable={false} />

        {/* Observation mode : labels flottants */}
        {!target
          ? hotspots.map((h) => (
              <span
                key={h.id}
                className="chip absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
              >
                {h.label}
              </span>
            ))
          : null}

        {feedback ? (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`pointer-events-none absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white ${
              feedback.ok ? "bg-[color:var(--color-success)]" : "bg-[color:var(--color-destructive)]"
            }`}
            style={{ left: `${feedback.at.x * 100}%`, top: `${feedback.at.y * 100}%` }}
          >
            {feedback.ok ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </motion.span>
        ) : null}
      </div>
      {target ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Cible : <span className="font-bold text-foreground">{hotspots.find((h) => h.id === target)?.label}</span>
        </p>
      ) : null}
    </div>
  );
}
