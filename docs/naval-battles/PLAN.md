# Naval Battles — audit, architecture et plan de développement

## 1. Audit de départ

- Aucun jeu de pirates n'existait dans le code accessible : `med-lingo` (toutes branches) est
  une application médicale, les autres dépôts publics n'en contiennent pas, le projet Lovable
  non plus. Le jeu a donc été **créé** (à la demande explicite du propriétaire), dans
  `med-lingo`, sur sa propre route `/naval`, comme l'avait été « Marée Bleue ».
- Il ne touche à aucune fonctionnalité existante de MedLingo : route isolée, module chargé à
  la demande (Three.js inclus), aucune donnée partagée.

## Univers

- Le joueur est un pirate ; son galion recevra le modèle 3D fourni par le propriétaire
  (modèle réservé au joueur).
- Les ennemis sont les navires du gouvernement : **la Marine du Gouverneur** (faction
  fictive). Livrée : coques bleu nuit à bandeau doré, voiles de toile écrue, pavillon bleu
  roi aux armoiries d'or (ancre couronnée). Cotre des douanes, brick de la Marine, frégate
  du Gouverneur, brûlot de la Marine, galiote à bombes. Le fort du cap bat aussi ce pavillon.
- Les identifiants internes des missions (`le-borgne`, `la-vipere`) sont conservés pour ne
  pas rompre les sauvegardes, même si les navires d'élite s'appellent désormais
  « Le Vigilant » et « L'Inflexible ».

## Modèle 3D du galion du joueur

- Référence : `docs/naval-battles/reference/` (planche fournie et quatre vues découpées).
- Génération prévue : Higgsfield, modèle `meshy_multi_image_to_3d`, 4 vues, texturé + PBR,
  ~25 000 triangles, symétrie imposée — devis : **30 crédits**.
- Intégration prête (`render/player-model.ts`) : chargement GLB (meshopt accepté), calage
  automatique (orientation, longueur hors-tout, tirant d'eau), reflets du ciel couchant
  (PMREM), fenêtres et fanaux illuminés à partir de la texture, noircissement avec les
  dégâts, repli sur le galion procédural tant que `PLAYER_MODEL_URL` est vide.
- À la livraison : optimiser le fichier
  (`npx @gltf-transform/cli optimize in.glb public/models/galion-joueur.glb --compress meshopt --texture-compress webp --texture-size 1024`),
  renseigner `PLAYER_MODEL_URL` et `PLAYER_MODEL_FIT`, recaler les zones de tir du galion si
  les proportions diffèrent, vérifier en jeu.
- En développement, `/naval?modele=/chemin.glb` essaie un fichier sans rien modifier.

## 2. Architecture

```
src/features/naval/
  sim/        Simulation pure (aucune dépendance au rendu), testée sous Node
    defs.ts       classes de navires, munitions, constantes d'équilibrage
    math.ts       repère, relèvements, générateur déterministe
    combat.ts     tirs, balistique, dégâts localisés, incendie, réparation, naufrage
    ai.ts         5 tactiques ennemies
    world.ts      boucle à pas fixe, vagues, collisions, commandes du joueur, bilan
    missions.ts   missions et décor de l'arène
    upgrades.ts   arsenal (améliorations)
    save.ts       sauvegarde versionnée + règles économiques
    autopilot.ts  pilote automatique (tests de bout en bout, équilibrage)
  render/     Three.js : océan, ciel, îles, navires, effets, audio, moteur, caméra
  ui/         React : port, HUD de combat, bilan, icônes, styles
src/routes/naval.tsx   route client-only
```

Principes :

- la simulation ne connaît pas le rendu ; le rendu lit l'état et consomme `world.events` ;
- toutes les valeurs d'équilibrage sont déclarées dans `defs.ts`, `missions.ts`, `upgrades.ts` ;
- la sauvegarde (`naval-battles.save`, version 1) passe par `parseSave`/`migrate` : toute
  évolution future doit ajouter une migration, jamais remplacer la structure.

## 3. Les 12 systèmes demandés — état réel

| #   | Système                | État               | Ce qui est jouable                                                                                                                                                                                |
| --- | ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Combats navals avancés | **Fait (phase 1)** | Batteries bâbord/tribord/proue/poupe, tir roulant, 4 munitions, dégâts localisés coque/voiles/canons, incendies, réparations, naufrages, effets visibles, 5 tactiques IA, arsenal d'améliorations |
| 2   | Conquête des îles      | Non commencé       | Le fort du cap est un décor                                                                                                                                                                       |
| 3   | Équipage               | Non commencé       | —                                                                                                                                                                                                 |
| 4   | Coffres et équipements | Non commencé       | —                                                                                                                                                                                                 |
| 5   | Boss maritimes         | Amorcé             | Navires d'élite nommés (Le Vigilant, L'Inflexible) ; pas encore de phases de boss                                                                                                                 |
| 6   | Exploration / carte    | Non commencé       | Une région (« Eaux tranquilles »)                                                                                                                                                                 |
| 7   | Météo dynamique        | Non commencé       | Couchant fixe, houle animée (sans effet de jeu)                                                                                                                                                   |
| 8   | Commerce               | Non commencé       | —                                                                                                                                                                                                 |
| 9   | Abordage               | Non commencé       | —                                                                                                                                                                                                 |
| 10  | Flotte                 | Non commencé       | —                                                                                                                                                                                                 |
| 11  | Réputation / primes    | Non commencé       | —                                                                                                                                                                                                 |
| 12  | Personnalisation       | Non commencé       | —                                                                                                                                                                                                 |

