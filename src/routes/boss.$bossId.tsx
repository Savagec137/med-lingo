import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Play, Trophy } from "lucide-react";
import { RoadmapPageShell } from "@/components/roadmap/RoadmapPageShell";
import { FORMATION_CATALOG } from "@/content/formation-registry";
import { getRoadmapBoss, getRoadmapParcours } from "@/content/roadmap-registry";

export const Route = createFileRoute("/boss/$bossId")({
  component: BossPage,
  head: ({ params }) => {
    const boss = getRoadmapBoss(params.bossId);
    return { meta: [{ title: boss ? `${boss.title} — MedLingo` : "Boss — MedLingo" }] };
  },
});

function BossPage() {
  const { bossId } = Route.useParams();
  const boss = getRoadmapBoss(bossId);
  const parcours = boss ? getRoadmapParcours(boss.parcoursId) : null;

  if (!boss || !parcours) {
    return (
      <RoadmapPageShell eyebrow="Boss" title="Boss introuvable">
        <p className="text-white/60">Cette épreuve n’existe pas.</p>
      </RoadmapPageShell>
    );
  }

  const content = FORMATION_CATALOG.findLesson("dea", boss.id);
  const playable = content?.lesson.status === "published" || content?.lesson.status === "review";

  return (
    <RoadmapPageShell
      backHref={`/parcours/${parcours.id}`}
      backLabel={parcours.title}
      eyebrow={`Boss du parcours ${parcours.order}`}
      title={boss.title}
      subtitle="Une épreuve mélangée, différente des leçons, qui valide les compétences du parcours."
    >
      <section className="rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-400/15 via-red-500/10 to-violet-500/10 p-6">
        <Trophy className="mb-5 h-12 w-12 text-amber-300" />
        <h2 className="font-display text-xl font-extrabold">Scénario officiel</h2>
        {boss.scenario.length > 0 ? (
          <ul className="mt-4 grid gap-2 text-white/70">
            {boss.scenario.map((line) => (
              <li key={line} className="rounded-xl bg-black/15 px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-white/55">Scénario en attente de contenu.</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-2xl bg-white/[0.07] p-3">
            <p className="font-extrabold">{Math.round(boss.successThreshold * 100)}%</p>
            <p className="text-white/45">Réussite minimale</p>
          </div>
          <div className="rounded-2xl bg-white/[0.07] p-3">
            <p className="font-extrabold">
              {boss.selection.minimumExercises}–{boss.selection.maximumExercises}
            </p>
            <p className="text-white/45">Exercices mélangés</p>
          </div>
        </div>

        {playable ? (
          <Link
            to="/lecon/$lessonId"
            params={{ lessonId: boss.id }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-extrabold text-slate-950"
          >
            <Play className="h-5 w-5" />{" "}
            {content?.lesson.status === "review" ? "Tester le Boss" : "Commencer le Boss"}
          </Link>
        ) : (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 font-bold text-white/45">
            <Lock className="h-5 w-5" />
            Banque médicale validée requise
          </div>
        )}
      </section>
    </RoadmapPageShell>
  );
}
