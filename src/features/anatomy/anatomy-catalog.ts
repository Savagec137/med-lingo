import pilotInput from "./pilot-grands-systemes.json" with { type: "json" };
import { parseAnatomyQuestion } from "./anatomy-schema.ts";
import type { AnatomyQuestionConfig } from "./anatomy-domain.ts";

/**
 * Catalogue des questions anatomiques configurées à la main.
 *
 * Il ne remplace pas les 28 questions `anatomy_location` déjà en production :
 * celles-ci restent lues telles quelles par `hotspotsFromAnswers`. Ce catalogue
 * porte les questions écrites pour la nouvelle planche, à commencer par le
 * pilote de la maquette.
 */
const questions: readonly AnatomyQuestionConfig[] = [parseAnatomyQuestion(pilotInput)];

const byId = new Map(questions.map((question) => [question.id, question]));

export const ANATOMY_QUESTIONS = questions;

export const findAnatomyQuestion = (id: string) => byId.get(id);

export function getAnatomyQuestion(id: string): AnatomyQuestionConfig {
  const question = byId.get(id);
  if (!question) throw new Error(`Question anatomique inconnue : ${id}`);
  return question;
}

export const PILOT_QUESTION_ID = "anatomy.pilot.grands-systemes.coeur";
