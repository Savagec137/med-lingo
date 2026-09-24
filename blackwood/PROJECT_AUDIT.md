# PROJECT_AUDIT — Blackwood Hospital

Audit réalisé le 23/09/2026, avant toute nouvelle modification, conformément à la section 3 du cahier des
charges (« Première action obligatoire »). Rien n'a été supprimé.

- Dépôt : `savagec137/med-lingo`, branche `claude/blackwood-horror-game-9whl83`
- Version auditée : commit `9654bf2` (dernière version publiée) + travail en cours non commité (hôpital)
- Le jeu vit dans `blackwood/`. La racine du dépôt contient l'application MedLingo (Lovable, React) :
  hors périmètre, non modifiée.

> **Mise à jour du 23/09/2026 (après l'audit)** — Blackwood Hospital est maintenant commité et jouable :
> les 9 niveaux construits compilent, la campagne complète se termine depuis le menu principal
> (robot `tests/autoplay.gd` : 0 erreur, 0 mort, fin + retour au menu), les 21 sauvegardes automatiques
> se rechargent sans anomalie (`tests/checkpoints.gd`), les 230 objets interactifs sont accessibles
> (`tests/interact_audit.gd`) et les 17 contrôles de navigation passent (`tests/level_tour.tscn`).
> L'ancien niveau (centre de recherche) et le correctif provisoire `wip/` ont été retirés, puisque
> remplacés. Le verdict ci-dessous décrit l'état **au moment de l'audit**. Unreal Engine reste
> inaccessible depuis cet environnement (nouvelle vérification faite à la demande : aucun binaire,
> aucun connecteur, aucune session ouverte sur la machine de l'utilisateur).

> **Mise à jour — coopération (23/09/2026)** — Les étapes 2 à 10 du §9 sont faites : état de jeu
> séparé (`PlayerData` par joueur, monde commun), session ENet (`scripts/net/net.gd`), échanges
> hôte/invité avec serveur autoritaire (`scripts/net/coop.gd`), mise en scène partagée
> (`scripts/net/stage.gd`), menus CO-OP, à terre / réanimation / GAME OVER, sauvegarde par l'hôte,
> déconnexion et reconnexion. Vérifié par `tests/coop_test.gd` (hôte + invité + intrus en processus
> séparés, 119 vérifications, 0 échec, 0 erreur de script, y compris à travers un relais à 90 ms ± 25 ms et 1 % de
> pertes). La campagne solo reste vérifiée de bout en bout. Architecture prête pour un serveur
> dédié (`Net.host(port, false)`) mais le jeu sans joueur local n'est pas encore branché.

> **Mise à jour — manette et visuels (24/09/2026)** — Jeu et menus jouables à la manette (Xbox,
> PlayStation, Nintendo ; libellés des boutons adaptés, vibrations, pause si débranchée), vérifiés
> par `tests/gamepad.gd` (35 vérifications). Accessoires reconstruits à partir de primitives plus
> fines (boîtes chanfreinées, tores, tours, profils extrudés) et instanciés (MultiMesh) : fauteuils
> roulants, sièges de bureau, ambulances, voitures, brancards, lits, arbres… La limite signalée au
> §6 (« formes simples ») est donc réduite pour le mobilier et les véhicules ; les personnages (hors
> infectés) restent construits en code. Taches « camouflage » des sols et murs supprimées (shader
> et texture de plâtre), pluie et reflets des objets corrigés. Studio de rendu `tests/prop_studio.tscn`
> et captures en jeu `--test=visual_check` pour juger les modèles.

---

## 0. Verdict

1. **Il n'existe aucun projet Unreal Engine** : aucun fichier `.uproject`, aucun dossier `Source/`,
   aucun binaire Unreal sur la machine. Le jeu existant est un projet **Godot 4.7.2 (GDScript)**,
   jouable de bout en bout.
2. **Unreal Engine 5 ne peut pas être installé, compilé ni lancé dans cet environnement** (détails au §1) :
   pas de GPU, pas de compte Epic Games, 30 Go de disque libres pour un moteur qui en demande 100 à 200.
   Tout code UE5 écrit ici ne pourrait être ni compilé ni testé, ce qui irait contre les règles 37
   (« compiler, lancer, tester ») et 40 (« pas de fausses fonctionnalités ») du cahier des charges.
3. La version publiée (`9654bf2`) **compile sans erreur et se termine de bout en bout** : vérifié
   aujourd'hui par les robots de test (voir §4).
4. Le passage à **Blackwood Hospital** (tour de 12 étages, nouvelle histoire, nouveaux monstres) est
   **en cours et pas encore jouable** : 52 fichiers modifiés ou créés, pas encore commités.
5. **Aucune coopération en ligne n'existe.** L'architecture actuelle est mono-joueur (un seul état de jeu
   global) : la coop demande une refactorisation (§8).

---

## 1. Environnement d'exécution (vérifié)

| Élément | Constat |
| --- | --- |
| Système | Ubuntu 24.04.4 LTS, conteneur cloud |
| Processeur | 4 cœurs virtuels |
| Mémoire | 15 Go |
| Disque libre | 30 Go |
| GPU | **aucun** (rendu logiciel llvmpipe via écran virtuel, 2 à 4 images/s) |
| Unreal Engine | **absent** (recherche de `*.uproject`, `UnrealEditor*`, `*unreal*` : aucun résultat) |
| Godot | 4.7.2 stable officiel (`/home/user/tools/godot`) |
| Accès GitHub | limité au dépôt `savagec137/med-lingo` |

### Pourquoi UE5 est impossible ici

- **Accès** : le moteur exige un compte Epic Games (contrat de licence). Les binaires Linux sont derrière
  une connexion Epic ; les sources sont dans un dépôt GitHub privé qui exige de lier un compte Epic à
  GitHub. Ni l'un ni l'autre n'est disponible dans cette session.
- **Taille et compilation** : un moteur compilé depuis les sources occupe de 100 à 200 Go et demande
  plusieurs heures de compilation avec 32 à 64 Go de mémoire recommandés. Ici : 30 Go, 15 Go, 4 cœurs.
- **Rendu** : l'éditeur UE5 exige un GPU DirectX 12 / Vulkan (SM5, SM6 pour Nanite et Lumen). Sans GPU,
  impossible d'ouvrir l'éditeur, de lancer le jeu ou d'en mesurer les performances.

Les points 2 à 15 de la section 3 du cahier des charges (version d'Unreal, Nanite, Lumen, Enhanced Input,
Niagara…) sont donc sans objet pour Unreal ; ils sont audités ci-dessous pour le projet Godot existant,
avec l'équivalent Godot de chaque système.

---

## 2. Structure du projet

```
blackwood/
  project.godot        configuration (Forward+, autoloads, couches physiques)
  scenes/              main.tscn (point d'entrée)
  scripts/core/        Settings, GameState, Audio, InputSetup (autoloads)
  scripts/game/        Game (partie), EventDirector (scénario), ZoneManager, NavGrid (IA), FX
  scripts/level/       Facility (niveau), Geo (géométrie fusionnée), Props, lumières
  scripts/level/hospital/   [en cours] la tour Blackwood Hospital, un fichier par étage
  player/              Player, caméra, lampe torche, armes, vue 1re personne, rig humanoïde
  enemies/             Enemy (IA), Hollow (infectés), Surgeon, SkinnedBody ; [en cours] Veilleur, Néonatal, Colossus
  items/               portes, objets, documents, claviers à code, coffres, mécanismes, sauvegarde…
  ui/                  menus, HUD, inventaire, options, documents, ascenseurs, écrans de mort/fin
  data/                WeaponDB, ItemDB, DocumentDB, Objectives (données de jeu)
  save/                SaveSystem (3 emplacements + automatique, JSON)
  materials/           shaders (PBR triplanaire, peau, sang, liquides…) et bibliothèque de matériaux
  assets/              textures PBR, modèle 3D riggé, polices
  audio/               134 sons OGG
  tests/               robots de test (campagne complète, menus, sauvegardes, armes, interactions…)
  tools/               générateurs (sons par synthèse, texture de plafond)
```

~19 000 lignes de GDScript. Aucun plugin ni addon tiers.

---

## 3. Moteur et configuration

| Système demandé (UE5) | Équivalent présent dans le projet Godot |
| --- | --- |
| Version moteur | Godot 4.7.2 stable, rendu Forward+ (Vulkan) |
| Nanite | sans équivalent ; géométrie statique fusionnée par matériau (quelques dizaines d'appels de dessin par zone) |
| Lumen | sans équivalent ; lumières dynamiques, ombres, SSAO, SSIL, SSR, brouillard volumétrique, réglables |
| Enhanced Input | InputMap configuré en code (`scripts/core/input_setup.gd`), clavier/souris |
| Niagara | particules `CPUParticles3D` (pluie, sang, étincelles, poussière, éclairs de bouche) |
| Navigation | grille A* maison par étage (`scripts/game/nav_grid.gd`), portes intégrées |
| Sauvegarde | `save/save_system.gd` : 3 emplacements + 1 automatique, JSON |
| Autoloads | Settings, GameState, Audio, SaveSystem |
| Couches physiques | world, player, enemies, hitboxes, doors, triggers |

---

## 4. Vérifications effectuées aujourd'hui

Sur une copie propre du commit `9654bf2` :

| Vérification | Résultat |
| --- | --- |
| Importation / compilation Godot | OK, 0 erreur |
| `--test=ui_flows` (menus, pause, options, mort, RETRY, sauvegarde, chargement) | **OK**, tous les contrôles passent |
| `--autoplay` (robot qui joue toute la campagne, du menu au générique puis retour menu) | **OK** : chapitre terminé en 7 min 52 de jeu, 9/9 documents, 7 créatures abattues, 0 mort, retour au menu |
| Autres robots (sauvegardes auto, 84 interactions atteignables, 5 armes) | OK lors de la session précédente, non relancés aujourd'hui |
| Performances | **non mesurables ici** (pas de GPU) ; compteur F3 intégré pour mesurer sur un vrai PC |

Travail en cours (non commité) : importation avec erreurs attendues — classes `SarahBoss` et
`PatientZero` pas encore écrites, directeur d'événements pas encore réécrit pour la nouvelle histoire.
Il est conservé tel quel ; il sera commité une fois compilable et testé.

---

## 5. Systèmes existants — état réel

Légende : ✅ fonctionnel et testé · 🟡 partiel · 🔧 écrit mais pas encore testable (travail en cours) · ❌ absent

| Exigence du cahier des charges | État | Détail |
| --- | --- | --- |
| Personnage à la 3e personne (+ vue 1re personne, touche V) | ✅ | déplacement, course, esquive, visée, mort |
| Caméra épaule, visée zoomée, collision, tremblements | ✅ | bras ressort avec collision, position visée, secousses tirs/événements |
| Contrôles WASD / Maj / E / F / Tab / clic / R / Échap | ✅ | + 1 à 5 armes, molette, H soin rapide, F3 performances |
| Lampe torche (vraie lumière, ombres, batterie, piles) | ✅ | portée/intensité réglables ; batterie continue avec scintillement sous 20 % |
| Paliers de batterie 100/75/50/25/10/0 | 🟡 | jauge continue, pas de paliers distincts |
| Interaction | ✅ | invite contextuelle, portée, visée |
| Inventaire 6 emplacements | ✅ | réel (empilement, utilisation, soins) ; 🔧 porte-clés séparé pour les clés |
| Portes : normale, verrouillée, clé, carte, fusible, événement | ✅ | + 🔧 portes automatiques, clavier à code |
| 5 armes exactement (matraque, pistolet 12, fusil à pompe, PM, magnum) | ✅ | munitions limitées, rechargement, recul |
| IA : IDLE, PATROL, INVESTIGATE, CHASE, ATTACK, SEARCH, RETURN, DEAD | ✅ | ouïe (pas, tirs, portes), vue (angle, lampe), proximité |
| IA : STAGGER, FLEE | 🟡 | titubement géré par minuterie ; fuite 🔧 (Néonatal) |
| Patient infecté, agent contaminé, Chirurgien | ✅ | modèle réaliste riggé (Higgsfield) |
| Infirmier contaminé, patient neurologique, patient expérimental | 🔧 | variantes écrites |
| Le Veilleur, le Néonatal, le Colossus | 🔧 | écrits, pas encore testés |
| Sarah (boss), Patient Zéro | ❌ | à écrire |
| Énigmes (≥ 3) | ✅ | version publiée : coffre à symboles, fusible, disjoncteurs ; 🔧 hôpital : démarrage du groupe électrogène, code de l'escalier B, coffre du Dr Vance |
| Documents d'histoire | ✅ | 9 dans la version publiée ; 🔧 22 pour Blackwood Hospital |
| Sauvegarde 3 emplacements + auto | ✅ | position, santé, inventaire, munitions, progression, portes, objets, créatures mortes ; chargement testé |
| Menu principal et pause | ✅ | CONTINUE ouvre la liste des sauvegardes (tient lieu de LOAD GAME) |
| Menu CO-OP (HOST / JOIN / BACK) | ❌ | |
| HUD minimaliste (santé, arme, munitions, interaction, lampe) | ✅ | pas de minicarte |
| Audio (pas, portes, néons, alarmes, grognements, tirs…) | ✅ | 134 sons originaux ; silence et ambiances par zone ; pas de musique permanente |
| Événements d'horreur scriptés | ✅ / 🔧 | version publiée : une dizaine ; hôpital en cours |
| Hôpital 12 étages (-2 à 12), ascenseurs, escaliers, zones bloquées | 🔧 | 9 niveaux construits en code, 3 cages d'escalier, 3 ascenseurs à accès contrôlé |
| Affichage par étage (équivalent du streaming) | 🔧 | seuls l'étage du joueur et ses voisins sont affichés ; lumières actives par distance |
| Données de jeu séparées du code | ✅ | armes, objets, documents, objectifs |
| Mode DEBUG (God Mode, GiveAmmo, Teleport, SpawnEnemy, KillAll…) | 🟡 | seul le compteur F3 existe ; commandes absentes |
| Coop en ligne 2 joueurs | ❌ | voir §8 |

---

## 6. Assets présents

| Type | Quantité | Origine | Licence |
| --- | --- | --- | --- |
| Textures PBR 1K (albédo, normale, ORM) | 26 jeux (25 depuis le 24/09 : plâtre écaillé retiré) | Poly Haven | CC0 |
| Texture de plafond | 1 | générée par `tools/gen_textures.py` | originale |
| Modèle 3D humanoïde riggé | 1 (zombie) | généré avec **Higgsfield** (Tripo 3D + auto-rig) | conditions Higgsfield du compte utilisateur |
| Sons | 134 | synthèse par `tools/gen_audio.py` (aucun échantillon externe) | originaux |
| Polices | 4 | Google Fonts | SIL OFL 1.1 (3) · Apache 2.0 (1) |

Détail et attributions : `Documentation/ASSET_LICENSES.md`.

Le seul modèle réaliste (le zombie Higgsfield) sert de base à tous les infectés et monstres (échelle des os,
teintes, excroissances). **Tout le reste — bâtiment, mobilier, matériel médical, armes, Thomas, Sarah — est
construit en code à partir de formes simples** habillées de matériaux PBR. C'est aujourd'hui la principale
limite du réalisme visuel.

**Crédits Higgsfield : 0** (plan gratuit, vérifié aujourd'hui). Plus aucun modèle ne peut être généré sans
recharge.

---

## 7. Problèmes constatés

1. Unreal Engine 5 indisponible dans cet environnement (§1).
2. Réalisme limité par la géométrie procédurale (mobilier, armes, personnages principaux).
3. Crédits Higgsfield épuisés.
4. Hôpital en cours : ne compile pas encore (2 classes manquantes, scénario à réécrire).
5. 9 sons d'armes récents n'avaient jamais été importés : ils étaient muets dans la version publiée
   (corrigé par l'importation d'aujourd'hui, à commiter).
6. Un plantage rare dans un thread du moteur (1 exécution sur 25) a été observé lors d'une session
   précédente, jamais reproduit depuis.
7. Performances réelles inconnues (aucun GPU pour mesurer).
8. Architecture mono-joueur : un seul état global (santé, inventaire, drapeaux), les créatures ne visent
   qu'un joueur, événements et sauvegardes locaux. Incompatible avec la coop sans refactorisation.
9. Aucune commande de débogage.

---

## 8. Architecture recommandée

### Option A — rester sur Godot 4.7 (recommandée dans cet environnement)

- Tout se compile, se lance et se teste ici ; le jeu s'exporte directement en exécutable Windows / Linux.
- Godot fournit un vrai multijoueur réseau (ENet/UDP, RPC, synchronisation d'état, apparition
  répliquée). Les concepts d'Unreal demandés se transposent :

| Unreal | Blackwood (Godot) | Rôle |
| --- | --- | --- |
| GameMode | `Server` (hôte uniquement) | valide toutes les actions critiques : dégâts, ramassages, portes, énigmes, événements, sauvegarde |
| GameState | `WorldState` répliqué | progression, portes, objets partagés, énigmes, créatures mortes |
| PlayerState | `PlayerData` (un par joueur) | PV, état (vivant / à terre / mort), inventaire 6 cases, armes, munitions, batterie |
| Character | `Player` + synchroniseur | déplacement prédit par son propriétaire, contrôlé par le serveur |
| AI Controller | IA exécutée sur le serveur | cible choisie parmi les joueurs (distance, bruit, dégâts reçus) ; état et position répliqués et interpolés |
| RPC serveur | demandes client → serveur | « interagir », « tirer », « recharger », « réanimer » : le serveur vérifie puis diffuse |

- Objets **PERSONAL** (munitions, soins, piles, armes) → inventaire du joueur qui les ramasse ;
  **WORLD_SHARED** (clés, cartes, fusibles, objets d'énigme) → porte-clés commun synchronisé.
- État **À TERRE** 30 s, réanimation « [E] RÉANIMER » à 25 PV, GAME OVER si les deux tombent.
- Sessions : HOST (serveur d'écoute), JOIN par adresse IP, recherche sur le réseau local, écrans
  CONNEXION… / ÉCHEC DE CONNEXION, départ du 2e joueur sans plantage, retour possible.
- Tests : deux instances réelles du jeu (hôte + client) pilotées par des robots, puis serveur + 2 clients,
  puis latence simulée.
- Solo et coop partagent le même code (nombre de joueurs = 1 ou 2).

### Option B — Unreal Engine 5, sur ta propre machine

- Pré-requis : PC Windows avec GPU DirectX 12 récent, compte Epic Games, UE 5.x, Visual Studio 2022,
  environ 150 Go.
- Réutilisable tel quel : textures Poly Haven, modèle Higgsfield (GLB/FBX), sons, histoire, documents,
  conception des niveaux et de l'IA.
- À refaire entièrement : tout le code (C++/Blueprints) et toute la géométrie de l'hôpital (kits modulaires
  Fab / Quixel, sous licence vérifiée).
- Je ne pourrais ni compiler ni tester ce projet depuis cet environnement : chaque étape devrait être
  vérifiée de ton côté.

---

## 9. Prochaines étapes (option A)

1. Terminer Blackwood Hospital : Sarah et Patient Zéro, scénario complet (actes 1 à 3, fuite, fin),
   robot de test de toute la campagne → commit.
2. Refactoriser l'état de jeu : `WorldState` (commun) / `PlayerData` (par joueur), serveur autoritaire.
3. Connexion, apparition des deux joueurs, synchronisation des déplacements et des animations.
4. Interactions, portes, objets, inventaires en réseau.
5. Combat, créatures et IA multi-cibles en réseau ; tir ami désactivé (`friendly_fire`).
6. État à terre et réanimation ; écran « PLAYER 2 IS DOWN » ; GAME OVER.
7. Énigmes, événements scriptés et boss synchronisés (déclenchés une seule fois, par le serveur).
8. Sauvegarde par l'hôte, déconnexion et reconnexion.
9. Mode DEBUG : God Mode, munitions, armes, téléportation, créatures, IA, éclairage.
10. Exécutables Windows et Linux ; tests automatisés solo + coop (2 instances) + latence.
