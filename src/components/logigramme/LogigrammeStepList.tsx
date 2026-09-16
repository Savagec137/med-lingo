import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { Logigramme } from "@/content/logigramme/logigramme-domain";
import {
  LOGIGRAMME_NODE_KIND_LABELS,
  getLogigrammeWalkthrough,
  getOutgoingEdges,
} from "@/content/logigramme/logigramme-domain";
import { LOGIGRAMME_NODE_STYLES } from "./logigramme-node-style";

/**
 * Le même logigramme, en liste.
 *
 * Un schéma de trente cases ne tient pas sur un téléphone sans que l'on
 * défile dans les deux sens en permanence. Cette vue rend les mêmes étapes
 * dans l'ordre où la mission les rencontre, avec les mêmes couleurs et la même
 * fiche au clic : ce n'est pas un contenu de repli, c'est le même contenu.
 */
export function LogigrammeStepList({
  logigramme,
  selectedNodeId,
  onSelectNode,
}: {
  logigramme: Logigramme;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const steps = useMemo(() => getLogigrammeWalkthrough(logigramme), [logigramme]);

  return (
    <ol className="grid gap-3">
      {steps.map((node, index) => {
        const style = LOGIGRAMME_NODE_STYLES[node.kind];
        const branches = getOutgoingEdges(logigramme, node.id).filter(
          (edge) => edge.label !== null,
        );
        return (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => onSelectNode(node.id)}
              aria-haspopup="dialog"
              aria-label={`${LOGIGRAMME_NODE_KIND_LABELS[node.kind]} : ${node.title}. Ouvrir la fiche détaillée.`}
              className={`press flex w-full min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition hover:brightness-125 focus:outline-none focus-visible:ring-2 ${style.box} ${style.ring} ${
                node.id === selectedNodeId ? "ring-2" : ""
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${style.chip}`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-70">
                  {LOGIGRAMME_NODE_KIND_LABELS[node.kind]}
                </span>
                <span className="block font-display text-sm font-extrabold leading-tight">
                  {node.title}
                </span>
                {branches.length > 0 ? (
                  <span className="mt-1 block text-xs opacity-70">
                    {branches.map((edge) => edge.label).join(" · ")}
                  </span>
                ) : null}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
