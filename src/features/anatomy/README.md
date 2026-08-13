# Anatomie interactive Medoca — rapport de sprint

Base technique des questions anatomiques interactives, inspirée de la maquette
« Clique sur le cœur ». Ce lot livre **la couche logique, les types, le pilote et
les tests**. Il ne livre ni les composants d'affichage de la maquette, ni les
images de planches : § « Ce qui n'est pas fait, et pourquoi ».

## 1. Audit de l'existant

### Ce qui existe déjà

| Élément                                                       | Où                                                    | État                                        |
| ------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| Pastilles numérotées visibles avant correction                | `components/exercises/AnatomyLocationQuestion.tsx`    | **déjà conforme à la décision de gameplay** |
| Libellés révélés seulement après correction                   | même fichier                                          | déjà conforme                               |
| Zoom molette, pincement, boutons, panoramique, bornes ×1 à ×4 | même fichier                                          | complet                                     |
| Contre-facteur `1/zoom` sur les pastilles                     | même fichier                                          | complet                                     |
| Planche vectorielle du corps humain                           | même fichier, `HumanBodyPlate`                        | complet                                     |
| Image interactive générique                                   | `components/exercises/ImageHotspot.tsx`               | complet                                     |
| 28 questions `anatomy_location`                               | 22 fichiers de `content/formations/dea`               | en production                               |
| Coordonnées relatives `"x,y"` en fractions 0–1                | `answer.detail` des 28 questions                      | en production                               |
| 23 structures distinctes                                      | mêmes questions, `hotspot-<slug>`                     | en production                               |
| Registre de routage des exercices                             | `components/exercises/exercise-renderer-registry.ts`  | **métadonnée morte, voir ci-dessous**       |
| Couches anatomiques                                           | nulle part                                            | à créer                                     |
| Images de planches                                            | nulle part — seul `assets/game/bg-anatomy.jpg` existe | à créer                                     |
| Tests anatomiques                                             | nulle part                                            | à créer                                     |

**La maquette a été dessinée d'après le composant existant.** La légende « Les
libellés sont révélés après la correction » est le texte exact déjà affiché par
`AnatomyLocationQuestion`, et les pastilles numérotées y sont déjà en place. La
décision de gameplay de ce sprint ne change donc rien : elle confirme l'existant.

### Ce qui est redondant

**Deux composants pour deux besoins voisins.** `AnatomyLocationQuestion` porte
une planche vectorielle et le mécanisme de vue ; `ImageHotspot` porte une image
bitmap avec un rayon et un mode observation. Ils ne se recouvrent qu'en partie.

**`metadata.anatomyTarget` redit `correctAnswer`.** Les 28 questions portent les
deux. Un test vérifie qu'ils concordent ; `correctAnswer` reste la seule autorité.

**Le registre de routage ne route rien.** `EXERCISE_RENDERER_REGISTRY` associe
`anatomy_location` au composant `"ImageHotspot"`, alors que `routes/lecon.$lessonId.tsx`
rend en dur `AnatomyLocationQuestion`. La table est de la documentation, pas du
code exécuté — et cette documentation est fausse. Elle n'a pas été corrigée dans
ce lot : la changer sans changer le routage réel ne ferait que déplacer le
mensonge, et le vrai routage viendra avec `AnatomyBoard`.

### Ce qui doit fusionner, et ce qui doit rester séparé

**Fusionne :** la logique. Positions, numéros, règle de révélation, correction,
progression, couches, zoom — tout cela est désormais dans un module pur, partagé.

**Reste séparé :** `ImageHotspot`. Une photo annotée n'est pas une planche
anatomique. Rien n'est gagné à forcer la fusion, et le composant garde
`interactive_image`. Il n'est ni modifié ni supprimé.

## 2. Fichiers créés

