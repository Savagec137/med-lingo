import {
  Activity,
  ArrowLeft,
  Brain,
  Check,
  Droplet,
  Frown,
  Gauge,
  Hand,
  HeartPulse,
  Info,
  MessageCircle,
  RotateCcw,
  Stethoscope,
  Thermometer,
  User,
  Wind,
} from "lucide-react";
import sceneBackdrop from "@/assets/game/bg-ambulance.jpg";
import type {
  EquipmentCheckModel,
  PatientReadoutLine,
  QuickMeasureModel,
  VitalsScreenModel,
} from "@/features/intervention-v3/ui/vitals-screen";
import { MeasurementAnimation } from "./monitoring/MeasurementAnimation";
import { PlethCanvas } from "./monitoring/PlethCanvas";
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
 * L'ordre suit la maquette : en-tête, bloc patient avec ses deux panneaux
 * flottants, signes vitaux surveillés, bandeau du capteur, autres constantes,
 * puis les actions séparées en mesures et évaluations.
 */

interface Props {
  model: VitalsScreenModel;
  /** Geste en cours, pour l'animation de mesure. Nul quand rien ne tourne. */
  pendingMeasure: { actionId: string; durationSeconds: number } | null;
  onMeasure: (actionId: string) => void;
  onEvaluate: (actionId: string) => void;
  /** Revenir en arrière. Absent si l'écran n'a rien derrière lui. */
  onBack?: (() => void) | undefined;
  /** Reprendre la mission depuis le début. */
  onRestart?: (() => void) | undefined;
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

export function VitalsScreen({
  model,
  pendingMeasure,
  onMeasure,
  onEvaluate,
  onBack,
  onRestart,
}: Props) {
  const reducedMotion = useReducedMotion();
  const monitored = model.monitoring.anyLive;

  return (
    <section className="flex flex-col gap-4">
      {/* En-tête de la maquette : retour, titre, sous-titre, réinitialiser, et
          une pastille d'état qui parle du capteur et jamais du patient. */}
      <header className="rounded-2xl border border-white/8 bg-white/[0.025] px-3 py-3">
        <div className="flex items-start gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Revenir en arrière"
              className="press shrink-0 rounded-xl border border-white/12 bg-white/[0.05] p-2 text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-black uppercase tracking-wide text-white">
              {model.title}
            </h1>
            <p className="text-xs font-bold text-cyan-300/80">{model.subtitle}</p>
          </div>
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              aria-label="Réinitialiser la mission"
              className="press shrink-0 rounded-xl border border-white/12 bg-white/[0.05] p-2 text-slate-300"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-300">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              monitored ? `bg-emerald-400 ${reducedMotion ? "" : "animate-pulse"}` : "bg-slate-600"
            }`}
            aria-hidden="true"
          />
          {model.monitoring.statusLabel}
          <span className="ml-auto tabular-nums text-slate-500">
            {model.measuredCount} / {model.expectedCount}
          </span>
        </p>
      </header>

      {/* Le bloc patient. Deux panneaux flottants sur la scène : ce que l'on sait
          du patient à gauche, ce que l'on a sorti du sac à droite. */}
      <div className="relative min-h-[9.5rem] overflow-hidden rounded-2xl border border-white/8">
        <img
          src={sceneBackdrop}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/85"
          aria-hidden="true"
        />
        <div className="relative flex items-start justify-between gap-2 p-2.5">
          <PatientReadoutPanel lines={model.patientReadout} />
          <EquipmentPanel checks={model.equipmentChecks} />
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-300/90">{model.narrative}</p>

      {/* « Signes vitaux » : la maquette n'y met que les constantes qu'un capteur
          tient à jour, en deux grandes cartes avec leur tracé.

          Le tracé large au-dessus vient du prototype Bolt : un vrai moniteur
          montre l'onde en grand, pas seulement une vignette dans une carte. Il
          reste muet tant que le pouls n'a pas été relevé. */}
      {model.monitoredVitals.length > 0 && (
        <Panel title="Signes vitaux">
          <PlethCanvas
            trace={model.monitoring.waveform?.pulse ?? null}
            reducedMotion={reducedMotion}
            placeholder={monitored ? "Aucune constante relevée" : "Saturomètre non posé"}
          />
          <ul className="grid grid-cols-2 gap-2">
            {model.monitoredVitals.map((card) => (
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
      )}

      {/* Le bandeau du capteur. Il parle de l'appareil et jamais du patient :
          annoncer « patient stable » donnerait la conclusion que le joueur doit
          tirer lui-même de ses mesures. */}
      {model.sensorControls.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/8 bg-white/[0.025] px-3 py-2.5">
          <p className="flex min-w-0 flex-1 items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300/80" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-100">
                {monitored ? "Le saturomètre est posé." : "Le saturomètre n'est pas posé."}
              </span>
              <span className="block text-xs text-slate-400">
                {monitored
                  ? "Retirez-le pour arrêter la mesure."
                  : "Posez-le pour suivre la SpO₂ et le pouls."}
              </span>
            </span>
          </p>
          {model.sensorControls.map((control) => (
            <button
              key={control.id}
              type="button"
              disabled={!control.enabled}
              onClick={() => onMeasure(control.id)}
              title={control.disabledReason ?? undefined}
              className="press shrink-0 rounded-full border border-red-400/40 bg-red-400/[0.08] px-3 py-1.5 text-[11px] font-black leading-tight text-red-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-500"
            >
              {control.label}
            </button>
          ))}
        </div>
      )}

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

      {model.otherVitals.length > 0 && (
        <Panel title="Autres constantes">
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {model.otherVitals.map((card) => (
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
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-cyan-300/80">
          Actions et mesures
        </h2>

        {/* Les gestes de capteur ne figurent pas ici : ils vivent dans le bandeau
            de surveillance, à côté de l'état qu'ils changent. Les mêler aux
            mesures laisserait croire que retirer un capteur relève une constante. */}
        <Panel title="Mesures rapides">
          <ul className="grid grid-cols-3 gap-2">
            {model.quickMeasures.map((measure) => (
              <li key={measure.id}>
                <MeasureButton measure={measure} onClick={() => onMeasure(measure.id)} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Évaluations cliniques">
          <ul className="grid grid-cols-3 gap-2">
            {model.clinicalAssessments.map((measure) => (
              <li key={measure.id}>
                <MeasureButton measure={measure} onClick={() => onEvaluate(measure.id)} />
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
      </section>

      {/* Le détail de ce qui a été recueilli, sous les cartes : la maquette le
          garde hors de l'écran principal, mais le retirer priverait le joueur du
          seul endroit où il relit ses constats en clair. */}
      <Panel title="Recueil du patient">
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
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Les panneaux flottants                                                     */
/* -------------------------------------------------------------------------- */

const PATIENT_READOUT_ICONS = {
  stabilite: HeartPulse,
  conscience: User,
  communication: MessageCircle,
} as const;

const PATIENT_READOUT_TONES: Record<PatientReadoutLine["tone"], string> = {
  positive: "text-emerald-300",
  neutral: "text-sky-300",
  warning: "text-amber-300",
  critical: "text-red-300",
};

function PatientReadoutPanel({ lines }: { lines: PatientReadoutLine[] }) {
  return (
    <div className="max-w-[52%] rounded-xl border border-white/10 bg-slate-950/75 px-2.5 py-2 backdrop-blur-sm">
      <h2 className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        État du patient
      </h2>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {lines.map((line) => {
          const Icon = PATIENT_READOUT_ICONS[line.id];
          return (
            <li key={line.id} className="flex items-start gap-1.5">
              <Icon
                className={`mt-px h-3.5 w-3.5 shrink-0 ${
                  line.known ? PATIENT_READOUT_TONES[line.tone] : "text-slate-600"
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-[11px] font-bold leading-tight ${
                  line.known ? "text-slate-100" : "text-slate-500"
                }`}
              >
                {line.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EquipmentPanel({ checks }: { checks: EquipmentCheckModel[] }) {
  return (
    <div className="max-w-[46%] rounded-xl border border-white/10 bg-slate-950/75 px-2.5 py-2 backdrop-blur-sm">
      <h2 className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        Matériel utilisé
      </h2>
      <ul className="mt-1.5 flex flex-col gap-1">
        {checks.map((check) => (
          <li key={check.id} className="flex items-center gap-1.5">
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                check.done
                  ? "border-emerald-400/70 bg-emerald-400/20"
                  : "border-white/20 bg-transparent"
              }`}
              aria-hidden="true"
            >
              {check.done && <Check className="h-2.5 w-2.5 text-emerald-300" />}
            </span>
            <span
              className={`truncate text-[11px] font-bold ${
                check.done ? "text-slate-100" : "text-slate-500"
              }`}
            >
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Le reste                                                                   */
/* -------------------------------------------------------------------------- */

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

function EquipmentList({ chips }: { chips: VitalsScreenModel["carriedEquipment"] }) {
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
