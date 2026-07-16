import { AnimatePresence, motion } from "framer-motion";
import { Box, Coins, Gem, KeyRound, Sparkles, Ticket, X, Zap } from "lucide-react";
import type { ChestOpenResult, GameReward, RewardType } from "@/features/gamification/domain";
import { CHEST_META, RARITY_META } from "@/features/gamification/domain";
import { LevelUpCelebration } from "@/features/gamification/components/LevelUpCelebration";

const REWARD_META: Record<RewardType, { label: string; Icon: typeof Coins }> = {
  coins: { label: "Pièces", Icon: Coins },
  gems: { label: "Gemmes", Icon: Gem },
  keys: { label: "Clés", Icon: KeyRound },
  tickets: { label: "Tickets", Icon: Ticket },
  energy: { label: "Énergie", Icon: Zap },
  xp: { label: "XP", Icon: Sparkles },
  item: { label: "Objet", Icon: Box },
};

function RewardRow({ reward, index }: { reward: GameReward; index: number }) {
  const { Icon, label } = REWARD_META[reward.type];
  const rarity = reward.rarity ?? "common";
  const accent = RARITY_META[rarity].accent;
  const name =
    reward.type === "item" ? String(reward.metadata?.name ?? reward.itemCode ?? label) : label;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.05 + index * 0.15, type: "spring", stiffness: 260, damping: 19 }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          color: accent,
          backgroundColor: `color-mix(in oklab, ${accent} 17%, transparent)`,
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-extrabold">
        {reward.type === "item" ? name : `+${reward.amount} ${name}`}
      </span>
      {reward.type === "item" && (
        <span className="text-[10px] font-bold uppercase" style={{ color: accent }}>
          {RARITY_META[rarity].label}
        </span>
      )}
    </motion.div>
  );
}

export function GameChestDialog({
  result,
  onClose,
}: {
  result: ChestOpenResult | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="glass-strong relative w-full max-w-md overflow-hidden rounded-3xl p-6"
            initial={{ scale: 0.84, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                Récompenses obtenues
              </div>
              <h2 className="mt-1 font-display text-2xl font-extrabold">
                {CHEST_META[result.tier].label}
              </h2>
            </div>
            <div className="relative mx-auto my-5 flex h-36 w-36 items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full blur-3xl"
                style={{ background: CHEST_META[result.tier].gradient }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.85, 0.55], scale: [0.5, 1.25, 1] }}
                transition={{ duration: 0.9 }}
              />
              <motion.div
                className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/30 text-white"
                style={{ background: CHEST_META[result.tier].gradient }}
                initial={{ rotate: -8, scale: 0.65 }}
                animate={{ rotate: [-8, 8, -5, 0], scale: [0.65, 1.08, 1] }}
                transition={{ duration: 0.9 }}
              >
                <Box className="h-12 w-12" strokeWidth={2.2} />
              </motion.div>
            </div>
            <div className="space-y-2">
              {result.rewards.map((reward, index) => (
                <RewardRow
                  key={`${reward.type}-${reward.itemCode ?? index}`}
                  reward={reward}
                  index={index}
                />
              ))}
            </div>
            {result.levelUp && (
              <LevelUpCelebration from={result.levelUp.from} to={result.levelUp.to} />
            )}
            <motion.button
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 + result.rewards.length * 0.12 }}
              className="btn-primary mt-5 w-full rounded-2xl py-3 font-display font-extrabold"
            >
              Continuer
            </motion.button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
