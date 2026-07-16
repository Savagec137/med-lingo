import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, Check, Coins, Crown, Gem, Lock, PackageOpen, Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PREMIUM_CROWN, SHOP_IMAGE } from "@/lib/asset-map";
import { ShopItemIcon } from "@/lib/icon-map";
import { useAuth } from "@/lib/use-auth";
import {
  equipItem,
  purchaseItem,
  type ShopItem,
  useInventory,
  useInvalidateWallet,
  useShopCatalog,
  useWallet,
} from "@/lib/use-wallet";
import { useGameChests } from "@/features/gamification/hooks/use-game-chests";

export const Route = createFileRoute("/boutique")({ component: Boutique });

type Tab = "coffres" | "gemmes" | "premium" | "avatars" | "cartes" | "badges";
const TABS: { id: Tab; label: string }[] = [
  { id: "coffres", label: "Coffres" },
  { id: "gemmes", label: "Gemmes" },
  { id: "premium", label: "Premium" },
  { id: "avatars", label: "Avatars" },
  { id: "cartes", label: "Cartes" },
  { id: "badges", label: "Badges" },
];
const RARITY_STYLES: Record<string, string> = {
  common: "border-slate-300 bg-slate-50 text-slate-700",
  rare: "border-sky-400 bg-sky-50 text-sky-700",
  epic: "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700",
  legendary: "border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100 text-amber-800",
  mythic: "border-pink-400 bg-gradient-to-br from-pink-50 to-violet-100 text-pink-800",
};

function Boutique() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("coffres");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data: catalog = [] } = useShopCatalog();
  const { data: wallet } = useWallet();
  const { data: inventory = [] } = useInventory();
  const invalidate = useInvalidateWallet();
  const gameChests = useGameChests();
  const owned = new Set(inventory.map((item) => item.item_code));
  const equipped = new Set(inventory.filter((item) => item.equipped).map((item) => item.item_code));

  const items = catalog.filter((item) => {
    if (tab === "coffres") return item.type === "chest" && item.code.startsWith("game_chest_");
    if (tab === "gemmes") return item.type === "gem_pack";
    if (tab === "avatars") return item.type === "avatar";
    if (tab === "cartes")
      return ["frame", "background", "profile_card", "title"].includes(item.type);
    if (tab === "badges") return item.type === "badge";
    return false;
  });

  async function buy(item: ShopItem) {
    if (!user) return;
    setBusy(item.code);
    setMessage(null);
    try {
      if (item.code.startsWith("game_chest_")) await gameChests.purchase(item.code);
      else await purchaseItem(item.code);
      invalidate();
      setMessage(`${item.name} a été ajouté à ton inventaire.`);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Erreur";
      setMessage(
        raw.includes("insufficient")
          ? "Tu n'as pas assez de ressources."
          : raw.includes("premium")
            ? "Cet objet requiert Premium."
            : raw,
      );
    } finally {
      setBusy(null);
    }
  }

  async function equip(item: ShopItem) {
    setBusy(item.code);
    try {
      await equipItem(item.code, item.type);
      invalidate();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
              Économie MedLingo
            </p>
            <h1 className="font-display text-3xl font-extrabold">Boutique</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisis des récompenses utiles à ta progression.
            </p>
          </div>
          <Link
            to="/inventaire"
            className="shrink-0 rounded-xl border border-[color:var(--color-primary)]/40 bg-[color:var(--color-primary)]/10 px-3 py-2 text-xs font-extrabold text-[color:var(--color-primary)]"
          >
            Inventaire
          </Link>
        </header>
        <section className="mb-5 flex gap-2">
          <Balance
            icon={<Coins className="h-4 w-4" />}
            value={wallet?.coins ?? 0}
            color="var(--color-warning)"
          />
          <Balance
            icon={<Gem className="h-4 w-4" />}
            value={wallet?.gems ?? 0}
            color="var(--color-accent)"
          />
        </section>
        {!user && (
          <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">
            <Link to="/auth" className="font-bold text-[color:var(--color-primary)] underline">
              Connecte-toi
            </Link>{" "}
            pour conserver tes achats et tes récompenses.
          </div>
        )}
        <nav className="mb-5 flex gap-1 overflow-x-auto rounded-full bg-secondary p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition ${tab === id ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        {message && (
          <div className="mb-4 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold">
            {message}
          </div>
        )}
        {tab === "premium" ? (
          <PremiumPanel />
        ) : tab === "gemmes" ? (
          <GemPanel items={items} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <ShopCard
                key={item.code}
                item={item}
                owned={owned.has(item.code)}
                equipped={equipped.has(item.code)}
                busy={busy === item.code || gameChests.busy}
                canAfford={
                  (wallet?.coins ?? 0) >= item.price_coins && (wallet?.gems ?? 0) >= item.price_gems
                }
                onBuy={buy}
                onEquip={equip}
                onPremium={() => setTab("premium")}
              />
            ))}
            {!items.length && (
              <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Les prochains objets arriveront bientôt.
              </div>
            )}
          </div>
        )}
        {gameChests.error && (
          <p className="mt-4 text-center text-xs font-bold text-destructive">{gameChests.error}</p>
        )}
      </main>
    </div>
  );
}

