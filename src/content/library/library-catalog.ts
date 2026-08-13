import competencyMapInput from "./dea-competency-map.json" with { type: "json" };
import knowledgeInput from "./intervention-knowledge.json" with { type: "json" };
import libraryKnowledgeInput from "./library-knowledge.json" with { type: "json" };
import documentsInput from "./library-documents.json" with { type: "json" };
import type {
  ActStatus,
  AuthorisedAct,
  DeaBloc,
  DeaCompetency,
  InterventionKnowledge,
  LibraryDocument,
  LibraryKnowledge,
  PageStatus,
  PulseoDomain,
  QuestionSourceStatus,
} from "./library-domain.ts";
import { NORMATIVE_SOURCE_TYPES, SOURCE_TYPE_LABELS } from "./library-domain.ts";
import {
  parseDeaCompetencyMap,
  parseInterventionKnowledgeIndex,
  parseLibraryDocumentIndex,
  parseLibraryKnowledgeIndex,
} from "./library-schema.ts";

const documentIndex = parseLibraryDocumentIndex(documentsInput);
const knowledgeIndex = parseInterventionKnowledgeIndex(knowledgeInput);
const competencyMap = parseDeaCompetencyMap(competencyMapInput);
const libraryKnowledgeIndex = parseLibraryKnowledgeIndex(libraryKnowledgeInput);
const libraryKnowledgeById = new Map(
  libraryKnowledgeIndex.knowledge.map((entry) => [entry.knowledgeId, entry]),
);

const documentsById = new Map(documentIndex.documents.map((entry) => [entry.documentId, entry]));
const knowledgeById = new Map(knowledgeIndex.knowledge.map((entry) => [entry.knowledgeId, entry]));
const knowledgeByTheme = new Map(knowledgeIndex.knowledge.map((entry) => [entry.theme, entry]));
const competenciesById = new Map(
  competencyMap.competencies.map((entry) => [entry.competencyId, entry]),
);
const blocsById = new Map(competencyMap.blocs.map((entry) => [entry.blocId, entry]));
const actsById = new Map(competencyMap.authorisedActs.acts.map((entry) => [entry.actId, entry]));

export const LIBRARY_DOCUMENTS: readonly LibraryDocument[] = documentIndex.documents;
export const INTERVENTION_KNOWLEDGE: readonly InterventionKnowledge[] = knowledgeIndex.knowledge;
export const DEA_COMPETENCIES: readonly DeaCompetency[] = competencyMap.competencies;
export const DEA_BLOCS: readonly DeaBloc[] = competencyMap.blocs;
export const AUTHORISED_ACTS: readonly AuthorisedAct[] = competencyMap.authorisedActs.acts;
export const KNOWLEDGE_PROVENANCE_RULES = knowledgeIndex.provenanceRules;
export const LIBRARY_KNOWLEDGE: readonly LibraryKnowledge[] = libraryKnowledgeIndex.knowledge;
export const LIBRARY_EXTRACTION_RULES = libraryKnowledgeIndex.extractionRules;
export const findLibraryKnowledge = (knowledgeId: string) => libraryKnowledgeById.get(knowledgeId);
export const COMPETENCY_EXTRACTION_NOTE = competencyMap.extractionNote;

function require<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

export const findDocument = (documentId: string) => documentsById.get(documentId);
export const getDocument = (documentId: string) =>
  require(documentsById.get(documentId), `Document inconnu dans la bibliothèque : ${documentId}`);

export const findKnowledge = (knowledgeId: string) => knowledgeById.get(knowledgeId);
export const getKnowledge = (knowledgeId: string) =>
  require(knowledgeById.get(knowledgeId), `Connaissance inconnue : ${knowledgeId}`);
export const findKnowledgeByTheme = (theme: string) => knowledgeByTheme.get(theme);

export const findCompetency = (competencyId: string) => competenciesById.get(competencyId);
export const getCompetency = (competencyId: string) =>
  require(competenciesById.get(competencyId), `Compétence inconnue : ${competencyId}`);
