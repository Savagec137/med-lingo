import { getDocument } from "../../../content/library/library-catalog.ts";
import type { SourceTrust } from "../v3-domain.ts";

/**
 * Niveau de confiance affichable d'un document, **dérivé** des deux axes de la
 * bibliothèque et jamais déclaré.
 *
 * `sourceType` dit qui publie, `contentVerification` dit si quelqu'un a lu le
 * document. Les croiser interdit d'afficher « source officielle vérifiée » sur
 * un document dont seule l'URL a été validée : un texte réglementaire en
 * `listing_only` retombe en `internal_to_validate`, au même rang qu'une note
 * interne. C'est le seul agencement qui rende la mention non trompeuse.
 */
export function sourceTrust(documentId: string): SourceTrust {
  const document = getDocument(documentId);
  if (document.sourceType === "training") return "training_source";
  if (document.contentVerification !== "content_verified") return "internal_to_validate";
  if (document.sourceType === "internal") return "internal_to_validate";
  return "official_verified";
}

export const SOURCE_TRUST_LABELS: Record<SourceTrust, string> = {
  official_verified: "Source officielle vérifiée",
  training_source: "Support de formation",
  internal_to_validate: "Contenu interne à valider",
};

/** Vrai si le document peut sourcer un contenu présenté comme une obligation. */
export const isTrustedForRule = (documentId: string) =>
  sourceTrust(documentId) === "official_verified";
