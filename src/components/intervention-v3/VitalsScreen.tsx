import { Check, Stethoscope } from "lucide-react";
import type {
  EquipmentChipModel,
  QuickMeasureModel,
  VitalsScreenModel,
} from "@/features/intervention-v3/ui/vitals-screen";
import { MeasurementAnimation } from "./monitoring/MeasurementAnimation";
import { MonitoringStatusBadge } from "./monitoring/MonitoringStatusBadge";
import { PulseWaveform } from "./monitoring/PulseWaveform";
import { RespiratoryWaveform } from "./monitoring/RespiratoryWaveform";
import { useReducedMotion } from "./monitoring/use-reduced-motion";
import { VitalCard } from "./monitoring/VitalCard";

/**
 * Écran 3 — « Constantes en direct ».
 *
 * Un moniteur de patient, qui ne montre que ce que le joueur a relevé. Les ondes
 * ne battent qu'à des cadences mesurées ; sans mesure il n'y a pas d'onde, et
 * sans capteur posé il n'y a pas de surveillance continue. Ces deux verrous sont
 * dans le modèle, pas ici — le composant ne fait que les respecter.
 *
 * Deux panneaux de matériel, jamais mélangés : « Matériel embarqué » dit ce que
 * l'équipe a, « Matériel utilisé » ce qu'elle a sorti.
 */

interface Props {
  model: VitalsScreenModel;
  /** Geste en cours, pour l'animation de mesure. Nul quand rien ne tourne. */
  pendingMeasure: { actionId: string; durationSeconds: number } | null;
  onMeasure: (actionId: string) => void;
  onEvaluate: (actionId: string) => void;
}

const SENSOR_FACT_IDS = new Set(["fact.spo2", "fact.fc"]);

export function VitalsScreen({ model, pendingMeasure, onMeasure, onEvaluate }: Props) {
  const reducedMotion = useReducedMotion();
  const anySensorUsed = model.usedEquipment.some((chip) => SENSOR_FACT_IDS.size > 0 && chip.used);
  const monitoringState = model.monitoring.anyLive
    ? "live"
    : anySensorUsed
      ? "interrupted"
      : "never";

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300/70">
            {model.eyebrow}
          </p>
          <h1 className="text-xl font-black text-slate-100">{model.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <MonitoringStatusBadge
            state={monitoringState}
            reducedMotion={reducedMotion}
            liveCount={model.monitoring.liveFactIds.length}
          />
          <span className="text-xs font-black tabular-nums text-slate-400">
            {model.measuredCount} / {model.expectedCount}
          </span>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-slate-300/90">{model.narrative}</p>

      {/* Les ondes. Elles ne s'affichent que si le modèle donne une cadence, et le
          modèle n'en donne une qu'après la mesure correspondante. */}
      <div className="grid gap-2 sm:grid-cols-2">
        <figure className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
          <figcaption className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Onde de pouls
          </figcaption>
          <PulseWaveform
            pulseBpm={model.monitoring.pulseBpm}
            isLive={model.monitoring.anyLive}
            reducedMotion={reducedMotion}
          />
        </figure>
        <figure className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
          <figcaption className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Rythme respiratoire
          </figcaption>
          <RespiratoryWaveform
            respiratoryRatePerMinute={model.monitoring.respiratoryRatePerMinute}
            reducedMotion={reducedMotion}
          />
        </figure>
      </div>

      {pendingMeasure && (
        <MeasurementAnimation
          kind={pendingMeasure.actionId === "action.faire-glycemie" ? "glucose" : "blood_pressure"}
          inProgress
          durationSeconds={pendingMeasure.durationSeconds}
          reducedMotion={reducedMotion}
        />
      )}

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {model.vitals.map((card) => (
          <li key={card.factId}>
            <VitalCard
              card={card}
              pulseBpm={model.monitoring.pulseBpm}
              reducedMotion={reducedMotion}
            />
          </li>
        ))}
      </ul>

      <Panel title="Mesures rapides">
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...model.quickMeasures, ...model.sensorControls].map((measure) => (
            <li key={measure.id}>
              <MeasureButton measure={measure} onClick={() => onMeasure(measure.id)} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Évaluations cliniques">
        <ul className="flex flex-col gap-2">
          {model.evaluations.map((entry) => (
            <li
              key={entry.factId}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {entry.label}
                </p>
                <p
                  className={`mt-0.5 truncate text-xs ${entry.known ? "text-slate-200" : "text-slate-500"}`}
                >
                  {entry.value}
                </p>
              </div>
              {entry.action && (
                <button
                  type="button"
                  disabled={!entry.action.enabled}
                  onClick={() => onEvaluate(entry.action!.id)}
                  title={entry.action.disabledReason ?? undefined}
                  className="press shrink-0 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {entry.action.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      {/* Deux panneaux, jamais confondus. Le tensiomètre resté dans le sac est
          « embarqué, non utilisé » — pas « utilisé ». */}
      <Panel title={model.equipmentPanelLabels.carried}>
        <EquipmentList chips={model.carriedEquipment} />
      </Panel>
      {model.usedEquipment.length > 0 && (
        <Panel title={model.equipmentPanelLabels.used}>
          <EquipmentList chips={model.usedEquipment} />
        </Panel>
      )}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function MeasureButton({ measure, onClick }: { measure: QuickMeasureModel; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={!measure.enabled}
      onClick={onClick}
      className="press w-full rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-55"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-100">{measure.label}</p>
        {measure.alreadyDone && (
          <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-label="Déjà relevée" />
        )}
      </div>
      <p className="mt-0.5 text-xs text-slate-400">{measure.hint}</p>
      {measure.equipment.length > 0 && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <Stethoscope className="h-3 w-3" aria-hidden="true" />
          {measure.equipment.join(", ")}
        </p>
      )}
      {measure.disabledReason && (
        <p className="mt-1 text-[11px] font-bold text-amber-300/80">{measure.disabledReason}</p>
      )}
    </button>
  );
}

function EquipmentList({ chips }: { chips: EquipmentChipModel[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li
          key={chip.id}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px]"
        >
          <span className="font-bold text-slate-200">{chip.label}</span>
          <span
            className={`font-black ${
              chip.state === "attached"
                ? "text-emerald-300"
                : chip.state === "unused"
                  ? "text-amber-300/80"
                  : "text-slate-500"
            }`}
          >
            {chip.stateLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}
