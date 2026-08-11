# Audit du Mode Intervention — moteur clinique V2

Généré le 2026-08-11T10:57:01.696Z. L’audit n’a modifié aucun scénario pédagogique et n’a utilisé ni Supabase ni source non vérifiée.

## Résumé

| Indicateur | Résultat |
|---|---:|
| Scénarios conservés | 15 |
| Phases analysées | 120 |
| Choix analysés | 482 |
| Scénarios avec constantes ou observations | 15/15 |
| Scénarios avec constantes chiffrées | 10/15 |
| Scénarios avec variation chiffrée sourcée | 10/15 |
| Scénarios avec chemin d’échec réel | 15/15 |
| Références locales source_verified | 7 |
| Références cassées | 0 |
| Références incohérentes | 0 |

## Score de maturité : 86/100

| Axe | Score |
|---|---:|
| Qualité clinique | 22/25 |
| Qualité pédagogique | 16/20 |
| Cohérence des constantes | 11/15 |
| Cohérence des décisions et récompenses | 15/15 |
| Transmission au médecin régulateur | 13/15 |
| UX, mobile et accessibilité | 9/10 |

Les points non attribués correspondent principalement à la validation médicale/formateur encore requise, aux scénarios dont les données sont uniquement qualitatives ou ambiguës et au test manuel sur appareils réels restant à réaliser.

## Ce qui fonctionne

- Les 15 scénarios existants restent inchangés et conservent leurs huit phases.
- Chaque décision alimente désormais un état clinique, une chronologie et une conséquence observable.
- Les constantes chiffrées évoluent de façon bornée ; les observations qualitatives ne sont pas transformées en valeurs inventées.
- Les 15 scénarios possèdent un chemin d’échec après omissions critiques.
- La réévaluation répétée met à jour la surveillance et complète le bilan transmis.
- Le bilan au régulateur vérifie contexte, sécurité, ABCDE, constantes/interrogatoire, gestes, évolution et décision. Les éléments absents déclenchent des questions ciblées.
- XP, pièces, coffre et badge sont pondérés par l’état final et la complétude du bilan ; une prise en charge dégradée n’est plus rentable.
- Le débrief liste actions réussies, erreurs, conséquences, leçons Pulseo, connaissances et références documentaires.
- Les cinq niveaux sont disponibles : débutant, intermédiaire, avancé, critique et garde complète.

## Limites et contrôles requis

- **WARNING — QUALITATIVE_ONLY** : Le scénario ne contient aucune constante chiffrée associable sans ambiguïté à une norme du support DEA ; aucune valeur n’est inventée.
- **WARNING — QUALITATIVE_ONLY** : Le scénario ne contient aucune constante chiffrée associable sans ambiguïté à une norme du support DEA ; aucune valeur n’est inventée.
- **WARNING — QUALITATIVE_ONLY** : Le scénario ne contient aucune constante chiffrée associable sans ambiguïté à une norme du support DEA ; aucune valeur n’est inventée.
- **WARNING — QUALITATIVE_ONLY** : Le scénario ne contient aucune constante chiffrée associable sans ambiguïté à une norme du support DEA ; aucune valeur n’est inventée.
- **WARNING — QUALITATIVE_ONLY** : Le scénario ne contient aucune constante chiffrée associable sans ambiguïté à une norme du support DEA ; aucune valeur n’est inventée.
- **WARNING — TRAINER_VALIDATION_PENDING** : Les 120 interactions existantes restent à valider formellement par un médecin urgentiste référent et un formateur DEA avant publication comme référentiel professionnel.
- **INFO — MODÈLE BORNÉ** : l’évolution des constantes est un retour pédagogique déterministe, pas un modèle physiologique ni un protocole de soins.
- **INFO — RÉCOMPENSES LOCALES** : les récompenses de garde restent des résultats d’entraînement et ne créditent pas Supabase.
- **INFO — TEST APPAREIL** : valider encore le rendu à 320/360 px, le clavier, le lecteur d’écran et les performances sur un téléphone milieu de gamme.

## Priorités avant publication clinique

1. Faire valider les 120 interactions existantes par un binôme médecin urgentiste / formateur DEA.
2. Vérifier les protocoles locaux cités dans `INTERVENTION_MEDICAL_REVIEW.md`.
3. Tester une garde complète sur appareils mobiles réels, avec et sans réduction des animations.
4. Conserver le moteur clinique déterministe ; ne pas générer librement de protocoles par IA.

Le détail machine est disponible dans `INTERVENTION_MODE_AUDIT.json`.
