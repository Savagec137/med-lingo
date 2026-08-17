# Le support B2.M4 comme source des parcours

Les parcours se construisent à partir du support de formation présent dans le
dépôt, et non par rédaction interne. Ce document dit ce que le support couvre,
page par page, et ce qu'il ne couvre pas.

## Le document

|                                   |                                                                          |
| --------------------------------- | ------------------------------------------------------------------------ |
| Fichier                           | `docs/internal_sources/Cours_DEA/B2.M4 - Support Etudiant.pdf`           |
| Identifiant bibliothèque          | `b2-m4-support-etudiant`                                                 |
| Identifiant base de connaissances | `DOC-AFTRAL-DEA-B2-M4-2022`                                              |
| Pages                             | 175, numérotées en pied de page                                          |
| Empreinte                         | `0b298bdf…` (calculée sur le fichier du dépôt)                           |
| `contentVerification`             | `content_verified` — le contenu a été lu                                 |
| `status`                          | `awaiting_medical_validation` — **aucun relecteur humain ne l'a validé** |
| `sourceType`                      | `training`                                                               |

**Ce document n'est pas un texte officiel.** C'est un support pédagogique. Une
question qui s'y adosse porte `sourceType: "training_source"` et ne peut jamais
être `official_verified`. Seuls le décret 2022-629 et les autres textes
réglementaires de la bibliothèque autorisent ce statut.

La fiche bibliothèque déclarait jusqu'ici `storedInRepository: false` et
`contentVerification: "listing_only"` : c'était faux, le fichier est dans le
dépôt et cinq parcours en citent déjà des pages. La fiche a été corrigée, sans
lui attribuer la validation humaine qui n'a pas eu lieu.

## Ce que le support couvre

Relevé par recherche plein texte sur les 175 pages. Les plages marquées
**exploitées** sont celles qu'un parcours cite déjà.

### Anatomie et physiologie

| Section                                                    | Pages        | État                        |
| ---------------------------------------------------------- | ------------ | --------------------------- |
| Vocabulaire médical — préfixes, suffixes, racines          | 3–6          | disponible                  |
| Organisation générale du corps, tableau des sept appareils | 14–18        | **exploitée** (p. 16)       |
| Appareil circulatoire                                      | 18–21        | **exploitée** — parcours 5  |
| Appareil neurologique                                      | 28–33        | **exploitée** — parcours 8  |
| Appareil locomoteur                                        | 34–38        | **exploitée** — parcours 4  |
| Appareil digestif                                          | 39–41        | **exploitée** — parcours 7  |
| Appareil urinaire                                          | 43–44        | **exploitée** — parcours 9  |
| Appareil génital féminin                                   | 45–47, 51–52 | disponible                  |
| Appareil génital masculin                                  | 48–51        | disponible                  |
| Système endocrinien                                        | 49–52        | **exploitée** — parcours 10 |
| Appareil respiratoire                                      | 23–27        | **exploitée** — parcours 6  |

### Gestes, mesures et bilans

| Section                                     | Pages | État                                          |
| ------------------------------------------- | ----- | --------------------------------------------- |
| Matériels de mesure — tensiomètre, oxymètre | 53–54 | **partiellement exploitée** — parcours 5 et 6 |
| Mesure manuelle de la pression artérielle   | 66–68 | **exploitée** — parcours 5                    |
| Mesure de la fréquence respiratoire, SpO₂   | 71–72 | **exploitée** — parcours 6                    |
| Prélèvements non stériles                   | 76–78 | **partiellement exploitée** — parcours 9      |

### Situations pathologiques

