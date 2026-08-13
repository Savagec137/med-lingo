import { Activity, ArrowRight, HeartPulse, Ruler, Scale } from "lucide-react";
import heartAsset from "@/assets/anatomy-heart-realistic.png";
import { GlassPanel } from "@/components/medoca";
import type { AnatomyInfoCard as AnatomyInfo } from "@/features/anatomy/anatomy-domain";

const ICONS = [Ruler, Scale, HeartPulse, Activity];

export function AnatomyInfoCard({ info }: { info: AnatomyInfo }) {
  return (
    <GlassPanel strength="strong" className="grid gap-5 p-4 sm:grid-cols-[190px_1fr] sm:p-5">
      <div className="flex min-h-44 items-center justify-center rounded-[12px] bg-[radial-gradient(circle,rgba(255,66,103,0.12),transparent_68%)]">
        <img
          src={heartAsset}
          alt="Cœur anatomique"
          data-anatomy-review-status="corrected-external-view"
          loading="lazy"
          decoding="async"
          className="h-44 w-44 object-contain"
        />
      </div>
      <div>
        <h2 className="text-xl font-black text-[#26d878]">{info.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#bac5d0]">{info.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {info.stats.map((fact, index) => {
            const Icon = ICONS[index % ICONS.length]!;
            return (
              <div
                key={`${fact.label}-${fact.value}`}
                className="rounded-[10px] bg-[#111d2b] p-2.5"
                data-validation-status={info.trust}
              >
                <dt className="flex items-center gap-1.5 text-[10px] font-bold text-[#8290a0]">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {fact.label}
                </dt>
                <dd className="mt-1 text-xs font-extrabold text-[#eef3f7]">{fact.value}</dd>
              </div>
            );
          })}
        </dl>
        <button
          type="button"
          disabled={!info.knowledgeId}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-[#2b3b4d] bg-[#152130] px-4 text-sm font-extrabold text-[#dce4eb] transition-colors hover:border-[#26d878]/60 hover:text-[#26d878] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d878] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
        >
          En savoir plus <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="sr-only" data-review-status={info.trust}>
          {info.reviewNote}
        </span>
      </div>
    </GlassPanel>
  );
}
