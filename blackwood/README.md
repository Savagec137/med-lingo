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

## Coopération en ligne (2 joueurs)

Menu principal → **CO-OP** :

- **HOST GAME** (joueur 1) ouvre la partie sur le port **UDP 24890** et affiche l'adresse à donner
  au partenaire, puis **NOUVELLE PARTIE** ou **CONTINUER** (dernière sauvegarde). Option **TIR AMI**
  (désactivé par défaut). Le partenaire peut aussi rejoindre une partie déjà commencée.
- **JOIN GAME** (joueur 2) : adresse IP de l'hôte (`192.168.1.20` ou `adresse:port`), ou
  **SEARCH SESSION** pour trouver les parties du réseau local (port UDP 24891). Écrans
  **CONNECTING…** et **CONNECTION FAILED** (raison affichée : hôte injoignable, partie complète…).
- Par Internet : l'hôte ouvre (redirige) le port UDP 24890 de sa box vers son PC.

Fonctionnement :

- **L'hôte fait autorité** : créatures, scénario, portes, objets, dégâts, santé, munitions, mort et
  sauvegarde sont décidés sur sa machine. L'invité envoie des demandes (déplacement, interaction,
  tir, rechargement, code, trajet d'ascenseur) que l'hôte valide ; il ne décide jamais seul d'un
  dégât, d'un objet ou d'une porte. Les tirs de l'invité sont rejoués chez l'hôte avec la même
  dispersion ; ses munitions sont décomptées par l'hôte.
