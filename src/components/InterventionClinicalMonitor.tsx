import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Minus,
  Radio,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { InterventionPhase } from "@/features/intervention-domain";
import { formatClinicalVital } from "@/features/intervention-clinical-engine";
import type {
  ClinicalHandoverAssessment,
  ClinicalOutcome,
  ClinicalPatientState,
  ClinicalVitalTrend,
} from "@/features/intervention-clinical-domain";

interface Props {
  clinicalState: ClinicalPatientState;
  phase: InterventionPhase;
  canReassess: boolean;
  onReassess: () => void;
}

const OUTCOME_STYLES: Record<ClinicalOutcome, { label: string; className: string }> = {
  unstable: { label: "Instable", className: "border-amber-300/20 bg-amber-300/10 text-amber-200" },
  improving: {
    label: "Amélioration",
    className: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  },
  stabilized: {
    label: "Stabilisé",
    className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  },
  deteriorating: {
    label: "Aggravation",
    className: "border-orange-300/20 bg-orange-300/10 text-orange-200",
  },
  failed: { label: "Échec clinique", className: "border-rose-300/25 bg-rose-400/10 text-rose-200" },
};

function TrendIcon({ trend }: { trend: ClinicalVitalTrend }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4" aria-label="En hausse" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4" aria-label="En baisse" />;
  return <Minus className="h-4 w-4" aria-label={trend === "stable" ? "Stable" : "Non évalué"} />;
}

export function InterventionClinicalMonitor({
  clinicalState,
  phase,
  canReassess,
  onReassess,
}: Props) {
  const outcome = OUTCOME_STYLES[clinicalState.outcome];
  const showHandover = ["decision", "transport", "debrief"].includes(phase);

  return (
    <div className="mb-4 grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
      <section
        aria-labelledby="clinical-monitor-title"
        className="rounded-[1.5rem] border border-cyan-300/15 bg-slate-950/85 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Surveillance clinique
            </p>
            <h3
              id="clinical-monitor-title"
              className="mt-1 font-display text-xl font-black text-white"
            >
              Constantes dynamiques
            </h3>
          </div>
          <div
            aria-live="polite"
            className={`rounded-full border px-3 py-1.5 text-xs font-black ${outcome.className}`}
          >
            {outcome.label} · {clinicalState.overallState}/100
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {clinicalState.vitals.map((vital, index) => (
            <div
              key={`${vital.sourceLabel}:${index}`}
              className="rounded-xl border border-white/8 bg-white/[0.035] p-3"
            >
              <div className="flex items-center justify-between gap-2 text-slate-500">
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {vital.label}
                </span>
                <span
                  className={
                    vital.trend === "stable" || vital.trend === "unknown"
                      ? "text-slate-500"
                      : vital.tone === "critical"
                        ? "text-rose-300"
                        : "text-cyan-300"
                  }
                >
                  <TrendIcon trend={vital.trend} />
                </span>
              </div>
              <div className="mt-2 text-base font-black text-white">
                {formatClinicalVital(vital)}
              </div>
              <div className="mt-1 text-[9px] font-bold text-slate-500">
                {vital.status === "pending"
                  ? "Mesure attendue"
                  : vital.status === "qualitative"
                    ? "Observation clinique"
                    : "Mesure simulée"}
              </div>
            </div>
          ))}
        </div>

        {clinicalState.failureReason && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-300/20 bg-rose-400/[0.08] p-3 text-sm text-rose-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{clinicalState.failureReason}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onReassess}
          disabled={!canReassess || clinicalState.outcome === "failed"}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 text-sm font-black text-cyan-100 outline-none transition hover:bg-cyan-300/[0.13] focus-visible:ring-4 focus-visible:ring-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
        >
          <RefreshCcw className="h-4 w-4" /> Réévaluer les constantes
        </button>
        <p className="mt-2 text-xs text-slate-500">
          {clinicalState.reassessmentCount} réévaluation(s) enregistrée(s). Une surveillance répétée
          alimente la transmission.
        </p>
      </section>

      {showHandover ? (
        <RegulatorHandoverPanel assessment={clinicalState.handover} />
      ) : (
        <aside className="rounded-[1.5rem] border border-white/8 bg-slate-950/70 p-4 sm:p-5">
          <div className="flex items-center gap-2 font-black text-white">
            <Activity className="h-5 w-5 text-cyan-300" /> Première impression
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Sécurise la scène, recherche les menaces vitales selon l’ABCDE, relève les constantes,
            interroge, agit puis réévalue avant la transmission.
          </p>
        </aside>
      )}
    </div>
  );
}

export function RegulatorHandoverPanel({ assessment }: { assessment: ClinicalHandoverAssessment }) {
  return (
    <section
      aria-labelledby="regulator-handover-title"
      className="rounded-[1.5rem] border border-violet-300/15 bg-violet-300/[0.055] p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-violet-200">
            <Radio className="h-5 w-5" />
            <h3
              id="regulator-handover-title"
              className="font-display text-lg font-black text-white"
            >
              Bilan au régulateur
            </h3>
          </div>
          <p className="mt-1 text-xs text-violet-100/60">Complétude {assessment.completeness}%</p>
        </div>
        <div className="rounded-full bg-violet-300/10 px-2.5 py-1 text-xs font-black text-violet-100">
          {assessment.fields.filter((field) => field.complete).length}/{assessment.fields.length}
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {assessment.fields.map((field) => (
          <li key={field.id} className="flex items-center gap-2 text-xs text-slate-300">
            {field.complete ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
            )}
            {field.label}
          </li>
        ))}
      </ul>
      {assessment.regulatorQuestions.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.07] p-3">
          <div className="text-[9px] font-black uppercase tracking-wider text-amber-200">
            Questions du médecin régulateur
          </div>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed text-amber-50/80">
            {assessment.regulatorQuestions.map((question) => (
              <li key={question}>— {question}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
