import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Ambulance,
  CheckCircle2,
  ChevronRight,
  ListChecks,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { InterventionDebrief } from "@/components/InterventionDebrief";
import { InterventionDecisionScreen } from "@/components/InterventionDecisionScreen";
import { InterventionMissionAlert } from "@/components/InterventionMissionAlert";
import { InterventionMissionCard } from "@/components/InterventionMissionCard";
import { InterventionShiftExperience } from "@/components/InterventionShiftExperience";
import { getMissionState } from "@/features/intervention-engine";
import { INTERVENTION_SCENARIOS } from "@/features/intervention-official-scenarios";
import { useInterventionSession } from "@/hooks/use-intervention-session";

export const Route = createFileRoute("/intervention")({ component: InterventionRoute });

function InterventionRoute() {
  const reducedMotion = Boolean(useReducedMotion());
  const intervention = useInterventionSession();
  const [mode, setMode] = useState<"guard" | "missions">("guard");
  const completedMissionCount = INTERVENTION_SCENARIOS.filter(
    (scenario) => intervention.progress[scenario.id]?.completed,
  ).length;

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
            <header className="relative mb-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  <Radio className="h-3.5 w-3.5" />
                  Centre opérationnel
                </div>
                <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Mode Intervention
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">
                  Prends une garde dynamique, enchaîne les appels et adapte chaque décision à
                  l’évolution de la situation.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4">
                <ShieldCheck className="h-6 w-6 text-emerald-300" />
                <div>
                  <div className="text-sm font-black text-white">Environnement d’entraînement</div>
                  <div className="text-xs text-slate-400">
                    Les décisions cliniques proviennent des scénarios pédagogiques existants.
                  </div>
                </div>
              </div>
            </header>

            {/*
              Le mode simulation tourne sur un autre moteur, sur sa propre route.
              Sans ce lien, rien dans l'application n'y mène : la page d'accueil et
              cette page renvoyaient toutes les deux sur les scénarios à décisions.
            */}
            <Link
              to="/intervention-v3"
              search={{}}
              className="relative mb-6 flex items-center gap-3 rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.06] p-4 transition hover:bg-emerald-300/[0.1] active:scale-[0.99]"
            >
              <Activity className="h-6 w-6 shrink-0 text-emerald-300" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Simulation
                </div>
                <div className="text-sm font-black text-white">Intervention en temps réel</div>
                <div className="text-xs leading-relaxed text-slate-400">
                  Aucune constante n’est affichée d’avance : tu poses le saturomètre, tu prends la
                  tension, tu interroges, tu consultes les documents, puis tu transmets au 15.
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-emerald-300" />
            </Link>

            <div
              role="tablist"
              aria-label="Choisir le type d'intervention"
              className="relative mb-6 grid gap-2 rounded-2xl border border-white/10 bg-slate-950/75 p-2 sm:grid-cols-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "guard"}
                onClick={() => setMode("guard")}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black outline-none transition focus-visible:ring-4 focus-visible:ring-cyan-300/25 ${mode === "guard" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/[0.06]"}`}
              >
                <Radio className="h-4 w-4" /> Garde dynamique
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "missions"}
                onClick={() => setMode("missions")}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black outline-none transition focus-visible:ring-4 focus-visible:ring-cyan-300/25 ${mode === "missions" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/[0.06]"}`}
              >
                <ListChecks className="h-4 w-4" /> Missions guidées
              </button>
            </div>

            {mode === "guard" && (
              <InterventionShiftExperience
                scenarios={INTERVENTION_SCENARIOS}
                reducedMotion={reducedMotion}
                onOpenTraining={() => setMode("missions")}
              />
            )}

            {mode === "missions" && (
              <>
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
                      Entraînement ciblé
                    </div>
                    <div className="mt-1 font-display text-lg font-black text-white">
                      Du premier bilan au transport régulé
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Les 15 missions officielles et leur progression restent intégralement
                      disponibles.
                    </p>
                  </div>
                  <div
                    className="ml-auto hidden shrink-0 items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-xs font-black text-emerald-200 sm:flex"
                    aria-label={`${completedMissionCount} missions réussies sur ${INTERVENTION_SCENARIOS.length}`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completedMissionCount}/{INTERVENTION_SCENARIOS.length}
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
              onSubmit={intervention.submitAnswers}
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
