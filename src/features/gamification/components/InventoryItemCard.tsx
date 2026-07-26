import { BadgeCheck, Box, Check, Clock3, Sparkles, Ticket, UserRound } from "lucide-react";
import type { GameInventoryItem } from "@/features/gamification/domain";
import { RARITY_META } from "@/features/gamification/domain";
import { RarityBadge } from "@/features/gamification/components/RarityBadge";
import { GameItemArtwork } from "@/features/gamification/components/GameItemArtwork";

const TYPE_META = {
  chest: { label: "Coffre", Icon: Box },
  xp_boost: { label: "Boost XP", Icon: Sparkles },
  avatar: { label: "Avatar", Icon: UserRound },
  profile_card: { label: "Carte de profil", Icon: Check },
  badge: { label: "Badge", Icon: BadgeCheck },
  ticket: { label: "Ticket", Icon: Ticket },
} as const;

export function InventoryItemCard({
  item,
  onOpen,
  onAction,
  actionLabel,
  equipped = false,
  busy = false,
}: {
  item: GameInventoryItem;
  onOpen?: (code: string) => void;
  onAction?: (item: GameInventoryItem) => void;
  actionLabel?: string;
  equipped?: boolean;
  busy?: boolean;
}) {
  const { Icon, label } = TYPE_META[item.itemType];
  const accent = RARITY_META[item.rarity].accent;
  const displayName = String(item.metadata.name ?? item.itemCode.replaceAll("_", " "));

  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-card p-3 shadow-[0_3px_0_0_var(--color-border)]">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{
            color: accent,
            backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`,
          }}
        >
          <GameItemArtwork
            code={item.itemCode}
            type={item.itemType}
            label={displayName}
            className="h-12 w-12"
            fallbackClassName="h-8 w-8 object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-sm font-extrabold">{displayName}</div>
            {item.quantity > 1 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-extrabold tabular-nums">
                x{item.quantity}
              </span>
            )}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <Icon className="h-3 w-3" />
            {label}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <RarityBadge rarity={item.rarity} />
            {item.itemType === "chest" ? (
              <button
                type="button"
                onClick={() => onOpen?.(item.itemCode)}
                className="rounded-lg bg-[color:var(--color-primary)] px-2.5 py-1 text-[10px] font-extrabold uppercase text-primary-foreground"
              >
                Ouvrir
              </button>
            ) : onAction ? (
              <button
                type="button"
                disabled={busy || equipped}
                onClick={() => onAction(item)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase ${equipped ? "bg-emerald-500 text-white" : "bg-[color:var(--color-primary)] text-primary-foreground"} disabled:opacity-60`}
              >
                {equipped ? "Équipé" : actionLabel ?? "Équiper"}
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