| Fichier                      | Rôle                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `anatomy-domain.ts`          | tous les types demandés, les bornes de zoom, les budgets d'actifs                                   |
| `anatomy-layers.ts`          | ordre d'empilement, libellés, table des 23 structures → couche, bascule verrouillable               |
| `anatomy-question.ts`        | **la logique pure** : lecture des coordonnées, sélection, correction, révélation, progression, zoom |
| `anatomy-plates.ts`          | registre des planches et de leurs actifs, tous déclarés `available: false`                          |
| `anatomy-schema.ts`          | validation zod d'une question, dont la garantie de jouabilité                                       |
| `anatomy-catalog.ts`         | chargement du catalogue de questions configurées                                                    |
| `pilot-grands-systemes.json` | le pilote de la maquette : six zones, cœur attendu                                                  |
| `anatomy.test.ts`            | 59 tests                                                                                            |

## 3. Fichiers modifiés

| Fichier                                            | Modification                                                                                                                                                                                       | Risque                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `components/exercises/AnatomyLocationQuestion.tsx` | consomme la logique partagée pour les positions, les numéros, les libellés accessibles et le bornage du décalage. **Aucune classe, aucune structure JSX changée.** 33 lignes retirées, 23 ajoutées | faible : le comportement est celui que les tests couvrent |
| `package.json`                                     | ajout du test au script `test`                                                                                                                                                                     | nul                                                       |

Aucun autre fichier n'est touché. Ni Supabase, ni `intervention-v3`, ni une
question, ni `ImageHotspot`, ni un type existant renommé.

## 4. Types ajoutés

Les noms demandés sont respectés à l'identique :

`AnatomyLayer`, `AnatomyView`, `AnatomyHotspotConfig`, `AnatomyQuestionConfig`,
`AnatomyAnswerOption`, `AnatomySelectionState`, `AnatomyCorrectionState`.

S'y ajoutent, parce que le pilote les exige : `AnatomyVerdict`,
`AnatomyProgress`, `AnatomyInfoCard`, `AnatomyFactStat`, `AnatomyTrust`,
`AnatomyPlate`, `AnatomyPlateView`, `AnatomyLayerAsset`, `AnatomyPoint`,
`AnatomySourceAnswer`.

### Les coordonnées

Les configurations écrites à la main travaillent en **pourcentage, 0 à 100**,
comme demandé : c'est plus lisible dans un JSON. Les 28 questions en production
stockent des **fractions 0 à 1** ; `parseRelativePoint` convertit, et détecte
qu'une valeur supérieure à 1 est déjà un pourcentage pour ne pas la multiplier
deux fois. Aucune question n'est modifiée. Dans les deux cas la coordonnée est
relative, donc stable au zoom, au redimensionnement et au changement d'écran —
trois tests le vérifient.

### Le rayon de contact

`DEFAULT_HOTSPOT_RADIUS` vaut **7 %** et non 6. Sur un écran de 360 pixels, 6 %
donnent 43 pixels de diamètre, juste sous le minimum tactile de 44. Un test
calcule la valeur au lieu de la supposer.

## 5. Décisions structurantes

**La règle de gameplay est une fonction, pas une intention.** `correct()` renvoie
un `revealed` dont dépendent `visibleLabel`, `hotspotAriaLabel` et
`answerOptions`. Aucun composant ne peut afficher un nom de zone avant correction
sans contourner le module. C'est ce qui rend la règle testable sans DOM.

**Une zone déjà trouvée garde son nom.** À quatre zones sur six, deux cartes
restent muettes : c'est la correction du défaut relevé sur la maquette, qui
affiche les six noms tout en annonçant l'inverse.

**La couche de la cible est verrouillée.** Tant que la question n'est pas
corrigée, la couche qui porte la zone attendue ne peut pas être masquée — sinon
le joueur rendrait la question insoluble. Le verrou tombe après correction. Le
schéma refuse en plus une question dont la cible naîtrait masquée.

**Deux fonctions de lecture, pour deux exigences opposées.**
`hotspotsFromAnswers` **échoue** sur une structure absente de la table des
couches : c'est juste pour une configuration écrite à la main, où l'oubli doit se
voir. `pointsFromAnswers` ne demande aucune couche : la planche vectorielle n'en
a pas, et faire planter une leçon parce qu'un slug manque serait inacceptable.
Un test couvre chacune des deux exigences.