| Section                             | Pages            | État                     |
| ----------------------------------- | ---------------- | ------------------------ |
| Cardio-vasculaires                  | 83–85, 116       | disponible — parcours 20 |
| Respiratoires                       | 89–91, 97        | disponible — parcours 19 |
| Neurologiques                       | 101, 110         | disponible — parcours 21 |
| Liées au vieillissement             | 108–109, 158–159 | disponible               |
| Escarres                            | 109–111          | disponible               |
| Diabète                             | 114, 133         | disponible               |
| Digestives                          | 121–125          | disponible               |
| Rénales et urinaires                | 127–132          | disponible               |
| Oncologie                           | 138, 160–161     | disponible               |
| Santé mentale                       | 148–153          | disponible               |
| Conduites à risque et addictions    | 152, 160         | disponible               |
| Contention                          | 156–159          | disponible               |
| Grossesse, accouchement, nouveau-né | 162–174          | disponible               |

## Ce que le support ne couvre pas

Aucune page ne traite :

- **les organes des sens** (parcours 11) — le tableau des sept appareils ne les
  mentionne pas ;
- **la communication professionnelle** et la **psychologie du patient**
  (parcours 12 et 13) ;
- **l'hygiène, l'asepsie et la prévention des infections** (parcours 14 et 15) ;
- **la sécurité d'intervention** (parcours 16) ;
- **l'oxygénothérapie** et le **matériel d'urgence** (parcours 23 et 24).

Ces parcours devront trouver une autre source, ou être écrits en interne et le
déclarer. **Ne pas les rattacher au support par commodité.**

## La méthode

1. **Lire les pages** avant d'écrire. Le périmètre analysé déclaré par
   `docs/master_knowledge_base/documents/DOC-AFTRAL-DEA-B2-M4-2022.json` ne
   couvrait que les parcours 4 à 7 : il ne fait pas autorité sur le reste du
   document.
2. **Écrire les fiches** dans `parcours-NN/knowledge.json`, chacune citant ses
   pages, au format des parcours 4 à 8.
3. **Deux provenances, jamais mélangées.** Une question qui reprend un énoncé du
   support cite ses pages et porte `pageStatus: "verified"`. Une question qui
   porte sur la conduite à tenir en aval — décrire sans conclure, transmettre au
   Centre 15 — ne cite aucune page et porte `missing_source` +
   `internal_to_validate`. Au parcours 8, la répartition est de 62 contre 12.
4. **Ne jamais faire dire au support plus qu'il ne dit.** Quand une question
   mêle un élément que le support énumère et un élément qu'il n'énumère pas,
   elle reste en rédaction interne.
5. **Un parcours peut avoir deux sources.** Le parcours 10 en donne l'exemple :
   le support décrit la physiologie du pancréas, et le décret n° 2022-629
   encadre le recueil de la glycémie. Les questions réglementaires citent le
   décret et son acte `acte.r6311-17.ii.2` ; les questions de physiologie
   citent le support et ses pages. Le générateur distingue explicitement les
   trois provenances — support, décret, extension — parce qu'un cas non prévu
   retombe silencieusement en `missing_source` : la source disparaît sans que
   rien ne le signale.
6. **Une leçon du plan que le support ne couvre pas reste au plan, et le dit.**
   Le parcours 9 en donne deux exemples : « L'urètre » et « Équilibre
   hydrique » n'apparaissent nulle part dans les deux pages consacrées à
   l'appareil urinaire. Les titres de `roadmap-v2.json` n'ont pas été modifiés
   pour les faire coïncider avec la source ; les leçons ont été écrites en
   extension, et une question de chacune fait porter l'apprentissage sur ce
   constat même — savoir où une source s'arrête fait partie du métier.

## Une limite d'outillage à connaître

`poppler-utils` et les bibliothèques Python de lecture PDF ne sont pas
disponibles dans l'environnement de développement distant. L'extraction se fait
avec `zlib` et les opérateurs `Tj`/`TJ`, ce qui **perd une partie du texte** :
certaines phrases apparaissent tronquées, et le texte porté par des images n'est
pas lu du tout.

Conséquence pratique : les pages doivent être relues attentivement, et une
formulation qui semble incomplète dans l'extraction doit être vérifiée avant
d'en faire une question. En cas de doute, la question part en rédaction interne
plutôt qu'en citation.
