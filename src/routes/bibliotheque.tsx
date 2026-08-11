import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeLibraryDashboard } from "@/features/knowledge-library/KnowledgeLibraryDashboard";

export const Route = createFileRoute("/bibliotheque")({
  component: KnowledgeLibraryDashboard,
  head: () => ({
    meta: [
      { title: "Bibliothèque officielle — Pulseeo" },
      {
        name: "description",
        content: "Sources officielles, connaissances versionnées et traçabilité Pulseeo.",
      },
    ],
  }),
});
