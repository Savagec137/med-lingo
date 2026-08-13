# Audit anatomique des actifs du pilote Medoca

Cet audit accompagne les actifs visibles du pilote « Clique sur le cœur ». Il
ne remplace pas une validation par un anatomiste, un médecin ou un formateur.
Une image non explicitement conforme reste bloquée pour les usages qui demandent
un détail anatomique fin.

## `anatomy-heart-realistic.png`

**Statut : Corrigé — usage limité à une vue externe pédagogique.**

**Empreinte SHA-256 validée :**
`2D6BFA068DE233C97CD63632ED0D703F73FB3825975748BA1C235D561798F767`.
Toute autre version du fichier doit repasser l'audit avant intégration.

### Contrôle anatomique

- silhouette externe, ventricules et appendices atriaux : cohérents en vue
  antérieure oblique ; les quatre cavités ne sont pas directement visibles sur
  une vue externe et ne doivent donc pas être enseignées à partir de cet actif ;
- crosse aortique : corrigée de quatre à exactement trois branches principales
  visibles ;
- veine cave supérieure, tronc pulmonaire et vaisseaux coronaires : position
  générale plausible pour une vignette externe ;
- veines pulmonaires : présentes latéralement, mais cet actif ne doit pas servir
  à les compter ni à les identifier individuellement.

### Résumé

- « Crosse aortique corrigée : 4 branches → 3 branches principales ».
- L'actif est autorisé pour identifier le cœur entier, pas pour évaluer les
  cavités, valves ou veines pulmonaires.

## `anatomy-body-realistic.png`

**Statut : À vérifier — autorisé uniquement comme repère global non légendé.**

**Empreinte SHA-256 suivie :**
`5176EECB477D68CCB74A475278629E024B5CA7DC00DB5A7BF691B4DF2FC1C0CA`.

### Contrôle anatomique

- orientation générale, quatre membres, cage thoracique, bassin, foie, estomac,
  intestin grêle et cadre colique : disposition générale plausible ;
- cœur et poumons : position générale plausible, mais les scissures pulmonaires
  ne sont pas assez lisibles pour valider deux lobes à gauche et trois à droite ;
- système urinaire : les deux reins et les uretères ne sont pas suffisamment
  lisibles pour servir de support d'évaluation ;
- squelette fin, cerveau, pancréas et ramifications vasculaires distales : niveau
  de détail insuffisant pour un contrôle structure par structure.

### Résumé

- Image maintenue comme fond de repérage corporel global.
- Interdiction de l'utiliser pour enseigner le nombre de lobes, les petits os,
  les ramifications vasculaires, les cavités cardiaques ou les détails urinaires.
- Une planche anatomique officiellement sourcée devra la remplacer pour ces
  usages avant publication des couches spécialisées.
