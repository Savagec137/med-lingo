import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

export interface Wallet {
  coins: number;
  gems: number;
  keys: number;
  energy: number;
  energy_max: number;
  energy_updated_at: string;
}

export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id ?? "anon"],
    enabled: !!user,
    refetchInterval: 60_000, // refresh so energy regen visible
    queryFn: async (): Promise<Wallet> => {
      const { data, error } = await supabase
        .from("wallets" as never)
        .select("coins, gems, keys, energy, energy_max, energy_updated_at")
        .maybeSingle();
      if (error) throw error;
      const row = data as unknown as Wallet | null;
      return (
        row ?? {
          coins: 0, gems: 0, keys: 0,
          energy: 5, energy_max: 5,
          energy_updated_at: new Date().toISOString(),
        }
      );
    },
  });
}

export async function awardCoins(amount: number, source: string, reference?: string) {
  const { data, error } = await supabase.rpc("award_coins" as never, {
    _amount: amount, _source: source, _reference: reference ?? null,
  } as never);
  if (error) throw error;
  return data as unknown as number;
}

export async function awardGems(amount: number, source: string, reference?: string) {
  const { data, error } = await supabase.rpc("award_gems" as never, {
    _amount: amount, _source: source, _reference: reference ?? null,
  } as never);
  if (error) throw error;
  return data as unknown as number;
}

export async function awardKeys(amount: number, source: string, reference?: string) {
  const { data, error } = await supabase.rpc("award_keys" as never, {
    _amount: amount, _source: source, _reference: reference ?? null,
  } as never);
  if (error) throw error;
  return data as unknown as number;
}

export async function spendEnergy(amount: number, reason: string) {
  const { data, error } = await supabase.rpc("spend_energy" as never, {
    _amount: amount, _reason: reason,
  } as never);
  if (error) throw error;
  return data as unknown as number;
}

export async function regenEnergy() {
  const { data, error } = await supabase.rpc("regen_energy" as never, {} as never);
  if (error) throw error;
  return data as unknown as number;
}

  const { data, error } = await supabase.rpc("award_coins" as never, {
    _amount: amount,
    _source: source,
    _reference: reference ?? null,
  } as never);
  if (error) throw error;
  return data as unknown as number;
}

export async function purchaseItem(itemCode: string) {
  const { data, error } = await supabase.rpc("purchase_item" as never, {
    _item_code: itemCode,
  } as never);
  if (error) throw error;
  return data;
}

export function useInvalidateWallet() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
  };
}

export interface InventoryItem {
  item_code: string;
  equipped: boolean;
  acquired_at: string;
}

export function useInventory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["inventory", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_inventory" as never)
        .select("item_code, equipped, acquired_at");
      if (error) throw error;
      return (data ?? []) as unknown as InventoryItem[];
    },
  });
}

export interface ShopItem {
  code: string;
  type: "avatar" | "frame" | "background" | "badge" | "booster" | "chest" | "title";
  name: string;
  description: string | null;
  price_coins: number;
  price_gems: number;
  premium_only: boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
  icon: string | null;
  asset_url: string | null;
  sort_order: number;
}

export function useShopCatalog() {
  return useQuery({
    queryKey: ["shop_catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_items" as never)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as ShopItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export async function equipItem(itemCode: string, type: string) {
  // Un seul item équipé par type
  await supabase
    .from("user_inventory" as never)
    .update({ equipped: false } as never)
    .eq("equipped", true);
  const { error } = await supabase
    .from("user_inventory" as never)
    .update({ equipped: true } as never)
    .eq("item_code", itemCode);
  if (error) throw error;
  return { itemCode, type };
}
