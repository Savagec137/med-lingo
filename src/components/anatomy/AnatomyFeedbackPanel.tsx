import { CheckCircle2, CircleDot, XCircle } from "lucide-react";
import { GlassPanel } from "@/components/medoca";

export interface AnatomyFeedbackPanelProps {
  selectedLabel?: string;
  correctLabel?: string;
  result: "idle" | "correct" | "incorrect";
  explanation?: string;
}

export function AnatomyFeedbackPanel(props: AnatomyFeedbackPanelProps) {
  const Icon =
    props.result === "correct" ? CheckCircle2 : props.result === "incorrect" ? XCircle : CircleDot;
  const color =
    props.result === "correct"
      ? "text-[#26d878]"
      : props.result === "incorrect"
        ? "text-[#ff4267]"
        : "text-[#8290a0]";
  return (
    <GlassPanel className="p-4" aria-live="polite">
      <p className="text-xs font-bold text-[#8290a0]">Zone sélectionnée</p>
      {props.selectedLabel ? (
        <p className={`mt-1 flex items-center gap-2 text-lg font-black ${color}`}>
          <Icon className="h-5 w-5" aria-hidden="true" /> {props.selectedLabel}
        </p>
      ) : (
        <p className="mt-1 text-sm font-bold text-[#667485]">En attente de sélection</p>
      )}
      {props.result === "correct" ? (
        <p className="mt-1 text-sm font-extrabold text-[#26d878]">Correct !</p>
      ) : null}
      {props.result === "incorrect" ? (
        <p className="mt-1 text-sm font-extrabold text-[#ff4267]">
          Incorrect · réponse : {props.correctLabel}
        </p>
      ) : null}
      {props.result !== "idle" && props.explanation ? (
        <p className="mt-4 text-sm leading-6 text-[#bac5d0]">{props.explanation}</p>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[#8290a0]">
          Sélectionne la zone demandée sur la planche anatomique.
        </p>
      )}
    </GlassPanel>
  );
}
