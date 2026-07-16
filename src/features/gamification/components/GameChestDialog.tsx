import { AnimatePresence, motion } from "framer-motion";
import { Box, Coins, Gem, KeyRound, Sparkles, Ticket, X, Zap } from "lucide-react";
import type { ChestOpenResult, GameReward, RewardType } from "@/features/gamification/domain";
import { CHEST_META, RARITY_META } from "@/features/gamification/domain";
import { LevelUpCelebration } from "@/features/gamification/components/LevelUpCelebration";
import { CHEST_IMAGE } from "@/lib/asset-map";

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
      initial={{ opacity: 0, y: 28, scale: 0.86, rotateX: -18 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      transition={{ delay: 1.95 + index * 0.16, type: "spring", stiffness: 280, damping: 20 }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.16)]"
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

function ChestBurst({ accent }: { accent: string }) {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute inset-5 rounded-full border-2"
        style={{ borderColor: accent }}
        initial={{ opacity: 0, scale: 0.35 }}
        animate={{ opacity: [0, 0.85, 0], scale: [0.35, 1.75, 2.25] }}
        transition={{ delay: 1.1, duration: 0.72, ease: "easeOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-9 rounded-full border"
        style={{ borderColor: "rgba(255,255,255,0.85)" }}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.3, 1.45, 1.9] }}
        transition={{ delay: 1.2, duration: 0.66, ease: "easeOut" }}
      />
      {Array.from({ length: 18 }).map((_, index) => {
        const angle = (360 / 18) * index;
        const distance = 74 + (index % 3) * 16;
        const size = index % 4 === 0 ? 7 : 4;
        return (
          <motion.span
            key={index}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: size,
              height: size,
              backgroundColor: index % 3 === 0 ? "white" : accent,
              boxShadow: `0 0 12px ${accent}`,
            }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.2 }}
            animate={{
              opacity: [0, 1, 0],
              x: Math.cos((angle * Math.PI) / 180) * distance,
              y: Math.sin((angle * Math.PI) / 180) * distance,
              scale: [0.2, 1, 0.35],
            }}
            transition={{ delay: 1.08 + (index % 4) * 0.025, duration: 0.7, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

export function GameChestDialog({
  result,
  onClose,
}: {
  result: ChestOpenResult | null;
  onClose: () => void;
}) {
  const chestMeta = result ? CHEST_META[result.tier] : null;
  const rarity = chestMeta?.rarity ?? "common";
  const accent = RARITY_META[rarity].accent;
  const image = result ? CHEST_IMAGE[result.tier] : undefined;

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
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
              style={{ background: chestMeta?.gradient }}
              initial={{ opacity: 0, scaleY: 0.2 }}
              animate={{ opacity: [0, 0.58, 0.28], scaleY: [0.2, 1, 1] }}
              transition={{ duration: 1.2 }}
            />
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative text-center">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                Récompenses obtenues
              </div>
              <h2 className="mt-1 font-display text-2xl font-extrabold">
                {CHEST_META[result.tier].label}
              </h2>
            </div>
            <div
              className="relative mx-auto my-3 flex h-48 w-48 items-center justify-center"
              style={{ perspective: "1000px" }}
            >
              <motion.div
                className="absolute inset-5 rounded-full blur-3xl"
                style={{ background: CHEST_META[result.tier].gradient }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.72, 0.42, 0.66], scale: [0.5, 1.1, 0.92, 1.08] }}
                transition={{ duration: 1.75, times: [0, 0.35, 0.72, 1] }}
              />
              <motion.div
                className="pointer-events-none absolute inset-1 rounded-full"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.48) 0deg 2deg, transparent 2deg 22deg)",
                }}
                initial={{ opacity: 0, rotate: -20, scale: 0.3 }}
                animate={{ opacity: [0, 0, 0.78, 0.28], rotate: [-20, 15, 52, 90], scale: [0.3, 0.4, 1.08, 1.28] }}
                transition={{ delay: 0.9, duration: 1.15, ease: "easeOut" }}
              />
              <ChestBurst accent={accent} />
              <motion.div
                className="pointer-events-none absolute bottom-6 h-8 w-32 rounded-[50%] bg-black/55 blur-md"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 0.7, 0.42], scale: [0.4, 1.15, 0.95] }}
                transition={{ duration: 1.1, times: [0, 0.35, 1] }}
              />
              <motion.div
                className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/30 text-white shadow-2xl"
                style={{
                  background: CHEST_META[result.tier].gradient,
                  boxShadow: `0 0 38px ${accent}`,
                  transformStyle: "preserve-3d",
                }}
                initial={{ y: 36, rotateX: -24, rotateY: -38, rotateZ: -9, scale: 0.45 }}
                animate={{
                  y: [36, -8, 0, 0],
                  rotateX: [-24, 10, 0, 0],
                  rotateY: [-38, 22, -16, 13, -9, 5, 0],
                  rotateZ: [-9, 0, -5, 5, -4, 3, 0],
                  scale: [0.45, 1.08, 1, 1.04, 1],
                }}
                transition={{
                  duration: 1.35,
                  times: [0, 0.32, 0.5, 0.68, 1],
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {image ? (
                  <>
                    <motion.img
                      src={image}
                      alt=""
                      className="h-full w-full object-contain p-1.5 drop-shadow-[0_12px_12px_rgba(0,0,0,0.5)]"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: [0.7, 1.12, 1] }}
                      transition={{ duration: 0.55, delay: 0.2 }}
                    />
                    <motion.div
                      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]"
                      style={{
                        clipPath: "inset(0 0 46% 0)",
                        transformOrigin: "50% 88%",
                        transformStyle: "preserve-3d",
                      }}
                      initial={{ rotateX: 0, y: 0, opacity: 0 }}
                      animate={{ rotateX: [0, 0, -66], y: [0, 0, -9], opacity: [0, 1, 1] }}
                      transition={{ delay: 0.28, duration: 1.15, times: [0, 0.67, 1], ease: "easeInOut" }}
                    >
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-contain p-1.5 drop-shadow-[0_-8px_14px_rgba(255,255,255,0.28)]"
                      />
                    </motion.div>
                    <motion.div
                      className="pointer-events-none absolute inset-x-5 top-8 h-12 rounded-full blur-xl"
                      style={{ backgroundColor: accent }}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: [0, 0, 0.95, 0.3], scale: [0.4, 0.5, 1.25, 1.55] }}
                      transition={{ delay: 0.72, duration: 0.82, ease: "easeOut" }}
                    />
                  </>
                ) : (
                  <Box className="h-14 w-14" strokeWidth={2.2} />
                )}
              </motion.div>
            </div>
            <motion.div
              className="mb-3 text-center text-[10px] font-extrabold uppercase tracking-[0.16em]"
              style={{ color: accent }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
            >
              Révélation des récompenses
            </motion.div>
            <div className="space-y-2 [perspective:800px]">
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
              transition={{ delay: 2.1 + result.rewards.length * 0.16 }}
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
