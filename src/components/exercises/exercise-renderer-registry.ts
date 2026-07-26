import type { ExtensibleExerciseType } from "@/content/learning-activity-domain";

export interface ExerciseRendererDefinition {
  component:
    | "McqCard"
    | "TrueFalseCard"
    | "MatchPairs"
    | "DragDropZone"
    | "ImageHotspot"
    | "ClinicalCaseCard"
    | "CalculationCard"
    | "FillBlankCard";
  answerMode: "single" | "multiple" | "matching" | "ordered" | "point" | "numeric" | "text";
  supportsKeyboard: true;
}

export const EXERCISE_RENDERER_REGISTRY: Record<
  ExtensibleExerciseType,
  ExerciseRendererDefinition
> = {
  mcq: { component: "McqCard", answerMode: "single", supportsKeyboard: true },
  true_false: { component: "TrueFalseCard", answerMode: "single", supportsKeyboard: true },
  association: { component: "MatchPairs", answerMode: "matching", supportsKeyboard: true },
  ordering: { component: "DragDropZone", answerMode: "ordered", supportsKeyboard: true },
  drag_drop: { component: "DragDropZone", answerMode: "ordered", supportsKeyboard: true },
  anatomy_location: { component: "ImageHotspot", answerMode: "point", supportsKeyboard: true },
  interactive_image: { component: "ImageHotspot", answerMode: "point", supportsKeyboard: true },
  clinical_case: { component: "ClinicalCaseCard", answerMode: "single", supportsKeyboard: true },
  calculation: { component: "CalculationCard", answerMode: "numeric", supportsKeyboard: true },
  fill_blank: { component: "FillBlankCard", answerMode: "text", supportsKeyboard: true },
};

export function getExerciseRenderer(type: ExtensibleExerciseType) {
  return EXERCISE_RENDERER_REGISTRY[type];
}
