import type {
  ContentBank,
  ContentEvaluation,
  ContentItem,
  ContentQuery,
} from "./content-domain.ts";
import { parseContentBank } from "./content-schema.ts";

function answerIds(item: ContentItem) {
  return Array.isArray(item.correctAnswer) ? item.correctAnswer : [item.correctAnswer];
}

function sameSet(left: string[], right: string[]) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

export class ContentCatalog {
  readonly bank: ContentBank;
  private readonly byId: ReadonlyMap<string, ContentItem>;

  constructor(input: unknown) {
    this.bank = parseContentBank(input);
    this.byId = new Map(this.bank.items.map((item) => [item.id, item]));
  }

  get size() {
    return this.bank.items.length;
  }

  get(id: string): ContentItem {
    const item = this.byId.get(id);
    if (!item) throw new Error(`Contenu introuvable : ${id}`);
    return item;
  }

  has(id: string) {
    return this.byId.has(id);
  }

  query(query: ContentQuery = {}): ContentItem[] {
    return this.bank.items.filter((item) => {
      if (query.unit !== undefined && item.unit !== query.unit) return false;
      if (query.lesson !== undefined && item.lesson !== query.lesson) return false;
      if (query.difficulty !== undefined && item.difficulty !== query.difficulty) return false;
      if (query.type !== undefined && item.type !== query.type) return false;
      if (query.tags?.some((tag) => !item.tags.includes(tag))) return false;
      if (
        query.metadata &&
        Object.entries(query.metadata).some(([key, value]) => item.metadata?.[key] !== value)
      ) {
        return false;
      }
      return true;
    });
  }

  evaluate(id: string, selectedAnswerIds: string[]): ContentEvaluation {
    const item = this.get(id);
    const knownIds = new Set(item.answers.map((answer) => answer.id));
    const uniqueSelected = new Set(selectedAnswerIds);
    if (uniqueSelected.size !== selectedAnswerIds.length) {
      throw new Error(`Une même réponse a été envoyée plusieurs fois pour ${id}.`);
    }
    for (const selectedId of selectedAnswerIds) {
      if (!knownIds.has(selectedId)) {
        throw new Error(`Réponse inconnue ${selectedId} pour ${id}.`);
      }
    }

    const correctAnswerIds = answerIds(item);
    const isCorrect =
      item.type === "ordering"
        ? selectedAnswerIds.length === correctAnswerIds.length &&
          selectedAnswerIds.every((value, index) => value === correctAnswerIds[index])
        : sameSet(selectedAnswerIds, correctAnswerIds);

    return {
      itemId: item.id,
      isCorrect,
      selectedAnswerIds: [...selectedAnswerIds],
      correctAnswerIds: [...correctAnswerIds],
      explanation: item.explanation,
      priorityReminder: item.priorityReminder,
      answerFeedback: item.answers.map((answer) => ({
        answerId: answer.id,
        selected: uniqueSelected.has(answer.id),
        correct: correctAnswerIds.includes(answer.id),
        explanation: answer.explanation,
      })),
    };
  }
}

export function createContentCatalog(input: unknown) {
  return new ContentCatalog(input);
}
