import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { RoadmapPageShell } from "@/components/roadmap/RoadmapPageShell";
import { RoadmapBlockArtwork } from "@/lib/icon-map";
import { useProgress } from "@/lib/use-progress";
import { getBlockProgress, getGlobalRoadmapProgress } from "@/content/roadmap-progress";
import { OFFICIAL_ROADMAP } from "@/content/roadmap-registry";

export const Route = createFileRoute("/blocs")({
  component: BlocksPage,
  head: () => ({
    meta: [
      { title: "Blocs de formation — MedLingo" },
      { name: "description", content: "Les 15 blocs officiels de la formation DEA MedLingo." },
    ],
  }),
});

function BlocksPage() {
  const { progress } = useProgress();
  const global = getGlobalRoadmapProgress(progress);

  return (
    <RoadmapPageShell
      eyebrow="Formation DEA"
      title="Les 15 blocs officiels"
      subtitle={`${OFFICIAL_ROADMAP.parcours.length} parcours · ${global.percentage}% de progression globale`}
    >
      <div className="grid gap-4">
        {OFFICIAL_ROADMAP.blocks.map((block) => {
          const blockProgress = getBlockProgress(block, progress);
          const count = OFFICIAL_ROADMAP.parcours.filter(
            (parcours) => parcours.blocId === block.id,
          ).length;
          return (
            <Link
              key={block.id}
              to="/bloc/$blocId"
              params={{ blocId: block.id }}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-xl transition hover:-translate-y-0.5 hover:border-cyan-400/35 hover:bg-white/10"
            >
              <RoadmapBlockArtwork blocId={block.id} order={block.order} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
                  Bloc {block.order} · {count} parcours
                </p>
                <h2 className="font-display text-lg font-extrabold">{block.title}</h2>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{ width: `${blockProgress.percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-white/50">{blockProgress.percentage}%</span>
              <ChevronRight className="h-5 w-5 text-white/35 group-hover:text-cyan-300" />
            </Link>
          );
        })}
      </div>
    </RoadmapPageShell>
  );
}
