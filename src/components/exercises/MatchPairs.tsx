import { useState } from "react";
import { Check } from "lucide-react";

export interface MatchPair {
  id: string;
  left: string;
  right: string;
}
interface MatchPairsProps {
  pairs: MatchPair[];
  onComplete?: (matches: Record<string, string>) => void;
}

/**
 * Jeu d'association mot ↔ définition. L'utilisateur tape un mot puis sa définition.
 * Les paires correctes se colorent en success ; le composant ne juge pas — il expose
 * les mappings via onComplete.
 */
export function MatchPairs({ pairs, onComplete }: MatchPairsProps) {
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [rightSel, setRightSel] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});

  // shuffle right column stable via id sort (déterministe côté UI)
  const rights = [...pairs].sort((a, b) => a.right.localeCompare(b.right));

  const tryMatch = (l: string, r: string) => {
    const next = { ...matches, [l]: r };
    setMatches(next);
    setLeftSel(null);
    setRightSel(null);
    if (Object.keys(next).length === pairs.length) onComplete?.(next);
  };

  const cellClass = (matched: boolean, selected: boolean) =>
    `panel press w-full px-3 py-3 text-left text-sm font-bold transition border-2 ${
      matched
        ? "border-[color:var(--color-success)] bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]"
        : selected
          ? "border-[color:var(--color-primary)] glow-primary"
          : "border-transparent"
    }`;

  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-3">
      <div className="grid gap-2">
        <p className="section-eyebrow">Termes</p>
        {pairs.map((p) => {
          const matched = matches[p.id] != null;
          const selected = leftSel === p.id;
          return (
            <button
              key={p.id}
              disabled={matched}
              onClick={() => {
                setLeftSel(p.id);
                if (rightSel) tryMatch(p.id, rightSel);
              }}
              className={cellClass(matched, selected)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1">{p.left}</span>
                {matched ? <Check className="h-4 w-4" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-2">
        <p className="section-eyebrow">Définitions</p>
        {rights.map((p) => {
          const matched = Object.values(matches).includes(p.right);
          const selected = rightSel === p.right;
          return (
            <button
              key={p.id + "-r"}
              disabled={matched}
              onClick={() => {
                setRightSel(p.right);
                if (leftSel) tryMatch(leftSel, p.right);
              }}
              className={cellClass(matched, selected)}
            >
              {p.right}
            </button>
          );
        })}
      </div>
    </div>
  );
}
