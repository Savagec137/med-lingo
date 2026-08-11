import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-05");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const SOURCE_TITLE = "B2.M4 - Support Etudiant.pdf";
const SOURCE_VERSION = "Version 1 - Août 2022";
const PARCOURS_ID = "parcours-05";
const CONTENT_ID = "dea-p05";
const LEGACY_FILE = join(OUTPUT_DIR, "legacy-import-lesson-08.json");

const source = (section, pages) => ({ section, pages, pageStatus: "verified" });

const KNOWLEDGE = [
  {
    knowledgeId: "K-DEA-P05-001",
    title: "Rôle et composition de l’appareil circulatoire",
    summary:
      "L’appareil circulatoire forme un circuit fermé qui distribue aux cellules oxygène, nutriments, hormones et autres molécules, puis récupère des déchets et substances élaborées.",
    keyPoints: [
      "Le cœur constitue la pompe du circuit.",
      "Les vaisseaux sanguins constituent les canalisations.",
      "Le sang est le contenu circulant du circuit.",
    ],
    commonErrors: [
      "Réduire l’appareil circulatoire au seul cœur.",
      "Oublier son rôle de récupération des déchets.",
    ],
    clinicalApplication:
      "Identifier séparément la pompe, les vaisseaux et le sang aide à structurer l’observation cardiovasculaire sans poser de diagnostic.",
    ...source("Appareil circulatoire - rôle et vue d’ensemble", [18]),
    competencyIds: ["body.system.cardiovascular", "body.organization.organ-to-system"],
    lessonIds: ["dea-p05-l01", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-002",
    title: "Nature et situation du cœur",
    summary:
      "Le cœur est un muscle creux involontaire, enveloppé par le péricarde, situé entre les deux poumons avec sa pointe orientée vers la gauche.",
    keyPoints: [
      "Le cœur se contracte et se dilate sans intervention de la volonté.",
      "Le péricarde est une poche à double paroi qui enveloppe le cœur.",
      "Le cœur se situe entre les deux poumons.",
    ],
    commonErrors: [
      "Décrire le cœur comme un muscle volontaire.",
      "Confondre péricarde et myocarde.",
    ],
    clinicalApplication:
      "Ces repères permettent de situer l’organe et d’utiliser un vocabulaire anatomique précis dans une transmission.",
    ...source("Appareil circulatoire - Le cœur", [18]),
    competencyIds: ["body.system.cardiovascular", "body.organ.definition", "body.organ.location"],
    lessonIds: ["dea-p05-l01", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-003",
    title: "Quatre cavités et sens du sang dans le cœur",
    summary:
      "Le cœur comporte deux oreillettes et deux ventricules ; le sang arrive par les veines au niveau des oreillettes et repart par les artères au niveau des ventricules.",
    keyPoints: [
      "Les cavités droites reçoivent un sang appauvri en oxygène destiné aux poumons.",
      "Les cavités gauches reçoivent des poumons un sang riche en oxygène destiné aux cellules.",
      "Oreillettes et ventricules communiquent par des valves.",
    ],
    commonErrors: [
      "Inverser oreillettes et ventricules dans le sens d’arrivée et de départ.",
      "Associer artère et veine uniquement à la teneur en oxygène.",
    ],
    clinicalApplication:
      "Le sens de circulation permet de comprendre les termes utilisés lors d’un bilan et sur un schéma cardiovasculaire.",
    ...source("Appareil circulatoire - Le cœur et ses cavités", [18]),
    competencyIds: ["body.system.cardiovascular", "body.organ.composition", "body.organ.function"],
    lessonIds: ["dea-p05-l01", "dea-p05-l04", "dea-p05-l05", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-004",
    title: "Fonctionnement et cycle cardiaques",
    summary:
      "Le myocarde se contracte sous l’effet d’impulsions électriques involontaires ; le cycle alterne diastole, systole auriculaire et systole ventriculaire.",
    keyPoints: [
      "La diastole est la phase de relaxation et de remplissage des oreillettes décrite par le support.",
      "La systole auriculaire correspond à la contraction des oreillettes.",
      "La systole ventriculaire correspond à la contraction des ventricules.",
    ],
    commonErrors: ["Définir la diastole comme une contraction des ventricules."],
    clinicalApplication:
      "Distinguer contraction, relaxation et remplissage aide à comprendre les paramètres cardiovasculaires observés.",
    ...source("Appareil circulatoire - Le fonctionnement cardiaque", [20]),
    competencyIds: ["body.system.cardiovascular", "body.organ.function"],
    lessonIds: ["dea-p05-l01", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-005",
    title: "Artères et veines : sens de circulation",
    summary:
      "Les artères conduisent le sang du cœur vers les organes, tandis que les veines ramènent le sang des organes vers le cœur.",
    keyPoints: [
      "Le sens par rapport au cœur définit artère et veine.",
      "Les artères se ramifient en vaisseaux de plus en plus petits.",
      "Les veines ramènent le sang vers le cœur.",
    ],
    commonErrors: [
      "Définir systématiquement une artère comme riche en oxygène et une veine comme pauvre en oxygène.",
    ],
    clinicalApplication:
      "Le sens de circulation est un repère fiable pour nommer un vaisseau sans déduire sa teneur en oxygène.",
    ...source("Appareil circulatoire - Les vaisseaux sanguins", [18, 19]),
    competencyIds: ["body.system.cardiovascular"],
    lessonIds: ["dea-p05-l02", "dea-p05-l04", "dea-p05-l05", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-006",
    title: "Capillaires et échanges cellulaires",
    summary:
      "Les capillaires se situent à la jonction entre artères et veines ; leur fine paroi et la lenteur du flux favorisent les échanges avec les cellules.",
    keyPoints: [
      "Les capillaires relient le réseau artériel au réseau veineux.",
      "Ils constituent le lieu d’échange avec les cellules.",
      "Leur paroi fine favorise le passage des substances.",
    ],
    commonErrors: ["Présenter les capillaires comme des cavités du cœur."],
    clinicalApplication:
      "Comprendre leur rôle permet de relier circulation et échanges tissulaires sans extrapoler à un diagnostic.",
    ...source("Appareil circulatoire - Les vaisseaux sanguins", [18]),
    competencyIds: ["body.system.cardiovascular"],
    lessonIds: ["dea-p05-l02", "dea-p05-l04", "dea-p05-l05", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-007",
    title: "Retour veineux et valves",
    summary:
      "Le retour veineux vers le cœur est aidé par les contractions musculaires et par des valves qui limitent le retour à contre-courant.",
    keyPoints: [
      "Les veines ramènent le sang vers le cœur.",
      "Les muscles participent à une fonction de pompage.",
      "Les valves limitent le reflux à contre-courant.",
    ],
    commonErrors: ["Attribuer aux valves veineuses la propulsion initiale du sang depuis le cœur."],
    clinicalApplication:
      "Cette organisation explique la direction générale du retour veineux décrite dans le support.",
    ...source("Appareil circulatoire - Les veines", [19]),
    competencyIds: ["body.system.cardiovascular"],
    lessonIds: ["dea-p05-l02", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-008",
    title: "Sang et plasma",
    summary:
      "Le sang transporte notamment nutriments, oxygène, dioxyde de carbone, déchets, cellules et chaleur ; sa phase liquide est le plasma.",
    keyPoints: [
      "Le plasma constitue la phase liquide du sang.",
      "Le support décrit le plasma comme formé d’eau, de fibrinogène et de sels minéraux.",
      "Les cellules sanguines circulent dans le plasma.",
    ],
    commonErrors: ["Confondre plasma et globules rouges."],
    clinicalApplication:
      "Distinguer phase liquide et cellules aide à comprendre les rôles complémentaires des constituants du sang.",
    ...source("Appareil circulatoire - Le sang", [19]),
    competencyIds: ["body.system.cardiovascular", "body.tissue"],
    lessonIds: ["dea-p05-l03", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-009",
    title: "Cellules sanguines et fonctions principales",
    summary:
      "Le support distingue globules rouges, globules blancs et plaquettes, associés respectivement au transport des gaz, à la défense et à la limitation des phénomènes hémorragiques.",
    keyPoints: [
      "Les globules rouges transportent l’oxygène et le dioxyde de carbone.",
      "Les globules blancs participent à la défense de l’organisme.",
      "Les plaquettes s’agglutinent pour colmater des brèches et limiter les phénomènes hémorragiques.",
    ],
    commonErrors: [
      "Attribuer aux globules blancs le transport principal des gaz.",
      "Confondre rôle des plaquettes et rôle du plasma.",
    ],
    clinicalApplication:
      "Ces distinctions permettent d’expliquer une fonction générale sans interpréter un résultat biologique.",
    ...source("Appareil circulatoire - Le sang", [19]),
    competencyIds: ["body.system.cardiovascular", "body.tissue"],
    lessonIds: ["dea-p05-l03", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-010",
    title: "Petite circulation pulmonaire",
    summary:
      "La petite circulation relie le ventricule droit aux poumons puis à l’oreillette gauche par l’artère pulmonaire, les capillaires pulmonaires et les veines pulmonaires.",
    keyPoints: [
      "Elle débute au ventricule droit.",
      "Elle traverse les capillaires pulmonaires.",
      "Elle revient à l’oreillette gauche par les veines pulmonaires.",
    ],
    commonErrors: [
      "Faire débuter la petite circulation au ventricule gauche.",
      "Y placer l’aorte ou les veines caves.",
    ],
    clinicalApplication:
      "Le trajet permet de distinguer circulation pulmonaire et circulation tissulaire sur un schéma.",
    ...source("Appareil circulatoire - La grande et la petite circulation", [21]),
    competencyIds: ["body.system.cardiovascular"],
    lessonIds: ["dea-p05-l04", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-011",
    title: "Grande circulation tissulaire",
    summary:
      "La grande circulation relie le ventricule gauche aux tissus puis à l’oreillette droite par l’aorte, les capillaires cellulaires et les veines caves.",
    keyPoints: [
      "Elle débute au ventricule gauche.",
      "L’aorte conduit le sang vers les organes et les capillaires cellulaires.",
      "Les veines caves ramènent le sang à l’oreillette droite.",
    ],
    commonErrors: [
      "Faire revenir la grande circulation à l’oreillette gauche.",
      "Y placer les veines pulmonaires.",
    ],
    clinicalApplication:
      "Le trajet permet de situer les échanges tissulaires dans la circulation générale.",
    ...source("Appareil circulatoire - La grande et la petite circulation", [21]),
    competencyIds: ["body.system.cardiovascular"],
    lessonIds: ["dea-p05-l05", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-012",
    title: "Tensiomètres manuel et automatique",
    summary:
      "Le tensiomètre manuel associe un manchon, une poire avec valve et un manomètre ; un appareil automatique affiche la pression artérielle et la fréquence cardiaque.",
    keyPoints: [
      "Le manchon doit être adapté à la morphologie du patient.",
      "La poire gonfle le manchon et sa valve permet un dégonflage progressif.",
      "Le manomètre mesure la contre-pression exercée sur le bras.",
    ],
    commonErrors: ["Utiliser un brassard sans tenir compte de la taille du patient."],
    clinicalApplication:
      "Identifier les éléments du tensiomètre permet de préparer un matériel adapté avant la mesure.",
    ...source("Les matériels de mesures - Le tensiomètre", [53]),
    competencyIds: ["body.system.cardiovascular"],
    lessonIds: ["dea-p05-l06", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-013",
    title: "Mesure manuelle de la pression artérielle",
    summary:
      "La mesure manuelle utilise un brassard adapté, posé sur un patient au repos ; le premier battement net correspond à la valeur systolique et le dernier à la valeur diastolique.",
    keyPoints: [
      "Le support demande un patient au repos depuis dix minutes, en décubitus dorsal.",
      "Le brassard se place environ deux centimètres au-dessus du pli du coude.",
      "Un brassard trop petit surestime les valeurs et un brassard trop grand les sous-estime.",
    ],
    commonErrors: [
      "Inverser valeurs systolique et diastolique.",
      "Négliger l’adaptation du brassard ou la position du patient.",
    ],
    clinicalApplication:
      "Respecter les conditions et transmettre les deux valeurs améliore la fiabilité du bilan chiffré.",
    ...source("Mesures des paramètres vitaux - Pression artérielle manuelle", [66, 67]),
    competencyIds: ["body.system.cardiovascular"],
    lessonIds: ["dea-p05-l06", "dea-p05-l08", "dea-p05-boss"],
  },
  {
    knowledgeId: "K-DEA-P05-014",
    title: "Évaluation du pouls",
    summary:
      "L’évaluation du pouls apprécie sa fréquence, son amplitude et son rythme ; le pouls radial se recherche à la base du pouce avec l’index et le majeur.",
    keyPoints: [
      "La fréquence correspond au nombre de pulsations sur une minute dans la technique décrite.",
      "L’amplitude peut être forte, faible, filante ou imperceptible.",
      "Le rythme est décrit comme régulier ou irrégulier.",
    ],
    commonErrors: [
      "Utiliser son propre pouce pour palper le pouls radial.",
      "Transmettre uniquement la fréquence sans amplitude ni rythme.",
    ],
    clinicalApplication:
      "Une transmission structurée associe site de prise, fréquence, rythme et amplitude observés.",
    ...source("Mesures des paramètres vitaux - Fréquence cardiaque et pouls", [67, 68]),
    competencyIds: ["body.system.cardiovascular"],
    lessonIds: ["dea-p05-l07", "dea-p05-l08", "dea-p05-boss"],
  },
].map((entry) => ({
  ...entry,
  sourceDocument: SOURCE_ID,
  sourceTitle: SOURCE_TITLE,
  sourceType: "training_source",
  plannedParcoursIds: [PARCOURS_ID],
  status: "to_validate",
}));

function O(text, explanation, { correct = false, distractorType, match } = {}) {
  return { text, explanation, correct, distractorType, match };
}

function F(whyCorrect, commonMistake, keyTakeaway, fieldApplication, extras = {}) {
  return { whyCorrect, commonMistake, keyTakeaway, fieldApplication, ...extras };
}

function Q(kind, prompt, options, knowledgeIds, pedagogicalFeedback, extras = {}) {
  return { kind, prompt, options, knowledgeIds, feedback: pedagogicalFeedback, ...extras };
}

const LESSONS = [
  {
    id: "dea-p05-l01",
    title: "Le cœur",
    pages: "18, 20",
    section: "Appareil circulatoire - Le cœur et son fonctionnement",
    objectives: [
      "Situer le cœur et décrire sa nature.",
      "Identifier ses quatre cavités et le sens général du sang.",
      "Distinguer les phases du cycle cardiaque décrites par le support.",
    ],
    competencyIds: [
      "body.system.cardiovascular",
      "body.organ.definition",
      "body.organ.function",
      "body.organ.location",
    ],
    questions: [
      Q(
        "single",
        "Dans l’appareil circulatoire, quelle fonction générale le cœur assure-t-il ?",
        [
          O(
            "La fonction de pompe du circuit",
            "Le support présente le cœur comme la pompe du circuit fermé.",
            { correct: true },
          ),
          O(
            "La fonction d’échange avec toutes les cellules",
            "Les échanges se réalisent surtout au niveau des capillaires.",
            { distractorType: "secondary-priority" },
          ),
          O(
            "La fabrication de toutes les cellules sanguines",
            "Le support indique que les cellules sanguines sont issues de la moelle osseuse.",
            { distractorType: "other-context" },
          ),
          O(
            "La commande volontaire des vaisseaux",
            "Le fonctionnement cardiaque décrit échappe au contrôle volontaire.",
            { distractorType: "frequent-error" },
          ),
        ],
        ["K-DEA-P05-001"],
        F(
          "Le cœur est la pompe qui met le sang en mouvement dans le circuit fermé.",
          "Confondre la pompe avec les lieux d’échange fait attribuer au cœur le rôle des capillaires.",
          "Cœur : pompe ; vaisseaux : canalisations ; sang : contenu circulant.",
          "Structurer une transmission en distinguant organe, vaisseaux et sang.",
          { memoryTip: "Pompe, tuyaux, contenu : cœur, vaisseaux, sang." },
        ),
        { tags: ["coeur", "role"] },
      ),
      Q(
        "true_false",
        "Le cœur est décrit comme un muscle creux dont l’activité ne dépend pas de la volonté.",
        [],
        ["K-DEA-P05-002", "K-DEA-P05-004"],
        F(
          "La proposition reprend la nature musculaire, creuse et involontaire du cœur décrite dans le support.",
          "Le mot « muscle » peut faire penser à tort à un mouvement volontaire.",
          "Le cœur est un muscle creux à activité involontaire.",
          "Employer cette description sans confondre le cœur avec un muscle squelettique.",
        ),
        {
          correct: true,
          trueExplanation:
            "Le support décrit bien un muscle creux qui se contracte sans intervention de la volonté.",
          falseExplanation:
            "Faux serait incorrect : l’activité cardiaque décrite est involontaire.",
          tags: ["coeur", "nature"],
        },
      ),
      Q(
        "multiple_choice",
        "Quels repères anatomiques correspondent au cœur dans le support ?",
        [
          O(
            "Il est situé entre les deux poumons",
            "Le support localise le cœur entre les poumons.",
            { correct: true },
          ),
          O(
            "Sa pointe est tournée vers la gauche",
            "L’orientation de la pointe vers la gauche est explicitement indiquée.",
            { correct: true },
          ),
          O("Il est situé sous le bassin", "Cette localisation ne correspond pas au support.", {
            distractorType: "sign-misinterpretation",
          }),
          O(
            "Sa pointe est toujours tournée vers la droite",
            "Cette orientation inverse celle décrite.",
            { distractorType: "frequent-error" },
          ),
        ],
        ["K-DEA-P05-002"],
        F(
          "Les deux repères exacts sont une position entre les poumons et une pointe orientée vers la gauche.",
          "Une représentation de face peut conduire à inverser droite et gauche.",
          "Le cœur est intrathoracique, entre les poumons, avec une pointe vers la gauche.",
          "Utiliser des repères anatomiques précis plutôt qu’une formule vague comme « dans la poitrine ».",
        ),
        {
          instruction: "Sélectionne les deux réponses correctes.",
          tags: ["coeur", "localisation"],
          difficulty: "easy",
        },
      ),
      Q(
        "matching",
        "Associe chaque ensemble de cavités au rôle indiqué dans le support.",
        [
          O(
            "Oreillette et ventricule droits",
            "Les cavités droites récupèrent le sang appauvri en oxygène.",
            { match: "Reçoivent le sang appauvri en O2 destiné aux poumons" },
          ),
          O(
            "Oreillette et ventricule gauches",
            "Les cavités gauches reçoivent des poumons le sang riche en oxygène.",
            { match: "Reçoivent le sang riche en O2 destiné aux cellules" },
          ),
          O("Oreillettes", "Le sang arrive au cœur au niveau des oreillettes.", {
            match: "Cavités d’arrivée du sang",
          }),
          O("Ventricules", "Le sang part du cœur au niveau des ventricules.", {
            match: "Cavités de départ du sang",
          }),
        ],
        ["K-DEA-P05-003"],
        F(
          "Chaque association suit le côté du cœur et le sens d’arrivée ou de départ décrits page 18.",
          "L’erreur fréquente consiste à inverser oreillette et ventricule ou côté droit et côté gauche.",
          "Oreillettes : arrivée ; ventricules : départ ; droite vers poumons ; gauche vers cellules.",
          "Lire un schéma cardiaque en suivant le sens des flèches plutôt que la seule couleur.",
          { memoryTip: "O reçoit, V propulse." },
        ),
        {
          instruction: "Associe chaque élément.",
          tags: ["coeur", "cavites"],
          difficulty: "medium",
        },
      ),
      Q(
        "ordering",
        "Remets dans l’ordre les phases du cycle cardiaque décrites par le support.",
        [
          O(
            "Diastole : relaxation et remplissage",
            "Le cycle décrit commence par la phase de relaxation.",
          ),
          O(
            "Systole auriculaire : contraction des oreillettes",
            "La contraction auriculaire suit la diastole.",
          ),
          O(
            "Systole ventriculaire : contraction des ventricules",
            "La contraction ventriculaire constitue la phase suivante.",
          ),
        ],
        ["K-DEA-P05-004"],
        F(
          "Le support décrit successivement diastole, systole auriculaire puis systole ventriculaire.",
          "Assimiler toute systole à une seule phase fait oublier la distinction auriculaire et ventriculaire.",
          "Relaxation, contraction des oreillettes, contraction des ventricules.",
          "Employer ces termes avec leur phase exacte lors d’une explication physiologique.",
          { memoryTip: "D-A-V : Diastole, Auriculaire, Ventriculaire." },
        ),
        { tags: ["coeur", "cycle"], pages: "20", difficulty: "medium" },
      ),
      Q(
        "fill_blank",
        "Complète : le cœur est constitué de ______ cavités.",
        [
          O("quatre", "Deux oreillettes et deux ventricules forment quatre cavités.", {
            correct: true,
          }),
        ],
        ["K-DEA-P05-003"],
        F(
          "Le cœur comporte deux oreillettes et deux ventricules, soit quatre cavités.",
          "Compter uniquement les côtés droit et gauche conduit à répondre deux.",
          "Deux oreillettes + deux ventricules = quatre cavités.",
          "Vérifier sur un schéma que les quatre cavités sont identifiées.",
        ),
        { tags: ["coeur", "cavites"], pages: "18" },
      ),
      Q(
        "clinical_case",
        "Lors d’un exercice de repérage, un étudiant désigne la poche à double paroi qui enveloppe le cœur. Quel terme doit-il employer ?",
        [
          O(
            "Le péricarde",
            "Le support nomme péricarde la poche à double paroi enveloppant le cœur.",
            { correct: true },
          ),
          O("Le myocarde", "Le myocarde désigne le muscle cardiaque dans le support.", {
            distractorType: "frequent-error",
          }),
          O("L’aorte", "L’aorte est une artère qui part du ventricule gauche.", {
            distractorType: "other-context",
          }),
          O("La veine cave", "Les veines caves ramènent le sang à l’oreillette droite.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-002"],
        F(
          "La structure décrite est le péricarde, enveloppe à double paroi du cœur.",
          "Péricarde et myocarde sont proches lexicalement mais ne désignent pas la même structure.",
          "Péricarde : enveloppe ; myocarde : muscle cardiaque.",
          "Choisir le terme anatomique exact dans une transmission descriptive.",
          {
            safetyPoint: "Un repérage anatomique ne suffit pas à conclure à une atteinte clinique.",
          },
        ),
        { tags: ["coeur", "pericarde", "cas"], pages: "18", difficulty: "hard" },
      ),
      Q(
        "true_false",
        "Le support indique une communication directe normale entre les cavités droites et gauches du cœur.",
        [],
        ["K-DEA-P05-003"],
        F(
          "L’affirmation est fausse : le support précise qu’il ne doit pas exister de communication entre cavités droites et gauches.",
          "La communication normale entre oreillette et ventricule d’un même côté peut être confondue avec une communication entre les deux côtés.",
          "Les deux côtés sont séparés ; oreillette et ventricule d’un même côté communiquent par des valves.",
          "Suivre chaque côté séparément sur le schéma cardiaque.",
        ),
        {
          correct: false,
          trueExplanation:
            "Vrai serait incorrect : les côtés droit et gauche sont décrits comme séparés.",
          falseExplanation:
            "Le support exclut une communication normale entre les cavités droites et gauches.",
          tags: ["coeur", "cavites"],
        },
      ),
    ],
  },
  {
    id: "dea-p05-l02",
    title: "Les vaisseaux",
    pages: "18-19",
    section: "Appareil circulatoire - Les vaisseaux sanguins",
    objectives: [
      "Distinguer artères, veines et capillaires.",
      "Décrire le sens de circulation par rapport au cœur.",
      "Comprendre le rôle des capillaires et des valves veineuses.",
    ],
    competencyIds: ["body.system.cardiovascular"],
    prerequisiteIds: ["dea-p05-l01"],
    questions: [
      Q(
        "single",
        "Quel critère définit une artère dans le support ?",
        [
          O(
            "Elle conduit le sang du cœur vers les organes",
            "Le sens du cœur vers les organes définit l’artère.",
            { correct: true },
          ),
          O("Elle ramène toujours le sang vers le cœur", "Ce sens correspond aux veines.", {
            distractorType: "frequent-error",
          }),
          O(
            "Elle est toujours pauvre en oxygène",
            "La teneur en oxygène ne définit pas une artère.",
            { distractorType: "sign-misinterpretation" },
          ),
          O(
            "Elle assure seule les échanges cellulaires",
            "Les capillaires sont le lieu d’échange décrit.",
            { distractorType: "secondary-priority" },
          ),
        ],
        ["K-DEA-P05-005"],
        F(
          "Une artère conduit le sang du cœur vers les organes.",
          "Associer artère à sang oxygéné sans considérer le sens conduit à une erreur avec l’artère pulmonaire.",
          "Artère = part du cœur.",
          "Nommer le vaisseau à partir du sens de circulation.",
          { memoryTip: "A comme Artère et Aller depuis le cœur." },
        ),
        { tags: ["vaisseaux", "arteres"] },
      ),
      Q(
        "single",
        "Quel sens de circulation caractérise une veine ?",
        [
          O("Des organes vers le cœur", "Les veines ramènent le sang vers le cœur.", {
            correct: true,
          }),
          O("Du cœur vers les organes", "Ce sens caractérise une artère.", {
            distractorType: "frequent-error",
          }),
          O(
            "Uniquement des poumons vers les cellules",
            "Cette formulation mélange les deux circulations.",
            { distractorType: "sign-misinterpretation" },
          ),
          O("Uniquement entre deux capillaires", "Le support ne définit pas ainsi les veines.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-005", "K-DEA-P05-007"],
        F(
          "Une veine ramène le sang des organes vers le cœur.",
          "Le sens est parfois inversé en se fiant à la couleur d’un schéma plutôt qu’aux flèches.",
          "Veine = revient vers le cœur.",
          "Suivre la direction des flèches sur un schéma de circulation.",
          { memoryTip: "V comme Veine et Venir vers le cœur." },
        ),
        { tags: ["vaisseaux", "veines"] },
      ),
      Q(
        "true_false",
        "Les capillaires sont décrits comme le principal lieu d’échange avec les cellules.",
        [],
        ["K-DEA-P05-006"],
        F(
          "La proposition est vraie : fine paroi et circulation lente favorisent les échanges.",
          "Confondre transport et échange conduit à attribuer ce rôle aux gros vaisseaux.",
          "Les capillaires relient les réseaux et permettent les échanges cellulaires.",
          "Relier un paramètre circulatoire à la perfusion tissulaire sans poser de diagnostic.",
        ),
        {
          correct: true,
          trueExplanation: "Le support situe les échanges avec les cellules dans les capillaires.",
          falseExplanation:
            "Faux serait incorrect : les capillaires sont explicitement le lieu d’échange.",
          tags: ["vaisseaux", "capillaires"],
        },
      ),
      Q(
        "matching",
        "Associe chaque vaisseau à sa fonction générale.",
        [
          O("Artère", "Elle conduit le sang depuis le cœur.", {
            match: "Du cœur vers les organes",
          }),
          O("Capillaire", "Il permet les échanges avec les cellules.", {
            match: "Jonction et échanges cellulaires",
          }),
          O("Veine", "Elle ramène le sang vers le cœur.", { match: "Des organes vers le cœur" }),
        ],
        ["K-DEA-P05-005", "K-DEA-P05-006"],
        F(
          "Les associations reposent sur le sens de circulation et la fonction d’échange.",
          "L’erreur courante est de classer selon l’oxygénation au lieu du sens par rapport au cœur.",
          "Artère : départ ; capillaire : échange ; veine : retour.",
          "Décrire le trajet d’un flux de manière ordonnée.",
        ),
        {
          instruction: "Associe chaque élément.",
          tags: ["vaisseaux", "association"],
          difficulty: "medium",
        },
      ),
      Q(
        "ordering",
        "Remets dans l’ordre le trajet général du sang dans un circuit fermé.",
        [
          O("Cœur", "Le cœur met le sang en mouvement."),
          O("Artères", "Les artères conduisent le sang vers les organes."),
          O("Capillaires", "Les échanges se font au niveau capillaire."),
          O("Veines", "Les veines ramènent le sang."),
          O("Retour au cœur", "Le circuit se referme au cœur."),
        ],
        ["K-DEA-P05-001", "K-DEA-P05-005", "K-DEA-P05-006"],
        F(
          "Le trajet général suit cœur, artères, capillaires, veines puis retour au cœur.",
          "Placer les veines avant les capillaires inverse le sens général du réseau.",
          "Pompe, départ artériel, échanges capillaires, retour veineux.",
          "Reconstituer un trajet avant d’interpréter un schéma plus détaillé.",
        ),
        { tags: ["vaisseaux", "ordre"], difficulty: "medium" },
      ),
      Q(
        "true_false",
        "Une veine est définie uniquement par le fait qu’elle transporte un sang pauvre en oxygène.",
        [],
        ["K-DEA-P05-005"],
        F(
          "L’affirmation est fausse : une veine est définie par le retour du sang vers le cœur.",
          "La règle simplifiée oxygéné/désoxygéné échoue pour les vaisseaux pulmonaires.",
          "Le sens par rapport au cœur prime sur la teneur en oxygène.",
          "Utiliser les termes artère et veine correctement dans une transmission.",
        ),
        {
          correct: false,
          trueExplanation:
            "Vrai serait incorrect : le support définit les veines par leur direction.",
          falseExplanation:
            "Les veines pulmonaires montrent qu’une veine peut transporter un sang riche en oxygène.",
          tags: ["vaisseaux", "definition"],
          difficulty: "hard",
        },
      ),
      Q(
        "clinical_case",
        "Sur un schéma, un vaisseau ramène des poumons vers l’oreillette gauche un sang riche en oxygène. Comment le nommer correctement ?",
        [
          O(
            "Veine pulmonaire",
            "Elle revient des poumons vers le cœur : c’est une veine pulmonaire.",
            { correct: true },
          ),
          O("Artère pulmonaire", "L’artère pulmonaire part du ventricule droit vers les poumons.", {
            distractorType: "frequent-error",
          }),
          O("Aorte", "L’aorte part du ventricule gauche vers la grande circulation.", {
            distractorType: "other-context",
          }),
          O("Veine cave", "Les veines caves reviennent des tissus à l’oreillette droite.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-003", "K-DEA-P05-005"],
        F(
          "Le vaisseau revient au cœur depuis les poumons : il s’agit d’une veine pulmonaire.",
          "La richesse en oxygène peut faire choisir à tort une artère.",
          "Veine pulmonaire : retour des poumons vers l’oreillette gauche.",
          "Se fonder sur le sens du flux et son point d’arrivée.",
        ),
        { tags: ["vaisseaux", "pulmonaire", "cas"], pages: "18", difficulty: "hard" },
      ),
      Q(
        "fill_blank",
        "Complète : dans les veines, un système de ______ limite les retours à contre-courant.",
        [
          O("valves", "Les valves veineuses limitent le reflux à contre-courant.", {
            correct: true,
          }),
        ],
        ["K-DEA-P05-007"],
        F(
          "Le mot attendu est « valves ».",
          "Les contractions musculaires aident le retour, mais ne remplacent pas les valves dans cette phrase.",
          "Les valves veineuses limitent le reflux.",
          "Distinguer les mécanismes complémentaires du retour veineux.",
        ),
        { tags: ["vaisseaux", "valves"], pages: "19" },
      ),
    ],
  },
  {
    id: "dea-p05-l03",
    title: "Le sang",
    pages: "19",
    section: "Appareil circulatoire - Le sang",
    objectives: [
      "Identifier les fonctions générales du sang.",
      "Distinguer plasma et cellules sanguines.",
      "Associer globules rouges, globules blancs et plaquettes à leur rôle principal.",
    ],
    competencyIds: ["body.system.cardiovascular", "body.tissue"],
    prerequisiteIds: ["dea-p05-l02"],
    questions: [
      Q(
        "multiple_choice",
        "Quelles substances ou éléments le sang transporte-t-il selon le support ?",
        [
          O("L’oxygène et le dioxyde de carbone", "Ces deux gaz sont explicitement cités.", {
            correct: true,
          }),
          O(
            "Des nutriments et des déchets",
            "Nutriments et déchets sont cités dans les transports du sang.",
            { correct: true },
          ),
          O("Uniquement des hormones", "Le sang ne transporte pas uniquement des hormones.", {
            distractorType: "frequent-error",
          }),
          O("Uniquement de l’eau", "Le sang transporte bien plus que de l’eau.", {
            distractorType: "frequent-error",
          }),
        ],
        ["K-DEA-P05-008"],
        F(
          "Le sang transporte notamment gaz respiratoires, nutriments et déchets.",
          "Réduire le sang à un seul transport fait perdre sa fonction multiple.",
          "Le sang est un moyen de transport pour plusieurs substances et pour la chaleur.",
          "Identifier la fonction générale sans déduire un résultat biologique.",
        ),
        { instruction: "Sélectionne les deux réponses correctes.", tags: ["sang", "transport"] },
      ),
      Q(
        "single",
        "Comment le support nomme-t-il la phase liquide du sang ?",
        [
          O("Le plasma", "Le plasma est la phase liquide du sang.", { correct: true }),
          O("Les érythrocytes", "Les érythrocytes sont des cellules sanguines.", {
            distractorType: "frequent-error",
          }),
          O("Les plaquettes", "Les plaquettes sont des éléments figurés du sang.", {
            distractorType: "other-context",
          }),
          O(
            "La moelle osseuse",
            "La moelle osseuse est citée comme origine des cellules sanguines.",
            { distractorType: "other-context" },
          ),
        ],
        ["K-DEA-P05-008"],
        F(
          "La phase liquide est le plasma, dans lequel circulent les cellules sanguines.",
          "Confondre phase liquide et cellules revient à mélanger contenant et éléments circulants.",
          "Plasma : phase liquide ; cellules : éléments circulants.",
          "Employer le bon niveau de description lorsqu’on explique la composition du sang.",
        ),
        { tags: ["sang", "plasma"] },
      ),
      Q(
        "true_false",
        "Le plasma est décrit comme constitué notamment d’eau, de fibrinogène et de sels minéraux.",
        [],
        ["K-DEA-P05-008"],
        F(
          "La proposition reprend les constituants cités dans le support.",
          "Le plasma est parfois assimilé à de l’eau pure, ce qui est incomplet.",
          "Le plasma est une phase liquide contenant plusieurs constituants.",
          "Ne pas réduire un constituant biologique à un seul de ses composants.",
        ),
        {
          correct: true,
          trueExplanation: "Ces constituants sont explicitement cités page 19.",
          falseExplanation:
            "Faux serait incorrect : eau, fibrinogène et sels minéraux sont indiqués.",
          tags: ["sang", "plasma"],
        },
      ),
      Q(
        "single",
        "Quel élément sanguin transporte principalement l’oxygène et le dioxyde de carbone selon le support ?",
        [
          O(
            "Les globules rouges",
            "Les érythrocytes assurent le transport cité de l’O2 et du CO2.",
            { correct: true },
          ),
          O("Les globules blancs", "Les leucocytes participent à la défense.", {
            distractorType: "frequent-error",
          }),
          O(
            "Les plaquettes",
            "Les plaquettes participent à limiter les phénomènes hémorragiques.",
            { distractorType: "other-context" },
          ),
          O(
            "Les valves",
            "Les valves appartiennent aux structures circulatoires, pas aux cellules sanguines.",
            { distractorType: "other-context" },
          ),
        ],
        ["K-DEA-P05-009"],
        F(
          "Les globules rouges, ou érythrocytes, transportent les gaz respiratoires cités.",
          "Confondre les familles de cellules sanguines fait attribuer une fonction de défense aux globules rouges.",
          "Rouges : gaz ; blancs : défense ; plaquettes : brèches.",
          "Associer chaque constituant à sa fonction générale sans interpréter une analyse.",
          { memoryTip: "Rouges-respiration, blancs-défense, plaquettes-colmatage." },
        ),
        { tags: ["sang", "globules-rouges"] },
      ),
      Q(
        "single",
        "Quel rôle général le support attribue-t-il aux globules blancs ?",
        [
          O(
            "Participer à la défense de l’organisme",
            "Les leucocytes sont présentés comme acteurs de la défense.",
            { correct: true },
          ),
          O("Transporter principalement l’oxygène", "Ce rôle est attribué aux globules rouges.", {
            distractorType: "frequent-error",
          }),
          O("Former les valves cardiaques", "Les valves ne sont pas formées par les leucocytes.", {
            distractorType: "other-context",
          }),
          O("Mesurer la pression artérielle", "Cette mesure utilise un tensiomètre.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-009"],
        F(
          "Les globules blancs participent à la défense de l’organisme.",
          "La couleur du nom ne renseigne pas sur le transport d’oxygène.",
          "Leucocytes = défense.",
          "Utiliser ce rôle général sans conclure à une infection.",
        ),
        { tags: ["sang", "globules-blancs"] },
      ),
      Q(
        "true_false",
        "Les plaquettes s’agglutinent pour aider à colmater des brèches et limiter les phénomènes hémorragiques.",
        [],
        ["K-DEA-P05-009"],
        F(
          "La proposition reprend le rôle des plaquettes décrit page 19.",
          "Les plaquettes sont parfois confondues avec les globules rouges en raison de leur présence dans le sang.",
          "Plaquettes : colmatage des brèches et limitation des phénomènes hémorragiques.",
          "Distinguer cette fonction générale d’une conduite de prise en charge.",
        ),
        {
          correct: true,
          trueExplanation: "Le support décrit explicitement cette fonction.",
          falseExplanation: "Faux serait incorrect : ce rôle est attribué aux plaquettes.",
          tags: ["sang", "plaquettes"],
          difficulty: "medium",
        },
      ),
      Q(
        "matching",
        "Associe chaque constituant à sa fonction principale.",
        [
          O("Plasma", "Il constitue la phase liquide.", { match: "Phase liquide du sang" }),
          O("Globules rouges", "Ils transportent O2 et CO2.", {
            match: "Transport des gaz respiratoires",
          }),
          O("Globules blancs", "Ils participent à la défense.", {
            match: "Défense de l’organisme",
          }),
          O("Plaquettes", "Elles aident à colmater les brèches.", {
            match: "Limitation des phénomènes hémorragiques",
          }),
        ],
        ["K-DEA-P05-008", "K-DEA-P05-009"],
        F(
          "Chaque constituant est associé à la fonction générale indiquée dans le support.",
          "Attribuer une même fonction à tous les éléments empêche de comprendre leur complémentarité.",
          "Liquide, gaz, défense, colmatage : quatre rôles distincts.",
          "Structurer une explication simple de la composition du sang.",
        ),
        {
          instruction: "Associe chaque élément.",
          tags: ["sang", "association"],
          difficulty: "medium",
        },
      ),
      Q(
        "clinical_case",
        "Dans une situation pédagogique, une brèche vasculaire est évoquée. Quel constituant du sang est directement associé dans le support au colmatage de cette brèche ?",
        [
          O("Les plaquettes", "Le support associe les plaquettes au colmatage des brèches.", {
            correct: true,
          }),
          O("Les globules rouges", "Ils sont associés au transport des gaz.", {
            distractorType: "frequent-error",
          }),
          O("Les globules blancs", "Ils sont associés à la défense de l’organisme.", {
            distractorType: "other-context",
          }),
          O("Le péricarde", "Le péricarde enveloppe le cœur et n’est pas un constituant sanguin.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-009"],
        F(
          "Les plaquettes sont le constituant relié au colmatage des brèches.",
          "La présence de sang ne permet pas d’attribuer la même fonction à toutes ses cellules.",
          "Plaquettes et limitation des phénomènes hémorragiques sont liées dans le support.",
          "Reconnaître une fonction biologique sans en déduire un diagnostic ni un traitement.",
          {
            safetyPoint:
              "Cette notion ne remplace pas les protocoles de prise en charge d’une hémorragie.",
          },
        ),
        { tags: ["sang", "plaquettes", "cas"], difficulty: "hard" },
      ),
    ],
  },
  {
    id: "dea-p05-l04",
    title: "Petite circulation",
    pages: "21",
    section: "Appareil circulatoire - Petite circulation",
    objectives: [
      "Définir la circulation pulmonaire.",
      "Reconstituer son trajet du ventricule droit à l’oreillette gauche.",
      "Distinguer ses vaisseaux de ceux de la grande circulation.",
    ],
    competencyIds: ["body.system.cardiovascular"],
    prerequisiteIds: ["dea-p05-l03"],
    questions: [
      Q(
        "single",
        "Quel autre nom le support donne-t-il à la petite circulation ?",
        [
          O(
            "Circulation pulmonaire",
            "Petite circulation et circulation pulmonaire désignent le même circuit.",
            { correct: true },
          ),
          O("Circulation tissulaire", "Ce terme désigne la grande circulation.", {
            distractorType: "frequent-error",
          }),
          O("Circulation lymphatique", "Ce circuit n’est pas celui décrit page 21.", {
            distractorType: "other-context",
          }),
          O("Circulation digestive", "Le support ne donne pas ce nom à la petite circulation.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-010"],
        F(
          "La petite circulation est la circulation pulmonaire.",
          "Les qualificatifs pulmonaire et tissulaire sont souvent inversés.",
          "Petite = pulmonaire.",
          "Identifier d’abord le circuit avant de suivre ses structures.",
        ),
        { tags: ["petite-circulation", "definition"] },
      ),
      Q(
        "single",
        "Dans quelle cavité débute la petite circulation ?",
        [
          O("Le ventricule droit", "Le support fait débuter le trajet au ventricule droit.", {
            correct: true,
          }),
          O("Le ventricule gauche", "Il débute la grande circulation.", {
            distractorType: "frequent-error",
          }),
          O("L’oreillette droite", "Elle termine la grande circulation.", {
            distractorType: "other-context",
          }),
          O("L’oreillette gauche", "Elle reçoit le retour de la petite circulation.", {
            distractorType: "secondary-priority",
          }),
        ],
        ["K-DEA-P05-010"],
        F(
          "La petite circulation part du ventricule droit.",
          "Confondre cavité de départ et cavité d’arrivée inverse le trajet.",
          "Ventricule droit : départ vers les poumons.",
          "Commencer un tracé par la cavité qui propulse le sang.",
        ),
        { tags: ["petite-circulation", "ventricule-droit"] },
      ),
      Q(
        "ordering",
        "Remets dans l’ordre le trajet de la petite circulation.",
        [
          O("Ventricule droit", "Il propulse le sang vers les poumons."),
          O("Artère pulmonaire", "Elle conduit le sang aux poumons."),
          O("Capillaires pulmonaires", "Ils constituent le réseau pulmonaire."),
          O("Veines pulmonaires", "Elles reviennent vers le cœur."),
          O("Oreillette gauche", "Elle reçoit le retour pulmonaire."),
        ],
        ["K-DEA-P05-010"],
        F(
          "L’ordre exact suit le trajet donné page 21 du ventricule droit à l’oreillette gauche.",
          "Inverser artère et veines pulmonaires change le sens du circuit.",
          "VD, artère pulmonaire, capillaires pulmonaires, veines pulmonaires, OG.",
          "Tracer le circuit en suivant les flèches et les points de départ et d’arrivée.",
          { memoryTip: "VD → poumons → OG." },
        ),
        { tags: ["petite-circulation", "ordre"], difficulty: "medium" },
      ),
      Q(
        "true_false",
        "L’artère pulmonaire appartient à la petite circulation.",
        [],
        ["K-DEA-P05-010"],
        F(
          "La proposition est vraie : elle relie le ventricule droit au réseau pulmonaire.",
          "Le mot artère peut être associé à tort à la seule grande circulation.",
          "L’artère pulmonaire part du cœur vers les poumons.",
          "Classer un vaisseau selon son trajet et son circuit.",
        ),
        {
          correct: true,
          trueExplanation: "Elle figure dans le trajet pulmonaire décrit.",
          falseExplanation:
            "Faux serait incorrect : l’artère pulmonaire est un élément de la petite circulation.",
          tags: ["petite-circulation", "artere-pulmonaire"],
        },
      ),
      Q(
        "single",
        "Quelle structure suit l’artère pulmonaire dans le trajet décrit ?",
        [
          O("Les capillaires pulmonaires", "Ils suivent l’artère pulmonaire dans le circuit.", {
            correct: true,
          }),
          O("Les veines caves", "Elles appartiennent à la grande circulation.", {
            distractorType: "other-context",
          }),
          O("L’aorte", "Elle part du ventricule gauche dans la grande circulation.", {
            distractorType: "other-context",
          }),
          O("Les capillaires cellulaires", "Ils appartiennent au circuit tissulaire.", {
            distractorType: "frequent-error",
          }),
        ],
        ["K-DEA-P05-010"],
        F(
          "Après l’artère pulmonaire viennent les capillaires pulmonaires.",
          "Mélanger capillaires pulmonaires et cellulaires fusionne les deux circulations.",
          "Le réseau capillaire prend le nom du territoire traversé.",
          "Préciser « pulmonaire » dans une description du petit circuit.",
        ),
        { tags: ["petite-circulation", "capillaires"] },
      ),
      Q(
        "fill_blank",
        "Complète : les veines pulmonaires ramènent le sang vers l’oreillette ______.",
        [O("gauche", "Le trajet pulmonaire se termine à l’oreillette gauche.", { correct: true })],
        ["K-DEA-P05-010"],
        F(
          "Le mot attendu est « gauche ».",
          "Le côté droit est le point de départ de ce circuit, pas son point d’arrivée.",
          "Petite circulation : ventricule droit vers oreillette gauche.",
          "Vérifier la cavité terminale avant de conclure un tracé.",
        ),
        { tags: ["petite-circulation", "oreillette-gauche"] },
      ),
      Q(
        "true_false",
        "L’aorte et les veines caves constituent le trajet principal de la petite circulation.",
        [],
        ["K-DEA-P05-010", "K-DEA-P05-011"],
        F(
          "L’affirmation est fausse : aorte et veines caves appartiennent à la grande circulation.",
          "Les deux circuits partagent le cœur, ce qui peut faire mélanger leurs vaisseaux.",
          "Petite : artère et veines pulmonaires ; grande : aorte et veines caves.",
          "Nommer le circuit avant de classer ses vaisseaux.",
        ),
        {
          correct: false,
          trueExplanation: "Vrai serait incorrect : ces vaisseaux appartiennent au grand circuit.",
          falseExplanation: "La petite circulation utilise l’artère et les veines pulmonaires.",
          tags: ["petite-circulation", "comparaison"],
          difficulty: "medium",
        },
      ),
      Q(
        "clinical_case",
        "Un schéma suit le sang du ventricule droit aux poumons, puis jusqu’à l’oreillette gauche. Quel circuit est représenté ?",
        [
          O(
            "La petite circulation",
            "Ce trajet correspond exactement à la circulation pulmonaire.",
            { correct: true },
          ),
          O(
            "La grande circulation",
            "Elle relie le ventricule gauche aux tissus puis à l’oreillette droite.",
            { distractorType: "frequent-error" },
          ),
          O(
            "Le retour veineux systémique seul",
            "Le trajet inclut aussi l’aller vers les poumons.",
            { distractorType: "secondary-priority" },
          ),
          O(
            "Le cycle cardiaque",
            "Le cycle décrit des phases de contraction et de relaxation, pas ce trajet vasculaire.",
            { distractorType: "other-context" },
          ),
        ],
        ["K-DEA-P05-010"],
        F(
          "Le départ au ventricule droit, le passage pulmonaire et l’arrivée à l’oreillette gauche identifient la petite circulation.",
          "S’arrêter au mot « cœur » ne suffit pas : les cavités et le territoire traversé déterminent le circuit.",
          "VD → poumons → OG = petite circulation.",
          "Reconnaître le circuit à partir de trois repères fiables.",
        ),
        { tags: ["petite-circulation", "cas"], difficulty: "hard" },
      ),
    ],
  },
  {
    id: "dea-p05-l05",
    title: "Grande circulation",
    pages: "21",
    section: "Appareil circulatoire - Grande circulation",
    objectives: [
      "Définir la circulation tissulaire.",
      "Reconstituer son trajet du ventricule gauche à l’oreillette droite.",
      "Distinguer ses vaisseaux de ceux de la petite circulation.",
    ],
    competencyIds: ["body.system.cardiovascular"],
    prerequisiteIds: ["dea-p05-l04"],
    questions: [
      Q(
        "single",
        "Quel autre nom le support donne-t-il à la grande circulation ?",
        [
          O("Circulation tissulaire", "Le support emploie circulation tissulaire ou cellulaire.", {
            correct: true,
          }),
          O("Circulation pulmonaire", "Ce terme désigne la petite circulation.", {
            distractorType: "frequent-error",
          }),
          O("Circulation péricardique", "Le support ne définit pas ce circuit.", {
            distractorType: "other-context",
          }),
          O("Circulation auriculaire", "Ce nom ne correspond pas au grand circuit décrit.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-011"],
        F(
          "La grande circulation est aussi appelée circulation tissulaire ou cellulaire.",
          "Confondre tissulaire et pulmonaire inverse les deux circuits.",
          "Grande = tissulaire ou cellulaire.",
          "Relier le nom du circuit au territoire desservi.",
        ),
        { tags: ["grande-circulation", "definition"] },
      ),
      Q(
        "single",
        "Dans quelle cavité débute la grande circulation ?",
        [
          O("Le ventricule gauche", "Il propulse le sang dans l’aorte.", { correct: true }),
          O("Le ventricule droit", "Il débute la petite circulation.", {
            distractorType: "frequent-error",
          }),
          O("L’oreillette droite", "Elle reçoit le retour de la grande circulation.", {
            distractorType: "secondary-priority",
          }),
          O("L’oreillette gauche", "Elle reçoit le retour pulmonaire avant le ventricule gauche.", {
            distractorType: "secondary-priority",
          }),
        ],
        ["K-DEA-P05-011"],
        F(
          "La grande circulation part du ventricule gauche.",
          "Confondre départ et arrivée fait choisir l’oreillette droite.",
          "Ventricule gauche : départ vers les tissus.",
          "Repérer la cavité qui propulse dans l’aorte.",
        ),
        { tags: ["grande-circulation", "ventricule-gauche"] },
      ),
      Q(
        "ordering",
        "Remets dans l’ordre le trajet de la grande circulation.",
        [
          O("Ventricule gauche", "Il propulse le sang dans l’aorte."),
          O("Aorte", "Elle conduit le sang vers les organes."),
          O("Capillaires cellulaires", "Ils constituent le réseau d’échange tissulaire."),
          O("Veines caves", "Elles ramènent le sang vers le cœur."),
          O("Oreillette droite", "Elle reçoit le retour systémique."),
        ],
        ["K-DEA-P05-011"],
        F(
          "Le support donne cet ordre du ventricule gauche à l’oreillette droite.",
          "Insérer des vaisseaux pulmonaires mélange grande et petite circulation.",
          "VG, aorte, capillaires cellulaires, veines caves, OD.",
          "Reconstituer le trajet complet avant d’identifier un élément isolé.",
          { memoryTip: "VG → tissus → OD." },
        ),
        { tags: ["grande-circulation", "ordre"], difficulty: "medium" },
      ),
      Q(
        "true_false",
        "L’aorte appartient à la grande circulation.",
        [],
        ["K-DEA-P05-011"],
        F(
          "La proposition est vraie : l’aorte suit le ventricule gauche dans ce circuit.",
          "La proximité du cœur peut faire oublier que l’aorte distribue vers les tissus.",
          "L’aorte est le grand vaisseau de départ du circuit tissulaire.",
          "Classer le vaisseau dans le bon circuit avant de décrire son trajet.",
        ),
        {
          correct: true,
          trueExplanation: "L’aorte figure dans le trajet de la grande circulation.",
          falseExplanation: "Faux serait incorrect : le support inclut explicitement l’aorte.",
          tags: ["grande-circulation", "aorte"],
        },
      ),
      Q(
        "single",
        "Quel réseau suit l’aorte dans la description de la grande circulation ?",
        [
          O("Les capillaires cellulaires", "Le grand circuit rejoint les capillaires des tissus.", {
            correct: true,
          }),
          O("Les capillaires pulmonaires", "Ils appartiennent à la petite circulation.", {
            distractorType: "frequent-error",
          }),
          O("Les veines pulmonaires", "Elles ramènent le sang des poumons.", {
            distractorType: "other-context",
          }),
          O("Le péricarde", "Le péricarde est l’enveloppe du cœur.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-006", "K-DEA-P05-011"],
        F(
          "Les capillaires cellulaires constituent le réseau d’échange du grand circuit.",
          "Le mot capillaire doit toujours être complété par le territoire concerné.",
          "Capillaires cellulaires pour les tissus ; pulmonaires pour les poumons.",
          "Préciser le territoire du réseau capillaire dans une explication.",
        ),
        { tags: ["grande-circulation", "capillaires"] },
      ),
      Q(
        "fill_blank",
        "Complète : les veines caves ramènent le sang vers l’oreillette ______.",
        [O("droite", "Le trajet tissulaire se termine à l’oreillette droite.", { correct: true })],
        ["K-DEA-P05-011"],
        F(
          "Le mot attendu est « droite ».",
          "L’oreillette gauche reçoit le retour pulmonaire, pas le retour tissulaire.",
          "Grande circulation : ventricule gauche vers oreillette droite.",
          "Vérifier la cavité de retour des veines caves.",
        ),
        { tags: ["grande-circulation", "oreillette-droite"] },
      ),
      Q(
        "true_false",
        "Les veines pulmonaires constituent le retour principal de la grande circulation.",
        [],
        ["K-DEA-P05-010", "K-DEA-P05-011"],
        F(
          "L’affirmation est fausse : le retour du grand circuit utilise les veines caves.",
          "Le mot « veine » seul ne suffit pas à identifier le circuit.",
          "Veines caves : grande circulation ; veines pulmonaires : petite circulation.",
          "Toujours préciser le nom complet du vaisseau.",
        ),
        {
          correct: false,
          trueExplanation:
            "Vrai serait incorrect : les veines pulmonaires appartiennent au petit circuit.",
          falseExplanation: "Les veines caves assurent le retour tissulaire décrit.",
          tags: ["grande-circulation", "comparaison"],
          difficulty: "medium",
        },
      ),
      Q(
        "clinical_case",
        "Un schéma suit le sang du ventricule gauche vers les tissus, puis jusqu’à l’oreillette droite. Quel circuit est représenté ?",
        [
          O("La grande circulation", "Ce trajet correspond au circuit tissulaire.", {
            correct: true,
          }),
          O(
            "La petite circulation",
            "Elle relie le ventricule droit aux poumons puis à l’oreillette gauche.",
            { distractorType: "frequent-error" },
          ),
          O("Le cycle cardiaque", "Le cycle décrit des phases, pas le trajet dans les tissus.", {
            distractorType: "other-context",
          }),
          O("Le retour pulmonaire seul", "Le trajet décrit ne passe pas par les poumons.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-011"],
        F(
          "Le départ au ventricule gauche, le passage tissulaire et l’arrivée à l’oreillette droite identifient la grande circulation.",
          "Se fier seulement au côté gauche du départ sans suivre le territoire peut créer une confusion.",
          "VG → tissus → OD = grande circulation.",
          "Utiliser trois repères : départ, territoire, arrivée.",
        ),
        { tags: ["grande-circulation", "cas"], difficulty: "hard" },
      ),
    ],
  },
  {
    id: "dea-p05-l06",
    title: "La pression artérielle",
    pages: "53, 66-67",
    section: "Matériels et mesures - Pression artérielle",
    objectives: [
      "Identifier les éléments d’un tensiomètre.",
      "Décrire les conditions essentielles d’une mesure manuelle.",
      "Distinguer valeurs systolique et diastolique et repérer des sources d’erreur.",
    ],
    competencyIds: ["body.system.cardiovascular"],
    prerequisiteIds: ["dea-p05-l05"],
    questions: [
      Q(
        "matching",
        "Associe chaque élément du tensiomètre manuel à son rôle.",
        [
          O("Manchon gonflable", "Il se place autour du bras.", {
            match: "Exerce la contre-pression sur le bras",
          }),
          O("Poire", "Elle permet de gonfler le manchon.", { match: "Gonfle le manchon" }),
          O("Valve", "Son ouverture permet le dégonflage progressif.", {
            match: "Contrôle le dégonflage",
          }),
          O("Manomètre", "Il mesure la contre-pression.", {
            match: "Affiche la mesure de pression",
          }),
        ],
        ["K-DEA-P05-012"],
        F(
          "Chaque élément est associé à la fonction décrite page 53.",
          "Confondre poire et manomètre mélange production de pression et lecture de la mesure.",
          "Manchon, poire, valve et manomètre ont des fonctions complémentaires.",
          "Vérifier le matériel avant la mesure.",
        ),
        {
          instruction: "Associe chaque élément.",
          tags: ["pression-arterielle", "materiel"],
          pages: "53",
          difficulty: "medium",
        },
      ),
      Q(
        "true_false",
        "Un tensiomètre automatique peut afficher la pression artérielle et la fréquence cardiaque.",
        [],
        ["K-DEA-P05-012"],
        F(
          "La proposition est vraie selon la description du tensiomètre automatique.",
          "Automatique ne signifie pas que seules les valeurs de pression sont disponibles.",
          "L’appareil peut afficher pression artérielle et fréquence cardiaque.",
          "Lire toutes les valeurs utiles tout en contrôlant leur cohérence clinique.",
        ),
        {
          correct: true,
          trueExplanation: "Les deux affichages sont cités page 53.",
          falseExplanation:
            "Faux serait incorrect : la fréquence cardiaque est également indiquée.",
          tags: ["pression-arterielle", "automatique"],
          pages: "53",
        },
      ),
      Q(
        "single",
        "Quelle condition préalable est demandée par le support pour une mesure manuelle de la pression artérielle ?",
        [
          O(
            "Un patient au repos depuis dix minutes, en décubitus dorsal",
            "C’est la condition indiquée page 66.",
            { correct: true },
          ),
          O("Un patient venant de marcher rapidement", "L’effort peut modifier la mesure.", {
            distractorType: "wrong-timing",
          }),
          O(
            "Un brassard posé sur des vêtements épais",
            "Le support demande un positionnement précis sur le bras.",
            { distractorType: "frequent-error" },
          ),
          O(
            "Une contraction volontaire du bras",
            "Une contraction musculaire peut fausser la mesure.",
            { distractorType: "frequent-error" },
          ),
        ],
        ["K-DEA-P05-013"],
        F(
          "Le support demande repos de dix minutes et décubitus dorsal avant cette mesure.",
          "Mesurer immédiatement après un effort compromet la comparabilité de la valeur.",
          "Repos et position font partie de la qualité de mesure.",
          "Documenter les conditions si elles ne peuvent pas être respectées.",
          { safetyPoint: "Une valeur isolée doit être interprétée avec l’ensemble du bilan." },
        ),
        { tags: ["pression-arterielle", "conditions"] },
      ),
      Q(
        "single",
        "Pourquoi le brassard doit-il être adapté à la morphologie du patient ?",
        [
          O(
            "Parce qu’une taille inadaptée peut fausser la mesure",
            "Le support précise le sens des erreurs selon la taille.",
            { correct: true },
          ),
          O(
            "Pour changer la fréquence cardiaque",
            "Le brassard ne sert pas à modifier la fréquence.",
            { distractorType: "sign-misinterpretation" },
          ),
          O(
            "Pour remplacer le stéthoscope",
            "Le brassard et le stéthoscope ont des fonctions distinctes en manuel.",
            { distractorType: "frequent-error" },
          ),
          O(
            "Pour déterminer le groupe sanguin",
            "Cette mesure ne détermine pas le groupe sanguin.",
            { distractorType: "other-context" },
          ),
        ],
        ["K-DEA-P05-012", "K-DEA-P05-013"],
        F(
          "La taille du brassard influence directement la valeur mesurée.",
          "Choisir le brassard le plus proche sans vérifier sa taille est une erreur de préparation.",
          "Brassard adapté = mesure plus fiable.",
          "Préparer le bon manchon adulte ou enfant avant de commencer.",
        ),
        { tags: ["pression-arterielle", "brassard"] },
      ),
      Q(
        "single",
        "Où le support situe-t-il le brassard pour la mesure manuelle ?",
        [
          O(
            "Sur le bras, environ deux centimètres au-dessus du pli du coude",
            "Ce positionnement est indiqué page 66.",
            { correct: true },
          ),
          O(
            "Autour du poignet, sous la base du pouce",
            "Cette zone correspond au repérage du pouls radial.",
            { distractorType: "other-context" },
          ),
          O(
            "Sur la cheville sans autre repère",
            "Ce n’est pas la technique décrite dans cette leçon.",
            { distractorType: "other-context" },
          ),
          O(
            "Directement sur le pli du coude",
            "Le support indique environ deux centimètres au-dessus.",
            { distractorType: "frequent-error" },
          ),
        ],
        ["K-DEA-P05-013"],
        F(
          "Le brassard se place sur le bras, environ deux centimètres au-dessus du pli du coude.",
          "Confondre la zone du stéthoscope avec celle du brassard déplace le matériel.",
          "Brassard au-dessus du pli ; stéthoscope sur le trajet huméral au pli.",
          "Respecter les repères avant le gonflage.",
        ),
        { tags: ["pression-arterielle", "positionnement"], pages: "66" },
      ),
      Q(
        "matching",
        "Associe le moment auscultatoire à la valeur correspondante.",
        [
          O("Premier battement net", "Il caractérise la valeur systolique.", {
            match: "Valeur systolique",
          }),
          O(
            "Dernier battement avant disparition des bruits",
            "Il correspond à la valeur diastolique.",
            { match: "Valeur diastolique" },
          ),
        ],
        ["K-DEA-P05-013"],
        F(
          "Premier battement net et dernier battement correspondent respectivement aux valeurs systolique et diastolique.",
          "Inverser les deux moments produit une transmission erronée.",
          "Premier = systolique ; dernier = diastolique.",
          "Noter et transmettre les deux valeurs dans le bon ordre.",
          { memoryTip: "S avant D dans l’écoute comme dans la transmission." },
        ),
        {
          instruction: "Associe chaque moment.",
          tags: ["pression-arterielle", "systolique", "diastolique"],
          pages: "66",
          difficulty: "medium",
        },
      ),
      Q(
        "multiple_choice",
        "Quels effets d’un brassard inadapté sont décrits ?",
        [
          O(
            "Un brassard trop petit peut surestimer la valeur",
            "Le support précise cette surestimation.",
            { correct: true },
          ),
          O(
            "Un brassard trop grand peut sous-estimer la valeur",
            "Le support précise cette sous-estimation.",
            { correct: true },
          ),
          O(
            "Un brassard trop petit supprime toujours le pouls",
            "Cette conséquence absolue n’est pas donnée.",
            { distractorType: "sign-misinterpretation" },
          ),
          O(
            "La taille n’a aucun effet sur la mesure",
            "Cette proposition contredit la vigilance indiquée.",
            { distractorType: "frequent-error" },
          ),
        ],
        ["K-DEA-P05-013"],
        F(
          "Petit surestime et grand sous-estime selon le support.",
          "Retenir seulement que la taille compte sans connaître le sens de l’erreur limite le contrôle qualité.",
          "Trop petit : valeur trop haute ; trop grand : valeur trop basse.",
          "Recommencer avec un brassard adapté si la taille est incorrecte.",
        ),
        {
          instruction: "Sélectionne les deux réponses correctes.",
          tags: ["pression-arterielle", "erreurs"],
          pages: "67",
          difficulty: "hard",
        },
      ),
      Q(
        "clinical_case",
        "Le patient vient de contracter fortement le bras pendant la mesure. Quelle décision améliore le plus la fiabilité du résultat ?",
        [
          O(
            "Reprendre la mesure dans de bonnes conditions après relâchement",
            "Une contraction musculaire peut fausser la mesure.",
            { correct: true },
          ),
          O(
            "Conserver la valeur sans signaler les conditions",
            "Cela ignore une source d’erreur connue.",
            { distractorType: "frequent-error" },
          ),
          O(
            "Gonfler immédiatement beaucoup plus fort",
            "Augmenter la pression ne corrige pas la contraction musculaire.",
            { distractorType: "unsafe-context" },
          ),
          O(
            "Remplacer la mesure par la température",
            "Les paramètres ne sont pas interchangeables.",
            { distractorType: "other-context" },
          ),
        ],
        ["K-DEA-P05-013"],
        F(
          "La contraction peut fausser la mesure ; il faut la reprendre dans des conditions adaptées.",
          "Une valeur chiffrée n’est pas fiable uniquement parce qu’elle s’affiche.",
          "Contrôler les conditions avant de valider le chiffre.",
          "Tracer ou transmettre toute difficulté de mesure pertinente.",
          { safetyPoint: "Ne jamais interpréter une mesure isolée sans l’état clinique global." },
        ),
        { tags: ["pression-arterielle", "cas", "qualite"], pages: "67", difficulty: "hard" },
      ),
    ],
  },
  {
    id: "dea-p05-l07",
    title: "Le pouls",
    pages: "67-68",
    section: "Mesures des paramètres vitaux - Fréquence cardiaque et pouls",
    objectives: [
      "Définir la fréquence cardiaque observée au niveau des artères.",
      "Décrire fréquence, amplitude et rythme du pouls.",
      "Réaliser conceptuellement le repérage radial décrit par le support.",
    ],
    competencyIds: ["body.system.cardiovascular"],
    prerequisiteIds: ["dea-p05-l06"],
    questions: [
      Q(
        "single",
        "Que traduit la fréquence cardiaque au niveau des artères selon le support ?",
        [
          O(
            "Les battements du cœur",
            "La fréquence cardiaque traduit les battements cardiaques au niveau artériel.",
            { correct: true },
          ),
          O("La température corporelle", "La température est un autre paramètre.", {
            distractorType: "other-context",
          }),
          O("Le groupe sanguin", "Le groupe sanguin n’est pas mesuré par le pouls.", {
            distractorType: "other-context",
          }),
          O("Le volume pulmonaire", "Ce volume ne définit pas le pouls.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-014"],
        F(
          "La fréquence cardiaque correspond à la traduction des battements du cœur au niveau des artères.",
          "Confondre les paramètres vitaux empêche une transmission structurée.",
          "Le pouls rend perceptibles les battements cardiaques dans une artère.",
          "Nommer le paramètre observé avant de donner sa valeur.",
        ),
        { tags: ["pouls", "definition"] },
      ),
      Q(
        "multiple_choice",
        "Quels caractères du pouls doivent être observés ?",
        [
          O("Sa fréquence", "Le nombre de pulsations fait partie de l’évaluation.", {
            correct: true,
          }),
          O(
            "Son amplitude",
            "La perception forte, faible, filante ou imperceptible est observée.",
            { correct: true },
          ),
          O("Son rythme", "La régularité ou l’irrégularité est observée.", { correct: true }),
          O("La couleur des yeux", "Elle n’est pas un caractère du pouls.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-014"],
        F(
          "L’évaluation associe fréquence, amplitude et rythme.",
          "Transmettre seulement un nombre omet deux informations cliniques décrites.",
          "FAR : fréquence, amplitude, rythme.",
          "Transmettre les trois caractères observés.",
          { memoryTip: "FAR : Fréquence, Amplitude, Rythme." },
        ),
        { instruction: "Sélectionne les trois réponses correctes.", tags: ["pouls", "caracteres"] },
      ),
      Q(
        "single",
        "Où recherche-t-on le pouls radial dans la technique décrite ?",
        [
          O(
            "À la base du pouce au niveau du poignet",
            "Le support situe le pouls radial à la base du pouce.",
            { correct: true },
          ),
          O("Sous l’oreille", "Cette zone correspond au pouls carotidien décrit.", {
            distractorType: "other-context",
          }),
          O("Dans l’aine", "Cette zone correspond au pouls fémoral cité.", {
            distractorType: "other-context",
          }),
          O("Sur la face dorsale du pied", "Cette zone correspond au pouls pédieux.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-014"],
        F(
          "Le pouls radial se recherche à la base du pouce, au poignet.",
          "Les différents sites artériels peuvent être confondus si leur nom n’est pas associé à une région.",
          "Radial : poignet, côté du pouce.",
          "Préciser le site de prise dans une transmission.",
        ),
        { tags: ["pouls", "radial"] },
      ),
      Q(
        "single",
        "Quels doigts sont recommandés pour palper le pouls radial ?",
        [
          O("L’index et le majeur", "Le support recommande l’extrémité de ces doigts.", {
            correct: true,
          }),
          O("Le pouce seul", "Le pouce possède son propre pouls perceptible.", {
            distractorType: "frequent-error",
          }),
          O("L’auriculaire seul", "Ce n’est pas la technique décrite.", {
            distractorType: "other-context",
          }),
          O("Toute la paume", "Cette technique manque de précision.", {
            distractorType: "frequent-error",
          }),
        ],
        ["K-DEA-P05-014"],
        F(
          "L’index et le majeur permettent la palpation sans confondre avec son propre pouls du pouce.",
          "Utiliser le pouce peut faire compter les battements de l’opérateur.",
          "Index et majeur, jamais le pouce.",
          "Positionner légèrement les doigts sur l’artère sans trop appuyer.",
          {
            safetyPoint: "Une pression excessive peut rendre le pouls plus difficile à percevoir.",
          },
        ),
        { tags: ["pouls", "technique"] },
      ),
      Q(
        "true_false",
        "Pour la prise radiale décrite, le patient est si possible au repos et le bras repose sur un support.",
        [],
        ["K-DEA-P05-014"],
        F(
          "La proposition reprend les conditions indiquées page 68.",
          "Prendre le pouls pendant un mouvement du bras peut compliquer la perception.",
          "Repos du patient et bras soutenu favorisent une mesure comparable.",
          "Préparer la position avant de commencer le comptage.",
        ),
        {
          correct: true,
          trueExplanation: "Ces deux conditions figurent dans la technique radiale.",
          falseExplanation: "Faux serait incorrect : le support recommande repos et bras soutenu.",
          tags: ["pouls", "conditions"],
        },
      ),
      Q(
        "fill_blank",
        "Complète : dans la technique décrite, le nombre de pulsations est compté sur une ______.",
        [O("minute", "Le support demande un comptage sur une minute.", { correct: true })],
        ["K-DEA-P05-014"],
        F(
          "Le mot attendu est « minute ».",
          "Raccourcir le comptage sans règle explicitée sort du protocole présenté dans ce support.",
          "La technique enseignée ici compte les pulsations sur une minute.",
          "Appliquer la méthode définie par le support et transmettre l’unité.",
        ),
        { tags: ["pouls", "frequence"] },
      ),
      Q(
        "matching",
        "Associe chaque site de pouls à son repère anatomique.",
        [
          O("Radial", "Il est recherché à la base du pouce.", { match: "Poignet, base du pouce" }),
          O("Carotidien", "Il est recherché sous l’oreille au niveau du cou.", { match: "Cou" }),
          O("Fémoral", "Le support cite le repérage au niveau de l’aine.", { match: "Aine" }),
          O("Pédieux", "Il est recherché sur la face dorsale du pied.", { match: "Dos du pied" }),
        ],
        ["K-DEA-P05-014"],
        F(
          "Chaque site est associé au repère anatomique indiqué pages 67 et 68.",
          "Confondre le nom de l’artère et la région corporelle peut entraîner une mauvaise localisation.",
          "Radial-poignet, carotidien-cou, fémoral-aine, pédieux-pied.",
          "Toujours nommer le site utilisé pour contextualiser la mesure.",
        ),
        { instruction: "Associe chaque site.", tags: ["pouls", "sites"], difficulty: "medium" },
      ),
      Q(
        "clinical_case",
        "Un pouls radial est mesuré. Quelle transmission est la plus complète selon les critères du support ?",
        [
          O(
            "Site radial, fréquence, rythme et amplitude",
            "Ces quatre éléments contextualisent et décrivent le pouls.",
            { correct: true },
          ),
          O(
            "Seulement « pouls présent »",
            "Cette formulation omet fréquence, rythme et amplitude.",
            { distractorType: "frequent-error" },
          ),
          O(
            "Seulement la fréquence sans site",
            "La fréquence seule ne décrit pas complètement le pouls.",
            { distractorType: "secondary-priority" },
          ),
          O(
            "La pression artérielle à la place du pouls",
            "Les deux paramètres ne sont pas interchangeables.",
            { distractorType: "other-context" },
          ),
        ],
        ["K-DEA-P05-014"],
        F(
          "La transmission la plus complète précise le site et les trois caractères du pouls.",
          "Un nombre isolé peut être exact mais insuffisant pour décrire la mesure.",
          "Site + fréquence + rythme + amplitude.",
          "Structurer le bilan oral avec des données observables et leur contexte.",
          {
            safetyPoint:
              "Toute anomalie doit être confrontée aux autres signes et paramètres du patient.",
          },
        ),
        { tags: ["pouls", "transmission", "cas"], difficulty: "hard" },
      ),
    ],
  },
  {
    id: "dea-p05-l08",
    title: "Synthèse",
    pages: "18-21, 53, 66-68",
    section: "Appareil circulatoire - Synthèse cardiovasculaire",
    objectives: [
      "Relier cœur, vaisseaux et sang dans un circuit fermé.",
      "Distinguer petite et grande circulation.",
      "Structurer une observation simple de la pression artérielle et du pouls.",
    ],
    competencyIds: [
      "body.system.cardiovascular",
      "body.organ.function",
      "body.organization.organ-to-system",
    ],
    prerequisiteIds: ["dea-p05-l07"],
    difficulty: "medium",
    questions: [
      Q(
        "multiple_choice",
        "Quels éléments composent le circuit fermé de l’appareil circulatoire selon le support ?",
        [
          O("Le cœur", "Le cœur est la pompe du circuit.", { correct: true }),
          O("Les vaisseaux sanguins", "Les vaisseaux sont les canalisations.", { correct: true }),
          O("Le sang", "Le sang circule dans ce circuit.", { correct: true }),
          O("Le squelette seul", "Le squelette appartient à un autre appareil étudié.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-001"],
        F(
          "Le circuit associe pompe cardiaque, vaisseaux et sang.",
          "Réduire le système à un seul organe empêche d’en comprendre l’organisation.",
          "Cœur + vaisseaux + sang = appareil circulatoire.",
          "Décrire successivement les trois composants lors d’une synthèse.",
        ),
        {
          instruction: "Sélectionne les trois réponses correctes.",
          tags: ["synthese", "composition"],
        },
      ),
      Q(
        "matching",
        "Associe chaque élément à sa fonction générale.",
        [
          O("Cœur", "Il assure la fonction de pompe.", { match: "Met le sang en mouvement" }),
          O("Artères", "Elles partent du cœur.", { match: "Conduisent vers les organes" }),
          O("Capillaires", "Ils permettent les échanges.", { match: "Échanges avec les cellules" }),
          O("Veines", "Elles reviennent au cœur.", { match: "Ramènent depuis les organes" }),
        ],
        ["K-DEA-P05-001", "K-DEA-P05-005", "K-DEA-P05-006"],
        F(
          "Les quatre fonctions reconstituent l’organisation générale du circuit.",
          "Les artères et les veines sont souvent inversées lorsque le sens du flux n’est pas suivi.",
          "Pompe, départ, échange, retour.",
          "Utiliser cette structure pour lire un schéma cardiovasculaire.",
        ),
        {
          instruction: "Associe chaque élément.",
          tags: ["synthese", "circuit"],
          difficulty: "medium",
        },
      ),
      Q(
        "ordering",
        "Remets dans l’ordre le trajet général entre deux passages par le cœur.",
        [
          O("Ventricule", "Le sang part du cœur par un ventricule."),
          O("Artère", "Une artère conduit le sang depuis le cœur."),
          O("Capillaires", "Les échanges ont lieu dans le réseau capillaire."),
          O("Veine", "Une veine ramène le sang."),
          O("Oreillette", "Le sang revient au cœur par une oreillette."),
        ],
        ["K-DEA-P05-003", "K-DEA-P05-005", "K-DEA-P05-006"],
        F(
          "Le trajet général part d’un ventricule et revient à une oreillette après artères, capillaires et veines.",
          "Commencer par une oreillette confond arrivée et départ.",
          "Ventricule → artère → capillaires → veine → oreillette.",
          "Reconstituer d’abord le trajet général avant de préciser le petit ou le grand circuit.",
        ),
        { tags: ["synthese", "ordre"], difficulty: "medium" },
      ),
      Q(
        "matching",
        "Associe chaque circulation à ses repères de départ et d’arrivée.",
        [
          O("Petite circulation", "Elle traverse les poumons.", {
            match: "Ventricule droit → oreillette gauche",
          }),
          O("Grande circulation", "Elle traverse les tissus.", {
            match: "Ventricule gauche → oreillette droite",
          }),
        ],
        ["K-DEA-P05-010", "K-DEA-P05-011"],
        F(
          "Les repères opposés permettent de distinguer les deux circuits.",
          "Inverser les oreillettes d’arrivée mélange retour pulmonaire et retour tissulaire.",
          "Petite : VD-OG ; grande : VG-OD.",
          "Vérifier territoire, départ et arrivée.",
          { memoryTip: "Les deux circuits se croisent : droite-gauche puis gauche-droite." },
        ),
        {
          instruction: "Associe chaque circuit.",
          tags: ["synthese", "circulations"],
          difficulty: "medium",
        },
      ),
      Q(
        "matching",
        "Associe chaque repère auscultatoire de pression artérielle à la valeur transmise.",
        [
          O("Premier battement net", "Il correspond à la valeur systolique.", {
            match: "Systolique",
          }),
          O("Dernier battement avant disparition", "Il correspond à la valeur diastolique.", {
            match: "Diastolique",
          }),
        ],
        ["K-DEA-P05-013"],
        F(
          "Le premier battement net donne la systolique et le dernier la diastolique.",
          "Une inversion rend le résultat incohérent.",
          "Systolique d’abord, diastolique ensuite.",
          "Transmettre les deux valeurs dans le bon ordre et avec l’unité adaptée.",
        ),
        {
          instruction: "Associe chaque moment.",
          tags: ["synthese", "pression-arterielle"],
          pages: "66",
          difficulty: "medium",
        },
      ),
      Q(
        "multiple_choice",
        "Quelles informations décrivent complètement un pouls dans le support ?",
        [
          O("La fréquence", "Elle correspond au nombre de pulsations.", { correct: true }),
          O("L’amplitude", "Elle décrit la perception du pouls.", { correct: true }),
          O("Le rythme", "Il précise la régularité.", { correct: true }),
          O("Le groupe sanguin", "Il n’est pas déterminé par le pouls.", {
            distractorType: "other-context",
          }),
        ],
        ["K-DEA-P05-014"],
        F(
          "Fréquence, amplitude et rythme forment la description demandée.",
          "Un nombre seul ne rend pas compte de la qualité ni de la régularité du pouls.",
          "FAR : fréquence, amplitude, rythme.",
          "Ajouter le site de mesure lors de la transmission.",
        ),
        {
          instruction: "Sélectionne les trois réponses correctes.",
          tags: ["synthese", "pouls"],
          pages: "67-68",
          difficulty: "medium",
        },
      ),
      Q(
        "clinical_case",
        "Après une mesure au poignet, quelle formulation est la plus précise pour le bilan ?",
        [
          O(
            "Pouls radial : fréquence, régularité et amplitude observées",
            "Elle identifie le site et les critères décrits.",
            { correct: true },
          ),
          O(
            "Le cœur va bien",
            "Cette conclusion diagnostique n’est pas justifiée par le seul pouls.",
            { distractorType: "sign-misinterpretation" },
          ),
          O("Pouls pris, rien à signaler", "La formulation reste vague et sans valeur mesurée.", {
            distractorType: "frequent-error",
          }),
          O(
            "Pression artérielle normale",
            "Le pouls ne permet pas à lui seul d’affirmer cette valeur.",
            { distractorType: "sign-misinterpretation" },
          ),
        ],
        ["K-DEA-P05-014"],
        F(
          "La formulation précise le site et les trois caractères observables sans conclure au-delà des données.",
          "Transformer une observation en diagnostic est une surinterprétation.",
          "Décrire ce qui est mesuré, avec son site et ses caractéristiques.",
          "Faire un bilan factuel et structuré au médecin régulateur.",
          {
            safetyPoint:
              "Le pouls doit être interprété avec l’ensemble du bilan et des autres paramètres.",
          },
        ),
        { tags: ["synthese", "transmission", "cas"], pages: "67-68", difficulty: "hard" },
      ),
      Q(
        "true_false",
        "Le sens du flux par rapport au cœur est plus fiable que la teneur en oxygène pour distinguer artère et veine.",
        [],
        ["K-DEA-P05-005"],
        F(
          "La proposition est vraie et explique les particularités des vaisseaux pulmonaires.",
          "La règle simplifiée rouge/bleu peut conduire à mal nommer l’artère ou les veines pulmonaires.",
          "Artère part ; veine revient.",
          "Suivre les flèches et les cavités de départ ou d’arrivée.",
        ),
        {
          correct: true,
          trueExplanation: "Le sens par rapport au cœur définit les vaisseaux.",
          falseExplanation:
            "Faux serait incorrect : l’oxygénation connaît des exceptions pulmonaires.",
          tags: ["synthese", "vaisseaux"],
          difficulty: "hard",
        },
      ),
    ],
  },
];

const BOSS = {
  id: "dea-p05-boss",
  title: "Boss - Système cardiovasculaire",
  pages: "18-21, 53, 66-68",
  section: "Appareil circulatoire - Boss de synthèse",
  competencyIds: [
    "body.system.cardiovascular",
    "body.organ.function",
    "body.organization.organ-to-system",
  ],
  questions: [
    Q(
      "matching",
      "Associe chaque composant cardiovasculaire à sa fonction.",
      [
        O("Cœur", "Il agit comme une pompe.", { match: "Propulsion du sang" }),
        O("Artères", "Elles conduisent depuis le cœur.", { match: "Départ vers les organes" }),
        O("Capillaires", "Ils permettent les échanges.", { match: "Échanges cellulaires" }),
        O("Veines", "Elles assurent le retour.", { match: "Retour vers le cœur" }),
      ],
      ["K-DEA-P05-001", "K-DEA-P05-005", "K-DEA-P05-006"],
      F(
        "Les quatre associations reconstruisent la logique du circuit fermé.",
        "Confondre départ, échange et retour empêche de suivre le flux.",
        "Pompe → départ → échanges → retour.",
        "Lire le trajet de manière séquentielle.",
      ),
      { instruction: "Associe chaque élément.", tags: ["boss", "circuit"], difficulty: "medium" },
    ),
    Q(
      "ordering",
      "Reconstitue la petite circulation.",
      [
        O("Ventricule droit", "Départ du petit circuit."),
        O("Artère pulmonaire", "Conduit vers les poumons."),
        O("Capillaires pulmonaires", "Réseau pulmonaire."),
        O("Veines pulmonaires", "Retour vers le cœur."),
        O("Oreillette gauche", "Arrivée du petit circuit."),
      ],
      ["K-DEA-P05-010"],
      F(
        "Le trajet suit exactement l’ordre du support.",
        "Les veines caves et l’aorte appartiennent à l’autre circuit.",
        "VD → artère pulmonaire → poumons → veines pulmonaires → OG.",
        "Contrôler le départ et l’arrivée.",
      ),
      { tags: ["boss", "petite-circulation"], difficulty: "medium" },
    ),
    Q(
      "ordering",
      "Reconstitue la grande circulation.",
      [
        O("Ventricule gauche", "Départ du grand circuit."),
        O("Aorte", "Conduit vers les organes."),
        O("Capillaires cellulaires", "Réseau tissulaire."),
        O("Veines caves", "Retour vers le cœur."),
        O("Oreillette droite", "Arrivée du grand circuit."),
      ],
      ["K-DEA-P05-011"],
      F(
        "Le trajet suit le ventricule gauche, les tissus puis l’oreillette droite.",
        "Insérer un vaisseau pulmonaire mélange les circuits.",
        "VG → aorte → tissus → veines caves → OD.",
        "Identifier le territoire tissulaire.",
      ),
      { tags: ["boss", "grande-circulation"], difficulty: "medium" },
    ),
    Q(
      "clinical_case",
      "Pendant une mesure manuelle, le premier battement net est entendu. Quelle donnée vient d’être repérée ?",
      [
        O("La valeur systolique", "Le premier battement net caractérise la systolique.", {
          correct: true,
        }),
        O("La valeur diastolique", "Elle correspond au dernier battement avant disparition.", {
          distractorType: "frequent-error",
        }),
        O("L’amplitude du pouls radial", "Il s’agit ici d’une auscultation tensionnelle.", {
          distractorType: "other-context",
        }),
        O("La saturation en oxygène", "Elle se mesure avec un oxymètre, pas par ce battement.", {
          distractorType: "other-context",
        }),
      ],
      ["K-DEA-P05-013"],
      F(
        "Le premier battement net correspond à la valeur systolique.",
        "Inverser premier et dernier battement inverse les deux valeurs transmises.",
        "Premier : systolique ; dernier : diastolique.",
        "Noter immédiatement la valeur repérée.",
        { safetyPoint: "Vérifier les conditions de mesure et l’état clinique global." },
      ),
      { tags: ["boss", "pression-arterielle", "cas"], pages: "66", difficulty: "hard" },
    ),
    Q(
      "clinical_case",
      "Le pouls radial est palpable. Quelle série d’éléments doit être recueillie avant la transmission ?",
      [
        O("Fréquence, amplitude et rythme", "Ces trois caractères sont demandés dans le support.", {
          correct: true,
        }),
        O("Seulement la présence du pouls", "La présence seule est incomplète.", {
          distractorType: "frequent-error",
        }),
        O("Seulement le groupe sanguin", "Le pouls ne donne pas le groupe sanguin.", {
          distractorType: "other-context",
        }),
        O("Seulement la température", "La température est un autre paramètre.", {
          distractorType: "other-context",
        }),
      ],
      ["K-DEA-P05-014"],
      F(
        "Fréquence, amplitude et rythme forment la description structurée du pouls.",
        "Transmettre seulement « présent » perd des informations observables utiles.",
        "FAR : fréquence, amplitude, rythme.",
        "Ajouter le site radial à la transmission.",
        { safetyPoint: "Toute anomalie doit être confrontée au reste du bilan." },
      ),
      { tags: ["boss", "pouls", "cas"], pages: "67-68", difficulty: "hard" },
    ),
    Q(
      "multiple_choice",
      "Quelles propositions décrivent correctement les cavités cardiaques ?",
      [
        O(
          "Le sang arrive par les veines dans les oreillettes",
          "Le support décrit ce sens d’arrivée.",
          { correct: true },
        ),
        O(
          "Le sang part par les artères depuis les ventricules",
          "Le support décrit ce sens de départ.",
          { correct: true },
        ),
        O(
          "Le sang arrive toujours directement dans les ventricules",
          "Cette proposition inverse l’arrivée décrite.",
          { distractorType: "frequent-error" },
        ),
        O(
          "Les côtés droit et gauche communiquent librement",
          "Le support exclut cette communication normale.",
          { distractorType: "frequent-error" },
        ),
      ],
      ["K-DEA-P05-003"],
      F(
        "Oreillettes et ventricules sont respectivement cavités d’arrivée et de départ.",
        "Inverser les cavités ou réunir les deux côtés détruit la logique du trajet.",
        "Veines → oreillettes ; ventricules → artères.",
        "Suivre le flux sur chaque côté du cœur.",
      ),
      {
        instruction: "Sélectionne les deux réponses correctes.",
        tags: ["boss", "coeur"],
        pages: "18",
        difficulty: "hard",
      },
    ),
    Q(
      "matching",
      "Associe chaque constituant sanguin à sa fonction.",
      [
        O("Globules rouges", "Ils transportent O2 et CO2.", { match: "Transport des gaz" }),
        O("Globules blancs", "Ils participent à la défense.", { match: "Défense de l’organisme" }),
        O("Plaquettes", "Elles colmatent des brèches.", {
          match: "Limitation des phénomènes hémorragiques",
        }),
        O("Plasma", "Il forme la phase liquide.", { match: "Phase liquide" }),
      ],
      ["K-DEA-P05-008", "K-DEA-P05-009"],
      F(
        "Chaque élément retrouve la fonction décrite page 19.",
        "Une fonction unique ne peut pas être attribuée indistinctement à tous les constituants.",
        "Gaz, défense, colmatage et phase liquide.",
        "Décrire les fonctions sans interpréter une analyse biologique.",
      ),
      {
        instruction: "Associe chaque élément.",
        tags: ["boss", "sang"],
        pages: "19",
        difficulty: "medium",
      },
    ),
    Q(
      "clinical_case",
      "Un étudiant affirme : « ce vaisseau est une artère parce que le sang y est riche en oxygène ». Quelle correction est la plus juste ?",
      [
        O(
          "Une artère est définie par un flux qui part du cœur",
          "Le sens par rapport au cœur est le critère correct.",
          { correct: true },
        ),
        O(
          "Toute artère transporte toujours un sang riche en oxygène",
          "L’artère pulmonaire constitue l’exception visible dans le support.",
          { distractorType: "frequent-error" },
        ),
        O(
          "Une artère revient toujours vers une oreillette",
          "Ce sens définit plutôt le retour veineux.",
          { distractorType: "sign-misinterpretation" },
        ),
        O(
          "La couleur d’un schéma suffit à identifier le vaisseau",
          "La couleur seule peut induire en erreur.",
          { distractorType: "frequent-error" },
        ),
      ],
      ["K-DEA-P05-005", "K-DEA-P05-010"],
      F(
        "Le critère fiable est le départ depuis le cœur, non la teneur en oxygène.",
        "Une règle simplifiée sans exception conduit à mal classer l’artère pulmonaire.",
        "Artère part, veine revient.",
        "S’appuyer sur le sens des flèches et les cavités.",
      ),
      { tags: ["boss", "vaisseaux", "raisonnement"], pages: "18, 21", difficulty: "hard" },
    ),
  ],
};

function buildAnswers(itemId, config) {
  if (config.kind === "true_false") {
    return [
      { id: `${itemId}-true`, text: "Vrai", explanation: config.trueExplanation },
      { id: `${itemId}-false`, text: "Faux", explanation: config.falseExplanation },
    ];
  }
  if (config.kind === "matching") {
    return config.options.map((entry, index) => ({
      id: `${itemId}-a${index + 1}`,
      text: entry.text,
      match: entry.match,
      explanation: entry.explanation,
    }));
  }
  if (config.kind === "ordering") {
    return config.options.map((entry, index) => ({
      id: `${itemId}-a${index + 1}`,
      text: entry.text,
      explanation: entry.explanation,
      sequenceRank: index + 1,
    }));
  }
  return config.options.map((entry, index) => ({
    id: `${itemId}-a${index + 1}`,
    text: entry.text,
    explanation: entry.explanation,
    ...(entry.distractorType ? { distractorType: entry.distractorType } : {}),
  }));
}

function buildItem(lesson, config, index) {
  const id = `${lesson.id}-q${String(index + 1).padStart(2, "0")}`;
  const answers = buildAnswers(id, config);
  let correctAnswer;
  if (config.kind === "true_false") {
    correctAnswer = `${id}-${config.correct ? "true" : "false"}`;
  } else if (config.kind === "matching" || config.kind === "ordering") {
    correctAnswer = answers.map((answer) => answer.id);
  } else {
    const correctIds = answers
      .filter((_, answerIndex) => config.options[answerIndex].correct)
      .map((answer) => answer.id);
    correctAnswer = config.kind === "multiple_choice" ? correctIds : correctIds[0];
  }

  const type = {
    single: "mcq",
    multiple_choice: "multiple_choice",
    true_false: "true_false_contextual",
    matching: "association",
    ordering: "ordering",
    fill_blank: "fill_blank",
    clinical_case: "clinical_case",
  }[config.kind];
  const pages = config.pages ?? lesson.pages;
  const section = config.section ?? lesson.section;
  const competencyIds = config.competencyIds ?? lesson.competencyIds;
  const pedagogicalFeedback = config.feedback;
  return {
    id,
    type,
    difficulty: config.difficulty ?? "easy",
    question: config.prompt,
    ...(config.instruction ? { instruction: config.instruction } : {}),
    answers,
    correctAnswer,
    ...(Array.isArray(correctAnswer) ? { correctAnswers: correctAnswer } : {}),
    explanation: pedagogicalFeedback.whyCorrect,
    knowledgeIds: config.knowledgeIds,
    sourceDocument: SOURCE_ID,
    sourceSection: section,
    sourcePages: pages,
    pageStatus: "verified",
    competencyIds,
    lessonId: lesson.id,
    plannedParcoursIds: [PARCOURS_ID],
    pedagogicalFeedback,
    validationStatus: "to_validate",
    generationSource: "library_extracted_knowledge",
    why_correct: pedagogicalFeedback.whyCorrect,
    common_mistake: pedagogicalFeedback.commonMistake,
    key_takeaway: pedagogicalFeedback.keyTakeaway,
    ...(pedagogicalFeedback.memoryTip ? { memory_tip: pedagogicalFeedback.memoryTip } : {}),
    tags: ["dea", "parcours-05", ...(config.tags ?? [])],
    pedagogicalReference: `${SOURCE_TITLE}, p. ${pages}`,
    level: 1,
    xp: 0,
    metadata: {
      lessonId: lesson.id,
      sourceDocument: SOURCE_ID,
      sourceTitle: SOURCE_TITLE,
      sourceSection: section,
      sourcePages: pages,
      pageStatus: "verified",
      sourceType: "training_source",
      knowledgeIds: config.knowledgeIds,
      competencyIds,
      plannedParcoursIds: [PARCOURS_ID],
      validationStatus: "to_validate",
      generationSource: "library_extracted_knowledge",
      ...(type === "association" ? { associationMode: "matching" } : {}),
      ...(Array.isArray(correctAnswer) ? { requiredSelections: correctAnswer.length } : {}),
    },
  };
}

function buildLesson(lesson) {
  const items = lesson.questions.map((entry, index) => buildItem(lesson, entry, index));
  return {
    schemaVersion: 2,
    formation: "dea",
    parcours: PARCOURS_ID,
    id: lesson.id,
    title: lesson.title,
    kind: "lesson",
    status: "review",
    difficulty: lesson.difficulty ?? "easy",
    estimatedMinutes: lesson.estimatedMinutes ?? 9,
    level: 1,
    xp: null,
    tags: ["dea", "parcours-05", "validation-a-effectuer"],
    pedagogicalReference: `${SOURCE_TITLE}, p. ${lesson.pages}`,
    pulse: null,
    selection: { strategy: "all", count: items.length },
    learningObjectives: lesson.objectives,
    competencyIds: lesson.competencyIds,
    prerequisiteIds: lesson.prerequisiteIds ?? [],
    validationStatus: "to_validate",
    generationSource: "library_extracted_knowledge",
    items,
  };
}

function buildBoss(boss) {
  const items = boss.questions.map((entry, index) => buildItem(boss, entry, index));
  return {
    schemaVersion: 2,
    formation: "dea",
    parcours: PARCOURS_ID,
    id: boss.id,
    title: boss.title,
    kind: "boss",
    status: "review",
    difficulty: "medium",
    estimatedMinutes: 12,
    level: 1,
    xp: null,
    tags: ["dea", "parcours-05", "boss", "validation-a-effectuer"],
    pedagogicalReference: `${SOURCE_TITLE}, p. ${boss.pages}`,
    pulse: null,
    selection: { strategy: "all", count: items.length },
    learningObjectives: [
      "Relier cœur, vaisseaux et sang dans le circuit cardiovasculaire.",
      "Distinguer la petite et la grande circulation.",
      "Structurer les données essentielles d’une pression artérielle et d’un pouls.",
    ],
    competencyIds: boss.competencyIds,
    prerequisiteIds: ["dea-p05-l08"],
    bossConfiguration: {
      objective: "Valider les bases du système cardiovasculaire au niveau DEA.",
      scenario:
        "L’apprenant analyse un schéma circulatoire et des mesures simples, puis sélectionne une transmission factuelle sans poser de diagnostic.",
      tasks: [
        "Reconstituer les deux circulations.",
        "Identifier les rôles du cœur, des vaisseaux et du sang.",
        "Transmettre les paramètres observés avec précision.",
      ],
      engine: "existing_lesson_engine",
      excludedEngine: "mode_intervention",
      successThreshold: 0.8,
      rewardConfigurable: true,
    },
    validationStatus: "to_validate",
    generationSource: "library_extracted_knowledge",
    items,
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function validateGeneratedContent() {
  if (LESSONS.length !== 8) throw new Error("Le Parcours 5 doit contenir 8 leçons.");
  for (const lesson of LESSONS) {
    if (lesson.questions.length !== 8) {
      throw new Error(`${lesson.id} doit contenir exactement 8 questions.`);
    }
  }
  if (BOSS.questions.length !== 8) throw new Error("Le Boss doit contenir 8 questions.");
  const prompts = [...LESSONS.flatMap((lesson) => lesson.questions), ...BOSS.questions].map(
    (entry) => entry.prompt.trim().toLowerCase(),
  );
  if (new Set(prompts).size !== prompts.length) throw new Error("Question dupliquée détectée.");
  for (const entry of [...LESSONS.flatMap((lesson) => lesson.questions), ...BOSS.questions]) {
    if (
      !entry.feedback?.whyCorrect ||
      !entry.feedback?.commonMistake ||
      !entry.feedback?.keyTakeaway ||
      !entry.feedback?.fieldApplication
    ) {
      throw new Error(`Feedback incomplet : ${entry.prompt}`);
    }
    if (!entry.knowledgeIds?.length) throw new Error(`Connaissance absente : ${entry.prompt}`);
  }
}

async function archiveLegacyDraft() {
  try {
    const raw = await readFile(join(OUTPUT_DIR, "lesson-08.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.tags?.includes("import-json-xlsx")) return;
    try {
      const archived = await readFile(LEGACY_FILE, "utf8");
      if (archived !== raw)
        throw new Error("L’archive historique existe avec un contenu différent.");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await writeFile(LEGACY_FILE, raw, "utf8");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function updateDocumentKnowledge() {
  const path = join(ROOT, "docs", "master_knowledge_base", "documents", `${SOURCE_ID}.json`);
  const document = await readJson(path);
  const byId = new Map((document.knowledge ?? []).map((entry) => [entry.knowledgeId, entry]));
  for (const entry of KNOWLEDGE) {
    const existing = byId.get(entry.knowledgeId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(entry)) {
      throw new Error(`La connaissance ${entry.knowledgeId} existe avec un contenu différent.`);
    }
    if (!existing) document.knowledge.push(entry);
  }
  document.analyzed_scope =
    "Appareil locomoteur, pages 34 à 38 ; appareil circulatoire, pages 18 à 21 ; pression artérielle et pouls, pages 53 et 66 à 68";
  await writeJson(path, document);
}

validateGeneratedContent();
await mkdir(OUTPUT_DIR, { recursive: true });
await archiveLegacyDraft();
await writeJson(join(OUTPUT_DIR, "knowledge.json"), {
  schemaVersion: 1,
  formationId: "dea",
  blocId: "bloc-02",
  parcoursId: PARCOURS_ID,
  contentId: CONTENT_ID,
  sourceDocument: SOURCE_ID,
  validationStatus: "to_validate",
  knowledge: KNOWLEDGE,
});
for (const [index, lesson] of LESSONS.entries()) {
  await writeJson(
    join(OUTPUT_DIR, `lesson-${String(index + 1).padStart(2, "0")}.json`),
    buildLesson(lesson),
  );
}
await writeJson(join(OUTPUT_DIR, "lesson-09.json"), buildBoss(BOSS));
await updateDocumentKnowledge();

console.log(
  `Parcours 5 généré : ${KNOWLEDGE.length} connaissances, ${LESSONS.length * 8} questions de leçon et 8 questions de Boss.`,
);
