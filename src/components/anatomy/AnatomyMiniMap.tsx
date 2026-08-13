import { ChevronDown } from "lucide-react";
import type { AnatomyLayer } from "@/features/anatomy/anatomy-domain";
import { AnatomyHumanPlate } from "./AnatomyHumanPlate";

export function AnatomyMiniMap({
  activeLayers,
  useReviewedPilotAsset = false,
}: {
  activeLayers: Record<AnatomyLayer, boolean>;
  useReviewedPilotAsset?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#27384a] bg-[#0b1724]">
      <div className="relative mx-auto aspect-[2/3] w-20 overflow-hidden">
        <AnatomyHumanPlate
          activeLayers={activeLayers}
          useReviewedPilotAsset={useReviewedPilotAsset}
          className="absolute inset-0"
        />
      </div>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between border-t border-[#27384a] px-3 text-xs font-bold text-[#bac5d0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#26d878]"
        aria-label="Changer la vue anatomique"
      >
        Vue de face <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
