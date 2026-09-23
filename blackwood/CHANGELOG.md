# Journal des modifications — Blackwood

Format : du plus récent au plus ancien. Chaque version a été compilée, lancée et testée
(robot de campagne et tests automatisés, voir `README.md`).

## 0.4 — Mode DEBUG, batterie à paliers, exécutables (23/09/2026)

- **Mode DEBUG** (Options > Jeu, ou `--debug`) : console F1 (`god`, `ammo`, `weapon`,
  `tp`, `spawn`, `killall`, `ai`, `light`, `heal`, `flag`, `pos`, `help`) ; F3 affiche en
  plus la position, l'étage, la zone, les créatures proches et leur état (dont STAGGER,
  FLEE, DORMANT).
- **Lampe torche** : batterie à paliers 100 / 75 / 50 / 25 / 10 / 0 (faisceau et portée
  réduits à chaque palier, avertissements, extinction à 0 %, impossible de la rallumer
  sans piles) ; indicateur à segments dans le HUD.
- **Menu principal** : CONTINUE reprend la sauvegarde la plus récente, nouvelle entrée
  LOAD GAME (liste des sauvegardes) ; les sauvegardes affichent un nom de lieu lisible.
- **Exécutables** Windows 64 bits et Linux 64 bits (préréglages d'export) ; la version
  Linux exportée joue la campagne complète sans erreur.
- Nouveau test `debug_mode` : console tapée au clavier, batterie, épreuve des 9 types de
  créatures (repérage, attaque, mort ; le Colossus seulement étourdi).
- **Patient Zéro** : paliers acquis (70 %, 50 %, 35 %) — sa régénération ne le fait plus
  remonter au-dessus du dernier palier franchi ; régénération ralentie, attaques mieux
  annoncées. Le combat final dure désormais une à deux minutes.
- Robot de campagne : RETRY après une mort (reprise à la sauvegarde automatique, comme un
  joueur), replis limités à l'arène du boss, esquive des élans.
- Corrigé : la console perdait une commande sur deux (sortie du mode saisie après Entrée).
- Retiré : test `box_stress` (événement de l'ancien niveau).

## 0.3 — Blackwood Hospital (23/09/2026)

- La tour de 12 étages remplace l'ancien centre de recherche : 9 niveaux construits,
  escaliers A/B/C, ascenseurs, monte-charge, ascenseur de direction, extérieur et rampe
  des urgences.
- Nouvelle histoire : Thomas et Sarah Reed, Projet ECHO, actes 1 à 3, 22 documents,
  autodestruction, évasion, appel final, « FIN DU CHAPITRE 1 ».
- Créatures : 5 variantes d'infectés, Veilleur, Néonatal, Chirurgien, Colossus, Sarah,
  Patient Zéro.
- Corrections trouvées en rejouant la campagne : vantaux ouverts et montants de porte dans
  la navigation, grille dédiée aux grandes créatures, collision plafonnée sous les
  linteaux, portes coupe-feu ouvertes côté couloir, volées d'escalier interdites aux
  créatures, restauration du Chirurgien, du Colossus et de l'évasion au chargement,
  objets inatteignables déplacés, équilibrage des boss.
- Audit du projet (`PROJECT_AUDIT.md`) et registre des licences
  (`Documentation/ASSET_LICENSES.md`).

## 0.2 — Réalisme et confort (23/09/2026)

- Textures photo CC0 (Poly Haven) en projection triplanaire ; premier modèle 3D réaliste
  des infectés, généré avec Higgsfield et riggé sur le squelette du jeu.
- Vue à la première personne, réglages en onglets (graphismes, affichage, audio, jeu,
  contrôles).
- Cinq armes : matraque, pistolet, fusil à pompe, pistolet-mitrailleur, magnum.
- Compteur de performances (F3), fermeture propre du jeu.

## 0.1 — Premier chapitre jouable (23/09/2026)

- Survival horror à la troisième personne jouable de bout en bout (ancien niveau :
  Blackwood Research Facility) : exploration, inventaire, documents, énigmes, créatures à
  machine à états, boss, sauvegardes, menus.
- Robot de campagne et tests des menus.
