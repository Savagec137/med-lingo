# Mode Intervention V3 — contrat de données

Couche autonome du Mode Intervention V3 : contrat de données, moteur, couche
présentation, composants et route. Les sept écrans sont jouables sur
`/intervention-v3`, séparée de `/intervention` où tournent les quinze missions
historiques.

Une règle traverse tout : **aucune donnée clinique n'apparaît si le joueur n'a pas
fait l'action correspondante.** Les données ne se lisent que par `readFact`, et le
moteur ne s'atteint que par `engine/queries.ts` — sans effet — ou par le hook.

Les deux documents de conception restent la référence :
`../INTERVENTION_V3_SPECIFICATION.md` pour le fonctionnel écran par écran,
`../INTERVENTION_V3_ARCHITECTURE.md` pour l'architecture d'ensemble.

## Ce qui est livré

| Fichier                               | Rôle                                                       |
| ------------------------------------- | ---------------------------------------------------------- |
| `v3-domain.ts`                        | tous les types du mode, et la première barrière anti-fuite |
| `v3-session.ts`                       | état initial d'une session                                 |
| `facts/fact-registry.json`            | 32 faits cliniques déclarés                                |
| `facts/fact-schema.ts`                | validation zod du registre, huit invariants                |
| `facts/fact-registry.ts`              | chargement et index                                        |
| `facts/read-fact.ts`                  | **la seule porte d'accès aux données cliniques**           |
| `facts/reveal-fact.ts`                | gel d'une mesure au moment du relevé                       |
| `facts/source-trust.ts`               | niveau de confiance dérivé d'un document                   |
| `actions/action-catalog.json`         | 22 actions jouables et 6 actions hors périmètre            |
| `actions/action-schema.ts`            | validation zod du catalogue, dont la garantie de périmètre |
| `actions/action-catalog.ts`           | chargement et index                                        |
| `scenarios/pilot-trauma-cranien.json` | le scénario pilote complet                                 |
| `scenarios/scenario-schema.ts`        | validation zod, dont le plafond du bilan attendu           |
| `scenarios/v3-catalog.ts`             | catalogue V3, séparé des quinze missions historiques       |
| `engine/apply-action.ts`              | prérequis, temps, faits, physiologie et journal            |
| `engine/v3-phases.ts`                 | transitions gardées des dix phases                         |
| `engine/v3-gaps.ts`                   | trous du bilan et questions du régulateur                  |
| `engine/v3-scoring.ts`                | note unique, axes explicatifs, vies et gains               |
| `engine/v3-debrief.ts`                | débrief déterministe dérivé du journal                     |
| `format-glycemia.ts`                  | conversion d'affichage mmol/L vers g/L                     |
| `ui/`                                 | un présentateur pur par écran de maquette                  |
| `engine/action-gate.ts`               | les barrières dures, sans effet                            |
| `engine/queries.ts`                   | tout ce qu'on peut demander au moteur, rien de plus        |
| `engine/v3-gestures.ts`               | gestes prioritaires et leurs conséquences                  |
| `engine/v3-reevaluation.ts`           | cycles de réévaluation et sanction du départ               |
| `engine/v3-handover.ts`               | transmission choisie, validation du tour de gestes         |
| `use-intervention-v3.ts`              | le seul point où la session complète existe côté interface |
| `tests/`                              | 287 tests V3                                               |

## Les deux axes d'un fait

Un fait porte une **catégorie** — d'où vient l'information — et une
**visibilité** — ce qui la rend lisible. Les deux sont indépendants, et c'est ce
qui permet d'exprimer un danger qui ne se voit pas depuis le point d'arrivée :
catégorie `observable`, visibilité `on_action`.

| Catégorie    | Sens                                       |
| ------------ | ------------------------------------------ |
| `dispatch`   | transmis par la régulation                 |
| `observable` | vu sans geste                              |
| `probe`      | mesuré par un appareil ou un examen        |
| `interview`  | dit par le patient, l'entourage, un témoin |
| `derived`    | calculé à partir d'autres faits            |

| Visibilité      | Lisible quand                               |
| --------------- | ------------------------------------------- |
| `always`        | toujours                                    |
| `on_arrival`    | la phase n'est plus `new_call`              |
| `on_action`     | le fait figure dans `session.revealedFacts` |
| `on_dependency` | tous ses `dependsOn` sont lisibles          |

## Règles de `readFact`

`readFact(session, factId)` est le seul accès aux données cliniques côté
interface. Il ne retourne jamais un nombre nu : il retourne un `FactRead`, qui
est soit une valeur relevée, soit **une absence nommée**.

