import { Check, Circle } from "lucide-react";
import {
  INTERVENTION_PHASES,
  PHASE_LABELS,
  type InterventionPhase,
} from "@/features/intervention-domain";

interface Props {
  current: InterventionPhase;
  visited: string[];
}

export function InterventionPhaseRail({ current, visited }: Props) {
  return (
    <nav aria-label="Étapes de la mission" className="overflow-x-auto pb-2 [scrollbar-width:none]">
      <ol className="flex min-w-max items-center gap-1">
        {INTERVENTION_PHASES.map((phase, index) => {
          const active = phase === current;
          const done = visited.some((stepId) => stepId.startsWith(`${phase}-`));
          return (
            <li key={phase} className="flex items-center">
              <div
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-wider ${active ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-200" : done ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/8 bg-white/[0.03] text-slate-500"}`}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Circle className={`h-2.5 w-2.5 ${active ? "fill-current" : ""}`} />
                )}
                {PHASE_LABELS[phase]}
              </div>
              {index < INTERVENTION_PHASES.length - 1 && (
                <span className="mx-1 h-px w-4 bg-white/10" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
