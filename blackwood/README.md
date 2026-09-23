# BLACKWOOD HOSPITAL — Chapitre 1 : Le Message

Survival horror réaliste à la troisième personne (vue à la première personne en option),
jouable de bout en bout : environ 25 à 45 minutes. Univers, personnages, créatures, textes
et sons originaux. Moteur : **Godot 4.7.2** (GDScript).

> Thomas Reed, 32 ans, ancien ambulancier militaire, reçoit un message de sa sœur Sarah,
> infirmière en neurologie : « Surtout, ne viens pas à l'hôpital. » Trois heures de route
> plus tard, le centre hospitalier universitaire Blackwood est plongé dans le noir.
> Douze étages. Le Projet ECHO. Et Sarah, quelque part, là-haut.

## Jouer

### Exécutables (sans installer Godot)

L'export se fait depuis `blackwood/` (modèles d'export Godot 4.7.2 installés) :

```bash
godot --headless --path . --export-release "Windows Desktop" build/windows/BlackwoodHospital.exe
godot --headless --path . --export-release "Linux" build/linux/BlackwoodHospital.x86_64
```

Un seul fichier par plateforme (les données sont intégrées). Sous Windows, l'exécutable
n'est pas signé : à la première ouverture, choisir « Informations complémentaires » puis
« Exécuter quand même ».

### Depuis l'éditeur

1. Installer **Godot 4.7** (version standard, pas .NET) : <https://godotengine.org/download>.
2. Gestionnaire de projets : **Importer**, choisir `blackwood/project.godot`, puis **F5**.

```bash
godot --path blackwood                       # menu principal
godot --path blackwood -- --new-game         # directement en partie
godot --path blackwood -- --load=1           # charge l'emplacement 1 (0 = sauvegarde auto)
godot --path blackwood -- --debug            # mode DEBUG actif (console F1)
```

## Contrôles

Touches liées à leur **position physique** : sur un clavier AZERTY, WASD devient ZQSD.

| Action | Touche |
| --- | --- |
| Se déplacer | W A S D (ZQSD en AZERTY) ou flèches |
| Courir (bruyant) | Maj |
| Caméra | Souris |
| Viser / tirer / frapper | Clic droit / clic gauche |
| Recharger | R |
| Interagir, ouvrir, ramasser, lire | E |
| Lampe torche | F |
| Armes 1 à 5 / arme suivante | 1–5 / molette |
| Esquive | Espace |
| Soin rapide (spray) | H |
| Inventaire | Tab (ou I) |
| Vue 1re / 3e personne | V |
| Pause | Échap |
| Performances (FPS…) · infos DEBUG | F3 |
| Console DEBUG (si activée) | F1 |

**OPTIONS** (menu principal ou pause), en onglets : graphismes (préréglages, ombres,
brouillard volumétrique, SSAO, SSR, anticrénelage, échelle de rendu), affichage (fenêtre,
V-Sync, FPS max, luminosité, champ de vision), audio (volumes, sous-titres), jeu (vue,
difficulté, sensibilité, réticule, intensité de la lampe, mode DEBUG), contrôles.

## Contenu

- **La tour** : 12 étages visibles, **9 niveaux explorables** (-2, -1, RDC, 1, 3, 6, 8, 11,
  12) reliés par trois cages d'escalier, les ascenseurs, le monte-charge et l'ascenseur de
  direction ; l'extérieur (parvis, rue, rampe des ambulances) sous la pluie.
- **Joueur** : caméra épaule (ou 1re personne), visée, esquive, course bruyante, lampe
  torche à ombres portées avec **batterie à paliers 100 / 75 / 50 / 25 / 10 / 0** (piles
  à ramasser, avertissements, extinction à 0 %).
- **Cinq armes, pas une de plus** : matraque télescopique, pistolet 9 mm (12), fusil à
  pompe, pistolet-mitrailleur, magnum .357.
- **Créatures** (IA : IDLE, PATROL, INVESTIGATE, CHASE, ATTACK, SEARCH, RETURN, DEAD, avec
  étourdissement et fuite ; vue, ouïe, bruit) : patient infecté, infirmière contaminée
  (sprints), agent de sécurité, patient neurologique (quasi aveugle, chasse au bruit),
  sujet expérimental ; **le Veilleur** (aveugle, parking) ; **le Néonatal** (gaines
  d'aération) ; **le Chirurgien** (mini-boss, bouteilles d'oxygène) ; **le Colossus**
  (invulnérable, seulement étourdi) ; **Sarah** (boss, deux moments de lucidité) ;
  **le Patient Zéro — Élias Brandt** (boss final : régénération, sujets des cuves).
- **Énigmes** : procédure des groupes électrogènes (ordre des commutateurs), code de
  l'escalier B (0612, un anniversaire), fusible de la cellule de crise, coffre du
  Dr Vance (0309, la vidéo de Sarah).
- **22 documents**, objectifs contextuels, inventaire de 6 cases + porte-clés.
- **Sauvegardes** : 3 emplacements (magnétophones) + sauvegarde automatique ; CONTINUE
  reprend la plus récente, LOAD GAME ouvre la liste ; RETRY après la mort.
