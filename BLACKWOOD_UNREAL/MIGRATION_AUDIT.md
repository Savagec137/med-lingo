# MIGRATION_AUDIT — Blackwood Hospital : Godot 4.7 → Unreal Engine 5

| | |
| --- | --- |
| Date | 24/09/2026 |
| Projet de référence | `blackwood/` (Godot 4.7.2), commit `f337dab` de la branche `claude/blackwood-horror-game-9whl83` |
| Projet cible | `BLACKWOOD_UNREAL/` (Unreal Engine 5 ; documentation de la version 5.8 en ligne à cette date) |
| Nature de ce document | Audit **en lecture seule** : aucun fichier du projet Godot n'a été modifié. Toutes les valeurs ci-dessous ont été relevées dans le code ou mesurées en exécutant le jeu (inventaire du niveau généré, tests). |
| Documents liés | `MIGRATION_MATRIX.md` (correspondance Godot → Unreal, état), `ASSET_INVENTORY.md` (467 assets avec licence et destination) |

---

## 0. Résumé

**Le jeu.** Survival horror à la 3e personne (1re personne en option), chapitre 1 complet « Le Message » : Thomas Reed
entre de nuit au CHU Blackwood pour retrouver sa sœur Sarah, infirmière. Un seul niveau continu : un hôpital de 12 étages
dont **9 niveaux sont construits et jouables** (-2, -1, 0, 1, 3, 6, 8, 11, 12), plus l'extérieur. Trois actes, 22 documents,
5 armes, 11 profils d'ennemis (5 variantes d'infectés, 3 monstres, 3 boss), 6 points de sauvegarde + sauvegarde automatique, fin jouable (autodestruction et fuite).
Coopération à 2 joueurs en réseau local (hôte autoritaire), manette complète, 3 niveaux de difficulté.

**Le point décisif pour la migration : presque tout est généré par le code.** Le projet Godot ne contient qu'**une seule scène**
de jeu (`scenes/main.tscn`, un simple nœud racine) : le bâtiment, le mobilier, les armes, les objets, les personnages principaux,
les matériaux, l'interface et les animations sont tous construits à l'exécution par les scripts GDScript. Il n'y a :

