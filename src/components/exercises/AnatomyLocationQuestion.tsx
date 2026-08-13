import { AnatomyBoard } from "@/components/anatomy";
import type { PreparedLessonAnswer } from "@/content/lesson-runtime";

export function AnatomyLocationQuestion({
  questionId,
  question,
  lessonTitle,
  parcoursTitle,
  answers,
  selectedId,
  correctAnswerIds,
  checked,
  explanation,
  lives,
  maxLives,
  foundHotspotIds,
  onSelect,
  onBack,
}: {
  questionId?: string;
  question: string;
  lessonTitle: string;
  parcoursTitle: string;
  answers: PreparedLessonAnswer[];
  selectedId: string | null;
  correctAnswerIds: string[];
  checked: boolean;
  explanation?: string;
  lives?: number;
  maxLives?: number;
  foundHotspotIds?: string[];
  onSelect: (id: string) => void;
  onBack?: () => void;
}) {
  const isHeartPilot = correctAnswerIds.includes("hotspot-heart") && answers.length === 6;
  return (
    <AnatomyBoard
      questionId={questionId}
      title={isHeartPilot ? "Les grands systèmes" : lessonTitle || "Les grands systèmes"}
      subtitle={
        isHeartPilot ? "Découvrir le corps humain" : parcoursTitle || "Découvrir le corps humain"
      }
      instruction={question}
      answers={answers}
      selectedId={selectedId}
      correctAnswerIds={correctAnswerIds}
      checked={checked}
      explanation={explanation}
      lives={lives}
      maxLives={maxLives}
      foundHotspotIds={foundHotspotIds}
      onSelect={onSelect}
      onBack={onBack}
    />
  );
}
