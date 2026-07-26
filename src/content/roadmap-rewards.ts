import { supabase } from "@/integrations/supabase/client";
import type { RoadmapParcours } from "./roadmap-domain.ts";

const SUPPORTED_CHESTS = new Set(["bronze", "silver", "gold", "legendary", "mythic"]);

function stableCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

async function alreadyGranted(reference: string) {
  const { data } = await supabase
    .from("reward_history" as never)
    .select("id")
    .eq("source", "roadmap_boss")
    .eq("reference", reference)
    .limit(1);
  return ((data ?? []) as unknown[]).length > 0;
}

async function grantItem(
  reference: string,
  reward: {
    itemCode: string;
    itemType: "badge" | "chest";
    rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
    name: string;
  },
) {
  if (await alreadyGranted(reference)) return;
  const { error } = await supabase.rpc(
    "grant_game_reward" as never,
    {
      _reward: {
        type: "item",
        amount: 1,
        item_code: reward.itemCode,
        item_type: reward.itemType,
        rarity: reward.rarity,
        metadata: { name: reward.name },
      },
      _source: "roadmap_boss",
      _reference: reference,
    } as never,
  );
  if (error) throw error;
}

export async function grantRoadmapBossRewards(parcours: RoadmapParcours) {
  const grants: Promise<void>[] = [];
  if (parcours.badge) {
    grants.push(
      grantItem(`${parcours.bossId}:badge`, {
        itemCode: `roadmap_badge_${stableCode(parcours.badge)}`,
        itemType: "badge",
        rarity: parcours.stage === "advanced" ? "rare" : "common",
        name: parcours.badge,
      }),
    );
  }
  if (parcours.chest && SUPPORTED_CHESTS.has(parcours.chest)) {
    const rarity = {
      bronze: "common",
      silver: "rare",
      gold: "epic",
      legendary: "legendary",
      mythic: "mythic",
    }[parcours.chest] as "common" | "rare" | "epic" | "legendary" | "mythic";
    grants.push(
      grantItem(`${parcours.bossId}:chest`, {
        itemCode: `game_chest_${parcours.chest}`,
        itemType: "chest",
        rarity,
        name: `Coffre ${parcours.chest}`,
      }),
    );
  }
  await Promise.all(grants);
}
