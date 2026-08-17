import { AlertTriangle, Ban, Check, Clock, Info } from "lucide-react";
import type {
  GestureCardModel,
  OutOfScopeActModel,
  PriorityActionsScreenModel,
} from "@/features/intervention-v3/ui/priority-actions-screen";

/**
 * Écran 5 — « Gestes prioritaires ».
 *
 * Ce composant **ne décide rien**. Il reçoit un modèle déjà dérivé et l'affiche :
 * quelles cartes sont cliquables, ce qui manque pour fonder un geste, quels actes
 * sont hors du champ de l'ambulancier. Aucune règle de jeu n'est réécrite ici, et
 * il n'a accès ni à la session, ni au scénario, ni à la moindre donnée clinique.
 *
 * Le point de conception qui compte : les cartes interdites sont **affichées
 * barrées**, jamais masquées. Un acte absent de l'écran n'enseigne rien ; un acte
 * présenté, tenté et refusé avec son motif juridique est le moment où la limite
 * s'apprend.
 */

interface Props {
  model: PriorityActionsScreenModel;
  /** Retenir un geste. Le refus éventuel revient par `onRefused`. */
  onSelect: (gestureId: string) => void;
  /** Retirer un geste déjà retenu. */
  onDeselect: (gestureId: string) => void;
  /** Valider le tour et passer à la réévaluation. */
  onResolve: () => void;
  /** Tenter un acte hors périmètre : produit un refus expliqué. */
  onAttemptOutOfScope: (actionId: string) => void;
}

const formatSeconds = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
};

export function PriorityActionsScreen({
  model,
  onSelect,
  onDeselect,
  onResolve,
  onAttemptOutOfScope,
}: Props) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300/70">
            {model.eyebrow}
          </p>
          <h1 className="text-xl font-black text-slate-100">{model.title}</h1>
        </div>
        <GestureCounter model={model} />
      </header>

      <p className="text-sm leading-relaxed text-slate-300/90">{model.narrative}</p>

      <ul className="grid gap-2 sm:grid-cols-2">
        {model.cards.map((card) => (
          <li key={card.id}>
            <GestureCard
              card={card}
              onSelect={() => onSelect(card.id)}
              onDeselect={() => onDeselect(card.id)}
            />
          </li>
        ))}
      </ul>

      {model.outOfScopeActs.length > 0 && (
        <section aria-labelledby="hors-perimetre" className="flex flex-col gap-2">
          <h2
            id="hors-perimetre"
            className="text-[10px] font-black uppercase tracking-wider text-slate-500"
          >
            Hors du champ de l&apos;ambulancier
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {model.outOfScopeActs.map((act) => (
              <li key={act.id}>
                <OutOfScopeCard act={act} onAttempt={() => onAttemptOutOfScope(act.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {model.refusedAttempts.length > 0 && (
        <section aria-labelledby="tentatives" className="flex flex-col gap-2">
          <h2
            id="tentatives"
            className="text-[10px] font-black uppercase tracking-wider text-amber-300/80"
          >
            Tentatives refusées
          </h2>
          <ul className="flex flex-col gap-2">
            {model.refusedAttempts.map((attempt, index) => (
              <li
                key={`${attempt.gestureId}-${index}`}
                className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div>
                  <p className="text-xs font-bold text-amber-100">{attempt.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-amber-200/70">
                    {attempt.reason}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        disabled={!model.canResolve}
        onClick={onResolve}
        className="press rounded-2xl bg-cyan-400/90 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-slate-500"
      >
        {model.resolved
          ? "Tour validé"
          : model.canResolve
            ? "Valider les gestes prioritaires"
            : `Retenir ${model.requiredSelections - model.selectedCount} geste(s) de plus`}
      </button>
    </section>
  );
}

function GestureCounter({ model }: { model: PriorityActionsScreenModel }) {
  return (
    <div className="flex items-center gap-3">
      {model.secondsLeft !== null && (
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black tabular-nums ${
            model.expired ? "bg-red-400/15 text-red-300" : "bg-white/[0.06] text-slate-300"
          }`}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Temps restant </span>
          {formatSeconds(model.secondsLeft)}
        </span>
      )}
      <span className="text-xs font-black tabular-nums text-slate-400">
        {model.selectedCount} / {model.requiredSelections}
      </span>
    </div>
  );
}

function GestureCard({
  card,
  onSelect,
  onDeselect,
}: {
  card: GestureCardModel;
  onSelect: () => void;
  onDeselect: () => void;
}) {
  // Une carte hors périmètre reste cliquable : le clic produit le refus expliqué,
  // qui est l'enseignement. Une carte simplement bloquée ne l'est pas.
  const interactive = card.selectable || card.selected;
  const tone = card.selected
    ? "border-cyan-300/50 bg-cyan-300/10"
    : card.outOfScope
      ? "border-red-400/25 bg-red-400/[0.05]"
      : card.selectable
        ? "border-white/8 bg-white/[0.03]"
        : "border-white/5 bg-white/[0.015] opacity-60";

  return (
    <button
      type="button"
      onClick={card.selected ? onDeselect : onSelect}
      disabled={!interactive}
      aria-pressed={card.selected}
      className={`press w-full rounded-2xl border px-3 py-3 text-left transition-colors ${tone} disabled:cursor-not-allowed`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-sm font-bold ${
            card.outOfScope ? "text-red-200 line-through decoration-red-400/60" : "text-slate-100"
          }`}
        >
          {card.label}
        </p>
        {card.selected && <Check className="h-4 w-4 shrink-0 text-cyan-300" aria-label="Retenu" />}
        {card.outOfScope && !card.selected && (
          <Ban className="h-4 w-4 shrink-0 text-red-400" aria-label="Hors périmètre" />
        )}
      </div>

      <p className="mt-1 text-xs leading-relaxed text-slate-400">{card.hint}</p>

      {card.outOfScope && card.refusalReason && (
        <p className="mt-2 text-xs leading-relaxed text-red-200/70">{card.refusalReason}</p>
      )}

      {/* Ce qui manque pour fonder le geste : une aide au raisonnement, jamais la
          réponse. L'écran ne dit à aucun moment quel geste est recommandé. */}
      {!card.outOfScope && !card.justified && card.missingJustifications.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-amber-200/80">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Non fondé : {card.missingJustifications.map((fact) => fact.label).join(", ")} à
            recueillir
          </span>
        </p>
      )}

      {card.blockedReason && !card.selected && (
        <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {card.blockedReason}
        </p>
      )}
    </button>
  );
}

function OutOfScopeCard({ act, onAttempt }: { act: OutOfScopeActModel; onAttempt: () => void }) {
  return (
    <button
      type="button"
      onClick={onAttempt}
      className="press w-full rounded-2xl border border-red-400/25 bg-red-400/[0.05] px-3 py-3 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-red-200 line-through decoration-red-400/60">
          {act.label}
        </p>
        <Ban className="h-4 w-4 shrink-0 text-red-400" aria-label="Acte refusé" />
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{act.hint}</p>
      <p className="mt-2 text-xs leading-relaxed text-red-200/70">{act.refusalReason}</p>
    </button>
  );
}
