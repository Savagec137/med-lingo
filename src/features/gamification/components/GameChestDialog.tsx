import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Box, Coins, Gem, KeyRound, LockKeyhole, Sparkles, Ticket, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChestOpenResult, GameReward, RewardType } from "@/features/gamification/domain";
import { CHEST_META, RARITY_META } from "@/features/gamification/domain";
import { LevelUpCelebration } from "@/features/gamification/components/LevelUpCelebration";
import {
  CHEST_OPENING_TIMING,
  canStartChestOpening,
  getContinueDelay,
  type ChestOpeningPhase,
} from "@/features/gamification/components/chest-opening-sequence";
import { CHEST_IMAGE } from "@/lib/asset-map";
import { Confetti } from "@/components/Confetti";

const OPEN_EASE = [0.22, 1, 0.36, 1] as const;
const PARTICLE_COUNT = 20;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const angle = (Math.PI * 2 * index) / PARTICLE_COUNT;
  const distance = 62 + (index % 4) * 13;
  return {
    id: index,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 20 - (index % 3) * 8,
    size: index % 5 === 0 ? 7 : 4,
  };
});

const REWARD_META: Record<RewardType, { label: string; Icon: typeof Coins }> = {
  coins: { label: "Pièces", Icon: Coins },
  gems: { label: "Gemmes", Icon: Gem },
  keys: { label: "Clés", Icon: KeyRound },
  tickets: { label: "Tickets", Icon: Ticket },
  energy: { label: "Énergie", Icon: Zap },
  xp: { label: "XP", Icon: Sparkles },
  item: { label: "Objet", Icon: Box },
};

function playUnlockPlaceholderSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(720, now);
    oscillator.frequency.exponentialRampToValueAtTime(1020, now + 0.11);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.14);
    window.setTimeout(() => context.close().catch(() => undefined), 250);
  } catch {
    // Audio is optional; browsers may block sound when it was not user initiated.
  }
}

function RewardRow({ reward, index, reducedMotion }: { reward: GameReward; index: number; reducedMotion: boolean }) {
  const { Icon, label } = REWARD_META[reward.type];
  const rarity = reward.rarity ?? "common";
  const accent = RARITY_META[rarity].accent;
  const name = reward.type === "item" ? String(reward.metadata?.name ?? reward.itemCode ?? label) : label;
  const rotate = ((index * 13) % 7) - 3;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.7, rotate }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={reducedMotion ? { duration: 0 } : { delay: index * 0.12, duration: 0.42, ease: OPEN_EASE }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.16)]"
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ color: accent, backgroundColor: `color-mix(in oklab, ${accent} 17%, transparent)` }}
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

