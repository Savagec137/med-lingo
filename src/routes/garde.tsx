import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ambulance,
  ArrowRight,
  BatteryFull,
  CheckCircle2,
  CloudRain,
  MapPin,
  Navigation,
  PhoneCall,
  Radio,
  RotateCcw,
  Siren,
  Users,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { GardeQuestionScreen } from "@/components/garde/GardeQuestionScreen";
import { GardeVitalsPanel } from "@/components/garde/GardeVitalsPanel";
import { formatClock, MAX_INTERVENTIONS } from "@/features/garde/garde-domain";
import { gradeLabel } from "@/features/garde/garde-engine";
import { useGardeSession } from "@/hooks/use-garde-session";

export const Route = createFileRoute("/garde")({
  component: GardeRoute,
  head: () => ({
    meta: [
      { title: "Mode Garde — simulation d'intervention | MedLingo" },
      {
        name: "description",
        content:
          "Enchaîne une garde complète de 08h00 à 20h00 : appels au Centre 15, trajets, bilans ABCDE, gestes, bilan au régulateur et rapport de fin de garde.",
      },
      { property: "og:title", content: "Mode Garde — simulation d'intervention | MedLingo" },
      {
        property: "og:description",
        content:
          "Des gardes générées automatiquement : jamais deux interventions identiques, constantes qui évoluent selon tes décisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function GardeRoute() {
  const garde = useGardeSession();
  const { state, question } = garde;
  const current = state.currentCase;
  const accuracy =
    state.decisionsTotal > 0
      ? Math.round((state.decisionsCorrect / state.decisionsTotal) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#030d1a] pb-28 text-slate-100">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
        <AnimatePresence mode="wait">
          {state.status === "briefing" && (
            <motion.section
              key="briefing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                <Radio className="h-3.5 w-3.5" />
                Centre 15
              </div>
              <h1 className="font-display text-4xl font-black tracking-tight text-white">
                Début de garde — 08:00
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-400">
                Chaque garde est générée automatiquement : pathologie, âge, antécédents, météo,
                trafic et évolution clinique changent à chaque intervention.
              </p>

              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  { Icon: Ambulance, label: "Véhicule", value: "VSAV prêt" },
                  { Icon: Radio, label: "Radio", value: "Connectée" },
                  { Icon: Users, label: "Équipage", value: "Complet" },
                  { Icon: BatteryFull, label: "Fatigue", value: `${state.fatigue} %` },
                ].map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <item.Icon className="h-5 w-5 text-cyan-300" />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {item.label}
                      </div>
                      <div className="text-sm font-black text-white">{item.value}</div>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={garde.start}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-4 font-display text-sm font-black uppercase tracking-wide text-slate-950"
              >
                Prendre la garde
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.section>
          )}

          {state.status === "call" && current && (
            <motion.section
              key={`call-${current.id}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300">
                  <PhoneCall className="h-6 w-6" />
                </span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">
                    Appel {state.interventions + 1} · {current.priority}
                  </div>
                  <div className="font-display text-2xl font-black text-white">
                    {formatClock(state.clockMinutes)}
                  </div>
                </div>
              </div>

              <blockquote className="rounded-[1.5rem] border border-rose-400/25 bg-rose-400/[0.07] p-5 text-lg font-bold italic leading-relaxed text-rose-100">
                « {current.callerLine} »
              </blockquote>

              <ul className="grid gap-2 sm:grid-cols-2">
                {[
                  { Icon: Siren, label: "Motif", value: current.reason },
                  { Icon: MapPin, label: "Lieu", value: current.environment },
                  { Icon: Navigation, label: "Distance", value: `${current.distanceKm} km` },
                  { Icon: CloudRain, label: "Météo", value: current.weather },
                  { Icon: Ambulance, label: "Trafic", value: current.trafficLabel },
                  { Icon: Users, label: "Patient", value: current.patientLabel },
                ].map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
                  >
                    <item.Icon className="h-4 w-4 shrink-0 text-cyan-300" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {item.label}
                      </div>
                      <div className="truncate text-sm font-bold text-white">{item.value}</div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400">
                Antécédents déclarés : {current.antecedents.join(", ")}
              </div>

              <button
                type="button"
                onClick={garde.accept}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-400 px-5 py-4 font-display text-sm font-black uppercase tracking-wide text-slate-950"
              >
                Prendre l'appel
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.section>
          )}

          {state.status === "running" && current && question && (
            <motion.div
              key={`q-${current.id}-${state.questionIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GardeQuestionScreen
                gardeCase={current}
                question={question}
                vitals={state.vitals}
                clockMinutes={state.clockMinutes}
                seconds={garde.seconds}
                lastAnswer={state.lastAnswer}
                onSubmit={garde.answer}
                onNext={garde.next}
              />
            </motion.div>
          )}

          {state.status === "case-debrief" && (
            <motion.section
              key="case-debrief"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Intervention terminée · {formatClock(state.clockMinutes)}
              </div>
              <h2 className="font-display text-3xl font-black text-white">
                {state.results.at(-1)?.pathologyLabel}
              </h2>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "Décisions justes",
                    value: `${Math.round((state.results.at(-1)?.accuracy ?? 0) * 100)} %`,
                  },
                  {
                    label: "Durée",
                    value: `${state.results.at(-1)?.durationMinutes ?? 0} min`,
                  },
                  { label: "XP", value: `+${state.results.at(-1)?.xp ?? 0}` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {item.label}
                    </div>
                    <div className="font-display text-2xl font-black text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              <div
                className={`flex items-center gap-3 rounded-2xl border p-4 ${state.results.at(-1)?.patientStable ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}
              >
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-bold">
                  {state.results.at(-1)?.patientStable
                    ? "Patient stabilisé et transmis dans de bonnes conditions."
                    : "Patient transmis dégradé : des éléments essentiels ont manqué."}
                </span>
              </div>

              <GardeVitalsPanel vitals={state.vitals} compact />

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={garde.nextCall}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3.5 font-display text-sm font-black uppercase tracking-wide text-slate-950"
                >
                  Rester disponible
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={garde.finish}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-black text-slate-300"
                >
                  Terminer la garde
                </button>
              </div>
            </motion.section>
          )}

          {state.status === "shift-report" && (
            <motion.section
              key="report"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Fin de garde · 08:00 → {formatClock(state.clockMinutes)}
              </div>
              <h2 className="font-display text-4xl font-black text-white">Rapport de garde</h2>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: "Interventions", value: `${state.interventions}/${MAX_INTERVENTIONS}` },
                  { label: "Patients", value: state.patients },
                  { label: "ACR", value: state.arrests },
                  { label: "Traumatismes", value: state.traumas },
                  { label: "AVC", value: state.strokes },
                  { label: "Naissances", value: state.births },
                  {
                    label: "Temps moyen",
                    value: `${state.interventions ? Math.round(state.totalMinutes / state.interventions) : 0} min`,
                  },
                  { label: "Décisions correctes", value: `${accuracy} %` },
                  { label: "XP gagnée", value: `+${state.totalXp}` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {item.label}
                    </div>
                    <div className="font-display text-2xl font-black text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-5">
                <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                  Grade
                </div>
                <div className="font-display text-2xl font-black text-white">
                  {gradeLabel(accuracy)}
                </div>
              </div>

              {state.log.length > 0 && (
                <ul className="space-y-2">
                  {state.log.map((line, index) => (
                    <li
                      key={`${line}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={garde.reset}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-4 font-display text-sm font-black uppercase tracking-wide text-slate-950"
              >
                <RotateCcw className="h-4 w-4" />
                Reprendre une garde
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
