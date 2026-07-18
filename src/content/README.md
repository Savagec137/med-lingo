# Moteur de contenu MedLingo

Les questions sont des données. Elles ne doivent pas être écrites dans un composant React, un hook ou une fonction de génération.

## Organisation

- `content-domain.ts` contient les contrats TypeScript indépendants de l'interface.
- `content-schema.ts` valide chaque banque avec Zod au chargement.
- `content-engine.ts` fournit la recherche et la correction par identifiant.
- `banks/*.json` contient les questions publiables.
- `intervention-content-catalog.ts` branche la banque Intervention sur le moteur générique.

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
- `association` : association signe/action.
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