1. **Résolution.** Le fait est cherché dans le registre. Un `factId` inconnu
   lève une erreur : c'est un défaut de programmation, pas un cas d'affichage.
2. **Visibilité.** Si le fait n'est pas visible, retour `status: "unknown"` avec
   la raison la plus utile, dans cet ordre :
   - le fait n'appartient pas au scénario → `not_applicable`, « Sans objet ici » ;
   - le matériel requis n'a pas été embarqué → `equipment_missing`, « Glucomètre
     non embarqué » ;
   - sinon → `not_revealed`, « Non mesurée » pour une constante, le gabarit du
     fait sinon.
3. **Faits dérivés.** La valeur est calculée à partir des seuls faits déjà
   lisibles. Si un prérequis manque, retour `unknown`.
4. **Faits `always` et `on_arrival`.** Ce que la régulation transmet et ce qu'on
   voit en arrivant appartiennent au scénario, pas à un relevé : la valeur est
   lue dans `scenario.factValues`, sans entrée dans `revealedFacts`. Ce dernier
   reste ainsi le registre exact de ce que le joueur est allé chercher lui-même.
5. **Valeur figée.** Pour un fait relevé, la valeur retournée est celle du
   relevé, **jamais recalculée** depuis `session.vitals`.
6. **Tendance.** `trend` et `delta` ne sont renseignés qu'à partir de la
   deuxième mesure. Une flèche sur un point unique inventerait une évolution.

## Règles de `isStale`

```
ageSeconds = session.simulatedTimeSeconds − lastMeasuredAtSeconds
isStale    = fact.freshnessSeconds !== null && ageSeconds > fact.freshnessSeconds
```

La péremption n'a demandé aucun mécanisme : elle découle du gel de la valeur. Le
patient continue d'évoluer pendant que l'écran affiche la dernière prise, donc
l'âge de la mesure suffit à dire si elle vaut encore quelque chose.

Trois conséquences voulues. Un fait sans `freshnessSeconds` — antécédents,
traitements, circonstances — ne périme jamais : un antécédent ne vieillit pas.
Une mesure périmée **redevient un trou** dans `gapFactIds`, donc peut faire
réapparaître une question du régulateur. Le seuil est strict : à `ageSeconds`
exactement égal au délai, la mesure est encore fraîche.

Délais retenus : 300 s pour SpO₂, pouls, TA, FR, Glasgow et conscience ; 600 s
pour la douleur, la coloration et la sudation ; 900 s pour la température et la
glycémie ; aucun délai pour les données d'interrogatoire.

## Trois barrières contre les fuites de constantes

**Barrière 1 — les types.** `v3-domain.ts` n'exporte ni `InterventionVitals`, ni
`DisplayedVital`, ni `VitalsSample`. Un composant ne peut pas nommer le type des
constantes réelles. Et `InterventionSessionView` est définie par **liste
d'autorisation** — `SESSION_VIEW_FIELDS` — et non par exclusion : une liste
d'exclusion laisserait passer par défaut tout champ ajouté ensuite, ce qui avait
déjà exposé `patientState` et `roscAchieved` sans que personne l'ait décidé.

**Barrière 2 — ESLint.** `eslint.config.js` interdit à
`src/components/intervention-v3/**` d'importer `clinical/intervention-vitals`,
`reveal-fact`, le moteur ou la fabrique de session.

**Barrière 3 — les tests.** `v3-facts.test.ts` vérifie sur une session neuve
qu'aucune constante n'est lisible, et qu'aucun libellé d'absence ne contient de
chiffre. Le test de rendu sur les sept écrans, qui inspectera aussi les
attributs `aria-label`, `title` et `data-*`, viendra avec l'interface.

## Les deux natures de prérequis

Distinction apparue en écrivant le catalogue, et que le schéma impose désormais.

Les **barrières dures** — `phases`, `equipment`, `blockingActions` — décrivent
une impossibilité matérielle : on ne retire pas un capteur qu'on n'a pas posé,
on ne transmet pas un bilan sans avoir joint la régulation. L'action est refusée
sans consommer de temps.

Les **barrières souples** — `justifyingFacts`, `justifyingActions` — décrivent
une justification clinique. Leur absence **ne bloque pas** : l'action s'exécute
avec `unjustifiedEffect` et pose son marqueur. Approcher un patient sans avoir
sécurisé, ou partir sans réévaluer, doit être possible pour être une faute.

Le schéma exige l'équivalence : une action a une barrière souple si et seulement
si elle décrit l'effet de son absence.

## Confiance dans une source

Les trois niveaux sont **dérivés**, jamais déclarés — `facts/source-trust.ts` :

