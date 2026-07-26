import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Trophy } from "lucide-react";
import { RoadmapPageShell } from "@/components/roadmap/RoadmapPageShell";
import { useProgress } from "@/lib/use-progress";
import { getBlockProgress } from "@/content/roadmap-progress";
import { OFFICIAL_ROADMAP, getRoadmapBlock } from "@/content/roadmap-registry";

export const Route = createFileRoute("/bloc/$blocId/fin")({
  component: BlockCompletionPage,
});

function BlockCompletionPage() {
  const { blocId } = Route.useParams();
  const block = getRoadmapBlock(blocId);
  const { progress } = useProgress();

  if (!block) {
    return (
      <RoadmapPageShell eyebrow="Fin de bloc" title="Bloc introuvable">
        <p className="text-white/60">Cette fin de bloc n’existe pas.</p>
      </RoadmapPageShell>
    );
  }

  const entityProgress = getBlockProgress(block, progress);
  const nextBlock = OFFICIAL_ROADMAP.blocks.find((item) => item.order === block.order + 1);
  const completed = entityProgress.percentage === 100;

  return (
    <RoadmapPageShell
      backHref={`/bloc/${block.id}`}
      backLabel={block.title}
      eyebrow="Fin de bloc"
      title={completed ? "Bloc validé" : "Progression du bloc"}
      subtitle={block.title}
    >
      <section className="rounded-3xl border border-cyan-400/25 bg-white/[0.06] p-8 text-center">
        <Trophy className={`mx-auto h-20 w-20 ${completed ? "text-amber-300" : "text-white/20"}`} />
        <p className="mt-5 font-display text-4xl font-black">{entityProgress.percentage}%</p>
        <p className="mt-2 text-white/55">
          {entityProgress.completed} étapes validées sur {entityProgress.total}
        </p>
        {completed && nextBlock ? (
          <Link
            to="/bloc/$blocId"
            params={{ blocId: nextBlock.id }}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3 font-extrabold text-slate-950"
          >
            Continuer vers {nextBlock.title}
            <ArrowRight className="h-5 w-5" />
          </Link>
        ) : null}
      </section>
    </RoadmapPageShell>
  );
}
