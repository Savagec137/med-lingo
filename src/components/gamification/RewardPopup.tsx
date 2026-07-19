import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

interface RewardPopupProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  rarity?: Rarity;
  artwork?: ReactNode;
  children?: ReactNode;
}

const RARITY_UTIL: Record<Rarity, string> = {
  common: "rarity-common",
  rare: "rarity-rare",
  epic: "rarity-epic",
  legendary: "rarity-legendary",
  mythic: "rarity-mythic",
};

/**
 * Modal de récompense générique — badge débloqué, level up, item obtenu.
 * L'artwork est libre pour brancher une image, un Lottie, un icône Lucide.
 */
export function RewardPopup({
  open,
  onClose,
  title,
  subtitle,
  rarity = "common",
  artwork,
  children,
}: RewardPopupProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            className={`glass-strong relative w-full max-w-sm rounded-3xl border-2 p-6 text-center elev-3 ${RARITY_UTIL[rarity]}`}
            initial={{ scale: 0.6, y: 24, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <button
              onClick={onClose}
              className="press absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            {artwork ? (
              <div className="mx-auto mb-4 grid h-32 w-32 place-items-center animate-bounce-in">
                {artwork}
              </div>
            ) : null}

            <p className="section-eyebrow mb-1">Nouvelle récompense</p>
            <h2 className="text-2xl font-black">{title}</h2>
            {subtitle ? (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}

            {children ? <div className="mt-5">{children}</div> : null}

            <button
              onClick={onClose}
              className="btn-primary press mt-6 w-full rounded-2xl px-4 py-3 text-sm font-extrabold"
            >
              Génial !
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
