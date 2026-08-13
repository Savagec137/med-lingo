import { z } from "zod";
import {
  CONTENT_VERIFICATIONS,
  KEY_POINT_PROVENANCES,
  KNOWLEDGE_STATUSES,
  LESSON_LINK_STATUSES,
  LIBRARY_DOCUMENT_STATUSES,
  LIBRARY_LOCATOR_KINDS,
  LIBRARY_PAGINATIONS,
  LIBRARY_PRIORITIES,
  KNOWLEDGE_SOURCE_TYPES,
  LIBRARY_SOURCE_TYPES,
  PAGE_STATUSES,
  PULSEO_DOMAINS,
  isNormativePublisher,
  type DeaCompetencyMap,
  type LibraryKnowledgeIndex,
  type InterventionKnowledgeIndex,
  type LibraryDocumentIndex,
} from "./library-domain.ts";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format AAAA-MM-JJ");
const label = z.string().trim().min(1);
const prose = z.string().trim().min(20);

const documentSchema = z
  .object({
    documentId: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/, "identifiant en minuscules, chiffres et tirets"),
    title: label,
    sourceType: z.enum(LIBRARY_SOURCE_TYPES),
    organisation: label,
    category: label,
    version: label.nullable(),
    locator: z.object({ kind: z.enum(LIBRARY_LOCATOR_KINDS), value: label }),
    storedInRepository: z.boolean(),
    status: z.enum(LIBRARY_DOCUMENT_STATUSES),
    importedAt: isoDate.nullable(),
    lastVerifiedAt: isoDate.nullable(),
    hash: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "empreinte sha256 attendue")
      .nullable(),
    hashNote: prose,
    pagination: z.enum(LIBRARY_PAGINATIONS),
    paginationNote: prose,
    coverage: z.array(label),
    pulseoDomains: z.array(z.enum(PULSEO_DOMAINS)).min(1),
    priority: z.enum(LIBRARY_PRIORITIES).nullable(),
    contentVerification: z.enum(CONTENT_VERIFICATIONS),
    validatedAt: isoDate.nullable(),
    usableForInterventionSourcing: z.boolean(),
    notes: prose,
  })
  .superRefine((document, context) => {
    // `official` est réservé aux publications qui font le droit. Une
    // recommandation de la HAS ou de l'ANSM ne peut pas l'emprunter : elle
    // s'afficherait comme « Texte réglementaire » et ferait lire une
    // obligation là où il n'y a qu'une recommandation.
    if (document.sourceType === "official" && !isNormativePublisher(document.organisation)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceType"],
        message: `${document.documentId} se déclare official alors que « ${document.organisation} » ne publie pas de texte normatif.`,
      });
    }
    // Une source validée porte la date de sa validation.
    if (document.status === "validated_source" && document.validatedAt === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validatedAt"],
        message: `${document.documentId} est déclaré validated_source sans date de validation.`,
      });
    }
    // **La garantie centrale** : un document dont personne n'a lu le contenu ne
    // peut pas sourcer une question, quelle que soit sa validation. Valider une
    // source sur son titre et son organisme est une décision légitime ; en
    // tirer une citation ne l'est pas.
    if (
      document.usableForInterventionSourcing &&
      document.contentVerification !== "content_verified"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usableForInterventionSourcing"],
        message: `${document.documentId} est déclaré utilisable comme source alors que son contenu n'a pas été consulté.`,
      });
    }
    if (document.contentVerification === "content_verified" && document.lastVerifiedAt === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastVerifiedAt"],
        message: `${document.documentId} se déclare content_verified sans date de consultation.`,
      });
    }
    // Un document absent du dépôt ne peut pas déclarer un chemin de dépôt.
    if (!document.storedInRepository && document.locator.kind === "repository_path") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locator"],
        message: `${document.documentId} déclare un chemin de dépôt sans être stocké dans le dépôt.`,
      });
    }
    // Un document jamais vérifié ne peut pas servir de source à une question :
    // c'est la garantie qu'aucune référence ne repose sur un document non lu.
    if (document.usableForInterventionSourcing && document.lastVerifiedAt === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usableForInterventionSourcing"],
        message: `${document.documentId} est déclaré utilisable comme source sans avoir été vérifié.`,
      });
    }
  });

export const libraryDocumentIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    indexedAt: isoDate,
    documents: z.array(documentSchema).min(1),
  })
  .superRefine((index, context) => {
    const ids = index.documents.map((document) => document.documentId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documents"],
        message: "Les identifiants de document doivent être uniques.",
      });
    }
  });

