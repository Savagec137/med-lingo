import type { VitalCardModel, WaveformTrace } from "@/features/intervention-v3/ui/vitals-screen";
import { PulseBeat } from "./PulseWaveform";
import { tracePath } from "./trace-path";
import { StaleVitalIndicator } from "./StaleVitalIndicator";

/**
 * Une carte de constante.
 *
 * Elle affiche ce que le modèle lui donne, et rien d'autre. Quand la constante
 * n'est pas relevée, elle montre le gabarit du registre — « --/-- », « --,- » —
 * qui ne contient jamais de chiffre. C'est la règle centrale du mode, tenue
 * jusqu'au dernier composant.
 *
 * La maquette place le tracé **dans** la carte, à droite de la valeur, et non
 * dans une vignette séparée. Ce n'est pas qu'une question de place : une onde
 * détachée de son chiffre laisse croire qu'elle décrit le patient en général,
 * alors qu'elle décrit cette constante-là.
 *
 * La pulsation ne bat que si la carte est sous surveillance continue **et** que
 * le pouls a été relevé. Une carte de tension ne bat jamais : une mesure au
 * brassard vaut pour l'instant où elle a été prise.
 */

interface Props {
  card: VitalCardModel;
  /**
   * Cadence de la pulsation, en battements par minute. Vient du pouls mesuré et
   * de lui seul ; `null` tant qu'il ne l'est pas.
   */
  pulseBpm: number | null;
  reducedMotion: boolean;
  /** Tracé du moteur pour cette constante. Absent, la carte n'en dessine aucun. */
  trace?: WaveformTrace | null;
  /** Reprendre la mesure. Absent si aucune action ne le permet à cette étape. */
  onReevaluate?: (() => void) | undefined;
}

const SEVERITY_TONES: Record<string, string> = {
  normal: "text-emerald-300",
  warning: "text-amber-200",
  critical: "text-red-300",
};

/**
 * Le mot que la maquette place sous la valeur.
 *
 * Il traduit un seuil d'alerte du moteur clinique, et non la plage de référence
 * affichée juste en dessous : les deux notions diffèrent, et un pouls à 105 est
 * hors norme sans être encore inquiétant.
 */
const SEVERITY_LABELS: Record<string, string> = {
  normal: "Normal",
  warning: "À surveiller",
  critical: "Critique",
};

/**
 * Ce que la carte dit d'un signal imparfait.
 *
 * Court et actionnable : « repositionner le capteur » est une consigne, pas un
 * constat. Aucune de ces phrases ne parle du patient.
 */
const SIGNAL_QUALITY_NOTES: Record<string, string> = {
  weak: "Signal faible — repositionner",
  artifact: "Mouvement du patient",
  measuring: "Mesure en cours…",
  lost: "Aucun signal",
};

/** Le tracé inline de la carte, dessiné à partir des points du moteur. */
function CardTrace({
  trace,
  reducedMotion,
  stroke,
}: {
  trace: WaveformTrace;
  reducedMotion: boolean;
  stroke: string;
}) {
  const path = tracePath(trace.points);
  if (!path) return null;
  return (
    <div className="relative h-8 min-w-0 flex-1 overflow-hidden" aria-hidden="true">
      <div
        className={`flex h-full w-[200%] ${
          reducedMotion ? "" : "animate-[medoca-scroll_var(--trace-window)_linear_infinite]"
        }`}
        style={{ ["--trace-window" as string]: `${trace.windowSeconds.toFixed(2)}s` }}
      >
        {[0, 1].map((index) => (
          <svg
            key={index}
            viewBox="0 0 100 40"
            className="h-full w-1/2 shrink-0"
            preserveAspectRatio="none"
          >
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ))}
      </div>
    </div>
  );
}

export function VitalCard({ card, pulseBpm, reducedMotion, trace, onReevaluate }: Props) {
  const severity = card.severity ?? "normal";
  const tone = card.measured ? (SEVERITY_TONES[severity] ?? "text-slate-100") : "";

  return (
    <article
      className={`h-full rounded-2xl border px-3 py-3 ${
        card.isStale
          ? "border-amber-400/35 bg-amber-400/[0.04]"
          : card.measured
            ? "border-white/8 bg-white/[0.03]"
            : "border-white/5 bg-white/[0.015]"
      }`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="truncate text-[11px] font-black uppercase tracking-wider text-slate-400">
          {card.label}
        </h3>
        <PulseBeat pulseBpm={pulseBpm} isLive={card.isLive} reducedMotion={reducedMotion} />
      </header>

      <div className="mt-1 flex items-center gap-2">
        <p className="flex shrink-0 items-baseline gap-1">
          <span
            className={`text-2xl font-black tabular-nums ${card.measured ? "text-slate-100" : "text-slate-600"}`}
          >
            {card.value}
          </span>
          {card.unit && <span className="text-xs font-bold text-slate-500">{card.unit}</span>}
        </p>
        {/* Le tracé n'apparaît que si le moteur en fournit un, c'est-à-dire après
            la mesure et capteur en place. */}
        {card.measured && trace && trace.points.length > 1 && (
          <CardTrace
            trace={trace}
            reducedMotion={reducedMotion}
            // Le souffle et le pouls ne se confondent pas : deux teintes, pour
            // qu'un coup d'œil suffise à savoir ce que la courbe décrit.
            stroke={card.factId === "fact.fr" ? "oklch(0.8 0.11 240)" : "oklch(0.78 0.15 165)"}
          />
        )}
      </div>

      {card.measured && (
        <p className={`mt-0.5 text-[11px] font-black ${tone}`}>
          {SEVERITY_LABELS[severity] ?? severity}
        </p>
      )}

      {/* Une valeur non relevée dit pourquoi elle manque : « Non mesurée » n'est
          pas « Glucomètre non embarqué », et les deux ne se corrigent pas
          pareil. */}
      {!card.measured && card.missingLabel && (
        <p
          className={`mt-0.5 text-[11px] font-bold ${
            card.outOfReach ? "text-slate-600" : "text-slate-500"
          }`}
        >
          {card.missingLabel}
        </p>
      )}

      {card.measured && card.secondaryValue && (
        <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">{card.secondaryValue}</p>
      )}

      {card.measured && card.delta && (
        <p className="mt-0.5 text-[11px] font-bold text-slate-400 tabular-nums">
          {card.trend === "stable" ? "Stable" : card.delta}
        </p>
      )}

      {/* La plage de référence n'apparaît **que sous une valeur**.
          C'est une connaissance de formation, identique pour tous les patients,
          donc sans risque de fuite ; mais sur une carte vide, elle remplissait la
          grille de chiffres avant la première mesure et brouillait ce qui fait la
          force de cet écran : une grille vierge où seul le gabarit se lit. */}
      {card.measured && card.referenceRange && (
        <p className="mt-0.5 text-[10px] font-semibold text-slate-500 tabular-nums">
          {card.referenceRange}
        </p>
      )}

      {/* La qualité du signal décrit l'appareil, jamais le patient : un capteur
          mal placé sur quelqu'un qui va très bien est une situation banale. */}
      {card.isLive && card.signalQuality && card.signalQuality !== "good" && (
        <p className="mt-1 text-[10px] font-bold text-amber-300/80">
          {SIGNAL_QUALITY_NOTES[card.signalQuality]}
        </p>
      )}

      <StaleVitalIndicator
        isStale={card.isStale}
        ageSeconds={card.ageSeconds}
        reducedMotion={reducedMotion}
        onReevaluate={onReevaluate}
      />
    </article>
  );
}
