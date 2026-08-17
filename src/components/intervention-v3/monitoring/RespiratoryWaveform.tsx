/**
 * L'animation respiratoire.
 *
 * Elle ne bat qu'à la fréquence **comptée par le joueur**. Tant que « Compter la
 * FR » n'a pas été joué, il n'y a rien à animer — et surtout rien à suggérer :
 * un souffle qui monterait et descendrait à douze par minute apprendrait au
 * joueur ce qu'il n'a pas mesuré.
 *
 * À la différence de l'onde de pouls, elle ne demande aucun capteur : compter une
 * fréquence respiratoire se fait à l'œil. C'est donc un instantané animé à la
 * cadence relevée, pas une surveillance continue.
 */

interface Props {
  /** Cycles par minute comptés. `null` tant que la FR n'est pas relevée. */
  respiratoryRatePerMinute: number | null;
  reducedMotion: boolean;
  placeholder?: string;
}

/** Bornes de tracé, au-delà desquelles l'animation cesse d'être lisible. */
const MIN_RATE = 4;
const MAX_RATE = 60;

export function RespiratoryWaveform({
  respiratoryRatePerMinute,
  reducedMotion,
  placeholder,
}: Props) {
  if (respiratoryRatePerMinute === null) {
    return (
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {placeholder ?? "Fréquence respiratoire non comptée"}
      </p>
    );
  }

  const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, respiratoryRatePerMinute));
  const cycleSeconds = 60 / rate;

  return (
    <div
      className="flex h-10 items-center justify-center rounded-lg bg-slate-950/40"
      role="img"
      aria-label={`Rythme respiratoire, ${respiratoryRatePerMinute} cycles par minute`}
    >
      <span
        // Un souffle : une expansion douce, jamais un clignotement. La durée d'un
        // cycle complet est celle de la fréquence comptée.
        className={`block h-6 w-6 rounded-full border-2 border-sky-300/70 ${
          reducedMotion ? "" : "animate-[medoca-breathe_var(--breath-cycle)_ease-in-out_infinite]"
        }`}
        style={{ ["--breath-cycle" as string]: `${cycleSeconds.toFixed(2)}s` }}
      />
    </div>
  );
}
