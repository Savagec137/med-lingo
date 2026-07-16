// Premium AI-generated assets. Falls back to Lucide icons via icon-map when missing.
import stethoscope from "@/assets/avatar-stethoscope.png";
import ambulance from "@/assets/avatar-ambulance.png";
import heart from "@/assets/avatar-heart.png";
import brain from "@/assets/avatar-brain.png";
import chestBronze from "@/assets/chest-bronze.png";
import chestLegendary from "@/assets/chest-legendary.png";
import badgeGold from "@/assets/badge-gold.png";
import premiumCrown from "@/assets/premium-crown.png";

export const SHOP_IMAGE: Record<string, string> = {
  av_stethoscope: stethoscope,
  av_ambulance: ambulance,
  av_heart: heart,
  av_brain: brain,
  chest_small: chestBronze,
  chest_big: chestLegendary,
  chest_epic: chestLegendary,
  fr_gold: badgeGold,
  fr_diamond: premiumCrown,
  av_crown: premiumCrown,
};

export const CHEST_IMAGE: Record<string, string> = {
  bronze: chestBronze,
  silver: chestBronze,
  gold: chestLegendary,
  epic: chestLegendary,
  legendary: chestLegendary,
  mythique: chestLegendary,
  mythic: chestLegendary,
};

export const PREMIUM_CROWN = premiumCrown;
export const BADGE_GOLD = badgeGold;
