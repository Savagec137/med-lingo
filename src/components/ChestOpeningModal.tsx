import { AnimatePresence, motion } from "framer-motion";
import { Coins, Gem, Key, Package, Sparkles, X } from "lucide-react";
import type { ChestResult, ChestTier, LootItem } from "@/lib/use-chest";

const TIER_META: Record<ChestTier, { label: string; gradient: string; glow: string; rarity: string }> = {
  bronze:  { label: "Coffre Bronze",    gradient: "linear-gradient(135deg,#c17c3a,#8a4a1a)", glow: "0 0 60px #c17c3a88", rarity: "rarity-common" },
  silver:  { label: "Coffre Argent",    gradient: "linear-gradient(135deg,#d6d6e0,#8a8aa0)", glow: "0 0 60px #d6d6e099", rarity: "rarity-rare" },
  gold:    { label: "Coffre Or",        gradient: "var(--gradient-gold)",                      glow: "var(--glow-gold)",   rarity: "rarity-legendary" },
  epic:    { label: "Coffre Épique",    gradient: "linear-gradient(135deg,#a855f7,#6d28d9)", glow: "var(--glow-accent)", rarity: "rarity-epic" },
  mythic:  { label: "Coffre Mythique",  gradient: "var(--gradient-mythic)",                    glow: "0 0 80px oklch(0.72 0.24 350 / 0.7)", rarity: "rarity-mythic" },
};

function LootRow({ item, i }: { item: LootItem; i: number }) {
  const Icon =
    item.type === "coins" ? Coins :
    item.type === "gems"  ? Gem :
    item.type === "keys"  ? Key :
    Sparkles;
  const color =
    item.type === "coins" ? "var(--color-warning)" :
    item.type === "gems"  ? "var(--color-accent)" :
    item.type === "keys"  ? "var(--color-info)" :
    "var(--color-primary)";
  const label =
    item.type === "cosmetic" ? `Cosmétique ${item.rarity}` :
    `+${item.amount} ${item.type === "coins" ? "pièces" : item.type === "gems" ? "gemmes" : "clés"}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.6 + i * 0.18, type: "spring", stiffness: 260, damping: 20 }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}20`, color }}>
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="font-display text-lg font-extrabold text-foreground">{label}</span>
    </motion.div>
  );
}

export function ChestOpeningModal({ result, onClose }: { result: ChestResult | null; onClose: () => void }) {
  const open = !!result;
  return (
    <AnimatePresence>
      {open && result && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass-strong relative w-full max-w-md rounded-3xl p-6"
            initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-white/5 p-2 text-muted-foreground hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>

            {result.source === "compensation" && (
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Coffre de compensation
              </p>
            )}
            <h2 className="mb-6 text-center font-display text-2xl font-extrabold text-gradient-primary">
              {TIER_META[result.tier].label}
            </h2>

            {/* Chest hero */}
            <div className="relative mx-auto mb-6 flex h-40 w-40 items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: TIER_META[result.tier].gradient, filter: "blur(30px)", opacity: 0.7 }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.2, 1], opacity: [0, 0.9, 0.7] }}
                transition={{ duration: 1.4 }}
              />
              <motion.div
                className={`relative flex h-32 w-32 items-center justify-center rounded-3xl border-2 border-white/20 ${TIER_META[result.tier].rarity}`}
                style={{ background: TIER_META[result.tier].gradient, boxShadow: TIER_META[result.tier].glow }}
                initial={{ rotate: -8, scale: 0.7 }}
                animate={{ rotate: [-8, 8, -6, 6, 0], scale: [0.7, 1.05, 1] }}
                transition={{ duration: 1.4, times: [0, 0.25, 0.5, 0.75, 1] }}
              >
                <Package className="h-16 w-16 text-white drop-shadow-lg" strokeWidth={2.2} />
              </motion.div>
              {/* burst rays */}
              <motion.div
                className="pointer-events-none absolute inset-0"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.6, 2] }}
                transition={{ delay: 1.2, duration: 1.1 }}
              >
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute left-1/2 top-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-white/60"
                    style={{ transform: `translate(-50%,-50%) rotate(${i * 36}deg) translateX(60px)` }}
                  />
                ))}
              </motion.div>
            </div>

            {/* Loot list */}
            <div className="space-y-2">
              {result.loot.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">Aucune récompense ce coup-ci.</p>
              )}
              {result.loot.map((item, i) => <LootRow key={i} item={item} i={i} />)}
            </div>

            <motion.button
              onClick={onClose}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1.6 + result.loot.length * 0.18 + 0.3 }}
              className="btn-primary mt-6 w-full rounded-2xl px-4 py-3 font-display text-base font-extrabold active:btn-primary-active"
            >
              Génial !
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