- aucune scène de niveau à convertir (pas de `.tscn` d'étage),
- aucun clip d'animation (animations procédurales),
- aucun fichier de matériau (`.tres`),
- aucune image d'interface.

Conséquence : **aucun convertisseur automatique de scènes Godot → Unreal ne peut fonctionner ici.** La migration passe par :
1. l'**import direct** des rares fichiers d'assets (textures, sons, polices, modèle zombie) ;
2. l'**extraction par script** de ce que le code produit (tables de données, disposition du niveau, géométrie, paramètres des matériaux, textes) ;
3. la **reconstruction** de tous les comportements avec les systèmes Unreal (C++ réplicable + Blueprints + UMG + Behavior Trees + Niagara…).

**Chiffres clés**

| Élément | Quantité |
| --- | ---: |
| Scripts GDScript | 113 (27 294 lignes), dont 97 de jeu (22 103 lignes) et 16 de test (5 191 lignes) |
| Classes nommées (`class_name`) | 90 dans le jeu + 1 dans les tests |
| Singletons (autoloads) | 6 |
| Scènes `.tscn` | 1 de jeu + 6 de test |
| Shaders | 11 |
| Textures | 26 jeux PBR 1K (albédo / normale OpenGL / ORM) + 3 textures 2K du zombie |
| Modèles 3D fichiers | 1 (zombie riggé, glTF) |
| Sons | 153 (Ogg Vorbis, tous synthétisés) dont 3 musiques et 12 ambiances |
| Polices | 4 (SIL OFL 1.1 ×3, Apache 2.0 ×1) |
| Niveau généré | 9 étages, 77 zones, 72 portes, 230 objets interactifs, 32 ennemis, 23 déclencheurs, 34 repères, 213 lumières, 28 cadavres, 243 panneaux |
| Rendu du niveau | 818 707 sommets fusionnés, 2 994 maillages, 142 MultiMesh (37 modèles d'accessoires instanciés), 1 859 obstacles de navigation |

**Contrainte d'environnement.** Unreal Engine 5 n'est pas installé dans l'environnement où cet audit a été réalisé (conteneur Linux
sans GPU). Tout ce qui demande l'éditeur Unreal (compilation, import, lancement, tests en jeu) doit être exécuté sur le PC de
l'utilisateur, où Unreal Engine est installé. La section 17 détaille la chaîne prévue pour que chaque étape reste vérifiable.

---

## 1. Architecture

### 1.1 Démarrage et boucle de jeu

```
scenes/main.tscn ──► Main (scripts/main.gd)
                      ├─ UIRoot (ui/ui_root.gd, CanvasLayer)  … pile d'écrans, HUD, messages, sous-titres, fondus
                      ├─ MenuBackdrop (décor 3D du menu principal)
                      └─ Game (scripts/game/game.gd, Node3D)   … créé à « Nouvelle partie », « Charger », « Coop »
                          ├─ Facility (scripts/level/facility.gd) … le niveau : zones, portes, déclencheurs, repères,
                          │    │                                    ennemis, lumières, grilles de navigation
                          │    └─ HospitalLevel + HExterior + HFloorB2…HFloor12 (construction étage par étage)
                          │         └─ Geo / Props / HProps / HKit (géométrie fusionnée, accessoires instanciés)
                          ├─ Player ×1 ou ×2 (player/player.gd) … + PlayerCamera, Flashlight, Weapons, ViewModel
                          ├─ Enemy ×32 (enemies/*.gd)          … Hollow, Veilleur, Néonatal, Colossus, Chirurgien, Sarah, Patient Zéro
                          ├─ EventDirector (scénario, drapeaux, cinématiques, compte à rebours)
                          ├─ ZoneManager (ambiance, réverbération, surface des pas, lumières par étage)
                          ├─ WorldEnvironment, ciel, brouillard volumétrique, pluie, lune
                          └─ Coop (scripts/net/coop.gd)        … seulement en partie réseau
```

### 1.2 Singletons (autoloads)

| Autoload | Script | Rôle | Équivalent Unreal prévu |
| --- | --- | --- | --- |
| `Settings` | `scripts/core/settings.gd` | 33 réglages (graphismes, affichage, audio, contrôles, jeu), fichier `user://settings.cfg`, multiplicateurs de difficulté | `UBWSettingsSubsystem` (GameInstanceSubsystem) + `UGameUserSettings` dérivé |
| `GameState` | `scripts/core/game_state.gd` | État du monde (drapeaux, porte-clés, documents, portes, objets pris, ennemis morts, zone, temps de jeu) + données par joueur (`PlayerData`), 10 signaux | `ABWGameState` (monde, répliqué) + `ABWPlayerState` (par joueur, répliqué) |
| `Audio` | `scripts/core/audio_manager.gd` | Bus Music/SFX/Ambience/UI, sons 2D/3D (pool de 40), boucles avec fondus, variantes aléatoires, 6 préréglages de réverbération, étouffement | Sound Classes + Sound Mix + Audio Volumes (réverb) + `UBWAudioSubsystem` |
| `Pad` | `scripts/core/gamepad.gd` | Détection manette/clavier, libellés Xbox/PlayStation/Nintendo, navigation des menus au stick, vibrations, pause à la déconnexion | Enhanced Input + CommonInput (icônes par plateforme) + Force Feedback |
| `SaveSystem` | `save/save_system.gd` | Sauvegardes JSON : `autosave.json` + 3 emplacements | `UBWSaveGame` (USaveGame) + `UBWSaveSubsystem` |
| `Net` | `scripts/net/net.gd` | Session ENet (port 24890), recherche LAN UDP (24891), 2 joueurs max, attribution des places | Réplication native + Online Subsystem Null (LAN) + `UBWSessionSubsystem` |

### 1.3 Principes d'architecture déjà présents (à conserver)

- **État séparé monde / joueur** (`GameState` + `PlayerData`) : se transpose directement en `GameState` / `PlayerState`.
- **Hôte autoritaire** : en coop, le scénario, l'IA, les dégâts, les ramassages et les portes sont décidés par l'hôte ;
  l'invité envoie des requêtes (`rq_*`) et reçoit des événements (`ev_*`) et des états (`st_*`).
- **Drapeaux de progression** : chaque événement pose un drapeau et ne se rejoue jamais ; l'état du monde est reconstruit
  au chargement à partir des drapeaux (`EventDirector.apply_world_state`). Même principe dans Unreal.
- **Identifiants stables** : chaque porte (`door_id`), objet (`pickup_id`), ennemi (identifiant de spawn), déclencheur et
  repère a un identifiant texte unique — base de la sauvegarde et de la réplication. Ces identifiants sont conservés tels quels.

### 1.4 Configuration du projet Godot

- Rendu **Forward+**, fenêtre 1280×720 étirée (`canvas_items`, `expand`), SSAA d'écran FXAA, filtrage anisotrope ×4.
- Ombres : directionnelle 2048, atlas positionnel 4096 ; brouillard volumétrique 64×64×64.
- Physique : 60 pas/s (8 max par image), moteur par défaut de Godot 4.7.
- Couches physiques : 1 `world`, 2 `player`, 3 `enemies`, 4 `hitboxes`, 5 `doors`, 6 `triggers`
  → canaux de collision Unreal (voir `MIGRATION_MATRIX.md` §2).
- Exports : Windows et Linux, PCK intégré, textures S3TC/BPTC.

---

## 2. Scènes

| Scène | Contenu | Migration |
| --- | --- | --- |
| `scenes/main.tscn` | Un nœud `Main` + script. Tout le reste est créé par le code. | Map de menu `L_MainMenu` + map de jeu `L_BlackwoodHospital` |
| `tests/level_tour.tscn` | Visite automatique de toutes les zones (navigation, chutes, blocages) | Test fonctionnel Unreal (Functional Test) |
| `tests/interact_audit.tscn` | Vérifie les 230 objets interactifs (portée, hauteur, accessibilité) | Test d'automatisation Unreal |
| `tests/weapons_range.tscn` | Stand de tir (dégâts, dispersion, cadence) | Map de test `L_Test_Weapons` |
| `tests/creature_gallery.tscn` | Galerie des 9 créatures | Map de test `L_Test_Creatures` |
| `tests/prop_studio.tscn` | Rendus avant/après des accessoires | Map de test `L_Test_Props` |
| `tests/sandbox.tscn` | Bac à sable | Map de test `L_Test_Sandbox` |

**Le niveau n'existe pas sous forme de scène** : il est reconstruit à chaque lancement (≈ 1,2 s) par `Facility` et les scripts
d'étage. Pour l'auditer, le niveau a été généré puis inventorié par un outil externe (copie isolée du projet, aucun fichier
d'origine modifié). Résultat par étage :

| Niveau | Altitude (m) | Zones | Portes | Objets à ramasser | Documents | Points d'examen | Autres interactions | Ennemis | Déclencheurs | Lumières | Cadavres |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Sous-sol -2 (technique, parking, morgue) | -8 | 7 | 5 | 8 | 2 | 5 | 6 | 2 | 2 | 25 | 2 |
| Sous-sol -1 (urgences, quai des ambulances) | -4 | 7 | 6 | 6 | 1 | 6 | 3 | 4 | 4 | 22 | 2 |
| Rez-de-chaussée (hall, accueil, sécurité, pharmacie, cafétéria) | 0 | 9 | 7 | 10 | 3 | 4 | 3 | 5 | 2 | 20 | 3 |
| 1er (radiologie, consultations, archives) | 4 | 10 | 8 | 8 | 2 | 3 | 2 | 5 | 2 | 20 | 1 |
| 3e (neurologie, bloc opératoire) | 12 | 13 | 10 | 10 | 2 | 4 | 3 | 5 | 1 | 21 | 2 |
| 6e (confinement biologique, cellule de crise) | 24 | 12 | 9 | 11 | 3 | 4 | 3 | 5 | 3 | 21 | 1 |
| 8e (laboratoire expérimental, bureau Vance) | 32 | 7 | 7 | 6 | 1 | 5 | 5 | 4 | 3 | 20 | 9 |
| 11e (direction, centre de contrôle) | 44 | 4 | 3 | 6 | 2 | 0 | 3 | 1 | 2 | 16 | 0 |
| 12e (laboratoire principal, cellule du Patient Zéro) | 48 | 4 | 1 | 4 | 2 | 5 | 2 | 1 | 1 | 14 | 8 |
| Extérieur (parking, rampe, rue) + enveloppe du bâtiment | — | 1 | 1 | 0 | 0 | 5 | 0 | 0 | 2 | 19 | 0 |
| Escaliers A, B, C (toutes hauteurs) | — | 3 | 15 | 0 | 0 | 0 | 0 | 0 | 1 | 15 | 0 |
| **Total** | | **77** | **72** | **69** | **18** | **41** | **30** | **32** | **23** | **213** | **28** |

Zones (77) :

| Étage | Zones (identifiant — nom affiché) |
| --- | --- |
| -2 | `b2_boiler` Chaufferie · `b2_corridor` Sous-sol -2 — Couloir technique · `b2_generator` Salle des groupes électrogènes · `b2_morgue` Morgue · `b2_parking` Parking souterrain · `b2_technical` Local technique · `b2_workshop` Atelier de maintenance |
| -1 | `b1_bay` Quai des ambulances · `b1_biolab` Laboratoire de biologie · `b1_boxes` Urgences — Box de soins · `b1_corridor` Urgences — Couloir de service · `b1_resus` Salle de déchocage · `b1_storage` Stockage médical · `b1_triage` Urgences — Accueil et tri |
| 0 | `f0_admissions` Admissions · `f0_cafeteria` Cafétéria · `f0_corridor` Rez-de-chaussée — Couloir principal · `f0_hall` Hall d'accueil · `f0_lockers` Vestiaires du personnel · `f0_lounge` Espace détente du personnel · `f0_pharmacy` Pharmacie · `f0_security` Poste de sécurité · `f0_waiting` Salle d'attente |
| 1 | `f1_care` Salle de soins · `f1_consult_a` Consultation 1 · `f1_consult_b` Consultation 2 · `f1_corridor` 1er étage — Couloir des consultations · `f1_mezzanine` Mezzanine · `f1_radiology` Radiologie — Accueil · `f1_records` Archives médicales · `f1_staff` Salle de pause du personnel · `f1_waiting` Salle d'attente — Consultations · `f1_xray` Salle de radiographie |
| 3 | `f3_corridor` Neurologie — 3e étage · `f3_dayroom` Salon des patients · `f3_nurses` Salle de repos des infirmières · `f3_or` Bloc de neurochirurgie · `f3_prep` Préparation — Bloc · `f3_room301` Chambre 301 · `f3_room302` Chambre 302 · `f3_room303` Chambre 303 · `f3_room304` Chambre 304 · `f3_room305` Chambre 305 · `f3_room306` Chambre 306 · `f3_security` Poste de sécurité — 3e · `f3_station` Poste de soins |
| 6 | `f6_airlock` Sas de décontamination · `f6_corridor` Maladies infectieuses — 6e étage · `f6_crisis` Cellule de crise · `f6_east` Palier — Escalier de service B · `f6_lab` Laboratoire d'analyses · `f6_monitor` Surveillance des patients · `f6_pharma` Réserve de médicaments · `f6_q601` Chambre d'isolement 601 · `f6_q602` Chambre d'isolement 602 · `f6_q603` Chambre d'isolement 603 · `f6_q604` Chambre d'isolement 604 · `f6_suits` Vestiaire de confinement |
| 8 | `f8_colossus` Cellule d'isolement C-7 · `f8_corridor` Laboratoire expérimental — 8e étage · `f8_exp` Salle d'expérimentation · `f8_lab` Salle des cuves · `f8_server` Salle des serveurs · `f8_vance` Bureau du Dr Vance · `f8_video` Bureau de recherche |
| 11 | `f11_board` Salle du conseil · `f11_control` Centre de contrôle · `f11_corridor` Direction — 11e étage · `f11_director` Bureau du directeur |
| 12 | `f12_cell` Cellule — Patient Zéro · `f12_core` Poste de commande · `f12_lab` Zone interdite — Laboratoire principal · `f12_ship` Quai d'expédition |
| — | `exterior` Blackwood Hospital · `stair_a` Escalier A · `stair_b` Escalier de service B · `stair_c` Escalier de secours C |

---

## 3. Scripts et classes

97 scripts de jeu. Rôle relevé dans l'en-tête de chaque script :

| Fichier | Classe | Hérite de | Lignes | Rôle (d'après l'en-tête du script) |
| --- | --- | --- | ---: | --- |
| `data/documents.gd` | DocumentDB | RefCounted | 341 | Les documents de Blackwood Hospital … |
| `data/items.gd` | ItemDB | RefCounted | 87 | Catalogue des objets … |
| `data/objectives.gd` | Objectives | RefCounted | 57 | Objectif courant déduit de la progression (drapeaux + inventaire). |
| `data/weapons.gd` | WeaponDB | RefCounted | 57 | Les cinq armes du jeu — aucune autre … |
| `enemies/boss_humanoid.gd` | BossHumanoid | Hollow | 203 | Base des boss humanoïdes (Sarah, Patient Zéro) : bond, cri qui interrompt Thomas (rechargement, soin), et moments de lucidité à des seuils de vie — … |
| `enemies/colossus.gd` | Colossus | Hollow | 150 | LE COLOSSUS — sujet 12 de la cellule C-7 … |
| `enemies/enemy.gd` | Enemy | CharacterBody3D | 811 | Créature : machine à états complète … |
| `enemies/hollow.gd` | Hollow | Enemy | 297 | Les infectés de Blackwood Hospital (Projet ECHO) |
| `enemies/neonatal.gd` | Neonatal | Hollow | 199 | LE NÉONATAL — petit, très rapide … |
| `enemies/patient_zero.gd` | PatientZero | BossHumanoid | 208 | LE PATIENT ZÉRO — Élias Brandt, le premier humain traité par ECHO … |
| `enemies/sarah_boss.gd` | SarahBoss | BossHumanoid | 212 | SARAH REED — infirmière en neurologie, infectée par ECHO en ouvrant les cellules du 8e … |
| `enemies/skinned_body.gd` | SkinnedBody | Node3D | 189 | Corps réaliste : modèle 3D riggé (généré avec Higgsfield : Tripo + auto-rig) animé par un HumanoidRig procédural invisible … |
| `enemies/surgeon.gd` | Surgeon | Enemy | 491 | LE CHIRURGIEN — ce qu'est devenu le Dr Markus Keller après s'être injecté la formule complète … |
| `enemies/veilleur.gd` | Veilleur | Hollow | 98 | LE VEILLEUR — maigre, des bras démesurés, presque aveugle … |
| `items/auto_door.gd` | AutoDoor | Node3D | 134 | Porte automatique coulissante vitrée (urgences, sas) : les deux vantaux s'écartent quand quelqu'un s'approche — joueur ou créature … |
| `items/breakable_glass.gd` | BreakableGlass | StaticBody3D | 90 | Vitre qui peut voler en éclats (événement scripté, balle) : panneau de verre avec sa propre collision, remplacé par des débris au sol. |
| `items/code_panel.gd` | CodePanel | Interactable | 77 | Clavier à code mural qui déverrouille une porte (escalier de service B…) |
| `items/document_pickup.gd` | DocumentPickup | Interactable | 42 | Document à lire … |
| `items/door.gd` | Door | Interactable | 402 | Porte animée … |
| `items/elevator_panel.gd` | ElevatorPanel | Interactable | 62 | Panneau d'appel d'ascenseur : ouvre la liste des étages desservis. |
| `items/event_point.gd` | EventPoint | Interactable | 28 | Point d'interaction scripté (vidéo à regarder, console, interphone…) : transmet l'action au directeur d'événements. |
| `items/examine_point.gd` | ExaminePoint | Interactable | 27 | Élément du décor qu'on peut examiner (symboles, photos, portes bloquées…) |
| `items/explosive_tank.gd` | ExplosiveTank | StaticBody3D | 115 | Bouteille d'oxygène médical : une balle suffit à la faire exploser … |
| `items/interactable.gd` | Interactable | Node3D | 50 | Base de tout ce qui réagit à la touche E : portes, objets, documents, mécanismes … |
| `items/item_models.gd` | ItemModels | RefCounted | 88 | Petits modèles 3D provisoires des objets (primitives) |
| `items/keypad_safe.gd` | KeypadSafe | Interactable | 128 | Coffre mural à code (bureau du Dr Vance…) |
| `items/locker_box.gd` | LockerBox | Interactable | 114 | Casier individuel fermé à clé (vestiaire) : la clé l'ouvre et révèle son contenu (documents, objets), qu'on ramasse ensuite un par un. |
| `items/mechanisms.gd` | Mechanism | Interactable | 99 | Mécanismes qui débloquent une porte à l'aide d'un objet : « fuse » : boîtier électrique (fusible) — porte des laboratoires … |
| `items/phone.gd` | Phone | Interactable | 72 | Téléphone fixe de l'accueil … |
| `items/pickup.gd` | Pickup | Interactable | 171 | Objet ramassable posé dans le monde, avec un léger scintillement pour qu'on le repère dans la pénombre. |
| `items/save_point.gd` | SavePoint | Interactable | 52 | Magnétophone : Thomas enregistre une note vocale (sauvegarde sur 3 emplacements). |
| `items/switch_panel.gd` | SwitchPanel | Interactable | 69 | Commande murale à levier (procédure de démarrage du groupe électrogène) |
| `materials/materials.gd` | Mats | RefCounted | 465 | Bibliothèque de matériaux procéduraux, créés à la demande et mis en cache … |
| `player/flashlight.gd` | Flashlight | Node3D | 235 | Lampe torche d'épaule : suit le regard de la caméra, projette des ombres, éclaire le brouillard volumétrique, consomme sa batterie et peut être … |
| `player/humanoid_rig.gd` | HumanoidRig | Node3D | 228 | Corps humanoïde procédural (primitives) avec articulations animables … |
| `player/player.gd` | Player | CharacterBody3D | 837 | Thomas Reed … |
| `player/player_camera.gd` | PlayerCamera | Node3D | 242 | Caméra du joueur, en troisième personne (épaule, amorti, contourne les murs avec un SpringArm3D, se rapproche en visée) ou en première personne (à hau … |
| `player/revive_spot.gd` | ReviveSpot | Interactable | 31 | Coop : point d'interaction porté par chaque joueur … |
| `player/view_model.gd` | ViewModel | Node3D | 180 | Bras et arme vus en première personne (calque de rendu 11, invisible en troisième personne) |
| `player/weapon_models.gd` | WeaponModels | RefCounted | 102 | Modèles des cinq armes, construits par code avec les matériaux PBR du jeu (métal brossé, polymère, bois) |
| `player/weapons.gd` | Weapons | Node3D | 540 | Les cinq armes de Thomas : arme équipée, tir (balle, plombs) et coups de matraque, chargeurs par arme, rechargement (cartouche par cartouche pour le … |
| `save/save_system.gd` | *(autoload)* | Node | 94 | Sauvegardes JSON dans user://saves … |
| `scripts/core/audio_manager.gd` | *(autoload)* | Node | 251 | Gestion audio : bus, sons ponctuels 2D/3D, boucles (ambiances, musique) avec fondus. |
| `scripts/core/debug_tools.gd` | DebugTools | RefCounted | 239 | Mode DEBUG : commandes de test (console F1) et état partagé (God Mode, IA figée, éclairage de travail) |
| `scripts/core/game_state.gd` | *(autoload)* | Node | 392 | État de la partie en cours … |
| `scripts/core/gamepad.gd` | *(autoload)* | Node | 190 | Manette (autoload « Pad ») : · retient si le joueur utilise la manette ou le clavier / la souris, pour … |
| `scripts/core/input_setup.gd` | InputSetup | RefCounted | 178 | Déclare les actions du jeu dans l'InputMap au démarrage. |
| `scripts/core/player_data.gd` | PlayerData | RefCounted | 214 | Données d'UN joueur : santé, inventaire (6 emplacements), armes et chargeurs, lampe torche, état « à terre » de la coopération. |
| `scripts/core/settings.gd` | *(autoload)* | Node | 184 | Réglages persistants (user://settings.cfg) : graphismes, affichage, audio, jeu (vue première / troisième personne, difficulté…). |
| `scripts/game/event_director.gd` | EventDirector | Node | 1039 | Scénario de Blackwood Hospital … |
| `scripts/game/fx.gd` | FX | RefCounted | 141 | Effets visuels ponctuels : impacts, étincelles, sang, poussière, impacts de balle … |
| `scripts/game/game.gd` | Game | Node3D | 555 | Racine d'une partie : construit Blackwood Hospital, place Thomas, fait apparaître les créatures selon la progression, gère les ascenseurs, la … |
| `scripts/game/menu_backdrop.gd` | MenuBackdrop | Node3D | 79 | Décor du menu principal : la tour de Blackwood Hospital sous la pluie, de nuit, filmée par une caméra qui dérive lentement … |
| `scripts/game/nav_grid.gd` | NavGrid | RefCounted | 239 | Grille de navigation d'un étage (A* sur cellules de 25 cm) |
| `scripts/game/trigger_zone.gd` | TriggerZone | Area3D | 53 | Volume invisible déclenchant un événement quand le joueur y entre … |
| `scripts/game/zone_manager.gd` | ZoneManager | Node | 81 | Suit la zone du joueur : ambiance sonore, réverbération, surface des pas, titre de zone à la première visite, lune/pluie, et n'allume que les lumières … |
| `scripts/level/facility.gd` | Facility | Node3D | 455 | Le niveau : l'hôpital Blackwood (voir scripts/level/hospital/) |
| `scripts/level/geo.gd` | Geo | RefCounted | 661 | Construction du décor statique … |
| `scripts/level/hospital/corpse.gd` | Corpse | Node3D | 91 | Cadavre figé : le modèle réaliste (Higgsfield) posé une fois pour toutes (sur le dos, face contre terre, adossé à un mur, recroquevillé). |
| `scripts/level/hospital/exterior.gd` | HExterior | RefCounted | 408 | Extérieur de Blackwood Hospital : la rue sous la pluie, le parking vide, le parvis et l'entrée principale enchaînée, la rampe des ambulances qui … |
| `scripts/level/hospital/floor_0.gd` | HFloor0 | RefCounted | 228 | Rez-de-chaussée — Hall d'accueil (double hauteur, mur-rideau sur le parvis), sécurité (matraque, vidéosurveillance, main courante), pharmacie (rideau … |
| `scripts/level/hospital/floor_1.gd` | HFloor1 | RefCounted | 196 | 1er étage — Consultations, radiologie, salles d'attente … |
| `scripts/level/hospital/floor_11.gd` | HFloor11 | RefCounted | 105 | 11e étage — Centre de contrôle … |
| `scripts/level/hospital/floor_12.gd` | HFloor12 | RefCounted | 131 | 12e étage — Zone interdite, laboratoire principal du Projet ECHO … |
| `scripts/level/hospital/floor_3.gd` | HFloor3 | RefCounted | 206 | 3e étage — Neurologie, chambres des patients … |
| `scripts/level/hospital/floor_6.gd` | HFloor6 | RefCounted | 201 | 6e étage — Maladies infectieuses … |
| `scripts/level/hospital/floor_8.gd` | HFloor8 | RefCounted | 189 | 8e étage — Laboratoire expérimental du Projet ECHO … |
| `scripts/level/hospital/floor_b1.gd` | HFloorB1 | RefCounted | 251 | Sous-sol -1 — Urgences souterraines, stockage médical, laboratoire de biologie … |
| `scripts/level/hospital/floor_b2.gd` | HFloorB2 | RefCounted | 190 | Sous-sol -2 — Parking souterrain, morgue, locaux techniques, groupes électrogènes … |
| `scripts/level/hospital/hospital_level.gd` | HospitalLevel | RefCounted | 157 | BLACKWOOD HOSPITAL — centre hospitalier universitaire de 12 étages … |
| `scripts/level/hospital/hprops.gd` | HProps | RefCounted | 299 | Accessoires propres à l'hôpital : cadavres, rideaux de box, comptoirs, négatoscopes, générateurs, baies informatiques, cuves, vaccins ECHO… |
| `scripts/level/hospital/kit.gd` | HKit | RefCounted | 363 | Boîte à outils de construction de l'hôpital Blackwood (tour de 12 étages). |
| `scripts/level/light_fixture.gd` | LightFixture | Node3D | 186 | Source lumineuse du décor, rattachée à une zone (activée/désactivée selon la position du joueur pour les performances) avec plusieurs comportements : |
| `scripts/level/props.gd` | Props | RefCounted | 1121 | Accessoires de décor construits en primitives et fusionnés par Geo … |
| `scripts/main.gd` | — | Node | 204 | Point d'entrée : menu principal ↔ partie, chargement, mort / RETRY, fin. |
| `scripts/net/coop.gd` | Coop | Node | 869 | Coopération en ligne à deux joueurs : nœud d'échanges (/root/Main/World/Game/Coop), présent sur les deux machines dès qu'une session réseau est ouvert … |
| `scripts/net/net.gd` | *(autoload)* | Node | 313 | Réseau de la coopération (autoload « Net ») : serveur d'écoute ENet (l'hôte est le joueur 1, le client le joueur 2), deux joueurs au maximum, … |
| `scripts/net/stage.gd` | Stage | RefCounted | 273 | Mise en scène du scénario : sons, musique, sous-titres, secousses, caméra de cinématique, barre de boss, fondus, effets du monde … |
| `ui/coop_menu.gd` | CoopMenu | UIScreen | 220 | CO-OP : HOST GAME / JOIN GAME / BACK … |
| `ui/death_screen.gd` | DeathScreen | UIScreen | 76 | Écran de mort : YOU DIED — RETRY / QUIT TO MENU … |
| `ui/debug_console.gd` | DebugConsole | UIScreen | 86 | Console du mode DEBUG (F1) : saisie de commandes (voir DebugTools) et raccourcis pour les plus courantes … |
| `ui/document_viewer.gd` | DocumentViewer | UIScreen | 85 | Lecture d'un document : feuille de papier, police machine à écrire ou manuscrite. |
| `ui/ecg_display.gd` | ECGDisplay | Control | 60 | Moniteur cardiaque stylisé : le tracé, sa couleur et son rythme reflètent l'état de santé (BON / ATTENTION / DANGER). |
| `ui/elevator_screen.gd` | ElevatorScreen | UIScreen | 84 | Choix de l'étage : toute la tour est listée (12 étages + 2 sous-sols) ; seuls les étages desservis par cet ascenseur sont sélectionnables, et … |
| `ui/ending_screen.gd` | EndingScreen | UIScreen | 61 | Fin du chapitre 1 : titre, bilan, promesse du chapitre 2. |
| `ui/hud.gd` | HUD | Control | 261 | Interface en jeu minimaliste : santé (ECG + PV), arme et munitions, batterie de la lampe, réticule en visée, invite d'interaction. |
| `ui/inventory_screen.gd` | InventoryScreen | UIScreen | 292 | Inventaire : 6 emplacements (objets) + onglet DOCUMENTS … |
| `ui/item_icon.gd` | ItemIcon | Control | 113 | Icône d'objet dessinée en vectoriel (aucune image requise). |
| `ui/keypad_screen.gd` | KeypadScreen | UIScreen | 240 | Clavier à code (coffres, portes) : le nombre de chiffres suit le code attendu … |
| `ui/main_menu.gd` | MainMenu | UIScreen | 113 | Menu principal : BLACKWOOD HOSPITAL — NEW GAME / CONTINUE / LOAD GAME / CO-OP / OPTIONS / QUIT (CONTINUE reprend la sauvegarde la plus récente, LOAD G … |
| `ui/options_menu.gd` | OptionsMenu | UIScreen | 316 | Options en onglets : GRAPHISMES · AFFICHAGE · AUDIO · JEU · COMMANDES … |
| `ui/pause_menu.gd` | PauseMenu | UIScreen | 90 | Pause : RESUME / INVENTORY / OPTIONS / QUIT TO MENU … |
| `ui/perf_overlay.gd` | PerfOverlay | Label | 49 | Compteur de performances (F3) : images par seconde, temps d'image, appels de dessin et objets affichés ; en mode DEBUG, aussi la position, la … |
| `ui/save_screen.gd` | SaveScreen | UIScreen | 83 | Sauvegarde (magnétophone) ou chargement : 3 emplacements manuels (+ la sauvegarde automatique en chargement). |
| `ui/screen.gd` | UIScreen | Control | 68 | Écran modal (menus, inventaire, documents…) |
| `ui/ui_root.gd` | UIRoot | CanvasLayer | 488 | Racine de l'interface : HUD, messages, sous-titres, titres de zone, fondus, bandes cinéma, barre du boss, post-traitement, et pile d'écrans modaux. |
| `ui/ui_theme.gd` | UITheme | RefCounted | 212 | Identité visuelle de l'interface : polices, couleurs, styles de boutons … |

Tests automatisés (16 scripts, 5 191 lignes) :

| Test | Lignes | Rôle |
| --- | ---: | --- |
| `tests/autoplay.gd` | 2098 | Test de bout en bout de BLACKWOOD HOSPITAL : joue le chapitre 1 complet avec de vraies entrées (actions clavier, rotation de caméra, touche E, tir, … |
| `tests/checkpoints.gd` | 117 | Recharge chaque sauvegarde automatique conservée par --autoplay (user://test_checkpoints) et vérifie que le monde est bien restauré : |
| `tests/coop_test.gd` | 1121 | Test de la coopération en réseau (vrais processus, vraie connexion ENet). |
| `tests/creature_gallery.gd` | 102 | Galerie des créatures : chaque variante est animée (marche, poursuite, attaque) sans IA, puis photographiée … |
| `tests/debug_mode.gd` | 277 | Test du mode DEBUG et épreuve des créatures … |
| `tests/debug_probe.gd` | 46 | Sonde de débogage : reprend un point de passage du robot et trace une créature … |
| `tests/gamepad.gd` | 295 | Test de la manette : tout se fait avec de vrais évènements de manette (boutons, sticks, gâchettes), comme un joueur. |
| `tests/interact_audit.gd` | 81 | Audit des objets interactifs : pour chacun, vérifie qu'il existe un endroit où le joueur peut se tenir (capsule libre, sol dessous) depuis lequel l'ob … |
| `tests/latency_proxy.gd` | 81 | Relais UDP qui simule un réseau lent entre l'invité et l'hôte (tests) : chaque paquet est retardé de « delay_ms » ± « jitter_ms », et une part … |
| `tests/level_tour.gd` | 172 | Visite caméra de l'hôpital : construit le niveau complet, vérifie quelques chemins de navigation, puis place une caméra (avec une lampe torche simulée … |
| `tests/prop_studio.gd` | 177 | Studio photo des accessoires : chaque accessoire (Props) est construit seul, sur un sol neutre, sous un éclairage de studio, et photographié sous deux … |
| `tests/sandbox.gd` | 105 | Scène bac à sable : une pièce de test pour valider le joueur, la caméra, la lampe torche, les matériaux et l'éclairage … |
| `tests/surgeon_probe.gd` | 48 | Sonde : le Chirurgien sort-il du bloc opératoire ? Reprend le point de passage « chirurgien », place Thomas dans le couloir, réveille le boss et … |
| `tests/ui_flows.gd` | 227 | Parcours des menus qu'un joueur utilise en dehors de la campagne : OPTIONS, NEW GAME, pause (RESUME / OPTIONS), inventaire, mort → YOU DIED → … |
| `tests/visual_check.gd` | 76 | Captures de contrôle visuel dans une vraie partie (pluie, reflets des objets à ramasser, applique de la rampe, ambulance du quai, accueil, rue) : déma … |
| `tests/weapons_range.gd` | 168 | Stand de tir : les cinq armes contre des infectés immobiles … |

Outils : `tools/gen_audio.py` (synthèse des 153 sons ; numpy, scipy, soundfile), `tools/gen_textures.py` (texture de faux plafond ; numpy, Pillow, scipy).

---

## 4. Systèmes

### 4.1 Personnage joueur — Thomas Reed (`player/player.gd`, 837 lignes)

- `CharacterBody3D`, déplacement relatif à la caméra : marche 2,3 m/s, course 4,7 m/s, visée 1,3 m/s ; accélération 9, décélération 11 ;
  gravité 22 m/s² ; rotation 10 rad/s ; foulées 0,8 m (marche) / 1,2 m (course) pour les pas.
- Esquive : 7 m/s pendant 0,4 s, recharge 0,9 s.
- Santé 100 PV, état « À TERRE » en coop (30 s, réanimation à 25 PV), mort, soin (spray +40 PV, soin rapide `H`).
- Deux vues : 3e personne (défaut) et 1re personne (`V`), corps masqué et arme au calque 11 en 1re personne.
- Bruit : pas, tirs et course émettent des signaux de bruit (`GameState.noise_emitted`) que les ennemis entendent.
- Modèle : squelette procédural `HumanoidRig` habillé de formes simples (pas de modèle réaliste pour Thomas).

### 4.2 Caméra (`player/player_camera.gd`)

- 3e personne à l'épaule avec `SpringArm3D` (contourne les murs), amortie, se rapproche en visée ; tangage -1,15 → 0,85 rad.
- Souris ×0,0022 ; stick droit 3,1 rad/s (lacet) et 1,9 rad/s (tangage) ; inversion Y ; sensibilités réglables.
- Tremblements (tirs, chocs, explosions) ; « focus » scripté vers un point d'intérêt (cinématiques légères).
- 1re personne : caméra à hauteur des yeux, `ViewModel` (bras + arme) dessiné au-dessus.

### 4.3 Lampe torche (`player/flashlight.gd`)

- Objet « outil » ramassé au quai des ambulances (-1). Touche `F` / croix haut.
- Batterie : 0,1 %/s (≈ 16 min), 6 paliers (100/75/50/25/10/0) qui réduisent la puissance ; clignotement quand elle faiblit ;
  piles (+ ramassage instantané). La lumière rend le joueur plus visible (portée de vision des ennemis 7 → 11 m).

### 4.4 Armes et combat (`player/weapons.gd`, `data/weapons.gd`)

| Arme | Type | Chargeur | Dégâts | × tête | Cadence (s) | Recharge (s) | Portée (m) | Bruit (m) | Particularités |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Matraque télescopique | mêlée | — | 30 | 1,5 | 0,72 | — | 1,75 (arc 70°) | 4 | silencieuse — **retirée de la conception Unreal (voir §15)** |
| Pistolet 9mm | balle | 12 | 26 | 2,6 | 0,32 | 1,7 | 60 | 26 | arme principale |
| Fusil à pompe | 9 plombs | 5 | 13 ×9 | 1,8 | 0,95 | 0,55 / cartouche | 22 | 38 | repousse l'ennemi, rechargement cartouche par cartouche |
| Pistolet-mitrailleur | balle, auto | 30 | 14 | 2,2 | 0,075 | 2,1 | 45 | 30 | dispersion croissante |
| Magnum .357 | balle | 6 | 120 | 2,0 | 0,85 | 2,6 | 80 | 45 | traverse les cibles |

Dispersion visée/hanche, recul, tremblement, « stagger » (fait vaciller l'ennemi), flash de bouche, douilles, impacts
(étincelles, poussière, sang, trous de balle), bruit qui attire les créatures. En coop, le tir de l'invité est envoyé à l'hôte avec
une graine de dispersion (`rq_fire`) : l'hôte rejoue exactement le même tir et fait foi.

### 4.5 Interaction (`items/interactable.gd` et dérivés)

Base `Interactable` : invite (« RAMASSER », « EXAMINER », « OUVRIR »…), rayon d'interaction, point de focus, clé réseau.
Le joueur choisit l'objet interactif le plus proche dans son champ ; `E` / bouton A.
Types : `Door`, `Pickup`, `DocumentPickup`, `ExaminePoint` (texte descriptif), `SavePoint`, `ElevatorPanel`, `CodePanel`,
`KeypadSafe`, `LockerBox`, `Mechanism` (fusible), `SwitchPanel` (disjoncteurs), `Phone`, `EventPoint`, `ReviveSpot` (coop).
Objets non interactifs mais scriptés : `AutoDoor` (portes coulissantes), `BreakableGlass`, `ExplosiveTank` (bouteilles d'O₂),
`Corpse` (cadavres posés), `LightFixture`.

### 4.6 Inventaire (`scripts/core/player_data.gd`, `ui/inventory_screen.gd`)

- **6 emplacements** par joueur (armes exclues) : munitions empilables (9mm ×99, cartouches ×30, .357 ×18), sprays (×3).
- **Armes** à part (5 max), chacune avec son chargeur ; réserve = munitions de l'inventaire.
- **Porte-clés commun** (clés, cartes, fusible) : partagé entre les joueurs, n'occupe pas d'emplacement.
- **Documents** (22) : collection commune, relisibles depuis l'inventaire.
- Objets « instant » (piles) consommés au ramassage ; « outil » (lampe) hors emplacements.
- Actions : utiliser (soin), équiper, examiner, lire ; pas de combinaison d'objets ; pas de coffre de stockage.

19 objets (`data/items.gd`) : 5 armes, 3 munitions, 1 soin, 8 clés/cartes (`key_boxes`, `fuse`, `key_technical`, `key_pharmacy`,
`key_locker`, `card_research`, `key_private`, `key_main_lab`), piles, lampe torche.

### 4.7 Portes (`items/door.gd`, 402 lignes)

72 portes : simples ou doubles, pleines ou vitrées, bois / métal / verre / coupe-feu / blindées, sens d'ouverture calculé
depuis la position du joueur, claquement scripté, ouverture forcée (le Colossus enfonce même les portes verrouillées).
Verrous (`Door.Lock`) :

| Verrou | Nombre | Exemples |
| --- | ---: | --- |
| `NONE` (libre) | 49 | — |
| `LOCKED` (définitivement condamnée, message d'ambiance) | 13 | `b1_resus_door`, `stair_b_2` (« CHIRURGIE — ACCÈS CONDAMNÉ »)… |
| `KEY` (clé du porte-clés) | 4 | `b1_triage_boxes` (clé des box), `f0_pharmacy_door`, `stair_a_b2` (local technique), `stair_c_12` (carte de Sarah) |
| `ITEM` (objet à poser) | 1 | `f6_crisis_door` (fusible 60 A) |
| `EVENT` (ouverte par le scénario) | 5 | `main_entrance`, `f3_or_door`, `f6_door_604`, `stair_b_1` (code 0612), `stair_c_11` |

Plus 3 portes automatiques coulissantes (`AutoDoor`). L'état de chaque porte (ouverte, déverrouillée) est sauvegardé.

### 4.8 Énigmes

| Énigme | Lieu | Solution | Effet |
| --- | --- | --- | --- |
| Clé des box | -1 accueil | ramasser `key_boxes` | ouvre les box de soins |
| Téléphone de l'accueil | -1 / 0 | décrocher | dialogue (Sarah au bout du fil) |
| Clé du local technique | 1er, radiologie | ramasser `key_technical` | ouvre l'escalier A au -2 |
| Disjoncteurs du groupe électrogène | -2 | ordre **pompe → G1 → transfert** (`SWITCH_ORDER`) ; mauvais ordre = coupure | `power_restored` : lumières, ascenseurs, portes |
| Clé de la pharmacie | 0, cafétéria | ramasser `key_pharmacy` | rideau de la pharmacie |
| Casier de Sarah | 3e | clé `key_locker` | note de Sarah (code de l'escalier B) + lettre |
| Clavier de l'escalier B | 1er | code **0612** | escalier de service B jusqu'au 6e |
| Bouteilles d'oxygène | 3e | tirer dessus près du Chirurgien | explosion : dégâts massifs, faiblesse du boss |
| Fusible | 6e | poser `fuse` dans le boîtier | porte électrique de la cellule de crise |
| Carte RECHERCHE | 6e | ramasser `card_research` | monte-charge sécurisé -2 → 8 |
| Coffre du Dr Vance | 8e | code **0309** (vu dans la vidéo de Sarah) | Magnum, 6 balles .357, clé de l'ascenseur de direction |
| Ascenseur de direction | 8e ↔ 11e | clé `key_private` | accès au 11e |
| Carte de Sarah (niveau 5) | 11e | remise par Sarah | escalier C → 12e (zone interdite) |
| Console d'autodestruction | 12e | Patient Zéro vaincu | compte à rebours 300 / 240 / 200 s (facile / normal / difficile) |

### 4.9 Ascenseurs (3)

| Ascenseur | Arrêts | Règles |
| --- | --- | --- |
| `main` — ASCENSEURS | -2, -1, 0, 1, 3, 6 | courant requis ; -1 bloqué jusqu'à `b1_unlocked` ; 6 désactivé (accès par l'escalier B seulement) |
| `freight` — MONTE-CHARGE | -2, -1, 8 | courant requis ; 8 exige la carte RECHERCHE ; -1 seulement pendant l'autodestruction ; -2 interdit depuis la recherche |
| `private` — ASCENSEUR DE DIRECTION | 8, 11 | courant requis ; 11 exige la clé de direction |

Le voyage est un écran de transition (`ElevatorScreen`) + téléportation vers le repère `elev_<id>_<étage>` ; en coop, les deux
joueurs voyagent ensemble (`rq_elevator` / `ev_travel`).

### 4.10 Scénario et événements (`scripts/game/event_director.gd`, 1 039 lignes)

Tourne uniquement sur l'hôte ; la mise en scène (sons, sous-titres, caméra, barre de boss) est rejouée chez l'invité par `Stage`.

| Déclencheur / source | Événement |
| --- | --- |
| Lancement | Intro : message vocal de Sarah (écran noir, sous-titres), carte de titre, arrivée sur le parking |
| `ramp_top`, `er_bay` | Commentaires de Thomas (rampe, ambulance vide) |
| `b1_enter` | Entrée aux urgences, autosave, le téléphone de l'accueil sonne |
| `b1_nurse` | L'infirmière se retourne et charge (premier infecté) — « FUIS ! » |
| `b1_stair_escape` | La porte de l'escalier A claque et se bloque derrière Thomas |
| `f0_arrive`, `f0_hall` | Rez-de-chaussée ; annonce des haut-parleurs |
| drapeau `picked_f0_baton` | L'agent de sécurité mort se relève (**à revoir, voir §15**) |
| `f1_arrive`, `f1_xray` | 1er étage ; radiologue immobile |
| `b2_arrive`, `b2_parking` | Cri du Veilleur ; « Il ne me voit pas… Il écoute. » |
| Disjoncteurs dans l'ordre | Retour du courant (lumières, ascenseurs) |
| `f3_arrive` | Service de Sarah |
| Document `doc_sarah_note` | Code 0612 ; le Chirurgien défonce la porte du bloc (boss 1) |
| `stairb_5`, `f6_airlock`, `f6_q604` | Néonatal dans l'escalier ; sas ; le patient de la chambre 604 brise la vitre |
| Point `sarah_video` (8e) | Vidéo de Sarah (révèle le code 0309) |
| Drapeau `picked_f8_private_key` | Le Colossus s'échappe de la cellule C-7 |
| Ascenseur `main` au -2 avec la carte | Embuscade du Veilleur |
| `f11_control` / point `sarah_talk` | Scène avec Sarah (remise de la carte niveau 5), puis combat (boss 2) ; deux moments de lucidité |
| Point `zero_talk` (12e) | Dialogue à l'interphone avec Élias Brandt |
| Point `self_destruct` | 1re fois : libère le Patient Zéro (boss 3, invoque des mutants) ; après sa mort : autodestruction |
| Autodestruction | Alertes rouges (12e, 8e, -1), alarme, compte à rebours, le Colossus garde le 8e, 3 infectés au -1 |
| `f8_stairc`, arrivée du monte-charge au -1 | Étapes de la fuite |
| `escape_out` | Fin : explosion, cinématique, écran de fin |

Autres effets : ambiance aléatoire (bruits lointains toutes les ~35 s), éclairs et tonnerre à l'extérieur (~20 s), 27 sauvegardes
automatiques aux étapes clés, verrouillage du joueur pendant les dialogues, caméras de cinématique.

### 4.11 Objectifs (`data/objectives.gd`)

26 objectifs, **déduits** de l'état (drapeaux + inventaire) à chaque changement — jamais stockés. De « Entrer dans l'hôpital
Blackwood. » à « Fin du chapitre 1. ». La même fonction pure sera recodée en C++ (`UBWObjectives::GetCurrent`) pour garantir
le même texte au même moment.

### 4.12 Zones, ambiance et son spatial (`scripts/game/zone_manager.gd`)

Chaque zone (77) définit : nom affiché, étage, rectangles au sol, hauteur, **mélange d'ambiances** (`amb_hum`, `amb_rain`,
`amb_wind`…), **réverbération** (`outdoor`, `room`, `corridor`, `hall`, `basement`, `tunnel`), **surface des pas**
(béton, carrelage, lino, moquette, bois, métal, extérieur), lune/pluie visibles, voisines. Le `ZoneManager` suit le joueur,
fond les ambiances, change la réverbération, affiche le nom à la première visite et n'allume que les lumières de l'étage courant.

### 4.13 Éclairage et atmosphère

- 211 lumières omnidirectionnelles + 2 projecteurs, presque toutes sans ombre ; `LightFixture` (néons, appliques) avec modes
  allumé / éteint / clignotant / pulsé (alerte rouge) ; coupure et retour du courant animés.
- Ciel nocturne (shader), lune (lumière directionnelle), pluie (particules) et éclairs à l'extérieur, brouillard volumétrique.
- Post-traitement maison : grain, vignette, aberration chromatique, désaturation et voile rouge selon la santé, luminosité.

### 4.14 Sauvegarde (`save/save_system.gd`, `GameState.to_dict`)

Fichiers JSON dans `user://saves/` : `autosave.json` (emplacement 0) et `slot_1…3.json`. Version 1. Contenu :

```
{
  "version": 1, "saved_at": <unix>, "saved_at_text": "…", "zone_name": "…",
  "player": {"pos": [x, y, z], "yaw": …},
  "state": {
    // joueur 1 (PlayerData) :
    "hp", "inventory": [{"id","count"}×6], "weapons": {id: {"mag"}}, "equipped",
    "flashlight_on", "flashlight_battery", "downed", "bleed_t", "dead",
    // monde :
    "keys": [...], "documents": [...], "flags": {...}, "taken_pickups": {...},
    "door_states": {...}, "dead_enemies": {...}, "playtime", "current_zone",
    // coop : "players": {"2": {PlayerData}}
  }
}
```

Sauvegarde automatique (délai minimal 1 s, jamais pendant un voyage ni après la mort), manuelle aux 6 points de sauvegarde
(`SavePoint`), chargement depuis le menu principal ou l'écran de mort, affichage zone / date / temps de jeu / santé.
Les anciennes sauvegardes sont relues (clés rangées dans les emplacements → porte-clés).

### 4.15 Réglages (`scripts/core/settings.gd`)

Fichier `user://settings.cfg`. Qualité, ombres, brouillard volumétrique, SSAO, SSIL, SSR, glow, anticrénelage, échelle de rendu, grain, aberration, mode de
fenêtre, V-Sync, FPS max, luminosité, champ de vision (70°), tremblements, balancement de tête, 4 volumes, sous-titres (+ taille),
vue 1re/3e personne, sensibilités souris/stick, vibrations, inversion Y, difficulté (0-2 : multiplicateurs de dégâts reçus
0,6/1/1,4, de munitions trouvées 1,5/1/0,7, de PV des ennemis 0,8/1/1,2), réticule, intensité de la lampe, mode débogage.

### 4.16 Contrôles (`scripts/core/input_setup.gd`)

19 actions de jeu, 4 actions de regard au stick droit et 4 actions de navigation dans les menus. Clavier/souris (touches physiques : ZQSD sur AZERTY, WASD sur QWERTY) + flèches, Maj (courir), E (interagir),
Tab/I (inventaire), R (recharger), F (lampe), Échap (pause), Espace (esquiver), H (soin rapide), V (vue), clic gauche (tirer),
clic droit (viser), molette (changer d'arme), F1 (console), F3 (performances). Manette : sticks (déplacement, caméra), RT tirer,
LT viser, A interagir, B esquiver, X recharger, Y soin, LB/RB et croix gauche/droite (armes), croix haut (lampe), croix bas / Vue
(inventaire), L3 (courir), R3 (vue), Menu (pause) ; libellés adaptés à la famille de manette.

### 4.17 Réseau et coopération (`scripts/net/*.gd`)

- ENet, port 24890 ; recherche des parties sur le réseau local par UDP (24891) ; 2 joueurs max ; hôte = serveur.
- 29 RPC : 11 requêtes client → hôte (`rq_ready`, `rq_state`, `rq_interact`, `rq_code`, `rq_elevator`, `rq_arrived`, `rq_fire`,
  `rq_reload`, `rq_equip`, `rq_heal`, `rq_flashlight`), 18 messages hôte → clients (`st_player`, `st_enemies`, `ev_pdata`,
  `ev_teleport`, `ev_world`, `ev_spawn`, `ev_despawn`, `ev_ui`, `ev_code_result`, `ev_travel`, `ev_shot`, `ev_hurt`, `ev_msg`,
  `ev_stage`, `ev_game_over`, `_set_slots`, `_snapshot`, `_reject`).
- Objets **personnels** (munitions, soins, piles, armes) vs **partagés** (clés, cartes, fusible, documents).
- À terre 30 s → réanimation ; les deux à terre → GAME OVER ; un partenaire mort revient au point de sauvegarde suivant.
- Les ennemis choisissent leur cible parmi les joueurs (distance, bruit, dégâts reçus).
- Latence testée avec un proxy (`tests/latency_proxy.gd`).

### 4.18 Débogage

Console `F1` (commandes `god`, `ammo`, `weapon`, `tp`, `spawn`, `killall`, `ai`, `heal`, `flag`, `pos`, `help` — `scripts/core/debug_tools.gd`), surimpression
des performances `F3`, mode débogage dans les options, journaux des tests.

### 4.19 Performance (mesures du projet Godot)

Construction du niveau ≈ 1,2 s ; géométrie fusionnée par zone × matériau × ombre ; 37 accessoires instanciés (MultiMesh) ;
un seul étage visible et éclairé à la fois (plus les escaliers) ; ennemis hors étage désactivés toutes les 0,5 s ;
grilles de navigation A* à 25 cm par étage. Les performances réelles sur GPU n'ont jamais pu être mesurées dans cet environnement.

---

## 5. IA

### 5.1 Base commune (`enemies/enemy.gd`, 811 lignes)

Machine à états : `IDLE`, `PATROL`, `INVESTIGATE`, `CHASE`, `ATTACK`, `SEARCH`, `RETURN`, `DEAD`.

- **Vue** : portée 7 m dans le noir, 11 m si le joueur est éclairé (lampe), cône + ligne de vue.
- **Ouïe** : chaque bruit (pas, course, tir, porte, verre, explosion) a un rayon ; multiplié par `hearing_scale`.
- **Proximité** : détection automatique à 2,2 m.
- **Poursuite** : chemin A* sur la grille de l'étage, recalcul périodique, perte de la cible après 5 s, recherche 10 s,
  abandon au-delà de 24 m, retour au poste.
- **Attaque** : armement 0,55 s, dégâts 18, récupération 0,7 s ; vacillement (« stagger ») 60 % sur coup fort.
- États spéciaux : endormi (`dormant`, `deep_sleep`), passif (scripté), patrouille (points), réveil par le bruit ou par le scénario.
- Réseau : l'hôte simule, les invités interpolent position/orientation/vitesse (`st_enemies`).

### 5.2 Types d'ennemis

| Type (classe) | PV | Marche / course (m/s) | Dégâts | Vue (m) | Ouïe | Particularités | Nombre |
| --- | ---: | --- | ---: | ---: | ---: | --- | ---: |
| Infecté patient (`Hollow` « patient ») | 100 | 1,1 / 2,4 | 18 | 7 | ×1,0 | traîne les pieds, gémit | 12 |
| Infectée infirmière (« nurse ») | 90 | 1,3 / 2,9 | 15 | 8 | ×1,0 | rapide, tenace (30 m) | 5 |
| Agent infecté (« guard ») | 130 | 1,05 / 2,35 | 18 | 7 | ×1,0 | résistant | 3 |
| Patient neurologique (« neuro ») | 110 | 0,7 / 3,4 | 18 | 1,3 | ×1,7 | presque aveugle, chasse au son, sprint | 4 |
| Sujet expérimental (« experimental ») | 420 | 0,75 / 1,6 | 32 | 8 | ×1,0 | massif, vacille rarement | 2 |
| Veilleur (`Veilleur`) | 380 | 0,9 / 4,2 | 28 | 2,2 | ×2,2 | aveugle : marcher lentement le trompe, courir le réveille | 1 |
| Néonatal (`Neonatal`) | 70 | 1,6 / 5,2 | 12 | 9 | ×1,8 | rampe dans les gaines (3 bouches), mord, disparaît | 1 |
| Colossus (`Colossus`) | 6 000 | 1,2 / 3,3 | 45 | 20 | ×2,0 | quasi invulnérable, enfonce les portes, à fuir | 1 |
| Chirurgien (`Surgeon`, boss 1) | 900 | 0,95 / 1,95 | 36 | 16 | ×1,6 | lame, charge (étourdi contre un mur), lampe frontale, faiblesse : bouteilles d'O₂ | 1 |
| Sarah (`SarahBoss`, boss 2) | 1 300 | 1,2 / 3,5 (4,1 en rage) | 22 | 18 | ×1,5 | bond, cri, 2 hésitations scénarisées | 1 |
| Patient Zéro (`PatientZero`, boss 3) | 2 200 | 1,2 / 3,3 | 24 | 18 | ×1,5 | régénération, cri qui interrompt, invoque des mutants | 1 |

32 définitions d'apparition (dont 3 infectés activés seulement pendant l'autodestruction), plus les mutants invoqués par le
Patient Zéro. Chaque définition (type, variante, position, patrouille, endormi, passif, déclenchement) est reprise dans l'export du
niveau (`Tools/GodotExport`).

### 5.3 Navigation

`NavGrid` maison (A* sur cellules de 25 cm par étage, obstacles gonflés de 28 cm, portes verrouillées bloquantes, portes
fermées franchissables car poussées). **Dans Unreal : NavMesh (Recast) + NavModifiers/NavLinks** pour les portes, les gaines du
Néonatal et les escaliers.

---

## 6. Animations

- **Aucun clip d'animation, aucun `AnimationTree`.** `player/humanoid_rig.gd` calcule chaque image les rotations d'un squelette
  procédural (marche, course, visée, attaques, vacillement, chute, poses de cadavre) ; `enemies/skinned_body.gd` recopie ces
  rotations sur le squelette du modèle zombie (24 os : `Hips`, `Spine`…, `LeftUpLeg`…, `Head`, noms proches de Mixamo).
- Objets animés par interpolations (`Tween`) : portes, portes coulissantes, ascenseurs, coffre, casier, rideaux, disjoncteurs.
- **Dans Unreal** : Animation Blueprints + clips. Sources possibles sous licence claire : *Game Animation Sample* d'Epic
  (gratuit, usage dans les projets Unreal), animations Fab (licence Fab), Mixamo (conditions Adobe) — à valider avant import ;
  reciblage vers le squelette du zombie avec l'IK Retargeter.

---

## 7. Shaders (11)

| Shader | Type | Rôle | Équivalent Unreal |
| --- | --- | --- | --- |
| `pbr_surface` | spatial | PBR triplanaire en coordonnées monde (aucun UV), teinte, saleté, bandeau mural bicolore, humidité | Material maître `M_BW_WorldAligned` (fonction `WorldAlignedTexture`) + Material Instances |
| `surface` | spatial | Surfaces procédurales (carrelage, bicolore, faux plafond, béton, métal, bois) | `M_BW_Procedural` (bruit + motifs) |
| `foliage` | spatial | Feuillage découpé par bruit | `M_BW_Foliage` (Masked, Two Sided Foliage) |
| `blood` | spatial | Taches de sang procédurales | `M_BW_BloodDecal` (Deferred Decal) |
| `flesh` | spatial | Chair des créatures | `M_BW_Flesh` (Subsurface) |
| `liquid` | spatial | Liquide de cuve lumineux | `M_BW_TankLiquid` (Translucent) |
| `night_sky` | sky | Ciel, nuages, lune | Sky Atmosphere + Volumetric Clouds (ou `M_BW_NightSky`) |
| `screen` | spatial | Écrans : terminal, neige, CCTV, erreur, ECG | `M_BW_Screen` (Emissive, 5 modes) |
| `screen_fx` | canvas_item | Grain, vignette, aberration, désaturation, voile de dégâts | Post Process Volume + `M_BW_PostFX` |
| `water` | spatial | Flaques, sol inondé, arcs électriques | `M_BW_Water` |
| `zombie_skin` | spatial | Peau/vêtements des infectés, recoloration par variante | `M_BW_ZombieSkin` + une instance par variante |

88 matériaux nommés (`materials/materials.gd`) : 52 texturés (sur les textures Poly Haven) et 36 procéduraux (plastiques,
tissus, carrosseries, peintures…). Leurs paramètres sont exportables en JSON pour créer automatiquement les Material Instances.

---

## 8. Audio

153 sons Ogg Vorbis mono 44,1 kHz (406 s au total, 4,8 Mo), **tous synthétisés** par `tools/gen_audio.py` (graine fixe) :

| Catégorie | Nombre | Exemples |
| --- | ---: | --- |
| Musiques | 3 | `music_menu`, `music_boss`, `music_end` |
| Ambiances (boucles) | 11 | `amb_hum`, `amb_rain`, `amb_rain_inside`, `amb_wind`, `amb_basement`, `amb_lab`, `amb_generator`, `amb_tunnel`, `amb_vent`, `amb_room`, `amb_birds` |
| Pas (7 surfaces × 4 + lourds + traînés) | 30 | `step_concrete_1…4`, `step_tile_*`, `step_lino_*`, `step_carpet_*`, `step_wood_*`, `step_metal_*`, `step_outdoor_*`, `step_heavy`, `step_shuffle` |
| Armes | 16 | `gunshot`, `magnum_shot`, `smg_shot`, `shotgun_blast`, `shotgun_pump`, `reload`, `reload_shell`, `gun_empty`, `shell_casing`, `weapon_switch`, `baton_*`… |
| Créatures et boss | 23 | `hollow_*` (groans ×3, alert, attack, hurt, death, sniff, wake), `surgeon_*`, `veilleur_*`, `neonatal_*`, `colossus_roar`, `zero_*`, `sarah_scream` |
| Joueur | 10 | `player_hurt_1…3`, `player_death`, `death_sting`, `breath_close`, `breath_phone`, `heartbeat`, `dodge`, `spray` |
| Impacts / destructions | 10 | `impact_*`, `hit_flesh`, `body_fall`, `glass_crash`, `explosion`, `electrocution`… |
| Portes | 13 | `door_open`, `door_close`, `door_slam`, `door_locked`, `door_unlock`, `door_bang`, `door_burst`, variantes verre/métal, `shutter` |
| Interface | 13 | `ui_move`, `ui_select`, `ui_error`, `inventory_open/close`, `pickup`, `pickup_key`, `paper`, `keypad_*`, `tape_*` |
| Environnement / mécanismes | 24 | `alarm`, `elevator_*`, `power_up/down`, `breaker`, `fuse_insert`, `light_buzz`, `flashlight_click`, `phone_*`, `thunder`, `stinger`… |

(Le détail fichier par fichier est dans `ASSET_INVENTORY.md`.) Les variantes `nom_1…n` sont tirées au hasard ; 7 sons hors
`amb_`/`music_` bouclent (`light_buzz`, `heartbeat`, `alarm`, `phone_static`, `phone_ring`, `surgeon_breath`, `metal_scrape`).

---

## 9. Interface

Construite entièrement par le code (`ui/`, thème `ui/ui_theme.gd`, 4 polices). Écrans (`UIScreen`) gérés en pile par `UIRoot` :

| Écran | Script | Contenu |
| --- | --- | --- |
| HUD | `hud.gd` + `ecg_display.gd` | état de santé (tracé ECG + « BON / BLESSÉ… »), arme et munitions, ceinture d'armes, batterie de la lampe, réticule, objectif, compte à rebours, état du partenaire |
| Menu principal | `main_menu.gd` | NEW GAME, CONTINUE, LOAD GAME, CO-OP, OPTIONS, QUIT (libellés en anglais) sur un décor 3D animé |
| Pause | `pause_menu.gd` | RESUME, INVENTORY, OPTIONS, QUIT TO MENU (+ confirmation) |
| Options | `options_menu.gd` | 5 onglets : GRAPHISMES, AFFICHAGE, AUDIO, JEU, COMMANDES (dont la manette) |
| Inventaire | `inventory_screen.gd` + `item_icon.gd` | 6 emplacements, armes, porte-clés, documents, description |
| Documents | `document_viewer.gd` | lecture des 22 documents (polices manuscrite / machine à écrire) |
| Clavier à code | `keypad_screen.gd` | saisie des codes (0612, 0309) |
| Ascenseur | `elevator_screen.gd` | choix de l'étage selon les règles |
| Sauvegarde | `save_screen.gd` | 3 emplacements |
| Mort | `death_screen.gd` | RETRY (dernière sauvegarde), QUIT TO MENU |
| Fin | `ending_screen.gd` | titre, bilan de la partie, annonce du chapitre 2 |
| Coop | `coop_menu.gd` | héberger, rejoindre (IP), recherche LAN, états CONNEXION… / ÉCHEC |
| Console | `debug_console.gd` | commandes de débogage |
| Autres | `ui_root.gd`, `perf_overlay.gd` | messages, sous-titres, invites d'interaction, cartes de titre, barre de boss, icône d'autosave, fondus, performances |

Navigation complète au clavier, à la souris et à la manette.

---

## 10. Assets, licences, dépendances et plugins

- **Assets** : 26 jeux de textures (25 Poly Haven CC0 + 1 générée), 1 modèle Higgsfield (conditions du compte de l'utilisateur,
  à revérifier avant diffusion commerciale), 153 sons originaux, 4 polices libres. Registre source :
  `blackwood/Documentation/ASSET_LICENSES.md`. Inventaire complet : `ASSET_INVENTORY.md` (467 entrées, aucune licence inconnue).
- **Plugins / addons Godot** : aucun (pas de dossier `addons/`).
- **Modules Godot utilisés** : rendu Forward+, physique 3D intégrée, ENet (réseau), import glTF, Ogg Vorbis, TextServer.
- **Dépendances externes** : aucune à l'exécution. Outils de génération : Python 3 + numpy, scipy, soundfile, Pillow.
- **Aucun asset** extrait d'un jeu commercial, piraté ou de licence inconnue.

---

## 11. Tests et état fonctionnel vérifiés (version 0.6)

Derniers résultats (24/09/2026) : campagne complète jouée par le robot `autoplay` (terminée, 1 mort), 21 points de
sauvegarde rechargés sans anomalie, 230 objets interactifs audités sans problème, visite du niveau sans échec de navigation,
coop (hôte + invité réels) 120 vérifications OK, latence simulée 2/2, manette 38/38, parcours des menus 24 OK, mode
débogage 57 OK. Ces scénarios servent de **référence de comportement** pour les tests de comparaison dans Unreal.

---

## 12. Problèmes connus et risques de migration

**Dans le projet Godot**
1. Réalisme limité : bâtiment, mobilier, armes, objets, Thomas et Sarah sont des formes simples habillées de textures.
2. Un seul modèle réaliste (le zombie), décliné pour toutes les créatures.
3. Animations procédurales : fonctionnelles mais raides.
4. Les combats de boss finaux échouent parfois pour le robot de test (instabilité connue du robot, pas du jeu).
5. « 2 ressources encore utilisées à la fermeture » (avertissement mineur à la sortie).
6. Plantage rare observé une fois dans un thread du moteur (1 exécution sur 25, jamais reproduit).
7. Performances sur GPU jamais mesurées.
8. Conception : sans arme avant le premier infecté, la première rencontre est une fuite imposée (retour utilisateur, §15).

**Risques propres à la migration**
1. Unreal n'est pas disponible dans l'environnement d'audit : compilation, import et tests doivent se faire sur le PC de l'utilisateur.
2. Conventions d'axes : Godot (Y haut, mètres, main droite) → Unreal (Z haut, centimètres, main gauche). Une calibration
   automatique des axes est prévue dans la chaîne d'import (§17) pour éviter un niveau miroir.
3. Normales OpenGL (Y+) des textures → Unreal attend DirectX (Y-) : option *Flip Green Channel* à l'import.
4. Aucune animation à récupérer : les personnages ne seront animés qu'après l'ajout de clips sous licence vérifiée.
5. Poids des assets Unreal (`.uasset` binaires, souvent plusieurs centaines de Mo) : ce dépôt est synchronisé avec Lovable ;
   il ne faut **pas** y pousser le dossier `Content/` importé sans Git LFS (voir `BLACKWOOD_UNREAL/README.md`).
6. Le réglage de la lumière (unités, exposition, Lumen) doit être refait à l'œil sur un vrai GPU.
7. Les Behavior Trees, Blackboards, Animation Blueprints et widgets UMG sont des assets binaires : leur logique est écrite en C++
   (tâches, services, classes de base) et leur assemblage est décrit/automatisé autant que possible, mais une partie se fait dans l'éditeur.

---

## 13. Changements de conception demandés (à appliquer dans Unreal)

Demandes de l'utilisateur, intégrées à la conception Unreal (le projet Godot n'est pas modifié) :

1. **Matraque supprimée.** L'arme de mêlée disparaît (objet `baton`, sons `baton_*`, modèle, emplacement dans l'ordre des armes).
2. **Le pistolet se trouve sur le corps d'un policier mort, à côté de l'ambulance** (quai des ambulances, sous-sol -1, près de la
   lampe torche), avant le premier infecté (l'infirmière des urgences) : le joueur peut désormais se défendre dès la première rencontre.
   - nouveau cadavre de policier (uniforme sombre) adossé à l'ambulance, avec un nouvel objet à ramasser `b1_police_pistol`
     (pistolet chargé, 12 balles) qui pose le drapeau `has_pistol` ;
   - le pistolet de la radiologie (1er) devient une boîte de munitions 9mm (même emplacement), la clé du local technique ne change pas ;
   - la matraque du poste de sécurité (rez-de-chaussée) est remplacée par des munitions ; l'agent de sécurité se relève désormais
     quand Thomas entre dans le poste de sécurité (déclencheur de zone) au lieu de « quand il prend la matraque » ;
   - l'objectif « FUIR » après l'infirmière reste valable (fuir reste possible), mais le combat devient possible ;
   - ces changements sont marqués « Changement de conception » dans `MIGRATION_MATRIX.md` pour ne pas être confondus avec des écarts de migration.
3. **Meilleurs modèles** (le fauteuil roulant « 4 cercles et 2 plaques », l'ambulance, le mobilier…) : remplacement par des modèles
   réalistes sous licence vérifiée — Poly Haven (CC0), Fab (licence standard Fab, incluant Quixel Megascans), MetaHuman pour
   Thomas et Sarah — chaque asset inscrit dans `ASSET_INVENTORY.md` avant son import.

---

## 14. Ce qui peut être transféré automatiquement, converti, ou doit être reconstruit

### 14.1 Transférable automatiquement (import direct des fichiers, sans transformation manuelle)

| # | Élément | Quantité | Remarque |
| --- | --- | ---: | --- |
| A1 | Textures PBR Poly Haven (albédo, normale, ORM) | 75 | JPEG 1K ; normales : *Flip Green Channel* ; ORM : sRGB désactivé, compression Masks |
| A2 | Textures du faux plafond (générées) | 3 | idem |
| A3 | Modèle zombie riggé `zombie.glb` + ses 3 textures 2K | 1 + 3 | Skeletal Mesh via l'import glTF d'Unreal |
| A4 | Sons, ambiances, musiques | 153 | `.ogg` importable par Unreal 5.8 (sinon conversion WAV par script) ; boucles réglées par nom |
| A5 | Polices + licences | 4 + 4 | Font Face / Font ; licences livrées avec le jeu |
| A6 | Registre des licences | 1 | recopié dans `ASSET_INVENTORY.md` |

### 14.2 À convertir (le contenu existe dans Godot mais doit être extrait ou transformé par script)

| # | Élément | Source Godot | Cible Unreal |
| --- | --- | --- | --- |
| C1 | Catalogue des objets (19) | `data/items.gd` | Data Assets `DA_Item_*` |
| C2 | Armes (5 → 4, matraque retirée) | `data/weapons.gd` | Data Assets `DA_Weapon_*` |
| C3 | Documents (22 textes) | `data/documents.gd` | Data Assets `DA_Doc_*` (texte localisable) |
| C4 | Objectifs (26) | `data/objectives.gd` | table + fonction C++ équivalente |
| C5 | Statistiques des ennemis (11 profils) | `enemies/*.gd` | Data Assets `DA_Enemy_*` |
| C6 | Ascenseurs (3) et zones (77) | `hospital_level.gd`, `facility.gd` | Data Assets / volumes de zone et Audio Volumes |
| C7 | Disposition du niveau : 72 portes, 230 objets interactifs, 23 déclencheurs, 32 ennemis, 34 repères, 213 lumières, 28 cadavres, 5 bouteilles d'O₂, 3 vitres, 3 portes automatiques, 243 panneaux | niveau généré | acteurs placés automatiquement dans `L_BlackwoodHospital` |
| C8 | Géométrie du bâtiment (818 707 sommets) | niveau généré | glTF par étage × zone × matériau → Static Meshes (Nanite), collisions |
| C9 | 37 modèles d'accessoires instanciés + objets + armes | code procédural | glTF → Static Meshes + Instanced Static Meshes (provisoire, remplacement recommandé) |
| C10 | 88 matériaux nommés | `materials/materials.gd` | Material Instances (paramètres JSON) |
| C11 | Dialogues, sous-titres, messages, invites | `event_director.gd` et scripts d'objets | String Table / Data Assets |
| C12 | Actions et touches (19 + 4 + 4) | `input_setup.gd` | Input Actions + Input Mapping Contexts (clavier/souris, manette) |
| C13 | Réglages et multiplicateurs de difficulté | `settings.gd` | `UBWGameUserSettings` + Data Asset de difficulté |
| C14 | Format de sauvegarde | `GameState.to_dict` | champs de `UBWSaveGame` (correspondance 1 : 1) |

### 14.3 À reconstruire entièrement (comportement recréé avec les systèmes Unreal)

| # | Système | Systèmes Unreal |
| --- | --- | --- |
| R1 | Architecture (autoloads, états monde/joueur, flux de partie) | GameInstance + Subsystems, GameMode, GameState, PlayerState, PlayerController (réplication) |
| R2 | Personnage joueur (déplacement, course, esquive, visée, santé, soin, à terre, mort) | Character + CharacterMovementComponent, composants C++, propriétés répliquées, RPC serveur |
| R3 | Caméra 3e / 1re personne, épaule, visée, tremblements | SpringArm + Camera, Camera Shakes, interpolation |
| R4 | Contrôles clavier / souris / manette | Enhanced Input, CommonInput (icônes), Force Feedback |
| R5 | Lampe torche et batterie | SpotLight + composant répliqué |
| R6 | Interaction | Interface `IBWInteractable`, trace depuis la caméra, invites UMG |
| R7 | Inventaire, porte-clés, documents | composant/PlayerState répliqués + UMG |
| R8 | Portes, serrures, portes automatiques, vitres, bouteilles d'O₂ | Acteurs C++ + Timelines/interpolation, NavModifiers |
| R9 | Énigmes (codes, disjoncteurs, fusible, coffre, casier, téléphone) et ascenseurs | Acteurs C++ + UMG + Level Sequences |
| R10 | Combat (balles, plombs, dégâts, tête, recul, bruit) | Line traces serveur, Physical Materials (tête/corps), `ReportNoiseEvent` |
| R11 | IA des 11 profils d'ennemis (dont 3 boss) | AIController + Behavior Tree + Blackboard + AI Perception (vue, ouïe) + NavMesh + EQS |
| R12 | Scénario, déclencheurs, cinématiques, compte à rebours | Trigger Volumes + Director (serveur) + délégués + Level Sequences |
| R13 | Interface (HUD + 13 écrans) | UMG (+ CommonUI pour la navigation manette) |
| R14 | Système audio (ambiances par zone, réverbération, pas par surface, musiques) | Audio Components, Sound Classes/Mix, Audio Volumes, Physical Materials, MetaSounds |
| R15 | Sauvegarde / chargement | USaveGame + sous-système |
| R16 | Coop 2 joueurs (sessions LAN, réplication, à terre/réanimation) | Réplication native, OnlineSubsystemNull, RPC |
| R17 | 11 shaders | Materials maîtres + instances, Post Process |
| R18 | Effets (impacts, sang, pluie, explosions, éclairs) | Niagara, Decals |
| R19 | Animations | Animation Blueprints, clips sous licence, IK Retargeter |
| R20 | Personnages Thomas, Sarah et monstres réalistes | MetaHuman / modèles Fab + zombie importé |
| R21 | Éclairage et atmosphère | Lumen, Virtual Shadow Maps, Volumetric Fog, Sky Atmosphere, Post Process |
| R22 | Débogage et tests | Cheat Manager / commandes console, Automation Tests, Functional Tests |

---

## 15. Plan de migration (ordre imposé) et critères de fin

Ordre : 1 Projet UE5 · 2 Architecture · 3 Assets · 4 Personnage · 5 Caméra · 6 Contrôles · 7 Environnement · 8 Interactions ·
9 Inventaire · 10 Portes · 11 Combat · 12 IA · 13 UI · 14 Audio · 15 Événements · 16 Sauvegarde · 17 Coop · 18 Optimisation · 19 Polish.

Après chaque grande étape : COMPILE → LANCE → TESTE → CORRIGE → RETESTE, avec une comparaison Godot / Unreal par système
(tableau de `MIGRATION_MATRIX.md`). La migration n'est terminée que lorsque les 13 critères sont remplis : Unreal compile, le jeu
démarre, personnage, caméra, niveaux, interactions, ennemis, armes, inventaire, énigmes, événements et sauvegarde fonctionnent,
et le jeu peut être terminé — puis test du jeu complet.

---

## 16. Préservation du projet Godot

Le dossier `blackwood/` reste intact : aucun fichier (scènes, scripts, assets, configuration) n'est supprimé ni modifié par la
migration. Les outils d'extraction travaillent sur une **copie temporaire** du projet (comme l'outil d'inventaire du niveau de cet
audit). Le projet Godot reste jouable et exportable à tout moment ; il sert de référence de comportement et de contenu.

---

## 17. Chaîne de migration prévue (vérifiable à chaque étape)

1. **Ici (Linux, sans Unreal)** — outils testés : extraction Godot → `BLACKWOOD_UNREAL/SourceData/` (JSON : objets, armes,
   documents, objectifs, ennemis, zones, ascenseurs, disposition complète du niveau, matériaux) et `SourceAssets/` (glTF du
   niveau et des accessoires, sons) ; projet Unreal texte (`.uproject`, `Config/`, code C++ réplicable, scripts Python d'éditeur).
2. **Sur le PC (Unreal installé)** — compilation (Visual Studio 2022), puis un script Python d'éditeur importe tout : textures
   (réglages corrects), sons, polices, zombie, Data Assets, matériaux, géométrie, et place les acteurs dans la map. Une calibration
   importe trois repères de test pour déterminer automatiquement la conversion des axes avant de placer quoi que ce soit.
3. **Tests Unreal automatisés** (Automation Tests en ligne de commande) : cohérence des données avec Godot (valeurs identiques),
   chaque porte/objet/ennemi posé au sol et accessible (NavMesh), chemins de la progression praticables, sauvegarde/chargement
   aller-retour, puis tests en jeu.
