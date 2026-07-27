import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, BookOpen, Box, ChevronRight, Clock, Lock, Sparkles, Trophy } from "lucide-react";
import { RoadmapPageShell } from "@/components/roadmap/RoadmapPageShell";
import { RoadmapParcoursArtwork } from "@/lib/icon-map";
import { useProgress } from "@/lib/use-progress";
import { FORMATION_CATALOG } from "@/content/formation-registry";
import { getParcoursProgress, isParcoursUnlocked } from "@/content/roadmap-progress";
import { getParcoursBlock, getRoadmapParcours } from "@/content/roadmap-registry";

export const Route = createFileRoute("/parcours/$parcoursId")({
  component: ParcoursPage,
  head: ({ params }) => {
    const parcours = getRoadmapParcours(params.parcoursId);
    return {
      meta: [{ title: parcours ? `${parcours.title} — MedLingo` : "Parcours — MedLingo" }],
    };
  },
});

function ParcoursPage() {
  const { parcoursId } = Route.useParams();
  const parcours = getRoadmapParcours(parcoursId);
  const block = getParcoursBlock(parcoursId);
  const { progress } = useProgress();

  if (!parcours || !block) {
    return (
      <RoadmapPageShell eyebrow="Formation DEA" title="Parcours introuvable">
        <p className="text-white/60">Cet identifiant de parcours n’existe pas.</p>
      </RoadmapPageShell>
    );
  }

  const unlocked = isParcoursUnlocked(parcours, progress);
  const entityProgress = getParcoursProgress(parcours, progress);
  const rewardItems = [
    parcours.xp ? { icon: Sparkles, label: `${parcours.xp} XP` } : null,
    parcours.badge ? { icon: Award, label: parcours.badge } : null,
    parcours.chest ? { icon: Box, label: `Coffre ${parcours.chest}` } : null,
  ].filter(Boolean) as Array<{ icon: typeof Sparkles; label: string }>;

  return (
    <RoadmapPageShell
      backHref={`/bloc/${block.id}`}
      backLabel={block.title}
      eyebrow={`Parcours ${parcours.order} · ${parcours.stage === "advanced" ? "Approfondissement" : "Socle DEA"}`}
      title={parcours.title}
      subtitle={parcours.subtitle}
    >
      <section className="mb-6 rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/15 to-violet-500/10 p-5">
        <div className="flex items-start gap-4">
          <RoadmapParcoursArtwork parcoursId={parcours.id} blocId={block.id} locked={!unlocked} />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-white/65">
              {parcours.description ?? "Objectifs détaillés en attente de spécification."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {parcours.estimatedMinutes ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  <Clock className="h-3.5 w-3.5" /> {parcours.estimatedMinutes} min
                </span>
              ) : null}
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                {parcours.plannedLessonCount} leçons
              </span>
              {!unlocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">
                  <Lock className="h-3.5 w-3.5" /> Prérequis non validé
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-400"
            style={{ width: `${entityProgress.percentage}%` }}
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-xl font-extrabold">Leçons</h2>
        <div className="grid gap-3">
          {parcours.lessonBlueprints.map((lesson) => {
            const content = FORMATION_CATALOG.findLesson("dea", lesson.id);
            const playable =
              content?.lesson.status === "published" || content?.lesson.status === "review";
            const done = progress.completedLessons[lesson.id];
            return (
              <Link
                key={lesson.id}
                to="/lecon/$lessonId"
                params={{ lessonId: lesson.id }}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:border-cyan-400/30 hover:bg-white/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase text-cyan-400">Leçon {lesson.order}</p>
                  <h3 className="font-bold">{lesson.title}</h3>
                </div>
                <span className="hidden text-xs font-bold text-white/40 sm:block">
                  {done
                    ? "Terminée"
                    : content?.lesson.status === "review"
                      ? "Testable · à valider"
                      : playable
                        ? "Jouable"
                        : "Contenu en attente"}
                </span>
                <ChevronRight className="h-5 w-5 text-white/30 group-hover:text-cyan-300" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-xl font-extrabold">Récompenses prévues</h2>
        {rewardItems.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {rewardItems.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold"
              >
                <Icon className="h-4 w-4 text-amber-300" />
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/50">
            Équilibrage XP, badge ou coffre encore en attente dans la spécification officielle.
          </p>
        )}
      </section>

      <Link
        to="/boss/$bossId"
        params={{ bossId: parcours.bossId }}
        className="group flex items-center gap-4 rounded-3xl border border-amber-300/30 bg-gradient-to-r from-amber-400/15 to-red-500/10 p-5 transition hover:border-amber-300/60"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300">
          <Trophy className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">Boss</p>
          <p className="font-display text-lg font-extrabold">Épreuve finale du parcours</p>
        </div>
        <ChevronRight className="h-5 w-5 text-amber-300" />
      </Link>
    </RoadmapPageShell>
  );
}
