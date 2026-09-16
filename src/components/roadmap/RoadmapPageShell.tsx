import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/**
 * `wide` est réservé aux pages dont le contenu est lui-même large — le
 * logigramme, qui dépasse en pixels la colonne de lecture. Partout ailleurs,
 * la largeur de lecture reste celle des autres pages de la feuille de route.
 */
const SHELL_WIDTHS = {
  default: "max-w-3xl",
  wide: "max-w-6xl",
} as const;

export function RoadmapPageShell({
  backHref = "/",
  backLabel = "Retour",
  eyebrow,
  title,
  subtitle,
  width = "default",
  children,
}: {
  backHref?: string;
  backLabel?: string;
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  width?: keyof typeof SHELL_WIDTHS;
  children: ReactNode;
}) {
  return (
    <main
      className={`mx-auto min-h-screen w-full px-4 pb-32 pt-6 text-white ${SHELL_WIDTHS[width]}`}
    >
      <a
        href={backHref}
        className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </a>
      <header className="mb-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-400">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-display text-3xl font-black sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-2xl text-white/60">{subtitle}</p> : null}
      </header>
      {children}
    </main>
  );
}
