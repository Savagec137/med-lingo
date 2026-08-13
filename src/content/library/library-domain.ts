/**
 * Bibliothèque documentaire du Mode Intervention.
 *
 * Trois fichiers de données, trois rôles distincts :
 *
 * - `library-documents.json` recense les documents réellement disponibles et
 *   sépare les textes **officiels** des supports **pédagogiques** et des
 *   documents **internes**. Un document dont le fichier n'est pas dans le dépôt
 *   le déclare, pour qu'aucune page ne soit citée sans être vérifiable.
 * - `dea-competency-map.json` reproduit le référentiel de compétences du
 *   diplôme et la liste des actes autorisés. Rien n'y est ajouté qui ne figure
 *   dans les textes indexés.
 * - `intervention-knowledge.json` porte les connaissances utiles au mode, avec
 *   la provenance de **chaque** point clé : `official` renvoie à un texte
 *   indexé, `internal` à une affirmation MedLingo en attente de relecture.
 */

/**
 * Nature d'un document, et donc ce que le joueur lit à l'écran.
 *
 * La distinction qui compte pour un apprenant n'est pas « qui l'a publié »
 * mais **« est-ce que cela m'oblige ? »**. Un décret oblige ; une
 * recommandation de la HAS ou de l'ANSM ne l'est pas et peut différer du
 * protocole du service ; un référentiel de société savante encore moins.
 * Confondre les trois ferait croire à une obligation légale là où il n'y a
 * qu'une recommandation.
 *
 * - `official` : texte normatif — code, décret, arrêté, Journal officiel ;
 * - `institutional` : publication d'une autorité ou d'une agence publique,
 *   non normative — HAS, ANSM, Santé publique France, CNIL, ANS, Assurance
 *   Maladie, DILA, page ministérielle hors Journal officiel ;
 * - `learned_society` : référentiel ou recommandation de société savante ;
 * - `training` : support pédagogique ;
 * - `internal` : document produit par MedLingo.
 */
export const LIBRARY_SOURCE_TYPES = [
  "official",
  "institutional",
  "learned_society",
  "training",
  "internal",
] as const;
export type LibrarySourceType = (typeof LIBRARY_SOURCE_TYPES)[number];

/** Intitulé affiché au joueur pour chaque nature de document. */
export const SOURCE_TYPE_LABELS: Record<LibrarySourceType, string> = {
  official: "Texte réglementaire",
  institutional: "Recommandation institutionnelle",
  learned_society: "Référentiel de société savante",
  training: "Support de formation",
  internal: "Document interne MedLingo",
};

/** Natures dont un contenu peut se réclamer comme d'une obligation. */
export const NORMATIVE_SOURCE_TYPES: readonly LibrarySourceType[] = ["official"];

/**
 * Publications qui font seules le droit. `sourceType: "official"` est réservé
 * aux documents publiés par l'une d'elles : sans cette liste, rien
 * n'empêcherait de déclarer une recommandation de la HAS comme un texte
 * réglementaire, et l'apprenant y lirait une obligation qui n'existe pas.
 */
export const NORMATIVE_PUBLISHERS = [
  "Journal officiel",
  "Légifrance",
  "Code de la santé publique",
] as const;

export const isNormativePublisher = (organisation: string) =>
  NORMATIVE_PUBLISHERS.some((publisher) => organisation.includes(publisher));

export const LIBRARY_DOCUMENT_STATUSES = [
  "validated",
  /** Source proposée puis validée par un relecteur humain. */
  "validated_source",
  "indexed_online",
  "referenced_not_stored",
  "referenced_unverified",
  "quarantined_needs_validation",
  "awaiting_medical_validation",
] as const;
export type LibraryDocumentStatus = (typeof LIBRARY_DOCUMENT_STATUSES)[number];

/**
 * Ce qui a réellement été lu du document, indépendamment de sa validation.
 *
 * Un relecteur peut valider une source sur son titre et son organisme ; cela
 * ne veut pas dire que son contenu a été consulté. Les deux faits sont
 * distincts et le second seul autorise à sourcer une question.
 */
export const CONTENT_VERIFICATIONS = ["content_verified", "listing_only"] as const;
export type ContentVerification = (typeof CONTENT_VERIFICATIONS)[number];

/** Domaines pédagogiques Pulseo auxquels un document se rattache. */
export const PULSEO_DOMAINS = [
  "dea",
  "urgences-vitales",
  "transport-sanitaire",
  "hygiene",
  "infectiologie",
  "pharmacologie",
  "pediatrie",
  "geriatrie",
  "obstetrique",
  "cardiologie",
  "neurologie",
  "psychiatrie",
  "numerique-en-sante",
  "reglementation",
] as const;
export type PulseoDomain = (typeof PULSEO_DOMAINS)[number];

