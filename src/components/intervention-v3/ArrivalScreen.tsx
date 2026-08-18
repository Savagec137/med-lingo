import { CloudRain } from "lucide-react";
import type { ArrivalScreenModel } from "@/features/intervention-v3/ui/arrival-screen";

/**
 * Écran 2 — « Arrivée sur les lieux ».
 *
 * Les actions ne sont pas écrites dans le composant : elles viennent du catalogue
 * pour la phase courante, et leur état actif vient du moteur. Un écran qui
 * recopierait les libellés de la maquette afficherait des boutons que le moteur
 * refuse, ou masquerait des gestes qu'il autorise.
 */

interface Props {
  model: ArrivalScreenModel;
  onAction: (actionId: string) => void;
}

export function ArrivalScreen({ model, onAction }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300/70">
          {model.eyebrow}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-black text-slate-100">{model.title}</h1>
          <span className="rounded-full border border-red-400/30 bg-red-400/[0.08] px-2.5 py-0.5 text-[11px] font-black text-red-200">
            {model.priorityChip}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-300/90">{model.subtitle}</p>
      </header>

      <dl className="grid grid-cols-3 gap-2">
        {model.meta.map((entry) => (
          <div
            key={entry.label}
            className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
          >
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {entry.label}
            </dt>
            <dd className="mt-0.5 text-sm font-black text-slate-100">{entry.value}</dd>
          </div>
        ))}
      </dl>

      {/* La météo n'est affichée que si la note de dispatch en porte une : elle
          n'est jamais inventée. */}
      {model.weather && (
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <CloudRain className="h-3.5 w-3.5" aria-hidden="true" />
          {model.weather}
        </p>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {model.actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              disabled={!action.enabled}
              onClick={() => onAction(action.id)}
              className={`press w-full rounded-2xl border px-3 py-3 text-left disabled:cursor-not-allowed ${
                action.outOfScope
                  ? "border-red-400/25 bg-red-400/[0.05]"
                  : "border-white/8 bg-white/[0.03] disabled:opacity-55"
              }`}
            >
              <p
                className={`text-sm font-bold ${
                  action.outOfScope
                    ? "text-red-200 line-through decoration-red-400/60"
                    : "text-slate-100"
                }`}
              >
                {action.label}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{action.hint}</p>
              {action.disabledReason && (
                <p className="mt-1 text-[11px] font-bold text-amber-300/80">
                  {action.disabledReason}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>

      <footer className="flex items-center gap-3">
        <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          {model.progress.label}
        </span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <span
            className="block h-full rounded-full bg-cyan-300"
            style={{
              width: `${(model.progress.completedSteps / model.progress.totalSteps) * 100}%`,
            }}
          />
        </span>
        <span className="text-[11px] font-black tabular-nums text-slate-400">
          {model.progress.completedSteps} / {model.progress.totalSteps}
        </span>
      </footer>
    </section>
  );
}
