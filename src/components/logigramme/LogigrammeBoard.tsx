import type { Logigramme } from "@/content/logigramme/logigramme-domain";
import {
  LOGIGRAMME_NODE_KIND_LABELS,
  getLogigrammeStartNode,
} from "@/content/logigramme/logigramme-domain";
import {
  buildLogigrammeGeometry,
  logigrammeEdgePath,
} from "@/content/logigramme/logigramme-layout";
import { useEffect, useMemo, useRef } from "react";
import {
  LOGIGRAMME_EDGE_COLORS,
  LOGIGRAMME_EDGE_LABEL_STYLES,
  LOGIGRAMME_NODE_STYLES,
} from "./logigramme-node-style";

/**
 * Le schéma cliquable.
 *
 * Chaque case est un bouton : c'est ce qui ouvre la fiche de l'étape. Le plan
 * est plus large qu'un téléphone, il défile donc dans les deux sens ; la vue
 * « Étapes » rend le même contenu en liste pour ceux qui préfèrent lire.
 *
 * Les flèches sont tracées dans un SVG posé sous les cases, aux coordonnées
 * calculées par `buildLogigrammeGeometry`. Elles ne portent aucune
 * information que la fiche ne redonne pas — d'où `aria-hidden` : un lecteur
 * d'écran suit les boutons et les « suites possibles » de chaque fiche.
 */
export function LogigrammeBoard({
  logigramme,
  selectedNodeId,
  onSelectNode,
}: {
  logigramme: Logigramme;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const geometry = useMemo(() => buildLogigrammeGeometry(logigramme), [logigramme]);
  const scroller = useRef<HTMLDivElement>(null);

  // Le plan est plus large qu'un téléphone, et le couloir des boucles de
  // retour occupe sa gauche : sans ce recentrage, l'écran s'ouvre sur une zone
  // vide et le départ de la mission se trouve hors champ.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const start = geometry.nodes.find(
      (box) => box.node.id === getLogigrammeStartNode(logigramme).id,
    );
    if (!start) return;
    element.scrollLeft = Math.max(0, start.centerX - element.clientWidth / 2);
  }, [geometry, logigramme]);

  return (
    <div
      ref={scroller}
      className="relative -mx-4 overflow-auto overscroll-x-contain px-4 pb-4 sm:mx-0 sm:rounded-3xl sm:border sm:border-white/10 sm:bg-white/[0.04] sm:px-0"
      aria-label="Schéma de l'intervention, défilement horizontal"
      tabIndex={0}
    >
      <div className="relative" style={{ width: geometry.width, height: geometry.height }}>
        <svg
          className="absolute left-0 top-0"
          width={geometry.width}
          height={geometry.height}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            {Object.entries(LOGIGRAMME_EDGE_COLORS).map(([tone, color]) => (
              <marker
                key={tone}
                id={`logigramme-arrow-${tone}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            ))}
          </defs>
          {geometry.edges.map((edge) => (
            <path
              key={edge.id}
              d={logigrammeEdgePath(edge.points)}
              fill="none"
              stroke={LOGIGRAMME_EDGE_COLORS[edge.tone]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeOpacity={0.85}
              markerEnd={`url(#logigramme-arrow-${edge.tone})`}
            />
          ))}
        </svg>

        {geometry.edges
          .filter((edge) => edge.label !== null)
          .map((edge) => (
            <span
              key={`${edge.id}-label`}
              aria-hidden="true"
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-0.5 text-[11px] font-black ${
                LOGIGRAMME_EDGE_LABEL_STYLES[edge.tone]
              }`}
              style={{ left: edge.labelX, top: edge.labelY }}
            >
              {edge.label}
            </span>
          ))}

        {geometry.nodes.map((box) => {
          const style = LOGIGRAMME_NODE_STYLES[box.node.kind];
          const selected = box.node.id === selectedNodeId;
          return (
            <button
              key={box.node.id}
              type="button"
              onClick={() => onSelectNode(box.node.id)}
              aria-haspopup="dialog"
              aria-label={`${LOGIGRAMME_NODE_KIND_LABELS[box.node.kind]} : ${box.node.title}. Ouvrir la fiche détaillée.`}
              className={`press absolute flex flex-col items-center justify-center gap-1 rounded-2xl border px-3 text-center shadow-lg transition hover:-translate-y-0.5 hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${style.box} ${style.ring} ${
                selected ? "ring-2" : ""
              }`}
              style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
            >
              {box.node.kind === "decision" ? (
                <span
                  className={`rounded-full px-2 py-px text-[9px] font-black uppercase tracking-[0.12em] ${style.chip}`}
                >
                  Décision
                </span>
              ) : null}
              <span className="text-[12px] font-extrabold leading-tight">
                {box.node.boardLabel.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
