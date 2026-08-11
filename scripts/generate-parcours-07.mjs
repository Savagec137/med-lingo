import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-07");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const SOURCE_TITLE = "B2.M4 - Support Etudiant.pdf";
const SOURCE_VERSION = "Version 1 - Août 2022";
const SOURCE_TYPE = "training_source";
const PARCOURS_ID = "parcours-07";
const CONTENT_ID = "dea-p07";
const LEGACY_FILE = join(OUTPUT_DIR, "legacy-import-lesson-08.json");

const DIGESTIVE = ["body.system.digestive"];
const ORGAN = ["body.system.digestive", "body.organ.function", "body.organ.location"];
const COMPOSITION = ["body.system.digestive", "body.organ.composition", "body.organ.function"];
const SYSTEM = ["body.system.digestive", "body.organization.organ-to-system"];

const K = (
  id,
  title,
  summary,
  keyPoints,
  commonErrors,
  clinicalApplication,
  section,
  pages,
  competencyIds,
  lessonIds,
) => ({
  knowledgeId: "K-DEA-P07-" + String(id).padStart(3, "0"),
  title,
  summary,
  keyPoints,
  commonErrors,
  clinicalApplication,
  sourceDocument: SOURCE_ID,
  sourceTitle: SOURCE_TITLE,
  sourceType: SOURCE_TYPE,
  section,
  pages,
  pageStatus: "verified",
  competencyIds,
  lessonIds,
  plannedParcoursIds: [PARCOURS_ID],
  status: "to_validate",
});

