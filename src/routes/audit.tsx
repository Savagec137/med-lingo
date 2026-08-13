import { createFileRoute } from "@tanstack/react-router";
import { ContentAuditDashboard } from "@/features/content-audit/ContentAuditDashboard";

export const Route = createFileRoute("/audit")({
  component: ContentAuditDashboard,
  head: () => ({
    meta: [
      { title: "Audit pédagogique — Medoca" },
      {
        name: "description",
        content: "Contrôle en lecture seule de la base pédagogique avant déploiement.",
      },
    ],
  }),
});
