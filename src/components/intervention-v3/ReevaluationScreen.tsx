import { AlertOctagon, Check, Clock, RefreshCw, Truck, UserPlus } from "lucide-react";
import type {
  ConstantFreshness,
  ReevaluationRowModel,
  ReevaluationScreenModel,
} from "@/features/intervention-v3/ui/reevaluation-screen";

/**
 * Écran 6 — « Réévaluation patient ».
 *
 * L'écran qui rend le temps visible. Trois états, et il faut les trois : à jour,
 * datée, jamais mesurée. Les deux dernières se ressemblent et ne se corrigent pas
 * de la même façon — l'une se remesure, l'autre se mesure pour la première fois.
 *
 * L'avertissement de départ vient du modèle, jamais d'un seuil réécrit ici : si
 * la sanction change, l'avertissement change avec elle. Un écran qui annoncerait
 * un coût périmé serait pire que muet.
 */

interface Props {
  model: ReevaluationScreenModel;
  /** Reprendre une constante datée ou manquante. */
  onRefresh: (actionId: string) => void;
  /** Clore le cycle de réévaluation. */
  onValidate: () => void;
  /** Engager le transport, avec le coût que le modèle annonce. */
  onPrepareTransport: () => void;
}

const FRESHNESS_TONES: Record<ConstantFreshness, string> = {
  fresh: "border-emerald-400/25 bg-emerald-400/[0.05]",
  stale: "border-amber-400/35 bg-amber-400/[0.06]",
  never: "border-white/8 bg-white/[0.02]",
};

const FRESHNESS_TEXT: Record<ConstantFreshness, string> = {
  fresh: "text-emerald-300",
  stale: "text-amber-300",
  never: "text-slate-500",
};

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  return `${Math.round(seconds / 60)} min`;
}

export function ReevaluationScreen({ model, onRefresh, onValidate, onPrepareTransport }: Props) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300/70">
            {model.eyebrow}
          </p>
          <h1 className="text-xl font-black text-slate-100">{model.title}</h1>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-slate-300">
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
          {model.reinforcementLabel}
        </span>
      </header>

      <p className="text-sm leading-relaxed text-slate-300/90">{model.narrative}</p>

      <dl className="grid grid-cols-3 gap-2">
        <Counter label="À réévaluer" value={model.staleCount} tone="text-amber-300" />
        <Counter label="Jamais mesurées" value={model.missingCount} tone="text-slate-400" />
        <Counter label="Reprises" value={model.refreshedCount} tone="text-emerald-300" />
      </dl>

      <ul className="flex flex-col gap-2">
        {model.rows.map((row) => (
          <li key={row.factId}>
            <ConstantRow row={row} onRefresh={onRefresh} />
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={!model.canValidate}
        onClick={onValidate}
        className="press rounded-2xl bg-cyan-400/90 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-slate-500"
      >
        {model.canValidate
          ? `Valider la réévaluation${model.cycle > 0 ? ` · cycle ${model.cycle}` : ""}`
          : (model.validationBlockedReason ?? "Réévaluation indisponible")}
      </button>

      <TransportGate transport={model.transport} onPrepareTransport={onPrepareTransport} />
    </section>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
      <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-lg font-black tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

function ConstantRow({
  row,
  onRefresh,
}: {
  row: ReevaluationRowModel;
  onRefresh: (actionId: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${FRESHNESS_TONES[row.freshness]}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-100">{row.label}</p>
        <p
          className={`mt-0.5 flex items-center gap-1 text-[11px] font-bold ${FRESHNESS_TEXT[row.freshness]}`}
        >
          {row.freshness === "stale" && <Clock className="h-3 w-3" aria-hidden="true" />}
          {row.freshness === "fresh" && <Check className="h-3 w-3" aria-hidden="true" />}
          {row.freshnessLabel}
          {/* L'âge, jamais la valeur : l'écran dit depuis quand, pas combien. */}
          {row.ageSeconds !== null && row.freshness === "stale" && (
            <span className="tabular-nums"> · {formatAge(row.ageSeconds)}</span>
          )}
          {row.refreshed && <span className="text-emerald-300"> · reprise</span>}
        </p>
      </div>

      {/* Une donnée à jour ne propose pas de la reprendre : ce serait inviter à un
          geste inutile qui coûterait du temps. */}
      {row.action && (
        <button
          type="button"
          disabled={!row.action.enabled}
          onClick={() => onRefresh(row.action!.id)}
          className="press flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          title={row.action.disabledReason ?? undefined}
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          {row.action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Ce qu'un départ coûterait.
 *
 * Le mode laisse partir : il ne cache pas le prix. Le bouton reste actif même
 * quand le départ est une faute grave — retirer le bouton retirerait la décision,
 * et c'est la décision qui s'apprend.
 */
function TransportGate({
  transport,
  onPrepareTransport,
}: {
  transport: ReevaluationScreenModel["transport"];
  onPrepareTransport: () => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      {transport.warning && (
        <p
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
            transport.graveFault
              ? "border-red-400/30 bg-red-400/[0.07] text-red-200"
              : "border-amber-400/25 bg-amber-400/[0.06] text-amber-200"
          }`}
        >
          <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {transport.warning}
        </p>
      )}
      <button
        type="button"
        onClick={onPrepareTransport}
        className={`press flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${
          transport.ready
            ? "bg-emerald-400/90 text-slate-950"
            : "border border-white/12 bg-white/[0.05] text-slate-200"
        }`}
      >
        <Truck className="h-4 w-4" aria-hidden="true" />
        Préparer le transport
      </button>
    </section>
  );
}
