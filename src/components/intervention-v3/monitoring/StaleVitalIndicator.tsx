import { Clock } from "lucide-react";

/**
 * Le signal d'une mesure datée.
 *
 * Une mesure périmée reste **un instantané ancien** : sa valeur ne change pas,
 * et l'indicateur ne fait que dire son âge. C'est la contrepartie visuelle du gel
 * de la valeur dans le moteur — le patient continue d'évoluer, l'écran continue
 * d'afficher ce qui a été relevé, et l'indicateur dit que l'écart se creuse.
 */

interface Props {
  /** La mesure a dépassé son délai de fraîcheur. */
  isStale: boolean;
  /** Âge de la mesure, en secondes simulées. */
  ageSeconds: number | null;
  reducedMotion: boolean;
  /** Reprendre la mesure. Absent si aucune action ne le permet à cette étape. */
  onReevaluate?: (() => void) | undefined;
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export function StaleVitalIndicator({ isStale, ageSeconds, reducedMotion, onReevaluate }: Props) {
  if (!isStale) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span
        className={`flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-200 ${
          // Une pulsation lente, jamais un clignotement : l'information est
          // « cette mesure vieillit », pas « alerte ».
          reducedMotion ? "" : "animate-[medoca-fade_2.4s_ease-in-out_infinite]"
        }`}
      >
        <Clock className="h-3 w-3" aria-hidden="true" />
        Mesure ancienne
        {ageSeconds !== null && <span className="tabular-nums"> · {formatAge(ageSeconds)}</span>}
      </span>
      {onReevaluate && (
        <button
          type="button"
          onClick={onReevaluate}
          className="press rounded-full border border-amber-400/40 px-2.5 py-0.5 text-[11px] font-black text-amber-200"
        >
          Réévaluer
        </button>
      )}
    </div>
  );
}
