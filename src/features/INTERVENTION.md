# Mode Intervention

Le module est volontairement isolé des leçons, des quiz, de Pulse et de Supabase.

## Architecture

- `intervention-domain.ts` décrit les contrats TypeScript communs.
- `intervention-scenarios.ts` contient uniquement les données des missions.
- `intervention-engine.ts` applique les décisions, embranchements, scores et récompenses sans dépendre de React.
- `use-intervention-session.ts` relie le moteur à l'interface et conserve les meilleurs résultats dans `localStorage`.
- Les composants `Intervention*` rendent les quatre vues : catalogue, alerte, mission et débriefing.
- `routes/intervention.tsx` orchestre ces vues sans contenir la logique métier.

## Ajouter un scénario

Ajouter un objet `InterventionScenario` à `INTERVENTION_SCENARIOS`. Chaque étape possède un identifiant, une phase, un état patient et des choix. Un choix peut définir `nextStepId` pour créer un embranchement ; sans identifiant explicite, le moteur continue vers l'étape suivante.

Les effets (`score`, `patient`, `timeSeconds`, `xpBonus`, `rewardBonus`) sont calculés par le moteur. Le composant d'interface n'a donc pas besoin d'être modifié, même si des centaines de scénarios sont ajoutés.

## Accessibilité et performances

Les actions sont des boutons natifs, les étapes exposent `aria-current`, les changements déplacent le focus vers le nouveau titre et les retours sont annoncés avec `role=status`. `prefers-reduced-motion` désactive les transitions décoratives. Les animations utilisent seulement `transform` et `opacity`; aucun moteur 3D ni boucle de rendu n'est chargé.

## Persistance

Seuls les meilleurs scores, temps et notes sont enregistrés localement. Les récompenses affichées sont des résultats d'entraînement et ne créditent pas l'inventaire Supabase. Une future intégration serveur pourra écouter la fin de mission sans modifier le moteur de scénarios.
