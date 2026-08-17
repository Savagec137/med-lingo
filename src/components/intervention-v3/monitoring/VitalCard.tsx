import type { VitalCardModel } from "@/features/intervention-v3/ui/vitals-screen";
import { PulseBeat } from "./PulseWaveform";
import { StaleVitalIndicator } from "./StaleVitalIndicator";

/**
 * Une carte de constante.
 *
 * Elle affiche ce que le modèle lui donne, et rien d'autre. Quand la constante
 * n'est pas relevée, elle montre le gabarit du registre — « --/-- », « --,- » —
 * qui ne contient jamais de chiffre. C'est la règle centrale du mode, tenue
 * jusqu'au dernier composant.
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
  /** Reprendre la mesure. Absent si aucune action ne le permet à cette étape. */
  onReevaluate?: (() => void) | undefined;
}

const SEVERITY_TONES: Record<string, string> = {
  normal: "text-slate-100",
  warning: "text-amber-200",
  critical: "text-red-300",
};

export function VitalCard({ card, pulseBpm, reducedMotion, onReevaluate }: Props) {
  const tone = card.measured ? (SEVERITY_TONES[card.severity ?? "normal"] ?? "text-slate-100") : "";

  return (
    <article
      className={`rounded-2xl border px-3 py-3 ${
        card.isStale
          ? "border-amber-400/35 bg-amber-400/[0.04]"
          : card.measured
            ? "border-white/8 bg-white/[0.03]"
            : "border-white/5 bg-white/[0.015]"
      }`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
          {card.label}
        </h3>
        <PulseBeat pulseBpm={pulseBpm} isLive={card.isLive} reducedMotion={reducedMotion} />
      </header>

      <p className="mt-1 flex items-baseline gap-1">
        <span
          className={`text-2xl font-black tabular-nums ${card.measured ? tone : "text-slate-600"}`}
        >
          {card.value}
        </span>
        {card.unit && <span className="text-xs font-bold text-slate-500">{card.unit}</span>}
      </p>

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

      <StaleVitalIndicator
        isStale={card.isStale}
        ageSeconds={card.ageSeconds}
        reducedMotion={reducedMotion}
        onReevaluate={onReevaluate}
      />
    </article>
  );
}
