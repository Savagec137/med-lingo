import { LayoutGrid, List, MousePointerClick } from "lucide-react";
import { useState } from "react";
import type { Logigramme } from "@/content/logigramme/logigramme-domain";
import { LogigrammeBoard } from "./LogigrammeBoard";
import { LogigrammeFicheDialog } from "./LogigrammeFicheDialog";
import { LogigrammeStepList } from "./LogigrammeStepList";

type LogigrammeViewMode = "board" | "list";

/**
 * Le logigramme complet : le schéma, la liste, et la fiche qui s'ouvre au clic
 * sur une case.
 *
 * L'état tient en une seule valeur — la case ouverte. Les deux vues la
 * partagent, si bien qu'on peut ouvrir une fiche depuis le schéma, suivre une
 * sortie « Oui », puis passer en liste sans rien perdre.
 */
export function LogigrammeView({ logigramme }: { logigramme: Logigramme }) {
  const [mode, setMode] = useState<LogigrammeViewMode>("board");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold text-white/50">
          <MousePointerClick className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          Touchez une case pour ouvrir sa fiche détaillée.
        </p>
        <div
          className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.05] p-1"
          role="group"
          aria-label="Affichage du logigramme"
        >
          <ModeButton
            active={mode === "board"}
            onClick={() => setMode("board")}
            icon={<LayoutGrid className="h-4 w-4" aria-hidden="true" />}
            label="Schéma"
          />
          <ModeButton
            active={mode === "list"}
            onClick={() => setMode("list")}
            icon={<List className="h-4 w-4" aria-hidden="true" />}
            label="Étapes"
          />
        </div>
      </div>

      {mode === "board" ? (
        <LogigrammeBoard
          logigramme={logigramme}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
      ) : (
        <LogigrammeStepList
          logigramme={logigramme}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
      )}

      <p className="text-xs leading-relaxed text-white/40">{logigramme.sourceNote}</p>

      <LogigrammeFicheDialog
        logigramme={logigramme}
        nodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onClose={() => setSelectedNodeId(null)}
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-extrabold transition ${
        active ? "bg-cyan-400/20 text-cyan-200" : "text-white/55 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