**Un contact hors zone n'est pas une mauvaise zone.** Le verdict `missed` est
distinct de `incorrect`, avec son propre message. Se tromper de structure et
cliquer dans le vide n'apprennent pas la même chose.

**Aucun actif n'est livré.** Les quinze chemins d'images sont déclarés avec
`available: false`, un budget de 250 Ko par couche et un repli WebP.
`needsVectorFallback` dit au composant de rester sur la planche vectorielle. Deux
tests vérifient qu'aucune couche n'est demandée et que rien de lourd n'entre dans
le paquet.

**Les chiffres de la fiche portent leur provenance.** « ≈ 12 cm », « 250 – 350 g »,
« 60 – 100 bpm » sont des affirmations médicales sans document lisible derrière
elles. La fiche du cœur est donc `trust: "internal_to_validate"` avec une note de
relecture, et le schéma refuse une fiche à valider sans note, ou des chiffres
déclarés vérifiés sans fiche de bibliothèque. `En savoir plus` reste absent tant
qu'aucun `knowledgeId` ne se résout — un test le vérifie dans les deux sens.

## 6. Tests

59 tests dans `anatomy.test.ts`, ajoutés au script `test`. Le total du dépôt
passe de 238 à 297.

| Attendu du sprint                                | Couverture                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 1. La consigne s'affiche                         | données du pilote vérifiées (`instruction`, `actionHint`, titre, sous-titre) ; le rendu relève du composant, voir § 7 |
| 2. Pastilles numérotées avant correction         | « les pastilles sont numérotées de 1 à n », « avant correction, la pastille est annoncée par son numéro »             |
| 3. Libellés non révélés avant correction         | trois tests, dont les cartes de réponses et le libellé accessible                                                     |
| 4. Bon hotspot → correct                         | « toucher la bonne zone donne un verdict correct »                                                                    |
| 5. Mauvais hotspot → erreur et bonne réponse     | « toucher une mauvaise zone nomme l'erreur et la bonne réponse »                                                      |
| 6. Progression mise à jour                       | « la progression est mise à jour et se lit comme la maquette », plus l'idempotence                                    |
| 7. Couches activables et désactivables           | cinq tests, dont le verrou de la couche cible                                                                         |
| 8. Zoom et reset ne cassent pas les coordonnées  | « le zoom et la réinitialisation ne cassent pas les coordonnées des zones »                                           |
| 9. Coordonnées stables au redimensionnement      | « un redimensionnement ne change aucune coordonnée de zone »                                                          |
| 10. `ImageHotspot` reste sur `interactive_image` | vérifié sur le registre                                                                                               |
| 11. `AnatomyBoard` devient la cible              | **non fait**, voir § 7                                                                                                |
| 12. Aucun actif lourd chargé                     | trois tests sur le registre de planches                                                                               |
| 13. TypeScript passe                             | `tsc --noEmit` sans erreur sur ces fichiers                                                                           |
| 14. Tests passent                                | 297 / 297                                                                                                             |
| 15. ESLint passe sur les fichiers modifiés       | sans erreur                                                                                                           |
| 16. Build production                             | **invérifiable ici**, voir § 8                                                                                        |

S'ajoutent des tests que le sprint ne demandait pas mais que les données
imposaient : conversion sans perte des 28 questions existantes, couverture des 23
structures par la table des couches, concordance de `correctAnswer` avec
`metadata.anatomyTarget`, et absence d'entrée inutilisée dans la table.

## 7. Ce qui n'est pas fait, et pourquoi

**Les huit composants d'affichage** — `AnatomyBoard`, `AnatomyLayerToggle`,
`AnatomyHotspot`, `AnatomyMiniMap`, `AnatomyZoomControls`, `AnatomyAnswerCards`,
`AnatomyFeedbackPanel`, `AnatomyInfoCard` — ne sont pas écrits.

