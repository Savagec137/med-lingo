# Consignes pour Claude (session sur le PC de l'utilisateur)

Ce dossier est la reconstruction Unreal Engine 5 du jeu Godot situé dans `../blackwood`.
Le projet Godot est la **référence de comportement et de contenu** : ne jamais le modifier ni le
supprimer (sauf demande explicite de l'utilisateur). L'utilisateur écrit en français : lui répondre
en français, simplement, sans jargon inutile.

## À lire d'abord

1. `README.md` : état du jalon 1, mise en route, commandes de test.
2. `MIGRATION_MATRIX.md` : chaque système Godot → Unreal avec son état (À faire / Écrit / Compilé /
   Validé / Conception modifiée). Le tenir à jour honnêtement : « Validé » seulement après un test
   dans Unreal comparé au comportement Godot.
3. `MIGRATION_AUDIT.md` : l'audit du jeu Godot (valeurs, scénario, IA, niveaux, sauvegarde…).

## Première mission : compiler, importer, tester

Le code C++ (`Source/Blackwood`) et le script d'import (`Scripts/import_all.py`) ont été écrits dans
un environnement sans Unreal : **ils n'ont jamais été compilés ni exécutés**. Des écarts d'API selon
la version du moteur sont probables. Boucle à suivre : COMPILE → LANCE → TESTE → CORRIGE → RETESTE.

| Étape | Commande | Journal |
| --- | --- | --- |
| Tout en un | `Scripts\SetupAll.bat` | `Saved\Blackwood\` |
| Compiler | `Scripts\Build.bat` | sortie de la commande (`Saved\Blackwood\build.log` via SetupAll) |
| Importer (éditeur, puis fermeture automatique) | `UnrealEditor.exe Blackwood.uproject -ExecutePythonScript=Scripts\import_all.py -BWQuitAfterImport` | `Saved\Blackwood\import_report.txt`, `Saved\Logs\Blackwood.log` |
| Tests automatiques | `Scripts\RunTests.bat` | `Saved\Automation\index.json` |
| Jouer | `Scripts\RunGame.bat` · coop : `Scripts\RunCoop.bat` | `Saved\Logs\` |

Points à vérifier en priorité après l'import :
- la calibration des axes (rapport d'import : « Calibration des axes ») et que le niveau n'est pas en miroir
  (les panneaux « URGENCES », « ACCUEIL » doivent se lire normalement) ;
- les liaisons de matériaux refusées (rapport) : si les murs sont unis, corriger les noms d'entrées des
  fonctions WorldAlignedTexture / WorldAlignedNormal, ou `SIMPLE_MATERIALS = True` ;
- la lumière (`LightIntensityScale` dans Paramètres du projet > Blackwood, exposition du PostProcess) :
  comparer avec des captures du jeu Godot aux mêmes endroits (`BWTp <x> <y> <z>` en coordonnées Godot) ;
- la surimpression F3 et les commandes `BW*` (voir README).

## Suite de la migration (ordre imposé par l'utilisateur)

1 Projet · 2 Architecture · 3 Assets · 4 Personnage · 5 Caméra · 6 Contrôles · 7 Environnement ·
8 Interactions · 9 Inventaire · 10 Portes · 11 Combat · 12 IA · 13 UI · 14 Audio · 15 Événements ·
16 Sauvegarde · 17 Coop · 18 Optimisation · 19 Polish.
Les étapes 1 à 7 sont écrites en grande partie ; la prochaine est l'étape 8 (interactions).
Reconstruire chaque système avec les outils Unreal (pas de traduction mécanique du GDScript), garder
tout compatible réseau (serveur autoritaire, coop à 2), et comparer à Godot par des tests.

Changements de conception voulus par l'utilisateur (ne pas « corriger » vers Godot) :
- la matraque est supprimée ;
- le pistolet se trouve sur le corps d'un policier mort à côté de l'ambulance (quai des ambulances,
  sous-sol -1), avant le premier infecté ; le pistolet de la radiologie devient des munitions ;
  l'agent de sécurité du rez-de-chaussée se relève quand Thomas entre dans le poste de sécurité ;
- les modèles simples (fauteuil roulant, ambulance…) seront remplacés par des modèles réalistes sous
  licence vérifiée (Poly Haven CC0, Fab, MetaHuman), inscrits dans `ASSET_INVENTORY.md` avant import.

## Règles du dépôt

- Branche : `claude/blackwood-horror-game-9whl83`. Le dépôt est synchronisé avec Lovable : jamais de
  force-push ni de réécriture d'historique déjà poussé.
- Ne pas versionner les assets importés (`Content/**/*.uasset`, `*.umap`) ni `SourceAssets/` : ils se
  régénèrent (voir `.gitignore`). Versionner le code, la configuration, les scripts et la documentation.
- Aucun asset de licence inconnue, extrait d'un jeu commercial ou piraté.
- Messages de commit en français, décrivant ce qui a été vérifié et ce qui ne l'a pas été.
