import interventionContent from "./banks/intervention-content.json" with { type: "json" };
import { createContentCatalog } from "./content-engine.ts";

/**
 * Source unique des questions du Mode Intervention.
 * Le JSON peut plus tard être remplacé par une réponse Supabase qui respecte
 * le même schéma, sans modifier le moteur de mission.
 */
export const INTERVENTION_CONTENT_CATALOG = createContentCatalog(interventionContent);
