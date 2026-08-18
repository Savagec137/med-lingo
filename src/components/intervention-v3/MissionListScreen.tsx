import { ChevronRight, Clock, Coins, Zap } from "lucide-react";
import type { MissionListScreenModel } from "@/features/intervention-v3/ui/mission-list-screen";

/**
 * L'écran de choix de mission.
 *
 * Il affiche ce qu'un formateur annonce avant l'exercice, et rien du patient.
 * Le motif d'appel se découvre à l'écran suivant, par la régulation.
 */

interface Props {
  model: MissionListScreenModel;
  onChoose: (scenarioId: string) => void;
}

export function MissionListScreen({ model, onChoose }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80">
          {model.eyebrow}
        </p>
        <h1 className="mt-1 font-display text-2xl font-black text-slate-100">{model.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{model.subtitle}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {model.missions.map((mission) => (
          <li key={mission.scenarioId}>
            <button
              type="button"
              onClick={() => onChoose(mission.scenarioId)}
              className="press w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300/80">
                    {mission.specialty} · {mission.difficultyLabel}
                  </p>
                  <h2 className="mt-1 font-display text-base font-black leading-tight text-white">
                    {mission.title}
                  </h2>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-500" />
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">{mission.objective}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {mission.estimatedLabel}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  {mission.xp} XP
                </span>
                <span className="inline-flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                  {mission.coins}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
