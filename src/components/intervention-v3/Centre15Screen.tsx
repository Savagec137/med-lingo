import { Check, CircleDashed, MessageSquareWarning, Phone, Radio } from "lucide-react";
import type {
  Centre15ItemModel,
  Centre15QuestionModel,
  Centre15ScreenModel,
} from "@/features/intervention-v3/ui/centre15-screen";

/**
 * Écran 4 — « Appel au 15 ».
 *
 * L'écran où le joueur choisit ce qu'il transmet. Chaque case cochée ou laissée
 * vide a une conséquence différente selon qu'il possédait ou non l'information,
 * et le modèle la calcule avant la transmission : la faute doit être visible
 * avant d'être commise, pas seulement au débriefing.
 *
 * Aucune valeur n'apparaît. Une ligne dit « Constantes mesurées — non
 * recueillies », jamais la tension : on transmet de mémoire, et c'est la
 * difficulté du bilan réel.
 */

interface Props {
  model: Centre15ScreenModel;
  /** Cocher ou décocher un élément du bilan. */
  onToggleItem: (itemId: string) => void;
  /** Retenir ou retirer un ajout libre. */
  onToggleAddition: (text: string) => void;
  /** Envoyer le bilan tel qu'il est sélectionné. */
  onTransmit: () => void;
  /** Répondre à une question du régulateur. */
  onAnswer: (questionId: string, answerId: string) => void;
}

const OUTCOME_TONES: Record<string, string> = {
  transmitted: "text-emerald-300",
  disclosed_missing: "text-sky-300",
  omitted: "text-amber-300",
  silent_gap: "text-red-300",
};

const FACT_STATUS_TONES: Record<string, string> = {
  known: "text-emerald-300/80",
  stale: "text-amber-300/80",
  unknown: "text-slate-500",
};

export function Centre15Screen({
  model,
  onToggleItem,
  onToggleAddition,
  onTransmit,
  onAnswer,
}: Props) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300/70">
          {model.eyebrow}
        </p>
        <h1 className="flex items-center gap-2 text-xl font-black text-slate-100">
          <Phone className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          {model.title}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-300/90">{model.narrative}</p>
      </header>

      {!model.transmitted && (
        <SelectionSummary silentGapCount={model.silentGapCount} omittedCount={model.omittedCount} />
      )}

      <ul className="flex flex-col gap-2">
        {model.items.map((item) => (
          <li key={item.id}>
            <HandoverItem
              item={item}
              locked={model.transmitted}
              onToggle={() => onToggleItem(item.id)}
            />
          </li>
        ))}
      </ul>

      <section aria-labelledby="ajouts" className="flex flex-col gap-2">
        <h2 id="ajouts" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          Ajouts libres
        </h2>
        {/* Constats et formulations diagnostiques sont mêlés à dessein : c'est au
            joueur de reconnaître qu'une conclusion n'est pas de son ressort. */}
        <ul className="flex flex-wrap gap-2">
          {model.additions.map((addition) => (
            <li key={addition.text}>
              <button
                type="button"
                disabled={model.transmitted}
                onClick={() => onToggleAddition(addition.text)}
                aria-pressed={addition.selected}
                className={`press rounded-full border px-3 py-1.5 text-left text-xs ${
                  addition.selected
                    ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
                    : "border-white/8 bg-white/[0.03] text-slate-300"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {addition.text}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {!model.transmitted && (
        <button
          type="button"
          onClick={onTransmit}
          className="press rounded-2xl bg-cyan-400/90 px-4 py-3 text-sm font-black text-slate-950"
        >
          Transmettre le bilan
        </button>
      )}

      {model.questions.length > 0 && (
        <section aria-labelledby="regulation" className="flex flex-col gap-2">
          <h2
            id="regulation"
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-300/80"
          >
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            Le régulateur demande
          </h2>
          <ul className="flex flex-col gap-2">
            {model.questions.map((question) => (
              <li key={question.id}>
                <RegulatorQuestion
                  question={question}
                  answerable={model.transmitted}
                  onAnswer={(answerId) => onAnswer(question.id, answerId)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {model.instruction && (
        <section className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] px-4 py-3">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-cyan-200/80">
            Consigne de la régulation
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">{model.instruction}</p>
        </section>
      )}
    </section>
  );
}

/**
 * Ce que la sélection courante produirait.
 *
 * Le trou silencieux est signalé plus fort que l'oubli, parce qu'il est plus
 * grave : un régulateur qui ignore qu'une donnée manque croit disposer d'un bilan
 * complet et décide sur du faux.
 */
function SelectionSummary({
  silentGapCount,
  omittedCount,
}: {
  silentGapCount: number;
  omittedCount: number;
}) {
  if (silentGapCount === 0 && omittedCount === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 text-xs font-bold text-emerald-200">
        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
        Rien d&apos;attendu ne reste sans mention.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {silentGapCount > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/[0.06] px-3 py-2 text-xs text-red-200">
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-black">{silentGapCount}</strong> élément(s) manquant(s) et
            passé(s) sous silence. La régulation croira le bilan complet.
          </span>
        </p>
      )}
      {omittedCount > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
          <CircleDashed className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-black">{omittedCount}</strong> élément(s) recueilli(s) et non
            transmis.
          </span>
        </p>
      )}
    </div>
  );
}

function HandoverItem({
  item,
  locked,
  onToggle,
}: {
  item: Centre15ItemModel;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={locked}
      aria-pressed={item.selected}
      className={`press w-full rounded-2xl border px-3 py-2.5 text-left ${
        item.selected ? "border-cyan-300/50 bg-cyan-300/[0.08]" : "border-white/8 bg-white/[0.03]"
      } disabled:cursor-not-allowed disabled:opacity-70`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-100">
          {item.label}
          {item.expected && (
            <span className="ml-1.5 text-[10px] font-black uppercase tracking-wide text-cyan-300/70">
              attendu
            </span>
          )}
        </p>
        {item.selected && <Check className="h-4 w-4 shrink-0 text-cyan-300" aria-label="Retenu" />}
      </div>

      {/* Les données sont nommées avec leur état, jamais avec leur valeur. */}
      {item.facts.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
          {item.facts.map((fact) => (
            <span key={fact.factId} className={FACT_STATUS_TONES[fact.status] ?? "text-slate-500"}>
              {fact.label} · {fact.statusLabel}
            </span>
          ))}
        </p>
      )}

      {item.expected && (
        <p
          className={`mt-1 text-[11px] font-bold ${OUTCOME_TONES[item.outcome] ?? "text-slate-400"}`}
        >
          {item.outcomeLabel}
        </p>
      )}
    </button>
  );
}

function RegulatorQuestion({
  question,
  answerable,
  onAnswer,
}: {
  question: Centre15QuestionModel;
  answerable: boolean;
  onAnswer: (answerId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <p className="text-sm font-bold text-slate-100">{question.text}</p>
      {question.onOmission && (
        <p className="mt-0.5 text-[11px] text-amber-300/70">Vous disposiez de cette information.</p>
      )}
      <ul className="mt-2 flex flex-col gap-1.5">
        {question.answers.map((answer) => (
          <li key={answer.id}>
            <button
              type="button"
              // Une question ne reçoit qu'une réponse : sans quoi le joueur
              // essaierait les trois et garderait la bonne.
              disabled={!answerable || question.answeredWith !== null}
              onClick={() => onAnswer(answer.id)}
              className={`press w-full rounded-xl border px-3 py-2 text-left text-xs ${
                question.answeredWith === answer.id
                  ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
                  : "border-white/8 bg-white/[0.02] text-slate-300"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {answer.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
