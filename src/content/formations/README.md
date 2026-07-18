# Banques pédagogiques MedLingo V2

Les nouveaux contenus utilisent uniquement la nomenclature `formation`, `parcours`, `lesson`, `quiz` et `boss`. Les clés historiques `unit` et `chapter` ne doivent pas être ajoutées dans ce dossier.

## Organisation

```text
formations/
  dea/
    formation.json
    parcours-01/
      lesson-01.json
      lesson-02.json
```

`formation.json` décrit l'ordre des parcours et référence chaque fichier de leçon. Ajouter une nouvelle formation consiste à ajouter un manifeste et ses dossiers ; aucun composant React n'est modifié.

## Cycle d'une banque

- `awaiting_content` : fichier réservé, sans question.
- `review` : banque reçue, en cours de validation pédagogique.
- `published` : métadonnées complètes et questions validées ; le moteur peut l'afficher.
- `archived` : banque conservée mais retirée du parcours actif.

Une banque vide ne peut jamais passer à `published`.

## Structure d'une question validée

```json
{
  "id": "identifiant-stable",
  "difficulty": "easy",
  "type": "mcq",
  "question": "Texte fourni par la banque validée",
  "answers": [
    {
      "id": "answer-a",
      "text": "Réponse fournie",
      "explanation": "Feedback validé"
    },
    {
      "id": "answer-b",
      "text": "Réponse fournie",
      "explanation": "Feedback validé"
    }
  ],
  "correctAnswer": "answer-a",
  "explanation": "Explication validée",
  "tags": ["tag-validé"]
}
```

La correction repose toujours sur les identifiants, jamais sur la position visuelle. Les fichiers sont chargés à la demande et mis en cache, ce qui évite de charger les futures milliers de questions au démarrage.
