import type { WaveformTrace } from "@/features/intervention-v3/ui/vitals-screen";
import { tracePath } from "./trace-path";

/**
 * L'onde pléthysmographique du saturomètre.
 *
 * Elle ne s'affiche **que** si un capteur est en place et si le pouls a été
 * relevé. Ces deux conditions ne sont pas décoratives : une onde qui battrait
 * avant toute mesure révélerait la fréquence du patient aussi sûrement qu'un
 * chiffre, et une onde sans capteur montrerait une surveillance qui n'existe pas.
 *
 * Le tracé vient du moteur, pas du composant. C'est ce qui permet à un signal
 * faible de s'écraser et à un mouvement du patient de déformer la courbe sans
 * qu'aucun composant ait besoin de connaître la physiologie : il reçoit des
 * points normalisés entre -1 et 1, sans unité et sans valeur.
 *
 * Le mouvement, lui, est porté par une animation CSS et non par un rendu React.
 * Redessiner soixante fois par seconde pour faire défiler une courbe ferait
 * chauffer le téléphone d'un apprenant pour un résultat identique.
 */

interface Props {
  /** Battements par minute mesurés. `null` tant que le pouls n'est pas relevé. */
  pulseBpm: number | null;
  /** Un capteur est en place et tient la mesure à jour. */
  isLive: boolean;
  /** Préférence système : remplacer l'animation par un état statique. */
  reducedMotion: boolean;
  /** Tracé calculé par le moteur. Absent, un tracé de repli est dessiné. */
  trace?: WaveformTrace | null;
  /** Libellé de l'absence, quand il n'y a rien à animer. */
  placeholder?: string;
}

/** Bornes de tracé. Au-delà, l'onde devient illisible plutôt qu'informative. */
const MIN_BPM = 30;
const MAX_BPM = 200;

/**
 * Tracé de repli, utilisé quand aucun instantané n'est fourni.
 *
 * Il garde la morphologie d'une onde de pouls — montée rapide, descente,
 * incisure — pour que l'écran reste juste même sans moteur derrière lui.
 */
const FALLBACK_PATH = "M0 20 L14 20 L20 6 L26 30 L32 14 L38 20 L52 20 L60 18 L70 20 L100 20";

function Trace({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 100 40" className="h-full w-1/2 shrink-0" preserveAspectRatio="none">
      <path
        d={path}
        fill="none"
        stroke="oklch(0.78 0.15 165)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function PulseWaveform({ pulseBpm, isLive, reducedMotion, trace, placeholder }: Props) {
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
  const path = trace && trace.points.length > 1 ? tracePath(trace.points) : FALLBACK_PATH;
  // La fenêtre du moteur couvre un nombre entier de battements : faire défiler
  // deux copies sur cette durée boucle sans saut. Sans instantané, on retombe sur
  // un cycle unique.
  const cycleSeconds = trace?.windowSeconds ?? 60 / bpm;

  return (
    <div
      className="relative h-10 w-full overflow-hidden rounded-lg bg-slate-950/40"
      role="img"
      aria-label={`Onde de pouls, ${pulseBpm} battements par minute`}
    >
      {reducedMotion ? (
        // État statique : le tracé reste lisible, il ne défile plus.
        <div className="flex h-full w-[200%]">
          <Trace path={path} />
        </div>
      ) : (
        <div
          className="flex h-full w-[200%] animate-[medoca-scroll_var(--pulse-cycle)_linear_infinite]"
          style={{ ["--pulse-cycle" as string]: `${cycleSeconds.toFixed(2)}s` }}
        >
          <Trace path={path} />
          <Trace path={path} />
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
