# BLACKWOOD_UNREAL — Blackwood Hospital sous Unreal Engine 5

Reconstruction du jeu Godot (`../blackwood`, qui reste la référence et n'est pas modifié) dans
Unreal Engine 5. Documents de référence :

- `MIGRATION_AUDIT.md` : audit complet du projet Godot et les trois listes (transfert automatique,
  conversion, reconstruction) ;
- `MIGRATION_MATRIX.md` : correspondance Godot → Unreal, système par système, avec l'état de chaque ligne ;
- `ASSET_INVENTORY.md` : les 467 assets, leur licence et leur destination dans Unreal.

## Où en est la migration (jalon 1)

Écrit et vérifié dans l'environnement de travail (Linux, **sans Unreal**) :

| Élément | Vérification faite |
| --- | --- |
| Extraction Godot → Unreal (`Tools/GodotExport`) | exécutée : 248 maillages, 164 matériaux, 454 objets placés, 0 avertissement ; géométrie rechargée et comparée visuellement au jeu Godot (mêmes vues) |
| Données de jeu (`SourceData/*.json`) | extraites du jeu Godot (objets, armes, documents, objectifs, ennemis, zones, niveau, matériaux) |
| Code C++ du module `Blackwood` (19 fichiers) | vérification de syntaxe et de cohérence avec une API Unreal simulée (g++ et clang, 0 erreur, 0 avertissement) — **pas encore compilé avec Unreal** |
| Script d'import (`Scripts/import_all.py`) | syntaxe Python vérifiée, calculs de conversion d'axes testés hors Unreal — **pas encore exécuté dans Unreal** |

La **compilation, l'import et les tests en jeu doivent se faire sur un PC où Unreal est installé**
(voir « Mise en route »). Tant qu'ils ne l'ont pas été, aucune ligne de `MIGRATION_MATRIX.md` n'est
marquée « Validé ».

Contenu du jalon 1 : projet et configuration (Lumen, Virtual Shadow Maps, Nanite, canaux de collision,
coop LAN), architecture réseau (GameMode, GameState, PlayerState, PlayerController, Character
répliqués), personnage (marche, course, visée, esquive, santé), caméra à l'épaule avec collision et
vue à la première personne, contrôles clavier/souris/manette (AZERTY et QWERTY), lampe torche à
batterie, pas selon la surface et bruit pour les futures créatures, zones et déclencheurs du scénario,
luminaires (clignotements, coupure de courant), sauvegarde/chargement, surimpression de débogage,
commandes de test et tests automatisés de comparaison avec Godot. La carte est construite
automatiquement à partir du niveau Godot : décor, collisions, accessoires, portes et objets (visuels),
luminaires, panneaux, cadavres, zones, déclencheurs, points d'apparition des créatures, repères.

Pas encore reconstruit (étapes suivantes, dans l'ordre imposé) : interactions (ramasser, ouvrir),
inventaire à l'écran, portes qui s'ouvrent, combat, IA, interface UMG, ambiances sonores, scénario,
coop complète (à terre / réanimation), optimisation, modèles réalistes.
Dans ce jalon, les portes sont visibles mais **ne bloquent pas le passage** (une porte qui ne s'ouvre pas
encore ne doit pas bloquer la visite du niveau).

## Mise en route (PC Windows)

**Le plus simple** : installer les pré-requis ci-dessous, puis double-cliquer **`Scripts\SetupAll.bat`**.
Il vérifie les outils, décompresse les maillages extraits, copie le mannequin d'Unreal, compile,
lance l'import (l'éditeur s'ouvre puis se ferme tout seul) et les tests, et affiche le résultat.
Unreal est trouvé automatiquement (registre de l'Epic Games Launcher, puis `C:\Program Files\Epic Games`) ;
sinon, indiquer son dossier : `Scripts\SetupAll.bat "D:\Epic Games\UE_5.8"`.
Les étapes détaillées ci-dessous restent utiles en cas d'erreur.

Paquet complet sans Git : `Blackwood_Unreal_complet.zip` (livré en morceaux avec `REASSEMBLER_Unreal.bat`)
contient `BLACKWOOD_UNREAL/`, les maillages extraits et la partie du jeu Godot nécessaire à l'import
(textures, sons, polices, zombie). Décompresser, puis `BLACKWOOD_UNREAL\Scripts\SetupAll.bat`.

### 1. Pré-requis

- Windows 10/11, carte graphique DirectX 12 récente ;
- **Unreal Engine 5** installé par l'Epic Games Launcher (5.8 conseillé, 5.4 minimum) ;
- **Visual Studio 2022** (gratuit, édition Community) avec la charge de travail « Développement de jeux
  en C++ » (elle ajoute le SDK Windows) — nécessaire pour compiler le code C++ du projet ;
- environ 30 Go libres.

### 2. Fichiers

- Récupérer ce dépôt (branche `claude/blackwood-horror-game-9whl83`) : `blackwood/` et `BLACKWOOD_UNREAL/`
  doivent rester côte à côte (l'import lit les textures, sons et polices dans `blackwood/`).
- Décompresser le paquet **`BLACKWOOD_UNREAL_SourceAssets.zip`** (fourni avec cette version) dans
  `BLACKWOOD_UNREAL/` : il crée `SourceAssets/Meshes/` (géométrie extraite, non versionnée car volumineuse).
  Pour le régénérer : Godot 4.7 puis `python BLACKWOOD_UNREAL/Tools/GodotExport/export_godot.py --godot <godot.exe>`.

### 3. Compiler (COMPILE)

1. Clic droit sur `Blackwood.uproject` > « Switch Unreal Engine version… » > choisir la version installée.
2. Double-cliquer `Scripts\Build.bat` (ou ouvrir le `.uproject` et accepter la compilation).
   En cas d'erreur, le journal indique le fichier et la ligne : c'est ce qu'il faut corriger en premier.

### 4. Mannequin provisoire (recommandé)

Dans l'éditeur : Content Drawer > **Add** > « Add Feature or Content Pack » > **Third Person** > Add to Project.
Le script d'import s'en sert comme modèle provisoire de Thomas (sinon Thomas est invisible à la 3e personne).
Thomas et Sarah définitifs : MetaHuman ou modèles Fab (étape 19).

### 5. Importer (une fois, 5 à 15 minutes)

Double-cliquer `Scripts\RunImport.bat` (ou, dans l'éditeur : Outils > « Exécuter un script Python… » >
`Scripts/import_all.py`). Le script importe les textures (normales OpenGL retournées), crée les
matériaux maîtres et 164 instances, importe les maillages (Nanite sur le décor opaque), les 153 sons,
les 4 polices, le zombie, crée les Data Assets et construit la carte `L_BlackwoodHospital`.
Rapport : `Saved/Blackwood/import_report.txt`. Ensuite : Fichier > Tout enregistrer.

Si les murs paraissent unis ou noirs : dans `Scripts/import_all.py`, mettre `SIMPLE_MATERIALS = True` et
relancer (matériaux de secours sans projection monde).
Si votre version d'Unreal refuse les `.ogg` : `python Tools/GodotExport/convert_audio.py` puis relancer l'import.

### 6. Tester (TESTE)

- `Scripts\RunTests.bat` : tests automatisés `Blackwood.*` (valeurs identiques à Godot, règles des
  objectifs, inventaire). Résultats : `Saved/Automation/`.
- Jouer : Alt+P dans l'éditeur, ou `Scripts\RunGame.bat`. F3 affiche la surimpression de débogage
  (coordonnées Godot, zone, santé, lampe, inventaire, objectif).
- Coop : `Scripts\RunCoop.bat` (un hôte + un invité sur le même PC), ou dans l'éditeur : Play >
  Number of Players = 2, Net Mode = Play As Listen Server.

Commandes de test (console : touche ² ou `) :

| Commande | Effet |
| --- | --- |
| `BWFlag has_flashlight 1` | pose un drapeau de progression (ici : lampe utilisable, touche F) |
| `BWGive pistol` · `BWGive ammo_9mm 12` · `BWGive key_technical` | donne un objet, une arme ou une clé |
| `BWTp 38.2 -4 -7.8` | téléporte aux coordonnées **Godot** (ici : le quai des ambulances) |
| `BWSave 1` · `BWLoad 1` | sauvegarde / charge (0 = automatique, 1 à 3 = manuels) |
| `BWGod` · `BWDifficulty 2` | invulnérabilité · difficulté (0 facile, 1 normal, 2 difficile) |

### Réglages utiles

- Paramètres du projet > Jeu > **Blackwood** : `LightIntensityScale` (candelas par unité de lumière Godot)
  règle d'un coup tous les luminaires et la lampe ; les axes de conversion Godot → Unreal (calibrés
  automatiquement par l'import).
- Le volume de post-traitement « PostProcess » de la carte règle l'exposition automatique, le grain,
  le vignettage et le bloom.

## Travailler avec Claude sur le PC

Pour que la boucle COMPILE → LANCE → TESTE → CORRIGE → RETESTE se fasse sans intermédiaire, ouvrir ce
dépôt avec Claude Code sur le PC (application Claude Desktop, onglet Code, ou `claude` dans un terminal) :
les scripts `Scripts/*.bat` lui permettent de compiler, importer, lancer les tests et lire les journaux.

## Dépôt et Lovable

Ce dépôt est synchronisé avec Lovable. Les assets importés par Unreal (`Content/**/*.uasset`, `*.umap`)
et les sources volumineuses (`SourceAssets/`) sont exclus de Git (`.gitignore`) : ils se régénèrent
avec les scripts. Pour les versionner, utiliser Git LFS ou un dépôt séparé.

## Licences

Aucun asset de licence inconnue, extrait d'un jeu ou piraté. Registre : `ASSET_INVENTORY.md`
(recopié de `blackwood/Documentation/ASSET_LICENSES.md`). Tout nouvel asset (Fab, Quixel Megascans,
Poly Haven, MetaHuman…) y est inscrit avec sa licence avant d'être importé.