const KNOWLEDGE = [
  K(
    1,
    "Organisation générale de l’appareil digestif",
    "L’appareil digestif transforme les aliments absorbés en éléments assimilables par l’organisme.",
    [
      "Les aliments suivent un trajet organisé dans le tube digestif.",
      "Plusieurs organes et glandes participent à leur transformation.",
      "Les nutriments obtenus peuvent ensuite être absorbés.",
    ],
    [
      "Réduire l’appareil digestif au seul estomac.",
      "Confondre transformation digestive et absorption intestinale.",
    ],
    "Suivre le trajet des aliments permet de localiser précisément une plainte digestive dans un bilan DEA.",
    "Appareil digestif - organisation générale",
    [39, 40, 41],
    SYSTEM,
    ["dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    2,
    "Bouche et phénomènes mécaniques",
    "Dans la bouche ont lieu la mastication, la salivation et la déglutition.",
    [
      "La langue, les dents et les glandes salivaires appartiennent aux éléments cités pour la bouche.",
      "La mastication fragmente les aliments.",
      "La salivation accompagne la préparation du bol alimentaire.",
      "La déglutition poursuit le trajet vers le pharynx.",
    ],
    [
      "Placer l’absorption intestinale dans la bouche.",
      "Confondre mastication et sécrétion de bile.",
    ],
    "Identifier la bouche comme première étape aide à décrire le début du trajet digestif.",
    "Appareil digestif - bouche",
    [39],
    COMPOSITION,
    ["dea-p07-l01", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    3,
    "Salive et amidons",
    "La salive contient une enzyme qui agit sur les amidons.",
    [
      "Les glandes salivaires sont associées à la bouche.",
      "L’action enzymatique salivaire débute pendant la phase buccale.",
    ],
    [
      "Attribuer à la salive la production de bile.",
      "Dire que toute la digestion est terminée dans la bouche.",
    ],
    "Cette notion aide à distinguer phénomènes mécaniques et action enzymatique dès la bouche.",
    "Appareil digestif - bouche et salive",
    [39],
    DIGESTIVE,
    ["dea-p07-l01", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    4,
    "Dentition décrite dans le support",
    "Le support décrit 32 dents, avec par mâchoire 4 incisives, 2 canines, 4 prémolaires et 6 molaires.",
    ["Le total annoncé est de 32 dents.", "La répartition est donnée pour chaque mâchoire."],
    [
      "Additionner la répartition d’une seule mâchoire comme s’il s’agissait du total.",
      "Inverser prémolaires et molaires.",
    ],
    "La dentition fait partie des repères anatomiques de la cavité buccale.",
    "Appareil digestif - bouche et dents",
    [39],
    COMPOSITION,
    ["dea-p07-l01", "dea-p07-l08"],
  ),
  K(
    5,
    "Pharynx et œsophage",
    "Le pharynx est un carrefour aérodigestif ; l’œsophage est un tube d’environ 25 cm servant au passage des aliments.",
    [
      "Le pharynx appartient au trajet commun des voies aérienne et digestive.",
      "L’œsophage conduit les aliments vers l’estomac.",
      "Le support attribue à l’œsophage une longueur d’environ 25 cm.",
    ],
    ["Confondre œsophage et trachée.", "Attribuer l’absorption intestinale à l’œsophage."],
    "Nommer pharynx puis œsophage permet une transmission anatomique plus précise.",
    "Appareil digestif - pharynx et œsophage",
    [39],
    ORGAN,
    ["dea-p07-l02", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    6,
    "Estomac, cardia et pylore",
    "L’estomac est une poche en J d’environ 2 litres, située entre le cardia à l’entrée et le pylore à la sortie.",
    [
      "La paroi contient des muscles lisses.",
      "Des glandes sécrètent un suc gastrique très acide agissant sur les protides.",
      "Brassage, malaxage et imprégnation précèdent l’expulsion vers l’intestin.",
    ],
    [
      "Inverser cardia et pylore.",
      "Présenter l’estomac comme le principal lieu de l’absorption intestinale.",
    ],
    "Ces repères permettent de décrire la place et le rôle général de l’estomac sans poser de diagnostic.",
    "Appareil digestif - estomac",
    [39],
    COMPOSITION,
    ["dea-p07-l03", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    7,
    "Intestin grêle et duodénum",
    "L’intestin grêle est un tube replié en anses d’environ 8 mètres, dont la première partie est le duodénum.",
    [
      "Des canaux provenant de la vésicule biliaire et du pancréas débouchent dans le duodénum.",
      "Le suc intestinal et le suc pancréatique participent à la transformation des nutriments.",
      "Le contenu poursuit ensuite son trajet vers le gros intestin.",
    ],
    ["Confondre duodénum et côlon.", "Placer l’intestin grêle avant l’estomac dans le trajet."],
    "Le duodénum est un repère utile pour comprendre l’arrivée des sécrétions digestives.",
    "Appareil digestif - intestin grêle",
    [39],
    ORGAN,
    ["dea-p07-l04", "dea-p07-l05", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    8,
    "Foie et bile",
    "Le foie sécrète la bile, qui se déverse dans l’intestin grêle.",
    [
      "Le foie est une glande digestive citée dans le support.",
      "La bile participe au processus digestif dans l’intestin grêle.",
    ],
    [
      "Dire que le foie stocke la bile à la place de la vésicule biliaire.",
      "Attribuer la production du suc pancréatique au foie.",
    ],
    "Distinguer production et stockage évite une transmission anatomique imprécise.",
    "Appareil digestif - glandes digestives et foie",
    [40],
    ORGAN,
    ["dea-p07-l04", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    9,
    "Vésicule biliaire",
    "La vésicule biliaire est un petit sac qui emmagasine la bile.",
    [
      "La bile est sécrétée par le foie.",
      "La vésicule biliaire assure son stockage.",
      "Un canal provenant de la vésicule débouche dans le duodénum.",
    ],
    [
      "Présenter la vésicule biliaire comme la glande qui fabrique la bile.",
      "Confondre vésicule biliaire et vessie.",
    ],
    "Ce repère aide à différencier le foie, la vésicule biliaire et le pancréas.",
    "Appareil digestif - glandes digestives et vésicule biliaire",
    [39, 40],
    ORGAN,
    ["dea-p07-l04", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    10,
    "Pancréas et sécrétions",
    "Le pancréas sécrète le suc pancréatique et fabrique l’insuline.",
    [
      "Le suc pancréatique rejoint le duodénum.",
      "Le support distingue cette sécrétion digestive de la fabrication d’insuline.",
    ],
    ["Attribuer la bile au pancréas.", "Réduire le pancréas à une seule fonction."],
    "Identifier les deux productions citées évite de confondre les rôles des glandes digestives.",
    "Appareil digestif - glandes digestives et pancréas",
    [39, 40],
    ORGAN,
    ["dea-p07-l04", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    11,
    "Côlon et résidus non absorbés",
    "Le côlon est un tube d’environ 1,5 mètre ; les aliments non absorbés deviennent des matières fécales qui transitent dans le gros intestin avant leur évacuation.",
    [
      "Le côlon débute dans un cul-de-sac portant l’appendice selon le support.",
      "Le gros intestin reçoit les éléments non absorbés.",
      "L’évacuation termine le trajet digestif.",
    ],
    [
      "Confondre gros intestin et intestin grêle.",
      "Placer l’absorption principale des nutriments dans le côlon.",
    ],
    "Décrire le transit et ses anomalies observables contribue à un bilan factuel.",
    "Appareil digestif - côlon et transit",
    [40, 41],
    ORGAN,
    ["dea-p07-l06", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    12,
    "Péritoine",
    "Le péritoine est un double feuillet enveloppant la cavité abdominale et protégeant les viscères.",
    [
      "Le péritoine est une enveloppe protectrice.",
      "Il n’est pas une portion du tube digestif parcourue par les aliments.",
    ],
    ["Placer le péritoine dans le trajet des aliments.", "Confondre péritoine et côlon."],
    "Le terme permet de décrire correctement une structure de la cavité abdominale.",
    "Appareil digestif - péritoine",
    [40],
    ORGAN,
    ["dea-p07-l08", "dea-p07-boss"],
  ),
  K(
    13,
    "Digestion, nutriments et absorption intestinale",
    "La digestion transforme certains aliments en petites molécules grâce aux enzymes des sucs digestifs ; les nutriments traversent ensuite la paroi de l’intestin grêle vers le sang ou la lymphe.",
    [
      "Les nutriments sont des molécules utilisables par l’organisme.",
      "La digestion a lieu dans le tube digestif avec l’action d’enzymes.",
      "La grande surface et la faible épaisseur de la paroi de l’intestin grêle facilitent l’absorption.",
      "Les éléments non absorbés poursuivent vers le gros intestin.",
    ],
    [
      "Confondre digestion et absorption.",
      "Dire que tous les aliments sont absorbés sans transformation.",
    ],
    "Distinguer transformation et passage vers le sang ou la lymphe clarifie le fonctionnement digestif.",
    "Digestion - nutriments et absorption intestinale",
    [41],
    DIGESTIVE,
    ["dea-p07-l05", "dea-p07-l07", "dea-p07-l08", "dea-p07-boss"],
  ),
];

const FB = (whyCorrect, commonMistake, keyTakeaway, fieldApplication, memoryTip, safetyPoint) => ({
  whyCorrect,
  commonMistake,
  keyTakeaway,
  fieldApplication,
  ...(memoryTip ? { memoryTip } : {}),
  ...(safetyPoint ? { safetyPoint } : {}),
});

const A = (text, explanation, correct = false, match) => ({
  text,
  explanation,
  ...(correct ? { correct: true } : {}),
  ...(match ? { match } : {}),
});
const Q = (kind, prompt, options, knowledgeIds, feedback, extras = {}) => ({
  kind,
  prompt,
  options,
  knowledgeIds,
  feedback,
  ...extras,
});
const MCQ = (prompt, correct, wrong, knowledgeIds, feedback, extras = {}) =>
  Q(
    "single",
    prompt,
    [A(correct[0], correct[1], true), ...wrong.map((entry) => A(entry[0], entry[1]))],
    knowledgeIds,
    feedback,
    extras,
  );
const CLINICAL = (prompt, correct, wrong, knowledgeIds, feedback, extras = {}) =>
  Q(
    "clinical_case",
    prompt,
    [A(correct[0], correct[1], true), ...wrong.map((entry) => A(entry[0], entry[1]))],
    knowledgeIds,
    feedback,
    extras,
  );
const FILL = (prompt, correct, wrong, knowledgeIds, feedback, extras = {}) =>
  Q(
    "fill_blank",
    prompt,
    [A(correct[0], correct[1], true), ...wrong.map((entry) => A(entry[0], entry[1]))],
    knowledgeIds,
    feedback,
    extras,
  );
const TF = (
  prompt,
  correct,
  knowledgeIds,
  feedback,
  trueExplanation,
  falseExplanation,
  extras = {},
) =>
  Q("true_false", prompt, [], knowledgeIds, feedback, {
    correct,
    trueExplanation,
    falseExplanation,
    ...extras,
  });
const MATCH = (prompt, pairs, knowledgeIds, feedback, extras = {}) =>
  Q(
    "matching",
    prompt,
    pairs.map((entry) => A(entry[0], entry[2], false, entry[1])),
    knowledgeIds,
    feedback,
    extras,
  );
const ORDER = (prompt, steps, knowledgeIds, feedback, extras = {}) =>
  Q(
    "ordering",
    prompt,
    steps.map((entry) => A(entry[0], entry[1])),
    knowledgeIds,
    feedback,
    extras,
  );
const MULTI = (prompt, correct, wrong, knowledgeIds, feedback, extras = {}) =>
  Q(
    "multiple_choice",
    prompt,
    [
      ...correct.map((entry) => A(entry[0], entry[1], true)),
      ...wrong.map((entry) => A(entry[0], entry[1])),
    ],
    knowledgeIds,
    feedback,
    extras,
  );

const LESSONS = [
  {
    id: "dea-p07-l01",
    title: "La bouche",
    pages: "39",
    section: "Appareil digestif - bouche, salive et dents",
    objectives: [
      "Identifier les éléments cités dans la bouche.",
      "Distinguer mastication, salivation et déglutition.",
      "Relier la salive à son action enzymatique décrite.",
    ],
    competencyIds: COMPOSITION,
    questions: [
      MCQ(
        "Quels éléments le support associe-t-il directement à la bouche ?",
        [
          "La langue, les dents et les glandes salivaires",
          "Ces trois éléments sont cités dans la description de la bouche.",
        ],
        [
          [
            "Le foie, la vésicule biliaire et le pancréas",
            "Ces structures sont des glandes ou annexes digestives abdominales.",
          ],
          [
            "Le cardia, le pylore et le duodénum",
            "Ces repères concernent l’estomac et le début de l’intestin grêle.",
          ],
          [
            "Le côlon, l’appendice et le rectum",
            "Ces structures appartiennent à la partie terminale du trajet digestif.",
          ],
        ],
        ["K-DEA-P07-002"],
        FB(
          "La description de la bouche réunit langue, dents et glandes salivaires.",
          "Regrouper tous les organes digestifs dans la bouche efface leur localisation.",
          "La bouche associe langue, dents et glandes salivaires.",
          "Nommer précisément la cavité buccale lors d’une observation.",
        ),
      ),
      TF(
        "La salive contient une enzyme qui agit sur les amidons.",
        true,
        ["K-DEA-P07-003"],
        FB(
          "Le support décrit explicitement cette action enzymatique de la salive.",
          "Attribuer cette action à la bile ou au suc gastrique confond les sécrétions.",
          "L’action enzymatique digestive commence dès la bouche.",
          "Distinguer la sécrétion concernée dans une explication anatomique simple.",
        ),
        "La proposition reprend l’action de la salive donnée dans le support.",
        "Faux serait incorrect : le support relie bien la salive aux amidons.",
      ),
      MATCH(
        "Associe chaque élément de la phase buccale à la description correspondante.",
        [
          ["Dents", "Mastication", "Elles participent à la fragmentation mécanique."],
          ["Glandes salivaires", "Salivation", "Elles sont associées à la production de salive."],
          ["Salive", "Enzyme agissant sur les amidons", "Cette action est explicitement citée."],
          [
            "Déglutition",
            "Poursuite du trajet vers le pharynx",
            "Elle fait suite à la préparation buccale.",
          ],
        ],
        ["K-DEA-P07-002", "K-DEA-P07-003"],
        FB(
          "Les associations distinguent mécanismes, structures et sécrétion.",
          "Confondre salivation et mastication mélange action chimique et action mécanique.",
          "Bouche : mastication, salivation, puis poursuite par la déglutition.",
          "Décrire séparément structure observée et fonction générale.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le début du trajet digestif décrit par le support.",
        [
          ["Entrée des aliments dans la bouche", "La bouche est la première étape retenue ici."],
          ["Mastication et salivation", "Elles préparent les aliments dans la bouche."],
          ["Déglutition", "Elle engage la poursuite du trajet."],
          ["Passage par le pharynx", "Le pharynx précède l’œsophage."],
        ],
        ["K-DEA-P07-002", "K-DEA-P07-005"],
        FB(
          "L’ordre suit la préparation buccale puis le passage vers le pharynx.",
          "Placer le pharynx avant l’entrée dans la bouche inverse le trajet.",
          "Bouche, préparation, déglutition, pharynx.",
          "Reconstituer un trajet anatomique sans ajouter de diagnostic.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : le support décrit un total de ______ dents.",
        ["32", "Le nombre total annoncé est de 32 dents."],
        [
          [
            "16",
            "Seize correspond au total obtenu pour une seule mâchoire avec la répartition donnée.",
          ],
          ["24", "Ce nombre ne correspond pas à la dentition décrite."],
          ["36", "Ce nombre dépasse le total donné dans le support."],
        ],
        ["K-DEA-P07-004"],
        FB(
          "La somme des deux mâchoires conduit au total de 32 dents.",
          "S’arrêter à la répartition d’une seule mâchoire conduit à répondre 16.",
          "16 par mâchoire, 32 au total dans ce support.",
          "Employer ce repère lors d’une description de la cavité buccale.",
          "Deux fois seize font trente-deux.",
        ),
      ),
      CLINICAL(
        "Lors du bilan, un patient conscient montre une gêne limitée à l’intérieur de la bouche. Quelle transmission reste la plus factuelle ?",
        [
          "Gêne localisée dans la cavité buccale, au contact de la langue et des dents",
          "La formulation localise ce qui est montré sans conclure sur une cause.",
        ],
        [
          [
            "Atteinte certaine du pancréas",
            "Le pancréas n’est pas situé dans la cavité buccale et aucune cause n’est établie.",
          ],
          ["Obstruction du côlon", "Cette localisation ne correspond pas à la zone désignée."],
          ["Maladie de l’estomac confirmée", "Une gêne buccale ne permet pas cette conclusion."],
        ],
        ["K-DEA-P07-002"],
        FB(
          "La réponse décrit uniquement la localisation observable.",
          "Transformer une plainte locale en diagnostic dépasse l’objectif anatomique.",
          "Localiser avant d’interpréter.",
          "Transmettre la zone, les signes et l’évolution observée.",
          null,
          "Une localisation ne remplace jamais le bilan complet.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quels phénomènes le support situe-t-il dans la bouche ?",
        [
          ["La mastication", "Elle correspond à la préparation mécanique."],
          ["La salivation", "Elle accompagne l’action de la salive."],
          ["La déglutition", "Elle permet la poursuite du trajet."],
        ],
        [
          ["L’absorption intestinale", "Elle se déroule au niveau de l’intestin grêle."],
          ["L’évacuation des matières fécales", "Elle correspond à la fin du trajet digestif."],
        ],
        ["K-DEA-P07-002"],
        FB(
          "Les trois phénomènes buccaux sont listés ensemble dans le support.",
          "Choisir absorption ou évacuation confond le début et la fin du trajet digestif.",
          "Mastication, salivation et déglutition appartiennent à la phase buccale.",
          "Structurer le trajet digestif étape par étape.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quelle répartition est donnée pour une mâchoire ?",
        [
          "4 incisives, 2 canines, 4 prémolaires et 6 molaires",
          "Cette répartition totalise 16 dents par mâchoire.",
        ],
        [
          ["2 incisives, 4 canines, 6 prémolaires et 4 molaires", "Les catégories sont inversées."],
          [
            "4 incisives, 4 canines, 2 prémolaires et 6 molaires",
            "Le nombre de canines et prémolaires ne correspond pas.",
          ],
          [
            "6 incisives, 2 canines, 4 prémolaires et 4 molaires",
            "Le nombre d’incisives et molaires ne correspond pas.",
          ],
        ],
        ["K-DEA-P07-004"],
        FB(
          "La répartition reprend exactement celle du support.",
          "Les nombres proches peuvent être inversés entre catégories dentaires.",
          "Par mâchoire : 4, 2, 4, 6.",
          "Utiliser la bonne catégorie lorsqu’une lésion dentaire est localisée.",
          "I-C-P-M : 4-2-4-6.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p07-l02",
    title: "L’œsophage",
    pages: "39",
    section: "Appareil digestif - pharynx et œsophage",
    objectives: [
      "Identifier le pharynx comme carrefour aérodigestif.",
      "Décrire le rôle général de l’œsophage.",
      "Replacer l’œsophage entre pharynx et estomac.",
    ],
    competencyIds: ORGAN,
    questions: [
      MCQ(
        "Quel terme décrit le pharynx dans le support ?",
        ["Carrefour aérodigestif", "Le pharynx est commun au trajet respiratoire et digestif."],
        [
          ["Réservoir de bile", "La bile est stockée dans la vésicule biliaire."],
          [
            "Lieu principal d’absorption",
            "L’absorption est décrite au niveau de l’intestin grêle.",
          ],
          ["Sphincter de sortie de l’estomac", "Le pylore assure cette fonction."],
        ],
        ["K-DEA-P07-005"],
        FB(
          "Le qualificatif aérodigestif souligne le croisement des deux voies.",
          "Attribuer au pharynx une fonction abdominale confond les régions anatomiques.",
          "Pharynx : carrefour aérodigestif.",
          "Nommer ce repère lors d’une difficulté située dans la gorge.",
        ),
      ),
      TF(
        "L’œsophage est un tube d’environ 25 cm servant au passage des aliments.",
        true,
        ["K-DEA-P07-005"],
        FB(
          "La proposition reprend la longueur et le rôle général donnés par le support.",
          "Confondre œsophage et trachée conduit à parler du passage de l’air.",
          "Œsophage : passage des aliments vers l’estomac.",
          "Différencier trajet digestif et trajet respiratoire.",
        ),
        "La description correspond au texte source.",
        "Faux serait incorrect : le support donne bien environ 25 cm et un rôle de passage.",
      ),
      MATCH(
        "Associe chaque structure à son rôle ou à sa position dans le trajet.",
        [
          [
            "Bouche",
            "Préparation initiale des aliments",
            "Elle associe mastication et salivation.",
          ],
          ["Pharynx", "Carrefour aérodigestif", "Il est commun aux deux voies."],
          ["Œsophage", "Passage vers l’estomac", "Il conduit les aliments."],
          ["Estomac", "Poche recevant le contenu après l’œsophage", "Il succède à l’œsophage."],
        ],
        ["K-DEA-P07-002", "K-DEA-P07-005", "K-DEA-P07-006"],
        FB(
          "Chaque association replace la structure dans le trajet digestif supérieur.",
          "Intervertir pharynx et œsophage rompt la continuité anatomique.",
          "Bouche, pharynx, œsophage, estomac.",
          "Structurer une transmission selon le trajet anatomique.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le trajet des aliments jusqu’à l’estomac.",
        [
          ["Bouche", "La préparation commence dans la bouche."],
          ["Pharynx", "Il suit la déglutition."],
          ["Œsophage", "Il conduit les aliments."],
          ["Estomac", "Il reçoit le contenu par le cardia."],
        ],
        ["K-DEA-P07-002", "K-DEA-P07-005", "K-DEA-P07-006"],
        FB(
          "L’ordre suit le trajet anatomique décrit.",
          "Placer l’estomac avant l’œsophage inverse le sens du passage.",
          "Bouche, pharynx, œsophage, estomac.",
          "Utiliser cet ordre pour localiser une gêne rapportée.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : le tube qui conduit les aliments du pharynx vers l’estomac est l’______.",
        ["œsophage", "L’œsophage assure ce passage."],
        [
          ["appendice", "L’appendice est associé au début du côlon."],
          ["duodénum", "Le duodénum est la première partie de l’intestin grêle."],
          ["pylore", "Le pylore est le sphincter de sortie de l’estomac."],
        ],
        ["K-DEA-P07-005"],
        FB(
          "L’œsophage relie le pharynx à l’estomac.",
          "Choisir un organe abdominal méconnaît la position du conduit.",
          "Œsophage : pharynx vers estomac.",
          "Employer le nom du conduit plutôt qu’une formule vague.",
        ),
      ),
      CLINICAL(
        "Un patient conscient décrit une sensation sur le trajet entre la gorge et l’estomac. Quelle localisation anatomique est la plus adaptée ?",
        ["Le trajet œsophagien", "L’œsophage relie le pharynx à l’estomac."],
        [
          ["Le côlon", "Le côlon appartient à la partie basse du trajet digestif."],
          ["La vésicule biliaire", "Elle stocke la bile et n’est pas ce conduit."],
          ["Le péritoine", "Il protège les viscères mais ne conduit pas les aliments."],
        ],
        ["K-DEA-P07-005"],
        FB(
          "La réponse localise le conduit concerné sans déterminer la cause.",
          "Associer immédiatement la sensation à un diagnostic n’est pas demandé.",
          "Décrire le trajet œsophagien quand la zone est entre pharynx et estomac.",
          "Transmettre localisation, début, intensité et signes associés.",
          null,
          "Toute gêne doit rester intégrée au bilan complet du patient.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quelles affirmations correspondent à l’œsophage dans le support ?",
        [
          ["Il mesure environ 25 cm", "Cette longueur est explicitement donnée."],
          ["Il sert au passage des aliments", "C’est son rôle général décrit."],
        ],
        [
          ["Il stocke la bile", "Cette fonction appartient à la vésicule biliaire."],
          [
            "Il est le principal lieu d’absorption",
            "L’absorption intestinale concerne l’intestin grêle.",
          ],
        ],
        ["K-DEA-P07-005"],
        FB(
          "Les deux propositions exactes décrivent sa dimension et sa fonction.",
          "Lui attribuer une sécrétion ou une absorption confond les organes.",
          "Œsophage : tube de passage d’environ 25 cm.",
          "Distinguer conduit et organe de transformation.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quelle différence entre pharynx et œsophage est correctement formulée ?",
        [
          "Le pharynx est un carrefour aérodigestif, l’œsophage conduit les aliments vers l’estomac",
          "La formulation distingue leur position et leur rôle général.",
        ],
        [
          [
            "Le pharynx stocke la bile, l’œsophage produit l’insuline",
            "Ces fonctions appartiennent à d’autres organes.",
          ],
          [
            "Le pharynx absorbe les nutriments, l’œsophage évacue les selles",
            "Ces étapes se déroulent plus loin dans le trajet.",
          ],
          [
            "Le pharynx est le pylore, l’œsophage est le cardia",
            "Cardia et pylore appartiennent à l’estomac.",
          ],
        ],
        ["K-DEA-P07-005"],
        FB(
          "La réponse respecte les descriptions distinctes des deux structures.",
          "Mélanger des fonctions digestives abdominales crée une association anatomique fausse.",
          "Pharynx : carrefour ; œsophage : conduit.",
          "Préciser la structure dans une transmission plutôt que dire seulement « gorge ».",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p07-l03",
    title: "L’estomac",
    pages: "39",
    section: "Appareil digestif - estomac",
    objectives: [
      "Décrire les principaux repères de l’estomac.",
      "Distinguer cardia et pylore.",
      "Identifier les fonctions générales décrites.",
    ],
    competencyIds: COMPOSITION,
    questions: [
      MCQ(
        "Quelle description générale de l’estomac reprend le support ?",
        ["Une poche en J d’environ 2 litres", "La forme et la capacité sont celles indiquées."],
        [
          ["Un tube de 25 cm", "Cette description correspond à l’œsophage."],
          ["Un tube de 1,5 mètre", "Cette longueur est donnée pour le côlon."],
          ["Un double feuillet protecteur", "Cette description correspond au péritoine."],
        ],
        ["K-DEA-P07-006"],
        FB(
          "La forme en J et la capacité de 2 litres sont explicitement citées.",
          "Les longueurs des autres organes sont des distracteurs proches.",
          "Estomac : poche en J, environ 2 litres.",
          "Utiliser ces repères pour identifier l’organe dans un schéma.",
        ),
      ),
      TF(
        "Le cardia se situe à l’entrée de l’estomac et le pylore à sa sortie.",
        true,
        ["K-DEA-P07-006"],
        FB(
          "Le support place les deux sphincters aux extrémités correspondantes.",
          "Les inverser est une erreur anatomique fréquente.",
          "Cardia entre, pylore sort.",
          "Nommer le bon repère lors d’une description du trajet.",
          "C comme cardia et commencement ; P comme pylore et poursuite.",
        ),
        "La localisation des deux sphincters est correcte.",
        "Faux serait incorrect : cardia et pylore encadrent bien l’estomac dans cet ordre.",
      ),
      MATCH(
        "Associe chaque élément de l’estomac à sa description.",
        [
          ["Cardia", "Entrée de l’estomac", "Il reçoit le contenu venant de l’œsophage."],
          ["Pylore", "Sortie de l’estomac", "Il ouvre vers l’intestin."],
          ["Muscles lisses", "Brassage et malaxage", "Ils participent aux mouvements de la paroi."],
          [
            "Glandes gastriques",
            "Sécrétion de suc gastrique",
            "Elles produisent le suc décrit comme très acide.",
          ],
        ],
        ["K-DEA-P07-006"],
        FB(
          "Les associations distinguent repères, muscles et glandes.",
          "Associer le pylore à l’entrée inverse le trajet digestif.",
          "Cardia, paroi gastrique, puis pylore.",
          "Décrire la structure concernée avec son rôle général.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le passage du contenu à travers l’estomac.",
        [
          ["Entrée par le cardia", "Le cardia reçoit le contenu de l’œsophage."],
          ["Brassage et malaxage", "Les muscles lisses participent à ces mouvements."],
          ["Imprégnation par les sucs", "Le suc gastrique agit pendant la phase gastrique."],
          ["Sortie par le pylore", "Le pylore précède l’intestin."],
        ],
        ["K-DEA-P07-006"],
        FB(
          "La séquence suit l’entrée, la transformation gastrique puis la sortie.",
          "Placer le pylore avant le cardia inverse les extrémités.",
          "Cardia, brassage, sucs, pylore.",
          "Reconstituer le trajet sans confondre les sphincters.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : le suc gastrique très acide agit notamment sur les ______.",
        ["protides", "Le support relie le suc gastrique aux protides."],
        [
          ["gaz expirés", "Ils appartiennent au fonctionnement respiratoire."],
          ["os longs", "Ils relèvent du système locomoteur."],
          ["urines", "Elles appartiennent au système urinaire."],
        ],
        ["K-DEA-P07-006"],
        FB(
          "Le terme reprend la cible indiquée pour le suc gastrique.",
          "Choisir une fonction d’un autre système sort du périmètre digestif.",
          "Suc gastrique : très acide, action sur les protides.",
          "Distinguer l’action des différentes sécrétions digestives.",
        ),
      ),
      CLINICAL(
        "Un schéma de bilan montre une structure en J entre l’œsophage et l’intestin. Quelle identification est correcte ?",
        ["L’estomac", "Sa forme et sa position correspondent à la description du support."],
        [
          [
            "Le côlon",
            "Le côlon vient après l’intestin grêle et n’est pas décrit comme une poche en J.",
          ],
          ["La vésicule biliaire", "Elle est un petit sac de stockage de la bile."],
          ["Le pharynx", "Le pharynx se situe dans la région de la gorge."],
        ],
        ["K-DEA-P07-006"],
        FB(
          "La forme en J et la position entre œsophage et intestin identifient l’estomac.",
          "Se fier à un seul mot comme « poche » peut faire choisir la vésicule biliaire.",
          "Croiser forme, position et trajet.",
          "Localiser correctement une région digestive dans un bilan.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quelles actions générales sont décrites dans l’estomac ?",
        [
          ["Le brassage", "Il est assuré par les mouvements de la paroi."],
          ["Le malaxage", "Il participe au mélange du contenu."],
          ["L’imprégnation par les sucs", "Le contenu est mis en contact avec le suc gastrique."],
          ["L’expulsion vers l’intestin", "Elle suit la phase gastrique."],
        ],
        [
          ["Le stockage de la bile", "Cette fonction appartient à la vésicule biliaire."],
          [
            "L’absorption des nutriments vers la lymphe",
            "Elle est décrite au niveau de l’intestin grêle.",
          ],
        ],
        ["K-DEA-P07-006"],
        FB(
          "Les quatre actions correspondent au fonctionnement gastrique décrit.",
          "Ajouter stockage de bile ou absorption confond les organes.",
          "L’estomac mélange, imprègne puis expulse vers l’intestin.",
          "Distinguer rôle gastrique et rôle intestinal.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quel organe reçoit les aliments après l’œsophage et avant l’intestin grêle ?",
        ["L’estomac", "Il occupe cette position dans le trajet digestif."],
        [
          ["Le foie", "Le foie sécrète la bile mais n’est pas traversé par les aliments."],
          ["Le pancréas", "Le pancréas sécrète un suc vers le duodénum."],
          [
            "Le péritoine",
            "Il enveloppe la cavité abdominale sans constituer un conduit alimentaire.",
          ],
        ],
        ["K-DEA-P07-006"],
        FB(
          "L’estomac se situe directement entre ces deux étapes.",
          "Confondre organe traversé et glande annexe est une erreur courante.",
          "Œsophage, estomac, intestin grêle.",
          "Situer la plainte dans la bonne portion du trajet.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p07-l04",
    title: "Le foie et le pancréas",
    pages: "39, 40",
    section: "Appareil digestif - glandes digestives, foie, vésicule biliaire et pancréas",
    objectives: [
      "Distinguer les rôles du foie, de la vésicule biliaire et du pancréas.",
      "Relier leurs sécrétions au duodénum.",
      "Éviter les confusions entre production et stockage.",
    ],
    competencyIds: ORGAN,
    questions: [
      MCQ(
        "Quel organe sécrète la bile selon le support ?",
        ["Le foie", "Le foie est la glande digestive qui sécrète la bile."],
        [
          ["La vésicule biliaire", "Elle stocke la bile mais ne la fabrique pas."],
          ["Le pancréas", "Il sécrète le suc pancréatique et fabrique l’insuline."],
          ["L’estomac", "Il sécrète le suc gastrique."],
        ],
        ["K-DEA-P07-008"],
        FB(
          "Le support attribue explicitement la sécrétion de bile au foie.",
          "Confondre foie et vésicule revient à confondre production et stockage.",
          "Foie produit la bile ; vésicule la stocke.",
          "Employer le bon organe lors d’une description anatomique.",
          "Foie fabrique, vésicule veille sur la réserve.",
        ),
      ),
      TF(
        "La vésicule biliaire emmagasine la bile.",
        true,
        ["K-DEA-P07-009"],
        FB(
          "Cette fonction de stockage est celle décrite dans le support.",
          "Lui attribuer la fabrication de bile méconnaît le rôle du foie.",
          "Vésicule biliaire : stockage de la bile.",
          "Distinguer organe producteur et réservoir.",
        ),
        "La proposition correspond au rôle de la vésicule biliaire.",
        "Faux serait incorrect : la vésicule emmagasine bien la bile.",
      ),
      MATCH(
        "Associe chaque structure à la fonction citée.",
        [
          ["Foie", "Sécrète la bile", "Cette sécrétion est attribuée au foie."],
          ["Vésicule biliaire", "Emmagasine la bile", "Elle assure le stockage."],
          ["Pancréas", "Sécrète le suc pancréatique", "Cette sécrétion rejoint le duodénum."],
          [
            "Duodénum",
            "Reçoit les canaux biliaire et pancréatique",
            "Il est la première partie de l’intestin grêle.",
          ],
        ],
        ["K-DEA-P07-007", "K-DEA-P07-008", "K-DEA-P07-009", "K-DEA-P07-010"],
        FB(
          "Les associations relient glandes, réservoir et lieu d’arrivée des canaux.",
          "Attribuer toutes les sécrétions au même organe efface leurs rôles distincts.",
          "Foie-bile, vésicule-stockage, pancréas-suc, duodénum-réception.",
          "Identifier la structure exacte sur un schéma digestif.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le parcours simplifié de la bile décrit par le support.",
        [
          ["Sécrétion par le foie", "Le foie produit la bile."],
          ["Stockage dans la vésicule biliaire", "La vésicule l’emmagasine."],
          ["Passage par le canal biliaire", "Le canal provient de la vésicule."],
          ["Arrivée dans le duodénum", "Le duodénum reçoit cette sécrétion."],
        ],
        ["K-DEA-P07-007", "K-DEA-P07-008", "K-DEA-P07-009"],
        FB(
          "La séquence distingue production, stockage et arrivée intestinale.",
          "Commencer par le duodénum ou le pancréas inverse le parcours retenu.",
          "Foie, vésicule, canal, duodénum.",
          "Reconstituer le trajet d’une sécrétion digestive.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : le ______ sécrète le suc pancréatique et fabrique l’insuline.",
        ["pancréas", "Les deux productions sont attribuées au pancréas."],
        [
          ["foie", "Le foie sécrète la bile."],
          ["côlon", "Le côlon reçoit les éléments non absorbés."],
          ["œsophage", "L’œsophage conduit les aliments vers l’estomac."],
        ],
        ["K-DEA-P07-010"],
        FB(
          "Le pancréas est le seul organe auquel le support attribue ces deux productions.",
          "Choisir le foie confond bile et suc pancréatique.",
          "Pancréas : suc pancréatique et insuline.",
          "Distinguer les glandes digestives lors d’une transmission.",
        ),
      ),
      CLINICAL(
        "Sur un schéma, l’apprenant doit distinguer l’organe qui produit la bile du petit sac qui la stocke. Quelle paire est correcte ?",
        [
          "Foie : production ; vésicule biliaire : stockage",
          "La paire respecte les rôles décrits.",
        ],
        [
          ["Vésicule biliaire : production ; foie : stockage", "Les rôles sont inversés."],
          [
            "Pancréas : production de bile ; estomac : stockage",
            "Aucun de ces rôles ne correspond au support.",
          ],
          [
            "Côlon : production ; œsophage : stockage",
            "Ces organes ne produisent ni ne stockent la bile.",
          ],
        ],
        ["K-DEA-P07-008", "K-DEA-P07-009"],
        FB(
          "La réponse distingue précisément le foie et la vésicule biliaire.",
          "Leur proximité anatomique peut conduire à inverser leurs fonctions.",
          "Production par le foie, stockage dans la vésicule.",
          "Vérifier fonction et localisation avant de nommer une structure.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quelles productions sont attribuées au pancréas dans le support ?",
        [
          ["Le suc pancréatique", "Il participe à la digestion dans l’intestin grêle."],
          ["L’insuline", "Le support cite également sa fabrication."],
        ],
        [
          ["La bile", "Elle est sécrétée par le foie."],
          ["La salive", "Elle est associée aux glandes salivaires."],
        ],
        ["K-DEA-P07-010"],
        FB(
          "Les deux productions sont explicitement rattachées au pancréas.",
          "Bile et salive sont d’autres sécrétions digestives.",
          "Pancréas : suc pancréatique et insuline.",
          "Ne pas réduire le pancréas à une seule fonction.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Où débouchent les canaux provenant de la vésicule biliaire et du pancréas ?",
        [
          "Dans le duodénum",
          "Le duodénum est la première partie de l’intestin grêle où arrivent ces canaux.",
        ],
        [
          ["Dans l’œsophage", "L’œsophage est situé avant l’estomac."],
          ["Dans le cardia", "Le cardia est l’entrée de l’estomac."],
          ["Dans le côlon", "Le côlon vient après l’intestin grêle."],
        ],
        ["K-DEA-P07-007", "K-DEA-P07-009", "K-DEA-P07-010"],
        FB(
          "Le duodénum reçoit les sécrétions biliaire et pancréatique.",
          "Choisir un autre segment du trajet confond la chronologie digestive.",
          "Duodénum : arrivée des canaux biliaire et pancréatique.",
          "Relier les glandes annexes à leur lieu d’action digestif.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p07-l05",
    title: "L’intestin grêle",
    pages: "39, 41",
    section: "Appareil digestif - intestin grêle, duodénum et absorption",
    objectives: [
      "Décrire l’intestin grêle et sa première partie.",
      "Comprendre l’arrivée des sécrétions digestives.",
      "Distinguer digestion et absorption intestinale.",
    ],
    competencyIds: ORGAN,
    questions: [
      MCQ(
        "Quelle description correspond à l’intestin grêle dans le support ?",
        [
          "Un tube d’environ 8 mètres replié en anses",
          "La longueur et la disposition sont explicitement indiquées.",
        ],
        [
          ["Une poche en J d’environ 2 litres", "Cette description correspond à l’estomac."],
          ["Un tube d’environ 25 cm", "Cette description correspond à l’œsophage."],
          ["Un tube d’environ 1,5 mètre", "Cette longueur est donnée pour le côlon."],
        ],
        ["K-DEA-P07-007"],
        FB(
          "Le support décrit l’intestin grêle comme un long tube replié en anses.",
          "Les dimensions des autres organes digestifs peuvent être confondues.",
          "Intestin grêle : environ 8 mètres, replié en anses.",
          "Identifier l’organe à partir de sa forme et de sa position.",
        ),
      ),
      TF(
        "Le duodénum est la première partie de l’intestin grêle.",
        true,
        ["K-DEA-P07-007"],
        FB(
          "Le support définit explicitement cette relation anatomique.",
          "Confondre duodénum et côlon déplace une structure du début vers la fin du trajet intestinal.",
          "Duodénum : début de l’intestin grêle.",
          "Situer correctement l’arrivée des sécrétions biliaire et pancréatique.",
        ),
        "La proposition correspond à la description anatomique du support.",
        "Faux serait incorrect : le duodénum ouvre bien l’intestin grêle.",
      ),
      MATCH(
        "Associe chaque notion intestinale à sa description.",
        [
          [
            "Intestin grêle",
            "Tube replié en anses",
            "Il mesure environ 8 mètres selon le support.",
          ],
          [
            "Duodénum",
            "Première partie de l’intestin grêle",
            "Il reçoit les canaux biliaire et pancréatique.",
          ],
          [
            "Absorption intestinale",
            "Passage vers le sang ou la lymphe",
            "Elle concerne les nutriments.",
          ],
          [
            "Paroi intestinale",
            "Grande surface et faible épaisseur",
            "Ces propriétés facilitent le passage des nutriments.",
          ],
        ],
        ["K-DEA-P07-007", "K-DEA-P07-013"],
        FB(
          "Les associations relient structure, première portion et fonction d’absorption.",
          "Confondre digestion et absorption conduit à associer l’enzyme au passage dans le sang.",
          "L’intestin grêle transforme puis permet l’absorption des nutriments.",
          "Distinguer étape chimique et passage vers les milieux de transport.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le trajet autour de l’intestin grêle.",
        [
          ["Sortie de l’estomac par le pylore", "Le pylore précède l’intestin."],
          ["Entrée dans le duodénum", "Le duodénum est la première partie."],
          ["Progression dans l’intestin grêle", "Le tube se poursuit en anses."],
          ["Arrivée dans le gros intestin", "Le contenu non absorbé poursuit son trajet."],
        ],
        ["K-DEA-P07-006", "K-DEA-P07-007", "K-DEA-P07-011"],
        FB(
          "L’ordre suit la continuité anatomique de l’estomac vers le gros intestin.",
          "Placer le gros intestin avant le duodénum inverse la progression.",
          "Pylore, duodénum, intestin grêle, gros intestin.",
          "Reconstituer le trajet pour localiser une région digestive.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : le passage des nutriments vers le sang ou la lymphe est l’______ intestinale.",
        ["absorption", "C’est le terme utilisé pour ce passage."],
        [
          ["expiration", "Ce terme appartient à la ventilation."],
          [
            "immobilisation",
            "Ce terme appartient à la prise en charge locomotrice ou traumatique.",
          ],
          ["mastication", "La mastication se déroule dans la bouche."],
        ],
        ["K-DEA-P07-013"],
        FB(
          "L’absorption désigne le passage des nutriments à travers la paroi intestinale.",
          "La digestion transforme ; l’absorption fait passer vers le sang ou la lymphe.",
          "Absorption = passage des nutriments.",
          "Employer le terme exact dans une explication du fonctionnement digestif.",
        ),
      ),
      CLINICAL(
        "Dans une explication à un apprenant, quelle formulation décrit correctement le lieu de passage des nutriments vers le sang ou la lymphe ?",
        [
          "À travers la paroi de l’intestin grêle",
          "Le support situe l’absorption intestinale à ce niveau.",
        ],
        [
          [
            "À travers la paroi de l’œsophage",
            "L’œsophage est un conduit de passage des aliments.",
          ],
          ["À travers la vésicule biliaire", "La vésicule stocke la bile."],
          [
            "À travers le péritoine uniquement",
            "Le péritoine protège les viscères et n’assure pas cette absorption.",
          ],
        ],
        ["K-DEA-P07-013"],
        FB(
          "La grande surface et la faible épaisseur de la paroi de l’intestin grêle permettent ce passage.",
          "Confondre un conduit avec une surface d’absorption est une erreur de fonction.",
          "Absorption des nutriments : paroi de l’intestin grêle vers sang ou lymphe.",
          "Expliquer le mécanisme sans extrapoler vers un diagnostic.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quelles caractéristiques favorisent l’absorption intestinale selon le support ?",
        [
          ["Une surface importante", "Elle augmente la zone de passage disponible."],
          ["Une paroi de faible épaisseur", "Elle facilite le passage des nutriments."],
        ],
        [
          ["Une paroi totalement imperméable", "Elle empêcherait le passage décrit."],
          [
            "Une absence complète de circulation",
            "Les nutriments passent vers le sang ou la lymphe.",
          ],
        ],
        ["K-DEA-P07-013"],
        FB(
          "Les deux propriétés sont citées comme facilitant l’absorption.",
          "Choisir imperméabilité ou absence de circulation contredit le mécanisme.",
          "Grande surface et paroi fine favorisent le passage.",
          "Relier une structure anatomique à sa fonction générale.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quel énoncé distingue correctement digestion et absorption ?",
        [
          "La digestion transforme les aliments ; l’absorption fait passer les nutriments vers le sang ou la lymphe",
          "Les deux étapes sont différentes et complémentaires.",
        ],
        [
          [
            "La digestion stocke la bile ; l’absorption produit l’insuline",
            "Ces fonctions appartiennent à la vésicule et au pancréas.",
          ],
          [
            "La digestion conduit l’air ; l’absorption l’expire",
            "Cet énoncé concerne le système respiratoire.",
          ],
          [
            "La digestion et l’absorption désignent exactement la même étape",
            "Le support les distingue clairement.",
          ],
        ],
        ["K-DEA-P07-013"],
        FB(
          "La réponse sépare transformation des aliments et passage des nutriments.",
          "Employer les deux termes comme synonymes masque la succession des étapes.",
          "Digérer transforme ; absorber fait passer.",
          "Expliquer le fonctionnement digestif avec un vocabulaire précis.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p07-l06",
    title: "Le côlon",
    pages: "40, 41",
    section: "Appareil digestif - côlon, gros intestin et transit",
    objectives: [
      "Décrire la place générale du côlon.",
      "Identifier le devenir des éléments non absorbés.",
      "Distinguer intestin grêle et gros intestin.",
    ],
    competencyIds: ORGAN,
    questions: [
      MCQ(
        "Quelle longueur approximative le support attribue-t-il au côlon ?",
        ["1,5 mètre", "Cette longueur est donnée dans la description du côlon."],
        [
          ["25 centimètres", "Cette longueur est donnée pour l’œsophage."],
          ["8 mètres", "Cette longueur est donnée pour l’intestin grêle."],
          ["2 litres", "Il s’agit d’une capacité attribuée à l’estomac."],
        ],
        ["K-DEA-P07-011"],
        FB(
          "Le côlon est décrit comme un tube d’environ 1,5 mètre.",
          "Les mesures des autres organes digestifs sont facilement interverties.",
          "Côlon : environ 1,5 mètre.",
          "Reconnaître l’organe sur un schéma anatomique.",
        ),
      ),
      TF(
        "Les aliments non absorbés deviennent des matières fécales qui transitent dans le gros intestin avant leur évacuation.",
        true,
        ["K-DEA-P07-011", "K-DEA-P07-013"],
        FB(
          "La proposition reprend le devenir des éléments non absorbés décrit page 41.",
          "Les confondre avec les nutriments absorbés inverse leur destination.",
          "Absorbé vers sang ou lymphe ; non absorbé vers le gros intestin.",
          "Décrire clairement le transit lors d’un bilan.",
        ),
        "La progression vers le gros intestin puis l’évacuation est correcte.",
        "Faux serait incorrect : le support décrit explicitement ce transit.",
      ),
      MATCH(
        "Associe chaque repère du gros intestin à la description correspondante.",
        [
          ["Côlon", "Tube d’environ 1,5 mètre", "La mesure est donnée par le support."],
          ["Appendice", "Porté par le cul-de-sac initial", "Le début du côlon est décrit ainsi."],
          [
            "Matières fécales",
            "Éléments non absorbés",
            "Elles poursuivent leur transit dans le gros intestin.",
          ],
          ["Évacuation", "Fin du trajet digestif", "Elle suit le transit dans le gros intestin."],
        ],
        ["K-DEA-P07-011"],
        FB(
          "Les associations relient le côlon, son repère initial et le devenir des résidus.",
          "Placer l’appendice dans l’œsophage ou l’estomac rompt la topographie.",
          "Côlon : gros intestin, résidus, évacuation.",
          "Employer des repères simples et exacts dans une transmission.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le devenir des éléments non absorbés.",
        [
          [
            "Fin du passage dans l’intestin grêle",
            "Les nutriments absorbables ont traversé la paroi.",
          ],
          ["Arrivée dans le gros intestin", "Les éléments non absorbés poursuivent le trajet."],
          [
            "Constitution des matières fécales",
            "Le support nomme ainsi les aliments non absorbés.",
          ],
          ["Évacuation", "Elle termine le transit digestif."],
        ],
        ["K-DEA-P07-011", "K-DEA-P07-013"],
        FB(
          "La séquence suit la progression des résidus après l’intestin grêle.",
          "Placer l’évacuation avant le gros intestin inverse le trajet.",
          "Intestin grêle, gros intestin, matières fécales, évacuation.",
          "Décrire l’étape du transit sans interprétation diagnostique.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : les éléments non absorbés transitent dans le ______ intestin.",
        ["gros", "Le gros intestin reçoit ces éléments."],
        [
          ["petit", "Le support emploie l’expression intestin grêle, pas petit intestin ici."],
          ["respiratoire", "Ce terme ne décrit pas une portion intestinale."],
          ["urinaire", "Ce terme appartient à un autre système."],
        ],
        ["K-DEA-P07-011", "K-DEA-P07-013"],
        FB(
          "Le gros intestin est l’étape suivante pour les éléments non absorbés.",
          "Confondre intestin grêle et gros intestin mélange absorption et transit terminal.",
          "Non absorbé : gros intestin.",
          "Situer correctement une information sur le transit.",
        ),
      ),
      CLINICAL(
        "Lors d’un bilan, le patient rapporte une modification récente du transit. Quelle information est la plus factuelle à transmettre ?",
        [
          "La nature observée du transit, sa fréquence, son début et la présence éventuelle de sang rapportée ou observée",
          "Cette formulation décrit des faits et leur évolution sans poser de diagnostic.",
        ],
        [
          [
            "Un diagnostic certain de maladie du côlon",
            "Les seules informations de transit ne suffisent pas à conclure.",
          ],
          ["Une atteinte respiratoire confirmée", "Le transit concerne le système digestif."],
          [
            "Aucune information puisque le transit n’est jamais utile",
            "Le support cite ces variations comme éléments de surveillance.",
          ],
        ],
        ["K-DEA-P07-011"],
        FB(
          "Une transmission utile décrit ce qui est observé, son début et son évolution.",
          "Nommer une maladie sans éléments suffisants transforme l’observation en diagnostic.",
          "Transit : décrire, dater, quantifier, signaler les anomalies.",
          "Transmettre au régulateur les faits pertinents et les signes associés.",
          null,
          "La présence de sang ou une altération clinique doit être signalée rapidement.",
        ),
        { difficulty: "medium", pages: "41", section: "Digestion - surveillance du transit" },
      ),
      MULTI(
        "Quelles variations du transit le support cite-t-il comme pathologiques ou importantes à surveiller ?",
        [
          ["La diarrhée", "Elle est citée parmi les variations pathologiques."],
          ["La constipation", "Elle est citée parmi les variations pathologiques."],
          ["La présence de sang dans les selles", "Elle est citée comme anomalie importante."],
          ["L’évacuation des gaz", "Elle fait partie de la surveillance du transit décrite."],
        ],
        [
          ["La couleur de l’iris", "Elle ne décrit pas le transit digestif."],
          [
            "La fréquence des clignements",
            "Elle n’appartient pas à la surveillance digestive citée.",
          ],
        ],
        ["K-DEA-P07-011"],
        FB(
          "Les quatre éléments figurent dans le passage consacré à la surveillance du transit.",
          "Ajouter des observations sans rapport avec la fonction digestive dilue le bilan.",
          "Transit : selles, sang éventuel et gaz font partie des éléments à décrire.",
          "Recueillir des informations précises sans poser de diagnostic.",
        ),
        { difficulty: "medium", pages: "41", section: "Digestion - surveillance du transit" },
      ),
      MCQ(
        "Quelle distinction entre intestin grêle et gros intestin est correcte ?",
        [
          "L’intestin grêle permet l’absorption des nutriments ; le gros intestin reçoit les éléments non absorbés",
          "La distinction reprend les étapes successives décrites.",
        ],
        [
          [
            "Le gros intestin reçoit la bile avant l’estomac",
            "La bile arrive dans le duodénum après l’estomac.",
          ],
          [
            "L’intestin grêle est le sphincter d’entrée de l’estomac",
            "Le cardia est ce sphincter.",
          ],
          [
            "Les deux termes désignent exactement le même organe",
            "Ils désignent deux portions différentes du trajet.",
          ],
        ],
        ["K-DEA-P07-007", "K-DEA-P07-011", "K-DEA-P07-013"],
        FB(
          "La réponse distingue absorption et transit des résidus.",
          "Les confondre empêche de suivre le devenir des nutriments.",
          "Grêle : absorption ; gros : résidus non absorbés.",
          "Situer une plainte ou une fonction dans la bonne portion intestinale.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p07-l07",
    title: "La digestion complète",
    pages: "39-41",
    section: "Appareil digestif - trajet, digestion, nutriments et absorption",
    objectives: [
      "Reconstituer le trajet complet des aliments.",
      "Définir digestion et nutriments.",
      "Distinguer absorption et évacuation.",
    ],
    competencyIds: SYSTEM,
    questions: [
      MCQ(
        "Comment le support définit-il la digestion ?",
        [
          "La transformation de certains aliments en petites molécules grâce aux enzymes des sucs digestifs",
          "Cette définition reprend le mécanisme et le lieu général décrits.",
        ],
        [
          [
            "Le simple passage des aliments dans l’œsophage",
            "Le passage ne suffit pas à définir la transformation digestive.",
          ],
          [
            "Le stockage de la bile dans le foie",
            "La bile est stockée dans la vésicule et ce n’est pas la définition de la digestion.",
          ],
          [
            "L’évacuation immédiate de tous les aliments",
            "L’évacuation concerne les éléments non absorbés à la fin du trajet.",
          ],
        ],
        ["K-DEA-P07-013"],
        FB(
          "La digestion est une transformation enzymatique dans le tube digestif.",
          "La confondre avec transport, stockage ou évacuation réduit le mécanisme à une seule étape.",
          "Digestion = transformation par les enzymes digestives.",
          "Expliquer le mécanisme avec des termes simples et exacts.",
        ),
      ),
      TF(
        "Les nutriments sont des molécules utilisables par l’organisme.",
        true,
        ["K-DEA-P07-013"],
        FB(
          "Cette définition est donnée directement dans le support.",
          "Les confondre avec les matières fécales inverse leur devenir.",
          "Nutriments : molécules utilisables par l’organisme.",
          "Distinguer nutriment absorbé et résidu non absorbé.",
        ),
        "La définition correspond au texte source.",
        "Faux serait incorrect : le support emploie exactement cette fonction générale.",
      ),
      MATCH(
        "Associe chaque notion à sa définition fonctionnelle.",
        [
          [
            "Digestion",
            "Transformation en petites molécules",
            "Elle utilise des enzymes des sucs digestifs.",
          ],
          ["Nutriment", "Molécule utilisable par l’organisme", "Il peut être absorbé."],
          [
            "Absorption intestinale",
            "Passage vers le sang ou la lymphe",
            "Elle se fait à travers la paroi de l’intestin grêle.",
          ],
          [
            "Matière fécale",
            "Élément non absorbé",
            "Elle poursuit son transit dans le gros intestin.",
          ],
        ],
        ["K-DEA-P07-011", "K-DEA-P07-013"],
        FB(
          "Les associations suivent transformation, utilisation, passage et élimination.",
          "Confondre nutriment et résidu inverse la logique digestive.",
          "Transformer, absorber, puis évacuer ce qui ne l’est pas.",
          "Employer ces termes dans une explication structurée.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le trajet anatomique complet d’un aliment.",
        [
          ["Bouche", "La préparation initiale commence ici."],
          ["Pharynx", "Il suit la déglutition."],
          ["Œsophage", "Il conduit vers l’estomac."],
          ["Estomac", "Il brasse et imprègne le contenu."],
          ["Intestin grêle", "La digestion se poursuit et les nutriments sont absorbés."],
          ["Gros intestin", "Il reçoit les éléments non absorbés."],
          ["Évacuation", "Elle termine le trajet des résidus."],
        ],
        [
          "K-DEA-P07-001",
          "K-DEA-P07-002",
          "K-DEA-P07-005",
          "K-DEA-P07-006",
          "K-DEA-P07-007",
          "K-DEA-P07-011",
        ],
        FB(
          "L’ordre reprend la continuité du tube digestif.",
          "Intercaler le foie ou le pancréas dans le conduit confond organes annexes et organes traversés.",
          "Bouche, pharynx, œsophage, estomac, grêle, gros intestin, évacuation.",
          "Suivre ce trajet pour situer précisément une plainte.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : la digestion a lieu dans le tube digestif grâce à des ______ contenues dans les sucs digestifs.",
        ["enzymes", "Les enzymes permettent la transformation décrite."],
        [
          ["vertèbres", "Elles appartiennent au squelette."],
          ["alvéoles", "Elles appartiennent à l’appareil respiratoire."],
          ["valves cardiaques", "Elles appartiennent au cœur."],
        ],
        ["K-DEA-P07-013"],
        FB(
          "Les enzymes des sucs digestifs assurent la transformation en petites molécules.",
          "Choisir une structure d’un autre système ne décrit pas le mécanisme chimique.",
          "Enzymes digestives : transformation des aliments.",
          "Différencier agent de transformation et organe traversé.",
        ),
      ),
      CLINICAL(
        "Un patient demande où vont les nutriments après leur passage dans l’intestin grêle. Quelle réponse anatomique est conforme au support ?",
        [
          "Ils passent dans le sang ou dans la lymphe",
          "Le support décrit ces deux voies après l’absorption intestinale.",
        ],
        [
          [
            "Ils retournent tous dans l’œsophage",
            "Le trajet digestif ne revient pas vers l’œsophage.",
          ],
          [
            "Ils sont tous stockés dans la vésicule biliaire",
            "La vésicule stocke la bile, pas les nutriments.",
          ],
          [
            "Ils deviennent tous des matières fécales",
            "Seuls les éléments non absorbés poursuivent ce trajet.",
          ],
        ],
        ["K-DEA-P07-013"],
        FB(
          "L’absorption conduit les nutriments vers le sang ou la lymphe.",
          "Dire que tout devient matière fécale ignore l’étape d’absorption.",
          "Nutriments absorbés : sang ou lymphe.",
          "Expliquer simplement le devenir des nutriments.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quels éléments font partie du trajet réellement parcouru par les aliments ?",
        [
          ["La bouche", "Elle reçoit et prépare les aliments."],
          ["L’œsophage", "Il les conduit vers l’estomac."],
          ["L’estomac", "Il les brasse et les imprègne."],
          ["L’intestin grêle", "La digestion et l’absorption s’y poursuivent."],
          ["Le gros intestin", "Il reçoit les éléments non absorbés."],
        ],
        [
          ["Le foie", "Il sécrète la bile mais les aliments ne le traversent pas."],
          [
            "Le pancréas",
            "Il sécrète un suc vers le duodénum mais n’est pas traversé par les aliments.",
          ],
        ],
        [
          "K-DEA-P07-001",
          "K-DEA-P07-002",
          "K-DEA-P07-005",
          "K-DEA-P07-006",
          "K-DEA-P07-007",
          "K-DEA-P07-011",
        ],
        FB(
          "Les réponses exactes appartiennent au conduit parcouru par les aliments.",
          "Foie et pancréas participent par leurs sécrétions sans être traversés.",
          "Distinguer tube digestif et glandes digestives annexes.",
          "Identifier si une structure est traversée ou si elle agit à distance par une sécrétion.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quelle affirmation décrit correctement le devenir des aliments non absorbés ?",
        [
          "Ils deviennent des matières fécales et transitent dans le gros intestin avant évacuation",
          "Cette succession est explicitement donnée.",
        ],
        [
          ["Ils passent tous dans la lymphe", "Seuls les nutriments absorbés suivent cette voie."],
          [
            "Ils sont stockés dans le pancréas",
            "Le pancréas ne stocke pas les résidus alimentaires.",
          ],
          ["Ils retournent dans la bouche", "Le trajet ne revient pas à son point de départ."],
        ],
        ["K-DEA-P07-011", "K-DEA-P07-013"],
        FB(
          "La réponse suit la fin du trajet digestif des résidus.",
          "Confondre absorbé et non absorbé conduit à choisir le sang ou la lymphe.",
          "Non absorbé : gros intestin puis évacuation.",
          "Distinguer clairement nutriments et résidus.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p07-l08",
    title: "Synthèse",
    pages: "39-41",
    section: "Appareil digestif - synthèse anatomique et fonctionnelle",
    objectives: [
      "Relier chaque organe digestif à son rôle général.",
      "Reconstituer le trajet complet.",
      "Distinguer tube digestif, glandes et enveloppe abdominale.",
    ],
    competencyIds: SYSTEM,
    questions: [
      MCQ(
        "Quelle est la fonction générale de l’appareil digestif donnée par le support ?",
        [
          "Transformer les aliments absorbés en éléments assimilables par l’organisme",
          "Cette phrase résume le rôle général présenté.",
        ],
        [
          [
            "Transporter uniquement l’oxygène",
            "Cette fonction appartient au système respiratoire et circulatoire.",
          ],
          [
            "Produire les mouvements volontaires",
            "Cette fonction appartient au système locomoteur.",
          ],
          ["Filtrer exclusivement les urines", "Cette fonction appartient au système urinaire."],
        ],
        ["K-DEA-P07-001"],
        FB(
          "La réponse reprend l’objectif fonctionnel d’assimilation présenté page 39.",
          "Choisir une fonction d’un autre système confond les domaines anatomiques.",
          "Appareil digestif : transformer pour rendre assimilable.",
          "Présenter la fonction générale avant le détail des organes.",
        ),
      ),
      TF(
        "Le péritoine est un double feuillet protecteur et non une portion du tube digestif parcourue par les aliments.",
        true,
        ["K-DEA-P07-012"],
        FB(
          "Le support décrit le péritoine comme une enveloppe de la cavité abdominale protégeant les viscères.",
          "Le placer dans le trajet alimentaire confond enveloppe et conduit.",
          "Péritoine : enveloppe protectrice des viscères.",
          "Employer ce terme pour décrire une structure abdominale, pas une étape du transit.",
        ),
        "La proposition distingue correctement enveloppe et tube digestif.",
        "Faux serait incorrect : le péritoine protège les viscères sans conduire les aliments.",
      ),
      MATCH(
        "Associe chaque organe à son rôle général.",
        [
          [
            "Bouche",
            "Mastication, salivation et déglutition",
            "Ces phénomènes ouvrent le trajet digestif.",
          ],
          [
            "Estomac",
            "Brassage et imprégnation par le suc gastrique",
            "Ces actions sont décrites dans la phase gastrique.",
          ],
          ["Foie", "Sécrétion de bile", "La bile se déverse dans l’intestin grêle."],
          [
            "Intestin grêle",
            "Digestion poursuivie et absorption des nutriments",
            "Sa paroi permet le passage vers sang ou lymphe.",
          ],
        ],
        ["K-DEA-P07-002", "K-DEA-P07-006", "K-DEA-P07-008", "K-DEA-P07-013"],
        FB(
          "Chaque organe est relié à la fonction décrite dans le support.",
          "Attribuer la bile à l’estomac ou l’absorption à la bouche confond les étapes.",
          "Chaque organe intervient à une étape précise.",
          "Relier localisation et rôle pour structurer une transmission.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Reconstitue le trajet digestif sans inclure les glandes annexes.",
        [
          ["Bouche", "Première étape du trajet."],
          ["Pharynx", "Carrefour qui suit la bouche."],
          ["Œsophage", "Conduit vers l’estomac."],
          ["Estomac", "Poche de brassage et d’imprégnation."],
          ["Intestin grêle", "Poursuite de la digestion et absorption."],
          ["Gros intestin", "Transit des éléments non absorbés."],
          ["Évacuation", "Fin du trajet des résidus."],
        ],
        [
          "K-DEA-P07-001",
          "K-DEA-P07-002",
          "K-DEA-P07-005",
          "K-DEA-P07-006",
          "K-DEA-P07-007",
          "K-DEA-P07-011",
        ],
        FB(
          "L’ordre conserve uniquement les segments parcourus par les aliments.",
          "Ajouter foie, vésicule ou pancréas dans la chaîne confond conduit et organes annexes.",
          "Le tube digestif forme un trajet continu.",
          "Utiliser ce fil anatomique pour localiser une plainte.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : la bile est sécrétée par le foie et emmagasinée dans la ______ biliaire.",
        ["vésicule", "La vésicule biliaire assure le stockage."],
        [
          ["trachée", "La trachée appartient au système respiratoire."],
          ["plèvre", "La plèvre enveloppe les poumons."],
          ["vessie", "La vessie appartient au système urinaire."],
        ],
        ["K-DEA-P07-008", "K-DEA-P07-009"],
        FB(
          "Le foie produit la bile et la vésicule biliaire la stocke.",
          "La proximité sonore entre vésicule et vessie peut provoquer une confusion de système.",
          "Bile : foie puis vésicule biliaire.",
          "Nommer complètement la vésicule biliaire dans une transmission.",
        ),
      ),
      CLINICAL(
        "Un apprenant décrit « un conduit qui traverse le foie puis le pancréas ». Quelle correction anatomique est la plus précise ?",
        [
          "Les aliments traversent le tube digestif ; le foie et le pancréas agissent par leurs sécrétions vers l’intestin grêle",
          "Cette correction distingue trajet alimentaire et glandes annexes.",
        ],
        [
          [
            "Les aliments traversent effectivement le foie et le pancréas",
            "Ces organes ne constituent pas le conduit parcouru par les aliments.",
          ],
          ["Le foie et le pancréas sont deux noms du côlon", "Ce sont des organes distincts."],
          [
            "Le péritoine transporte les aliments entre les deux",
            "Le péritoine est une enveloppe protectrice.",
          ],
        ],
        ["K-DEA-P07-001", "K-DEA-P07-008", "K-DEA-P07-010", "K-DEA-P07-012"],
        FB(
          "La réponse distingue organes traversés et organes qui délivrent des sécrétions.",
          "Un schéma rapproché peut faire croire que tout organe dessiné est traversé.",
          "Tube digestif traversé ; glandes annexes sécrétrices.",
          "Corriger une description anatomique avant de l’utiliser dans un bilan.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quelles structures participent à la digestion par une sécrétion citée dans le support ?",
        [
          ["Les glandes salivaires", "La salive contient une enzyme agissant sur les amidons."],
          ["L’estomac", "Ses glandes sécrètent le suc gastrique."],
          ["Le foie", "Il sécrète la bile."],
          ["Le pancréas", "Il sécrète le suc pancréatique."],
        ],
        [
          [
            "Le péritoine",
            "Il protège les viscères mais n’est pas décrit comme une glande digestive.",
          ],
          ["L’œsophage", "Il est décrit comme un tube de passage."],
        ],
        ["K-DEA-P07-003", "K-DEA-P07-006", "K-DEA-P07-008", "K-DEA-P07-010"],
        FB(
          "Les quatre structures sont reliées à une sécrétion digestive dans le support.",
          "Confondre conduit ou enveloppe avec glande ajoute des fonctions absentes.",
          "Salive, suc gastrique, bile et suc pancréatique participent aux transformations.",
          "Associer chaque sécrétion à son origine correcte.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quelle relation organe-sécrétion est incorrecte ?",
        [
          "Vésicule biliaire — fabrication de la bile",
          "La vésicule stocke la bile ; le foie la sécrète.",
        ],
        [
          ["Foie — bile", "Cette relation est correcte."],
          ["Pancréas — suc pancréatique", "Cette relation est correcte."],
          ["Estomac — suc gastrique", "Cette relation est correcte."],
        ],
        ["K-DEA-P07-006", "K-DEA-P07-008", "K-DEA-P07-009", "K-DEA-P07-010"],
        FB(
          "La vésicule biliaire est un réservoir, pas le site de fabrication de la bile.",
          "Production et stockage sont facilement intervertis.",
          "Foie produit ; vésicule stocke.",
          "Vérifier le verbe associé à chaque organe.",
        ),
        { difficulty: "medium", instruction: "Sélectionne la relation incorrecte." },
      ),
    ],
  },
];

const BOSS = {
  id: "dea-p07-boss",
  title: "Boss — Système digestif",
  pages: "39-41",
  section: "Appareil digestif - synthèse du trajet et des fonctions",
  competencyIds: SYSTEM,
  questions: [
    MCQ(
      "Dans une vue d’ensemble, quel enchaînement fonctionnel décrit le mieux l’appareil digestif ?",
      [
        "Préparer et transformer les aliments, absorber les nutriments, puis évacuer les éléments non absorbés",
        "Cette succession résume les étapes décrites dans le support.",
      ],
      [
        [
          "Absorber tous les aliments dans l’œsophage puis stocker les résidus dans le foie",
          "L’œsophage est un conduit et le foie n’est pas un réservoir de résidus.",
        ],
        [
          "Produire la bile dans la bouche puis l’évacuer par le pancréas",
          "Les organes et les sécrétions sont inversés.",
        ],
        [
          "Transformer les aliments uniquement dans le côlon",
          "La transformation commence dès la bouche et se poursuit avant le côlon.",
        ],
      ],
      ["K-DEA-P07-001", "K-DEA-P07-011", "K-DEA-P07-013"],
      FB(
        "La réponse relie transformation, absorption et évacuation dans leur ordre fonctionnel.",
        "Réduire la digestion à un seul organe fait oublier la continuité du système.",
        "Transformer, absorber, évacuer les résidus.",
        "Présenter un fonctionnement global avant les détails anatomiques.",
      ),
      { difficulty: "medium" },
    ),
    ORDER(
      "Reconstitue le trajet complet d’un aliment dans le tube digestif.",
      [
        ["Bouche", "Préparation initiale."],
        ["Pharynx", "Carrefour aérodigestif."],
        ["Œsophage", "Conduit vers l’estomac."],
        ["Estomac", "Brassage et imprégnation."],
        ["Intestin grêle", "Poursuite de la digestion et absorption."],
        ["Gros intestin", "Transit des éléments non absorbés."],
        ["Évacuation", "Fin du trajet des résidus."],
      ],
      [
        "K-DEA-P07-001",
        "K-DEA-P07-002",
        "K-DEA-P07-005",
        "K-DEA-P07-006",
        "K-DEA-P07-007",
        "K-DEA-P07-011",
      ],
      FB(
        "L’ordre suit les organes réellement traversés par les aliments.",
        "Insérer le foie ou le pancréas dans le conduit confond glandes annexes et tube digestif.",
        "Bouche à gros intestin : un trajet continu.",
        "S’appuyer sur cet ordre pour localiser une plainte digestive.",
      ),
      { difficulty: "medium" },
    ),
    MATCH(
      "Associe chaque structure à son rôle principal dans le support.",
      [
        ["Œsophage", "Passage des aliments", "Il conduit vers l’estomac."],
        ["Estomac", "Brassage et suc gastrique", "Il mélange et imprègne le contenu."],
        ["Foie", "Sécrétion de bile", "La bile rejoint l’intestin grêle."],
        ["Pancréas", "Suc pancréatique et insuline", "Les deux productions sont citées."],
        [
          "Intestin grêle",
          "Absorption des nutriments",
          "Sa paroi permet le passage vers sang ou lymphe.",
        ],
      ],
      ["K-DEA-P07-005", "K-DEA-P07-006", "K-DEA-P07-008", "K-DEA-P07-010", "K-DEA-P07-013"],
      FB(
        "Les associations couvrent conduit, poche, glandes et surface d’absorption.",
        "Attribuer la même fonction à plusieurs organes empêche de comprendre leur complémentarité.",
        "Un organe, un rôle général précis dans le trajet.",
        "Employer la bonne structure dans une transmission anatomique.",
      ),
      { difficulty: "medium" },
    ),
    CLINICAL(
      "Pendant une révision, un apprenant doit nommer la première partie intestinale qui reçoit des canaux venant de la vésicule biliaire et du pancréas. Quelle réponse est attendue ?",
      ["Le duodénum", "Il est la première partie de l’intestin grêle et reçoit ces canaux."],
      [
        ["Le cardia", "Le cardia est l’entrée de l’estomac."],
        ["L’œsophage", "L’œsophage précède l’estomac."],
        ["Le côlon", "Le côlon vient après l’intestin grêle."],
      ],
      ["K-DEA-P07-007", "K-DEA-P07-009", "K-DEA-P07-010"],
      FB(
        "Le duodénum est le point d’arrivée intestinal des canaux cités.",
        "Choisir un repère gastrique ou colique confond la succession anatomique.",
        "Duodénum : début du grêle, arrivée biliaire et pancréatique.",
        "Identifier ce repère sur un schéma avant de décrire le trajet.",
      ),
      { difficulty: "medium" },
    ),
    TF(
      "Le péritoine protège les viscères mais n’est pas parcouru par les aliments.",
      true,
      ["K-DEA-P07-012"],
      FB(
        "Le support le présente comme une enveloppe protectrice de la cavité abdominale.",
        "Le confondre avec le tube digestif lui attribue une fonction de conduit absente.",
        "Péritoine : protection, pas transit.",
        "Distinguer enveloppe abdominale et organes digestifs.",
      ),
      "La fonction protectrice et l’absence de transit sont correctement distinguées.",
      "Faux serait incorrect : le péritoine n’est pas une portion du tube digestif.",
      { difficulty: "medium" },
    ),
    MULTI(
      "Quelles associations entre une structure et une sécrétion sont correctes ?",
      [
        ["Glandes salivaires — salive", "La salive contient une enzyme agissant sur les amidons."],
        ["Estomac — suc gastrique", "Ses glandes sécrètent ce suc très acide."],
        ["Foie — bile", "Le foie sécrète la bile."],
        ["Pancréas — suc pancréatique", "Le pancréas sécrète ce suc."],
      ],
      [
        ["Vésicule biliaire — fabrication de la bile", "La vésicule stocke la bile."],
        ["Œsophage — insuline", "L’insuline est fabriquée par le pancréas."],
      ],
      ["K-DEA-P07-003", "K-DEA-P07-006", "K-DEA-P07-008", "K-DEA-P07-009", "K-DEA-P07-010"],
      FB(
        "Les quatre associations exactes relient chaque sécrétion à son origine.",
        "Production et stockage de la bile restent le piège principal.",
        "Salive, suc gastrique, bile, suc pancréatique : quatre origines distinctes.",
        "Vérifier systématiquement le verbe produire, sécréter ou stocker.",
      ),
      { difficulty: "medium" },
    ),
    FILL(
      "Complète : le passage des nutriments dans le sang ou la lymphe s’appelle l’______ intestinale.",
      [
        "absorption",
        "Le support donne ce terme pour le passage à travers la paroi de l’intestin grêle.",
      ],
      [
        ["évacuation", "Elle concerne la fin du trajet des résidus."],
        ["salivation", "Elle a lieu dans la bouche."],
        ["ventilation", "Elle appartient au système respiratoire."],
      ],
      ["K-DEA-P07-013"],
      FB(
        "L’absorption suit la transformation digestive des nutriments.",
        "La confondre avec évacuation inverse le devenir des éléments absorbés et non absorbés.",
        "Absorption : vers sang ou lymphe.",
        "Employer ce terme lorsque le devenir des nutriments est expliqué.",
      ),
      { difficulty: "medium" },
    ),
    MCQ(
      "Quel énoncé décrit correctement la fin du trajet digestif ?",
      [
        "Les éléments non absorbés deviennent des matières fécales, transitent dans le gros intestin puis sont évacués",
        "Cette succession reprend le texte source.",
      ],
      [
        [
          "Tous les nutriments restent dans le côlon",
          "Les nutriments absorbés passent vers le sang ou la lymphe.",
        ],
        [
          "Le contenu retourne du côlon vers l’estomac",
          "Le trajet ne revient pas en arrière dans cette description.",
        ],
        [
          "Le pancréas évacue les matières fécales",
          "Le pancréas produit des sécrétions, il n’assure pas l’évacuation.",
        ],
      ],
      ["K-DEA-P07-011", "K-DEA-P07-013"],
      FB(
        "La réponse distingue les résidus non absorbés des nutriments absorbés.",
        "Confondre côlon et surface d’absorption conduit à y laisser tous les nutriments.",
        "Non absorbé : gros intestin puis évacuation.",
        "Décrire le transit sans ajouter une cause non établie.",
      ),
      { difficulty: "medium" },
    ),
  ],
};

function buildAnswers(itemId, config) {
  if (config.kind === "true_false") {
    return [
      { id: itemId + "-true", text: "Vrai", explanation: config.trueExplanation },
      { id: itemId + "-false", text: "Faux", explanation: config.falseExplanation },
    ];
  }
  if (config.kind === "matching") {
    return config.options.map((entry, index) => ({
      id: itemId + "-a" + (index + 1),
      text: entry.text,
      match: entry.match,
      explanation: entry.explanation,
    }));
  }
  if (config.kind === "ordering") {
    return config.options.map((entry, index) => ({
      id: itemId + "-a" + (index + 1),
      text: entry.text,
      explanation: entry.explanation,
      sequenceRank: index + 1,
    }));
  }
  return config.options.map((entry, index) => ({
    id: itemId + "-a" + (index + 1),
    text: entry.text,
    explanation: entry.explanation,
  }));
}

function buildItem(lesson, config, index) {
  const id = lesson.id + "-q" + String(index + 1).padStart(2, "0");
  const answers = buildAnswers(id, config);
  let correctAnswer;
  if (config.kind === "true_false") {
    correctAnswer = id + "-" + (config.correct ? "true" : "false");
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
  const sourcePages = config.pages || lesson.pages;
  const sourceSection = config.section || lesson.section;
  const competencyIds = config.competencyIds || lesson.competencyIds;
  const feedback = config.feedback;
  return {
    id,
    type,
    difficulty: config.difficulty || "easy",
    question: config.prompt,
    ...(config.instruction ? { instruction: config.instruction } : {}),
    answers,
    correctAnswer,
    ...(Array.isArray(correctAnswer) ? { correctAnswers: correctAnswer } : {}),
    explanation: feedback.whyCorrect,
    knowledgeIds: config.knowledgeIds,
    sourceDocument: SOURCE_ID,
    sourceSection,
    sourcePages,
    pageStatus: "verified",
    competencyIds,
    lessonId: lesson.id,
    plannedParcoursIds: [PARCOURS_ID],
    pedagogicalFeedback: feedback,
    validationStatus: "to_validate",
    generationSource: "library_extracted_knowledge",
    why_correct: feedback.whyCorrect,
    common_mistake: feedback.commonMistake,
    key_takeaway: feedback.keyTakeaway,
    ...(feedback.memoryTip ? { memory_tip: feedback.memoryTip } : {}),
    tags: config.tags || ["dea", "parcours-07", "système-digestif"],
    pedagogicalReference: SOURCE_TITLE + ", p. " + sourcePages,
    level: 1,
    xp: 0,
    metadata: {
      lessonId: lesson.id,
      sourceDocument: SOURCE_ID,
      sourceTitle: SOURCE_TITLE,
      sourceSection,
      sourcePages,
      pageStatus: "verified",
      sourceType: SOURCE_TYPE,
      knowledgeIds: config.knowledgeIds,
      competencyIds,
      plannedParcoursIds: [PARCOURS_ID],
      validationStatus: "to_validate",
      generationSource: "library_extracted_knowledge",
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
    difficulty: "easy",
    estimatedMinutes: 9,
    level: 1,
    xp: null,
    tags: ["dea", "parcours-07", "validation-a-effectuer"],
    pedagogicalReference: SOURCE_TITLE + ", p. " + lesson.pages,
    pulse: null,
    selection: { strategy: "all", count: items.length },
    learningObjectives: lesson.objectives,
    competencyIds: lesson.competencyIds,
    prerequisiteIds: lesson.prerequisiteIds || [],
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
    tags: ["dea", "parcours-07", "boss", "validation-a-effectuer"],
    pedagogicalReference: SOURCE_TITLE + ", p. " + boss.pages,
    pulse: null,
    selection: { strategy: "all", count: items.length },
    learningObjectives: [
      "Reconstituer le trajet complet des aliments.",
      "Relier chaque organe à son rôle général.",
      "Distinguer digestion, absorption et évacuation.",
    ],
    competencyIds: boss.competencyIds,
    prerequisiteIds: ["dea-p07-l08"],
    bossConfiguration: {
      objective: "Valider les bases du système digestif au niveau DEA.",
      scenario:
        "L’apprenant suit le trajet d’un aliment, identifie les organes et explique le devenir des nutriments et des résidus.",
      tasks: [
        "Reconstituer le trajet digestif.",
        "Relier les glandes à leurs sécrétions.",
        "Distinguer absorption et transit terminal.",
      ],
      engine: "existing_lesson_engine",
      excludedEngine: "mode_intervention",
      successThreshold: 0.8,
    },
    validationStatus: "to_validate",
    generationSource: "library_extracted_knowledge",
    items,
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function validateGeneratedContent() {
  if (KNOWLEDGE.length !== 13) throw new Error("Le Parcours 7 doit contenir 13 connaissances.");
  if (LESSONS.length !== 8) throw new Error("Le Parcours 7 doit contenir 8 leçons.");
  for (const lesson of LESSONS) {
    if (lesson.questions.length !== 8)
      throw new Error(lesson.id + " doit contenir exactement 8 questions.");
  }
  if (BOSS.questions.length !== 8) throw new Error("Le Boss doit contenir 8 questions.");
  const allQuestions = [...LESSONS.flatMap((lesson) => lesson.questions), ...BOSS.questions];
  const prompts = allQuestions.map((entry) => entry.prompt.normalize("NFKC").trim().toLowerCase());
  if (new Set(prompts).size !== prompts.length) throw new Error("Question dupliquée détectée.");
  const knowledgeIds = new Set(KNOWLEDGE.map((entry) => entry.knowledgeId));
  for (const entry of allQuestions) {
    if (
      !entry.feedback?.whyCorrect ||
      !entry.feedback?.commonMistake ||
      !entry.feedback?.keyTakeaway ||
      !entry.feedback?.fieldApplication
    ) {
      throw new Error("Feedback incomplet : " + entry.prompt);
    }
    if (!entry.knowledgeIds?.length) throw new Error("Connaissance absente : " + entry.prompt);
    for (const knowledgeId of entry.knowledgeIds) {
      if (!knowledgeIds.has(knowledgeId)) throw new Error("Connaissance inconnue : " + knowledgeId);
    }
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
  const path = join(ROOT, "docs", "master_knowledge_base", "documents", SOURCE_ID + ".json");
  const document = await readJson(path);
  const byId = new Map((document.knowledge || []).map((entry) => [entry.knowledgeId, entry]));
  for (const entry of KNOWLEDGE) {
    const existing = byId.get(entry.knowledgeId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(entry)) {
      throw new Error(
        "La connaissance " + entry.knowledgeId + " existe avec un contenu différent.",
      );
    }
    if (!existing) document.knowledge.push(entry);
  }
  const scope = "appareil digestif, pages 39 à 41";
  if (!String(document.analyzed_scope || "").includes("appareil digestif")) {
    document.analyzed_scope = document.analyzed_scope
      ? document.analyzed_scope + " ; " + scope
      : scope;
  }
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
    join(OUTPUT_DIR, "lesson-" + String(index + 1).padStart(2, "0") + ".json"),
    buildLesson(lesson),
  );
}
await writeJson(join(OUTPUT_DIR, "lesson-09.json"), buildBoss(BOSS));
await updateDocumentKnowledge();

console.log(
  "Parcours 7 généré : " +
    KNOWLEDGE.length +
    " connaissances, " +
    LESSONS.length * 8 +
    " questions de leçon et 8 questions de Boss.",
);
