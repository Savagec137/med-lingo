import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Ambulance, ChevronRight, Radio, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { InterventionDebrief } from "@/components/InterventionDebrief";
import { InterventionDecisionScreen } from "@/components/InterventionDecisionScreen";
import { InterventionMissionAlert } from "@/components/InterventionMissionAlert";
import { InterventionMissionCard } from "@/components/InterventionMissionCard";
import { getMissionState } from "@/features/intervention-engine";
import { INTERVENTION_SCENARIOS } from "@/features/intervention-scenarios";
import { useInterventionSession } from "@/hooks/use-intervention-session";

export const Route = createFileRoute("/intervention")({ component: InterventionRoute });

function InterventionRoute() {
  const reducedMotion = Boolean(useReducedMotion());
  const intervention = useInterventionSession();

  return (
    <div className="min-h-screen bg-[#030d1a] pb-24 text-slate-100">
      <TopBar />
      <main className="relative mx-auto max-w-6xl overflow-hidden px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-cyan-500/[0.06] blur-3xl"
          aria-hidden="true"
        />

        {!intervention.scenario && (
          <>
            <header className="relative mb-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  <Radio className="h-3.5 w-3.5" />
                  Centre opérationnel
                </div>
                <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Mode Intervention
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">
                  Prends en charge des missions préhospitalières, adapte tes décisions à l'état du
                  patient et analyse chaque action au débriefing.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4">
                <ShieldCheck className="h-6 w-6 text-emerald-300" />
                <div>
                  <div className="text-sm font-black text-white">Environnement d'entraînement</div>
                  <div className="text-xs text-slate-400">
                    Scénarios pédagogiques, sans impact sur les soins réels.
                  </div>
                </div>
              </div>
            </header>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mb-6 flex items-center gap-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-r from-cyan-400/10 to-blue-500/5 p-5"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950">
                <Ambulance className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  Parcours progressif
                </div>
                <div className="mt-1 font-display text-lg font-black text-white">
                  Du premier bilan au transport régulé
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Une réussite déverrouille la mission suivante. Ton meilleur score est conservé sur
                  cet appareil.
                </p>
              </div>
              <ChevronRight className="hidden h-6 w-6 text-cyan-300 sm:block" />
            </motion.div>

            <section
              aria-label="Missions disponibles"
              className="relative grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            >
              {INTERVENTION_SCENARIOS.map((scenario, index) => {
                const state = getMissionState(scenario, intervention.progress);
                return (
                  <InterventionMissionCard
                    key={scenario.id}
                    scenario={scenario}
                    state={state}
                    progress={intervention.progress[scenario.id]}
                    index={index}
                    reducedMotion={reducedMotion}
                    onSelect={() => intervention.selectMission(scenario)}
                  />
                );
              })}
            </section>
          </>
        )}

        {intervention.scenario && intervention.session?.status === "alert" && (
          <InterventionMissionAlert
            scenario={intervention.scenario}
            reducedMotion={reducedMotion}
            onAccept={intervention.acceptMission}
            onBack={intervention.leaveMission}
          />
        )}

        {intervention.scenario &&
          intervention.session?.status === "active" &&
          intervention.currentStep && (
            <InterventionDecisionScreen
              step={intervention.currentStep}
              session={intervention.session}
              elapsedSeconds={intervention.elapsedSeconds}
              reducedMotion={reducedMotion}
              onChoose={intervention.choose}
              onContinue={intervention.continueMission}
            />
          )}

        {intervention.scenario &&
          intervention.session?.status === "debrief" &&
          intervention.result && (
            <InterventionDebrief
              scenario={intervention.scenario}
              result={intervention.result}
              reducedMotion={reducedMotion}
              onRestart={intervention.restartMission}
              onBack={intervention.leaveMission}
            />
          )}
      </main>
    </div>
  );
}
