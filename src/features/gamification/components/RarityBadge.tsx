import type { Rarity } from "@/features/gamification/domain";
import { RARITY_META } from "@/features/gamification/domain";

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const meta = RARITY_META[rarity];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em]"
      style={{
        color: meta.accent,
        backgroundColor: `color-mix(in oklab, ${meta.accent} 13%, transparent)`,
      }}
    >
      {meta.label}
    </span>
  );
}
