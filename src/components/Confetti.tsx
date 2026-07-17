import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

type ConfettiPiece = {
  id: number;
  x: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  size: number;
  shape: "square" | "circle" | "bar";
};

const PALETTE = [
  "oklch(0.78 0.15 210)",
  "oklch(0.68 0.22 300)",
  "oklch(0.82 0.16 80)",
  "oklch(0.76 0.18 155)",
  "oklch(0.72 0.24 350)",
];

function makePieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.35,
    duration: 1.6 + Math.random() * 1.6,
    rotate: (Math.random() - 0.5) * 720,
    color: PALETTE[i % PALETTE.length],
    size: 6 + Math.floor(Math.random() * 8),
    shape: (["square", "circle", "bar"] as const)[i % 3],
  }));
}

/**
 * Full-screen celebratory confetti. Renders once and cleans up after
 * ~3s; parent controls mount/unmount to replay.
 */
export function Confetti({
  count = 80,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const pieces = useMemo(() => makePieces(count), [count]);

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[60] overflow-hidden ${className ?? ""}`}
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -40, x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.x}%`,
            width: p.shape === "bar" ? p.size * 0.4 : p.size,
            height: p.shape === "bar" ? p.size * 1.6 : p.size,
            borderRadius: p.shape === "circle" ? "9999px" : p.shape === "bar" ? "2px" : "3px",
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}