export const LIBRARY_PRIORITIES = ["P1", "P2", "P3"] as const;
export type LibraryPriority = (typeof LIBRARY_PRIORITIES)[number];

export const LIBRARY_LOCATOR_KINDS = [
  "url",
  "repository_path",
  "referenced_filename",
  "referenced_title",
] as const;
export type LibraryLocatorKind = (typeof LIBRARY_LOCATOR_KINDS)[number];

/**
 * Pagination réelle d'un document, d'où se déduit le `pageStatus` d'une
 * question. C'est une propriété du document, pas une déclaration par question :
 * une page ne peut donc pas être citée sur un document qui n'en a pas.
 *
 * - `none` : le document n'a pas de pages, ou se cite par article, annexe ou
 *   identifiant de contenu — c'est le cas des textes Légifrance ;
 * - `pages_available` : le fichier est présent et ses pages sont vérifiables ;
 * - `pages_unreliable` : des pages sont citées quelque part mais ne peuvent pas
 *   être vérifiées, typiquement parce que le fichier est absent du dépôt.
 */
export const LIBRARY_PAGINATIONS = ["none", "pages_available", "pages_unreliable"] as const;
export type LibraryPagination = (typeof LIBRARY_PAGINATIONS)[number];

export interface LibraryDocument {
  documentId: string;
  title: string;
  sourceType: LibrarySourceType;
  organisation: string;
  category: string;
  version: string | null;
  locator: { kind: LibraryLocatorKind; value: string };
  storedInRepository: boolean;
  status: LibraryDocumentStatus;
  importedAt: string | null;
  lastVerifiedAt: string | null;
  hash: string | null;
  hashNote: string;
  pagination: LibraryPagination;
  paginationNote: string;
  coverage: string[];
  /** Domaines pédagogiques Pulseo auxquels le document se rattache. */
  pulseoDomains: PulseoDomain[];
  /** Ordre de traitement, repris de la fiche de proposition. */
  priority: LibraryPriority | null;
  /**
   * Ce qui a été lu du document. Distinct de sa validation : un relecteur peut
   * valider une source sans que son contenu ait été consulté.
   */
  contentVerification: ContentVerification;
  /** Date de la validation humaine, quand elle a eu lieu. */
  validatedAt: string | null;
  /** Faux interdit d'utiliser ce document comme source d'une question. */
  usableForInterventionSourcing: boolean;
  notes: string;
}

export interface LibraryDocumentIndex {
  schemaVersion: 1;
  indexedAt: string;
  documents: LibraryDocument[];
}

export const KNOWLEDGE_STATUSES = ["extracted", "to_validate", "validated"] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export const KEY_POINT_PROVENANCES = ["official", "internal"] as const;
export type KeyPointProvenance = (typeof KEY_POINT_PROVENANCES)[number];

export interface KnowledgeKeyPoint {
  text: string;
  provenance: KeyPointProvenance;
  sourceDocumentId: string;
  sourceSection: string;
}

/**
 * État du rattachement d'un contenu à une leçon Pulseo.
 *
 * - `linked` : une leçon publiée couvre le thème, `lessonId` est renseigné ;
 * - `needs_creation` : le parcours visé existe mais ne porte aucune leçon, la
 *   leçon doit être créée — `proposedLessonId` porte la proposition ;
 * - `needs_review` : le parcours porte des fichiers de leçon, mais leur
 *   rattachement au thème demande une décision humaine.
 */
export const LESSON_LINK_STATUSES = ["linked", "needs_creation", "needs_review"] as const;
export type LessonLinkStatus = (typeof LESSON_LINK_STATUSES)[number];

/** Ce que vaut la référence de page d'une question. */
export const PAGE_STATUSES = [
  "reliable",
  "unavailable",
  "not_reliable",
  "section_only_reference",
] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

/** Ce que vaut le rattachement d'une question à un acte de R. 6311-17. */
export const ACT_STATUSES = ["linked", "not_applicable", "needs_review"] as const;
export type ActStatus = (typeof ACT_STATUSES)[number];

