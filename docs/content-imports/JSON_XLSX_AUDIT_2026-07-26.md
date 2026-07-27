# Audit du classeur JSON.xlsx - MedLingo

Date : 26 juillet 2026
Décision : **contenu récupérable, mais pas directement importable**

## Résultat général

Le fichier Excel est une bien meilleure source que le PDF. Il permet de
récupérer tous les fragments présents dans le tableur et de confirmer
précisément la structure du contenu.

Récupération réalisée sans réécriture pédagogique :

- 40 leçons JSON ;
- 4 Boss JSON ;
- 460 questions structurées ;
- 244 éléments de connaissance ;
- 10 questions supplémentaires isolées, conservées en quarantaine ;
- 1 copie strictement identique d'une leçon, conservée en quarantaine ;
- 2 leçons entremêlées reconstruites à partir de leurs fragments exacts.

Les 44 fichiers JSON récupérés sont syntaxiquement valides.

## Structure du classeur

| Élément | Résultat |
|---|---:|
| Onglets | 1 |
| Onglet utilisé | `Feuille 1` |
| Plage | `A1:A7028` |
| Lignes non vides | 6 957 |
| Segments JSON détectés | 45 |
| Marqueurs Markdown parasites | 5 |
| Caractères de remplacement invalides | 0 |