- **Objets personnels** (munitions, soins, piles, armes : chacun son inventaire de 6 cases ;
  chaque joueur prend son propre exemplaire d'une arme trouvée) et
  **objets partagés** (clés, cartes, fusibles, objets d'énigme : porte-clés commun). Documents :
  archives communes, affichés sur l'écran de celui qui les ramasse.
- Chaque joueur a sa **lampe torche** et ses piles ; les créatures choisissent leur cible
  (le joueur le plus proche, avec changement de cible).
- **À terre** : à 0 PV, un joueur tombe pendant **30 s** ; son partenaire le relève avec
  **[E] RÉANIMER** (2 s, retour à 25 PV), sinon il meurt. « JOUEUR 2 EST À TERRE » s'affiche chez
  les deux. Un joueur mort suit son partenaire des yeux et revient en renfort au prochain point de
  sauvegarde automatique. **GAME OVER** quand plus personne n'est debout ; RETRY (hôte) recharge
  la partie pour les deux.
- Énigmes, événements et boss sont déclenchés **une seule fois, par l'hôte**, et joués chez les deux
  (sons, sous-titres, cinématiques, barre de vie).
- **Sauvegarde** : par l'hôte seulement (les magnétophones le rappellent à l'invité) ; elle contient
  les deux joueurs. **Déconnexion** : « JOUEUR 2 DÉCONNECTÉ », la partie continue ; en revenant,
  le joueur 2 retrouve son inventaire. Un troisième joueur est refusé (« partie complète »).
- Les menus ne mettent pas le jeu en pause en coopération.

## Contrôles

Touches liées à leur **position physique** : sur un clavier AZERTY, WASD devient ZQSD.

| Action | Touche |
| --- | --- |
| Se déplacer | W A S D (ZQSD en AZERTY) ou flèches |
| Courir (bruyant) | Maj |
| Caméra | Souris |
| Viser / tirer / frapper | Clic droit / clic gauche |
| Recharger | R |
| Interagir, ouvrir, ramasser, lire, réanimer (coop) | E |
| Lampe torche | F |
| Armes 1 à 5 / arme suivante | 1–5 / molette |
| Esquive | Espace |
| Soin rapide (spray) | H |
| Inventaire | Tab (ou I) |
| Vue 1re / 3e personne | V |
| Pause | Échap |
| Performances (FPS…) · infos DEBUG | F3 |
| Console DEBUG (si activée) | F1 |

### Manette

Toute la partie et tous les menus se jouent à la manette (Xbox, PlayStation, Nintendo
Switch Pro ou compatible, branchée ou sans fil) : il suffit de l'utiliser, le jeu bascule
tout seul et affiche les boutons de la manette branchée (A / CROIX, RT / R2…). Disposition
Xbox ci-dessous, mêmes positions sur les autres manettes.

| Action | Manette |
| --- | --- |
| Se déplacer · caméra | Stick gauche · stick droit |
| Courir (enclenché jusqu'à l'arrêt) | L3 (clic du stick gauche) |
| Viser · tirer / frapper | LT · RT |
| Interagir, ramasser, lire, réanimer (coop) | A |
| Esquive | B |
| Recharger | X |
| Soin rapide (spray) | Y |
| Arme précédente / suivante | LB / RB (ou croix gauche / droite) |
| Lampe torche | Croix haut |
| Inventaire | VUE (ou croix bas) |
| Vue 1re / 3e personne | R3 |
| Pause | MENU |
| Menus : choisir · valider · retour · onglets | Stick ou croix · A · B · LB / RB |

Le clavier à code se compose au stick (A enfonce la touche). Une manette débranchée en
pleine partie met le jeu en pause. En coopération, seule l'adresse IP à saisir demande un
clavier (la recherche de sessions sur le réseau local se fait à la manette).

**OPTIONS** (menu principal ou pause), en onglets : graphismes (préréglages, ombres,
brouillard volumétrique, SSAO, SSR, anticrénelage, échelle de rendu), affichage (fenêtre,
V-Sync, FPS max, luminosité, champ de vision), audio (volumes, sous-titres), jeu (vue,
difficulté, sensibilité de la souris et du stick, vibrations, inversion de l'axe vertical,
réticule, intensité de la lampe, mode DEBUG), commandes (clavier et manette).

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

# Manette : vrais évènements de manette (menus au stick, A/B, déplacement, caméra, course,
# visée/tir, armes, pause, inventaire, clavier à code, libellés, déconnexion)
godot --headless --fixed-fps 60 --path . -- --test=gamepad

# Coopération en réseau : l'hôte lance lui-même un second processus (l'invité) puis un
# troisième (refusé) ; 119 vérifications (salon, objets, portes, tirs, boss, à terre,
# GAME OVER/RETRY, déconnexion/reconnexion…) et aucune erreur de script tolérée des
# trois côtés. Temps réel (pas de --fixed-fps).
godot --headless --path . -- --test=coop_test
# Même test à travers un relais UDP : 90 ms ± 25 ms de latence, 1 % de pertes
godot --headless --path . -- --test=coop_test --latency=90

# Chaque objet interactif est-il atteignable et visible ?
godot --headless --path . res://tests/interact_audit.tscn

# Construction de la tour, statistiques, 17 contrôles de navigation, 25 vues rendues
godot --headless --path . res://tests/level_tour.tscn

# Rendus (affichage requis, ex. xvfb-run) : chaque accessoire seul sous deux angles, et
# captures dans une vraie partie (pluie, reflets, rampe, quai des ambulances, accueil)
godot --path . res://tests/prop_studio.tscn -- --shots=captures [--only=wheelchair,ambulance]
godot --path . -- --test=visual_check --shots=captures
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
scripts/      core/ (autoloads, DEBUG, données des joueurs), level/ (Facility, hospital/ : un
              fichier par étage), game/ (partie, scénario, zones, navigation),
              net/ (Net : session ENet ; Coop : échanges hôte/invité ; Stage : mise en scène partagée)
tests/        robot de campagne, points de passage, menus, DEBUG, audit, visite
tools/        gen_audio.py (synthèse des sons)
ui/           menus, HUD, inventaire, documents, claviers, ascenseurs, console DEBUG
```

La tour est construite par code : `scripts/level/hospital/kit.gd` (trame commune :
couloir, pièces, cages d'escalier, ascenseurs, façades) et un fichier par étage.

## Licences des ressources

Registre complet : `Documentation/ASSET_LICENSES.md` (aucune ressource de licence inconnue,
aucune ressource extraite d'un jeu). Textures : Poly Haven (CC0). Modèle des infectés :
généré avec Higgsfield. Polices : SIL OFL 1.1 / Apache 2.0. Code, sons, géométrie (dont
tous les accessoires : véhicules, fauteuils, brancards, arbres…), textes : créés pour ce
projet.

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
