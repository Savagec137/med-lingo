import { ProfileCardScene } from "@/features/gamification/components/ProfileCardScene";
import { getProfileCard, PROFILE_CARD_CATALOG } from "@/features/gamification/domain/profile-cards";

/**
 * Aperçu miniature d'une carte de visite : reprend le thème animé réel
 * de la carte au lieu d'une icône générique.
 */
export function ProfileCardThumb({
  code,
  className = "h-20 w-20",
}: {
  code: string;
  className?: string;
}) {
  const card = getProfileCard(code);
  const { Icon } = card;

  return (
    <span
      aria-hidden="true"
      className={`relative block shrink-0 overflow-hidden rounded-2xl border border-white/15 ${className}`}
      style={{ background: card.background, color: card.foreground }}
    >
      <span className="absolute inset-0 [&>span]:rounded-none">
        <ProfileCardScene
          theme={card.theme}
          accent={card.accent}
          accentAlt={card.accentAlt}
          foreground={card.foreground}
          compact
        />
      </span>
      <span
        className="absolute inset-x-[12%] top-[14%] h-[3px] rounded-full"
        style={{ background: card.accent, opacity: 0.85 }}
      />
      <span className="absolute inset-0 grid place-items-center">
        <Icon className="h-[42%] w-[42%]" strokeWidth={1.9} style={{ color: card.accent }} />
      </span>
      <span
        className="absolute inset-x-[14%] bottom-[16%] h-[2px] rounded-full"
        style={{ background: card.accentAlt, opacity: 0.6 }}
      />
    </span>
  );
}

export function isProfileCardCode(code: string) {
  return PROFILE_CARD_CATALOG.some((card) => card.code === code);
}
