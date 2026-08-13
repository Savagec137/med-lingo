import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, Move, MousePointerClick } from "lucide-react";
import type { PreparedLessonAnswer } from "@/content/lesson-runtime";
import { GlassPanel, MedocaHUD } from "@/components/medoca";
import {
  DEFAULT_HOTSPOT_RADIUS,
  MAX_ZOOM,
  MIN_ZOOM,
  type AnatomyLayer,
  type AnatomyQuestionConfig,
  type AnatomySelectionState,
} from "@/features/anatomy/anatomy-domain";
import { LAYER_BY_SLUG, slugOfHotspotId } from "@/features/anatomy/anatomy-layers";
import {
  answerOptions,
  correct,
  hotspotAriaLabel,
  infoCardFor,
  lockedLayerOf,
  pointsFromAnswers,
  progressOf,
  visibleLabel,
} from "@/features/anatomy/anatomy-question";
import pilotQuestion from "@/features/anatomy/pilot-grands-systemes.json";
import { AnatomyAnswerCards } from "./AnatomyAnswerCards";
import { AnatomyFeedbackPanel } from "./AnatomyFeedbackPanel";
import { AnatomyHumanPlate } from "./AnatomyHumanPlate";
import { AnatomyInfoCard } from "./AnatomyInfoCard";
import { AnatomyLayerToggle } from "./AnatomyLayerToggle";
import { AnatomyMiniMap } from "./AnatomyMiniMap";
import { AnatomyZoomControls } from "./AnatomyZoomControls";

const DEFAULT_LAYERS: Record<AnatomyLayer, boolean> = {
  skin: true,
  muscles: true,
  skeleton: true,
  organs: true,
  vessels: true,
};

export interface AnatomyBoardProps {
  questionId?: string;
  title?: string;
  subtitle?: string;
  instruction: string;
  answers: PreparedLessonAnswer[];
  selectedId: string | null;
  correctAnswerIds: string[];
  checked: boolean;
  lives?: number;
  maxLives?: number;
  foundHotspotIds?: string[];
  explanation?: string;
  onSelect: (id: string) => void;
  onBack?: () => void;
}

function inferLayer(id: string): AnatomyLayer {
  const slug = slugOfHotspotId(id);
  return LAYER_BY_SLUG[slug] ?? (slug.includes("muscle") ? "muscles" : "organs");
}

function createQuestionConfig(
  questionId: string | undefined,
  title: string,
  subtitle: string,
  instruction: string,
  answers: PreparedLessonAnswer[],
  correctAnswerIds: string[],
  explanation: string | undefined,
): AnatomyQuestionConfig {
  const points = pointsFromAnswers(answers);
  const targetId = correctAnswerIds[0] ?? answers[0]?.id ?? "missing-target";
  const isHeartPilot = targetId === "hotspot-heart";
  const pilot = pilotQuestion as AnatomyQuestionConfig;
  if (isHeartPilot && answers.length === pilot.hotspots.length) {
    const answerIds = new Set(answers.map((answer) => answer.id));
    if (pilot.hotspots.every((hotspot) => answerIds.has(hotspot.id))) {
      return {
        ...pilot,
        id: questionId ?? pilot.id,
        instruction: instruction.replace(/[.?!]+$/, ""),
        explanation: explanation || pilot.explanation,
        hotspots: pilot.hotspots.map((hotspot) => {
          const point = points.find((candidate) => candidate.id === hotspot.id);
          return point ? { ...hotspot, x: point.x, y: point.y, order: point.order } : hotspot;
        }),
      };
    }
  }

  const hotspots = points.map((point) => ({
    id: point.id,
    label: point.label,
    x: point.x,
    y: point.y,
    radius: DEFAULT_HOTSPOT_RADIUS,
    layer: inferLayer(point.id),
    order: point.order,
  }));
  return {
    id: questionId ?? "anatomy.runtime.question",
    title,
    subtitle,
    instruction: instruction.replace(/[.?!]+$/, ""),
    actionHint: "Sélectionne la zone demandée sur le schéma.",
    targetLabel: hotspots.find((point) => point.id === targetId)?.label ?? "Zone attendue",
    targetHotspotId: targetId,
    plateId: "plate.full-body",
    view: "front",
    enabledLayers: ["skeleton", "organs", "vessels", "muscles", "skin"],
    visibleLayers: ["skeleton", "organs", "vessels", "muscles", "skin"],
    hotspots,
    explanation:
      explanation ||
      "Cette structure constitue un repère anatomique utile pour décrire précisément une localisation.",
    infoCards: [],
  };
}

