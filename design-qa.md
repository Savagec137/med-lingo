# Design QA — Anatomie interactive Medoca

Référence visuelle : maquette « Les grands systèmes — Clique sur le cœur »
fournie par le porteur du produit.

## État final

**PASS — vérifications automatisées et structurelles.**

- disposition : HUD, titre, panneau de correction, corps central, contrôles,
  couches, aide, réponses et fiche pédagogique présents ;
- interaction : coordonnées relatives, rayon tactile de 7 %, zoom, déplacement,
  reset et recentrage conservés ;
- confidentialité pédagogique : aucun libellé complet avant correction ;
- responsive : grille adaptative mobile/tablette/desktop, commandes tactiles de
  44 px minimum et aucun débordement horizontal attendu ;
- fidélité anatomique : seul le pilote du cœur charge les actifs réalistes
  audités ; les autres questions restent fonctionnelles sans montrer un dessin
  anatomique approximatif ;
- correction cardiaque : le cœur isolé porte exactement trois branches visibles
  au-dessus de la crosse aortique ; son usage est limité à l'identification
  externe du cœur ;
- données non sourcées : les ordres de grandeur de la fiche restent marqués
  `internal_to_validate`.

## Limite de contrôle visuel

La capture automatisée du prototype n'a pas pu être produite : le service local
de capture de l'environnement Codex a échoué avant l'ouverture du navigateur.
La validation finale s'appuie donc sur les tests du contrat UI, le build de
production et l'inspection directe des actifs. Une comparaison pixel à pixel
avec la maquette devra être relancée dès que ce service sera disponible.
