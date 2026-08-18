import type { WaveformTrace } from "@/features/intervention-v3/ui/vitals-screen";
import { tracePath } from "./trace-path";

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
  /** Tracé calculé par le moteur. Absent, seule la pastille respire. */
  trace?: WaveformTrace | null;
  placeholder?: string;
}

/** Bornes de tracé, au-delà desquelles l'animation cesse d'être lisible. */
const MIN_RATE = 4;
const MAX_RATE = 60;

export function RespiratoryWaveform({
  respiratoryRatePerMinute,
  reducedMotion,
  trace,
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
  const path = trace && trace.points.length > 1 ? tracePath(trace.points) : null;

  return (
    <div
      className="flex h-10 items-center gap-3 rounded-lg bg-slate-950/40 px-2"
      role="img"
      aria-label={`Rythme respiratoire, ${respiratoryRatePerMinute} cycles par minute`}
    >
      <span
        // Un souffle : une expansion douce, jamais un clignotement. La durée d'un
        // cycle complet est celle de la fréquence comptée.
        className={`block h-6 w-6 shrink-0 rounded-full border-2 border-sky-300/70 ${
          reducedMotion ? "" : "animate-[medoca-breathe_var(--breath-cycle)_ease-in-out_infinite]"
        }`}
        style={{ ["--breath-cycle" as string]: `${cycleSeconds.toFixed(2)}s` }}
      />
      {/* Le tracé accompagne la pastille quand le moteur en fournit un. Son
          absence n'est pas une panne : c'est l'état d'une fréquence comptée dont
          on n'a pas demandé la courbe. */}
      {path && (
        <div className="relative h-8 flex-1 overflow-hidden">
          <div
            className={`flex h-full w-[200%] ${
              reducedMotion ? "" : "animate-[medoca-scroll_var(--breath-window)_linear_infinite]"
            }`}
            style={{
              ["--breath-window" as string]: `${(trace?.windowSeconds ?? cycleSeconds).toFixed(2)}s`,
            }}
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
                  d={path}
                  fill="none"
                  stroke="oklch(0.8 0.11 240)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
