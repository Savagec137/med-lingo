import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Check, Lock, Star } from "lucide-react";
import { LessonIcon, RoadmapBlockArtwork, RoadmapParcoursArtwork } from "@/lib/icon-map";
import { OFFICIAL_ROADMAP_BLOCS, OFFICIAL_ROADMAP_PARCOURS } from "@/content/curriculum-content";
import type { Progress } from "@/lib/use-progress";

const INITIAL_BLOCK_COUNT = 2;
const BLOCK_BATCH_SIZE = 2;
const OFFSETS = [0, 64, 96, 64, 0, -64, -96, -64];

interface HomeRoadmapProps {
  completedLessons: Progress["completedLessons"];
  currentLessonId?: string;
  hydrated: boolean;
  unlockedLessonIds: string[];
}

export const HomeRoadmap = memo(function HomeRoadmap({
  completedLessons,
  currentLessonId,
  hydrated,
  unlockedLessonIds,
}: HomeRoadmapProps) {
  const [visibleBlockCount, setVisibleBlockCount] = useState(INITIAL_BLOCK_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const unlockedSet = useMemo(() => new Set(unlockedLessonIds), [unlockedLessonIds]);
  const visibleBlocks = OFFICIAL_ROADMAP_BLOCS.slice(0, visibleBlockCount);
  const hasMoreBlocks = visibleBlockCount < OFFICIAL_ROADMAP_BLOCS.length;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreBlocks) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setVisibleBlockCount((count) =>
          Math.min(OFFICIAL_ROADMAP_BLOCS.length, count + BLOCK_BATCH_SIZE),
        );
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreBlocks, visibleBlockCount]);

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-400">
            Formation DEA
          </div>
          <h2 className="font-display text-xl font-extrabold text-white drop-shadow-lg">
            Ton parcours de formation
          </h2>
        </div>
        <div className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/70 backdrop-blur">
          {OFFICIAL_ROADMAP_PARCOURS.length} parcours
        </div>
      </div>

      <div className="space-y-10">
        {visibleBlocks.map((bloc) => (
          <section
            key={bloc.id}
            aria-labelledby={`${bloc.id}-title`}
            style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}
          >
            <div className="mb-4 flex items-center gap-3">
              <RoadmapBlockArtwork blocId={bloc.id} order={bloc.order} />
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-400">
                  Bloc {bloc.order}
                </p>
                <h3
                  id={`${bloc.id}-title`}
                  className="truncate font-display text-lg font-extrabold text-white"
                >
                  {bloc.title}
                </h3>
              </div>
            </div>

            <div className="space-y-5">
              {bloc.parcours.map((parcours) => {
                const hasPublishedLessons = parcours.publishedLessonCount > 0;
                return (
                  <article key={parcours.id}>
                    <Link
                      to="/parcours/$parcoursId"
                      params={{ parcoursId: parcours.id }}
                      className={`flex items-center gap-4 rounded-xl border p-4 shadow-xl backdrop-blur-md ${
                        hasPublishedLessons
                          ? "border-cyan-400/35 bg-white/10"
                          : "border-white/10 bg-slate-950/35"
                      }`}
                    >
                      <RoadmapParcoursArtwork
                        parcoursId={parcours.id}
                        blocId={bloc.id}
                        locked={!hasPublishedLessons}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
                          Parcours {parcours.order}
                        </p>
                        <h4 className="font-display text-base font-extrabold text-white">
                          {parcours.title}
                        </h4>
                        <p className="text-sm text-white/55">{parcours.subtitle}</p>
                      </div>

                      <div
                        className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold sm:flex ${
                          hasPublishedLessons
                            ? "bg-emerald-400/15 text-emerald-300"
                            : "bg-white/5 text-white/45"
                        }`}
                      >
                        {hasPublishedLessons ? (
                          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {hasPublishedLessons
                          ? `${parcours.publishedLessonCount}/${parcours.plannedLessonCount} disponibles`
                          : "En préparation"}
                      </div>
                    </Link>

                    {hasPublishedLessons && (
                      <div className="relative mx-auto flex flex-col items-center gap-6 py-5">
                        {parcours.lessons.map((lesson, index) => {
                          const done = hydrated ? completedLessons[lesson.id] : undefined;
                          const unlocked = hydrated && unlockedSet.has(lesson.id);
                          return (
                            <div
                              key={lesson.id}
                              className="relative flex flex-col items-center"
                              style={{
                                transform: `translateX(${OFFSETS[index % OFFSETS.length]}px)`,
                              }}
                            >
                              <LessonNode
                                lessonId={lesson.id}
                                unitId={parcours.id}
                                title={lesson.title}
                                unlocked={unlocked}
                                done={!!done}
                                stars={done?.stars ?? 0}
                                isCurrent={lesson.id === currentLessonId}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {hasMoreBlocks && <div ref={loadMoreRef} aria-hidden className="h-px w-full" />}
    </>
  );
});

const LessonNode = memo(function LessonNode({
  lessonId,
  unitId,
  title,
  unlocked,
  done,
  stars,
  isCurrent,
}: {
  lessonId: string;
  unitId: string;
  title: string;
  unlocked: boolean;
  done: boolean;
  stars: number;
  isCurrent: boolean;
}) {
  const bubble = (
    <div className="group relative flex flex-col items-center">
      {isCurrent && (
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="whitespace-nowrap rounded-lg bg-cyan-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-900 shadow-lg">
            À toi !
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={!unlocked}
        className={`relative flex h-16 w-16 items-center justify-center rounded-xl transition-all ${
          !unlocked
            ? "cursor-not-allowed border-2 border-dashed border-white/20 bg-white/5 text-white/30"
            : done
              ? "border-2 border-emerald-400 bg-emerald-400/20 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.2)] hover:shadow-[0_0_40px_rgba(52,211,153,0.3)] active:scale-95"
              : isCurrent
                ? "border-2 border-cyan-400 bg-cyan-400/20 text-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.3)] ring-4 ring-cyan-400/30 active:scale-95"
                : "border-2 border-white/20 bg-white/10 text-white/60 hover:border-white/40 active:scale-95"
        }`}
      >
        {!unlocked ? (
          <Lock className="h-5 w-5" />
        ) : done ? (
          <Check className="h-7 w-7" strokeWidth={3.5} />
        ) : (
          <LessonIcon lessonId={lessonId} unitId={unitId} className="h-7 w-7" strokeWidth={2.25} />
        )}
        {done && stars > 0 && (
          <div className="absolute -bottom-2 flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 shadow-md backdrop-blur-sm">
            {[0, 1, 2].map((star) => (
              <Star
                key={star}
                className={`h-3 w-3 ${
                  star < stars ? "fill-amber-400 text-amber-400" : "text-white/20"
                }`}
              />
            ))}
          </div>
        )}
      </button>
      <p
        className={`mt-3 max-w-[160px] text-center text-xs font-bold leading-tight ${
          unlocked ? "text-white drop-shadow-md" : "text-white/40"
        }`}
      >
        {title}
      </p>
    </div>
  );

  if (!unlocked) return bubble;
  return (
    <Link to="/lecon/$lessonId" params={{ lessonId }} className="block">
      {bubble}
    </Link>
  );
});
