export const RARITIES = ["common", "rare", "epic", "legendary", "mythic"] as const;
export type Rarity = (typeof RARITIES)[number];

export const CHEST_TIERS = ["bronze", "silver", "gold", "legendary", "mythic"] as const;
export type ChestTier = (typeof CHEST_TIERS)[number];

export const SHOP_TABS = ["chests", "gems", "premium", "avatars", "cards", "badges"] as const;
export type ShopTab = (typeof SHOP_TABS)[number];

export type InventoryItemType =
  "chest" | "xp_boost" | "avatar" | "profile_card" | "badge" | "ticket";
export type RewardType = "xp" | "coins" | "gems" | "keys" | "tickets" | "energy" | "item";

export interface GameCurrency {
  coins: number;
  gems: number;
  keys: number;
  tickets: number;
  energy: number;
  energyMax: number;
}

export interface GameInventoryItem {
  id: string;
  itemCode: string;
  itemType: InventoryItemType;
  rarity: Rarity;
  quantity: number;
  metadata: Record<string, unknown>;
  acquiredAt: string;
  updatedAt: string;
}

export interface GameShopItem {
  code: string;
  type: string;
  name: string;
  description: string | null;
  priceCoins: number;
  priceGems: number;
  premiumOnly: boolean;
  rarity: Rarity;
  assetUrl: string | null;
  icon: string | null;
  active: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

export interface GameReward {
  type: RewardType;
  amount: number;
  itemCode?: string;
  itemType?: InventoryItemType;
  rarity?: Rarity;
  metadata?: Record<string, unknown>;
}

export interface ChestOpenResult {
  chestCode: string;
  tier: ChestTier;
  rewards: GameReward[];
  levelUp: { from: number; to: number } | null;
}

export const RARITY_META: Record<Rarity, { label: string; accent: string; surface: string }> = {
  common: { label: "Commun", accent: "var(--color-muted-foreground)", surface: "bg-secondary" },
  rare: { label: "Rare", accent: "var(--color-info)", surface: "bg-[color:var(--color-info)]/10" },
  epic: {
    label: "Épique",
    accent: "var(--color-primary)",
    surface: "bg-[color:var(--color-primary)]/10",
  },
  legendary: {
    label: "Légendaire",
    accent: "var(--color-warning)",
    surface: "bg-[color:var(--color-warning)]/10",
  },
  mythic: {
    label: "Mythique",
    accent: "var(--color-accent)",
    surface: "bg-[color:var(--color-accent)]/10",
  },
};

export const CHEST_META: Record<ChestTier, { label: string; rarity: Rarity; gradient: string }> = {
  bronze: {
    label: "Coffre Bronze",
    rarity: "common",
    gradient: "linear-gradient(135deg, #b96d35, #6e3518)",
  },
  silver: {
    label: "Coffre Argent",
    rarity: "rare",
    gradient: "linear-gradient(135deg, #e2e8f0, #64748b)",
  },
  gold: {
    label: "Coffre Or",
    rarity: "epic",
    gradient: "linear-gradient(135deg, #fbbf24, #b45309)",
  },
  legendary: {
    label: "Coffre Légendaire",
    rarity: "legendary",
    gradient: "linear-gradient(135deg, #fb7185, #9333ea)",
  },
  mythic: {
    label: "Coffre Mythique",
    rarity: "mythic",
    gradient: "linear-gradient(135deg, #ec4899, #4f46e5)",
  },
};
