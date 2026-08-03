import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  LogOut,
  Flame,
  Zap,
  Trophy,
  Target,
  Award,
  TrendingUp,
  BadgeCheck,
  UserRound,
  BookOpen,
  ChevronRight,
  Package,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useProgress } from "@/lib/use-progress";
import { useAuth, signOut } from "@/lib/use-auth";
import { levelProgress } from "@/lib/gamification";
import { UNITS } from "@/lib/curriculum";
import { useBadgesCatalog, useUserBadges, useXpHistory } from "@/lib/use-gamification";
import { useInventory } from "@/lib/use-wallet";
import { BADGE_GOLD } from "@/lib/asset-map";
import { ProfileVisitCard } from "@/features/gamification/components/ProfileVisitCard";
import { GameItemArtwork } from "@/features/gamification/components/GameItemArtwork";
import {
  DEFAULT_PROFILE_CARD,
  PROFILE_CARD_CATALOG,
  type ProfileCardCode,
} from "@/features/gamification/domain/profile-cards";
import { useProfileCard } from "@/features/gamification/hooks/use-profile-card";
import { useGameInventory } from "@/features/gamification/hooks/use-game-inventory";
import { useProfileCosmetics } from "@/features/gamification/hooks/use-profile-cosmetics";
import { APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/profil")({
  component: ProfilPage,
  head: () => ({
    meta: [
      { title: `Profil — ${APP_NAME}` },
      { name: "description", content: "Ton avatar, ton niveau, tes badges et ta progression." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ProfilPage() {
  const { user } = useAuth();
  const { progress, setDailyGoal } = useProgress();
  const navigate = useNavigate();
  const lp = levelProgress(progress.xp);

  const { data: badges = [] } = useBadgesCatalog();
  const { data: userBadges = [] } = useUserBadges();
  const { data: xpHistory = [] } = useXpHistory(30);
  const { data: gameInventory = [] } = useGameInventory();
  const { data: legacyInventory = [] } = useInventory();
  const profileCard = useProfileCard();
  const profileCosmetics = useProfileCosmetics();

  const earnedSet = useMemo(() => new Set(userBadges.map((b) => b.badge_code)), [userBadges]);
  const [goalEdit, setGoalEdit] = useState(false);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [cosmeticsPickerOpen, setCosmeticsPickerOpen] = useState(false);

  const totalLessons = UNITS.reduce((s, u) => s + u.lessons.length, 0);
  const doneLessons = Object.keys(progress.completedLessons).length;
  const perfectLessons = Object.values(progress.completedLessons).filter(
    (c) => c.stars === 3,
  ).length;
  const totalXp = xpHistory.reduce((s, d) => s + d.xp, 0);
  const activeDays = xpHistory.filter((d) => d.xp > 0).length;

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "Invité";

  const mergedOwnedCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const item of gameInventory) codes.add(item.itemCode);
    for (const item of legacyInventory) codes.add(item.item_code);
    return codes;
  }, [gameInventory, legacyInventory]);

  const ownedProfileCards = useMemo(() => {
    const codes = new Set<string>([DEFAULT_PROFILE_CARD]);
    for (const code of mergedOwnedCodes) {
      if (code.startsWith("game_card_")) codes.add(code);
    }
    return codes;
  }, [mergedOwnedCodes]);

  const avatarItems = useMemo(() => {
    const byCode = new Map<string, { code: string; name: string }>();
    for (const item of gameInventory) {
      if (item.itemType === "avatar") {
        byCode.set(item.itemCode, {
          code: item.itemCode,
          name: String(item.metadata.name ?? formatCosmeticName(item.itemCode)),
        });
      }
    }
    for (const item of legacyInventory) {
      if (item.item_code.startsWith("avatar_") || item.item_code.startsWith("av_")) {
        byCode.set(item.item_code, {
          code: item.item_code,
          name: formatCosmeticName(item.item_code),
        });
      }
    }
    return Array.from(byCode.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [gameInventory, legacyInventory]);

  const badgeItems = useMemo(() => {
    const byCode = new Map<string, { code: string; name: string }>();
    for (const item of gameInventory) {
      if (item.itemType === "badge") {
        byCode.set(item.itemCode, {
          code: item.itemCode,
          name: String(item.metadata.name ?? formatCosmeticName(item.itemCode)),
        });
      }
    }
    for (const item of legacyInventory) {
      if (item.item_code.startsWith("badge_") || item.item_code.startsWith("game_badge_")) {
        byCode.set(item.item_code, {
          code: item.item_code,
          name: formatCosmeticName(item.item_code),
        });
      }
    }
    return Array.from(byCode.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [gameInventory, legacyInventory]);

  const equippedCard = profileCard.data ?? DEFAULT_PROFILE_CARD;
  const equippedAvatar = mergedOwnedCodes.has(profileCosmetics.avatarCode ?? "")
    ? profileCosmetics.avatarCode
    : null;
  const equippedBadge = mergedOwnedCodes.has(profileCosmetics.badgeCode ?? "")
    ? profileCosmetics.badgeCode
    : null;

  const avatarSlot = equippedAvatar ? (
    <GameItemArtwork
      code={equippedAvatar}
      type="avatar"
      label={formatCosmeticName(equippedAvatar)}
      className="h-full w-full"
      fallbackClassName="h-[72%] w-[72%] object-contain"
    />
  ) : undefined;

  const badgeSlot = equippedBadge ? (
    <GameItemArtwork
      code={equippedBadge}
      type="badge"
      label={formatCosmeticName(equippedBadge)}
      className="h-full w-full"
      fallbackClassName="h-full w-full object-contain"
    />
  ) : undefined;


  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pt-4">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
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
            avatarSlot={avatarSlot}
            badgeSlot={badgeSlot}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card p-3 shadow-[0_3px_0_0_var(--color-border)]">
              <div className="min-w-0">
                <p className="text-sm font-extrabold">Carte de visite</p>
                <p className="text-xs text-muted-foreground">
                  Débloque des designs et sélectionne ton style actif.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCardPickerOpen((open) => !open)}
                className="shrink-0 rounded-xl bg-[color:var(--color-primary)] px-3 py-2 text-xs font-extrabold text-primary-foreground"
              >
                {cardPickerOpen ? "Fermer" : "Personnaliser"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card p-3 shadow-[0_3px_0_0_var(--color-border)]">
              <div className="min-w-0">
                <p className="text-sm font-extrabold">Avatar & badge</p>
                <p className="text-xs text-muted-foreground">
                  Équipe les cosmétiques gagnés dans tes coffres et achats.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCosmeticsPickerOpen((open) => !open)}
                className="shrink-0 rounded-xl bg-[color:var(--color-primary)] px-3 py-2 text-xs font-extrabold text-primary-foreground"
              >
                {cosmeticsPickerOpen ? "Fermer" : "Choisir"}
              </button>
            </div>
          </div>
        </section>

        {cardPickerOpen && (
          <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">
                  Choisir une carte
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Les cartes verrouillées peuvent être gagnées dans les coffres ou achetées dans la
                  boutique.
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-muted-foreground">
                {ownedProfileCards.size}/{PROFILE_CARD_CATALOG.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROFILE_CARD_CATALOG.map((card) => {
                const owned = ownedProfileCards.has(card.code);
                const selected = card.code === equippedCard;
                return (
                  <button
                    key={card.code}
                    type="button"
                    disabled={!owned || profileCard.isEquipping}
                    onClick={() => profileCard.equip(card.code)}
                    className={`relative overflow-hidden rounded-2xl text-left transition ${
                      selected
                        ? "ring-2 ring-[color:var(--color-primary)] ring-offset-2 ring-offset-background"
                        : ""
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
                      avatarSlot={avatarSlot}
                      badgeSlot={badgeSlot}
                    />
                    <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white backdrop-blur">
                      {selected ? "Équipée" : owned ? "Sélectionner" : "Verrouillée"}
                    </span>
                  </button>
                );
              })}
            </div>
            {profileCard.equipError && (
              <p className="mt-3 text-xs font-bold text-destructive">
                Impossible d'équiper cette carte pour le moment.
              </p>
            )}
          </section>
        )}

        {cosmeticsPickerOpen && (
          <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-[color:var(--color-primary)]" />
                    <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">
                      Avatars
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    {avatarItems.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CosmeticTile
                    label="Initiales"
                    selected={!equippedAvatar}
                    onClick={() => profileCosmetics.equipAvatar(null)}
                    icon={
                      <span className="font-display text-lg font-extrabold">
                        {displayName.trim().slice(0, 2).toUpperCase()}
                      </span>
                    }
                  />
                  {avatarItems.map((item) => (
                    <CosmeticTile
                      key={item.code}
                      label={item.name}
                      selected={equippedAvatar === item.code}
                      onClick={() => profileCosmetics.equipAvatar(item.code)}
                      icon={
                        <GameItemArtwork
                          code={item.code}
                          type="avatar"
                          label={item.name}
                          className="h-12 w-12"
                          fallbackClassName="h-10 w-10 object-contain"
                        />
                      }
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-[color:var(--color-warning)]" />
                    <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">
                      Badges cosmétiques
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    {badgeItems.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CosmeticTile
                    label="Aucun badge"
                    selected={!equippedBadge}
                    onClick={() => profileCosmetics.equipBadge(null)}
                    icon={<BadgeCheck className="h-8 w-8 text-muted-foreground" />}
                  />
                  {badgeItems.map((item) => (
                    <CosmeticTile
                      key={item.code}
                      label={item.name}
                      selected={equippedBadge === item.code}
                      onClick={() => profileCosmetics.equipBadge(item.code)}
                      icon={
                        <GameItemArtwork
                          code={item.code}
                          type="badge"
                          label={item.name}
                          className="h-12 w-12"
                          fallbackClassName="h-10 w-10 object-contain"
                        />
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label="XP total"
            value={progress.xp.toLocaleString("fr-FR")}
            color="var(--color-primary)"
          />
          <StatCard
            icon={<Flame className="h-4 w-4" />}
            label="Série"
            value={`${progress.streak}j`}
            color="var(--color-warning)"
          />
          <StatCard
            icon={<Award className="h-4 w-4" />}
            label="Badges"
            value={`${userBadges.length}/${badges.length}`}
            color="var(--color-info,#3B82F6)"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Leçons"
            value={`${doneLessons}/${totalLessons}`}
            color="var(--color-success)"
          />
        </div>

        <section className="mb-4 overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-4 text-white shadow-[0_18px_45px_rgba(8,145,178,0.16)] sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                Espace personnel
              </p>
              <h2 className="font-display text-xl font-extrabold">Que veux-tu faire ?</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/65">
              Niveau {lp.level}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <ProfileAction
              to="/"
              icon={<BookOpen className="h-5 w-5" />}
              label="Continuer"
              description="Reprendre le parcours"
              accent="cyan"
            />
            <ProfileAction
              to="/inventaire"
              icon={<Package className="h-5 w-5" />}
              label="Collection"
              description={`${mergedOwnedCodes.size} objets débloqués`}
              accent="violet"
            />
            <ProfileAction
              to="/boutique"
              icon={<ShoppingBag className="h-5 w-5" />}
              label="Personnaliser"
              description="Cartes, avatars et badges"
              accent="amber"
            />
            <ProfileAction
              to="/pulse"
              icon={<Sparkles className="h-5 w-5" />}
              label="Demander à Pulse"
              description="Conseils et révisions"
              accent="emerald"
            />
          </div>
        </section>

        <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">
              <Target className="mr-1 inline h-4 w-4" /> Objectif quotidien
            </h2>
            <button
              type="button"
              onClick={() => setGoalEdit((v) => !v)}
              className="text-[11px] font-bold text-[color:var(--color-primary)]"
            >
              {goalEdit ? "Fermer" : "Modifier"}
            </button>
          </div>
          {goalEdit ? (
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setDailyGoal(v);
                    setGoalEdit(false);
                  }}
                  className={`rounded-xl border-2 py-3 text-sm font-extrabold ${
                    progress.dailyGoalXp === v
                      ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]"
                      : "border-border bg-secondary"
                  }`}
                >
                  {v} XP
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm">
              <span className="font-extrabold">{progress.xpToday}</span> / {progress.dailyGoalXp} XP
              aujourd'hui
            </div>
          )}
        </section>

        <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">
              30 derniers jours
            </h2>
            <span className="text-[11px] font-bold text-muted-foreground">
              {totalXp} XP · {activeDays}j actifs · {perfectLessons} leçons parfaites
            </span>
          </div>
          <ActivityHeatmap data={xpHistory} goal={progress.dailyGoalXp} />
        </section>

        <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={BADGE_GOLD}
                alt=""
                width={44}
                height={44}
                loading="lazy"
                decoding="async"
                className={`h-11 w-11 shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(245,158,11,0.45)] ${
                  userBadges.length > 0 ? "animate-float-slow" : "opacity-40 grayscale"
                }`}
              />
              <div className="min-w-0">
                <h2 className="font-display text-sm font-extrabold uppercase tracking-wider">
                  Badges
                </h2>
                <p className="text-[11px] font-bold text-muted-foreground">
                  {userBadges.length > 0
                    ? "Ta vitrine s'agrandit"
                    : "Termine une leçon pour débloquer ton premier badge"}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-muted-foreground tabular-nums">
              {userBadges.length}/{badges.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {badges.map((b) => {
              const earned = earnedSet.has(b.code);
              return (
                <div
                  key={b.code}
                  className={`flex flex-col items-center rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                    earned
                      ? `${rarityBorder(b.rarity)} hover:-translate-y-0.5 hover:shadow-md`
                      : "border-dashed border-border bg-secondary/50 opacity-60 grayscale"
                  }`}
                  title={b.description}
                >
                  <GameItemArtwork
                    code={b.code}
                    type="badge"
                    label={b.title}
                    className="h-10 w-10"
                    fallbackClassName={`h-7 w-7 ${earned ? "text-[color:var(--color-primary)]" : "text-muted-foreground"}`}
                  />
                  <div className="mt-1 line-clamp-2 text-[11px] font-extrabold leading-tight">
                    {b.title}
                  </div>
                  <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {earned ? b.rarity : "Verrouillé"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-4 rounded-2xl border-2 border-border bg-card p-4 shadow-[0_3px_0_0_var(--color-border)]">
          <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wider">
            Compte
          </h2>
          {user ? (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
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

function CosmeticTile({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 ${
        selected
          ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
          : "border-border bg-secondary/40"
      }`}
    >
      <div className="flex h-14 items-center justify-center rounded-2xl bg-card/70">{icon}</div>
      <div className="mt-2 truncate text-xs font-extrabold">{label}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {selected ? "Équipé" : "Choisir"}
      </div>
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-3 shadow-[0_3px_0_0_var(--color-border)]">
      <div
        className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider"
        style={{ color }}
      >
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-extrabold">{value}</div>
    </div>
  );
}

function ProfileAction({
  to,
  icon,
  label,
  description,
  accent,
}: {
  to: "/" | "/inventaire" | "/boutique" | "/pulse";
  icon: ReactNode;
  label: string;
  description: string;
  accent: "cyan" | "violet" | "amber" | "emerald";
}) {
  const accents = {
    cyan: "bg-cyan-400/15 text-cyan-300",
    violet: "bg-violet-400/15 text-violet-300",
    amber: "bg-amber-400/15 text-amber-300",
    emerald: "bg-emerald-400/15 text-emerald-300",
  };

  return (
    <Link
      to={to}
      className="group flex min-h-24 items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-1 font-display text-sm font-extrabold">
          {label}
          <ChevronRight className="h-4 w-4 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white" />
        </span>
        <span className="mt-1 block text-[11px] leading-snug text-white/55">{description}</span>
      </span>
    </Link>
  );
}

function ActivityHeatmap({ data, goal }: { data: { date: string; xp: number }[]; goal: number }) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {data.map((d) => {
        const level =
          d.xp === 0 ? 0 : d.xp < goal / 2 ? 1 : d.xp < goal ? 2 : d.xp < goal * 2 ? 3 : 4;
        const bg = [
          "bg-secondary",
          "bg-[color:var(--color-primary)]/25",
          "bg-[color:var(--color-primary)]/50",
          "bg-[color:var(--color-primary)]/80",
          "bg-[color:var(--color-primary)]",
        ][level];
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
    case "legendary":
      return "border-[color:var(--color-warning)] bg-[color:var(--color-warning)]/10";
    case "epic":
      return "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10";
    case "rare":
      return "border-[color:var(--color-info,#3B82F6)] bg-[color:var(--color-info,#3B82F6)]/10";
    default:
      return "border-border bg-secondary";
  }
}

function formatCosmeticName(code: string): string {
  return code
    .replace(/^game_/, "")
    .replace(/^av_/, "")
    .replace(/^fr_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