Les marqueurs Markdown ` ``` ` des lignes 593, 748, 899, 1055 et 1204 ont été
ignorés lors de la récupération. Le classeur original n'a pas été modifié.

## Contenu récupéré par parcours

| Parcours source | Titre | Leçons | Boss | Questions |
|---|---|---:|---:|---:|
| P01 | Le corps humain | 10 | 1 | 115 |
| P02 | Langage médical | 10 | 1 | 115 |
| P03 | Anatomie générale | 10 | 1 | 115 |
| P04 | Physiologie humaine | 10 | 1 | 115 |

Le fichier couvre uniquement le Bloc 1 et ces quatre parcours. Il ne contient
pas les questions des 15 blocs et 75 parcours.

## Réparation structurelle

### Leçons P02/L04 et P02/L07

La question `Q136` de `P02/L04` était coupée après :

`La racine ______ désigne`

L'objet complet de `P02/L07` avait été collé à l'intérieur de cette chaîne. La
fin de `Q136` réapparaissait ensuite avec :

`le foie.`

Les deux objets ont été séparés en utilisant uniquement les fragments présents
dans le classeur :

- `P02/L04` : 6 connaissances et 10 questions (`Q131` à `Q140`) ;
- `P02/L07` : 6 connaissances et 10 questions (`Q161` à `Q170`).

Aucun contenu pédagogique n'a été inventé ou reformulé.

### Leçon P02/L09

`P02/L09` apparaît deux fois à l'identique, avec les mêmes questions `Q181` à
`Q190`. Une copie a été conservée dans la récupération officielle et la seconde
a été placée en quarantaine.

### Tableau initial isolé

Les dix premières questions du classeur forment un tableau indépendant sans
objet de leçon. Elles ressemblent à une deuxième version de `P01/L01`, avec des
identifiants complets, mais elles ne possèdent ni manifeste ni relation
explicite.

Elles ont été conservées en quarantaine pour éviter de les perdre ou de les
publier comme doublons.

## Répartition des 460 questions

| Type source | Nombre |
|---|---:|
| QCM (`multiple_choice`) | 150 |
| Vrai/Faux | 91 |
| Association (`matching`) | 45 |
| Ordre | 43 |
| Texte à trous | 44 |
| Cas clinique | 54 |
| Localisation (`anatomy_click`) | 33 |

Chaque leçon contient 10 questions et au moins quatre types d'exercices. Chaque
Boss contient 15 questions.

## Corrections

Les corrections des 460 questions sont structurellement présentes et valides
dans leur format source :

- aucun index de correction hors limites ;
- aucun Vrai/Faux sans booléen ;
- aucune association vide ;
- aucun ordre sans solution ;
- aucun texte à trous sans réponse ;
- aucune localisation sans cible.

Cependant, les 204 QCM et cas cliniques utilisent tous `correct: 0`. La bonne
réponse est donc toujours la première dans la source.

| Position correcte dans la source | Nombre |
|---|---:|
| Première | 204 |
| Deuxième | 0 |
| Troisième | 0 |
| Quatrième | 0 |

La conversion MedLingo devra créer un identifiant stable pour chaque choix,
mélanger les choix et référencer la correction par identifiant, jamais par
position.

Trente-quatre questions présentent aussi un indice possible par la longueur :
la bonne réponse est au moins 1,8 fois plus longue que la longueur moyenne des
distracteurs.

## Doublons pédagogiques

Après retrait de la copie complète de `P02/L09` :

- aucun identifiant de question dupliqué ;
- aucun identifiant de connaissance dupliqué ;
- aucune option identique dans une même question ;
- 21 groupes d'énoncés exactement identiques ;
- 3 groupes supplémentaires très proches.

Parmi les 21 répétitions exactes :

- 11 concernent uniquement des leçons ;
- 9 correspondent à une reprise entre une leçon et un Boss ;
- 1 est partagée entre deux Boss.

Les reprises de Boss peuvent être volontaires, mais devraient référencer la
question source plutôt que recopier son texte.

Exemples de doublons ou quasi-doublons :

- « Le terme distal signifie » ;
- « Le préfixe tachy- signifie » ;
- « Une tachycardie correspond à » ;
- « Le terme cardiologie désigne » ;
- « Replace le trajet de l'urine » ;
- « Quelle hormone fait diminuer la glycémie ? » ;
- « Replace les étapes d'un mécanisme de régulation » /
  « Replace les étapes d'un mécanisme de régulation physiologique ».

## Compatibilité avec le moteur actuel

Les questions récupérées ne correspondent pas encore au schéma du moteur
MedLingo.

Champs absents sur les 460 questions :

| Champ requis | Questions concernées |
|---|---:|
| `lessonId` | 460 |
| `exerciseId` | 460 |
| `competencyIds` | 460 |
| `feedback` | 460 |
| `explanation` | 460 |
| `tags` | 460 |
| `sourceDocument` | 460 |
| `sourcePages` | 460 |
| `reviewStatus` | 460 |

Conversions nécessaires :

- `multiple_choice` vers `mcq` ;
- `matching` vers `association` ;
- `anatomy_click` vers `anatomy_location` ;
- difficultés numériques 1 à 5 vers la nomenclature officielle ;
- tableaux d'associations vers le `payload` typé ;
- corrections par index vers des identifiants de réponse ;
- création des entités `exerciseId` ;
- ajout des liens vers les compétences.

## Conflit avec le plan des 75 parcours

Le classeur utilise :

`P04 - Physiologie humaine`

Le plan actuel de l'application utilise :

`parcours-04 - Système locomoteur`

Le parcours P04 du classeur ne doit donc pas être importé automatiquement sous
`parcours-04`. Sa destination pédagogique doit être décidée avant conversion.

Les parcours P01 et P03 contiennent aussi des notions déjà réparties dans les
parcours spécialisés du nouveau plan. Une table de correspondance par titre et
compétence est nécessaire ; une correspondance uniquement basée sur le numéro
serait incorrecte.

## Validation médicale et pédagogique

Aucune question ne possède de document DEA, de pages sources ou de statut de
revue.

La vérification effectuée confirme la cohérence technique des corrections dans
le format fourni. Elle ne constitue pas une validation médicale ou
réglementaire.

Toutes les questions doivent rester au statut `draft` tant que :

- leur support DEA n'est pas identifié ;
- les pages sources ne sont pas renseignées ;
- le contenu n'est pas comparé à ces pages ;
- une éventuelle validation de formateur n'est pas obtenue.

## Conclusion

Le contenu est récupérable et aucune question structurée n'a été perdue.
L'archive produite contient les 40 leçons, les 4 Boss, le résumé automatisé et
les éléments mis en quarantaine.

Elle ne doit pas encore être copiée dans le dépôt MedLingo. L'étape suivante est
la création d'un convertisseur vers le schéma actuel, après validation de la
correspondance des parcours et des sources pédagogiques.
