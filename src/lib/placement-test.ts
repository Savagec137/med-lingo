import { LEVEL_MILESTONES, UNITS, type LevelKey, type Question } from "@/lib/curriculum";

export type PlacementQuestion = {
  unitId: string;
  unitTitle: string;
  question: Question;
};

export const QUESTIONS_PER_UNIT = 3;
/** Part de bonnes réponses nécessaire pour valider un parcours sans le refaire. */
export const UNIT_PASS_RATIO = 2 / 3;

function pickEvenly<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
}

/** Construit un test de positionnement à partir des parcours revendiqués par l'étudiant. */
export function buildPlacementTest(level: LevelKey): PlacementQuestion[] {
  const unitIds = LEVEL_MILESTONES[level] as readonly string[];
  const out: PlacementQuestion[] = [];
  for (const unitId of unitIds) {
    const unit = UNITS.find((u) => u.id === unitId);
    if (!unit) continue;
    const pool = unit.lessons.flatMap((lesson) => lesson.questions);
    for (const question of pickEvenly(pool, QUESTIONS_PER_UNIT)) {
      out.push({ unitId, unitTitle: unit.title, question });
    }
  }
  return out;
}

export type PlacementResult = {
  validatedUnitIds: string[];
  failedUnitIds: string[];
  perUnit: { unitId: string; unitTitle: string; correct: number; total: number }[];
  correct: number;
  total: number;
};

/** Ne valide que les parcours réellement maîtrisés : placement équitable. */
export function scorePlacement(
  questions: PlacementQuestion[],
  answers: Record<string, number | undefined>,
): PlacementResult {
  const buckets = new Map<string, { title: string; correct: number; total: number }>();
  for (const item of questions) {
    const bucket = buckets.get(item.unitId) ?? { title: item.unitTitle, correct: 0, total: 0 };
    bucket.total += 1;
    if (answers[item.question.id] === item.question.answer) bucket.correct += 1;
    buckets.set(item.unitId, bucket);
  }

  const perUnit = [...buckets.entries()].map(([unitId, b]) => ({
    unitId,
    unitTitle: b.title,
    correct: b.correct,
    total: b.total,
  }));

  return {
    perUnit,
    validatedUnitIds: perUnit.filter((u) => u.correct / u.total >= UNIT_PASS_RATIO).map((u) => u.unitId),
    failedUnitIds: perUnit.filter((u) => u.correct / u.total < UNIT_PASS_RATIO).map((u) => u.unitId),
    correct: perUnit.reduce((sum, u) => sum + u.correct, 0),
    total: perUnit.reduce((sum, u) => sum + u.total, 0),
  };
}

/** Leçons à marquer comme acquises pour les parcours validés par le test. */
export function lessonsForUnits(unitIds: string[]): string[] {
  const out: string[] = [];
  for (const unitId of unitIds) {
    const unit = UNITS.find((u) => u.id === unitId);
    if (unit) for (const lesson of unit.lessons) out.push(lesson.id);
  }
  return out;
}
