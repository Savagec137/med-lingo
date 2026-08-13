import type { MedocaRarity, MedocaTone } from "./types";

export const MEDOCA_TONE_CLASSES: Record<
  MedocaTone,
  { accent: string; surface: string; border: string; glow: string }
> = {
  cyan: {
    accent: "text-[#69d7f2]",
    surface: "bg-[#163044]",
    border: "border-[#31536a]",
    glow: "shadow-[0_0_18px_rgba(105,215,242,0.10)]",
  },
  emerald: {
    accent: "text-[#26d878]",
    surface: "bg-[#102a25]",
    border: "border-[#26d878]/55",
    glow: "shadow-[0_0_18px_rgba(38,216,120,0.12)]",
  },
  gold: {
    accent: "text-amber-300",
    surface: "bg-amber-400/10",
    border: "border-amber-300/35",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.14)]",
  },
  violet: {
    accent: "text-violet-300",
    surface: "bg-violet-400/10",
    border: "border-violet-300/35",
    glow: "shadow-[0_0_24px_rgba(167,139,250,0.14)]",
  },
  rose: {
    accent: "text-rose-300",
    surface: "bg-rose-400/10",
    border: "border-rose-300/35",
    glow: "shadow-[0_0_24px_rgba(251,113,133,0.14)]",
  },
  neutral: {
    accent: "text-[#d8e0e9]",
    surface: "bg-[#111d2b]",
    border: "border-[#2b3b4d]",
    glow: "shadow-[0_12px_30px_rgba(0,0,0,0.16)]",
  },
};

export const MEDOCA_RARITY_CLASSES: Record<
  MedocaRarity,
  { label: string; accent: string; surface: string; border: string }
> = {
  common: {
    label: "Commun",
    accent: "text-slate-300",
    surface: "bg-slate-300/10",
    border: "border-slate-300/25",
  },
  rare: {
    label: "Rare",
    accent: "text-sky-300",
    surface: "bg-sky-400/10",
    border: "border-sky-300/35",
  },
  epic: {
    label: "Épique",
    accent: "text-violet-300",
    surface: "bg-violet-400/10",
    border: "border-violet-300/35",
  },
  legendary: {
    label: "Légendaire",
    accent: "text-amber-300",
    surface: "bg-amber-400/10",
    border: "border-amber-300/40",
  },
  mythic: {
    label: "Mythique",
    accent: "text-fuchsia-300",
    surface: "bg-fuchsia-400/10",
    border: "border-fuchsia-300/40",
  },
};
