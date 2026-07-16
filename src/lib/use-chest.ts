import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export type LootItem =
  | { type: "coins" | "gems" | "keys"; amount: number }
  | { type: "cosmetic"; rarity: "common" | "rare" | "epic" | "legendary" };

export type ChestTier = "bronze" | "silver" | "gold" | "epic" | "mythic";

export interface ChestResult {
  tier: ChestTier;
  loot: LootItem[];
  source: string;
}

export function useChest() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<ChestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
  };

  const openChest = useCallback(async (tier: ChestTier, source = "shop") => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const { data, error } = await supabase.rpc("open_chest" as never, { _tier: tier, _source: source } as never);
      if (error) throw error;
      const res = data as unknown as { tier: ChestTier; loot: LootItem[] };
      setPending({ tier: res.tier, loot: res.loot ?? [], source });
      invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally { setBusy(false); }
  }, [busy]);

  const claimCompensation = useCallback(async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const { data, error } = await supabase.rpc("claim_compensation_chest" as never, {} as never);
      if (error) throw error;
      const res = data as unknown as { tier: ChestTier; loot: LootItem[] };
      setPending({ tier: res.tier, loot: res.loot ?? [], source: "compensation" });
      invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "cooldown");
    } finally { setBusy(false); }
  }, [busy]);

  const close = () => setPending(null);

  return { pending, error, busy, openChest, claimCompensation, close };
}
