import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * État vide standardisé : icône dans un halo néon + titre + description + CTA optionnel.
 * Conserve l'identité MedLingo (glass + primary glow).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass flex flex-col items-center justify-center gap-3 rounded-3xl px-6 py-10 text-center animate-bounce-in ${className}`}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground glow-primary"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <Icon className="h-8 w-8" strokeWidth={2.25} />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-base font-extrabold">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
