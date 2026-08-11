# Pulseeo Official Knowledge Library V1

Cette arborescence est la source de vérité documentaire de Pulseeo. Elle est
indépendante des anciennes banques pédagogiques : aucun contenu existant n'est
promu automatiquement au statut officiel.

## Principes

- Un document n'entre dans `official_sources/document_catalog.json` qu'après
  identification de l'organisation, de la version, de l'URL et du fichier.
- Une connaissance n'entre dans
  `master_knowledge_base/knowledge.json` que si son document source existe dans
  le catalogue.
- Une question n'entre dans `questions/references.json` que si sa connaissance
  et sa source existent.
- Les modifications sont ajoutées par nouvelle version et journalisées. Les
  versions précédentes restent dans `archive`.
- Les moteurs d'audit, de comparaison et de recherche ne corrigent jamais les
  données.

## Statuts

- `draft` : donnée en cours de préparation, non publiable.
- `source_verified` : la correspondance avec le document a été contrôlée.
- `pedagogically_reviewed` : une revue pédagogique a été réalisée.
- `trainer_validated` : validation explicite d'un formateur identifiée.
- `deprecated` : version conservée pour l'historique.

`source_verified` ne doit jamais être présenté comme une validation de
formateur.

## Import d'une source

1. Copier le document dans la catégorie appropriée sous `official_sources`.
2. Calculer son SHA-256 sans modifier le fichier.
3. Ajouter sa fiche d'identité au catalogue.
4. Créer les connaissances sourcées avec chapitre, section, paragraphe et page.
5. Exécuter `npm run audit:library`.
6. Soumettre la source et les connaissances à la validation requise.

Les modèles JSON se trouvent dans `reference_library/templates`.

## Traitement séquentiel et reprise

Le pipeline analyse strictement un seul document à la fois. Son état est
conservé dans `versioning/document-analysis-progress.json`.

- Un checkpoint `processing` est écrit avant l'analyse.
- Un checkpoint `completed` est écrit seulement après la sauvegarde du résultat.
- Un document interrompu ou en erreur est repris avant tout document suivant.
- Une nouvelle version ou un nouveau hash remet uniquement le document concerné
  en attente.
- Aucun document suivant n'est analysé tant que le document actif n'est pas
  terminé.

## Compatibilité Supabase et offline

Le moteur dépend de l'interface `LibraryCatalogReader`, pas d'un stockage
particulier. Le lecteur courant utilise les catalogues JSON versionnés. Un
lecteur Supabase peut fournir les mêmes enveloppes depuis des vues en lecture
seule, avec cache local pour l'utilisation hors-ligne.

Correspondance recommandée :

| Catalogue          | Vue Supabase                         |
| ------------------ | ------------------------------------ |
| official_documents | `library_official_documents_v`       |
| internal_documents | `library_internal_documents_v`       |
| knowledge          | `library_knowledge_v`                |
| questions          | `library_question_references_v`      |
| bosses             | `library_boss_references_v`          |
| clinical_cases     | `library_clinical_case_references_v` |
| glossary           | `library_glossary_v`                 |
| versions           | `library_versions_v`                 |

La création de ces vues et tables fera l'objet d'une migration séparée après
validation du modèle. Cette V1 ne modifie pas Supabase.
