import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface XpGainToastProps {
  amount: number | null;
  onDone?: () => void;
}

/**
 * Overlay flottant façon Duolingo : "+25 XP" qui remonte et se dissout.
 * `amount` null → rien affiché. Callback `onDone` à la fin de l'anim.
 */
export function XpGainToast({ amount, onDone }: XpGainToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center">
      <AnimatePresence onExitComplete={onDone}>
        {amount != null ? (
          <motion.div
            key={amount + "-" + Math.random()}
            initial={{ y: 0, opacity: 0, scale: 0.8 }}
            animate={{ y: -80, opacity: 1, scale: 1.05 }}
            exit={{ y: -120, opacity: 0, scale: 0.9 }}
            transition={{ duration: 1.6, ease: [0.2, 0.7, 0.3, 1] }}
            className="chip glow-primary"
            style={{
              background: "var(--gradient-primary)",
              color: "var(--color-primary-foreground)",
              fontSize: "1rem",
              padding: "0.55rem 1rem",
            }}
          >
            <Sparkles className="h-4 w-4" />
            +{amount} XP
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
