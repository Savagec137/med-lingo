/**
 * L'onde pléthysmographique du saturomètre.
 *
 * Elle ne s'affiche **que** si un capteur est en place et si le pouls a été
 * relevé. Ces deux conditions ne sont pas décoratives : une onde qui battrait
 * avant toute mesure révélerait la fréquence du patient aussi sûrement qu'un
 * chiffre, et une onde sans capteur montrerait une surveillance qui n'existe pas.
 *
 * Le composant ne connaît ni la session, ni le scénario, ni le moteur. Il reçoit
 * une cadence déjà dérivée, ou rien.
 */

interface Props {
  /** Battements par minute mesurés. `null` tant que le pouls n'est pas relevé. */
  pulseBpm: number | null;
  /** Un capteur est en place et tient la mesure à jour. */
  isLive: boolean;
  /** Préférence système : remplacer l'animation par un état statique. */
  reducedMotion: boolean;
  /** Libellé de l'absence, quand il n'y a rien à animer. */
  placeholder?: string;
}

/** Bornes de tracé. Au-delà, l'onde devient illisible plutôt qu'informative. */
const MIN_BPM = 30;
const MAX_BPM = 200;

const PLETHYSMOGRAPHIC_PATH =
  "M0 20 L14 20 L20 6 L26 30 L32 14 L38 20 L52 20 L60 18 L70 20 L100 20";

export function PulseWaveform({ pulseBpm, isLive, reducedMotion, placeholder }: Props) {
  // Deux verrous, et il faut les deux. Sans capteur, la surveillance est
  // interrompue ; sans mesure, il n'y a pas de cadence à représenter.
  if (!isLive || pulseBpm === null) {
    return (
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {placeholder ?? "Saturomètre non posé"}
      </p>
    );
  }

  const bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, pulseBpm));
  const cycleSeconds = 60 / bpm;

  return (
    <div
      className="relative h-10 w-full overflow-hidden rounded-lg bg-slate-950/40"
      role="img"
      aria-label={`Onde de pouls, ${pulseBpm} battements par minute`}
    >
      {reducedMotion ? (
        // État statique : le tracé reste lisible, il ne défile plus.
        <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none">
          <path
            d={PLETHYSMOGRAPHIC_PATH}
            fill="none"
            stroke="oklch(0.78 0.15 165)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <div
          className="flex h-full w-[200%] animate-[medoca-scroll_var(--pulse-cycle)_linear_infinite]"
          style={{ ["--pulse-cycle" as string]: `${cycleSeconds.toFixed(2)}s` }}
        >
          {[0, 1].map((index) => (
            <svg
              key={index}
              viewBox="0 0 100 40"
              className="h-full w-1/2 shrink-0"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d={PLETHYSMOGRAPHIC_PATH}
                fill="none"
                stroke="oklch(0.78 0.15 165)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Pastille qui bat à la cadence du pouls mesuré.
 *
 * Séparée de l'onde parce qu'elle sert ailleurs — sur une carte de constante, à
 * côté d'une valeur — et parce qu'elle doit pouvoir s'éteindre seule.
 */
export function PulseBeat({
  pulseBpm,
  isLive,
  reducedMotion,
}: Pick<Props, "pulseBpm" | "isLive" | "reducedMotion">) {
  if (!isLive || pulseBpm === null) return null;
  const cycleSeconds = 60 / Math.min(MAX_BPM, Math.max(MIN_BPM, pulseBpm));

  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 rounded-full bg-emerald-400 ${
        reducedMotion ? "" : "animate-[medoca-beat_var(--pulse-cycle)_ease-in-out_infinite]"
      }`}
      style={{ ["--pulse-cycle" as string]: `${cycleSeconds.toFixed(2)}s` }}
    />
  );
}
