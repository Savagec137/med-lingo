# MIGRATION_MATRIX — Blackwood Hospital : Godot → Unreal Engine 5

Correspondance système par système : **Godot** (référence de comportement) → **Unreal** (cible) → **état** → **remarques**.
Les numéros d'étape suivent l'ordre imposé (1 Projet UE5 … 19 Polish). Les identifiants A/C/R renvoient aux trois listes de
`MIGRATION_AUDIT.md` §14 (A = transfert automatique, C = conversion, R = reconstruction).

**États**

| État | Signification |
| --- | --- |
| À faire | rien n'est commencé |
| Écrit | code / script / configuration écrits dans `BLACKWOOD_UNREAL/`, **pas encore compilé ni lancé** (Unreal absent de l'environnement de travail) |
| Compilé | compile dans Unreal, pas encore testé en jeu |
| Validé | testé dans Unreal et comparé au comportement Godot : identique, ou différence justifiée |
| Conception modifiée | différence **voulue** par l'utilisateur (ne pas « corriger » vers Godot) |

Dernière mise à jour : 24/09/2026 — jalon 1 écrit (étapes 1 à 7 en grande partie) : extraction Godot exécutée et vérifiée, code C++ vérifié en syntaxe, **rien n'est encore compilé ni testé dans Unreal** (aucune ligne « Validé »).

---

## 0. Concepts Godot → Unreal

| Godot | Unreal | Utilisation dans Blackwood |
| --- | --- | --- |
| Autoload (singleton `Node`) | `UGameInstanceSubsystem` / `UWorldSubsystem` | Settings, Audio, SaveSystem, Net, Pad |
| `GameState` (état du monde) | `AGameStateBase` répliqué | drapeaux, porte-clés, documents, portes, objets pris, ennemis morts, compte à rebours |
| `PlayerData` (par joueur) | `APlayerState` répliqué | santé, inventaire, armes, lampe, à terre / mort |
| `Game` (racine de partie, hôte) | `AGameModeBase` (serveur seulement) | apparition des joueurs et ennemis, voyages, sauvegardes, règles |
| `CharacterBody3D` | `ACharacter` + `UCharacterMovementComponent` | Thomas, créatures |
| `Camera3D` + `SpringArm3D` | `UCameraComponent` + `USpringArmComponent` | caméra épaule |
| `Area3D` | `UBoxComponent` / `ATriggerVolume` (overlap) | 23 déclencheurs, 77 zones |
| `StaticBody3D` + formes | Static Mesh (collision simple ou complexe) / `ABlockingVolume` | décor |
| `NavigationAgent` / `NavGrid` A* | NavMesh (Recast) + `UPathFollowingComponent` + NavModifiers / NavLinks | déplacements des créatures |
| Machine à états GDScript | `AAIController` + Behavior Tree + Blackboard + AI Perception | IA |
| Signal | Délégué dynamique multicast (`DECLARE_DYNAMIC_MULTICAST_DELEGATE`) / interface | `flag_changed`, `hp_changed`, `died`… |
| Groupe « interactable » | Interface `IBWInteractable` | objets interactifs |
| `Resource` / dictionnaire constant | `UPrimaryDataAsset` / `UDataTable` | objets, armes, documents, ennemis |
| `Control` / `CanvasLayer` | UMG (`UUserWidget`) + CommonUI | HUD, menus |
| `AudioStreamPlayer3D` | `UAudioComponent` / `UGameplayStatics::PlaySoundAtLocation` + Attenuation | sons 3D |
| Bus audio + effets | Sound Class / Sound Mix / Submix + Audio Volume (réverbération) | mixage, réverbération par zone |
| `ShaderMaterial` | Material + Material Instance | 88 matériaux |
| `GPUParticles3D` | Niagara | impacts, pluie, explosions |
| `Tween` | Timeline / interpolation dans `Tick` / Level Sequence | portes, ascenseurs |
| `AnimationTree` (ici : animation procédurale) | Animation Blueprint + clips | personnages |
| Fichier JSON `user://saves` | `USaveGame` + `UGameplayStatics::SaveGameToSlot` | sauvegardes |
| `@rpc` / `MultiplayerAPI` (ENet) | RPC `Server` / `Client` / `NetMulticast` + propriétés `Replicated` / `ReplicatedUsing` | coop |
| Recherche LAN UDP | Online Subsystem Null (sessions LAN) | menu coop |
| InputMap | Enhanced Input (Input Actions + Input Mapping Contexts) | contrôles |

---

## 1. Projet et architecture (étapes 1-2)

| Godot | Unreal | Id | Étape | État | Remarques / comparaison |
| --- | --- | --- | --- | --- | --- |
| `project.godot` (nom, version, scène principale, fenêtre) | `Blackwood.uproject`, `Config/DefaultGame.ini`, `DefaultEngine.ini` (maps par défaut, Lumen, VSM, Nanite) | R1 | 1 | Écrit | Le projet doit s'ouvrir dans la version installée d'Unreal (5.8 conseillée) ; `Blackwood.uproject`, `Config/*.ini` |
| Arborescence `blackwood/` | `Content/Blackwood/{Characters, Enemies, Weapons, Items, Hospital, Environment, Materials, Textures, Animations, Audio, VFX, UI, Maps, AI, Save, Data, Blueprints}` + `Source/Blackwood/` | R1 | 1 | Écrit | Dossiers créés par le script d'import (Unreal ignore les dossiers vides) |
| `scenes/main.tscn` + `scripts/main.gd` | `L_MainMenu` (menu) + `L_BlackwoodHospital` (jeu) + `UBWGameInstance` (transitions, nouvelle partie / chargement) | R1 | 2 | Écrit (partiel) | Mêmes entrées : nouvelle partie, continuer, charger, coop, options, quitter ; carte de jeu construite par l'import ; menu à l'étape 13 |
| `Game` (racine de partie) | `ABWGameMode` (serveur) | R1 | 2 | Écrit (partiel) | Apparition des joueurs, des ennemis selon les drapeaux, voyages en ascenseur, autosave ; classes, 2 joueurs, places de départ, chargement, autosave ; apparition des créatures et ascenseurs aux étapes 12 et 15 |
| Autoload `GameState` (monde) | `ABWGameState` (répliqué) | R1 | 2 | Écrit | Mêmes champs que `to_dict` : `keys`, `documents`, `flags`, `taken_pickups`, `door_states`, `dead_enemies`, `playtime`, `current_zone` |
| `PlayerData` | `ABWPlayerState` (répliqué) | R1 | 2 | À faire | `hp`, `inventory[6]`, `weapons{mag}`, `equipped`, `flashlight_on/battery`, `downed`, `bleed_t`, `dead` |
| Contrôle local du joueur | `ABWPlayerController` | R1 | 2 | Écrit (partiel) | Entrées, UI locale, RPC serveur des interactions ; entrées, commandes de test ; RPC d'interaction à l'étape 8 |
| Signaux de `GameState` (10) | Délégués de `ABWGameState` / `ABWPlayerState` | R1 | 2 | Écrit | `inventory_changed`, `flag_changed`, `hp_changed`, `message`, `document_collected`, `objective_changed`, `noise_emitted`, `weapons_changed`, `player_data_changed`, `key_ring_changed` ; `noise_emitted` → AI Perception (ReportNoiseEvent) ; `message` → UI (étape 13) |
| Autoload `Settings` | `UBWGameUserSettings` + `UBWSettingsSubsystem` | C13 | 2 | À faire | 33 réglages ; multiplicateurs de difficulté identiques |
| Autoload `SaveSystem` | `UBWSaveSubsystem` + `UBWSaveGame` | R15 | 2 / 16 | Écrit | Emplacement 0 = autosave, 1-3 = manuels |
| Autoload `Audio` | `UBWAudioSubsystem` + Sound Classes / Mix | R14 | 2 / 14 | Écrit (partiel) | sons 2D/3D et variantes via UBWGameData::FindSound ; mixage et ambiances à l'étape 14 |
| Autoload `Net` + `Coop` + `Stage` | Réplication native + `UBWSessionSubsystem` (LAN) | R16 | 2 / 17 | Écrit (partiel) | Architecture réplicable dès l'étape 2 : aucune logique critique côté client ; réplication de base ; sessions LAN à l'étape 17 |
| Autoload `Pad` | Enhanced Input + CommonInput + Force Feedback | R4 | 6 | Écrit (partiel) | affectations manette faites ; icônes, vibrations à venir |

## 2. Physique et collisions (étape 2)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| Couche 1 `world` | Canal objet `WorldStatic` | R1 | 2 | Écrit | |
| Couche 2 `player` | Canal objet `Pawn` (profil `BW_Player`) | R1 | 2 | Écrit | |
| Couche 3 `enemies` | Canal objet personnalisé `BW_Enemy` | R1 | 2 | Écrit | déclaré dans `DefaultEngine.ini` |
| Couche 4 `hitboxes` | Canal de trace `BW_Weapon` + Physics Asset (tête / corps) | R10 | 2 / 11 | Écrit (partiel) | multiplicateur de tête via Physical Material ou nom d'os ; canal déclaré |
| Couche 5 `doors` | Canal objet `BW_Door` | R8 | 2 / 10 | Écrit (partiel) | canal déclaré |
| Couche 6 `triggers` | Profil `Trigger` (overlap `Pawn`) | R12 | 2 / 15 | Écrit | |
| Canal de trace d'interaction | Canal de trace `BW_Interact` | R6 | 2 / 8 | Écrit (partiel) | canal déclaré |
| 60 pas physiques / s | Tick du jeu + sous-pas du CharacterMovement | R2 | 4 | Écrit | vitesses identiques en m/s → cm/s (×100) |

## 3. Assets (étape 3)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| 75 textures Poly Haven (`assets/textures/<jeu>/{albedo,normal,orm}.jpg`) | `/Game/Blackwood/Textures/Surfaces/<jeu>/T_<jeu>_{BaseColor,Normal,ORM}` | A1 | 3 | Écrit | Normal : compression Normalmap + *Flip Green Channel* (normales OpenGL) ; ORM : Masks, sRGB off ; Scripts/import_all.py (étape « textures ») |
| 3 textures du faux plafond (générées) | idem `ceiling_tile` | A2 | 3 | Écrit | |
| `assets/models/zombie/zombie.glb` + 3 textures 2K | `/Game/Blackwood/Enemies/Hollow/SK_Hollow` + Skeleton + Physics Asset | A3 | 3 | Écrit | import glTF (Interchange) ; vérifier l'échelle (1 u Godot = 1 m = 100 cm) ; étape « zombie » |
| 153 sons `audio/*.ogg` | `/Game/Blackwood/Audio/<catégorie>/<nom>` (Sound Wave) + Sound Cues aléatoires pour les variantes | A4 | 3 | Écrit | Unreal 5.8 importe le .ogg ; boucles : `amb_*`, `music_*` + 7 sons nommés ; étape « audio » ; variantes choisies au hasard par le code (sans Sound Cue) |
| 4 polices + 4 licences | `/Game/Blackwood/UI/Fonts/` (Font Face + Font composite) | A5 | 3 | Écrit | licences livrées avec le jeu |
| `Documentation/ASSET_LICENSES.md` | `BLACKWOOD_UNREAL/ASSET_INVENTORY.md` | A6 | 3 | Écrit | 467 entrées, licences recopiées |
| 88 matériaux nommés (`materials.gd`) | `/Game/Blackwood/Materials/Surfaces/MI_<nom>` sur `M_BW_WorldAligned` (texturés) / `M_BW_Simple` / `M_BW_Translucent` | C10 | 3 / 7 | Écrit | paramètres exportés en JSON ; rendu comparé par captures (même point de vue) ; 4 maîtres + 164 instances ; grain, variation et flaques simplifiés |
| 11 shaders | 11 matériaux maîtres (voir audit §7) | R17 | 3 / 7 | Écrit (partiel) | surface PBR, procédural, translucide, peau ; écrans, ciel, eau, feuillage simplifiés |
| Géométrie du bâtiment (niveau généré) | Static Meshes par étage × zone × matériau, Nanite, collision | C8 | 3 / 7 | Écrit | glTF exporté d'une copie du projet ; calibration automatique des axes ; extraction exécutée et comparée visuellement au jeu Godot |
| 37 accessoires instanciés, objets, armes (procéduraux) | Static Meshes provisoires + Instanced Static Mesh | C9 | 3 / 7 | Écrit | remplacement recommandé par des modèles réalistes (voir §20) ; Instanced Static Mesh (ABWPropInstances) |
| Aucune animation (procédural) | Clips sous licence + Animation Blueprints | R19 | 4 / 12 | À faire | Game Animation Sample (Epic) / Fab / Mixamo, reciblage IK |
| Thomas, Sarah (formes simples) | MetaHuman ou modèles Fab | R20 | 4 / 19 | Écrit (partiel) | mannequin Unreal provisoire |

## 4. Personnage (étape 4)

| Godot | Unreal | Id | Étape | État | Remarques / comparaison |
| --- | --- | --- | --- | --- | --- |
| `Player` (`CharacterBody3D`) | `ABWCharacter` (`ACharacter`) | R2 | 4 | Écrit | capsule ≈ 0,35 m × 1,8 m |
| Marche 2,3 · course 4,7 · visée 1,3 m/s | `MaxWalkSpeed` 230 / 470 / 130 cm/s | R2 | 4 | Écrit | mesurer la vitesse réelle en test automatique |
| Accélération 9 / décélération 11 / gravité 22 | `MaxAcceleration`, `BrakingDecelerationWalking`, `GravityScale` ≈ 2,24 | R2 | 4 | Écrit | |
| Rotation vers le mouvement 10 rad/s | `bOrientRotationToMovement`, `RotationRate` ≈ 573°/s | R2 | 4 | Écrit | en visée : rotation avec la caméra |
| Esquive 7 m/s, 0,4 s, recharge 0,9 s | `LaunchCharacter` / Root Motion + cooldown, RPC serveur | R2 | 4 | Écrit | Root Motion Source (prédiction locale + serveur) |
| Santé 100, soin +40, mort | `ABWPlayerState.Health` répliqué + `TakeDamage` (serveur) | R2 | 4 | Écrit (partiel) | multiplicateur de difficulté 0,6 / 1 / 1,4 ; santé, dégâts, mort ; soin à l'étape 9 |
| À terre 30 s, réanimation 25 PV (coop) | états `Downed` / `Dead` répliqués, `ReviveSpot` → interaction | R2 / R16 | 4 / 17 | Écrit (partiel) | solo : mort directe comme dans Godot ; états répliqués ; réanimation à l'étape 17 |
| Bruit des pas, course, tirs | `UAISense_Hearing::ReportNoiseEvent` (rayon identique) | R10 | 4 / 12 | Écrit (partiel) | pas faits ; tirs à l'étape 11 |
| Pas selon la surface (7) | Anim Notify ou foulée + surface de la zone / Physical Material | R14 | 4 / 14 | Écrit | foulée 0,8 / 1,2 m |
| Vue 1re personne (`V`) + `ViewModel` | 2e caméra ou même caméra rapprochée + bras en `FirstPerson` (Owner-only) | R3 | 5 | Écrit (partiel) | vue et corps masqué ; bras et arme à l'étape 11 |
| Squelette procédural + formes simples | Skeletal Mesh (Manny/MetaHuman) + `ABP_Thomas` | R19 / R20 | 4 | Écrit (partiel) | mannequin + ABP du modèle Third Person |

## 5. Caméra (étape 5)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| `PlayerCamera` 3e personne épaule | `USpringArmComponent` (décalage épaule) + `UCameraComponent` | R3 | 5 | Écrit | amélioration demandée : collision (sonde), interpolation (lag), transitions |
| Contournement des murs (`SpringArm3D`) | `bDoCollisionTest`, rayon de sonde | R3 | 5 | Écrit | |
| Rapprochement en visée | interpolation de `TargetArmLength` / `SocketOffset` / FOV | R3 | 5 | Écrit | |
| Tangage -1,15 → 0,85 rad | `ViewPitchMin/Max` du `PlayerCameraManager` (-66° / +49°) | R3 | 5 | Écrit | |
| Souris ×0,0022, stick 3,1 / 1,9 rad/s, inversion Y | Modificateurs Enhanced Input (Scalar, Negate, Dead Zone) | R4 | 5 / 6 | Écrit | |
| Tremblements (tirs, chocs) | `UCameraShakeBase` (Legacy / Perlin) × réglage « tremblements » | R3 | 5 | À faire | |
| « Focus » vers un point d'intérêt | `SetViewTargetWithBlend` / interpolation de rotation de contrôle | R3 | 5 / 15 | À faire | |
| Caméras de cinématique | `ACineCameraActor` + Level Sequences | R12 | 15 | À faire | |

## 6. Contrôles (étape 6)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| 23 actions de jeu (`input_setup.gd` : 19 + 4 de regard au stick) | 17 `UInputAction` (`IA_Move`, `IA_Look`, `IA_Run`, `IA_Interact`, `IA_Inventory`, `IA_Reload`, `IA_Flashlight`, `IA_Pause`, `IA_Dodge`, `IA_QuickHeal`, `IA_ToggleView`, `IA_Fire`, `IA_Aim`, `IA_WeaponNext`, `IA_WeaponPrev`, `IA_DebugConsole`, `IA_DebugPerf`) | C12 | 6 | Écrit | les 4 directions de déplacement et les 4 de regard deviennent deux actions 2D ; construites par le code (UBWInputConfig) |
| Touches physiques (ZQSD sur AZERTY) | Les touches Unreal sont positionnelles : même comportement | C12 | 6 | Écrit | ZQSD et WASD affectées |
| Manette (sticks, gâchettes, boutons, croix) | `IMC_Gamepad` | C12 | 6 | Écrit | mêmes affectations que Godot |
| Libellés Xbox / PlayStation / Nintendo | CommonInput (Controller Data par plateforme) | R4 | 6 / 13 | À faire | |
| Navigation des menus au stick avec répétition | CommonUI (navigation native) | R4 | 13 | À faire | |
| Vibrations | `UForceFeedbackEffect` + réglage « vibrations » | R4 | 6 | À faire | |
| Pause si la manette se déconnecte | `IPlatformInputDeviceMapper::OnInputDeviceConnectionChange` | R4 | 6 | À faire | |

## 7. Environnement, niveau et éclairage (étape 7)

| Godot | Unreal | Id | Étape | État | Remarques / comparaison |
| --- | --- | --- | --- | --- | --- |
| Niveau généré (9 étages, extérieur, 3 escaliers) | `L_BlackwoodHospital` : géométrie importée + acteurs placés par script | C7 / C8 | 7 | Écrit | **pas de niveau cassé** : chaque acteur vérifié au sol et accessible (test automatique) ; carte construite par Scripts/import_all.py |
| Coordonnées Godot (Y haut, m) | Unreal (Z haut, cm) | C7 | 7 | Écrit | conversion calibrée à l'import (trois repères d'axes) ; calibration automatique + commande BWTp |
| 77 zones (`Facility.ZONES`) | `ABWZoneVolume` (nom, étage, ambiances, surface) + `AAudioVolume` (réverbération) | C6 | 7 / 14 | Écrit (partiel) | nom affiché à la première visite ; ABWZoneVolume ; Audio Volumes à l'étape 14 |
| Un étage visible à la fois | Streaming / visibilité par étage (`ABWFloorManager`) ou occlusion simple | R21 | 7 / 18 | À faire | à décider après mesure GPU |
| 211 lumières omni + 2 projecteurs, `LightFixture` (modes) | `ABWLightFixture` (Point/SpotLight + maillage émissif, modes allumé / éteint / clignotant / pulsé) | C7 | 7 | Écrit | unités et exposition à régler à l'œil (Lumen) ; ABWLightFixture (même automate que Godot) |
| Coupure / retour du courant | `ABWLightFixture` piloté par le drapeau `power_restored` (délégué) | R12 | 7 / 15 | Écrit | réseau éteint tant que « power_restored » n'est pas posé |
| Alerte rouge par étage | idem, mode pulsé rouge | R12 | 15 | Écrit (partiel) | SetLightColor + mode pulsé ; déclenchement par le scénario (étape 15) |
| Ciel nocturne, lune, nuages | Sky Atmosphere + Directional Light (lune) + Volumetric Clouds | R21 | 7 | Écrit (partiel) | lune et ciel ; nuages à venir |
| Pluie, éclairs, tonnerre | Niagara + lumière directionnelle flash + son | R18 | 7 | À faire | |
| Brouillard volumétrique | Exponential Height Fog + Volumetric Fog | R21 | 7 | Écrit | |
| Post-traitement maison (`screen_fx`) | Post Process Volume + matériau post-process (grain, vignette, aberration, désaturation, voile rouge) | R17 | 7 | Écrit (partiel) | lié à la santé et aux réglages ; grain, vignette, aberration, bloom ; effets liés à la santé à l'étape 13 |
| 28 cadavres posés | `ABWCorpse` (Skeletal Mesh en pose fixe) | C7 / R19 | 7 | Écrit | poses à refaire (asset de pose) ; maillages figés dans leur pose (skinning calculé à l'extraction) |
| 243 panneaux (`Label3D`) | `UTextRenderComponent` ou décals texte | C7 | 7 | Écrit | textes identiques ; TextRender (police par défaut) |
| Obstacles de navigation (1 859) | NavMesh généré depuis les collisions | R11 | 7 / 12 | Écrit | NavMesh sur les collisions + NavMeshBoundsVolume |

## 8. Interactions (étape 8)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| `Interactable` (invite, rayon, focus, clé réseau) | Interface `IBWInteractable` + `ABWInteractableActor` | R6 | 8 | À faire | invite affichée par le HUD |
| Choix de l'objet le plus proche dans le champ | Recherche par sphère + score (distance, angle) côté client, validation serveur | R6 | 8 | À faire | mêmes rayons (1,6 à 1,9 m) |
| `rq_interact(key)` → hôte | RPC `Server_Interact(Actor)` sur le PlayerController | R6 / R16 | 8 | À faire | |
| `ExaminePoint` (41) | `ABWExaminePoint` (texte) | C7 | 8 | À faire | textes identiques |
| `SavePoint` (6) | `ABWSavePoint` → écran de sauvegarde | C7 | 8 / 16 | À faire | |
| `Phone` (2) | `ABWPhone` (sonnerie, décrocher → événement) | C7 | 8 / 15 | À faire | |
| `EventPoint` (4) | `ABWEventPoint` → Director | C7 | 8 / 15 | À faire | |

## 9. Inventaire (étape 9)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| 6 emplacements par joueur, piles | `ABWPlayerState.Inventory` (`TArray<FBWItemStack>`, répliqué) | R7 | 9 | Écrit | tailles de pile : 9mm 99, cartouches 30, .357 18, spray 3 ; algorithme identique à PlayerData |
| Armes à part, chargeur par arme | `ABWPlayerState.Weapons` (`TArray<FBWWeaponState>`) | R7 | 9 / 11 | Écrit | |
| Porte-clés commun | `ABWGameState.KeyRing` (répliqué) | R7 | 9 | Écrit | partagé en coop comme dans Godot |
| Documents (22) communs | `ABWGameState.Documents` + `DA_Doc_*` | C3 | 9 | Écrit | |
| Catalogue `ItemDB` (19 objets, 6 genres) | `UBWItemDefinition` (Data Asset) | C1 | 9 | Écrit | valeurs comparées par test automatique ; DA_Item_* + test de parité |
| `Pickup` (69), `DocumentPickup` (18) | `ABWPickup`, `ABWDocumentPickup` | C7 | 9 | À faire | identifiants `pickup_id` conservés |
| Utiliser (soin), équiper, examiner, lire | `WBP_Inventory` (UMG) + RPC serveur | R13 | 9 / 13 | À faire | |
| Objets « instant » (piles) et « outil » (lampe) | mêmes genres dans `EBWItemKind` | C1 | 9 | Écrit | |

## 10. Portes (étape 10)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| `Door` (72) : simple / double / vitrée / lourde | `ABWDoor` (charnières, sens d'ouverture selon le joueur) | R8 | 10 | Écrit (partiel) | `door_id` conservé ; état sauvegardé ; visuels et pivots placés ; ouverture à l'étape 10 |
| Verrous `NONE / LOCKED / KEY / ITEM / EVENT` | `EBWLockType` identique | R8 | 10 | À faire | 49 / 13 / 4 / 1 / 5 |
| Messages de porte verrouillée | propriétés texte de `ABWDoor` | C7 | 10 | À faire | textes identiques |
| Claquement scripté, ouverture forcée | fonctions `Slam()`, `ForceOpen()` (serveur, multicast des effets) | R8 | 10 | À faire | |
| Colossus : enfonce les portes | `ABWDoor::Breach()` appelé par l'IA | R8 / R11 | 10 / 12 | À faire | |
| `AutoDoor` (3) | `ABWAutoDoor` (détection + coulissement) | R8 | 10 | À faire | |
| Portes et navigation | `UNavModifierComponent` (zone bloquée si verrouillée) | R8 / R11 | 10 / 12 | À faire | |
| Cartes d'accès (2) | `EBWLockType::Key` avec l'objet carte | R8 | 10 | À faire | |

## 11. Combat et armes (étape 11)

| Godot | Unreal | Id | Étape | État | Remarques / comparaison |
| --- | --- | --- | --- | --- | --- |
| `WeaponDB` (5 armes) | `UBWWeaponDefinition` (Data Asset) ×4 | C2 | 11 | Conception modifiée | **matraque retirée** (voir §20) ; données écrites (DA_Weapon_*, 4 armes) |
| Tir « hitscan » (pistolet, PM, magnum) | Line trace serveur (`BW_Weapon`), dispersion visée / hanche | R10 | 11 | À faire | mêmes dégâts, portée, cadence ; test de stand de tir comparatif |
| Plombs (fusil, 9) | 9 traces avec graine de dispersion transmise | R10 | 11 | À faire | reproduit le `shot_seed` Godot |
| Coup à la tête ×1,6 à ×2,6 | os `head` / Physical Material `PM_Head` | R10 | 11 | À faire | |
| Traversée (magnum) | trace multiple | R10 | 11 | À faire | |
| Rechargement (fusil : cartouche par cartouche) | Montages + état répliqué | R10 | 11 | À faire | |
| Recul, tremblement, dispersion croissante (PM) | Camera Shake + contrôle du recul | R10 | 11 | À faire | |
| Bruit des armes (26 à 45 m) | `ReportNoiseEvent` (même portée) | R10 | 11 | À faire | |
| Vacillement (« stagger ») | réaction de l'IA (tâche BT / montage) | R11 | 11 / 12 | À faire | |
| Flash, douilles, impacts, sang, trous | Niagara + Decals | R18 | 11 | À faire | |
| `rq_fire` avec graine, confirmation `ack` | RPC `Server_Fire(Origin, Dir, Seed)` + prédiction locale des effets | R16 | 11 / 17 | À faire | |
| Bouteilles d'O₂ explosives (5) | `ABWExplosiveTank` (dégâts de zone, faiblesse du Chirurgien) | R8 | 11 | À faire | |
| Vitres brisables (3) | `ABWBreakableGlass` (Chaos ou maillage + Niagara) | R8 | 11 | À faire | |

## 12. IA (étape 12)

| Godot | Unreal | Id | Étape | État | Remarques / comparaison |
| --- | --- | --- | --- | --- | --- |
| `Enemy` : FSM 8 états | `ABWEnemyAIController` + `BT_Enemy` (Behavior Tree) + `BB_Enemy` (Blackboard) | R11 | 12 | À faire | états : IDLE, PATROL, INVESTIGATE, CHASE, ATTACK, SEARCH, RETURN, DEAD |
| Vue 7 m / 11 m (joueur éclairé), cône | `UAISenseConfig_Sight` + bonus si la lampe éclaire | R11 | 12 | À faire | mêmes portées |
| Ouïe (`hearing_scale`) | `UAISenseConfig_Hearing` + `ReportNoiseEvent` | R11 | 12 | À faire | |
| Proximité 2,2 m | service BT (distance) | R11 | 12 | À faire | |
| Perte 5 s, recherche 10 s, abandon 24 m, retour | décorateurs / services BT + EQS pour la recherche | R11 | 12 | À faire | |
| Attaque (armement, dégâts, récupération) | tâche BT `BTTask_BWAttack` + montage | R11 | 12 | À faire | |
| Endormi / passif / réveil / patrouille | clés Blackboard + décorateurs | R11 | 12 | À faire | |
| `NavGrid` A* 25 cm | NavMesh (agent créature, rayon ≈ 0,35-0,45 m) | R11 | 12 | À faire | |
| Choix de la cible parmi les joueurs | service BT (distance, bruit, dégâts reçus) | R11 / R16 | 12 / 17 | À faire | |
| Hollow ×5 variantes | `DA_Enemy_hollow_{patient,nurse,guard,neuro,experimental}` | C5 | 12 | Écrit (partiel) | statistiques de l'audit §5.2 ; DA_Enemy_* ; points d'apparition placés |
| Veilleur (aveugle, ouïe ×2,2) | `BP_Veilleur` + règles de perception | R11 | 12 | À faire | marcher lentement ne le réveille pas |
| Néonatal (gaines) | NavLinks entre bouches d'aération + disparition | R11 | 12 | À faire | 3 bouches |
| Colossus (quasi invulnérable, portes) | `BP_Colossus` + `ABWDoor::Breach` | R11 | 12 | À faire | 6 000 PV |
| Chirurgien (lame, charge, étourdissement, O₂) | `BT_Surgeon` | R11 | 12 | À faire | boss 1, 900 PV |
| Sarah (bond, cri, 2 hésitations) | `BT_Sarah` + événements vers le Director | R11 | 12 / 15 | À faire | boss 2, 1 300 PV |
| Patient Zéro (régénération, cri, mutants) | `BT_PatientZero` + apparition de mutants | R11 | 12 / 15 | À faire | boss 3, 2 200 PV |
| Réplication (hôte simule, invités interpolent) | IA serveur uniquement ; mouvement répliqué par le Character | R16 | 12 | À faire | natif dans Unreal |

## 13. Interface (étape 13)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| `UIRoot` (pile d'écrans, messages, sous-titres, fondus, cartes de titre, barre de boss, autosave) | `WBP_Root` + CommonUI (pile d'activables) | R13 | 13 | À faire | |
| `HUD` + ECG | `WBP_HUD`, `WBP_ECG` | R13 | 13 | Écrit (partiel) | santé, munitions, ceinture d'armes, lampe, réticule, objectif, compte à rebours, partenaire ; surimpression de débogage F3 ; HUD UMG à l'étape 13 |
| Menu principal (décor 3D) | `WBP_MainMenu` + `L_MainMenu` | R13 | 13 | À faire | |
| Pause, Options (5 onglets), Inventaire, Documents, Clavier à code, Ascenseur, Sauvegarde, Mort, Fin, Coop, Console | `WBP_Pause`, `WBP_Options`, `WBP_Inventory`, `WBP_Document`, `WBP_Keypad`, `WBP_Elevator`, `WBP_SaveSlots`, `WBP_Death`, `WBP_Ending`, `WBP_Coop`, console Unreal | R13 | 13 | À faire | libellés identiques (menus en anglais, jeu en français) |
| Icônes vectorielles (`item_icon.gd`) | textures d'icônes (rendues depuis les modèles) | R13 | 13 | À faire | |
| Thème (`ui_theme.gd`, 4 polices) | Styles CommonUI + polices importées | A5 / R13 | 13 | À faire | |

## 14. Audio (étape 14)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| Bus Music / SFX / Ambience / UI + Master | Sound Classes `SC_Music`, `SC_SFX`, `SC_Ambience`, `SC_UI` + `SCM_Volumes` (Sound Class Mix) | R14 | 14 | À faire | volumes des réglages |
| Pool de 40 sons 3D, atténuation | `PlaySoundAtLocation` + `SA_Default` (Sound Attenuation) + concurrence | R14 | 14 | À faire | |
| Variantes `nom_1…n` | Sound Cue (Random) ou MetaSound | A4 / R14 | 14 | Écrit | |
| Boucles avec fondus (ambiances, musiques) | `UAudioComponent` persistants (`FadeIn` / `FadeOut`) | R14 | 14 | À faire | |
| 6 préréglages de réverbération par zone | `AAudioVolume` + Reverb Effects (`RE_Outdoor`, `RE_Room`, `RE_Corridor`, `RE_Hall`, `RE_Basement`, `RE_Tunnel`) | R14 | 14 | À faire | |
| Étouffement (filtre passe-bas) | Sound Mix (LPF) | R14 | 14 | À faire | |
| Pas par surface | surface de la zone ou Physical Material | R14 | 14 | Écrit | |

## 15. Événements, scénario, énigmes (étape 15)

| Godot | Unreal | Id | Étape | État | Remarques / comparaison |
| --- | --- | --- | --- | --- | --- |
| `EventDirector` (hôte) | `ABWDirector` (serveur) ou `UBWDirectorSubsystem` | R12 | 15 | À faire | même table déclencheur → événement (audit §4.10) |
| `TriggerZone` (23) | `ABWTriggerVolume` (identifiant texte) | C7 / R12 | 15 | Écrit | ABWTriggerVolume → ABWGameState::OnTriggerFired |
| Drapeaux (`set_flag`, `flag_changed`) | `ABWGameState::SetFlag` + délégué `OnFlagChanged` | R12 | 15 | Écrit | noms de drapeaux identiques |
| `apply_world_state` (reprise après chargement) | `ABWDirector::ApplyWorldState()` | R12 | 15 / 16 | À faire | test : recharger chaque autosave (21 cas Godot) |
| `Stage` (mise en scène rejouée chez l'invité) | RPC `NetMulticast` (sons, sous-titres, fondus, caméra, barre de boss) | R12 / R16 | 15 / 17 | À faire | |
| Dialogues / sous-titres | String Table `ST_Dialogues` + file de sous-titres | C11 | 15 | À faire | textes identiques |
| Intro, fin, vidéo de Sarah, scènes de boss | Level Sequences | R12 | 15 | À faire | |
| Objectifs (26 conditions) | `UBWObjectives::GetCurrent()` (même ordre de tests) | C4 | 15 | Écrit | comparaison automatique avec des états de test ; FBWObjectives + test automatique |
| Disjoncteurs (ordre pompe → G1 → transfert) | `ABWSwitchPanel` ×3 + Director | R9 | 15 | À faire | |
| Codes 0612 / 0309 | `ABWCodePanel`, `ABWKeypadSafe` + `WBP_Keypad` | R9 | 15 | À faire | |
| Fusible, casier, coffre | `ABWMechanism`, `ABWLockerBox`, `ABWKeypadSafe` | R9 | 15 | À faire | |
| Ascenseurs (3, règles) | `ABWElevatorPanel` + `DA_Elevator_*` + `WBP_Elevator` + téléportation vers les repères | C6 / R9 | 15 | À faire | voyage commun en coop |
| Compte à rebours 300 / 240 / 200 s | `ABWGameState.Countdown` répliqué | R12 | 15 | Écrit (partiel) | état répliqué ; déclenchement à l'étape 15 |
| Ambiance aléatoire, éclairs | minuteurs du Director | R12 | 15 | À faire | |

## 16. Sauvegarde (étape 16)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| `autosave.json` + `slot_1…3.json` | `SaveGameToSlot("autosave")`, `"slot_1…3"` | R15 | 16 | Écrit | |
| `state` (monde + joueur 1 + autres joueurs) | `UBWSaveGame` : `FBWWorldSave` + `TArray<FBWPlayerSave>` | C14 | 16 | Écrit | correspondance champ à champ (audit §4.14) |
| `player.pos` / `yaw` | `FVector` / `float` (converti en cm) | C14 | 16 | Écrit | |
| `zone_name`, `saved_at`, temps de jeu | mêmes champs (résumé des emplacements) | C14 | 16 | Écrit | |
| Autosave (délai 1 s, pas pendant un voyage ni après la mort) | `UBWSaveSubsystem::AutoSave(Reason)` | R15 | 16 | Écrit | |
| Reprise de l'état (portes, objets pris, ennemis morts, drapeaux) | `ApplyWorldState` + suppression des acteurs déjà pris / tués | R15 | 16 | À faire | test de rechargement de chaque point |
| Coop : seul l'hôte sauvegarde | `HasAuthority()` | R16 | 16 | Écrit | |

## 17. Coop (étape 17)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| ENet port 24890, 2 joueurs | Serveur d'écoute (`?listen`), `MaxPlayers=2` | R16 | 17 | Écrit | port 24890, 2 joueurs max, places P1 / P2 |
| Recherche LAN UDP 24891 | Sessions Online Subsystem Null (`bIsLANMatch`) | R16 | 17 | À faire | |
| Rejoindre par IP | `open <ip>` / `ClientTravel` | R16 | 17 | Écrit | Scripts/RunCoop.bat |
| 29 RPC (`rq_*`, `ev_*`, `st_*`) | RPC Server / Client / NetMulticast + réplication de propriétés | R16 | 17 | À faire | la plupart des `st_*` deviennent inutiles (réplication native) |
| Objets personnels / partagés | PlayerState (personnels) / GameState (partagés) | R16 | 17 | Écrit | |
| À terre, réanimation, GAME OVER | états répliqués + règle du GameMode | R16 | 17 | Écrit (partiel) | états ; règles à l'étape 17 |
| Départ du 2e joueur sans plantage | `Logout` du GameMode | R16 | 17 | À faire | |
| Proxy de latence (tests) | `Net PktLag` / `PktLoss` (console) | R22 | 17 | À faire | |

## 18. Optimisation (étape 18) et polish (étape 19)

| Godot | Unreal | Id | Étape | État | Remarques |
| --- | --- | --- | --- | --- | --- |
| Géométrie fusionnée par zone × matériau | Nanite + instancing | R21 | 18 | À faire | |
| Un étage éclairé à la fois | Culling des lumières par étage / portée d'atténuation | R21 | 18 | À faire | |
| Ennemis hors étage désactivés | Significance Manager / tick désactivé | R11 | 18 | À faire | |
| Qualité / ombres / effets réglables | Scalability (`sg.*`), `UBWGameUserSettings` | C13 | 18 | À faire | |
| Modèles procéduraux simples | Modèles réalistes sous licence | R20 | 19 | À faire | voir §20 |

## 19. Tests de validation (comparaison Godot / Unreal)

| Test Godot (référence) | Test Unreal prévu | Étape | État |
| --- | --- | --- | --- |
| Valeurs des tables (objets, armes, ennemis, objectifs) | Automation Test `Blackwood.Data.*` : valeurs identiques au JSON exporté de Godot | 3 | Écrit |
| `interact_audit` (230 objets) | `Blackwood.Level.Interactables` : chaque acteur au sol, atteignable, rayon correct | 7-8 | À faire |
| `level_tour` (toutes les zones) | `Blackwood.Level.Navigation` : chemin NavMesh entre les points de progression | 7 / 12 | À faire |
| `weapons_range` | map `L_Test_Weapons` : dégâts / cadence / dispersion | 11 | À faire |
| `checkpoints` (21 rechargements) | `Blackwood.Save.RoundTrip` : sauver / charger chaque étape | 16 | À faire |
| `autoplay` (campagne complète) | robot de campagne (Functional Test / Gauntlet) | 15-19 | À faire |
| `coop_test`, latence | 2 instances (serveur d'écoute + client), `Net PktLag` | 17 | À faire |
| `gamepad`, `ui_flows` | tests UMG / CommonUI | 13 | À faire |

## 20. Changements de conception (demandés par l'utilisateur)

| Godot (actuel) | Unreal (nouveau) | Étape | État | Remarques |
| --- | --- | --- | --- | --- |
| Matraque télescopique (`baton`) au poste de sécurité (rez-de-chaussée) | **Supprimée** : objet, arme, sons `baton_*`, modèle | 9 / 11 | Conception modifiée | l'ordre des armes devient pistolet, fusil, PM, magnum ; retirée des données Unreal (import + test de parité) |
| Pistolet au 1er étage (radiologie, `f1_pistol`) | **Pistolet sur un policier mort à côté de l'ambulance** (quai des ambulances, -1), objet `b1_police_pistol`, avant le premier infecté | 7 / 9 | Conception modifiée | le pistolet de la radiologie devient une boîte de 9mm au même endroit |
| L'agent de sécurité se relève quand on prend la matraque (`picked_f0_baton`) | Il se relève quand Thomas entre dans le poste de sécurité (nouveau déclencheur `f0_security`) | 15 | Conception modifiée | la matraque du poste devient des munitions 9mm |
| Premier infecté : fuite obligatoire (aucune arme) | Fuite possible **ou** combat au pistolet | 15 | Conception modifiée | objectif et dialogues inchangés |
| Accessoires procéduraux (fauteuil roulant, ambulance, lits, chaises, voitures…) | Modèles réalistes sous licence (Poly Haven CC0, Fab, Quixel Megascans via Fab, MetaHuman) | 19 | À faire | chaque asset ajouté à `ASSET_INVENTORY.md` avant import |
