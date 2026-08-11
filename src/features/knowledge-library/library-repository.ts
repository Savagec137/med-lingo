import type { KnowledgeLibrarySnapshot } from "./library-domain.ts";
import { parseKnowledgeLibrarySnapshot } from "./library-schema.ts";

export const LIBRARY_CATALOGS = [
  "official_documents",
  "internal_documents",
  "knowledge",
  "questions",
  "bosses",
  "clinical_cases",
  "glossary",
  "versions",
] as const;

export type LibraryCatalogName = (typeof LIBRARY_CATALOGS)[number];

export interface LibraryCatalogReader {
  read(catalog: LibraryCatalogName): Promise<unknown>;
}

export interface KnowledgeLibraryRepository {
  loadSnapshot(): Promise<KnowledgeLibrarySnapshot>;
}

type CatalogEnvelope = Record<string, unknown>;

function envelope(value: unknown): CatalogEnvelope {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as CatalogEnvelope)
    : {};
}

function list(value: unknown, key: string) {
  const content = envelope(value)[key];
  return Array.isArray(content) ? content : [];
}

export class CatalogKnowledgeLibraryRepository implements KnowledgeLibraryRepository {
  constructor(private readonly reader: LibraryCatalogReader) {}

  async loadSnapshot(): Promise<KnowledgeLibrarySnapshot> {
    const [
      officialDocuments,
      internalDocuments,
      knowledge,
      questions,
      bosses,
      clinicalCases,
      glossary,
      versions,
    ] = await Promise.all(LIBRARY_CATALOGS.map((catalog) => this.reader.read(catalog)));
    const officialEnvelope = envelope(officialDocuments);

    return parseKnowledgeLibrarySnapshot({
      schemaVersion: "1.0.0",
      libraryVersion: String(officialEnvelope.library_version ?? ""),
      documents: list(officialDocuments, "documents"),
      internalDocuments: list(internalDocuments, "documents"),
      knowledge: list(knowledge, "knowledge"),
      questions: list(questions, "questions"),
      bosses: list(bosses, "bosses"),
      clinicalCases: list(clinicalCases, "clinical_cases"),
      glossary: list(glossary, "terms"),
      versions: list(versions, "versions"),
    });
  }
}

/**
 * Supabase peut implémenter LibraryCatalogReader en lisant une vue JSON par
 * catalogue. Le moteur ne dépend volontairement ni des noms de tables ni d'un
 * client réseau, ce qui permet le cache local et le mode hors-ligne.
 */
export function createSupabaseCatalogReader(
  readView: (catalog: LibraryCatalogName) => Promise<unknown>,
): LibraryCatalogReader {
  return { read: readView };
}