const keyPointSchema = z.object({
  text: prose,
  provenance: z.enum(KEY_POINT_PROVENANCES),
  sourceDocumentId: label,
  sourceSection: label,
});

const knowledgeSchema = z
  .object({
    knowledgeId: z.string().regex(/^intervention\.[a-z0-9-]+$/),
    title: label,
    theme: z.string().regex(/^[a-z0-9-]+$/),
    summary: prose,
    keyPoints: z.array(keyPointSchema).min(2),
    commonErrors: z.array(prose).min(1),
    clinicalApplication: prose,
    sourceDocument: label,
    sourcePages: label.nullable(),
    sourceSection: label,
    sourceType: z.enum(LIBRARY_SOURCE_TYPES),
    competencyIds: z.array(label).min(1),
    actIds: z.array(label),
    lessonIds: z.array(label),
    plannedParcoursIds: z.array(label).min(1),
    primaryParcoursId: z.string().regex(/^parcours-\d{2}$/),
    // Format volontairement distinct de `dea-pNN-lNN` : une proposition ne peut
    // pas être confondue avec un identifiant de leçon existante.
    proposedLessonId: z.string().regex(/^dea-p\d{2}-[a-z][a-z0-9-]*[a-z0-9]$/),
    lessonLinkStatus: z.enum(LESSON_LINK_STATUSES),
    lessonLinkReason: prose,
    status: z.enum(KNOWLEDGE_STATUSES),
    needsReview: z.boolean(),
  })
  .superRefine((knowledge, context) => {
    if (!knowledge.plannedParcoursIds.includes(knowledge.primaryParcoursId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryParcoursId"],
        message: `${knowledge.knowledgeId} : le parcours porteur ne figure pas dans plannedParcoursIds.`,
      });
    }
    // La proposition doit viser le parcours porteur, pas un autre.
    const parcoursNumber = knowledge.primaryParcoursId.replace("parcours-", "");
    if (!knowledge.proposedLessonId.startsWith(`dea-p${parcoursNumber}-`)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proposedLessonId"],
        message: `${knowledge.knowledgeId} : la proposition ne vise pas ${knowledge.primaryParcoursId}.`,
      });
    }
    // `linked` exige une leçon publiée ; sans elle, le statut serait un mensonge.
    if (knowledge.lessonLinkStatus === "linked" && knowledge.lessonIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lessonLinkStatus"],
        message: `${knowledge.knowledgeId} se déclare linked sans leçon publiée.`,
      });
    }
    if (knowledge.lessonLinkStatus !== "linked" && knowledge.lessonIds.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lessonLinkStatus"],
        message: `${knowledge.knowledgeId} porte une leçon publiée mais ne se déclare pas linked.`,
      });
    }
    // Le statut se déduit de la provenance des points clés : il ne peut pas
    // être déclaré meilleur que ce que les sources permettent.
    const allOfficial = knowledge.keyPoints.every((point) => point.provenance === "official");
    if (knowledge.status === "extracted" && !allOfficial) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: `${knowledge.knowledgeId} se déclare extracted alors qu'un point clé est une affirmation interne.`,
      });
    }
    if (!allOfficial && !knowledge.needsReview) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["needsReview"],
        message: `${knowledge.knowledgeId} porte une affirmation interne sans être marquée needsReview.`,
      });
    }
  });

export const interventionKnowledgeIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    indexedAt: isoDate,
    provenanceRules: z.record(z.string(), prose),
    knowledge: z.array(knowledgeSchema).min(1),
  })
  .superRefine((index, context) => {
    const ids = index.knowledge.map((entry) => entry.knowledgeId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["knowledge"],
        message: "Les identifiants de connaissance doivent être uniques.",
      });
    }
    const themes = index.knowledge.map((entry) => entry.theme);
    if (new Set(themes).size !== themes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["knowledge"],
        message: "Deux connaissances portent le même thème.",
      });
    }
  });

const competencySchema = z.object({
  competencyId: z.string().regex(/^dea\.c\d{2}$/),
  number: z.number().int().min(1),
  blocId: z.string().regex(/^dea\.bloc-\d{2}$/),
  title: label,
  description: prose,
  interventionThemes: z.array(z.string().regex(/^[a-z0-9-]+$/)),
  publishedLessonIds: z.array(label),
  plannedParcoursIds: z.array(label),
  plannedParcoursLinkStatus: z.enum(["confirmed", "needsReview"]),
  modules: z.array(label),
  modulesStatus: z.enum(["confirmed", "needsReview"]),
  sourceDocumentId: label,
  sourceSection: label,
  needsReview: z.boolean(),
});