export interface InterventionKnowledge {
  knowledgeId: string;
  title: string;
  theme: string;
  summary: string;
  keyPoints: KnowledgeKeyPoint[];
  commonErrors: string[];
  clinicalApplication: string;
  sourceDocument: string;
  sourcePages: string | null;
  sourceSection: string;
  sourceType: LibrarySourceType;
  competencyIds: string[];
  actIds: string[];
  /** Leçons Pulseo publiées. Vide tant qu'aucune leçon ne couvre le thème. */
  lessonIds: string[];
  /** Parcours de la feuille de route visés, publiés ou non. */
  plannedParcoursIds: string[];
  /** Parcours dont le thème relève, choisi parmi `plannedParcoursIds`. */
  primaryParcoursId: string;
  /**
   * Proposition d'identifiant de leçon, au format `dea-pNN-<theme>`. Ce format
   * diffère volontairement de `dea-pNN-lNN` : une proposition ne peut donc pas
   * être confondue avec une leçon existante.
   */
  proposedLessonId: string;
  lessonLinkStatus: LessonLinkStatus;
  lessonLinkReason: string;
  status: KnowledgeStatus;
  needsReview: boolean;
}

export interface InterventionKnowledgeIndex {
  schemaVersion: 1;
  indexedAt: string;
  provenanceRules: Record<string, string>;
  knowledge: InterventionKnowledge[];
}

export interface DeaBloc {
  blocId: string;
  number: number;
  title: string;
}

export interface DeaCompetency {
  competencyId: string;
  number: number;
  blocId: string;
  /** Intitulé officiel, reproduit sans reformulation. */
  title: string;
  /** Champ éditorial MedLingo, distinct de l'intitulé officiel. */
  description: string;
  interventionThemes: string[];
  publishedLessonIds: string[];
  plannedParcoursIds: string[];
  plannedParcoursLinkStatus: "confirmed" | "needsReview";
  modules: string[];
  modulesStatus: "confirmed" | "needsReview";
  sourceDocumentId: string;
  sourceSection: string;
  needsReview: boolean;
}

export interface AuthorisedAct {
  actId: string;
  paragraph: string;
  title: string;
  /** Faux signale un intitulé relevé de façon abrégée, à confronter au texte. */
  verbatim: boolean;
  competencyIds: string[];
  interventionThemes: string[];
}

export interface DeaCompetencyMap {
  schemaVersion: 1;
  indexedAt: string;
  referenceDocumentId: string;
  referenceSection: string;
  extractionNote: string;
  blocs: DeaBloc[];
  competencies: DeaCompetency[];
  authorisedActs: {
    sourceDocumentId: string;
    sourceSection: string;
    note: string;
    acts: AuthorisedAct[];
  };
  amuTrainingModules: {
    sourceDocumentId: string;
    sourceSection: string;
    note: string;
    modules: Array<{ moduleId: string; number: number; title: string; hours: number }>;
  };
}

/** Niveau de rattachement d'une question à la bibliothèque. */
export const QUESTION_SOURCE_STATUSES = [
  "linked",
  "partial",
  "needs_review",
  "missing_source",
] as const;
export type QuestionSourceStatus = (typeof QUESTION_SOURCE_STATUSES)[number];

/**
 * Vocabulaire de provenance des connaissances extraites de la bibliothèque.
 * Il double `LibrarySourceType` avec les termes retenus pour l'extraction ; la
 * table ci-dessous les tient synchronisés, et un test vérifie que la provenance
 * déclarée par une connaissance correspond bien à la nature de son document.
 */
export const KNOWLEDGE_SOURCE_TYPES = [
  "regulatory",
  "institutional_guideline",
  "professional_reference",
  "training_source",
  "internal_pulseo",
] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_SOURCE_TYPE_BY_LIBRARY_TYPE: Record<LibrarySourceType, KnowledgeSourceType> =
  {
    official: "regulatory",
    institutional: "institutional_guideline",
    learned_society: "professional_reference",
    training: "training_source",
    internal: "internal_pulseo",
  };

/** Connaissance extraite d'un document de la bibliothèque. */
export interface LibraryKnowledge {
  knowledgeId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  commonErrors: string[];
  clinicalApplication: string;
  sourceDocument: string;
  sourceSection: string;
  /** Vide tant qu'aucun document paginé et vérifiable n'est indexé. */
  sourcePages: number[];
  pageStatus: PageStatus;
  sourceType: KnowledgeSourceType;
  competencyIds: string[];
  plannedParcoursIds: string[];
  lessonIds: string[];
  status: "to_validate" | "validated";
}

export interface LibraryKnowledgeIndex {
  schemaVersion: 1;
  extractedAt: string;
  extractionRules: Record<string, string>;
  knowledge: LibraryKnowledge[];
}
