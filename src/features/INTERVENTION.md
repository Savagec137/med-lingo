# Mode Intervention

Le module est volontairement isolé des leçons, des quiz, de Pulse et de Supabase.

## Architecture

- `intervention-domain.ts` décrit les contrats TypeScript communs.
- `intervention-missions.json` contient les 15 missions officielles, sans logique d'interface.
- `intervention-scenario-builder.ts` transforme un profil de mission en huit étapes compatibles avec le moteur.
- `intervention-question-factory.ts` génère les formats, les distracteurs plausibles et les feedbacks pédagogiques selon la difficulté.
- `intervention-official-scenarios.ts` charge et expose le catalogue officiel à l'interface.
- `intervention-scenarios.ts` conserve les trois scénarios historiques, mais n'alimente plus le chapitre officiel.
- `intervention-engine.ts` applique les décisions, embranchements, scores et récompenses sans dépendre de React.
- `use-intervention-session.ts` relie le moteur à l'interface et conserve les meilleurs résultats dans `localStorage`.
- Les composants `Intervention*` rendent les quatre vues : catalogue, alerte, mission et débriefing.
- `routes/intervention.tsx` orchestre ces vues sans contenir la logique métier.

## Ajouter une mission officielle

Ajouter un profil dans le tableau `missions` de `intervention-missions.json`. L'identifiant et l'ordre doivent être uniques et `unlockAfter` doit référencer la mission précédente. L'écran d'alerte représente la réception de l'appel, puis le builder génère automatiquement les huit phases du moteur : Arrivée, Sécurisation, ABCDE, Bilan secondaire, Gestes, Décisions, Transport et Débriefing.

Les effets (`score`, `patient`, `timeSeconds`, `xpBonus`, `rewardBonus`) sont calculés par le moteur. Le composant d'interface n'a donc pas besoin d'être modifié, même si plus de 200 profils sont ajoutés. Les tests du catalogue contrôlent l'unicité, l'ordre, les huit phases et la chaîne de déverrouillage.

## Questions et randomisation

Chaque question conserve des identifiants de réponse stables. Au début d'une nouvelle tentative, le moteur crée un ordre visuel aléatoire et l'enregistre dans la session. La correction compare les identifiants sélectionnés, jamais les lettres A, B, C, D ou E. Pour les choix uniques, l'algorithme équilibre les positions disponibles et interdit une troisième bonne réponse consécutive au même emplacement.

Les formats `single`, `multiple`, `sequence`, `contextual-true-false`, `equipment`, `association`, `error-identification`, `regulatory` et `handover` utilisent le même moteur. Les choix multiples comparent un ensemble d'identifiants ; l'ordre chronologique compare une séquence d'identifiants.

Le test `intervention-question-quality.test.ts` vérifie les nombres de choix, l'unicité des identifiants, la correction après mélange, les répétitions de position, l'équilibrage statistique et les réponses presque identiques.

## Accessibilité et performances

Les actions sont des boutons natifs, les étapes exposent `aria-current`, les changements déplacent le focus vers le nouveau titre et les retours sont annoncés avec `role=status`. `prefers-reduced-motion` désactive les transitions décoratives. Les animations utilisent seulement `transform` et `opacity`; aucun moteur 3D ni boucle de rendu n'est chargé.

## Persistance

Seuls les meilleurs scores, temps et notes sont enregistrés localement. Un score de 60 % minimum valide la mission et déverrouille la suivante. Les récompenses affichées sont des résultats d'entraînement et ne créditent pas l'inventaire Supabase. Une future intégration serveur pourra écouter la fin de mission sans modifier le moteur de scénarios.

Les contenus sensibles restant à faire valider avant publication sont listés dans `INTERVENTION_MEDICAL_REVIEW.md`.
