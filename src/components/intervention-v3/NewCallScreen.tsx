import { AlertTriangle, PhoneIncoming } from "lucide-react";
import type { NewCallScreenModel } from "@/features/intervention-v3/ui/new-call-screen";

/**
 * Écran 1 — « Nouvel appel — Centre 15 ».
 *
 * Tout ce qui s'affiche vient de l'alerte du scénario : motif, priorité, lieu,
 * équipe, contexte, et les informations reçues. Rien du dossier clinique — à ce
 * stade le joueur n'a que ce que le régulateur lui a dit, et c'est précisément la
 * situation qu'il doit apprendre à gérer.
 */

interface Props {
  model: NewCallScreenModel;
  onAction: (id: "accept" | "details" | "prepare") => void;
}

const ROLE_STYLES = {
  primary: "bg-cyan-400/90 text-slate-950",
  secondary: "border border-white/12 bg-white/[0.05] text-slate-100",
  tertiary: "text-slate-400 underline underline-offset-4",
} as const;

export function NewCallScreen({ model, onAction }: Props) {
  return (
    <section className="flex flex-col gap-4">
      {model.priorityBanner && (
        <p className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/[0.08] px-3 py-2 text-xs font-black uppercase tracking-wide text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {model.priorityBanner}
        </p>
      )}

      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-300/70">
          <PhoneIncoming className="h-3.5 w-3.5" aria-hidden="true" />
          {model.callStatus}
        </p>
        <h1 className="text-xl font-black text-slate-100">{model.title}</h1>
      </header>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
        <p className="text-lg font-black leading-snug text-slate-100">{model.reason}</p>
        <dl className="mt-3 flex flex-col gap-1.5">
          {model.lines.map((line) => (
            <div key={line.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                {line.label}
              </dt>
              <dd
                className={`text-right text-sm font-bold ${
                  line.emphasis ? "text-red-300" : "text-slate-200"
                }`}
              >
                {line.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <section aria-labelledby="recues" className="flex flex-col gap-2">
        <h2 id="recues" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          Informations reçues
        </h2>
        {/* Les puces reprennent la note du régulateur, sans réécriture : le joueur
            doit lire ce qui a été dit, pas un résumé. */}
        <ul className="flex flex-col gap-1.5">
          {model.received.map((line) => (
            <li key={line} className="flex gap-2 text-sm leading-relaxed text-slate-300">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-300" aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2">
        {model.actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={!action.enabled}
            onClick={() => onAction(action.id)}
            className={`press rounded-2xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${ROLE_STYLES[action.role]}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
