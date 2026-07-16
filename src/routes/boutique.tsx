import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Coins, Crown, Lock, Check, Sparkles, Heart, Brain, Bot, Palette, Trophy, BarChart3, X as XIcon } from "lucide-react";
import { ShopItemIcon } from "@/lib/icon-map";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/use-auth";
import {
  useShopCatalog,
  useWallet,
  useInventory,
  purchaseItem,
  equipItem,
  useInvalidateWallet,
  type ShopItem,
} from "@/lib/use-wallet";

export const Route = createFileRoute("/boutique")({
  component: Boutique,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Erreur : {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Introuvable</div>,
});

type Tab = "coffres" | "avatars" | "personnalisation" | "premium";

const RARITY_STYLES: Record<string, string> = {
  common: "border-slate-300 bg-slate-50 text-slate-700",
  rare: "border-sky-400 bg-sky-50 text-sky-700",
  epic: "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700",
  legendary:
    "border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100 text-amber-800",
};

function Boutique() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("avatars");
  const { data: catalog = [] } = useShopCatalog();
  const { data: wallet } = useWallet();
  const { data: inventory = [] } = useInventory();
  const invalidate = useInvalidateWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const owned = new Set(inventory.map((i) => i.item_code));
  const equipped = new Set(inventory.filter((i) => i.equipped).map((i) => i.item_code));

  function itemsFor(tab: Tab) {
    if (tab === "avatars") return catalog.filter((c) => c.type === "avatar");
    if (tab === "personnalisation")
      return catalog.filter((c) => ["frame", "background", "badge", "title"].includes(c.type));
    if (tab === "coffres") return catalog.filter((c) => c.type === "chest");
    return [];
  }

  async function handleBuy(item: ShopItem) {
    if (!user) return;
    setBusy(item.code);
    setMsg(null);
    try {
      await purchaseItem(item.code);
      invalidate();
      setMsg(`${item.name} acquis !`);
    } catch (e) {
      const err = e as { message?: string };
      const raw = err.message ?? "Erreur";
      const friendly =
        raw.includes("insufficient") ? "Pas assez de pièces" :
        raw.includes("premium") ? "Réservé aux abonnés Premium" :
        raw.includes("already") ? "Déjà possédé" :
        raw;
      setMsg(friendly);
    } finally {
      setBusy(null);
      setTimeout(() => setMsg(null), 2500);
    }
  }

  async function handleEquip(item: ShopItem) {
    setBusy(item.code);
    try {
      await equipItem(item.code, item.type);
      invalidate();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Boutique</h1>
            <p className="text-sm text-muted-foreground">
              Personnalise ton profil médical
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border-2 border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/10 px-4 py-2 text-[color:var(--color-warning)]">
            <Coins className="h-5 w-5" />
            <span className="text-lg font-extrabold tabular-nums">
              {wallet?.coins ?? 0}
            </span>
          </div>
        </div>

        {!user && (
          <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">
            <Link to="/auth" className="font-bold text-[color:var(--color-primary)] underline">
              Connecte-toi
            </Link>{" "}
            pour acheter et équiper des items.
          </div>
        )}

        <div className="mb-5 flex gap-1 overflow-x-auto rounded-full bg-secondary p-1">
          {(["avatars", "personnalisation", "coffres", "premium"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition ${
                tab === t
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {msg && (
          <div className="mb-3 rounded-lg bg-card border border-border px-3 py-2 text-sm font-semibold">
            {msg}
          </div>
        )}

        {tab === "premium" ? (
          <PremiumTab />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {itemsFor(tab).map((item) => {
              const isOwned = owned.has(item.code);
              const isEquipped = equipped.has(item.code);
              return (
                <div
                  key={item.code}
                  className={`relative rounded-2xl border-2 p-3 ${RARITY_STYLES[item.rarity]}`}
                >
                  {item.premium_only && (
                    <span className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                      <Crown className="h-3 w-3" /> PREMIUM
                    </span>
                  )}
                  <div className="mb-2 flex h-16 items-center justify-center text-[color:var(--color-primary)]">
                    <ShopItemIcon code={item.code} className="h-9 w-9" strokeWidth={2.25} />
                  </div>
                  <div className="text-sm font-extrabold leading-tight">{item.name}</div>
                  <div className="mb-2 line-clamp-2 text-[11px] opacity-70">
                    {item.description}
                  </div>
                  {isOwned ? (
                    <button
                      disabled={busy === item.code || isEquipped}
                      onClick={() => handleEquip(item)}
                      className={`w-full rounded-full px-2 py-1.5 text-xs font-extrabold ${
                        isEquipped
                          ? "bg-emerald-500 text-white"
                          : "bg-foreground text-background hover:opacity-90"
                      }`}
                    >
                      {isEquipped ? (
                        <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Équipé</span>
                      ) : (
                        "Équiper"
                      )}
                    </button>
                  ) : item.premium_only ? (
                    <button
                      onClick={() => setTab("premium")}
                      className="w-full rounded-full bg-amber-500 px-2 py-1.5 text-xs font-extrabold text-white"
                    >
                      <Lock className="mr-1 inline h-3 w-3" /> Premium
                    </button>
                  ) : (
                    <button
                      disabled={busy === item.code || !user || (wallet?.coins ?? 0) < item.price_coins}
                      onClick={() => handleBuy(item)}
                      className="flex w-full items-center justify-center gap-1 rounded-full bg-[color:var(--color-primary)] px-2 py-1.5 text-xs font-extrabold text-primary-foreground disabled:opacity-40"
                    >
                      <Coins className="h-3 w-3" />
                      {item.price_coins === 0 ? "Gratuit" : item.price_coins}
                    </button>
                  )}
                </div>
              );
            })}
            {itemsFor(tab).length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Bientôt disponible ✨
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function PremiumTab() {
  return (
    <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-6 shadow-lg">
      <div className="mb-3 flex items-center gap-2">
        <Crown className="h-7 w-7 text-amber-500" />
        <h2 className="font-display text-2xl font-extrabold">MedLingo Premium</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Débloque tout MedLingo. Apprends sans limite.
      </p>
      <ul className="mb-5 space-y-2 text-sm">
        {[
          "❤️ Vies illimitées — plus jamais bloqué",
          "🧠 Cas cliniques avancés (DEA + IFSI)",
          "🤖 Pulse IA illimité + coach quotidien",
          "🎨 Avatars, cadres, fonds exclusifs",
          "🏆 Badge « Membre Premium » animé",
          "📊 Statistiques avancées + export PDF",
        ].map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-border bg-white p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground">Mensuel</div>
          <div className="my-1 text-2xl font-extrabold">9,99 €</div>
          <div className="text-[11px] text-muted-foreground">par mois, sans engagement</div>
        </div>
        <div className="relative rounded-2xl border-2 border-amber-500 bg-white p-4">
          <span className="absolute -top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
            −33%
          </span>
          <div className="text-xs font-bold uppercase text-amber-600">Annuel</div>
          <div className="my-1 text-2xl font-extrabold">79,99 €</div>
          <div className="text-[11px] text-muted-foreground">soit 6,67 €/mois</div>
        </div>
      </div>
      <button
        disabled
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-extrabold text-white opacity-80"
      >
        <Sparkles className="h-4 w-4" /> Bientôt disponible
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Le paiement Stripe sera activé dans le prochain lot.
      </p>
    </div>
  );
}
