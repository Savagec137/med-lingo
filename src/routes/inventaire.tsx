import { createFileRoute, Link } from "@tanstack/react-router";
import { Box, Coins, Gem, KeyRound, Sparkles, Ticket, WalletCards, Zap } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { GameChestDialog } from "@/features/gamification/components/GameChestDialog";
import { InventoryItemCard } from "@/features/gamification/components/InventoryItemCard";
import { useGameChests } from "@/features/gamification/hooks/use-game-chests";
import {
  useGameCurrency,
  useGameInventory,
} from "@/features/gamification/hooks/use-game-inventory";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/inventaire")({
  component: InventoryPage,
  head: () => ({
    meta: [
      { title: "Inventaire — MedLingo" },
      { name: "description", content: "Tes coffres, ressources et objets de collection MedLingo." },
    ],
  }),
});

function CurrencyCard({
  label,
  value,
  Icon,
  color,
}: {
  label: string;
  value: number;
  Icon: typeof Coins;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-3 shadow-[0_3px_0_0_var(--color-border)]">
      <div
        className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide"
        style={{ color }}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-extrabold tabular-nums">
        {value.toLocaleString("fr-FR")}
      </div>
    </div>
  );
}

function InventoryPage() {
  const { user } = useAuth();
  const { data: currency, isLoading: currencyLoading } = useGameCurrency();
  const { data: items = [], isLoading: inventoryLoading } = useGameInventory();
  const chest = useGameChests();
  const chests = items.filter((item) => item.itemType === "chest");
  const collection = items.filter((item) => item.itemType !== "chest");

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
              Progression
            </p>
            <h1 className="font-display text-3xl font-extrabold">Inventaire</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ressources, coffres et objets obtenus pendant ton parcours.
            </p>
          </div>
          <Link
            to="/boutique"
            className="shrink-0 rounded-xl border border-[color:var(--color-primary)]/40 bg-[color:var(--color-primary)]/10 px-3 py-2 text-xs font-extrabold text-[color:var(--color-primary)]"
          >
            Boutique
          </Link>
        </header>

        {!user ? (
          <section className="rounded-2xl border border-border bg-card p-5 text-sm">
            <Link to="/auth" className="font-bold text-[color:var(--color-primary)] underline">
              Connecte-toi
            </Link>{" "}
            pour enregistrer ton inventaire et tes récompenses.
          </section>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <CurrencyCard
                label="Pièces"
                value={currency?.coins ?? 0}
                Icon={Coins}
                color="var(--color-warning)"
              />
              <CurrencyCard
                label="Gemmes"
                value={currency?.gems ?? 0}
                Icon={Gem}
                color="var(--color-accent)"
              />
              <CurrencyCard
                label="Clés"
                value={currency?.keys ?? 0}
                Icon={KeyRound}
                color="var(--color-info)"
              />
              <CurrencyCard
                label="Tickets"
                value={currency?.tickets ?? 0}
                Icon={Ticket}
                color="var(--color-primary)"
              />
              <CurrencyCard
                label="Énergie"
                value={currency?.energy ?? 0}
                Icon={Zap}
                color="var(--color-success)"
              />
            </section>

            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
                  <Box className="h-5 w-5 text-[color:var(--color-primary)]" />
                  Coffres disponibles
                </h2>
                <span className="text-xs font-bold text-muted-foreground">
                  {chests.reduce((total, item) => total + item.quantity, 0)} au total
                </span>
              </div>
              {inventoryLoading ? (
                <InventorySkeleton />
              ) : chests.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {chests.map((item) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      onOpen={(code) => chest.open(code).catch(() => undefined)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Aucun coffre disponible"
                  text="Les coffres obtenus dans la boutique et les récompenses quotidiennes apparaîtront ici."
                  Icon={Box}
                />
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <WalletCards className="h-5 w-5 text-[color:var(--color-accent)]" />
                <h2 className="font-display text-lg font-extrabold">Collection</h2>
              </div>
              {inventoryLoading || currencyLoading ? (
                <InventorySkeleton />
              ) : collection.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {collection.map((item) => (
                    <InventoryItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Ta collection est prête"
                  text="Avatars, cartes, badges et boosts gagnés seront rangés ici."
                  Icon={Sparkles}
                />
              )}
            </section>
            {chest.error && (
              <p className="mt-4 text-center text-xs font-bold text-destructive">{chest.error}</p>
            )}
          </>
        )}
      </main>
      <GameChestDialog result={chest.result} onClose={chest.close} />
    </div>
  );
}

function InventorySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[0, 1].map((index) => (
        <div key={index} className="h-24 animate-pulse rounded-2xl bg-secondary" />
      ))}
    </div>
  );
}
function EmptyState({ title, text, Icon }: { title: string; text: string; Icon: typeof Box }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-7 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <div className="mt-2 font-extrabold">{title}</div>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
