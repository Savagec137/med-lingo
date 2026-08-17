import { Activity, CircleOff } from "lucide-react";

/**
 * L'état de la surveillance, en un coup d'œil.
 *
 * Trois états qui ne se confondent pas : un capteur en place surveille, un
 * capteur retiré ne surveille plus mais a servi, et un capteur jamais posé n'a
 * rien donné. La différence compte : « surveillance interrompue » est une
 * information clinique, « jamais posé » est un oubli.
 */

export type MonitoringState = "live" | "interrupted" | "never";

interface Props {
  state: MonitoringState;
  reducedMotion: boolean;
  /** Nombre de constantes tenues à jour. Affiché seulement en surveillance. */
  liveCount?: number;
}

const TONES: Record<MonitoringState, string> = {
  live: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  interrupted: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  never: "border-white/10 bg-white/[0.04] text-slate-400",
};

const LABELS: Record<MonitoringState, string> = {
  live: "Surveillance en cours",
  interrupted: "Surveillance interrompue",
  never: "Aucune surveillance",
};

export function MonitoringStatusBadge({ state, reducedMotion, liveCount }: Props) {
  const Icon = state === "live" ? Activity : CircleOff;

  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${TONES[state]}`}
      role="status"
    >
      <Icon
        className={`h-3.5 w-3.5 ${
          state === "live" && !reducedMotion
            ? "animate-[medoca-beat_1.6s_ease-in-out_infinite]"
            : ""
        }`}
        aria-hidden="true"
      />
      {LABELS[state]}
      {state === "live" && liveCount !== undefined && liveCount > 0 && (
        <span className="tabular-nums"> · {liveCount}</span>
      )}
    </span>
  );
}
