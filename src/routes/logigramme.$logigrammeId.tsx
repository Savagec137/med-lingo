import { createFileRoute } from "@tanstack/react-router";
import { LogigrammeView } from "@/components/logigramme/LogigrammeView";
import { RoadmapPageShell } from "@/components/roadmap/RoadmapPageShell";
import { findLogigramme } from "@/content/logigramme/logigramme-registry";
import { getRoadmapBlock } from "@/content/roadmap-registry";

export const Route = createFileRoute("/logigramme/$logigrammeId")({
  component: LogigrammePage,
  head: ({ params }) => {
    const logigramme = findLogigramme(params.logigrammeId);
    return {
      meta: [
        { title: logigramme ? `${logigramme.title} — MedLingo` : "Logigramme — MedLingo" },
        {
          name: "description",
          content:
            logigramme?.description ??
            "Le déroulé d'une intervention, étape par étape, avec une fiche détaillée par case.",
        },
      ],
    };
  },
});

function LogigrammePage() {
  const { logigrammeId } = Route.useParams();
  const logigramme = findLogigramme(logigrammeId);

  if (!logigramme) {
    return (
      <RoadmapPageShell eyebrow="Formation DEA" title="Logigramme introuvable">
        <p className="text-white/60">Cet identifiant de logigramme n’existe pas.</p>
      </RoadmapPageShell>
    );
  }

  const block = getRoadmapBlock(logigramme.blocId);

  return (
    <RoadmapPageShell
      backHref={`/bloc/${logigramme.blocId}`}
      backLabel={block ? block.title : "Retour au bloc"}
      eyebrow={block ? `Bloc ${block.order} · ${logigramme.subtitle}` : logigramme.subtitle}
      title={logigramme.title}
      subtitle={logigramme.description}
      width="wide"
    >
      <LogigrammeView logigramme={logigramme} />
    </RoadmapPageShell>
  );
}
