import knowledgeBase from "./master-knowledge-base.json" with { type: "json" };
import { MasterKnowledgeCatalog } from "./master-knowledge-catalog.ts";

export const MASTER_KNOWLEDGE_CATALOG = new MasterKnowledgeCatalog(knowledgeBase);
