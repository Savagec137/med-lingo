import { AlertOctagon, AlertTriangle, BookOpen, Check, Heart, Star } from "lucide-react";
import type {
  DebriefScreenModel,
  DebriefSectionModel,
  DebriefTone,
} from "@/features/intervention-v3/ui/debrief-screen";

/**
 * Écran 7 — « Débriefing ».
 *
 * Huit sections dans l'ordre où elles s'apprennent, ce qui a été bien fait en
 * premier. Le composant n'en réordonne aucune et n'en masque aucune : le modèle a
 * déjà retiré les sections vides, et lui en ajouter une reviendrait à afficher
 * « aucune erreur » sur une mission qui n'a rien transmis.
 */

interface Props {
  model: DebriefScreenModel;
  /** Rejouer la mission depuis le début. */
  onReplay: () => void;
  /** Revenir au choix de mission. La maquette porte ce bouton depuis le début. */
  onChooseAnotherMission?: (() => void) | undefined;
  /** Ouvrir une fiche de révision. */
  onOpenKnowledge: (knowledgeId: string) => void;
}

const TONE_STYLES: Record<DebriefTone, { border: string; title: string }> = {
  positive: { border: "border-emerald-400/30 bg-emerald-400/[0.05]", title: "text-emerald-200" },
  neutral: { border: "border-white/8 bg-white/[0.03]", title: "text-slate-200" },
  warning: { border: "border-amber-400/25 bg-amber-400/[0.05]", title: "text-amber-200" },
  critical: { border: "border-red-400/25 bg-red-400/[0.05]", title: "text-red-200" },
};

const TONE_ICONS: Record<DebriefTone, typeof Check> = {
  positive: Check,
  neutral: BookOpen,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

export function DebriefScreen({ model, onReplay, onChooseAnotherMission, onOpenKnowledge }: Props) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300/70">
          {model.eyebrow}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-xl font-black text-slate-100">{model.title}</h1>
          <Stars value={model.stars} />
        </div>

        <div
          className={`rounded-2xl border px-4 py-3 ${
            model.passed
              ? "border-emerald-400/30 bg-emerald-400/[0.06]"
              : "border-red-400/30 bg-red-400/[0.06]"
          }`}
        >
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums text-slate-100">{model.score}</span>
            <span className="text-sm font-bold text-slate-400">/ 100</span>
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-200">{model.globalRating}</p>
          {/* L'échec dit sa raison. « Mission échouée » sans motif n'apprend rien. */}
          {model.failureReason && (
            <p className="mt-1 text-xs leading-relaxed text-red-200/80">{model.failureReason}</p>
          )}
          {model.trajectoryLabel && (
            <p className="mt-1 text-xs text-slate-400">{model.trajectoryLabel}</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Durée" value={model.duration} />
          <Stat label="Vies restantes" value={String(model.livesRemaining)} icon={Heart} />
          <Stat label="Erreurs critiques" value={String(model.criticalErrorCount)} />
          <Stat label="Gains" value={`${model.reward.xp} XP · ${model.reward.coins}`} />
        </dl>
      </header>

      <section aria-labelledby="axes" className="flex flex-col gap-2">
        <h2 id="axes" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          Par axe
        </h2>
        <ul className="flex flex-col gap-1.5">
          {model.axes.map((axis) => (
            <li key={axis.id} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-xs font-bold text-slate-300">
                {axis.label}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                {/* Un axe non mobilisé ne se dessine pas à zéro : il ne se dessine
                    pas du tout, et son libellé dit « non évalué ». */}
                {axis.percentage !== null && (
                  <span
                    className="block h-full rounded-full bg-cyan-300"
                    style={{ width: `${axis.percentage}%` }}
                  />
                )}
              </span>
              <span className="w-24 shrink-0 text-right text-[11px] font-black text-slate-400">
                {axis.ratingLabel}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {model.sections.map((entry) => (
        <DebriefSection key={entry.id} section={entry} onOpenKnowledge={onOpenKnowledge} />
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onReplay}
          className="press flex-1 rounded-2xl bg-cyan-400/90 px-4 py-3 text-sm font-black text-slate-950"
        >
          Rejouer la mission
        </button>
        {onChooseAnotherMission && (
          <button
            type="button"
            onClick={onChooseAnotherMission}
            className="press flex-1 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black text-slate-200"
          >
            Choisir une autre mission
          </button>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Heart }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
      <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1 text-sm font-black tabular-nums text-slate-100">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
        {value}
      </dd>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} étoiles sur 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={`h-4 w-4 ${
            index <= value ? "fill-amber-300 text-amber-300" : "text-slate-700"
          }`}
        />
      ))}
    </span>
  );
}

function DebriefSection({
  section,
  onOpenKnowledge,
}: {
  section: DebriefSectionModel;
  onOpenKnowledge: (knowledgeId: string) => void;
}) {
  const style = TONE_STYLES[section.tone];
  const Icon = TONE_ICONS[section.tone];

  return (
    <section
      aria-labelledby={section.id}
      className={`rounded-2xl border px-4 py-3 ${style.border}`}
    >
      <h2 id={section.id} className={`flex items-center gap-2 text-sm font-black ${style.title}`}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {section.title}
      </h2>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{section.caption}</p>

      <ul className="mt-2 flex flex-col gap-2">
        {section.entries.map((entry) => (
          <li key={entry.id}>
            {entry.knowledgeId ? (
              <button
                type="button"
                onClick={() => onOpenKnowledge(entry.knowledgeId!)}
                className="press w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left"
              >
                <p className="text-xs font-bold text-slate-100">{entry.label}</p>
                {entry.detail && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                    {entry.detail}
                  </p>
                )}
              </button>
            ) : (
              <div className="px-1">
                <p className="text-xs font-bold text-slate-100">{entry.label}</p>
                {entry.detail && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                    {entry.detail}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
