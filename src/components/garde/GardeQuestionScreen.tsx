import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Ambulance,
  ArrowRight,
  Check,
  CircleDot,
  Clock3,
  CloudRain,
  Navigation,
  Radio,
  X,
} from "lucide-react";
import type { GardeAnswer, GardeCase, GardeQuestion } from "@/features/garde/garde-domain";
import { GARDE_PHASES, GARDE_PHASE_LABELS, formatClock } from "@/features/garde/garde-domain";
import { GardeVitalsPanel } from "./GardeVitalsPanel";
import type { Vitals } from "@/features/garde/garde-domain";

interface Props {
  gardeCase: GardeCase;
  question: GardeQuestion;
  vitals: Vitals;
  clockMinutes: number;
  seconds: number;
  lastAnswer: GardeAnswer | null;
  onSubmit: (ids: string[]) => void;
  onNext: () => void;
}

export function GardeQuestionScreen({
  gardeCase,
  question,
  vitals,
  clockMinutes,
  seconds,
  lastAnswer,
  onSubmit,
  onNext,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => setSelected([]), [question]);

  const locked = lastAnswer !== null;

  const toggle = (id: string) => {
    if (locked) return;
    setSelected((current) =>
      question.multiple
        ? current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id]
        : [id],
    );
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider">
        <span className="flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-cyan-200">
          <Clock3 className="h-3 w-3" />
          {formatClock(clockMinutes)} · {Math.floor(seconds / 60)}′
          {String(seconds % 60).padStart(2, "0")}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-300">
          {gardeCase.patientLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-300">
          {gardeCase.environment}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-300">
          {gardeCase.weather}
        </span>
      </div>

      <nav aria-label="Étapes" className="overflow-x-auto pb-1 [scrollbar-width:none]">
        <ol className="flex min-w-max items-center gap-1">
          {GARDE_PHASES.map((phase) => {
            const active = phase === question.phase;
            const done = GARDE_PHASES.indexOf(phase) < GARDE_PHASES.indexOf(question.phase);
            return (
              <li
                key={phase}
                aria-current={active ? "step" : undefined}
                className={`rounded-full border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider ${active ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-200" : done ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-slate-500"}`}
              >
                {GARDE_PHASE_LABELS[phase]}
              </li>
            );
          })}
        </ol>
      </nav>

      {question.phase === "transit" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[1.5rem] border border-amber-300/25 bg-amber-300/[0.07]"
        >
          <div className="flex items-center gap-3 border-b border-amber-300/20 px-5 py-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300/20 text-amber-200">
              <Ambulance className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                Départ VSAV
              </div>
              <div className="font-display text-lg font-black text-white">
                Arrivée estimée dans {gardeCase.etaMinutes} min
              </div>
            </div>
          </div>
          <ul className="grid grid-cols-3 divide-x divide-amber-300/15">
            {[
              { Icon: Navigation, label: "Distance", value: `${gardeCase.distanceKm} km` },
              { Icon: Ambulance, label: "Trafic", value: gardeCase.trafficLabel },
              { Icon: CloudRain, label: "Météo", value: gardeCase.weather },
            ].map((item) => (
              <li key={item.label} className="px-3 py-3 text-center">
                <item.Icon className="mx-auto h-4 w-4 text-amber-200" />
                <div className="mt-1 text-[9px] font-black uppercase tracking-wider text-amber-200/70">
                  {item.label}
                </div>
                <div className="truncate text-xs font-bold text-white">{item.value}</div>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 border-t border-amber-300/20 bg-rose-400/[0.08] px-5 py-3.5">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-rose-300" />
            <div className="text-xs leading-relaxed text-rose-100">
              <span className="font-black uppercase tracking-wider">Nouvel appel en route</span>
              <p className="mt-1 opacity-90">{gardeCase.transitEvent}</p>
            </div>
          </div>
        </motion.div>
      )}

      <GardeVitalsPanel vitals={vitals} />

      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
          {question.eyebrow}
        </div>
        <h2 className="mt-2 font-display text-2xl font-black text-white">{question.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{question.prompt}</p>
        {question.multiple && (
          <p className="mt-2 text-xs text-slate-500">Plusieurs réponses possibles.</p>
        )}

        <ul className="mt-4 space-y-2">
          {question.options.map((option) => {
            const isSelected = selected.includes(option.id);
            const reveal = locked;
            const style = reveal
              ? option.correct
                ? "border-emerald-400/40 bg-emerald-400/10"
                : isSelected
                  ? "border-rose-400/40 bg-rose-400/10"
                  : "border-white/8 bg-white/[0.02] opacity-60"
              : isSelected
                ? "border-cyan-300/50 bg-cyan-300/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20";
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => toggle(option.id)}
                  disabled={locked}
                  aria-pressed={isSelected}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${style}`}
                >
                  <span className="mt-0.5 text-cyan-200">
                    {reveal ? (
                      option.correct ? (
                        <Check className="h-4 w-4 text-emerald-300" />
                      ) : isSelected ? (
                        <X className="h-4 w-4 text-rose-300" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-slate-600" />
                      )
                    ) : (
                      <CircleDot
                        className={`h-4 w-4 ${isSelected ? "text-cyan-300" : "text-slate-600"}`}
                      />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-white">{option.label}</span>
                    {reveal && (
                      <span className="mt-1 block text-xs text-slate-400">{option.note}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <AnimatePresence mode="wait">
          {lastAnswer && (
            <motion.div
              key="feedback"
              role="status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${lastAnswer.accuracy >= 0.75 ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="text-sm">
                <div className="font-black">
                  {Math.round(lastAnswer.accuracy * 100)} % de décisions justes
                </div>
                <p className="mt-1 text-xs opacity-90">
                  {lastAnswer.misses > 0
                    ? `${lastAnswer.misses} élément(s) essentiel(s) oublié(s) : le patient se dégrade.`
                    : lastAnswer.wrong > 0
                      ? "Des actions inutiles ont fait perdre du temps."
                      : "Prise en charge conforme : le patient s'améliore."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {lastAnswer && lastAnswer.alerts.length > 0 && (
            <motion.ul
              key="alerts"
              role="alert"
              aria-label="Alertes de constantes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 space-y-2"
            >
              {lastAnswer.alerts.map((alert) => (
                <li
                  key={alert.key}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 ${alert.severity === "critical" ? "border-rose-400/40 bg-rose-400/10 text-rose-100" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="text-xs leading-relaxed">
                    <span className="font-black uppercase tracking-wider">
                      {alert.severity === "critical" ? "Seuil critique" : "Surveillance"} ·{" "}
                      {alert.label}
                    </span>
                    <p className="mt-1 opacity-90">{alert.message}</p>
                  </div>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>


        <button
          type="button"
          onClick={() => (locked ? onNext() : onSubmit(selected))}
          disabled={!locked && selected.length === 0}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3.5 font-display text-sm font-black uppercase tracking-wide text-slate-950 transition disabled:opacity-40"
        >
          {locked ? "Continuer" : "Valider"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
