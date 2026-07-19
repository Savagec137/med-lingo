import { motion } from "framer-motion";
import { Skull, Heart } from "lucide-react";
import type { ReactNode } from "react";

interface BossBattleCardProps {
  name: string;
  /** 0..1 */
  hp: number;
  /** 0..1 */
  playerHp?: number;
  turnLabel?: string;
  children?: ReactNode;
}

/**
 * Écran de "boss médical" — affiche la barre de vie du boss, du joueur, et
 * laisse un slot pour les questions (souvent un McqCard chronométré).
 */
export function BossBattleCard({
  name,
  hp,
  playerHp = 1,
  turnLabel = "À toi de jouer",
  children,
}: BossBattleCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="panel relative overflow-hidden p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, oklch(0.66 0.24 20 / 0.5), transparent 60%)",
          }}
        />

        <div className="relative flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--color-destructive)]/20 text-[color:var(--color-destructive)]"
          >
            <Skull className="h-8 w-8" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="section-eyebrow">Boss</p>
            <h2 className="truncate text-xl font-black">{name}</h2>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/40">
              <motion.div
                className="h-full rounded-full bg-[color:var(--color-destructive)]"
                animate={{ width: `${Math.max(0, Math.min(1, hp)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex items-center gap-2">
          <Heart className="h-4 w-4 fill-current text-[color:var(--color-success)]" />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
            <motion.div
              className="h-full rounded-full bg-[color:var(--color-success)]"
              animate={{ width: `${Math.max(0, Math.min(1, playerHp)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="chip">{turnLabel}</span>
        </div>
      </div>

      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
