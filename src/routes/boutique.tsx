import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Check,
  Coins,
  Crown,
  Gem,
  Gift,
  Lock,
  PackageOpen,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PREMIUM_CROWN } from "@/lib/asset-map";
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
import {
  useGameInventory,
  useInvalidateGameEconomy,
} from "@/features/gamification/hooks/use-game-inventory";
import { useProfileCard } from "@/features/gamification/hooks/use-profile-card";
import { useProfileCosmetics } from "@/features/gamification/hooks/use-profile-cosmetics";
import { GameItemArtwork } from "@/features/gamification/components/GameItemArtwork";
import type { ProfileCardCode } from "@/features/gamification/domain/profile-cards";
import { APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/boutique")({ component: Boutique });

type Tab = "coffres" | "gemmes" | "premium" | "avatars" | "cartes" | "badges";
const TABS: { id: Tab; label: string; icon: typeof PackageOpen }[] = [
  { id: "coffres", label: "Coffres", icon: PackageOpen },
  { id: "gemmes", label: "Gemmes", icon: Gem },
  { id: "premium", label: "Premium", icon: Crown },
  { id: "avatars", label: "Avatars", icon: UserRound },
  { id: "cartes", label: "Cartes", icon: Sparkles },
  { id: "badges", label: "Badges", icon: BadgeCheck },
];
const RARITY_STYLES: Record<string, string> = {
  common: "border-slate-500/35 bg-gradient-to-br from-slate-800 to-slate-950 text-slate-100",
  rare: "border-sky-400/55 bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 text-sky-100",
  epic: "border-fuchsia-400/55 bg-gradient-to-br from-fuchsia-950 via-slate-900 to-slate-950 text-fuchsia-100",
  legendary:
    "border-amber-400/65 bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 text-amber-100",
  mythic:
    "border-pink-400/65 bg-gradient-to-br from-violet-950 via-slate-900 to-pink-950 text-pink-100",
};
const RARITY_LABELS: Record<string, string> = {
  common: "Commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
  mythic: "Mythique",
};

function Boutique() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("coffres");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data: catalog = [] } = useShopCatalog();
  const { data: wallet } = useWallet();
  const { data: inventory = [] } = useInventory();
  const { data: gameInventory = [] } = useGameInventory();
  const invalidateWallet = useInvalidateWallet();
  const invalidateGameEconomy = useInvalidateGameEconomy();
  const gameChests = useGameChests();
  const profileCard = useProfileCard();
  const profileCosmetics = useProfileCosmetics();

  const owned = useMemo(() => {
    const codes = new Set<string>();
    for (const item of inventory) codes.add(item.item_code);
    for (const item of gameInventory) codes.add(item.itemCode);
    return codes;
  }, [inventory, gameInventory]);

  const equipped = useMemo(() => {
    const codes = new Set(inventory.filter((item) => item.equipped).map((item) => item.item_code));
    if (profileCard.data) codes.add(profileCard.data);
    if (profileCosmetics.avatarCode) codes.add(profileCosmetics.avatarCode);
    if (profileCosmetics.badgeCode) codes.add(profileCosmetics.badgeCode);
    return codes;
  }, [inventory, profileCard.data, profileCosmetics.avatarCode, profileCosmetics.badgeCode]);

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
      if (item.code.startsWith("game_chest_")) {
        await gameChests.purchase(item.code);
      } else {
        await purchaseItem(item.code);
      }
      invalidateWallet();
      invalidateGameEconomy();
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
    setMessage(null);
    try {
      if (item.type === "avatar") {
        profileCosmetics.equipAvatar(item.code);
        setMessage(`${item.name} est maintenant ton avatar actif.`);
      } else if (item.type === "badge") {
        profileCosmetics.equipBadge(item.code);
        setMessage(`${item.name} est maintenant affiché sur ton profil.`);
      } else if (item.type === "profile_card") {
        await profileCard.equip(item.code as ProfileCardCode);
        setMessage(`${item.name} est maintenant ta carte active.`);
      } else {
        await equipItem(item.code, item.type);
        invalidateWallet();
        setMessage(`${item.name} a été activé.`);
      }
      invalidateGameEconomy();
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
              Économie {APP_NAME}
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
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition ${tab === id ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
        {tab === "coffres" && <PremiumShopHero />}
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
                busy={busy === item.code || gameChests.busy || profileCard.isEquipping}
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

function PremiumShopHero() {
  return (
    <section className="relative mb-5 overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-slate-950 via-[#0b1630] to-cyan-950 p-5 text-white shadow-[0_20px_55px_rgba(6,182,212,0.12)]">
      <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="relative grid gap-5 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            Collection premium
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">
            Ouvre, collectionne,
            <span className="block bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
              personnalise ton profil.
            </span>
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
            Chaque rareté propose des récompenses adaptées, sans bonus artificiels qui
            déséquilibrent ta progression.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <HeroPill icon={<Gift className="h-3.5 w-3.5" />} label="5 raretés" />
            <HeroPill
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="Récompenses équilibrées"
            />
          </div>
        </div>
        <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="absolute inset-4 rounded-[1.5rem] border border-cyan-300/15" />
          <PackageOpen
            className="h-16 w-16 text-cyan-300 drop-shadow-[0_0_24px_rgba(34,211,238,0.55)]"
            strokeWidth={1.4}
          />
          <span className="absolute -right-2 top-3 rounded-full border border-violet-300/25 bg-violet-400/20 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-violet-200">
            À ouvrir
          </span>
        </div>
      </div>
    </section>
  );
}

function HeroPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-slate-200">
      {icon}
      {label}
    </span>
  );
}

