import { Link } from "@tanstack/react-router";
import { X, Heart, Sparkles, Clock } from "lucide-react";
import type { ReactNode } from "react";

export interface LessonObjective {
  id: string;
  text: string;
  done?: boolean;
}
export interface VocabTerm {
  term: string;
  definition: string;
}

interface LessonScreenProps {
  title: string;
  eyebrow?: string;
  /** 0..1 */
  progress?: number;
  hearts?: number;
  xp?: number;
  minutes?: number;

  /** Contenu pédagogique — libre. Chaque section est optionnelle. */
  objectives?: LessonObjective[];
  intro?: ReactNode;
  images?: { url: string; alt: string; caption?: string }[];
  vocab?: VocabTerm[];

  /** Slots libres pour brancher les composants d'exercices */
  flashcards?: ReactNode;
  exercises?: ReactNode;
  clinicalCase?: ReactNode;
  quiz?: ReactNode;
  boss?: ReactNode;

  onExit?: () => void;
  exitHref?: string;
  footer?: ReactNode;
}

/**
 * Coquille d'écran de leçon "premium" prête pour Codex. Chaque bloc est
 * rendu uniquement s'il est fourni. Aucune logique — seulement de la mise
 * en forme + progression + hearts en haut.
 */
export function LessonScreen({
  title,
  eyebrow,
  progress = 0,
  hearts,
  xp,
  minutes,
  objectives,
  intro,
  images,
  vocab,
  flashcards,
  exercises,
  clinicalCase,
  quiz,
  boss,
  onExit,
  exitHref = "/",
  footer,
}: LessonScreenProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          {onExit ? (
            <button
              onClick={onExit}
              className="press rounded-full p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Quitter"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <Link to={exitHref} aria-label="Quitter" className="press rounded-full p-1.5 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </Link>
          )}
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, background: "var(--gradient-primary)" }}
            />
          </div>
          {hearts != null ? (
            <span className="chip text-[color:var(--color-destructive)]">
              <Heart className="h-3.5 w-3.5 fill-current" /> {hearts}
            </span>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6 pb-32">
        {/* Title block */}
        <div>
          {eyebrow ? <p className="section-eyebrow mb-2">{eyebrow}</p> : null}
          <h1 className="text-3xl font-black leading-tight">{title}</h1>
          {(xp != null || minutes != null) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {xp != null ? (
                <span className="chip">
                  <Sparkles className="h-3 w-3" /> {xp} XP
                </span>
              ) : null}
              {minutes != null ? (
                <span className="chip">
                  <Clock className="h-3 w-3" /> {minutes} min
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Objectives */}
        {objectives && objectives.length > 0 ? (
          <section className="panel p-4">
            <p className="section-eyebrow mb-2">Objectifs de la leçon</p>
            <ul className="grid gap-2">
              {objectives.map((o) => (
                <li key={o.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                      o.done ? "border-[color:var(--color-success)] bg-[color:var(--color-success)]" : "border-muted-foreground/40"
                    }`}
                  />
                  <span className={o.done ? "line-through text-muted-foreground" : ""}>{o.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Intro / lecture */}
        {intro ? <section className="prose-invert max-w-none text-[15px] leading-relaxed text-foreground/90">{intro}</section> : null}

        {/* Images */}
        {images && images.length > 0 ? (
          <section className="grid gap-3 sm:grid-cols-2">
            {images.map((im) => (
              <figure key={im.url} className="panel overflow-hidden p-0">
                <img src={im.url} alt={im.alt} className="block w-full" loading="lazy" />
                {im.caption ? (
                  <figcaption className="border-t border-white/10 px-3 py-2 text-xs text-muted-foreground">
                    {im.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </section>
        ) : null}

        {/* Vocab */}
        {vocab && vocab.length > 0 ? (
          <section>
            <p className="section-eyebrow mb-2">Vocabulaire clé</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {vocab.map((v) => (
                <div key={v.term} className="panel p-3">
                  <p className="text-base font-black text-[color:var(--color-primary)]">{v.term}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{v.definition}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {flashcards ? <Slot title="Flashcards">{flashcards}</Slot> : null}
        {exercises ? <Slot title="Exercices">{exercises}</Slot> : null}
        {clinicalCase ? <Slot title="Cas clinique">{clinicalCase}</Slot> : null}
        {quiz ? <Slot title="Quiz final">{quiz}</Slot> : null}
        {boss ? <Slot title="Boss">{boss}</Slot> : null}
      </main>

      {footer ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto max-w-2xl px-4 py-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
            {footer}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Slot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="section-eyebrow mb-3">{title}</p>
      {children}
    </section>
  );
}