function ChestParticles({ accent, visible, reducedMotion }: { accent: string; visible: boolean; reducedMotion: boolean }) {
  if (!visible || reducedMotion) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
      {PARTICLES.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute left-1/2 top-1/2 rounded-full will-change-transform"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.id % 3 === 0 ? "white" : accent,
            boxShadow: `0 0 10px ${accent}`,
          }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.35 }}
          animate={{ opacity: [0, 1, 0], x: particle.x, y: particle.y, scale: [0.35, 1, 0.4] }}
          transition={{ duration: 0.62, delay: (particle.id % 4) * 0.018, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

type ChestVisualProps = {
  accent: string;
  gradient: string;
  image?: string;
  phase: ChestOpeningPhase;
  reducedMotion: boolean;
};

function ChestVisual({ accent, gradient, image, phase, reducedMotion }: ChestVisualProps) {
  const atRest = phase === "rest";
  const isUnlocking = phase === "unlocking";
  const isOpening = phase === "opening" || phase === "rewards";

  return (
    <div className="relative mx-auto my-3 flex h-48 w-48 items-center justify-center" style={{ perspective: "1000px" }}>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 rounded-full"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 68%)` }}
        initial={false}
        animate={
          isOpening
            ? { opacity: 1, scale: 1.35, filter: "blur(22px)" }
            : { opacity: atRest ? 0.18 : 0, scale: atRest ? 0.82 : 0.6, filter: "blur(7px)" }
        }
        transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-6 rounded-full"
        style={{ background: gradient, filter: "blur(32px)" }}
        animate={atRest && !reducedMotion ? { opacity: [0.2, 0.42, 0.2], scale: [0.8, 1.04, 0.8] } : { opacity: isOpening ? 0.44 : 0.12, scale: 1 }}
        transition={atRest && !reducedMotion ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      />
      <ChestParticles accent={accent} visible={phase === "opening"} reducedMotion={reducedMotion} />
      <motion.div
        className="pointer-events-none absolute bottom-5 h-8 w-32 rounded-[50%] bg-black/55 blur-md"
        animate={isOpening ? { opacity: 0.45, scale: 1.05 } : { opacity: 0.34, scale: 0.84 }}
        transition={{ duration: reducedMotion ? 0 : 0.22 }}
      />
      <motion.div
        className="relative h-32 w-32 will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
        animate={
          atRest && !reducedMotion
            ? { y: [0, -4, 0], rotateZ: [-1.5, 1.5, -1.5] }
            : phase === "preopening"
              ? { scaleY: [1, 0.96, 1], x: [0, -4, 4, -4, 4, -3, 3, 0], rotateZ: 0 }
              : { y: 0, x: 0, rotateZ: 0, scaleY: 1 }
        }
        transition={
          atRest && !reducedMotion
            ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            : phase === "preopening"
              ? { duration: 0.45, ease: "easeInOut" }
              : { duration: reducedMotion ? 0 : 0.12 }
        }
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/30 shadow-2xl"
          style={{ background: gradient, boxShadow: `0 0 38px ${accent}` }}
        >
          {image ? <img src={image} alt="" className="h-full w-full object-contain p-1.5 drop-shadow-[0_12px_12px_rgba(0,0,0,0.5)]" /> : <Box className="m-9 h-14 w-14 text-white" strokeWidth={2.2} />}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              clipPath: "inset(0 0 48% 0)",
              transformOrigin: "50% 78%",
              transformStyle: "preserve-3d",
            }}
            animate={isOpening ? { rotateX: -105, y: -8 } : { rotateX: 0, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.65, ease: OPEN_EASE }}
          >
            {image && <img src={image} alt="" className="h-full w-full object-contain p-1.5 drop-shadow-[0_-8px_14px_rgba(255,255,255,0.28)]" />}
          </motion.div>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-5 top-8 h-12 rounded-full"
            style={{ backgroundColor: accent, filter: "blur(14px)" }}
            animate={isOpening ? { opacity: 0.95, scale: 1.25 } : { opacity: 0, scale: 0.6 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 top-[53%] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-white/45 bg-slate-950/55 shadow-lg"
          animate={isUnlocking || isOpening ? { rotate: [0, 25, 18], scale: [1, 1.08, 0.9], opacity: isOpening ? 0 : 1 } : { rotate: 0, scale: 1, opacity: 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: isUnlocking ? 0.3 : 0.16, ease: OPEN_EASE }}
        >
          <LockKeyhole className="h-4 w-4" style={{ color: accent }} strokeWidth={2.6} />
        </motion.div>
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-10%] rounded-full"
          style={{ background: `radial-gradient(circle, white 0%, ${accent} 27%, transparent 68%)` }}
          animate={isUnlocking ? { opacity: [0, 0.95, 0], scale: [0.4, 1.25, 1.7] } : { opacity: 0, scale: 0.4 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
        />
      </motion.div>
    </div>
  );
}

export function GameChestDialog({ result, onClose }: { result: ChestOpenResult | null; onClose: () => void }) {
  const reducedMotion = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<ChestOpeningPhase>("rest");
  const [continueVisible, setContinueVisible] = useState(false);
  const startedRef = useRef(false);
  const timersRef = useRef(new Set<number>());
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const chestMeta = result ? CHEST_META[result.tier] : null;
  const rarity = chestMeta?.rarity ?? "common";
  const accent = RARITY_META[rarity].accent;
  const image = result ? CHEST_IMAGE[result.tier] ?? CHEST_IMAGE.bronze : undefined;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    clearTimers();
    startedRef.current = false;
    setPhase("rest");
    setContinueVisible(false);
  }, [result, clearTimers]);

  useEffect(() => {
    if (phase !== "unlocking" || reducedMotion) return;
    playUnlockPlaceholderSound();
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "rewards" || !result) return;
    if (reducedMotion) {
      setContinueVisible(true);
      return;
    }

    const timer = schedule(() => setContinueVisible(true), getContinueDelay(result.rewards.length));
    return () => {
      window.clearTimeout(timer);
      timersRef.current.delete(timer);
    };
  }, [phase, reducedMotion, result, schedule]);

  useEffect(() => {
    if (continueVisible) continueButtonRef.current?.focus();
  }, [continueVisible]);

  const startOpening = useCallback(() => {
    if (!canStartChestOpening(phase, startedRef.current)) return;
    startedRef.current = true;

    if (reducedMotion) {
      setPhase("rewards");
      setContinueVisible(true);
      return;
    }

    setPhase("preopening");
    schedule(() => setPhase("unlocking"), CHEST_OPENING_TIMING.preopening);
    schedule(
      () => setPhase("opening"),
      CHEST_OPENING_TIMING.preopening + CHEST_OPENING_TIMING.unlocking,
    );
    schedule(
      () => setPhase("rewards"),
      CHEST_OPENING_TIMING.preopening + CHEST_OPENING_TIMING.unlocking + CHEST_OPENING_TIMING.opening,
    );
  }, [phase, reducedMotion, schedule]);

  const handleClose = useCallback(() => {
    clearTimers();
    onClose();
  }, [clearTimers, onClose]);

  return (
    <AnimatePresence>
      {result && chestMeta && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.section
            aria-labelledby="chest-opening-title"
            aria-modal="true"
            role="dialog"
            className="glass-strong relative w-full max-w-md overflow-hidden rounded-3xl p-6"
            initial={reducedMotion ? false : { scale: 0.94, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: reducedMotion ? 1 : 0.96, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 22 }}
            onClick={(event) => event.stopPropagation()}
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-35"
              style={{ background: chestMeta.gradient }}
              animate={phase === "opening" || phase === "rewards" ? { opacity: 0.55, scaleY: 1 } : { opacity: 0.2, scaleY: 0.65 }}
              transition={{ duration: reducedMotion ? 0 : 0.5 }}
            />
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fermer l'ouverture du coffre"
              className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-muted-foreground transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative text-center">
              <div aria-live="polite" className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                {phase === "rest" ? "Coffre prêt" : phase === "rewards" ? "Récompenses obtenues" : "Ouverture en cours"}
              </div>
              <h2 id="chest-opening-title" className="mt-1 font-display text-2xl font-extrabold">
                {chestMeta.label}
              </h2>
            </div>
            <ChestVisual accent={accent} gradient={chestMeta.gradient} image={image} phase={phase} reducedMotion={reducedMotion} />
            {phase === "rest" ? (
              <motion.button
                type="button"
                onClick={startOpening}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.24, delay: reducedMotion ? 0 : 0.2 }}
                className="btn-primary mt-1 w-full rounded-2xl py-3 font-display font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Ouvrir le coffre
              </motion.button>
            ) : phase === "rewards" ? (
              <>
                <div className="mb-3 text-center text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent }}>
                  Révélation des récompenses
                </div>
                <div className="space-y-2 [perspective:800px]" aria-live="polite">
                  {result.rewards.map((reward, index) => (
                    <RewardRow key={`${reward.type}-${reward.itemCode ?? index}`} reward={reward} index={index} reducedMotion={reducedMotion} />
                  ))}
                </div>
                {result.levelUp && <LevelUpCelebration from={result.levelUp.from} to={result.levelUp.to} />}
                {continueVisible && (
                  <motion.button
                    ref={continueButtonRef}
                    type="button"
                    onClick={handleClose}
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.22 }}
                    className="btn-primary mt-5 w-full rounded-2xl py-3 font-display font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Continuer
                  </motion.button>
                )}
              </>
            ) : (
              <div aria-live="polite" className="mt-1 text-center text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent }}>
                {phase === "preopening" ? "Préparation" : phase === "unlocking" ? "Déverrouillage" : "Ouverture"}
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
