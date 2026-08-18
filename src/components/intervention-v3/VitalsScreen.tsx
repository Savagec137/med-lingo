import {
  Activity,
  Brain,
  Check,
  Droplet,
  Frown,
  Gauge,
  Hand,
  HeartPulse,
  Stethoscope,
  Thermometer,
  Wind,
} from "lucide-react";
import type {
  EquipmentChipModel,
  QuickMeasureModel,
  VitalsScreenModel,
} from "@/features/intervention-v3/ui/vitals-screen";
import { MeasurementAnimation } from "./monitoring/MeasurementAnimation";
import { MonitoringStatusBadge } from "./monitoring/MonitoringStatusBadge";
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

/**
 * Le tracé qui accompagne une carte, s'il y en a un.
 *
 * La correspondance est courte et explicite : l'onde pléthysmographique
 * accompagne la saturation et le pouls, qu'un même capteur porte ; le tracé
 * respiratoire accompagne la fréquence comptée. Toutes les autres cartes — la
 * tension, la glycémie, la température — n'en ont aucun, parce qu'aucun appareil
 * ne les suit en continu et qu'une courbe leur donnerait une nature qu'elles
 * n'ont pas.
 */
function traceFor(factId: string, model: VitalsScreenModel) {
  const waveform = model.monitoring.waveform;
  if (!waveform) return null;
  if (SENSOR_FACT_IDS.has(factId)) return waveform.pulse;
  if (factId === "fact.fr") return waveform.respiration;
  return null;
}

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

      {/* Le bandeau du moniteur. Il parle de l'appareil — « saturomètre non
          posé », « acquisition du signal », « signal faible » — et jamais du
          patient : annoncer « patient stable » donnerait la conclusion que le
          joueur doit tirer lui-même de ses mesures. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Surveillance
          </p>
          <p className="text-sm font-bold text-slate-200">{model.monitoring.statusLabel}</p>
          {model.monitoring.sensors.length > 0 && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              {model.monitoring.sensors
                .map((sensor) => `${sensor.label} — ${sensor.qualityLabel}`)
                .join(" · ")}
            </p>
          )}
        </div>
        {model.sensorControls.map((control) => (
          <button
            key={control.id}
            type="button"
            disabled={!control.enabled}
            onClick={() => onMeasure(control.id)}
            title={control.disabledReason ?? undefined}
            className="press shrink-0 rounded-full border border-red-400/40 bg-red-400/[0.08] px-3 py-1.5 text-xs font-black text-red-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-500"
          >
            {control.label}
          </button>
        ))}
      </div>

      {/* Ce que le temps a périmé. Les mesures restent affichées — les effacer
          reprendrait au joueur ce qu'il a relevé — mais elles sont nommées comme
          datées, et c'est ce qui déclenche la réévaluation. */}
      {model.monitoring.stale.length > 0 && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] px-3 py-2 text-xs font-bold text-amber-200">
          À réévaluer : {model.monitoring.stale.map((entry) => entry.label).join(", ")}
        </p>
      )}

      {pendingMeasure && (
        <MeasurementAnimation
          kind={pendingMeasure.actionId === "action.faire-glycemie" ? "glucose" : "blood_pressure"}
          inProgress
          durationSeconds={pendingMeasure.durationSeconds}
          reducedMotion={reducedMotion}
        />
      )}

      {/* Deux colonnes dès le mobile, comme la maquette : les cartes SpO₂ et
          pouls s'y lisent côte à côte, tracé compris. */}
      <Panel title="Signes vitaux">
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {model.vitals.map((card) => (
            <li key={card.factId}>
              <VitalCard
                card={card}
                pulseBpm={model.monitoring.pulseBpm}
                reducedMotion={reducedMotion}
                trace={traceFor(card.factId, model)}
              />
            </li>
          ))}
        </ul>
      </Panel>

      {/* Les gestes de capteur ne figurent plus ici : ils vivent dans le bandeau
          de surveillance, à côté de l'état qu'ils changent. Les mêler aux mesures
          laisserait croire que retirer un capteur relève une constante. */}
      <Panel title="Mesures rapides">
        <ul className="grid grid-cols-3 gap-2">
          {model.quickMeasures.map((measure) => (
            <li key={measure.id}>
              <MeasureButton measure={measure} onClick={() => onMeasure(measure.id)} />
            </li>
          ))}
        </ul>
      </Panel>

      {model.communications.length > 0 && (
        <Panel title="Communication">
          <ul className="grid gap-2 sm:grid-cols-2">
            {model.communications.map((measure) => (
              <li key={measure.id}>
                <MeasureButton measure={measure} onClick={() => onMeasure(measure.id)} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

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

/**
 * Icône d'une mesure, comme sur la maquette.
 *
 * La table est indexée par l'identifiant de l'action, pas par un mot du libellé :
 * une correspondance sur le texte se casserait à la première reformulation, et
 * silencieusement — la carte perdrait son icône sans que rien ne le signale.
 * Une action sans entrée retombe sur le stéthoscope.
 */
const MEASURE_ICONS: Record<string, typeof Activity> = {
  "action.poser-saturometre": Activity,
  "action.retirer-saturometre": Activity,
  "action.prendre-tension": Gauge,
  "action.compter-fr": Wind,
  "action.faire-glycemie": Droplet,
  "action.prendre-temperature": Thermometer,
  "action.palper-pouls": HeartPulse,
  "action.evaluer-douleur": Frown,
  "action.evaluer-conscience": Brain,
  "action.observer-peau": Hand,
};

function MeasureButton({ measure, onClick }: { measure: QuickMeasureModel; onClick: () => void }) {
  const Icon = MEASURE_ICONS[measure.id] ?? Stethoscope;
  return (
    <button
      type="button"
      disabled={!measure.enabled}
      onClick={onClick}
      title={measure.disabledReason ?? undefined}
      className="press flex h-full w-full flex-col gap-1 rounded-2xl border border-white/8 bg-white/[0.03] px-2.5 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-55"
    >
      <div className="flex items-center justify-between gap-1">
        <Icon className="h-4 w-4 shrink-0 text-cyan-300/80" aria-hidden="true" />
        {measure.alreadyDone && (
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-label="Déjà relevée" />
        )}
      </div>
      <p className="text-[13px] font-bold leading-tight text-slate-100">{measure.label}</p>
      <p className="text-[11px] leading-tight text-slate-400">{measure.hint}</p>
      {measure.disabledReason && (
        <p className="mt-auto text-[10px] font-bold leading-tight text-amber-300/80">
          {measure.disabledReason}
        </p>
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