export const getBloc = (blocId: string) =>
  require(blocsById.get(blocId), `Bloc inconnu : ${blocId}`);
export const findAct = (actId: string) => actsById.get(actId);

/** Documents autorisés à sourcer une question du Mode Intervention. */
export const sourcingDocuments = () =>
  documentIndex.documents.filter((entry) => entry.usableForInterventionSourcing);

/**
 * Référence lisible d'une connaissance, telle qu'affichée au joueur.
 * Le type de source est nommé : un support pédagogique n'est jamais présenté
 * comme un texte officiel.
 */
export function knowledgeReferenceLabel(knowledge: InterventionKnowledge) {
  const document = getDocument(knowledge.sourceDocument);
  return `${SOURCE_TYPE_LABELS[document.sourceType]} — ${document.title} · ${knowledge.sourceSection}`;
}

/** Vrai si le document peut être présenté comme une obligation. */
export const isNormative = (documentId: string) =>
  NORMATIVE_SOURCE_TYPES.includes(getDocument(documentId).sourceType);

/** Documents rattachés à un domaine pédagogique Pulseo. */
export const documentsForDomain = (domain: PulseoDomain) =>
  documentIndex.documents.filter((entry) => entry.pulseoDomains.includes(domain));

/**
 * Niveau de rattachement d'une question, déduit de ses métadonnées.
 *
 * - `linked` : une connaissance, au moins une compétence, et une source
 *   officielle vérifiée derrière la connaissance ;
 * - `partial` : rattachée, mais la source primaire est un document interne
 *   en attente de validation médicale ;
 * - `needs_review` : rattachement incertain signalé explicitement ;
 * - `missing_source` : aucune connaissance ne couvre la question.
 */
/**
 * Ce que vaut la référence de page d'une question, déduit du document et non
 * déclaré à la main. Une page ne peut donc pas être citée sur un document qui
 * n'en a pas, ni un document paginé passer pour cité par section.
 */
export function pageStatusFor(documentId: string, hasSection: boolean): PageStatus {
  const document = getDocument(documentId);
  switch (document.pagination) {
    case "pages_available":
      return "reliable";
    case "pages_unreliable":
      return "not_reliable";
    case "none":
      // Sans pages, seule la section peut situer la référence. Si elle manque
      // aussi, il n'y a rien pour retrouver l'énoncé dans le document.
      return hasSection ? "section_only_reference" : "unavailable";
  }
}

/** Vrai quand `sourcePages` peut être renseigné pour ce document. */
export const pagesAreCitable = (documentId: string) =>
  getDocument(documentId).pagination === "pages_available";

/**
 * Rattachement d'une question aux actes de l'article R. 6311-17.
 *
 * `not_applicable` n'est pas un aveu d'échec : une question sur la préparation
 * du matériel, la sécurisation de la scène ou la transmission d'un bilan porte
 * sur une compétence, pas sur un acte technique du texte. `needs_review` est
 * réservé aux gestes techniques que les textes indexés ne couvrent pas.
 */
export function actStatusFor(input: {
  actIds?: string[];
  technicalGestureOutsideIndexedTexts?: boolean;
}): ActStatus {
  if ((input.actIds ?? []).length > 0) return "linked";
  return input.technicalGestureOutsideIndexedTexts ? "needs_review" : "not_applicable";
}

export function questionSourceStatus(input: {
  knowledgeIds?: string[];
  competencyIds?: string[];
  needsReview?: boolean;
}): QuestionSourceStatus {
  const knowledgeIds = input.knowledgeIds ?? [];
  const competencyIds = input.competencyIds ?? [];
  if (knowledgeIds.length === 0 || competencyIds.length === 0) return "missing_source";
  if (input.needsReview) return "needs_review";
  const primary = getKnowledge(knowledgeIds[0]!);
  return primary.sourceType === "official" ? "linked" : "partial";
}
