# Moteur de contenu MedLingo

Les questions sont des données. Elles ne doivent pas être écrites dans un composant React, un hook ou une fonction de génération.

Les nouvelles banques utilisent la V2 décrite dans [`formations/README.md`](./formations/README.md). La V1 reste disponible uniquement pour assurer la compatibilité des contenus historiques pendant leur migration.

## Organisation

- `content-domain.ts` contient les contrats TypeScript indépendants de l'interface.
- `content-schema.ts` valide chaque banque avec Zod au chargement.
- `content-engine.ts` fournit la recherche et la correction par identifiant.
- `banks/*.json` contient les questions publiables.
- `intervention-content-catalog.ts` branche la banque Intervention sur le moteur générique.
- `pedagogical-content.ts` valide et expose les leçons courtes du parcours DEA.
- `lesson-runtime.ts` prépare une nouvelle tentative et mélange les réponses sans perdre leurs identifiants.
- `banks/pedagogical-lessons.json` décrit l'ordre des interactions, la carte Pulse et la provenance de chaque leçon.
- `formation-registry.ts` découvre automatiquement toutes les formations et leurs parcours.
- `lesson-content-repository.ts` charge chaque fichier de leçon à la demande et le met en cache.
- `formations/<formation>/formation.json` définit les parcours, leçons, quiz et boss.
- `formations/<formation>/parcours-XX/parcours.json` décrit l'objectif global, l'ordre, les prérequis, les compétences et les pools de révision d'un parcours.
- `formations/<formation>/parcours-XX/lesson-XX.specification.json` est la source officielle exhaustive d'une leçon.
- `formations/<formation>/parcours-XX/lesson-XX.json` contient une seule banque indépendante.
- `pedagogical-specification-schema.ts` valide la conservation, les identifiants et l'état de projection de chaque contenu officiel.
- `pedagogical-specification-merge.ts` fusionne les révisions par identifiant stable et refuse tout remplacement silencieux.
- `parcours-manifest-schema.ts` valide la progression complète d'un parcours et ses banques sources.
- `lesson-runtime.ts` fournit aussi une sélection équilibrée multi-banques avec déduplication par identifiant.
- `master-knowledge-base.json` décrit les compétences, leurs prérequis et leurs sources.
- `master-knowledge-catalog.ts` retrouve les compétences d'une leçon ou d'une question.

## Spécification officielle et projection

La spécification `lesson-XX.specification.json` est la vérité métier. Elle conserve sans limitation le cours, les objectifs, le vocabulaire, les flashcards, les exercices, les cas, les pièges, les anecdotes, le quiz, le boss et les extensions futures. Un contenu incomplet garde son texte et reçoit le statut `pending_content` ; il n'est jamais complété automatiquement.

Le fichier `lesson-XX.json` est seulement la projection que le moteur actuel sait exécuter. Les identifiants `integration.projectedContentIds` et `integration.nonProjectedContentIds` garantissent que chaque contenu officiel est suivi exactement une fois. Un élément non projeté reste dans la spécification et pourra être activé par une version future du moteur.

Les révisions utilisent `specificationVersion`, `contentRevision` et `mergeStrategy: "merge_by_stable_id"`. Une nouvelle révision peut ajouter un contenu ou compléter un élément `pending_content`, mais une divergence sur un texte déjà fourni provoque une erreur au lieu de remplacer la source.

## Banque maîtresse et traçabilité

Chaque nouvel exercice V2 déclare `competencyIds`. Ces identifiants doivent exister dans
`master-knowledge-base.json`, et la compétence doit réciproquement référencer la question dans
`questionIds`. Les champs `metadata.sourceDocument`, `metadata.sourcePages` et
`metadata.reviewStatus` conservent la provenance et le niveau de validation.

La leçon `dea-p01-l01` reste reliée à sa spécification pédagogique officielle. La banque existante de 50 exercices est reconnectée sans réécriture conformément au manifeste du Parcours 1. Sa copie immuable et la première projection officielle de neuf exercices restent conservées sous `archive/` pour audit.

