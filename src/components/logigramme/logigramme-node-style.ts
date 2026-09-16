import type {
  LogigrammeEdgeTone,
  LogigrammeNodeKind,
} from "@/content/logigramme/logigramme-domain";

/**
 * Les couleurs du schéma, au même endroit pour la vue « Schéma », la vue
 * « Étapes » et la fiche : une case verte dans le schéma doit rester verte
 * dans la liste, sinon le joueur ne reconnaît plus l'étape qu'il vient
 * d'ouvrir.
 *
 * Les losanges du logigramme d'origine sont rendus ici par une case ambre
 * plutôt que par un vrai losange : trois lignes de texte dans un losange
 * deviennent illisibles sur un écran de téléphone, et c'est la sortie nommée
 * « Oui » / « Non » qui signale une décision, pas la forme.
 */
export interface LogigrammeNodeStyle {
  /** Bordure et fond de la case. */
  box: string;
  /** Fond du chip qui nomme la nature du nœud. */
  chip: string;
  /** Couleur du liseré de sélection. */
  ring: string;
}

export const LOGIGRAMME_NODE_STYLES: Record<LogigrammeNodeKind, LogigrammeNodeStyle> = {
  start: {
    box: "border-emerald-400/45 bg-emerald-400/15 text-emerald-50",
    chip: "bg-emerald-400/20 text-emerald-200",
    ring: "ring-emerald-300/70",
  },
  step: {
    box: "border-sky-400/40 bg-sky-400/12 text-sky-50",
    chip: "bg-sky-400/20 text-sky-200",
    ring: "ring-sky-300/70",
  },
  decision: {
    box: "border-amber-400/45 bg-amber-400/12 text-amber-50",
    chip: "bg-amber-400/20 text-amber-200",
    ring: "ring-amber-300/70",
  },
  end: {
    box: "border-emerald-400/45 bg-emerald-400/15 text-emerald-50",
    chip: "bg-emerald-400/20 text-emerald-200",
    ring: "ring-emerald-300/70",
  },
};

/** Couleur du trait d'une flèche, reprise du logigramme d'origine. */
export const LOGIGRAMME_EDGE_COLORS: Record<LogigrammeEdgeTone, string> = {
  neutral: "#94a3b8",
  yes: "#34d399",
  no: "#fb7185",
};

/** Habillage du chip « Oui » / « Non » posé sur une flèche. */
export const LOGIGRAMME_EDGE_LABEL_STYLES: Record<LogigrammeEdgeTone, string> = {
  neutral: "border-white/15 bg-slate-900/90 text-white/70",
  yes: "border-emerald-400/40 bg-slate-900/90 text-emerald-300",
  no: "border-rose-400/40 bg-slate-900/90 text-rose-300",
};
