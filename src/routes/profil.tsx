import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, LogOut, Flame, Zap, Trophy, Target, Award, TrendingUp } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useProgress } from "@/lib/use-progress";
import { useAuth, signOut } from "@/lib/use-auth";
import { levelProgress } from "@/lib/gamification";
import { UNITS } from "@/lib/curriculum";
import { useBadgesCatalog, useUserBadges, useXpHistory } from "@/lib/use-gamification";
import { BadgeIcon } from "@/lib/icon-map";
import { BADGE_GOLD } from "@/lib/asset-map";
import { ProfileVisitCard } from "@/features/gamification/components/ProfileVisitCard";
import { DEFAULT_PROFILE_CARD, PROFILE_CARD_CATALOG } from "@/features/gamification/domain/profile-cards";
import { useProfileCard } from "@/features/gamification/hooks/use-profile-card";
import { useGameInventory } from "@/features/gamification/hooks/use-game-inventory";

export const Route = createFileRoute("/profil")({
  component: ProfilPage,
  head: () => ({
    meta: [
      { title: "Profil — MedLingo" },
      { name: "description", content: "Ton avatar, ton niveau, tes badges et ta progression." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ProfilPage() {
  const { user } = useAuth();
  const { progress, hydrated, setDailyGoal } = useProgress();
  const navigate = useNavigate();
  const lp = levelProgress(progress.xp);

  const { data: badges = [] } = useBadgesCatalog();
  const { data: userBadges = [] } = useUserBadges();
  const { data: xpHistory = [] } = useXpHistory(30);
  const { data: gameInventory = [] } = useGameInventory();
  const profileCard = useProfileCard();

  const earnedSet = useMemo(() => new Set(userBadges.map((b) => b.badge_code)), [userBadges]);
  const [goalEdit, setGoalEdit] = useState(false);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);

  const totalLessons = UNITS.reduce((s, u) => s + u.lessons.length, 0);
  const doneLessons = Object.keys(progress.completedLessons).length;
  const perfectLessons = Object.values(progress.completedLessons).filter((c) => c.stars === 3).length;
  const totalXp = xpHistory.reduce((s, d) => s + d.xp, 0);
  const activeDays = xpHistory.filter((d) => d.xp > 0).length;

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "Invité";
  const ownedProfileCards = useMemo(
    () => new Set(gameInventory.filter((item) => item.itemType === "profile_card").map((item) => item.itemCode)),
    [gameInventory],
  );
  const equippedCard = profileCard.data ?? DEFAULT_PROFILE_CARD;
  const initials = displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pt-4">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>

        <section className="mb-4">
          <ProfileVisitCard
            code={equippedCard}
            displayName={displayName}
            email={user?.email}
            level={lp.level}
            progressLabel={`Progression vers Niv ${lp.level + 1}`}
            progressValue={lp.pct}
            xp={progress.xp}
            streak={progress.streak}
            ranks={userBadges.length}
            lessons={doneLessons}
          />
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card p-3 shadow-[0_3px_0_0_var(--color-border)]">
            <div>
              <p className="text-sm font-extrabold">Carte de visite</p>
              <p className="text-xs text-muted-foreground">Debloque des designs dans les coffres et selectionne ton favori.</p>
            </div>
            <button
              onClick={() => setCardPickerOpen((open) => !open)}
              className="shrink-0 rounded-xl bg-[color:var(--color-primary)] px-3 py-2 text-xs font-extrabold text-primary-foreground"
            >
              {cardPickerOpen ? "Fermer" : "Personnaliser"}
            </button>
          </div>
        </section>

        {cardPickerOpen && (
          <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">Choisir une carte</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Les cartes verrouillees peuvent etre gagnees dans les coffres ou achetees dans la boutique.</p>
              </div>
              <span className="shrink-0 text-xs font-bold text-muted-foreground">
                {ownedProfileCards.size + 1}/{PROFILE_CARD_CATALOG.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROFILE_CARD_CATALOG.map((card) => {
                const owned = card.code === DEFAULT_PROFILE_CARD || ownedProfileCards.has(card.code);
                const selected = card.code === equippedCard;
                return (
                  <button
                    key={card.code}
                    type="button"
                    disabled={!owned || profileCard.isEquipping}
                    onClick={() => profileCard.equip(card.code)}
                    className={`relative overflow-hidden rounded-2xl text-left transition ${
                      selected ? "ring-2 ring-[color:var(--color-primary)] ring-offset-2 ring-offset-background" : ""
                    } ${owned ? "hover:-translate-y-0.5" : "cursor-not-allowed opacity-45 grayscale"}`}
                  >
                    <ProfileVisitCard
                      compact
                      code={card.code}
                      displayName={displayName}
                      level={lp.level}
                      progressLabel={card.name}
                      progressValue={lp.pct}
                      xp={progress.xp}
                      streak={progress.streak}
                      ranks={userBadges.length}
                      lessons={doneLessons}
                    />
                    <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white backdrop-blur">
                      {selected ? "Equipee" : owned ? "Selectionner" : "Verrouillee"}
                    </span>
                  </button>
                );
              })}
            </div>
            {profileCard.equipError && (
              <p className="mt-3 text-xs font-bold text-destructive">Impossible d'equiper cette carte pour le moment.</p>
            )}
          </section>
        )}

        {/* Legacy identity card kept for backwards-compatible markup. */}
        <section className="hidden mb-4 rounded-3xl border-2 border-[color:var(--color-primary)] bg-gradient-to-br from-[oklch(0.78_0.19_145)] to-[color:var(--color-primary)] p-5 text-primary-foreground shadow-[0_6px_0_0_oklch(0.55_0.17_145)]">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/40 bg-white/20 font-display text-3xl font-extrabold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-xl font-extrabold">{displayName}</div>
              <div className="truncate text-xs opacity-90">{user?.email ?? "Non connecté"}</div>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider">
                <Trophy className="h-3.5 w-3.5" /> Niveau {lp.level}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[11px] font-bold">
              <span>Progression vers Niv {lp.level + 1}</span>
              <span>{lp.xpIntoLevel}/{lp.xpForNextLevel} XP</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${lp.pct * 100}%` }} />
            </div>
          </div>
        </section>

        {/* Stats grid */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Zap className="h-4 w-4" />} label="XP total" value={progress.xp.toLocaleString("fr-FR")} color="var(--color-primary)" />
          <StatCard icon={<Flame className="h-4 w-4" />} label="Série" value={`${progress.streak}j`} color="var(--color-warning)" />
          <StatCard icon={<Award className="h-4 w-4" />} label="Badges" value={`${userBadges.length}/${badges.length}`} color="var(--color-info,#3B82F6)" />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Leçons" value={`${doneLessons}/${totalLessons}`} color="var(--color-success)" />
        </div>

        {/* Daily goal */}
        <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">
              <Target className="mr-1 inline h-4 w-4" /> Objectif quotidien
            </h2>
            <button onClick={() => setGoalEdit((v) => !v)} className="text-[11px] font-bold text-[color:var(--color-primary)]">
              {goalEdit ? "Fermer" : "Modifier"}
            </button>
          </div>
          {goalEdit ? (
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((v) => (
                <button
                  key={v}
                  onClick={() => { setDailyGoal(v); setGoalEdit(false); }}
                  className={`rounded-xl border-2 py-3 text-sm font-extrabold ${
                    progress.dailyGoalXp === v ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]" : "border-border bg-secondary"
                  }`}
                >
                  {v} XP
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm">
              <span className="font-extrabold">{progress.xpToday}</span> / {progress.dailyGoalXp} XP aujourd'hui
            </div>
          )}
        </section>

        {/* Activity 30 days */}
        <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">30 derniers jours</h2>
            <span className="text-[11px] font-bold text-muted-foreground">
              {totalXp} XP · {activeDays}j actifs · {perfectLessons} leçons parfaites
            </span>
          </div>
          <ActivityHeatmap data={xpHistory} goal={progress.dailyGoalXp} />
        </section>

        {/* Badges gallery */}
        <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">Badges</h2>
            <span className="text-[11px] font-bold text-muted-foreground">{userBadges.length}/{badges.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {badges.map((b) => {
              const earned = earnedSet.has(b.code);
              return (
                <div
                  key={b.code}
                  className={`flex flex-col items-center rounded-xl border-2 p-3 text-center transition ${
                    earned ? rarityBorder(b.rarity) : "border-dashed border-border bg-secondary/50 opacity-60 grayscale"
                  }`}
                  title={b.description}
                >
                  <BadgeIcon code={b.code} className={`h-7 w-7 ${earned ? "text-[color:var(--color-primary)]" : "text-muted-foreground"}`} strokeWidth={2.25} />
                  <div className="mt-1 line-clamp-2 text-[11px] font-extrabold leading-tight">{b.title}</div>
                  <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {earned ? b.rarity : "Verrouillé"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Account */}
        <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
          <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wider">Compte</h2>
          {user ? (
            <button
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[color:var(--color-destructive)] bg-[color:var(--color-destructive)]/10 py-3 text-sm font-extrabold text-[color:var(--color-destructive)]"
            >
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          ) : (
            <Link
              to="/auth"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-primary)] py-3 text-sm font-extrabold text-primary-foreground"
            >
              Se connecter pour sauvegarder
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-3 shadow-[0_3px_0_0_var(--color-border)]">
      <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider" style={{ color }}>
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-extrabold">{value}</div>
    </div>
  );
}

function ActivityHeatmap({ data, goal }: { data: { date: string; xp: number }[]; goal: number }) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {data.map((d) => {
        const level = d.xp === 0 ? 0 : d.xp < goal / 2 ? 1 : d.xp < goal ? 2 : d.xp < goal * 2 ? 3 : 4;
        const bg = ["bg-secondary", "bg-[color:var(--color-primary)]/25", "bg-[color:var(--color-primary)]/50", "bg-[color:var(--color-primary)]/80", "bg-[color:var(--color-primary)]"][level];
        return (
          <div
            key={d.date}
            className={`aspect-square rounded-md ${bg}`}
            title={`${d.date} — ${d.xp} XP`}
          />
        );
      })}
    </div>
  );
}

function rarityBorder(rarity: string): string {
  switch (rarity) {
    case "legendary": return "border-[color:var(--color-warning)] bg-[color:var(--color-warning)]/10";
    case "epic": return "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10";
    case "rare": return "border-[color:var(--color-info,#3B82F6)] bg-[color:var(--color-info,#3B82F6)]/10";
    default: return "border-border bg-secondary";
  }
}
