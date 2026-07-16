import type { LucideIcon } from "lucide-react";
import { Brain, Cross, Dna, HeartPulse, Pill, ShieldPlus, Sparkles, Stethoscope, UserRound } from "lucide-react";

export type ProfileCardCode =
  | "game_card_default"
  | "game_card_anatomy"
  | "game_card_clinical"
  | "game_card_surgery"
  | "game_card_genome"
  | "game_card_neuro"
  | "game_card_cardio"
  | "game_card_caduceus"
  | "game_card_pediatric";

export type ProfileCardDefinition = {
  code: ProfileCardCode;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  Icon: LucideIcon;
  background: string;
  accent: string;
  foreground: string;
  muted: string;
};

export const DEFAULT_PROFILE_CARD: ProfileCardCode = "game_card_default";

export const PROFILE_CARD_CATALOG: ProfileCardDefinition[] = [
  {
    code: "game_card_default",
    name: "Carte Étudiant",
    rarity: "common",
    Icon: UserRound,
    background: "radial-gradient(circle at 88% 14%, rgba(34,211,238,.25), transparent 24%), linear-gradient(135deg, #071d2d 0%, #062f45 55%, #0f766e 100%)",
    accent: "#22d3ee",
    foreground: "#f8fafc",
    muted: "#a5f3fc",
  },
  {
    code: "game_card_anatomy",
    name: "Carte Anatomie",
    rarity: "rare",
    Icon: Dna,
    background: "radial-gradient(circle at 84% 20%, rgba(34,211,238,.34), transparent 26%), linear-gradient(135deg, #061a3d 0%, #092e65 58%, #0c4a6e 100%)",
    accent: "#38bdf8",
    foreground: "#eff6ff",
    muted: "#bae6fd",
  },
  {
    code: "game_card_clinical",
    name: "Carte Clinique",
    rarity: "epic",
    Icon: ShieldPlus,
    background: "radial-gradient(circle at 86% 18%, rgba(13,148,136,.28), transparent 30%), linear-gradient(135deg, #f8fafc 0%, #e0f2fe 53%, #ccfbf1 100%)",
    accent: "#0f9c9c",
    foreground: "#082f49",
    muted: "#155e75",
  },
  {
    code: "game_card_surgery",
    name: "Carte Bloc opératoire",
    rarity: "epic",
    Icon: Cross,
    background: "radial-gradient(circle at 86% 16%, rgba(96,165,250,.4), transparent 24%), linear-gradient(135deg, #111827 0%, #172554 52%, #0f3b70 100%)",
    accent: "#818cf8",
    foreground: "#eff6ff",
    muted: "#c7d2fe",
  },
  {
    code: "game_card_genome",
    name: "Carte Génomique",
    rarity: "rare",
    Icon: Dna,
    background: "radial-gradient(circle at 86% 22%, rgba(74,222,128,.26), transparent 28%), linear-gradient(135deg, #052e16 0%, #14532d 55%, #115e59 100%)",
    accent: "#4ade80",
    foreground: "#f0fdf4",
    muted: "#bbf7d0",
  },
  {
    code: "game_card_neuro",
    name: "Carte Neurologie",
    rarity: "legendary",
    Icon: Brain,
    background: "radial-gradient(circle at 83% 19%, rgba(192,132,252,.4), transparent 26%), linear-gradient(135deg, #1e103f 0%, #312e81 55%, #4c1d95 100%)",
    accent: "#c084fc",
    foreground: "#faf5ff",
    muted: "#e9d5ff",
  },
  {
    code: "game_card_cardio",
    name: "Carte Cardiologie",
    rarity: "legendary",
    Icon: HeartPulse,
    background: "radial-gradient(circle at 85% 17%, rgba(251,113,133,.3), transparent 28%), linear-gradient(135deg, #431407 0%, #7f1d1d 55%, #9f1239 100%)",
    accent: "#fb7185",
    foreground: "#fff7ed",
    muted: "#fecdd3",
  },
  {
    code: "game_card_caduceus",
    name: "Carte Médecin d'or",
    rarity: "legendary",
    Icon: Stethoscope,
    background: "radial-gradient(circle at 84% 18%, rgba(251,191,36,.28), transparent 27%), linear-gradient(135deg, #18181b 0%, #3f2b10 54%, #713f12 100%)",
    accent: "#fbbf24",
    foreground: "#fffbeb",
    muted: "#fde68a",
  },
  {
    code: "game_card_pediatric",
    name: "Carte Pédiatrie",
    rarity: "mythic",
    Icon: Sparkles,
    background: "radial-gradient(circle at 86% 18%, rgba(103,232,249,.28), transparent 26%), linear-gradient(135deg, #ecfeff 0%, #cffafe 54%, #bae6fd 100%)",
    accent: "#0891b2",
    foreground: "#164e63",
    muted: "#0e7490",
  },
];

export function getProfileCard(code?: string | null): ProfileCardDefinition {
  return PROFILE_CARD_CATALOG.find((card) => card.code === code) ?? PROFILE_CARD_CATALOG[0];
}
