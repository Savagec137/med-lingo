import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

export function LevelUpCelebration({ from, to }: { from: number; to: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 rounded-2xl border border-[color:var(--color-warning)]/50 bg-[color:var(--color-warning)]/10 p-3 text-center"
    >
      <motion.div
        animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 0.65 }}
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-warning)] text-background"
      >
        <Trophy className="h-5 w-5" strokeWidth={2.5} />
      </motion.div>
      <div className="mt-1 text-sm font-extrabold">Niveau {to} atteint</div>
      <div className="text-[11px] text-muted-foreground">
        Progression : niveau {from} vers niveau {to}
      </div>
    </motion.div>
  );
}
