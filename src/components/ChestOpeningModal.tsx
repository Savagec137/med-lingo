import { GameChestDialog } from "@/features/gamification/components/GameChestDialog";
import type { ChestOpenResult, ChestTier as GameChestTier, GameReward } from "@/features/gamification/domain";
import type { ChestResult, ChestTier, LootItem } from "@/lib/use-chest";

const LEGACY_TIER_MAP: Record<ChestTier, GameChestTier> = {
  bronze: "bronze",
  silver: "silver",
  gold: "gold",
  epic: "legendary",
  mythic: "mythic",
};

function toGameRewards(loot: LootItem[]): GameReward[] {
  return loot.map((item, index) => {
    if (item.type === "cosmetic") {
      return {
        type: "item",
        amount: 1,
        itemCode: `legacy_cosmetic_${item.rarity}_${index}`,
        itemType: "badge",
        rarity: item.rarity,
        metadata: { name: `Objet ${item.rarity}` },
      };
    }

    return { type: item.type, amount: item.amount };
  });
}

function toGameChestResult(result: ChestResult | null): ChestOpenResult | null {
  if (!result) return null;

  return {
    chestCode: `legacy_${result.source}_${result.tier}`,
    tier: LEGACY_TIER_MAP[result.tier],
    rewards: toGameRewards(result.loot),
    levelUp: null,
  };
}

// Les coffres historiques et les nouveaux coffres partagent la même séquence d'ouverture 3D.
export function ChestOpeningModal({ result, onClose }: { result: ChestResult | null; onClose: () => void }) {
  return <GameChestDialog result={toGameChestResult(result)} onClose={onClose} />;
}