function Balance({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-white/10 bg-card px-3 py-1.5 text-sm font-extrabold"
      style={{ color }}
    >
      {icon}
      <span className="tabular-nums">{value.toLocaleString("fr-FR")}</span>
    </div>
  );
}

function ShopCard({
  item,
  owned,
  equipped,
  busy,
  canAfford,
  onBuy,
  onEquip,
  onPremium,
}: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  busy: boolean;
  canAfford: boolean;
  onBuy: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
  onPremium: () => void;
}) {
  return (
    <article className={`relative rounded-2xl border-2 p-3 ${RARITY_STYLES[item.rarity]}`}>
      {item.premium_only && (
        <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
          PREMIUM
        </span>
      )}
      <div className="mb-2 flex h-20 items-center justify-center text-[color:var(--color-primary)]">
        {SHOP_IMAGE[item.code] ? (
          <img src={SHOP_IMAGE[item.code]} alt="" className="h-20 w-20 object-contain" />
        ) : (
          <ShopItemIcon code={item.code} type={item.type} className="h-9 w-9" strokeWidth={2.25} />
        )}
      </div>
      <div className="text-sm font-extrabold leading-tight">{item.name}</div>
      <div className="mb-3 mt-1 line-clamp-2 text-[11px] opacity-70">{item.description}</div>
      {item.code.startsWith("game_chest_") ? (
        <button
          disabled={busy || !canAfford}
          onClick={() => onBuy(item)}
          className="flex w-full items-center justify-center gap-1 rounded-full bg-[color:var(--color-primary)] px-2 py-1.5 text-xs font-extrabold text-primary-foreground disabled:opacity-40"
        >
          <PackageOpen className="h-3 w-3" />
          {item.price_gems ? (
            <>
              <Gem className="h-3 w-3" />
              {item.price_gems}
            </>
          ) : (
            <>
              <Coins className="h-3 w-3" />
              {item.price_coins}
            </>
          )}
        </button>
      ) : owned ? (
        <button
          disabled={busy || equipped}
          onClick={() => onEquip(item)}
          className={`w-full rounded-full px-2 py-1.5 text-xs font-extrabold ${equipped ? "bg-emerald-500 text-white" : "bg-foreground text-background"}`}
        >
          {equipped ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3" />
              Équipé
            </span>
          ) : (
            "Équiper"
          )}
        </button>
      ) : item.premium_only ? (
        <button
          onClick={onPremium}
          className="w-full rounded-full bg-amber-500 px-2 py-1.5 text-xs font-extrabold text-white"
        >
          <Lock className="mr-1 inline h-3 w-3" />
          Premium
        </button>
      ) : (
        <button
          disabled={busy || !canAfford}
          onClick={() => onBuy(item)}
          className="flex w-full items-center justify-center gap-1 rounded-full bg-[color:var(--color-primary)] px-2 py-1.5 text-xs font-extrabold text-primary-foreground disabled:opacity-40"
        >
          {item.price_gems ? (
            <>
              <Gem className="h-3 w-3" />
              {item.price_gems}
            </>
          ) : (
            <>
              <Coins className="h-3 w-3" />
              {item.price_coins || "Gratuit"}
            </>
          )}
        </button>
      )}
    </article>
  );
}

function GemPanel({ items }: { items: ShopItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.code}
          className="rounded-3xl border-2 border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10 p-5"
        >
          <Gem className="h-9 w-9 text-[color:var(--color-accent)]" />
          <h2 className="mt-3 font-display text-xl font-extrabold">{item.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          <button
            disabled
            className="mt-4 w-full rounded-xl bg-[color:var(--color-accent)] py-2.5 text-sm font-extrabold text-primary-foreground opacity-70"
          >
            Paiement bientôt disponible
          </button>
        </article>
      ))}
      {!items.length && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Les packs de gemmes seront activés avec Stripe.
        </div>
      )}
    </div>
  );
}

function PremiumPanel() {
  return (
    <section className="rounded-3xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-6 shadow-lg">
      <div className="flex items-center gap-3">
        <img
          src={PREMIUM_CROWN}
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 object-contain"
        />
        <div>
          <h2 className="font-display text-2xl font-extrabold">MedLingo Premium</h2>
          <p className="text-sm text-muted-foreground">Le socle commerce est prêt pour Stripe.</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        <li className="flex gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          Contenu avancé et personnalisation exclusive
        </li>
        <li className="flex gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          Coffres et récompenses améliorés
        </li>
        <li className="flex gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          Paiement sécurisé à intégrer dans un prochain sprint
        </li>
      </ul>
      <button
        disabled
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-extrabold text-white opacity-75"
      >
        <Crown className="h-4 w-4" />
        Bientôt disponible
      </button>
    </section>
  );
}
