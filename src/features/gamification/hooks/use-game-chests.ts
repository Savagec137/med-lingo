import { useCallback, useState } from "react";
import type { ChestOpenResult } from "@/features/gamification/domain";
import { openGameChest, purchaseGameChest } from "@/features/gamification/services/game-service";
import { useInvalidateGameEconomy } from "@/features/gamification/hooks/use-game-inventory";

export function useGameChests() {
  const invalidate = useInvalidateGameEconomy();
  const [result, setResult] = useState<ChestOpenResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const purchase = useCallback(
    async (itemCode: string) => {
      setBusy(true);
      setError(null);
      try {
        await purchaseGameChest(itemCode);
        invalidate();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible d'acheter ce coffre.");
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [invalidate],
  );
  const open = useCallback(
    async (chestCode: string) => {
      setBusy(true);
      setError(null);
      try {
        const opened = await openGameChest(chestCode);
        setResult(opened);
        invalidate();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible d'ouvrir ce coffre.");
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [invalidate],
  );
  return { result, busy, error, purchase, open, close: () => setResult(null) };
}
