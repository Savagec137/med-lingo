import { BookOpen, Flame, Target, Trophy } from "lucide-react";
import type { ProfileCardCode } from "@/features/gamification/domain/profile-cards";
import { getProfileCard } from "@/features/gamification/domain/profile-cards";

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
}: ProfileVisitCardProps) {
  const card = getProfileCard(code);
  const Icon = card.Icon;
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const progress = Math.max(0, Math.min(1, progressValue));

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border p-4 shadow-[0_12px_32px_rgba(0,0,0,0.2)] ${compact ? "min-h-40" : "min-h-56 sm:p-5"}`}
      style={{ background: card.background, borderColor: `${card.accent}88`, color: card.foreground }}
    >
      <Icon
        aria-hidden="true"
        className={`pointer-events-none absolute -right-3 -top-3 opacity-20 ${compact ? "h-24 w-24" : "h-36 w-36"}`}
        style={{ color: card.accent }}
        strokeWidth={1.2}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`${compact ? "h-11 w-11 text-base" : "h-16 w-16 text-2xl"} flex shrink-0 items-center justify-center rounded-full border-2 font-display font-extrabold`}
            style={{ borderColor: card.accent, backgroundColor: `${card.accent}26`, color: card.foreground }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-extrabold sm:text-xl">{displayName}</p>
            {!compact && <p className="truncate text-xs" style={{ color: card.muted }}>{email ?? "Profil MedLingo"}</p>}
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
              style={{ backgroundColor: `${card.accent}2e`, color: card.foreground }}
            >
              <Trophy className="h-3 w-3" /> Niveau {level}
            </span>
          </div>
        </div>
        {!compact && <Icon className="h-6 w-6 shrink-0" style={{ color: card.accent }} />}
      </div>

      <div className={`${compact ? "mt-4" : "mt-6"} relative`}>
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold">
          <span className="truncate">{progressLabel}</span>
          {!compact && <span>{Math.round(progress * 100)}%</span>}
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: `${card.foreground}24` }}>
          <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: card.accent }} />
        </div>
      </div>

      {!compact && (
        <div className="relative mt-5 grid grid-cols-4 gap-2 border-t pt-3 text-center" style={{ borderColor: `${card.foreground}22` }}>
          <CardStat Icon={Flame} label="XP" value={xp.toLocaleString("fr-FR")} color={card.accent} />
          <CardStat Icon={Trophy} label="Série" value={`${streak}j`} color={card.accent} />
          <CardStat Icon={BookOpen} label="Rangs" value={String(ranks)} color={card.accent} />
          <CardStat Icon={Target} label="Leçons" value={String(lessons)} color={card.accent} />
        </div>
      )}
    </section>
  );
}

function CardStat({ Icon, label, value, color }: { Icon: typeof Flame; label: string; value: string; color: string }) {
  return (
    <div className="min-w-0">
      <Icon className="mx-auto h-3.5 w-3.5" style={{ color }} />
      <p className="mt-0.5 truncate text-xs font-extrabold">{value}</p>
      <p className="text-[8px] font-bold uppercase tracking-wide opacity-75">{label}</p>
    </div>
  );
}
