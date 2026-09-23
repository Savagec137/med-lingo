# BLACKWOOD — Chapitre 1 : Le Signal

Survival horror à la troisième personne, jouable de bout en bout (environ 15 à 30 minutes).
Univers, personnages, créatures, sons et textes 100 % originaux.

> Ethan Cole reçoit un appel coupé de sa sœur Lena, chercheuse au Blackwood Research
> Facility. Il s'y rend de nuit. Le centre est fermé depuis des mois… mais les lumières
> sont allumées.

## Lancer le jeu

1. Installer **Godot 4.7** (version standard, pas .NET) : <https://godotengine.org/download>.
   Le projet est testé avec Godot 4.7.2 stable.
2. Dans le gestionnaire de projets de Godot : **Importer**, puis choisir `blackwood/project.godot`.
3. Appuyer sur **F5** (ou le bouton ▶ « Exécuter le projet »).

En ligne de commande :

```bash
godot --path blackwood                       # menu principal
godot --path blackwood -- --new-game         # directement en partie
godot --path blackwood -- --load=1           # charge l'emplacement 1 (0 = sauvegarde auto)
```

Au premier lancement, Godot importe les ressources (quelques secondes).

## Contrôles

Les touches sont liées à leur **position physique** : sur un clavier AZERTY, WASD devient ZQSD.

| Action | Touche |
| --- | --- |
| Se déplacer | W A S D (ZQSD en AZERTY) ou flèches |
| Courir | Maj (Shift) |
| Caméra | Souris |
| Viser | Clic droit (maintenu) |
| Tirer | Clic gauche |
| Recharger | R |
| Interagir / ouvrir / ramasser / lire | E |
| Lampe torche | F |
| Esquive / pas en arrière | Espace |
| Soin rapide (Medical Spray) | H |
| Inventaire | Tab (ou I) |
| Pause | Échap |
| Compteur de performances (FPS, appels de dessin) | F3 |

Les options (volumes, sensibilité, inversion Y, luminosité, lampe, champ de vision,
qualité graphique, plein écran) se trouvent dans **OPTIONS** (menu principal ou pause).
Avec une machine modeste, passer la qualité graphique sur **MOYENNE** ou **BASSE**.

## Contenu

- **10 zones** : parking, entrée principale, hall d'accueil, couloir administratif,
  salle d'archives, salle de sécurité, laboratoire, sous-sol, salle du générateur, sortie
  (tunnel de service). Plus : bureau de Lena, infirmerie, salle de repos, réserve,
  salle d'examen, bureau vitré, local de maintenance, morgue.
- **Joueur** : caméra épaule avec amorti, anti-collision, recul et tremblements ;
  course, visée, esquive, lampe torche à batterie (piles, clignotements, coupures).
- **Pistolet 9mm** : chargeur de 12, rechargement, dispersion, recul, impacts,
  tirs à la tête. Munitions rares.
- **Créatures** (machine à états IDLE / PATROL / INVESTIGATE / CHASE / ATTACK / SEARCH /
  RETURN / DEAD, ouïe et vue) :
  - **The Hollow** : patrouille, entend le bruit (pas, course, tirs), poursuit, frappe,
    perd la trace, fouille, puis revient.
  - **The Surgeon** : lent, très résistant, charges dévastatrices ; sa respiration et le
    raclement de sa lame l'annoncent.
- **Inventaire** de 6 cases, **9 documents**, **énigme** du coffre des archives,
  portes normales / verrouillées / à clé / à objet / à évènement.
- **Sauvegarde** : 3 emplacements (magnétophones) + sauvegarde automatique aux moments
  clés. **RETRY** après la mort repart de la dernière sauvegarde automatique.
- **Son** : 125 sons (ambiances, pas selon le sol, portes, créatures, armes, musique
  minimale) générés par synthèse ; réverbération selon la pièce.

## Tests automatisés

Toutes les commandes se lancent depuis `blackwood/`.

