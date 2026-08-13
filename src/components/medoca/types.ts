import type { ComponentType, SVGProps } from "react";

export type MedocaIcon = ComponentType<SVGProps<SVGSVGElement>>;

export const MEDOCA_RARITIES = ["common", "rare", "epic", "legendary", "mythic"] as const;

export type MedocaRarity = (typeof MEDOCA_RARITIES)[number];

export type MedocaTone = "cyan" | "emerald" | "gold" | "violet" | "rose" | "neutral";

export type CurrencyKind = "coins" | "gems";

export interface MedocaNavItem {
  id: string;
  label: string;
  icon: MedocaIcon;
  badge?: string | number;
  disabled?: boolean;
}