function Balance({ icon, value, color }: { icon: ReactNode; value: number; color: string }) {
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
    <article
      className={`group relative overflow-hidden rounded-3xl border p-3.5 shadow-[0_14px_32px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_38px_rgba(0,0,0,0.24)] ${RARITY_STYLES[item.rarity]}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-current opacity-[0.08] blur-2xl" />
      {item.premium_only && (
        <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
          PREMIUM
        </span>
      )}
      <div className="relative mb-1 flex items-center justify-between">
        <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/65">
          {RARITY_LABELS[item.rarity] ?? item.rarity}
        </span>
      </div>
      <div className="relative mb-2 flex h-24 items-center justify-center text-cyan-300 transition-transform duration-300 group-hover:scale-110">
        <GameItemArtwork
          code={item.code}
          type={item.type}
          label={item.name}
          className="h-24 w-24"
          fallbackClassName="h-24 w-24 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.38)]"
        />
      </div>
      <div className="relative text-sm font-extrabold leading-tight text-white">{item.name}</div>
      <div className="relative mb-3 mt-1 min-h-8 line-clamp-2 text-[11px] leading-relaxed text-white/55">
        {item.description}
      </div>
      {item.code.startsWith("game_chest_") ? (
        <button
          type="button"
          disabled={busy || !canAfford}
          onClick={() => onBuy(item)}
          className="relative flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-2 py-2 text-xs font-extrabold text-slate-950 shadow-[0_7px_18px_rgba(34,211,238,0.2)] disabled:opacity-40"
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
          type="button"
          disabled={busy || equipped}
          onClick={() => onEquip(item)}
          className={`relative w-full rounded-xl px-2 py-2 text-xs font-extrabold ${equipped ? "bg-emerald-500 text-white" : "bg-white text-slate-950"}`}
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
          type="button"
          onClick={onPremium}
          className="relative w-full rounded-xl bg-amber-500 px-2 py-2 text-xs font-extrabold text-slate-950"
        >
          <Lock className="mr-1 inline h-3 w-3" />
          Premium
        </button>
      ) : (
        <button
          type="button"
          disabled={busy || !canAfford}
          onClick={() => onBuy(item)}
          className="relative flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-2 py-2 text-xs font-extrabold text-slate-950 disabled:opacity-40"
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
          className="rounded-3xl border border-violet-400/35 bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 p-5 text-white shadow-[0_16px_38px_rgba(0,0,0,0.2)]"
        >
          <Gem className="h-9 w-9 text-[color:var(--color-accent)]" />
          <h2 className="mt-3 font-display text-xl font-extrabold">{item.name}</h2>
          <p className="mt-1 text-sm text-white/55">{item.description}</p>
          <button
            type="button"
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
    <section className="overflow-hidden rounded-3xl border border-amber-400/50 bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 p-6 text-white shadow-[0_20px_55px_rgba(245,158,11,0.14)]">
      <div className="flex items-center gap-3">
        <img
          src={PREMIUM_CROWN}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          className="h-16 w-16 object-contain animate-float-slow drop-shadow-[0_6px_18px_rgba(245,158,11,0.45)]"
        />
        <div>
          <h2 className="font-display text-2xl font-extrabold">{APP_NAME} Premium</h2>
          <p className="text-sm text-white/55">Le socle commerce est prêt pour Stripe.</p>
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
        type="button"
        disabled
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-extrabold text-white opacity-75"
      >
        <Crown className="h-4 w-4" />
        Bientôt disponible
      </button>
    </section>
  );
}