```bash
# Campagne complète jouée par un robot : menu → NEW GAME → … → fin → retour au menu.
# Code de sortie 0 si tout le parcours réussit. (~40 s en --headless)
godot --headless --fixed-fps 60 --path . -- --autoplay

# Même chose avec rendu et captures d'écran à chaque étape (lent sans GPU)
godot --fixed-fps 60 --path . -- --autoplay --shots=/chemin/vers/captures

# Chaque objet interactif est-il atteignable et visible ?
godot --headless --path . res://tests/interact_audit.tscn

# Construction du niveau, statistiques et chemins de navigation attendus
godot --headless --path . res://tests/level_tour.tscn
```

## Organisation

```
assets/     polices (+ licences)
audio/      sons .ogg (générés par tools/gen_audio.py)
data/       objets, documents, objectifs
enemies/    Enemy (machine à états), Hollow, Surgeon
items/      interactions : portes, objets, documents, coffre, mécanismes, disjoncteurs…
materials/  matériaux et shaders (surfaces procédurales, sang, écrans, liquide, ciel…)
player/     joueur, caméra, lampe, pistolet, squelette articulé
save/       système de sauvegarde (user://saves)
scenes/     main.tscn
scripts/    core/ (autoloads), level/ (construction du centre), game/ (partie, évènements)
tests/      robot de campagne, audit des interactions, visite du niveau
tools/      gen_audio.py (synthèse des sons)
ui/         menus, HUD, inventaire, documents, clavier, sauvegardes, fin
```

Le centre est construit par code (`scripts/level/build_*.gd`) à partir de primitives
regroupées par matériau : chaque meuble est une fonction de `props.gd`, facile à
remplacer par un modèle 3D importé.

## Remplacer les ressources

- **Sons** : déposer un fichier `.ogg` ou `.wav` du même nom dans `audio/`
  (`nom_1`, `nom_2`… pour des variantes tirées au hasard). Pour régénérer les sons
  d'origine : `pip install numpy scipy soundfile` puis `python3 tools/gen_audio.py`.
- **Matériaux** : table `SURFACES` de `materials/materials.gd`.
- **Textes** : `data/documents.gd`, `data/objectives.gd`.

## Licences des ressources

- Code, sons, géométrie, shaders et textes : créés pour ce projet.
- Polices : Cormorant Garamond, Oswald et Caveat (SIL Open Font License 1.1),
  Special Elite (Apache 2.0). Licences dans `assets/fonts/`.

<details>
<summary><strong>Solution complète (spoilers)</strong></summary>

1. Parking : entrer dans le bâtiment. Le téléphone du hall sonne : décrocher.
2. Hall : clé de l'administration derrière l'accueil. Magnétophone sur le comptoir.
3. Couloir administratif → bureau de Lena → salle d'archives (coupure de courant) :
   lampe torche sur le bureau de l'archiviste. Trois armoires portent un symbole.
4. Une créature sort de la salle de sécurité. Sans arme : éteindre la lampe, ne pas
   courir, se cacher dans la salle de repos, la laisser passer. Le pistolet est dans
   la salle de sécurité.
5. L'aide-mémoire de l'archiviste (salle de sécurité) donne l'ordre des symboles :
   **lune (3) → cœur (1) → œil (4)** : le coffre des archives s'ouvre avec **314**.
   Il contient un fusible, des munitions et un document.
6. Boîtier électrique du hall (côté est) : insérer le fusible. Confinement : l'entrée
   se verrouille, la cafétéria s'ouvre.
7. Aile des laboratoires → laboratoire → bureau vitré : carte d'accès du Dr Marrow.
8. Lecteur de carte au fond du laboratoire : escalier du sous-sol.
9. Sous-sol : pied-de-biche dans le local de maintenance (et les consignes du
   générateur), morgue (registre, munitions).
10. Pied-de-biche sur la porte coincée du générateur. **The Surgeon** : l'attirer dans
    l'eau autour de la machine et actionner un disjoncteur (panneaux aux deux bouts ;
    ils se rechargent en 12 s). Ne pas être dans l'eau soi-même.
11. Tunnel de service → portail de sortie → fin.

</details>