Les leçons 2 à 9, la révision, le quiz et le Boss du Parcours 1 restent invisibles avec le statut `awaiting_content`. La révision et le quiz ne dupliquent aucune question : leurs fichiers déclarent les leçons sources dans `contentPool`. Les compétences sans support DEA confirmé restent en `draft`, avec `sourceConfirmationRequired: true` et des critères de maîtrise `pending_confirmation`.

## Ajouter une question

Ajouter un objet à la propriété `items` de la banque concernée. Exemple minimal :

```json
{
  "id": "communication_001",
  "unit": "Communication",
  "lesson": "Se présenter au patient",
  "difficulty": "easy",
  "type": "mcq",
  "question": "Quelle formulation ouvre correctement l'échange ?",
  "answers": [
    {
      "id": "communication_001-introduction",
      "text": "Se présenter, préciser son rôle et vérifier l'identité du patient",
      "explanation": "Cette formulation établit le cadre de l'échange."
    },
    {
      "id": "communication_001-question-directe",
      "text": "Commencer immédiatement par une question clinique détaillée",
      "explanation": "La question clinique vient après une brève présentation."
    }
  ],
  "correctAnswer": "communication_001-introduction",
  "explanation": "Une présentation claire sécurise l'échange.",
  "tags": ["communication", "bloc1", "patient"]
}
```

`correctAnswer` contient toujours un identifiant de réponse, jamais une lettre ou un index visuel. Pour `multiple_choice` et `ordering`, il s'agit d'un tableau d'identifiants. Dans un contenu `ordering`, l'ordre du tableau constitue la correction et chaque réponse possède également un `sequenceRank`.

## Types disponibles

- `mcq` : choix unique.
- `multiple_choice` : plusieurs réponses attendues.
- `ordering` : ordre chronologique exact.
- `true_false_contextual` : vrai/faux contextualisé à choix unique.
- `equipment` : sélection de matériel.
- `association` : association signe/action ou mise en correspondance. Pour une mise en correspondance, chaque réponse possède un champ `match`, `metadata.associationMode` vaut `matching` et `correctAnswer` contient tous les identifiants dans l'ordre attendu.
- `error_identification` : identification d'une erreur.
- `regulatory` : décision réglementaire.
- `handover` : transmission ou relais.

## Utiliser le catalogue

```ts
const questions = catalog.query({
  unit: "Communication",
  difficulty: "easy",
  tags: ["patient"],
});

const result = catalog.evaluate("communication_001", ["communication_001-introduction"]);
```

Le résultat contient la correction globale et le feedback de chaque réponse. Le moteur ne dépend ni de React ni du Mode Intervention.

## Ajouter une leçon pédagogique

Pour tout nouveau contenu, utiliser exclusivement la structure V2 dans `formations/`. Les étapes ci-dessous concernent seulement une maintenance temporaire de la V1.

1. Ajouter les interactions dans une banque JSON dédiée sous `banks/`.
2. Renseigner `metadata.lessonId`, `metadata.sourceDocument` et `metadata.sourcePages` sur chaque interaction.
3. Ajouter le manifeste de la leçon dans `banks/pedagogical-lessons.json` avec une phrase Pulse et l'ordre des interactions.
4. Relier le manifeste au curriculum avec `contentLessonId` ; l'interface existante charge alors la leçon sans question codée dans React.

La phrase Pulse est un écran d'introduction non noté. Le nombre d'interactions du manifeste pilote la progression, le score et la fin de leçon.

## Garanties automatiques

Le schéma refuse notamment :

- un identifiant de contenu ou de réponse dupliqué ;
- une correction qui référence une réponse absente ;
- un tableau de corrections sur une question à choix unique ;
- une seule correction sur un choix multiple ;
- un ordre incomplet ou des rangs non continus ;
- un nombre `requiredSelections` incohérent ;
- des tags dupliqués.

Exécuter `npm test` après chaque modification. Les contenus médicaux ou réglementaires doivent en plus être relus par un professionnel habilité avant publication.