La raison est vérifiable : **ce dépôt n'a aucun outil de test du DOM.** Les tests
tournent sous `node --experimental-strip-types --test`, sans jsdom, sans
`@testing-library`, sans vitest. Et `vite build` ne peut pas s'exécuter dans cet
environnement, `framer-motion` et `@lovable.dev/vite-tanstack-config` étant
injoignables depuis le réseau du conteneur. Écrire huit composants dans ces
conditions produirait de l'interface que ni test ni compilation ni œil ne
pourraient valider.

Ce qui a été fait à la place a plus de valeur : toute la logique que ces
composants auraient portée est écrite, partagée et testée, et le composant vivant
la consomme déjà. Les composants restants deviennent de l'affichage, et leur
écriture est sans risque une fois qu'un rendu peut être vérifié.

**Le routage `anatomy_location` → `AnatomyBoard`** attend donc `AnatomyBoard`.
`AnatomyLocationQuestion` n'est ni supprimé ni déprécié : il est devenu le
premier client de la nouvelle couche, ce qui est exactement la migration
progressive demandée.

## 8. Commandes exécutées

```
node --experimental-strip-types --test src/features/anatomy/anatomy.test.ts   # 59/59
npm test                                                                      # 297/297
npx tsc --noEmit                                                              # rien sur ces fichiers
npx eslint src/features/anatomy src/components/exercises/AnatomyLocationQuestion.tsx
npx prettier --write ...                                                      # conforme
```

`npm run build` n'a pas été lancé : il échoue dans cet environnement pour une
raison sans rapport avec ce code — deux dépendances sont injoignables. À vérifier
sur un poste ayant accès au registre npm avant de conclure.

## 9. Risques restants

**Le composant vivant n'a pas été vu tourner.** Le refactor est
comportementalement neutre par construction — mêmes classes, même structure, même
enchaînement — et la logique extraite est testée, mais aucune vérification
visuelle n'a été possible. Deux points à regarder en premier sur un poste de
développement : la position des pastilles, qui passent de `${x * 100}%` à
`${x}%`, et leur numérotation.

**La table des couches est un jugement.** Les 23 structures ont été rangées à la
main. Le thorax et l'abdomen sont rattachés à la peau, seule couche qui les rende
repérables de l'extérieur ; c'est défendable, mais un formateur peut préférer les
voir en régions à part.

**Les coordonnées du pilote viennent des questions existantes.** Elles ont été
posées sur la planche vectorielle, pas sur un rendu photoréaliste. Elles devront
être reprises quand les images arriveront, faute de quoi les pastilles tomberont
à côté des organes.

**Les chiffres de la fiche du cœur attendent une relecture médicale.** Ils sont
marqués comme tels, mais ils s'afficheront tant que personne ne les aura validés.

## 10. Décisions encore ouvertes

1. **Vues supplémentaires.** Dos et profil sont déclarés mais sans actif. Chaque
   vue coûte cinq images. Combien en produire ?
2. **Régions contre organes.** Faut-il une sixième couche pour les régions
   anatomiques, aujourd'hui rattachées à la peau ?
3. **Perte de vie sur mauvaise réponse.** La mécanique existe
   (`Progress.hearts`), mais la question anatomique ne la déclenche pas
   aujourd'hui. À décider avant de la brancher.
4. **Registre de routage.** Le corriger maintenant, ou en même temps que
   `AnatomyBoard` ?
5. **Fiches de bibliothèque anatomiques.** Aucune n'existe. Sans elles,
   `En savoir plus` restera absent.

## 11. Prochaine étape recommandée

Écrire `AnatomyBoard` et ses sept composants satellites, **sur un poste où
`npm run build` et un rendu visuel sont possibles**. Toute la logique dont ils ont
besoin est prête et testée : ils n'ont plus qu'à afficher un état et à remonter
des intentions.

Dans l'ordre : `AnatomyBoard` avec repli vectoriel, puis `AnatomyLayerToggle` et
`AnatomyZoomControls`, puis `AnatomyFeedbackPanel` et `AnatomyAnswerCards`, puis
`AnatomyInfoCard`, et enfin `AnatomyMiniMap` — la mini-vue est la seule pièce
dont rien ne dépend.

Le basculement du routage vient en dernier, une fois `AnatomyBoard` vu à l'écran
sur une des 28 questions existantes.
