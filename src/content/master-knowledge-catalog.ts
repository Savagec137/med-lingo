import type { CompetencyDefinition, MasterKnowledgeBase } from "./master-knowledge-domain.ts";
import { parseMasterKnowledgeBase } from "./master-knowledge-schema.ts";

export class MasterKnowledgeCatalog {
  readonly knowledgeBase: MasterKnowledgeBase;
  private readonly byId: ReadonlyMap<string, CompetencyDefinition>;

  constructor(input: unknown) {
    this.knowledgeBase = parseMasterKnowledgeBase(input);
    this.byId = new Map(
      this.knowledgeBase.competencies.map((competency) => [competency.id, competency]),
    );
  }

  get(id: string): CompetencyDefinition {
    const competency = this.byId.get(id);
    if (!competency) throw new Error(`Compétence inconnue : ${id}`);
    return competency;
  }

  forLesson(lessonId: string): CompetencyDefinition[] {
    return this.knowledgeBase.competencies.filter((competency) =>
      competency.lessonIds.includes(lessonId),
    );
  }

  forQuestion(questionId: string): CompetencyDefinition[] {
    return this.knowledgeBase.competencies.filter((competency) =>
      competency.questionIds.includes(questionId),
    );
  }

  forContent(contentId: string): CompetencyDefinition[] {
    return this.knowledgeBase.competencies.filter((competency) =>
      competency.contentIds.includes(contentId),
    );
  }
}