export function AnatomyBoard({
  questionId,
  title = "Les grands systèmes",
  subtitle = "Découvrir le corps humain",
  instruction,
  answers,
  selectedId,
  correctAnswerIds,
  checked,
  lives = 4,
  maxLives = 5,
  foundHotspotIds = [],
  explanation,
  onSelect,
  onBack,
}: AnatomyBoardProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const config = useMemo(
    () =>
      createQuestionConfig(
        questionId,
        title,
        subtitle,
        instruction,
        answers,
        correctAnswerIds,
        explanation,
      ),
    [questionId, title, subtitle, instruction, answers, correctAnswerIds, explanation],
  );
  const selectionState = useMemo<AnatomySelectionState>(
    () => ({
      selectedHotspotId: selectedId,
      missedTap: false,
      visibleLayers: config.enabledLayers.filter((layer) => layers[layer]),
      view: "front",
      zoom,
      offset,
      foundHotspotIds,
    }),
    [selectedId, config.enabledLayers, layers, zoom, offset, foundHotspotIds],
  );
  const correction = useMemo(
    () => correct(config, selectionState, checked),
    [config, selectionState, checked],
  );
  const options = useMemo(
    () => answerOptions(config, correction, foundHotspotIds),
    [config, correction, foundHotspotIds],
  );
  const progress = useMemo(() => progressOf(config, foundHotspotIds), [config, foundHotspotIds]);
  const usesReviewedPilotAsset =
    config.targetHotspotId === pilotQuestion.targetHotspotId &&
    config.hotspots.length === pilotQuestion.hotspots.length &&
    pilotQuestion.hotspots.every((pilotHotspot) =>
      config.hotspots.some((hotspot) => hotspot.id === pilotHotspot.id),
    );
  const selectedHotspot = config.hotspots.find((hotspot) => hotspot.id === selectedId);
  const info = checked ? infoCardFor(config, correction.correctHotspotId) : undefined;
  const result =
    correction.verdict === "correct"
      ? "correct"
      : correction.verdict === "pending"
        ? "idle"
        : "incorrect";

  const clampOffset = useCallback((value: { x: number; y: number }, scale: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || scale <= 1) return { x: 0, y: 0 };
    return {
      x: Math.max(
        (-rect.width * (scale - 1)) / 2,
        Math.min((rect.width * (scale - 1)) / 2, value.x),
      ),
      y: Math.max(
        (-rect.height * (scale - 1)) / 2,
        Math.min((rect.height * (scale - 1)) / 2, value.y),
      ),
    };
  }, []);

  const setZoomSafe = useCallback(
    (next: number) => {
      const safe = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
      setZoom(safe);
      setOffset((current) => clampOffset(current, safe));
    },
    [clampOffset],
  );
  const reset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setLayers(DEFAULT_LAYERS);
  }, []);
  useEffect(() => reset(), [instruction, reset]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    setDragging(true);
    drag.x = event.clientX;
    drag.y = event.clientY;
    setOffset((current) => clampOffset({ x: current.x + dx, y: current.y + dy }, zoom));
  };
  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const toggleLayer = (layer: AnatomyLayer) => {
    const locked = lockedLayerOf(config);
    if (!checked && layer === locked && layers[layer]) return;
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  };

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 bg-[#07111d] text-[#f4f7fa]">
      <MedocaHUD
        title={config.title}
        subtitle={config.subtitle}
        progress={{ value: progress.found, max: progress.total, label: "Zones trouvées" }}
        lives={lives}
        maxLives={maxLives}
        onBack={onBack}
        onSettings={() => undefined}
      />
      <div className="mx-auto max-w-[1240px] px-3 py-4 sm:px-5 lg:py-6">
        <div className="mb-4 lg:hidden">
          <p className="flex items-center gap-2 text-xl font-black">
            <Heart className="h-6 w-6 text-[#dce4eb]" aria-hidden="true" /> {config.instruction}
          </p>
          <p className="mt-1 text-sm text-[#8290a0]">{config.actionHint}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_176px]">
          <aside className="order-2 grid gap-3 sm:grid-cols-2 lg:order-1 lg:block lg:space-y-4">
            <div className="hidden lg:block">
              <p className="flex items-center gap-2 text-2xl font-black">
                <Heart className="h-7 w-7 text-[#dce4eb]" aria-hidden="true" /> {config.instruction}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#8290a0]">{config.actionHint}</p>
            </div>
            <AnatomyFeedbackPanel
              selectedLabel={
                selectedHotspot
                  ? (visibleLabel(selectedHotspot, correction, foundHotspotIds) ?? undefined)
                  : undefined
              }
              correctLabel={correction.correctLabel}
              result={result}
              explanation={correction.explanation ?? undefined}
            />
            <AnatomyMiniMap activeLayers={layers} useReviewedPilotAsset={usesReviewedPilotAsset} />
          </aside>

          <div className="order-1 min-w-0 lg:order-2">
            <GlassPanel
              ref={viewportRef}
              strength="strong"
              className="relative aspect-[4/5] touch-none select-none overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_50%_38%,#10283a_0%,#081521_48%,#07111d_78%)] sm:aspect-[5/6] lg:min-h-[650px] lg:max-h-[760px]"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "crosshair" }}
              aria-label="Corps humain interactif avec zones numérotées"
            >
              <div
                className="absolute inset-0 will-change-transform"
                data-anatomy-stage
                style={{
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                  transformOrigin: "50% 50%",
                  transition: dragging ? "none" : "transform 180ms cubic-bezier(.22,1,.36,1)",
                }}
              >
                <AnatomyHumanPlate
                  activeLayers={layers}
                  useReviewedPilotAsset={usesReviewedPilotAsset}
                  className="absolute inset-[2%_4%]"
                />
                {config.hotspots.map((hotspot) => {
                  const isSelected = selectedId === hotspot.id;
                  const isCorrect = checked && correction.correctHotspotId === hotspot.id;
                  const isWrong = checked && isSelected && !isCorrect;
                  const label = visibleLabel(hotspot, correction, foundHotspotIds);
                  return (
                    <button
                      key={hotspot.id}
                      type="button"
                      disabled={checked || !layers[hotspot.layer]}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!dragRef.current?.moved) onSelect(hotspot.id);
                      }}
                      aria-label={hotspotAriaLabel(
                        hotspot,
                        config.hotspots.length,
                        correction,
                        foundHotspotIds,
                      )}
                      aria-pressed={isSelected}
                      className="absolute grid aspect-square w-[14%] place-items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#baf8d8]/70 disabled:cursor-default disabled:opacity-35"
                      style={{
                        left: `${hotspot.x}%`,
                        top: `${hotspot.y}%`,
                        transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                      }}
                    >
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-black text-white shadow-[0_8px_20px_rgba(0,0,0,0.5)] transition-colors motion-reduce:transition-none ${isCorrect || (!checked && isSelected) ? "border-[#baf8d8] bg-[#17b968] shadow-[0_0_22px_rgba(38,216,120,0.55)]" : isWrong ? "border-[#ffc1cd] bg-[#d83255]" : "border-[#6b7c8e] bg-[#111d2b]/95 hover:border-[#26d878]"}`}
                      >
                        {hotspot.order}
                      </span>
                      {label ? (
                        <span className="absolute top-[calc(50%+24px)] whitespace-nowrap rounded-md border border-[#304255] bg-[#07111d]/95 px-2 py-1 text-[10px] font-bold text-[#eef3f7]">
                          {label}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-[#2b3b4d] bg-[#07111d]/85 px-3 py-1.5 text-[10px] font-bold text-[#8290a0] backdrop-blur">
                <Move className="h-3.5 w-3.5" aria-hidden="true" /> Vue de face · ×{zoom.toFixed(1)}
              </span>
            </GlassPanel>
          </div>

          <aside className="order-3 grid gap-3 sm:grid-cols-[auto_1fr] lg:block lg:space-y-4">
            <AnatomyZoomControls
              onZoomIn={() => setZoomSafe(zoom + 0.25)}
              onZoomOut={() => setZoomSafe(zoom - 0.25)}
              onReset={reset}
              onRecenter={() => setOffset({ x: 0, y: 0 })}
              canZoomIn={zoom < MAX_ZOOM}
              canZoomOut={zoom > MIN_ZOOM}
            />
            <AnatomyLayerToggle
              value={layers}
              onChange={toggleLayer}
              lockedLayer={checked ? undefined : lockedLayerOf(config)}
            />
            <GlassPanel className="hidden p-4 lg:block">
              <p className="flex items-center gap-2 text-sm font-extrabold text-[#dce4eb]">
                <MousePointerClick className="h-4 w-4 text-[#26d878]" aria-hidden="true" /> Besoin
                d’aide ?
              </p>
              <p className="mt-2 text-xs leading-5 text-[#8290a0]">
                Utilise deux doigts ou les contrôles pour zoomer et déplacer la vue.
              </p>
            </GlassPanel>
          </aside>
        </div>

        <GlassPanel strength="strong" className="mt-4 p-3 sm:p-4">
          <AnatomyAnswerCards
            answers={answers}
            options={options}
            selectedId={selectedId}
            correctAnswerIds={correctAnswerIds}
            checked={checked}
            showReviewedPilotAssets={usesReviewedPilotAsset}
            onSelect={onSelect}
          />
        </GlassPanel>
        {info ? (
          <div className="mt-4">
            <AnatomyInfoCard info={info} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