export const deaCompetencyMapSchema = z
  .object({
    schemaVersion: z.literal(1),
    indexedAt: isoDate,
    referenceDocumentId: label,
    referenceSection: label,
    extractionNote: prose,
    blocs: z
      .array(z.object({ blocId: z.string(), number: z.number().int().min(1), title: label }))
      .min(1),
    competencies: z.array(competencySchema).min(1),
    authorisedActs: z.object({
      sourceDocumentId: label,
      sourceSection: label,
      note: prose,
      acts: z
        .array(
          z.object({
            actId: label,
            paragraph: z.enum(["II", "III"]),
            title: label,
            verbatim: z.boolean(),
            competencyIds: z.array(label).min(1),
            interventionThemes: z.array(label),
          }),
        )
        .min(1),
    }),
    amuTrainingModules: z.object({
      sourceDocumentId: label,
      sourceSection: label,
      note: prose,
      modules: z
        .array(
          z.object({
            moduleId: label,
            number: z.number().int().min(1),
            title: label,
            hours: z.number().positive(),
          }),
        )
        .min(1),
    }),
  })
  .superRefine((map, context) => {
    const blocIds = new Set(map.blocs.map((bloc) => bloc.blocId));
    for (const competency of map.competencies) {
      if (!blocIds.has(competency.blocId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["competencies"],
          message: `${competency.competencyId} référence un bloc inconnu : ${competency.blocId}`,
        });
      }
    }
    const numbers = map.competencies.map((competency) => competency.number);
    if (new Set(numbers).size !== numbers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["competencies"],
        message: "Deux compétences portent le même numéro.",
      });
    }
    const competencyIds = new Set(map.competencies.map((entry) => entry.competencyId));
    for (const act of map.authorisedActs.acts) {
      for (const competencyId of act.competencyIds) {
        if (!competencyIds.has(competencyId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["authorisedActs"],
            message: `${act.actId} référence une compétence inconnue : ${competencyId}`,
          });
        }
      }
    }
  });

const libraryKnowledgeSchema = z.object({
  knowledgeId: z.string().regex(/^library\.[a-z0-9-]+$/),
  title: label,
  summary: prose,
  keyPoints: z.array(prose).min(3),
  commonErrors: z.array(prose).min(1),
  clinicalApplication: prose,
  sourceDocument: label,
  sourceSection: label,
  sourcePages: z.array(z.number().int().positive()),
  pageStatus: z.enum(PAGE_STATUSES),
  sourceType: z.enum(KNOWLEDGE_SOURCE_TYPES),
  competencyIds: z.array(label).min(1),
  plannedParcoursIds: z.array(z.string().regex(/^parcours-\d{2}$/)).min(1),
  lessonIds: z.array(label).min(1),
  status: z.enum(["to_validate", "validated"]),
});

export const libraryKnowledgeIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    extractedAt: isoDate,
    extractionRules: z.record(z.string(), prose),
    knowledge: z.array(libraryKnowledgeSchema).min(1),
  })
  .superRefine((index, context) => {
    const ids = index.knowledge.map((entry) => entry.knowledgeId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["knowledge"],
        message: "Les identifiants de connaissance doivent être uniques.",
      });
    }
    for (const entry of index.knowledge) {
      // Une page ne se cite pas sous un statut qui la déclare non fiable.
      if (entry.sourcePages.length > 0 && entry.pageStatus !== "reliable") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["knowledge"],
          message: `${entry.knowledgeId} cite des pages sous un pageStatus ${entry.pageStatus}.`,
        });
      }
    }
  });

export function parseLibraryKnowledgeIndex(input: unknown): LibraryKnowledgeIndex {
  return libraryKnowledgeIndexSchema.parse(input) as LibraryKnowledgeIndex;
}

export function parseLibraryDocumentIndex(input: unknown): LibraryDocumentIndex {
  return libraryDocumentIndexSchema.parse(input) as LibraryDocumentIndex;
}

export function parseInterventionKnowledgeIndex(input: unknown): InterventionKnowledgeIndex {
  return interventionKnowledgeIndexSchema.parse(input) as InterventionKnowledgeIndex;
}

export function parseDeaCompetencyMap(input: unknown): DeaCompetencyMap {
  return deaCompetencyMapSchema.parse(input) as DeaCompetencyMap;
}
