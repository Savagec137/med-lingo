import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Lock } from "lucide-react";
import { RoadmapPageShell } from "@/components/roadmap/RoadmapPageShell";
import { RoadmapBlockArtwork, RoadmapParcoursArtwork } from "@/lib/icon-map";
import { useProgress } from "@/lib/use-progress";
import {
  getBlockProgress,
  getParcoursProgress,
  isParcoursUnlocked,
} from "@/content/roadmap-progress";
import { getBlockParcours, getRoadmapBlock } from "@/content/roadmap-registry";

export const Route = createFileRoute("/bloc/$blocId")({
  component: BlockPage,
  head: ({ params }) => {
    const block = getRoadmapBlock(params.blocId);
    return { meta: [{ title: block ? `${block.title} — MedLingo` : "Bloc — MedLingo" }] };
  },
});

function BlockPage() {
  const { blocId } = Route.useParams();
  const block = getRoadmapBlock(blocId);
  const { progress } = useProgress();

  if (!block) {
    return (
      <RoadmapPageShell eyebrow="Formation DEA" title="Bloc introuvable">
        <p className="text-white/60">Cet identifiant de bloc n’existe pas.</p>
      </RoadmapPageShell>
    );
  }

  const parcours = getBlockParcours(block.id);
  const blockProgress = getBlockProgress(block, progress);

  return (
    <RoadmapPageShell
      backHref="/blocs"
      backLabel="Tous les blocs"
      eyebrow={`Bloc ${block.order} · ${block.stage === "advanced" ? "Approfondissement" : "Socle DEA"}`}
      title={block.title}
      subtitle={block.description}
    >
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
        <RoadmapBlockArtwork blocId={block.id} order={block.order} />
        <div className="flex-1">
          <div className="mb-2 flex justify-between text-sm font-bold">
            <span>Progression du bloc</span>
            <span>{blockProgress.percentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${blockProgress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {parcours.map((item) => {
          const unlocked = isParcoursUnlocked(item, progress);
          const itemProgress = getParcoursProgress(item, progress);
          return (
            <Link
              key={item.id}
              to="/parcours/$parcoursId"
              params={{ parcoursId: item.id }}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:border-cyan-400/35 hover:bg-white/10"
            >
              <RoadmapParcoursArtwork parcoursId={item.id} blocId={block.id} locked={!unlocked} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
                  Parcours {item.order}
                </p>
                <h2 className="font-display text-lg font-extrabold">{item.title}</h2>
                <p className="truncate text-sm text-white/50">{item.subtitle}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-extrabold">{itemProgress.percentage}%</p>
                <p className="text-xs text-white/40">{item.plannedLessonCount} leçons</p>
              </div>
              {!unlocked ? <Lock className="h-4 w-4 text-white/35" /> : null}
              <ChevronRight className="h-5 w-5 text-white/35 group-hover:text-cyan-300" />
            </Link>
          );
        })}
      </div>
    </RoadmapPageShell>
  );
}
