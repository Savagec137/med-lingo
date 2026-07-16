import type { ReactNode } from "react";
import shopArtworkSheet from "@/assets/shop-artwork-sheet.png";

type Sprite = { x: number; y: number };

// Positions are intentionally centralised: replacing the temporary illustration sheet
// later only requires updating this map, not every shop screen.
const SPRITES: Record<string, Sprite> = {
  badge_first_care: { x: 48, y: 58 },
  badge_defibrillator: { x: 296, y: 58 },
  badge_pulse_elite: { x: 536, y: 58 },
  game_badge_precision: { x: 782, y: 58 },
  game_badge_guardian: { x: 1032, y: 58 },

  frame_bronze: { x: 45, y: 270 },
  fr_bronze: { x: 45, y: 270 },
  frame_silver: { x: 211, y: 270 },
  fr_silver: { x: 211, y: 270 },
  frame_gold: { x: 377, y: 270 },
  fr_gold: { x: 377, y: 270 },
  frame_neon: { x: 542, y: 270 },
  bg_hospital: { x: 762, y: 270 },
  bg_anatomy: { x: 928, y: 270 },
  bg_ambulance: { x: 1094, y: 270 },
  bg_operating_room: { x: 1260, y: 270 },
  bg_premium_aurora: { x: 1425, y: 270 },
  bg_aurora: { x: 1425, y: 270 },
  bg_xray: { x: 928, y: 270 },

  avatar_student: { x: 39, y: 535 },
  avatar_nurse: { x: 205, y: 535 },
  avatar_paramedic: { x: 372, y: 535 },
  avatar_doctor: { x: 538, y: 535 },
  avatar_surgeon: { x: 705, y: 535 },
  avatar_samu: { x: 871, y: 535 },
  avatar_professor: { x: 1038, y: 535 },
  av_stethoscope: { x: 1205, y: 535 },
  av_ambulance: { x: 1372, y: 535 },
};

const SCALE = 0.62;
const SHEET_WIDTH = 1680;
const SHEET_HEIGHT = 940;

type ShopItemArtworkProps = {
  code: string;
  fallback: ReactNode;
};

export function ShopItemArtwork({ code, fallback }: ShopItemArtworkProps) {
  const sprite = SPRITES[code];

  if (!sprite) return <>{fallback}</>;

  return (
    <span
      aria-hidden="true"
      className="h-20 w-20 shrink-0 rounded-2xl"
      style={{
        backgroundImage: `url(${shopArtworkSheet})`,
        backgroundPosition: `${-sprite.x * SCALE}px ${-sprite.y * SCALE}px`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${SHEET_WIDTH * SCALE}px ${SHEET_HEIGHT * SCALE}px`,
      }}
    />
  );
}
