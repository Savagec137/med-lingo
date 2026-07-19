import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { RotateCw } from "lucide-react";

interface FlashcardProps {
  front: ReactNode;
  back: ReactNode;
  hint?: string;
  onFlip?: (isBack: boolean) => void;
}

/**
 * Carte retournable façon Anki. Flip 3D avec spring.
 */
export function Flashcard({ front, back, hint, onFlip }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => {
    const next = !flipped;
    setFlipped(next);
    onFlip?.(next);
  };
  return (
    <div className="perspective mx-auto w-full max-w-md" style={{ perspective: 1200 }}>
      <motion.button
        type="button"
        onClick={toggle}
        aria-pressed={flipped}
        className="relative block h-64 w-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <FaceCard rotation={0}>{front}</FaceCard>
        <FaceCard rotation={180}>{back}</FaceCard>
      </motion.button>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{hint ?? "Tape la carte pour la retourner"}</span>
        <span className="inline-flex items-center gap-1">
          <RotateCw className="h-3.5 w-3.5" /> {flipped ? "Verso" : "Recto"}
        </span>
      </div>
    </div>
  );
}

function FaceCard({ rotation, children }: { rotation: number; children: ReactNode }) {
  return (
    <div
      className="panel absolute inset-0 flex items-center justify-center p-6 text-center"
      style={{
        backfaceVisibility: "hidden",
        transform: `rotateY(${rotation}deg)`,
      }}
    >
      <div className="text-xl font-extrabold leading-tight">{children}</div>
    </div>
  );
}
