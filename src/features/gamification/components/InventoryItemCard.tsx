import { BadgeCheck, Box, ChevronRight, Clock3, Sparkles, Ticket, UserRound } from "lucide-react";
import type { GameInventoryItem } from "@/features/gamification/domain";
import { RARITY_META } from "@/features/gamification/domain";
import { RarityBadge } from "@/features/gamification/components/RarityBadge";

const TYPE_META = {
  chest: { label: "Coffre", Icon: Box },
  xp_boost: { label: "Boost XP", Icon: Sparkles },
  avatar: { label: "Avatar", Icon: UserRound },
  profile_card: { label: "Carte de profil", Icon: ChevronRight },
  badge: { label: "Badge", Icon: BadgeCheck },
  ticket: { label: "Ticket", Icon: Ticket },
} as const;

export function InventoryItemCard({
  item,
  onOpen,
}: {
  item: GameInventoryItem;
  onOpen?: (code: string) => void;
}) {
  const { Icon, label } = TYPE_META[item.itemType];
  const accent = RARITY_META[item.rarity].accent;
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-card p-3 shadow-[0_3px_0_0_var(--color-border)]">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: accent,
            backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`,
          }}
        >
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-sm font-extrabold">
              {String(item.metadata.name ?? item.itemCode.replaceAll("_", " "))}
            </div>
            {item.quantity > 1 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-extrabold tabular-nums">
                x{item.quantity}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <RarityBadge rarity={item.rarity} />
            {item.itemType === "chest" ? (
              <button
                onClick={() => onOpen?.(item.itemCode)}
                className="rounded-lg bg-[color:var(--color-primary)] px-2.5 py-1 text-[10px] font-extrabold uppercase text-primary-foreground"
              >
                Ouvrir
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock3 className="h-3 w-3" /> Collection
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