- **Son** : 153 sons de synthèse (pas sur sept sols, portes, néons, créatures, armes,
  ascenseurs, pluie…), réverbération par pièce, silences volontaires, pas de musique
  permanente.
- **Mode DEBUG** (Options > Jeu, ou `--debug`) : console F1 — `god`, `ammo`,
  `weapon [id|all]`, `tp ÉTAGE`, `spawn TYPE`, `killall`, `ai`, `light`, `heal`, `flag`,
  `pos`, `help` ; F3 affiche FPS, position, étage, zone, créatures proches et leur état.

## Tests automatisés

Depuis `blackwood/` :

```bash
# Campagne complète jouée par un robot avec de vraies entrées (menu → fin → menu).
# Code de sortie 0 si le chapitre est terminé. (~4 min en --headless)
godot --headless --fixed-fps 60 --path . -- --autoplay
# Reprise à un chapitre (points de passage enregistrés par une campagne complète)
godot --headless --fixed-fps 60 --path . -- --autoplay --from=neurologie

# Recharge chaque sauvegarde automatique de la campagne et vérifie l'état du monde
godot --headless --fixed-fps 60 --path . -- --test=checkpoints

# Menus : NEW GAME, pause, options, inventaire, mort, RETRY, LOAD GAME, CONTINUE
godot --headless --fixed-fps 60 --path . -- --test=ui_flows

# Mode DEBUG (console tapée au clavier), batterie de la lampe, épreuve des 9 créatures
godot --headless --fixed-fps 60 --path . -- --test=debug_mode

# Chaque objet interactif est-il atteignable et visible ?
godot --headless --path . res://tests/interact_audit.tscn

# Construction de la tour, statistiques, 17 contrôles de navigation, 25 vues rendues
godot --headless --path . res://tests/level_tour.tscn
```

## Organisation

```
assets/       textures PBR (Poly Haven, CC0), modèle 3D (Higgsfield), polices
audio/        sons .ogg (générés par tools/gen_audio.py)
data/         objets, armes, documents, objectifs
enemies/      Enemy (machine à états) et toutes les créatures, boss compris
items/        portes, ascenseurs, claviers, coffres, casiers, vitres, bouteilles…
materials/    matériaux et shaders
player/       joueur, caméra, lampe, armes, squelette articulé
save/         sauvegardes (user://saves)
scripts/      core/ (autoloads, DEBUG), level/ (Facility, hospital/ : un fichier par étage),
              game/ (partie, scénario, zones, navigation)
tests/        robot de campagne, points de passage, menus, DEBUG, audit, visite
tools/        gen_audio.py (synthèse des sons)
ui/           menus, HUD, inventaire, documents, claviers, ascenseurs, console DEBUG
```

La tour est construite par code : `scripts/level/hospital/kit.gd` (trame commune :
couloir, pièces, cages d'escalier, ascenseurs, façades) et un fichier par étage.

## Licences des ressources

Registre complet : `Documentation/ASSET_LICENSES.md` (aucune ressource de licence inconnue,
aucune ressource extraite d'un jeu). Textures : Poly Haven (CC0). Modèle des infectés :
généré avec Higgsfield. Polices : SIL OFL 1.1 / Apache 2.0. Code, sons, géométrie, textes :
créés pour ce projet.

<details>
<summary><strong>Solution complète (spoilers)</strong></summary>

1. **Parvis** : l'entrée principale est enchaînée ; descendre la rampe des ambulances (est).
2. **-1 Urgences** : lampe torche dans l'ambulance. Accueil : décrocher le téléphone,
   clé des box sur le comptoir. Box → couloir : l'infirmière… **fuir** vers l'escalier A.
3. **RDC** : matraque au poste de sécurité (l'agent se relève). **1er** : radiologie, salle
   de radiographie : pistolet de Diaz et clé du local technique.
4. **-2** (escalier A, clé) : procédure au local technique ; groupes électrogènes :
   **pompe → G1 → transfert**. Le courant revient : ascenseurs.
5. **3e** : clé du casier au poste de soins, fusil au poste de sécurité, casier de Sarah
   (salle des infirmières) : code **0612**. Le Chirurgien sort du bloc : faire exploser les
   bouteilles d'oxygène du couloir quand il passe à côté.
6. **1er**, escalier de service B : code **0612** → **6e**. Fusible au vestiaire, boîtier de
   la cellule de crise : pistolet-mitrailleur et **carte recherche**. Laboratoire : la vérité
   sur Sarah.
7. Ascenseurs → **-2**, monte-charge (carte) → **8e** : vidéo de Sarah (bureau de
   recherche), coffre du Dr Vance **0309** : magnum et clé de direction. Le Colossus se
   libère : ascenseur de direction → **11e**.
8. **11e** : Sarah, au centre de contrôle. Sa carte ouvre l'escalier C → **12e**.
9. **12e** : la console Oméga libère le Patient Zéro ; une fois vaincu, engager
   l'autodestruction. **Évasion** : escalier C jusqu'au 8e, mettre le Colossus à genoux,
   monte-charge → -1, box, accueil, quai, remonter la rampe.

</details>
