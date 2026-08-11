# Mode Intervention

Le module est volontairement isolé des leçons, des quiz, de Pulse et de Supabase.

## Architecture

- `intervention-domain.ts` décrit les contrats TypeScript communs.
- `intervention-missions.json` contient les 15 missions officielles, sans logique d'interface.
- `../content/banks/intervention-content.json` contient les 120 questions et leurs feedbacks, sans logique TypeScript.
- `../content/content-schema.ts` valide la banque avant son utilisation.
- `intervention-scenario-builder.ts` assemble un profil de mission et son contenu en huit étapes compatibles avec le moteur.
- `intervention-official-scenarios.ts` charge et expose le catalogue officiel à l'interface.
- `intervention-scenarios.ts` conserve les trois scénarios historiques, mais n'alimente plus le chapitre officiel.
- `intervention-engine.ts` applique les décisions, embranchements, scores et récompenses sans dépendre de React.
- `intervention-clinical-engine.ts` projette les effets déjà présents dans les scénarios vers un état clinique, des constantes bornées, un état d’échec, une surveillance et un débrief. Il ne crée aucun protocole de soins.
- `intervention-clinical-sources.ts` relie le débrief à des connaissances locales `source_verified` de la bibliothèque documentaire.
- `intervention-shift-engine.ts` orchestre la garde, les cinq niveaux de simulation et la pondération des récompenses sans écrire dans Supabase.
- `use-intervention-shift.ts` persiste et migre la garde locale, applique une décision clinique une seule fois et permet la réévaluation des constantes.
- `use-intervention-session.ts` relie le moteur à l'interface et conserve les meilleurs résultats dans `localStorage`.
- Les composants `Intervention*` rendent les quatre vues : catalogue, alerte, mission et débriefing.
- `routes/intervention.tsx` orchestre ces vues sans contenir la logique métier.

## Ajouter une mission officielle

Ajouter un profil dans le tableau `missions` de `intervention-missions.json`. L'identifiant et l'ordre doivent être uniques et `unlockAfter` doit référencer la mission précédente. Ajouter ensuite ses huit questions dans `../content/banks/intervention-content.json`, avec les identifiants `${missionId}-${phase}`. L'écran d'alerte représente la réception de l'appel, puis le builder assemble automatiquement les huit phases du moteur : Arrivée, Sécurisation, ABCDE, Bilan secondaire, Gestes, Décisions, Transport et Débriefing.

Les effets (`score`, `patient`, `timeSeconds`, `xpBonus`, `rewardBonus`) sont calculés par le moteur. Le composant d'interface n'a donc pas besoin d'être modifié, même si plus de 200 profils sont ajoutés. Les tests du catalogue contrôlent l'unicité, l'ordre, les huit phases et la chaîne de déverrouillage.

## Questions et randomisation

Chaque question est chargée depuis le moteur de contenu générique et conserve des identifiants de réponse stables. Au début d'une nouvelle tentative, le moteur crée un ordre visuel aléatoire et l'enregistre dans la session. La correction compare les identifiants sélectionnés, jamais les lettres A, B, C, D ou E. Pour les choix uniques, l'algorithme équilibre les positions disponibles et interdit une troisième bonne réponse consécutive au même emplacement.

Les formats `single`, `multiple`, `sequence`, `contextual-true-false`, `equipment`, `association`, `error-identification`, `regulatory` et `handover` utilisent le même moteur. Les choix multiples comparent un ensemble d'identifiants ; l'ordre chronologique compare une séquence d'identifiants.

Le test `../content/content-engine.test.ts` vérifie le schéma, les recherches et les trois familles de correction. Le test `intervention-question-quality.test.ts` vérifie les nombres de choix, l'unicité des identifiants, la correction après mélange, les répétitions de position, l'équilibrage statistique et les réponses presque identiques.

## Accessibilité et performances

Les actions sont des boutons natifs, les étapes exposent `aria-current`, les changements déplacent le focus vers le nouveau titre et les retours sont annoncés avec `role=status`. `prefers-reduced-motion` désactive les transitions décoratives. Les animations utilisent seulement `transform` et `opacity`; aucun moteur 3D ni boucle de rendu n'est chargé.

## Simulation clinique et transmission

La garde dynamique conserve les quinze scénarios et leurs décisions validées. Les effets `patient` existants alimentent un état clinique séparé : amélioration, stabilisation, aggravation ou échec. Les valeurs numériques déjà présentes (FC, TA, SpO₂, FR, température, Glasgow, douleur et glycémie lorsqu’elles existent) évoluent dans des bornes de simulation. Une observation qualitative reste qualitative : le moteur n’invente jamais une constante absente.

Le bouton de réévaluation ajoute un point à la chronologie et actualise le bilan. La transmission contrôle sept champs : contexte, sécurité, première impression/ABCDE, constantes et interrogatoire, gestes, évolution et décision attendue. Un champ manquant produit une question ciblée du médecin régulateur. Ce mécanisme est un retour pédagogique déterministe, pas un modèle physiologique ni une prescription.

Les niveaux `beginner`, `intermediate`, `advanced`, `critical` et `full-shift` limitent le catalogue disponible et le nombre d’appels ; ils ne modifient jamais le contenu clinique d’un scénario.

## Persistance et récompenses

Les meilleurs scores des missions guidées et la garde dynamique en cours sont enregistrés localement. Les anciennes gardes locales sont migrées vers le schéma clinique lors de leur reprise. Un score de 60 % minimum valide une mission guidée et déverrouille la suivante.

Dans une garde, l’XP et les pièces sont pondérés par l’état final du patient et la complétude du bilan. Un échec clinique plafonne le score sous 40, réduit fortement XP et pièces, et retire coffre et badge. Les récompenses affichées restent des résultats d’entraînement et ne créditent pas l’inventaire Supabase. Une future intégration serveur devra être idempotente et pourra écouter la fin de mission sans modifier le moteur de scénarios.

## Audit

`npm run audit:intervention` analyse les quinze scénarios, les phases, les choix, les constantes, les chemins d’échec et les références de connaissances. Il génère `INTERVENTION_MODE_AUDIT.md` et `INTERVENTION_MODE_AUDIT.json` sans modifier les données pédagogiques. Toute référence cassée ou absence de chemin d’échec doit bloquer la validation technique.

Les contenus sensibles restant à faire valider avant publication sont listés dans `INTERVENTION_MEDICAL_REVIEW.md`.
