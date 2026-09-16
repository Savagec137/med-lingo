import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  ListChecks,
  ScrollText,
  Shield,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Logigramme, LogigrammeFichePoint } from "@/content/logigramme/logigramme-domain";
import {
  LOGIGRAMME_NODE_KIND_LABELS,
  LOGIGRAMME_POINT_PROVENANCE_LABELS,
  getOutgoingEdges,
} from "@/content/logigramme/logigramme-domain";
import { findLogigrammeNode } from "@/content/logigramme/logigramme-registry";
import { findCompetency, findDocument, findKnowledge } from "@/content/library/library-catalog";
import { getRoadmapParcours } from "@/content/roadmap-registry";
import { LOGIGRAMME_EDGE_LABEL_STYLES, LOGIGRAMME_NODE_STYLES } from "./logigramme-node-style";

/**
 * La fiche détaillée d'une case.
 *
 * Elle répond dans cet ordre aux quatre questions que pose une étape :
 * qu'attend-on de moi, dans quel ordre, qu'est-ce qui l'impose, et qu'est-ce
 * qui se rate le plus souvent. Les points clés portent leur provenance : un
 * énoncé officiel cite le texte indexé, un énoncé MedLingo dit qu'il attend
 * une relecture. Le lecteur doit pouvoir faire la différence sans quitter la
 * fiche.
 *
 * Les sorties de l'étape sont cliquables : on suit le logigramme de fiche en
 * fiche, sans revenir au schéma.
 */
export function LogigrammeFicheDialog({
  logigramme,
  nodeId,
  onSelectNode,
  onClose,
}: {
  logigramme: Logigramme;
  nodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
}) {
  const node = nodeId ? findLogigrammeNode(logigramme, nodeId) : null;
  if (!node) return null;

  const { fiche } = node;
  const style = LOGIGRAMME_NODE_STYLES[node.kind];
  const branches = getOutgoingEdges(logigramme, node.id);
  const knowledge = fiche.knowledgeId ? findKnowledge(fiche.knowledgeId) : undefined;
  const parcours = fiche.parcoursId ? getRoadmapParcours(fiche.parcoursId) : null;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-white/10 bg-slate-950/95 text-white">
        <DialogHeader className="text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${style.chip}`}
            >
              {LOGIGRAMME_NODE_KIND_LABELS[node.kind]}
            </span>
            {fiche.status === "to_validate" ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200">
                Relecture formateur en attente
              </span>
            ) : null}
          </div>
          <DialogTitle className="font-display text-2xl font-black leading-tight">
            {node.title}
          </DialogTitle>
          <DialogDescription className="text-white/70">{fiche.role}</DialogDescription>
        </DialogHeader>

        <p className="text-sm leading-relaxed text-white/80">{fiche.summary}</p>

        <Section
          icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
          title="Dans quel ordre"
        >
          <ol className="grid gap-2">
            {fiche.checklist.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm text-white/80">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-black text-white/70">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          icon={<ScrollText className="h-4 w-4" aria-hidden="true" />}
          title="Ce qui l'impose"
        >
          <ul className="grid gap-3">
            {fiche.keyPoints.map((point) => (
              <li
                key={point.text}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm"
              >
                <p className="leading-relaxed text-white/85">{point.text}</p>
                <SourceLine point={point} />
              </li>
            ))}
          </ul>
        </Section>

        <Section
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          title="Erreurs fréquentes"
        >
          <ul className="grid gap-2">
            {fiche.commonErrors.map((error) => (
              <li key={error} className="flex gap-2 text-sm leading-relaxed text-white/75">
                <span aria-hidden="true" className="text-rose-300">
                  ✕
                </span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </Section>

        {branches.length > 0 ? (
          <Section
            icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            title={node.kind === "decision" ? "Selon la réponse" : "Étape suivante"}
          >
            <div className="grid gap-2">
              {branches.map((edge) => {
                const target = findLogigrammeNode(logigramme, edge.to);
                if (!target) return null;
                return (
                  <button
                    key={`${edge.from}-${edge.to}`}
                    type="button"
                    onClick={() => onSelectNode(edge.to)}
                    className="press flex min-h-12 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-left transition hover:border-cyan-400/35 hover:bg-white/10"
                  >
                    {edge.label ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${LOGIGRAMME_EDGE_LABEL_STYLES[edge.tone]}`}
                      >
                        {edge.label}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 text-sm font-bold">{target.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </Section>
        ) : null}

        <Section
          icon={<Shield className="h-4 w-4" aria-hidden="true" />}
          title="Compétences mobilisées"
        >
          <ul className="grid gap-2">
            {fiche.competencyIds.map((competencyId) => {
              const competency = findCompetency(competencyId);
              return (
                <li key={competencyId} className="text-sm text-white/75">
                  <span className="font-black text-cyan-300">
                    C{competencyId.replace("dea.c", "")}
                  </span>{" "}
                  — {competency?.title ?? competencyId}
                </li>
              );
            })}
          </ul>
        </Section>

        {knowledge || parcours ? (
          <Section
            icon={<BookOpenCheck className="h-4 w-4" aria-hidden="true" />}
            title="Pour aller plus loin"
          >
            <div className="grid gap-2">
              {parcours ? (
                <Link
                  to="/parcours/$parcoursId"
                  params={{ parcoursId: parcours.id }}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-sm font-bold transition hover:bg-cyan-400/15"
                >
                  <span>
                    Parcours {parcours.order} · {parcours.title}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              ) : null}
              {knowledge ? (
                <Link
                  to="/bibliotheque"
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm transition hover:bg-white/10"
                >
                  <span>
                    <span className="block font-bold">Bibliothèque · {knowledge.title}</span>
                    <span className="block text-xs text-white/55">{knowledge.summary}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </Section>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-white/10 pt-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/50">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * La ligne de provenance sous un point clé. Un énoncé officiel cite le
 * document indexé et sa section ; un énoncé interne annonce qu'il n'engage que
 * MedLingo, sans emprunter de texte.
 */
function SourceLine({ point }: { point: LogigrammeFichePoint }) {
  if (point.provenance === "official") {
    const document = point.sourceDocumentId ? findDocument(point.sourceDocumentId) : undefined;
    return (
      <p className="mt-2 text-xs text-emerald-300/80">
        <span className="font-black uppercase tracking-[0.1em]">
          {LOGIGRAMME_POINT_PROVENANCE_LABELS.official}
        </span>{" "}
        · {document?.title ?? point.sourceDocumentId} — {point.sourceSection}
      </p>
    );
  }
  return (
    <p className="mt-2 text-xs text-amber-200/70">
      <span className="font-black uppercase tracking-[0.1em]">
        {LOGIGRAMME_POINT_PROVENANCE_LABELS.internal}
      </span>
    </p>
  );
}
