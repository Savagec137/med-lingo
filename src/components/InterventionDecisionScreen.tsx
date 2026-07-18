import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  HeartPulse,
  ShieldAlert,
  TimerReset,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  InterventionQuestionFormat,
  InterventionSession,
  ScenarioStep,
} from "@/features/intervention-domain";
import { PHASE_LABELS } from "@/features/intervention-domain";
import { InterventionPhaseRail } from "@/components/InterventionPhaseRail";

interface Props {
  step: ScenarioStep;
  session: InterventionSession;
  elapsedSeconds: number;
  reducedMotion: boolean;
  onSubmit: (choiceIds: string[]) => void;
  onContinue: () => void;
}

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function InterventionDecisionScreen({
  step,
  session,
  elapsedSeconds,
  reducedMotion,
  onSubmit,
  onContinue,
}: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [selectedChoiceIds, setSelectedChoiceIds] = useState<string[]>([]);
  useEffect(() => {
    setSelectedChoiceIds([]);
    titleRef.current?.focus();
  }, [step.id]);
  const decision = session.pendingDecision;
  const format = step.format ?? "single";
  const requiresValidation = format === "multiple" || format === "sequence";
  const requiredSelections = step.requiredSelections ?? 1;
  const readyToSubmit = selectedChoiceIds.length === requiredSelections;
  const patientColor =
    session.patientState >= 70
      ? "text-emerald-300"
      : session.patientState >= 40
        ? "text-amber-300"
        : "text-red-300";

  const selectChoice = (choiceId: string) => {
    if (decision) return;
    if (!requiresValidation) {
      onSubmit([choiceId]);
      return;
    }
    setSelectedChoiceIds((current) => {
      if (current.includes(choiceId)) return current.filter((id) => id !== choiceId);
      if (current.length >= requiredSelections) return current;
      return [...current, choiceId];
    });
  };

  return (
    <section aria-labelledby="intervention-step-title" className="mx-auto max-w-5xl">
      <InterventionPhaseRail current={step.phase} visited={session.visitedStepIds} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(270px,.75fr)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            initial={reducedMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: -18 }}
            transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5 shadow-2xl sm:p-7"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              {PHASE_LABELS[step.phase]} · {step.eyebrow}
            </p>
            <h1
              ref={titleRef}
              tabIndex={-1}
              id="intervention-step-title"
              className="mt-2 font-display text-2xl font-black text-white outline-none sm:text-3xl"
            >
              {step.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-300">{step.narrative}</p>
            <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                Objectif opérationnel
              </div>
              <p className="mt-1 text-sm font-semibold text-cyan-50">{step.objective}</p>
            </div>

            <fieldset className="mt-6" disabled={Boolean(decision)}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-violet-300/15 bg-violet-300/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200">
                  {FORMAT_LABELS[format]}
                </span>
                {requiresValidation && !decision && (
                  <span className="text-xs font-bold text-slate-400">
                    {selectedChoiceIds.length}/{requiredSelections} sélectionnées
                  </span>
                )}
              </div>
              <legend className="text-base font-black leading-relaxed text-slate-100">
                {step.question ?? "Quelle est ta décision ?"}
              </legend>
              <p className="mb-3 mt-1 text-xs leading-relaxed text-slate-500">
                {format === "sequence"
                  ? "Sélectionne les actions dans l'ordre où tu les réaliserais."
                  : format === "multiple"
                    ? `Sélectionne exactement ${requiredSelections} réponses puis valide.`
                    : "Une seule réponse est attendue."}
              </p>
              <div className="space-y-3">
                {step.choices.map((choice, index) => {
                  const recordedSelection = decision?.selectedChoiceIds ?? [decision?.choiceId];
                  const selected = decision
                    ? recordedSelection.includes(choice.id)
                    : selectedChoiceIds.includes(choice.id);
                  const sequencePosition = selectedChoiceIds.indexOf(choice.id) + 1;
                  return (
                    <motion.button
                      key={choice.id}
                      type="button"
                      onClick={() => selectChoice(choice.id)}
                      aria-pressed={selected}
                      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reducedMotion ? 0 : index * 0.06 }}
                      className={`flex min-h-16 w-full items-start gap-3 rounded-2xl border p-4 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-cyan-300/30 ${selected ? "border-cyan-300/50 bg-cyan-300/12" : decision ? "border-white/5 bg-white/[0.02] opacity-45" : "border-white/10 bg-white/[0.04] hover:border-cyan-300/35 hover:bg-white/[0.07]"}`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-black text-white">
                        {format === "sequence" && sequencePosition > 0
                          ? sequencePosition
                          : selected && format === "multiple"
                            ? "✓"
                            : String.fromCharCode(65 + index)}
                      </span>
                      <span>
                        <span className="block font-bold text-slate-100">{choice.label}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                          {choice.detail}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {requiresValidation && !decision && (
                <button
                  type="button"
                  disabled={!readyToSubmit}
                  onClick={() => onSubmit(selectedChoiceIds)}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-violet-300 px-5 font-black text-slate-950 outline-none hover:bg-violet-200 focus-visible:ring-4 focus-visible:ring-violet-200/35 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                >
                  Valider ma sélection
                </button>
              )}
            </fieldset>

            <AnimatePresence>
              {decision && (
                <motion.div
                  role="status"
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-5 rounded-2xl border p-4 ${decision.recommended ? "border-emerald-400/20 bg-emerald-400/[0.08]" : "border-amber-400/20 bg-amber-400/[0.08]"}`}
                >
                  <div className="flex gap-3">
                    <CheckCircle2
                      className={`mt-0.5 h-5 w-5 shrink-0 ${decision.recommended ? "text-emerald-300" : "text-amber-300"}`}
                    />
                    <div>
                      <div className="font-black text-white">
                        {decision.recommended ? "Raisonnement attendu" : "Priorité à réévaluer"}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {decision.feedback}
                      </p>
                    </div>
                  </div>
                  {step.priorityReminder && (
                    <div className="mt-3 rounded-xl border border-white/8 bg-slate-950/35 p-3 text-xs leading-relaxed text-slate-300">
                      <span className="font-black text-white">Règle à retenir : </span>
                      {step.priorityReminder}
                    </div>
                  )}
                  {decision.choiceFeedbacks && (
                    <ul className="mt-3 space-y-2" aria-label="Explication de chaque réponse">
                      {decision.choiceFeedbacks.map((feedback) => (
                        <li
                          key={feedback.choiceId}
                          className={`rounded-xl border p-3 text-xs leading-relaxed ${feedback.recommended ? "border-emerald-300/15 bg-emerald-300/[0.05]" : feedback.selected ? "border-amber-300/15 bg-amber-300/[0.05]" : "border-white/8 bg-white/[0.025]"}`}
                        >
                          <div className="font-bold text-slate-100">
                            {feedback.choiceLabel}
                            <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                              {feedback.recommended
                                ? format === "sequence"
                                  ? "Ordre attendu"
                                  : "Réponse attendue"
                                : "Moins adaptée"}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-400">{feedback.rationale}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="rounded-full bg-white/8 px-3 py-1 text-slate-200">
                      Score {decision.effect.score >= 0 ? "+" : ""}
                      {decision.effect.score}
                    </span>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-slate-200">
                      Patient {decision.effect.patient >= 0 ? "+" : ""}
                      {decision.effect.patient}
                    </span>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-slate-200">
                      Temps +{decision.effect.timeSeconds}s
                    </span>
                  </div>
                  <button
                    type="button"
                    autoFocus
                    onClick={onContinue}
                    className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 font-black text-slate-950 outline-none hover:bg-cyan-200 focus-visible:ring-4 focus-visible:ring-cyan-200/35"
                  >
                    Continuer <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        <aside aria-label="État de la mission" className="space-y-4">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  État du patient
                </div>
                <div className={`mt-1 font-display text-2xl font-black ${patientColor}`}>
                  {session.patientState}%
                </div>
              </div>
              <HeartPulse className={`h-9 w-9 ${patientColor}`} />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={`h-full rounded-full ${session.patientState >= 70 ? "bg-emerald-400" : session.patientState >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                animate={{ width: `${session.patientState}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric Icon={Activity} label="Score" value={`${session.score}/100`} />
            <Metric Icon={Clock3} label="Chrono" value={formatTime(elapsedSeconds)} />
            <Metric
              Icon={TimerReset}
              label="Temps simulé"
              value={formatTime(session.simulatedTimeSeconds)}
            />
            <Metric Icon={ShieldAlert} label="Décisions" value={String(session.history.length)} />
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Observation
            </div>
            <div className="mt-2 font-bold text-slate-100">{step.patient.label}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{step.patient.detail}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2">
              {step.patient.vitals.map((vital) => (
                <div key={vital.label} className="rounded-xl bg-white/[0.05] p-3">
                  <dt className="text-[10px] font-bold uppercase text-slate-500">{vital.label}</dt>
                  <dd className="mt-1 text-sm font-black text-slate-100">{vital.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

const FORMAT_LABELS: Record<InterventionQuestionFormat, string> = {
  single: "Choix unique",
  multiple: "Choix multiples",
  sequence: "Ordre chronologique",
  "contextual-true-false": "Vrai / faux contextualisé",
  equipment: "Sélection du matériel",
  association: "Association signe / action",
  "error-identification": "Identification d'une erreur",
  regulatory: "Décision réglementaire",
  handover: "Transmission SAMU",
};

function Metric({ Icon, label, value }: { Icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/85 p-4">
      <Icon className="h-4 w-4 text-cyan-300" />
      <div className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-display text-lg font-black text-white">{value}</div>
    </div>
  );
}