| Document                                              | Niveau                 |
| ----------------------------------------------------- | ---------------------- |
| publieur institutionnel ou normatif **et** contenu lu | `official_verified`    |
| support de formation                                  | `training_source`      |
| interne, ou contenu non lu                            | `internal_to_validate` |

Un décret dont seule l'URL a été validée retombe donc en
`internal_to_validate`, au même rang qu'une note interne. C'est le seul
agencement qui rende la mention non trompeuse : au 12 août 2026, neuf documents
sur cinquante-huit sont en `contentVerification: "content_verified"`.

## Le scénario pilote

`v3-pilot-trauma-cranien` — homme d'environ 42 ans, traumatisme crânien sur
chute avec inconscience, Axe N104 borne 24, témoins présents.

Il vit dans un catalogue séparé parce que `intervention-catalog.test.ts` affirme
que le catalogue historique compte exactement quinze missions enchaînées par
`unlockAfter` : y insérer le pilote casserait deux tests existants.

**Constantes initiales**, reprises des maquettes : FC 92 /min, TA 138/84 mmHg,
SpO₂ 98 %, FR 18 /min, température 36,8 °C, Glasgow 13/15, douleur 6/10,
glycémie 5,4 mmol/L.

Tout le piège pédagogique tient là : **sept constantes sur huit sont normales.**
Le seul signal est un Glasgow à 13 chez un patient qui a perdu connaissance. Un
joueur qui pose le saturomètre, trouve 98 % et part rassuré aura fait exactement
l'erreur que le scénario vise.

**Douze faits attendus au bilan**, plafond respecté sans le relever :
conscience qualitative, Glasgow, SpO₂, pouls, TA, FR, glycémie, douleur, perte
de connaissance initiale, durée de l'inconscience, antécédents, traitements.

La température reste mesurable mais sort du bilan attendu. Les circonstances
deviennent un fait de régulation, lisible dès l'écran d'appel, et ne comptent
pas comme fait à recueillir.

La glycémie est déclarée pertinente explicitement — la famille `trauma` ne
l'active pas dans le moteur clinique, et un patient confus avec perte de
connaissance initiale justifie sa mesure. Le schéma refuse d'ailleurs un
scénario qui l'attendrait au bilan sans l'activer.

`clinicalTrust: "internal_to_validate"` n'est pas une précaution de forme : ces
valeurs sont un contenu de jeu construit d'après les maquettes, pas l'extrait
d'un document lisible. Elles doivent être relues par le binôme médecin
urgentiste et formateur DEA, comme les affirmations suivies dans
`../INTERVENTION_MEDICAL_REVIEW.md`.

## Périmètre DEA

Le catalogue n'expose que des actes du **paragraphe II** de l'article
R. 6311-17, accomplis en lien constant avec le médecin : température, pulsation
cardiaque et pression artérielle par voie non invasive, glycémie, évaluation de
la douleur et de la conscience, saturation. Aucun acte du paragraphe III n'est
mobilisé : quatre de ses intitulés sont marqués `verbatim: false` dans la
bibliothèque, donc non confrontés au texte.

Injection, auto-injection, perfusion, voie veineuse, cathéter et seringue sont
exclus du jouable. La garantie est double : le schéma refuse une action jouable
dont l'identifiant, le libellé ou l'indice contient l'un de ces termes, et un
test balaie tout le catalogue. Les six actions hors périmètre en parlent
nécessairement — c'est leur raison d'être — et chacune porte le motif de son
refus.

**La tuile oxygène ne cite aucun acte, et c'est délibéré.** R. 6311-17, II, 3 ne
couvre que « l'administration en aérosols de produits non médicamenteux », ce
qui n'est pas l'oxygénothérapie, et les deux documents ANSM sur l'oxygène médical
du catalogue sont en `listing_only`. Lui rattacher un acte serait inventer une
base réglementaire. Elle est donc rattachée à `dea.c05` et au protocole local.

## Tests

`npm test` couvre les 287 tests du mode, en plus des 214 autres tests du projet.

