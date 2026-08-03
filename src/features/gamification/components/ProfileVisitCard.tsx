import type { ReactNode } from "react";
import { BookOpen, Flame, Target, Trophy } from "lucide-react";
import type { ProfileCardCode } from "@/features/gamification/domain/profile-cards";
import { getProfileCard } from "@/features/gamification/domain/profile-cards";
import { APP_NAME } from "@/lib/brand";

type ProfileVisitCardProps = {
  code?: ProfileCardCode | string | null;
  displayName: string;
  email?: string;
  level: number;
  progressLabel: string;
  progressValue: number;
  xp: number;
  streak: number;
  ranks: number;
  lessons: number;
  compact?: boolean;
  avatarSlot?: ReactNode;
  badgeSlot?: ReactNode;
};

const RARITY_LABEL: Record<string, string> = {
  common: "Commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
  mythic: "Mythique",
};

export function ProfileVisitCard({
  code,
  displayName,
  email,
  level,
  progressLabel,
  progressValue,
  xp,
  streak,
  ranks,
  lessons,
  compact = false,
  avatarSlot,
  badgeSlot,
}: ProfileVisitCardProps) {
  const card = getProfileCard(code);
  const Icon = card.Icon;
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const progress = Math.max(0, Math.min(1, progressValue));

  return (
    <section
      className={`group relative isolate overflow-hidden rounded-[26px] border p-4 shadow-[0_18px_48px_-18px_rgba(0,0,0,0.75)] ${
        compact ? "min-h-44" : "min-h-64 sm:p-5"
      }`}
      style={{
        background: card.background,
        borderColor: `${card.accent}99`,
        color: card.foreground,
      }}
    >
      {/* halo de rareté */}
      <span
        aria-hidden="true"
        className="animate-rarity-halo pointer-events-none absolute inset-0 -z-10 rounded-[26px]"
        style={{ boxShadow: `inset 0 0 60px -12px ${card.accent}` }}
      />
      {/* grille technique */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14]"
        style={{
          backgroundImage: `linear-gradient(${card.foreground}55 1px, transparent 1px), linear-gradient(90deg, ${card.foreground}55 1px, transparent 1px)`,
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(circle at 20% 20%, #000 10%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(circle at 20% 20%, #000 10%, transparent 78%)",
        }}
      />
      {/* tracé ECG */}
      <svg
        aria-hidden="true"
        viewBox="0 0 420 60"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-16 w-full opacity-30"
      >
        <path
          d="M0 40 H70 l10 -22 l10 44 l12 -30 l10 8 H190 l12 -26 l10 48 l12 -34 l10 12 H420"
          fill="none"
          stroke={card.accent}
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-ecg-trace"
        />
      </svg>
      {/* icône signature */}
      <Icon
        aria-hidden="true"
        className={`animate-card-icon pointer-events-none absolute -right-4 -top-4 -z-10 opacity-[0.18] ${
          compact ? "h-28 w-28" : "h-44 w-44"
        }`}
        style={{ color: card.accent }}
        strokeWidth={1.1}
      />
      {/* reflet holographique */}
      <span
        aria-hidden="true"
        className="animate-holo-sweep pointer-events-none absolute -inset-y-10 left-0 -z-10 w-1/3 blur-[6px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${card.foreground}30, transparent)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full blur-md"
              style={{ background: `${card.accent}55` }}
            />
            <div
              className={`${compact ? "h-12 w-12 text-base" : "h-[68px] w-[68px] text-2xl"} relative flex items-center justify-center overflow-hidden rounded-full border-2 font-display font-extrabold`}
              style={{
                borderColor: card.accent,
                backgroundColor: `${card.accent}26`,
                color: card.foreground,
              }}
            >
              {avatarSlot ?? initials}
            </div>
            {badgeSlot ? (
              <div
                className={`absolute -bottom-1.5 -right-1.5 flex items-center justify-center overflow-hidden rounded-full border-2 shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
                  compact ? "h-7 w-7" : "h-10 w-10"
                }`}
                style={{
                  borderColor: card.accent,
                  backgroundColor: `${card.accent}33`,
                  color: card.foreground,
                  backdropFilter: "blur(2px)",
                }}
              >
                <span
                  className={`flex items-center justify-center ${compact ? "h-5 w-5" : "h-7 w-7"} [&_img]:h-full [&_img]:w-full [&_img]:object-contain [&_svg]:h-full [&_svg]:w-full`}
                >
                  {badgeSlot}
                </span>
              </div>
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-extrabold leading-tight sm:text-xl">
              {displayName}
            </p>
            {!compact && (
              <p className="truncate text-xs" style={{ color: card.muted }}>
                {email ?? `Profil ${APP_NAME}`}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
                style={{ backgroundColor: `${card.accent}2e`, color: card.foreground }}
              >
                <Trophy className="h-3 w-3" /> Niveau {level}
              </span>
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em]"
                style={{ borderColor: `${card.accent}66`, color: card.muted }}
              >
                {RARITY_LABEL[card.rarity] ?? card.rarity}
              </span>
            </div>
          </div>
        </div>
        {!compact && (
          <div
            className="shrink-0 rounded-xl border px-2 py-1 text-right"
            style={{ borderColor: `${card.foreground}22`, backgroundColor: `${card.foreground}0f` }}
          >
            <Icon className="ml-auto h-5 w-5" style={{ color: card.accent }} />
            <p className="mt-0.5 text-[8px] font-extrabold uppercase tracking-[0.16em] opacity-70">
              {APP_NAME}
            </p>
          </div>
        )}
      </div>

      <div className={`${compact ? "mt-4" : "mt-6"} relative`}>
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold">
          <span className="truncate">{progressLabel}</span>
          {!compact && <span>{Math.round(progress * 100)}%</span>}
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full"
          style={{ backgroundColor: `${card.foreground}24` }}
        >
          <div
            className="relative h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${card.accent}, ${card.foreground})`,
              boxShadow: `0 0 12px ${card.accent}aa`,
            }}
          >
            <span className="shimmer absolute inset-0 rounded-full" />
          </div>
        </div>
      </div>

      {!compact && (
        <div
          className="relative mt-5 grid grid-cols-4 gap-2 rounded-2xl border p-2.5 text-center"
          style={{
            borderColor: `${card.foreground}1f`,
            backgroundColor: `${card.foreground}0d`,
          }}
        >
          <CardStat
            Icon={Flame}
            label="XP"
            value={xp.toLocaleString("fr-FR")}
            color={card.accent}
          />
          <CardStat Icon={Trophy} label="Série" value={`${streak}j`} color={card.accent} />
          <CardStat Icon={BookOpen} label="Rangs" value={String(ranks)} color={card.accent} />
          <CardStat Icon={Target} label="Leçons" value={String(lessons)} color={card.accent} />
        </div>
      )}
    </section>
  );
}

function CardStat({
  Icon,
  label,
  value,
  color,
}: {
  Icon: typeof Flame;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="min-w-0">
      <Icon className="mx-auto h-4 w-4" style={{ color }} />
      <p className="mt-0.5 truncate text-sm font-extrabold tabular-nums">{value}</p>
      <p className="text-[8px] font-bold uppercase tracking-wide opacity-75">{label}</p>
    </div>
  );
}
