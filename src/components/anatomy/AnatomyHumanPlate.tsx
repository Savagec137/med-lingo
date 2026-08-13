import anatomyPlate from "@/assets/anatomy-body-realistic.png";
import type { AnatomyLayer } from "@/features/anatomy/anatomy-domain";

export type { AnatomyLayer } from "@/features/anatomy/anatomy-domain";

export interface AnatomyHumanPlateProps {
  activeLayers: Record<AnatomyLayer, boolean>;
  className?: string;
  /**
   * Le visuel réaliste attend encore une validation structure par structure.
   * Le fallback abstrait reste donc le rendu de sûreté hors du pilote du cœur.
   */
  useReviewedPilotAsset?: boolean;
}

/**
 * Planche réaliste unique. Les couches restent pilotables mais ne sont jamais
 * simulées par du dessin CSS. Les vraies couches pourront remplacer cet actif
 * sans changer le contrat du composant.
 */
export function AnatomyHumanPlate({
  activeLayers,
  className,
  useReviewedPilotAsset = false,
}: AnatomyHumanPlateProps) {
  const visibleLayerCount = Object.values(activeLayers).filter(Boolean).length;
  const detailVisible = activeLayers.organs || activeLayers.vessels || activeLayers.muscles;

  return (
    <div
      className={className}
      data-anatomy-fallback={useReviewedPilotAsset ? "realistic-single-plate" : "safe-neutral"}
      data-anatomy-review-status={useReviewedPilotAsset ? "to_verify" : "not-anatomical-artwork"}
      data-anatomy-use={
        useReviewedPilotAsset ? "global-unlabelled-reference-only" : "coordinate-reference-only"
      }
      aria-label="Planche anatomique de face"
    >
      {useReviewedPilotAsset ? (
        <img
          src={anatomyPlate}
          alt="Corps humain anatomique réaliste de face"
          draggable={false}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full select-none object-contain transition-[opacity,filter] duration-200 motion-reduce:transition-none"
          style={{
            opacity: visibleLayerCount > 0 ? 0.99 : 0.25,
            filter: detailVisible
              ? "saturate(1.04) contrast(1.02) brightness(.98)"
              : "saturate(.58) contrast(.92)",
          }}
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center px-8 text-center"
          aria-hidden="true"
        >
          <p className="max-w-xs text-xs font-bold leading-5 text-[#6d7d8d]">
            Planche anatomique détaillée indisponible pour cette question.
          </p>
        </div>
      )}
    </div>
  );
}
