import { Brain, Check, CircleDot, ScanLine } from "lucide-react";
import heartAsset from "@/assets/anatomy-heart-realistic.png";
import type { PreparedLessonAnswer } from "@/content/lesson-runtime";
import type { AnatomyAnswerOption } from "@/features/anatomy/anatomy-domain";
import { cn } from "@/lib/utils";

export interface AnatomyAnswerCardsProps {
  answers: PreparedLessonAnswer[];
  options: AnatomyAnswerOption[];
  selectedId: string | null;
  correctAnswerIds: string[];
  checked: boolean;
  showReviewedPilotAssets?: boolean;
  onSelect: (id: string) => void;
}

function OrganVisual({
  id,
  label,
  showReviewedPilotAssets,
}: {
  id: string;
  label: string;
  showReviewedPilotAssets: boolean;
}) {
  if (showReviewedPilotAssets && id === "hotspot-heart") {
    return (
      <img
        src={heartAsset}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain"
      />
    );
  }
  // Les autres vignettes restent volontairement des pictogrammes neutres :
  // aucun visuel anatomique non relu n'est présenté comme une planche fiable.
  const Icon =
    id.includes("intestine") || id.includes("abdomen")
      ? ScanLine
      : id.includes("stomach") || id.includes("diaphragm")
        ? CircleDot
        : Brain;
  return <Icon className="h-10 w-10 text-[#c67762]" strokeWidth={1.35} aria-label={label} />;
}

export function AnatomyAnswerCards(props: AnatomyAnswerCardsProps) {
  return (
    <section aria-label="Zones de réponse">
      <p className="mb-3 text-xs font-semibold text-[#8290a0]">
        {props.checked
          ? "Correction terminée : les libellés anatomiques sont maintenant révélés."
          : "Sélectionne une zone sur le schéma. Les libellés sont révélés après la correction."}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {props.answers.map((answer, index) => {
          const option = props.options.find((item) => item.hotspotId === answer.id);
          const selected = props.selectedId === answer.id;
          const isCorrect = props.checked && props.correctAnswerIds.includes(answer.id);
          return (
            <button
              key={answer.id}
              type="button"
              disabled={props.checked}
              onClick={() => props.onSelect(answer.id)}
              aria-label={option?.label ?? `Sélectionner la zone ${index + 1}`}
              aria-pressed={selected}
              className={cn(
                "relative min-h-[110px] rounded-[12px] border bg-[#111d2b] p-2 text-left transition-[border-color,background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d878] disabled:cursor-default motion-reduce:transform-none motion-reduce:transition-none",
                isCorrect
                  ? "border-[#26d878] bg-[#102a25]"
                  : selected
                    ? "border-[#26d878] bg-[#102a25] shadow-[0_0_20px_rgba(38,216,120,0.13)]"
                    : "border-[#27384a] hover:border-[#486077]",
              )}
            >
              <span className="relative flex h-16 items-center justify-center overflow-hidden rounded-lg bg-[radial-gradient(circle,#243243_0%,#0a1521_72%)] text-[#6dd8ee] sm:h-20">
                <OrganVisual
                  id={answer.id}
                  label={answer.text}
                  showReviewedPilotAssets={Boolean(props.showReviewedPilotAssets)}
                />
                {isCorrect ? (
                  <Check className="absolute right-1 top-1 h-5 w-5 rounded-full bg-[#26d878] p-0.5 text-[#07111d]" />
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-2 block truncate text-xs font-extrabold",
                  selected ? "text-[#26d878]" : "text-[#eef3f7]",
                )}
              >
                {index + 1}. {option?.label ?? `Zone ${index + 1}`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