## 4. Règles économiques (phase 1)

- Butin : prime de chaque navire coulé **par le joueur** (cotre 30, brick 55, frégate 120,
  brûlot 25, galiote 70 ; ×2,5 pour un navire d'élite). Un brûlot qui explose au contact ne
  rapporte rien.
- Victoire : butin + prime de mission (complète et gemmes à la première victoire, prime de
  reprise ensuite).
- Défaite : la moitié du butin est conservée, aucune prime.
- Abandon : aucune récompense.
- Améliorations : coûts fixes par niveau (`upgrades.ts`).

## 5. Plan

### Phase 1 — Fondations (livrée)

Combat, ennemis, missions et récompenses, effets visuels, port et arsenal.
Reste à faire dans cette phase : sons enregistrés (actuellement synthétisés), illustrations
de personnages (portrait du capitaine : emblème dessiné en attendant la phase 2).

### Phase 2 — Progression

- `sim/crew.ts` : personnages, rôles (canonnier → cadence/précision, charpentier → réparation,
  navigateur → vitesse/virage), XP ; appliqués comme `buildLoadout`.
- Portraits illustrés (génération d'images après validation du coût par le propriétaire).
- Coffres : tables de récompenses par rareté dans `sim/chests.ts`, inventaire dans la sauvegarde
  (migration v1 → v2).
- Personnalisation : couleurs de coque/voiles/pavillon → `ShipLook` existe déjà côté rendu.
- Écran « Évolution du navire » : refonte de l'onglet Arsenal.

### Phase 3 — Monde

Carte des régions (plusieurs `ARENA_ISLANDS` et listes de missions), ports et commerce,
météo : vent (vitesse selon l'allure), brouillard (portée de détection), tempêtes (houle plus
forte dans `waves.ts`), cycle jour/nuit (palette d'`environment.ts`).

### Phase 4 — Avancé

Conquête (le fort devient une entité à canons dans `world.ts`), boss à phases, abordage
(résolution quand coque/canons ennemis < seuil), flotte alliée (navires `team: "joueur"` pilotés
par l'IA existante), réputation et chasseurs de primes.

### Phase 5 — Finitions

Refonte graphique complète, sons, optimisation sur appareils réels, équilibrage, régression.

## 6. Vérification

- `npm test` inclut `src/features/naval/sim/naval-sim.test.ts` (39 tests : repère, batteries,
  zones, munitions, incendie, réparation, chaque tactique IA, esquive des bombes, vagues,
  objectifs, parties complètes au pilote automatique, déterminisme, sauvegarde, économie).
- Tests navigateur (Playwright, 390×844 tactile) : missions jouées de bout en bout via le
  gouvernail et le bouton TIRER ; chaque bouton vérifié (achat, munitions, voilure, cible,
  pause, réparation, abandon, paysage).
- Non vérifié : performances sur un vrai smartphone (rendu testé en logiciel uniquement).
