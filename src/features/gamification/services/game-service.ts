import { supabase } from "@/integrations/supabase/client";
import type {
  ChestOpenResult,
  GameCurrency,
  GameInventoryItem,
  GameShopItem,
} from "@/features/gamification/domain";

type CurrencyRow = {
  coins: number;
  gems: number;
  keys: number;
  tickets: number;
  energy: number;
  energy_max: number;
};
type InventoryRow = {
  id: string;
  item_code: string;
  item_type: GameInventoryItem["itemType"];
  rarity: GameInventoryItem["rarity"];
  quantity: number;
  metadata: Record<string, unknown> | null;
  acquired_at: string;
  updated_at: string;
};
type ShopRow = {
  code: string;
  type: string;
  name: string;
  description: string | null;
  price_coins: number;
  price_gems: number;
  premium_only: boolean;
  rarity: GameShopItem["rarity"];
  asset_url: string | null;
  icon: string | null;
  active: boolean;
  sort_order: number;
  metadata: Record<string, unknown> | null;
};

export async function fetchGameCurrency(): Promise<GameCurrency> {
  const { data, error } = await supabase
    .from("user_currency" as never)
    .select("coins, gems, keys, tickets, energy, energy_max")
    .maybeSingle();
  if (error) throw error;
  const row = data as unknown as CurrencyRow | null;
  return {
    coins: row?.coins ?? 0,
    gems: row?.gems ?? 0,
    keys: row?.keys ?? 0,
    tickets: row?.tickets ?? 0,
    energy: row?.energy ?? 5,
    energyMax: row?.energy_max ?? 5,
  };
}

export async function fetchGameInventory(): Promise<GameInventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory" as never)
    .select("id, item_code, item_type, rarity, quantity, metadata, acquired_at, updated_at")
    .gt("quantity", 0)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as InventoryRow[]).map((row) => ({
    id: row.id,
    itemCode: row.item_code,
    itemType: row.item_type,
    rarity: row.rarity,
    quantity: row.quantity,
    metadata: row.metadata ?? {},
    acquiredAt: row.acquired_at,
    updatedAt: row.updated_at,
  }));
}

export async function fetchGameShop(): Promise<GameShopItem[]> {
  const { data, error } = await supabase
    .from("shop_items" as never)
    .select(
      "code, type, name, description, price_coins, price_gems, premium_only, rarity, asset_url, icon, active, sort_order, metadata",
    )
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return ((data ?? []) as unknown as ShopRow[]).map((row) => ({
    code: row.code,
    type: row.type,
    name: row.name,
    description: row.description,
    priceCoins: row.price_coins,
    priceGems: row.price_gems,
    premiumOnly: row.premium_only,
    rarity: row.rarity,
    assetUrl: row.asset_url,
    icon: row.icon,
    active: row.active,
    sortOrder: row.sort_order,
    metadata: row.metadata ?? {},
  }));
}

export async function purchaseGameChest(itemCode: string) {
  const { data, error } = await supabase.rpc(
    "purchase_game_item" as never,
    { _item_code: itemCode } as never,
  );
  if (error) throw error;
  return data;
}

export async function openGameChest(chestCode: string): Promise<ChestOpenResult> {
  const { data, error } = await supabase.rpc(
    "open_game_chest" as never,
    { _chest_code: chestCode } as never,
  );
  if (error) throw error;
  return data as unknown as ChestOpenResult;
}
