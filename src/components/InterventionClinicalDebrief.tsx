import { AlertTriangle, BadgeCheck, BookOpenCheck, Brain, HeartPulse, Radio } from "lucide-react";
import type { ShiftCompletedIntervention } from "@/features/intervention-shift-domain";

export function InterventionClinicalDebrief({
  completed,
}: {
  completed: ShiftCompletedIntervention;
}) {
  const { debrief } = completed;
  return (
    <section aria-labelledby="clinical-debrief-title" className="mt-7 space-y-4 text-left">
      <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.055] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Débrief pédagogique
            </p>
            <h3
              id="clinical-debrief-title"
              className="mt-1 font-display text-xl font-black text-white"
            >
              {debrief.outcomeLabel}
            </h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-black text-white">
            Patient {completed.clinicalScore}/100
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Les récompenses ont été pondérées à {Math.round(completed.rewardFactor * 100)} % selon
          l’état final du patient et la complétude du bilan transmis.
        </p>
        {debrief.failureReason && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-300/20 bg-rose-400/[0.08] p-3 text-sm text-rose-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {debrief.failureReason}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {debrief.successfulActions.length > 0 && (
          <DebriefCard
            title="Actions réussies"
            icon={<BadgeCheck className="h-5 w-5 text-emerald-300" />}
            tone="success"
            items={debrief.successfulActions}
          />
        )}
        {debrief.errors.length > 0 && (
          <DebriefCard
            title="Erreurs et priorités à corriger"
            icon={<AlertTriangle className="h-5 w-5 text-rose-300" />}
            tone="error"
            items={debrief.errors}
          />
        )}
      </div>

      {debrief.consequences.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-2 font-black text-white">
            <HeartPulse className="h-5 w-5 text-cyan-300" /> Conséquences observées
          </div>
          <ol className="mt-4 space-y-3">
            {debrief.consequences.map((consequence, index) => (
              <li
                key={`${consequence.action}:${index}`}
                className="border-l-2 border-cyan-300/20 pl-3"
              >
                <div className="text-sm font-black text-slate-200">{consequence.action}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {consequence.consequence}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {debrief.pulseLessons.length > 0 && (
          <DebriefCard
            title="Leçons Pulseo à revoir"
            icon={<Brain className="h-5 w-5 text-violet-300" />}
            tone="neutral"
            items={debrief.pulseLessons}
          />
        )}
        <div className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.045] p-5">
          <div className="flex items-center gap-2 font-black text-white">
            <Radio className="h-5 w-5 text-violet-300" /> Transmission au régulateur
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Complétude : {debrief.handover.completeness}% · décision :{" "}
            {debrief.handover.finalDecision === "transport"
              ? "transport coordonné"
              : debrief.handover.finalDecision === "awaiting-support"
                ? "attente de renfort"
                : "régulation requise"}
          </p>
          {debrief.handover.regulatorQuestions.length > 0 && (
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
              {debrief.handover.regulatorQuestions.map((question) => (
                <li key={question}>— {question}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {debrief.knowledgeReferences.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-2 font-black text-white">
            <BookOpenCheck className="h-5 w-5 text-amber-300" /> Connaissances et sources liées
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {debrief.knowledgeReferences.map((reference) => (
              <li
                key={reference.id}
                className="rounded-xl border border-white/8 bg-slate-950/50 p-3"
              >
                <div className="text-sm font-black text-slate-200">{reference.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {reference.knowledgeId} · {reference.sourceDocument} · p. {reference.sourcePages}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DebriefCard({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone: "success" | "error" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300/15 bg-emerald-300/[0.045]"
      : tone === "error"
        ? "border-rose-300/15 bg-rose-300/[0.045]"
        : "border-violet-300/15 bg-violet-300/[0.045]";
  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <div className="flex items-center gap-2 font-black text-white">
        {icon} {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
        {items.map((item, index) => (
          <li key={`${item}:${index}`}>— {item}</li>
        ))}
      </ul>
    </div>
  );
}