| Fichier                      | Couvre                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `v3-facts.test.ts`           | 18 tests : invariants du registre, gel de la valeur, péremption, tendance, trous, couverture                    |
| `v3-actions.test.ts`         | 16 tests : périmètre DEA, résolubilité des références, réciprocité registre ↔ catalogue, natures de prérequis   |
| `v3-pilot.test.ts`           | 21 tests : décisions produit, constantes initiales, questions du régulateur, gestes, confiance dans les sources |
| `v3-engine.test.ts`          | 12 tests : actions, phases, trous, mesures figées, périmètre DEA                                                |
| `v3-debrief.test.ts`         | 4 tests : journal déterministe, vies, échec non profitable et glycémie                                          |
| `v3-ui.test.ts`              | 44 tests : bandeaux, écrans 1 à 3, étanchéité des constantes, accord écran ↔ moteur                             |
| `v3-anti-leak.test.ts`       | 13 tests : les douze données protégées, 84 croisements, aucun bouton décoratif                                  |
| `v3-gestures.test.ts`        | 19 tests : refus expliqués, barème du raisonnement, bornes du tour                                              |
| `v3-reevaluation.test.ts`    | 21 tests : péremption, cycles, renfort, sanction du départ                                                      |
| `v3-handover.test.ts`        | 26 tests : les quatre issues, questions du régulateur, refus de conclure                                        |
| `v3-debrief-complet.test.ts` | 21 tests : huit sections, note complète, ordre du recueil                                                       |
| `v3-ui-screens.test.ts`      | 22 tests : écrans 4 à 6, étanchéité, barrière de la couche présentation                                         |

Deux tests méritent d'être lus avant de toucher au contrat. « la valeur relevée
est figée » dégrade la SpO₂ du patient après la mesure et vérifie que l'écran
affiche toujours la valeur relevée. « un bilan complet ne déclenche aucune
question du régulateur » vérifie que les questions naissent des trous et de rien
d'autre.

## La couche présentation

`ui/` contient un module par écran de maquette. Chacun est une **fonction pure**
qui prend une `InterventionSessionView` et rend ce que l'écran doit afficher :
libellés, valeurs, boutons actifs. Aucun composant React n'y figure.

Ce découpage n'est pas une élégance : ni `vite build` ni serveur de dev ne
s'exécutent dans l'environnement de développement distant, et le dépôt n'a aucun
outillage de rendu DOM. Un écran écrit directement en JSX y serait
**invérifiable**. Sorti en fonction, il se teste — `tests/v3-ui.test.ts` couvre
44 cas.

| Module                   | Écran                     | État                  |
| ------------------------ | ------------------------- | --------------------- |
| `hud-model.ts`           | bandeau des 5 maquettes   | fait — 4 dispositions |
| `new-call-screen.ts`     | 1 — Nouvel appel          | fait                  |
| `arrival-screen.ts`      | 2 — Arrivée sur les lieux | fait                  |
| `vitals-screen.ts`       | 3 — Constantes en direct  | fait                  |
| `action-availability.ts` | boutons actifs, partout   | fait                  |

**Deux règles tenues par des tests.**

`actionAvailability` ne décide pas de ce qui est refusé : il interroge
`actionRefusal`, dans le moteur, et ne traduit que la nature du refus en phrase
affichable. La première version de l'écran d'arrivée rejouait ces règles de son
côté et en avait déjà perdu deux — le capteur posé, et le fait qu'une action
refusée ne compte pas comme accomplie. Un test vérifie désormais qu'un geste est
actif **si et seulement si** le moteur l'accepte.

Aucune valeur clinique n'est lue autrement que par `readFact`. Un test rend la
règle mécanique : sur une session vierge à la phase des constantes, aucun chiffre
n'apparaît dans le texte de l'écran — ni dans les cartes, ni dans les
évaluations, ni dans le récit.

## Reste à faire

**Interface.** La persistance et la reprise d'une mission interrompue. Les
composants ne sont **pas exécutables dans l'environnement de développement
distant** : ni `vite build` ni outillage de rendu DOM n'y tournent. Ce qui est
vérifié d'eux est leur surface d'accès — de quoi ils dépendent — et non leur
rendu. Un composant qui n'importe que des types de modèle et des icônes ne peut
lire aucune donnée cachée, qu'on puisse le rendre ou non, mais que le JSX câble
correctement les modèles reste à vérifier sur une machine qui sait les lancer.

**L'arbre de routes** `routeTree.gen.ts` est régénéré par le plugin Vite, qui ne
tourne pas ici. L'entrée de `/intervention-v3` y a été ajoutée à la main en
suivant exactement le motif des autres routes ; la prochaine régénération la
réécrira à l'identique.

**Deux points ouverts, connus et non corrigés.** « Réévaluer le patient »
rapporte huit points sans plafond d'utilisation : un joueur qui a des constantes
fraîches peut la rejouer, chaque appel coûtant soixante secondes simulées. Et une
mission bien menée sature le plafond de cent, si bien que la note finale ne
distingue plus deux bonnes parties — l'écart reste lisible dans les axes et dans
les reproches, pas dans le score.

**Points ouverts.** La politique d'indices `hintPolicy` par niveau de difficulté,
la persistance versionnée des sessions, la nature du rejeu et le comportement de
la barre d'onglets pendant une intervention. La glycémie reste en mmol/L dans le
moteur et ne passe en g/L qu'au formatage UI, sans interprétation médicale.
