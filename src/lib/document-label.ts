/**
 * Nom lisible d'un document source.
 *
 * Les références pédagogiques sont stockées avec leur nom de fichier, extension
 * comprise, et parfois avec leur chemin complet dans le dépôt. Affiché tel quel,
 * un `docs/official_sources/.../VFF_Referentiel_formation_..._2026.pdf` ressemble
 * à une ligne de code égarée au milieu d'un débriefing.
 *
 * On garde le dernier segment du chemin, on retire l'extension, et on rend les
 * séparateurs techniques aux espaces. Ce qui reste est ce qu'un apprenant peut
 * aller chercher : un titre de document.
 */
export function documentLabel(source: string | undefined | null): string {
  if (!source) return "Source non précisée";
  const fileName = source.split(/[/\\]/u).pop() ?? source;
  const label = fileName
    .replace(/\.[a-z0-9]+$/iu, "")
    .replace(/_+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  // Un chemin qui ne laisse rien après nettoyage vaut mieux dit qu'affiché vide.
  return label.length > 0 ? label : "Source non précisée";
}
