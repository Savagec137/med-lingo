import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-06");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const SOURCE_TITLE = "B2.M4 - Support Etudiant.pdf";
const SOURCE_VERSION = "Version 1 - Août 2022";
const PARCOURS_ID = "parcours-06";
const CONTENT_ID = "dea-p06";
const SOURCE_TYPE = "training_source";
const LEGACY_FILE = join(OUTPUT_DIR, "legacy-import-lesson-08.json");

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
  knowledgeId: "K-DEA-P06-" + String(id).padStart(3, "0"),
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

const RESP = ["body.system.respiratory"];
const ORGAN = ["body.system.respiratory", "body.organ.function", "body.organ.location"];
const SYSTEM = ["body.system.respiratory", "body.organization.organ-to-system"];

const KNOWLEDGE = [
  K(
    1,
    "Organisation générale de l’appareil respiratoire",
    "L’appareil respiratoire associe les voies aériennes, les alvéoles pulmonaires, la cage thoracique et les centres neurologiques de commande.",
    [
      "Les voies aériennes sont des passages pour l’air.",
      "Les alvéoles sont le lieu des échanges gazeux.",
      "La cage thoracique participe aux mouvements ventilatoires.",
      "Les centres neurologiques commandent la respiration.",
    ],
    [
      "Réduire l’appareil respiratoire aux seuls poumons.",
      "Confondre passage de l’air et lieu des échanges.",
    ],
    "Distinguer les quatre ensembles aide à décrire factuellement ce qui est observé sans poser de diagnostic.",
    "Appareil respiratoire - organisation générale",
    [24],
    SYSTEM,
    ["dea-p06-l01", "dea-p06-l02", "dea-p06-l04", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    2,
    "Voies aériennes supérieures",
    "Les fosses nasales et le pharynx appartiennent aux voies aériennes supérieures décrites dans le support.",
    [
      "Les fosses nasales sont situées dans le massif facial.",
      "Le pharynx est un conduit commun aux voies respiratoires et digestives.",
    ],
    [
      "Classer le larynx parmi les voies aériennes supérieures dans la nomenclature de ce support.",
      "Confondre pharynx et trachée.",
    ],
    "Ces repères permettent de localiser une gêne ou une obstruction avec un vocabulaire précis.",
    "Appareil respiratoire - voies aériennes supérieures",
    [23],
    RESP,
    ["dea-p06-l01", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    3,
    "Voies aériennes inférieures",
    "Le support classe le larynx, la trachée, les bronches, les bronchioles et les poumons parmi les voies aériennes inférieures.",
    [
      "La trachée se divise en deux bronches principales.",
      "Les bronches se ramifient en bronchioles.",
      "Les bronchioles conduisent vers les alvéoles.",
    ],
    [
      "Placer les échanges gazeux dans la trachée.",
      "Inverser bronches et bronchioles dans le trajet de l’air.",
    ],
    "Suivre le trajet anatomique facilite une description structurée des voies aériennes.",
    "Appareil respiratoire - voies aériennes inférieures",
    [23],
    RESP,
    ["dea-p06-l01", "dea-p06-l02", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    4,
    "Poumons, lobes et plèvre",
    "Les deux poumons occupent la cage thoracique ; le poumon droit comporte trois lobes, le gauche deux, et chacun est entouré d’une double enveloppe appelée plèvre.",
    [
      "Le poumon droit comporte trois lobes.",
      "Le poumon gauche comporte deux lobes.",
      "La plèvre est décrite comme une double enveloppe.",
    ],
    ["Attribuer trois lobes aux deux poumons.", "Confondre la plèvre avec une cavité pulmonaire."],
    "Ces repères permettent de situer précisément le côté concerné lors d’un bilan.",
    "Appareil respiratoire - poumons et plèvre",
    [23],
    ORGAN,
    ["dea-p06-l02", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    5,
    "Diaphragme et cycle ventilatoire",
    "Lors de l’inspiration, le diaphragme se contracte et s’abaisse ; lors de l’expiration, il se relâche et remonte.",
    [
      "La contraction du diaphragme augmente le volume thoracique.",
      "L’inspiration fait entrer l’air.",
      "Le relâchement accompagne l’expiration.",
    ],
    [
      "Associer la contraction du diaphragme à l’expiration.",
      "Présenter le diaphragme comme un organe d’échange gazeux.",
    ],
    "Observer les mouvements thoraco-abdominaux aide à apprécier la ventilation.",
    "Appareil respiratoire - mouvements ventilatoires",
    [25],
    RESP,
    ["dea-p06-l03", "dea-p06-l04", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    6,
    "Réflexes de protection des voies aériennes",
    "La déglutition et la toux sont présentées comme des réflexes de sécurité protégeant les voies aériennes.",
    [
      "La déglutition oriente le bol alimentaire vers l’œsophage.",
      "La toux cherche à expulser un corps étranger.",
    ],
    [
      "Confondre un réflexe de protection avec un mouvement ventilatoire.",
      "Attribuer à la toux la fonction d’échange gazeux.",
    ],
    "Repérer l’altération d’un réflexe de protection contribue à une observation factuelle et à une transmission rapide.",
    "Appareil respiratoire - réflexes de sécurité",
    [25],
    RESP,
    ["dea-p06-l01", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    7,
    "Finalité de la respiration et échanges gazeux",
    "La respiration apporte de l’oxygène à l’organisme et élimine le dioxyde de carbone grâce aux échanges entre alvéoles et capillaires.",
    [
      "L’oxygène passe de l’air alvéolaire vers le sang.",
      "Le dioxyde de carbone suit le trajet inverse.",
      "Les échanges ont lieu au niveau alvéolo-capillaire.",
    ],
    [
      "Localiser les échanges dans les bronches.",
      "Dire que le dioxyde de carbone est apporté aux cellules par l’inspiration.",
    ],
    "Relier ventilation et échanges aide à distinguer un mouvement d’air d’une oxygénation efficace.",
    "Appareil respiratoire - échanges alvéolo-capillaires",
    [24, 25],
    RESP,
    ["dea-p06-l05", "dea-p06-l06", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    8,
    "Composition de l’air et air alvéolaire",
    "Le support indique environ 21 % d’oxygène dans l’air ambiant et environ 16 % dans l’air alvéolaire, où le dioxyde de carbone atteint environ 5 %.",
    [
      "L’azote représente environ 78 % de l’air.",
      "L’oxygène représente environ 21 % de l’air ambiant.",
      "L’air alvéolaire contient moins d’oxygène et davantage de dioxyde de carbone.",
    ],
    [
      "Confondre air ambiant et air alvéolaire.",
      "Présenter l’oxygène comme le gaz majoritaire de l’air.",
    ],
    "Comparer les compositions illustre les échanges sans permettre, à elle seule, un diagnostic.",
    "Appareil respiratoire - composition des gaz",
    [26],
    RESP,
    ["dea-p06-l05", "dea-p06-l06", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    9,
    "Volumes et régulation de la respiration",
    "Le support décrit un volume courant d’environ 0,5 litre et une régulation respiratoire influencée notamment par le dioxyde de carbone, l’oxygène, l’effort, le stress, la fièvre, le coma et certains médicaments.",
    [
      "Le volume courant est l’air mobilisé lors d’une respiration calme.",
      "La fréquence respiratoire s’adapte aux besoins.",
      "Plusieurs situations peuvent modifier la respiration.",
    ],
    [
      "Confondre volume courant et capacité totale des poumons.",
      "Interpréter une variation de fréquence sans contexte clinique.",
    ],
    "Ces données servent à observer une tendance et à transmettre le contexte, pas à poser un diagnostic isolé.",
    "Appareil respiratoire - volumes et régulation",
    [26],
    RESP,
    ["dea-p06-l04", "dea-p06-l07", "dea-p06-l08"],
  ),
  K(
    10,
    "Mesure de la fréquence respiratoire",
    "La fréquence respiratoire se mesure au repos en observant pendant une minute les mouvements du thorax ou de l’abdomen.",
    [
      "Le patient doit être au repos.",
      "La mesure dure une minute.",
      "Il faut aussi apprécier amplitude et régularité.",
    ],
    [
      "Compter trop brièvement une respiration irrégulière.",
      "Se limiter au chiffre sans décrire rythme et amplitude.",
    ],
    "Une mesure discrète et complète améliore la fiabilité du bilan transmis.",
    "Mesure des paramètres vitaux - fréquence respiratoire",
    [71, 72],
    RESP,
    ["dea-p06-l07", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    11,
    "Repères de fréquence respiratoire",
    "Le support donne au repos 12 à 20 cycles par minute après 14 ans, 20 à 30 de 2 à 12 ans, 30 à 60 de 1 mois à 2 ans et 40 à 60 avant 1 mois.",
    [
      "Les valeurs dépendent de l’âge.",
      "Une fréquence doit toujours être associée au contexte.",
      "Amplitude et régularité complètent la mesure.",
    ],
    [
      "Appliquer la valeur adulte à un nourrisson.",
      "Interpréter un chiffre isolé sans âge ni contexte.",
    ],
    "Transmettre âge, fréquence, rythme et amplitude évite une interprétation incomplète.",
    "Mesure des paramètres vitaux - valeurs respiratoires",
    [71, 72],
    RESP,
    ["dea-p06-l07", "dea-p06-l08", "dea-p06-boss"],
  ),
  K(
    12,
    "Oxymètre de pouls et SpO₂",
    "L’oxymètre de pouls estime la saturation pulsée en oxygène ; le support situe la valeur normale entre 95 % et 100 %.",
    [
      "La mesure est non invasive.",
      "La valeur affichée est une SpO₂.",
      "La mesure complète l’observation clinique.",
    ],
    [
      "Assimiler la SpO₂ à la fréquence respiratoire.",
      "Décider sur la seule valeur sans vérifier le patient et la qualité de mesure.",
    ],
    "Une SpO₂ doit être transmise avec l’état clinique et les conditions de mesure.",
    "Mesure des paramètres vitaux - oxymétrie de pouls",
    [72],
    RESP,
    ["dea-p06-l06", "dea-p06-l07", "dea-p06-l08", "dea-p06-boss"],
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
    id: "dea-p06-l01",
    title: "Les voies aériennes",
    pages: "23, 25",
    section: "Appareil respiratoire - voies aériennes et réflexes de sécurité",
    objectives: [
      "Distinguer les voies aériennes supérieures et inférieures selon le support.",
      "Reconstituer le trajet de l’air vers les alvéoles.",
      "Identifier les réflexes de protection décrits.",
    ],
    competencyIds: RESP,
    questions: [
      MCQ(
        "Selon le support, quels éléments appartiennent aux voies aériennes supérieures ?",
        [
          "Les fosses nasales et le pharynx",
          "Ces deux structures sont classées dans les voies aériennes supérieures.",
        ],
        [
          [
            "Le larynx et la trachée",
            "Le support les classe parmi les voies aériennes inférieures.",
          ],
          [
            "Les bronches et les bronchioles",
            "Elles appartiennent aux voies aériennes inférieures.",
          ],
          [
            "Les alvéoles et les capillaires",
            "Ils participent aux échanges, pas à cette catégorie anatomique.",
          ],
        ],
        ["K-DEA-P06-002"],
        FB(
          "La classification demandée reprend exactement celle du support DEA.",
          "Mélanger les nomenclatures d’autres documents peut déplacer le larynx d’une catégorie à l’autre.",
          "Dans ce support : fosses nasales et pharynx sont supérieurs.",
          "Employer la nomenclature du document de référence dans la transmission.",
        ),
      ),
      TF(
        "La trachée se divise en deux bronches principales.",
        true,
        ["K-DEA-P06-003"],
        FB(
          "La division de la trachée ouvre le trajet vers chacun des poumons.",
          "Confondre bronche principale et bronchiole inverse l’ordre des ramifications.",
          "Trachée, bronches, bronchioles, alvéoles.",
          "Reconstituer ce trajet lorsqu’une localisation respiratoire est décrite.",
          "T-B-B-A : trachée, bronches, bronchioles, alvéoles.",
        ),
        "La proposition suit le trajet anatomique du support.",
        "Faux serait incorrect : les deux bronches principales succèdent bien à la trachée.",
      ),
      MATCH(
        "Associe chaque structure à sa description.",
        [
          ["Fosses nasales", "Massif facial", "Elles sont situées dans le massif facial."],
          ["Pharynx", "Conduit commun respiratoire et digestif", "Il est commun aux deux voies."],
          ["Trachée", "Se divise en deux bronches", "Elle précède les bronches principales."],
          [
            "Bronchioles",
            "Ramifications conduisant aux alvéoles",
            "Elles prolongent les bronches.",
          ],
        ],
        ["K-DEA-P06-002", "K-DEA-P06-003"],
        FB(
          "Chaque association replace la structure dans le trajet ou sa fonction descriptive.",
          "Associer toutes les structures à l’échange gazeux efface leur rôle de conduit.",
          "Les voies aériennes conduisent l’air jusqu’aux alvéoles.",
          "Localiser précisément une gêne au cours du bilan.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le trajet de l’air après le pharynx.",
        [
          ["Larynx", "Il précède la trachée."],
          ["Trachée", "Elle conduit vers les bronches."],
          ["Bronches", "Elles se ramifient."],
          ["Bronchioles", "Elles conduisent aux alvéoles."],
          ["Alvéoles", "Elles constituent le lieu des échanges."],
        ],
        ["K-DEA-P06-003"],
        FB(
          "L’ordre suit la diminution progressive du calibre des conduits.",
          "Placer les alvéoles avant les bronchioles confond conduit et terminaison d’échange.",
          "Larynx, trachée, bronches, bronchioles, alvéoles.",
          "Utiliser cet ordre pour raisonner sur la localisation d’une obstruction.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : les bronches se ramifient en ______ avant d’atteindre les alvéoles.",
        ["bronchioles", "Les bronchioles sont les ramifications qui conduisent aux alvéoles."],
        [
          ["trachées", "La trachée est située en amont des bronches."],
          ["pharynx", "Le pharynx précède le larynx et la trachée."],
          ["plèvres", "La plèvre enveloppe les poumons."],
        ],
        ["K-DEA-P06-003"],
        FB(
          "Le terme complète le trajet anatomique décrit par le support.",
          "La proximité sonore entre bronche et bronchiole peut faire oublier leur ordre.",
          "Les bronchioles prolongent les bronches.",
          "Nommer le niveau anatomique plutôt que dire seulement « dans les poumons ».",
        ),
      ),
      CLINICAL(
        "Un patient conscient désigne une gêne ressentie au niveau du nez. Quelle localisation factuelle est la plus précise ?",
        [
          "Voies aériennes supérieures, au niveau des fosses nasales",
          "Cette formulation localise la zone sans poser de diagnostic.",
        ],
        [
          [
            "Voies aériennes inférieures, au niveau des bronchioles",
            "Cette localisation ne correspond pas à la zone désignée.",
          ],
          ["Alvéoles pulmonaires", "Les alvéoles ne sont pas situées dans le nez."],
          ["Plèvre gauche", "La plèvre entoure un poumon et n’est pas dans le massif facial."],
        ],
        ["K-DEA-P06-002"],
        FB(
          "La formulation associe la région observée à la catégorie anatomique du support.",
          "Transformer une plainte localisée en diagnostic est hors objectif.",
          "Décrire d’abord où se situe le problème.",
          "Transmettre une localisation observable et les signes associés.",
          null,
          "Une localisation anatomique ne remplace pas l’évaluation clinique complète.",
        ),
      ),
      MULTI(
        "Quels éléments sont des réflexes de sécurité des voies aériennes selon le support ?",
        [
          ["La déglutition", "Elle oriente le bol alimentaire vers l’œsophage."],
          ["La toux", "Elle cherche à expulser un corps étranger."],
        ],
        [
          ["L’inspiration", "C’est un mouvement ventilatoire."],
          ["L’expiration", "C’est un mouvement ventilatoire."],
        ],
        ["K-DEA-P06-006"],
        FB(
          "Les deux mécanismes protègent les voies aériennes contre une fausse route ou un corps étranger.",
          "Confondre protection et ventilation conduit à sélectionner inspiration ou expiration.",
          "Déglutition et toux protègent ; inspiration et expiration ventilent.",
          "Observer et transmettre l’efficacité de ces réflexes.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quel énoncé distingue correctement une voie aérienne d’une zone d’échange ?",
        [
          "Une bronche conduit l’air, une alvéole participe aux échanges",
          "La bronche est un conduit tandis que l’alvéole est une terminaison d’échange.",
        ],
        [
          [
            "Une alvéole conduit l’air vers la trachée",
            "Le trajet va de la trachée vers les alvéoles.",
          ],
          ["Une bronche réalise seule tous les échanges", "Les échanges sont alvéolo-capillaires."],
          [
            "La plèvre conduit l’air vers les bronchioles",
            "La plèvre est une enveloppe du poumon.",
          ],
        ],
        ["K-DEA-P06-001", "K-DEA-P06-003"],
        FB(
          "La distinction repose sur la fonction de passage ou d’échange.",
          "Le mot « respiratoire » ne signifie pas que toutes les structures ont la même fonction.",
          "Conduits jusqu’aux alvéoles ; échanges dans les alvéoles.",
          "Structurer une observation sans confondre anatomie et fonction.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p06-l02",
    title: "Les poumons",
    pages: "23, 24",
    section: "Appareil respiratoire - poumons, lobes, plèvre et alvéoles",
    objectives: [
      "Situer les deux poumons.",
      "Comparer leurs lobes.",
      "Distinguer poumon, plèvre et alvéoles.",
    ],
    competencyIds: ORGAN,
    prerequisiteIds: ["dea-p06-l01"],
    questions: [
      MCQ(
        "Combien de lobes le poumon droit comporte-t-il selon le support ?",
        ["Trois lobes", "Le poumon droit est décrit avec trois lobes."],
        [
          ["Deux lobes", "Deux lobes correspondent au poumon gauche."],
          ["Quatre lobes", "Ce nombre n’est pas indiqué pour un poumon."],
          ["Un seul lobe", "Le support décrit plusieurs lobes."],
        ],
        ["K-DEA-P06-004"],
        FB(
          "La différence droite-gauche est un repère anatomique stable du support.",
          "Attribuer la même organisation aux deux côtés fait perdre ce repère.",
          "Droit : trois ; gauche : deux.",
          "Préciser le côté lors de la localisation d’un signe.",
          "3 à droite, 2 à gauche.",
        ),
      ),
      TF(
        "La plèvre est décrite comme une double enveloppe entourant chaque poumon.",
        true,
        ["K-DEA-P06-004"],
        FB(
          "La proposition reprend la description anatomique donnée.",
          "La confondre avec l’air pulmonaire revient à prendre une enveloppe pour un conduit.",
          "La plèvre enveloppe le poumon.",
          "Utiliser le terme pour localiser sans attribuer de diagnostic.",
        ),
        "La plèvre est bien présentée comme une double enveloppe.",
        "Faux serait incorrect : cette description figure dans le support.",
      ),
      MATCH(
        "Associe chaque élément pulmonaire à sa caractéristique.",
        [
          ["Poumon droit", "Trois lobes", "Il comporte trois lobes."],
          ["Poumon gauche", "Deux lobes", "Il comporte deux lobes."],
          ["Plèvre", "Double enveloppe", "Elle entoure chaque poumon."],
          ["Alvéoles", "Lieu des échanges gazeux", "Elles sont au contact des capillaires."],
        ],
        ["K-DEA-P06-004", "K-DEA-P06-007"],
        FB(
          "Les associations distinguent organisation anatomique et fonction.",
          "Confondre plèvre et alvéoles mélange enveloppe et échanges.",
          "Lobes pour les poumons, plèvre autour, alvéoles pour les échanges.",
          "Décrire précisément le côté et la structure concernés.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Classe ces niveaux du plus global au plus fin dans l’arbre respiratoire.",
        [
          ["Poumon", "Il contient les ramifications."],
          ["Bronche principale", "Elle entre dans le poumon."],
          ["Bronchiole", "Elle prolonge les bronches."],
          ["Alvéole", "Elle termine l’arbre et participe aux échanges."],
        ],
        ["K-DEA-P06-003", "K-DEA-P06-004"],
        FB(
          "L’ordre va de l’organe vers ses ramifications terminales.",
          "Classer par taille visuelle sans suivre l’arbre anatomique crée des inversions.",
          "Poumon, bronche, bronchiole, alvéole.",
          "Situer le niveau exact mentionné dans une transmission.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : le poumon gauche comporte ______ lobes.",
        ["deux", "Le support attribue deux lobes au poumon gauche."],
        [
          ["trois", "Trois lobes correspondent au poumon droit."],
          ["quatre", "Ce nombre ne correspond pas au support."],
          ["cinq", "Cinq est le total des lobes des deux poumons, pas celui du gauche."],
        ],
        ["K-DEA-P06-004"],
        FB(
          "La latéralité permet de choisir le bon nombre.",
          "Additionner les lobes des deux poumons donne cinq et répond à une autre question.",
          "Gauche deux, droit trois.",
          "Toujours associer un repère thoracique à son côté.",
        ),
      ),
      CLINICAL(
        "Lors d’un bilan, une douleur est montrée sur l’hémithorax droit. Quelle formulation reste anatomiquement précise et prudente ?",
        [
          "Douleur localisée à l’hémithorax droit, sans conclure sur l’organe atteint",
          "La localisation est transmissible et ne transforme pas le signe en diagnostic.",
        ],
        [
          [
            "Douleur du poumon droit certaine",
            "La localisation seule ne prouve pas l’organe atteint.",
          ],
          ["Atteinte de la plèvre confirmée", "Aucun élément ne confirme cette structure."],
          ["Douleur alvéolaire", "Une alvéole ne peut pas être localisée ainsi par le patient."],
        ],
        ["K-DEA-P06-004"],
        FB(
          "La description factuelle distingue ce qui est observé de ce qui serait interprété.",
          "Nommer un organe comme cause certaine dépasse les informations disponibles.",
          "Localiser précisément sans diagnostiquer.",
          "Transmettre côté, région, contexte et signes associés.",
          null,
          "Ne jamais déduire l’organe atteint de la seule zone douloureuse.",
        ),
      ),
      MULTI(
        "Quelles propositions décrivent correctement les poumons selon le support ?",
        [
          ["Ils sont deux", "Le support décrit deux poumons."],
          ["Ils sont situés dans la cage thoracique", "Ils occupent le thorax."],
          ["Ils sont entourés par une plèvre", "Chaque poumon est entouré d’une double enveloppe."],
        ],
        [["Ils possèdent chacun trois lobes", "Le poumon gauche n’en possède que deux."]],
        ["K-DEA-P06-004"],
        FB(
          "Les trois propositions réunissent nombre, situation et enveloppe.",
          "Généraliser les trois lobes du côté droit au côté gauche est l’erreur classique.",
          "Deux poumons dans le thorax, entourés par la plèvre.",
          "Utiliser droite et gauche dans toute description pulmonaire.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quel élément constitue le lieu principal des échanges gazeux pulmonaires ?",
        ["Les alvéoles", "Les échanges ont lieu entre alvéoles et capillaires."],
        [
          ["La plèvre", "Elle entoure le poumon."],
          ["La trachée", "Elle conduit l’air."],
          ["Le pharynx", "Il constitue un passage commun."],
        ],
        ["K-DEA-P06-001", "K-DEA-P06-007"],
        FB(
          "Les alvéoles mettent l’air au contact du réseau capillaire.",
          "Choisir un conduit parce qu’il contient de l’air ne suffit pas à en faire un lieu d’échange.",
          "Alvéoles : échanges ; voies aériennes : passage.",
          "Relier structure et fonction dans le bilan respiratoire.",
        ),
      ),
    ],
  },
  {
    id: "dea-p06-l03",
    title: "Le diaphragme",
    pages: "25",
    section: "Appareil respiratoire - diaphragme et mouvements ventilatoires",
    objectives: [
      "Identifier le rôle mécanique du diaphragme.",
      "Associer contraction et inspiration.",
      "Associer relâchement et expiration.",
    ],
    competencyIds: RESP,
    prerequisiteIds: ["dea-p06-l02"],
    questions: [
      MCQ(
        "Que fait le diaphragme au début de l’inspiration décrite dans le support ?",
        [
          "Il se contracte et s’abaisse",
          "Sa contraction augmente le volume disponible dans la cage thoracique.",
        ],
        [
          ["Il se relâche et remonte", "Ce mouvement accompagne l’expiration."],
          ["Il ferme les bronches", "Le diaphragme ne joue pas ce rôle."],
          ["Il réalise les échanges avec le sang", "Les échanges sont alvéolo-capillaires."],
        ],
        ["K-DEA-P06-005"],
        FB(
          "La contraction et l’abaissement du diaphragme participent à l’entrée d’air.",
          "Associer toute contraction à une diminution de volume conduit à inverser les phases.",
          "Inspiration : diaphragme contracté et abaissé.",
          "Observer la dynamique thoraco-abdominale pendant la respiration.",
          "Il descend quand l’air entre.",
        ),
      ),
      TF(
        "Lors de l’expiration calme, le diaphragme se relâche et remonte.",
        true,
        ["K-DEA-P06-005"],
        FB(
          "Le relâchement ramène le diaphragme vers sa position haute.",
          "Inverser inspiration et expiration fait associer la remontée à l’entrée d’air.",
          "Expiration : relâchement et remontée.",
          "Décrire le mouvement observé en plus de compter la fréquence.",
        ),
        "La proposition correspond à la phase expiratoire du support.",
        "Faux serait incorrect : le diaphragme ne reste pas contracté pendant l’expiration calme.",
      ),
      MATCH(
        "Associe chaque phase au mouvement principal décrit.",
        [
          [
            "Inspiration",
            "Contraction et abaissement du diaphragme",
            "Le volume thoracique augmente.",
          ],
          ["Expiration", "Relâchement et remontée du diaphragme", "Le volume thoracique diminue."],
          [
            "Entrée de l’air",
            "Augmentation du volume thoracique",
            "Elle accompagne l’inspiration.",
          ],
          ["Sortie de l’air", "Diminution du volume thoracique", "Elle accompagne l’expiration."],
        ],
        ["K-DEA-P06-005"],
        FB(
          "Les associations reconstruisent la mécanique des deux phases.",
          "Mélanger mouvement musculaire et sens de l’air inverse le cycle.",
          "Contraction vers le bas : air entre ; relâchement vers le haut : air sort.",
          "Repérer une asymétrie ou une difficulté de mouvement au bilan.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre les événements de l’inspiration.",
        [
          ["Contraction du diaphragme", "Le mouvement débute par l’action musculaire."],
          ["Abaissement du diaphragme", "Il s’aplatit vers le bas."],
          ["Augmentation du volume thoracique", "La cage offre davantage de volume."],
          ["Entrée de l’air", "L’air pénètre dans les voies aériennes."],
        ],
        ["K-DEA-P06-005"],
        FB(
          "L’ordre relie action musculaire, modification de volume et mouvement d’air.",
          "Commencer par l’air sans comprendre la mécanique fait perdre le lien causal décrit.",
          "Muscle, volume, air.",
          "Utiliser cette séquence pour expliquer simplement la ventilation.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : pendant l’inspiration, le diaphragme se contracte et s’______.",
        ["abaisse", "Le support décrit un diaphragme qui s’aplatit et s’abaisse."],
        [
          ["élève", "La remontée accompagne le relâchement expiratoire."],
          ["immobilise", "Il réalise un mouvement pendant la phase."],
          ["épaissit", "Ce terme ne décrit pas le mouvement attendu."],
        ],
        ["K-DEA-P06-005"],
        FB(
          "Le verbe attendu décrit la direction du diaphragme.",
          "Confondre la position finale avec la phase inverse conduit à choisir « élève ».",
          "À l’inspiration, le diaphragme descend.",
          "Associer le mouvement observé à la phase ventilatoire.",
        ),
      ),
      CLINICAL(
        "Au repos, tu observes surtout les mouvements de l’abdomen pour compter la respiration. Quelle structure contribue directement à ces mouvements ?",
        ["Le diaphragme", "Ses déplacements influencent les mouvements thoraco-abdominaux."],
        [
          ["La plèvre seule", "La plèvre est une enveloppe, pas le muscle moteur décrit."],
          ["Le pharynx", "Il constitue un passage aérien."],
          ["Les alvéoles", "Elles participent aux échanges mais ne produisent pas ce mouvement."],
        ],
        ["K-DEA-P06-005", "K-DEA-P06-010"],
        FB(
          "Le diaphragme est le principal élément mécanique relié à cette observation.",
          "Confondre lieu d’échange et moteur ventilatoire fait choisir les alvéoles.",
          "Le diaphragme crée le mouvement ; les alvéoles assurent les échanges.",
          "Observer thorax ou abdomen pendant une minute.",
          null,
          "Une absence ou une anomalie de mouvement doit être intégrée au bilan global.",
        ),
      ),
      MULTI(
        "Quelles conséquences accompagnent la contraction du diaphragme pendant l’inspiration ?",
        [
          ["Son abaissement", "Le diaphragme s’aplatit vers le bas."],
          ["L’augmentation du volume thoracique", "La cage thoracique offre davantage de volume."],
          ["L’entrée de l’air", "La variation de volume permet l’inspiration."],
        ],
        [["Sa remontée", "La remontée accompagne l’expiration."]],
        ["K-DEA-P06-005"],
        FB(
          "Les trois effets appartiennent à la même séquence inspiratoire.",
          "Ajouter la remontée mélange les deux phases opposées.",
          "À l’inspiration : contraction, descente, volume accru, air entrant.",
          "Suivre la séquence plutôt que mémoriser des mots isolés.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Pourquoi le diaphragme ne doit-il pas être présenté comme le lieu des échanges gazeux ?",
        [
          "Parce qu’il assure surtout un rôle mécanique de ventilation",
          "Le muscle modifie le volume thoracique, tandis que les échanges ont lieu dans les alvéoles.",
        ],
        [
          [
            "Parce qu’il appartient aux voies aériennes supérieures",
            "Le support ne le classe pas comme voie aérienne.",
          ],
          [
            "Parce qu’il contient les capillaires pulmonaires",
            "Les capillaires d’échange sont au contact des alvéoles.",
          ],
          ["Parce qu’il enveloppe les poumons", "Cette fonction correspond à la plèvre."],
        ],
        ["K-DEA-P06-005", "K-DEA-P06-007"],
        FB(
          "La fonction mécanique du diaphragme se distingue de la fonction d’échange des alvéoles.",
          "Toutes les structures respiratoires ne réalisent pas la même étape.",
          "Diaphragme : mouvement ; alvéoles : échanges.",
          "Distinguer ventilation et oxygénation dans l’observation.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p06-l04",
    title: "La ventilation",
    pages: "25, 26",
    section: "Appareil respiratoire - inspiration, expiration, volumes et régulation",
    objectives: [
      "Distinguer inspiration et expiration.",
      "Comprendre la notion de volume courant.",
      "Identifier les facteurs de régulation cités.",
    ],
    competencyIds: RESP,
    prerequisiteIds: ["dea-p06-l03"],
    questions: [
      MCQ(
        "Quelle définition correspond au volume courant décrit dans le support ?",
        [
          "Le volume mobilisé lors d’une respiration calme, environ 0,5 litre",
          "Le support associe le volume courant à une respiration normale au repos.",
        ],
        [
          [
            "La totalité du volume des deux poumons, environ 0,5 litre",
            "Le volume pulmonaire total indiqué est bien supérieur.",
          ],
          [
            "Le volume uniquement expiré lors d’un effort maximal",
            "Cela ne décrit pas une respiration calme.",
          ],
          ["Le volume d’air restant dans la trachée", "Le volume courant concerne l’air mobilisé."],
        ],
        ["K-DEA-P06-009"],
        FB(
          "La notion associe une respiration calme à un volume mobilisé approximatif.",
          "Confondre volume courant, capacité totale et volume forcé est fréquent.",
          "Volume courant : respiration calme, environ un demi-litre.",
          "Interpréter un mouvement respiratoire avec son contexte, pas à partir d’un volume théorique seul.",
        ),
      ),
      TF(
        "La ventilation alterne une phase d’inspiration et une phase d’expiration.",
        true,
        ["K-DEA-P06-005"],
        FB(
          "L’alternance de ces deux phases constitue le cycle ventilatoire décrit.",
          "Se concentrer uniquement sur l’entrée d’air fait oublier l’expiration.",
          "Un cycle associe inspiration et expiration.",
          "Compter des cycles complets pendant la mesure.",
        ),
        "La proposition décrit correctement le cycle.",
        "Faux serait incorrect : les deux phases sont nécessaires.",
      ),
      MATCH(
        "Associe chaque terme ventilatoire à sa description.",
        [
          [
            "Inspiration",
            "Entrée de l’air",
            "Elle accompagne l’augmentation du volume thoracique.",
          ],
          ["Expiration", "Sortie de l’air", "Elle accompagne la diminution du volume thoracique."],
          [
            "Volume courant",
            "Air mobilisé lors d’une respiration calme",
            "Le support l’estime à environ 0,5 litre.",
          ],
          [
            "Fréquence respiratoire",
            "Nombre de cycles par minute",
            "Elle quantifie le rythme ventilatoire.",
          ],
        ],
        ["K-DEA-P06-005", "K-DEA-P06-009", "K-DEA-P06-010"],
        FB(
          "Les associations distinguent phase, volume et rythme.",
          "Confondre fréquence et volume mélange nombre de cycles et quantité d’air.",
          "Ventilation = phases, fréquence et amplitude.",
          "Transmettre un chiffre avec rythme et amplitude.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre un cycle ventilatoire en commençant par l’inspiration.",
        [
          ["Contraction du diaphragme", "Le cycle inspiratoire débute."],
          ["Entrée de l’air", "L’air pénètre après l’augmentation du volume."],
          ["Relâchement du diaphragme", "La phase expiratoire commence."],
          ["Sortie de l’air", "L’air quitte les voies aériennes."],
        ],
        ["K-DEA-P06-005"],
        FB(
          "L’ordre associe les deux mouvements musculaires aux deux sens de circulation de l’air.",
          "Placer la sortie avant le relâchement inverse la mécanique décrite.",
          "Contraction et entrée, puis relâchement et sortie.",
          "Repérer où le cycle semble limité chez un patient.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : la fréquence respiratoire correspond au nombre de ______ respiratoires par minute.",
        ["cycles", "Une inspiration et une expiration forment un cycle compté."],
        [
          ["litres", "Les litres mesurent un volume."],
          ["lobes", "Les lobes décrivent l’anatomie pulmonaire."],
          ["capillaires", "Ils participent aux échanges."],
        ],
        ["K-DEA-P06-010"],
        FB(
          "L’unité de comptage porte sur des cycles complets.",
          "Compter inspiration et expiration séparément double artificiellement la fréquence.",
          "Un cycle complet par mouvement respiratoire compté.",
          "Observer discrètement pendant une minute.",
        ),
      ),
      CLINICAL(
        "Un patient vient de monter un escalier et respire plus vite. Quelle donnée du support aide à contextualiser cette observation ?",
        [
          "L’effort peut augmenter les besoins et modifier la fréquence respiratoire",
          "Le support cite l’effort parmi les facteurs influençant la respiration.",
        ],
        [
          [
            "Le nombre de lobes pulmonaires change après l’effort",
            "L’anatomie ne change pas avec l’activité.",
          ],
          ["La plèvre devient une voie aérienne", "La plèvre reste une enveloppe."],
          [
            "La trachée se divise en davantage de bronches",
            "L’organisation anatomique reste la même.",
          ],
        ],
        ["K-DEA-P06-009"],
        FB(
          "Le contexte d’effort peut expliquer une adaptation ventilatoire sans constituer à lui seul un diagnostic.",
          "Interpréter toute accélération comme pathologique ignore le contexte.",
          "Toujours associer la fréquence à l’âge, au repos ou à l’effort et aux signes.",
          "Laisser reposer si la situation le permet puis mesurer selon le protocole.",
          null,
          "Une gêne ou des signes de gravité imposent une évaluation prioritaire, indépendamment du contexte d’effort.",
        ),
      ),
      MULTI(
        "Quels facteurs sont cités comme pouvant modifier la respiration ?",
        [
          ["L’effort", "Il modifie les besoins de l’organisme."],
          ["Le stress", "Il peut influencer la fréquence."],
          ["La fièvre", "Elle peut augmenter les besoins."],
          ["Certains médicaments", "Ils peuvent modifier la commande respiratoire."],
        ],
        [["Le nombre de lobes pulmonaires", "Il s’agit d’une donnée anatomique stable."]],
        ["K-DEA-P06-009"],
        FB(
          "Les facteurs sélectionnés figurent parmi les influences décrites par le support.",
          "Choisir une structure anatomique stable comme facteur dynamique mélange anatomie et physiologie.",
          "Contexte, état et substances peuvent modifier la ventilation.",
          "Noter les facteurs présents lors du bilan.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quelle observation complète le mieux une fréquence respiratoire chiffrée ?",
        [
          "Le rythme et l’amplitude des mouvements",
          "Le support demande de qualifier régularité et amplitude en plus du nombre.",
        ],
        [
          [
            "Le nombre de lobes pulmonaires",
            "Cette donnée anatomique ne décrit pas la ventilation instantanée.",
          ],
          ["La couleur du tensiomètre", "Elle n’apporte aucune information respiratoire."],
          [
            "Le volume pulmonaire théorique uniquement",
            "Il ne remplace pas l’observation du patient.",
          ],
        ],
        ["K-DEA-P06-010"],
        FB(
          "La qualité des mouvements donne un sens clinique au chiffre.",
          "Transmettre seulement la fréquence masque une respiration irrégulière ou superficielle.",
          "Nombre, rythme, amplitude.",
          "Structurer le bilan respiratoire autour de données observables.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p06-l05",
    title: "Les échanges gazeux",
    pages: "24-26",
    section: "Appareil respiratoire - échanges alvéolo-capillaires",
    objectives: [
      "Localiser les échanges gazeux.",
      "Distinguer le trajet de l’oxygène et du dioxyde de carbone.",
      "Comparer air ambiant et air alvéolaire.",
    ],
    competencyIds: RESP,
    prerequisiteIds: ["dea-p06-l04"],
    questions: [
      MCQ(
        "Entre quelles structures se réalisent les échanges gazeux pulmonaires ?",
        [
          "Entre les alvéoles et les capillaires pulmonaires",
          "Le contact alvéolo-capillaire permet le passage des gaz.",
        ],
        [
          ["Entre le pharynx et la trachée", "Ces structures conduisent l’air."],
          ["Entre la plèvre et les bronches", "La plèvre est une enveloppe."],
          ["Entre le diaphragme et les fosses nasales", "Le diaphragme assure un rôle mécanique."],
        ],
        ["K-DEA-P06-007"],
        FB(
          "La proximité entre air alvéolaire et sang capillaire rend les échanges possibles.",
          "Choisir un conduit parce qu’il contient de l’air confond ventilation et diffusion.",
          "Les échanges sont alvéolo-capillaires.",
          "Distinguer passage de l’air et transfert des gaz.",
        ),
      ),
      TF(
        "Le dioxyde de carbone passe du sang vers l’air alvéolaire avant d’être expiré.",
        true,
        ["K-DEA-P06-007"],
        FB(
          "Le trajet décrit permet l’élimination du dioxyde de carbone par l’expiration.",
          "Inverser les deux gaz conduit à dire que le dioxyde de carbone est inspiré pour les cellules.",
          "Oxygène vers le sang ; dioxyde de carbone vers l’alvéole.",
          "Relier le sens des échanges à la finalité de la respiration.",
        ),
        "La proposition suit le sens d’élimination du dioxyde de carbone.",
        "Faux serait incorrect : le gaz quitte bien le sang au niveau pulmonaire.",
      ),
      MATCH(
        "Associe chaque gaz ou milieu à son rôle dans les échanges.",
        [
          ["Oxygène", "Passe de l’alvéole vers le sang", "Il est apporté à l’organisme."],
          ["Dioxyde de carbone", "Passe du sang vers l’alvéole", "Il doit être éliminé."],
          [
            "Alvéole",
            "Contient l’air au contact des capillaires",
            "Elle constitue la zone aérienne d’échange.",
          ],
          [
            "Capillaire pulmonaire",
            "Conduit le sang au contact de l’alvéole",
            "Il constitue la zone sanguine d’échange.",
          ],
        ],
        ["K-DEA-P06-007"],
        FB(
          "Les associations opposent les deux sens de transfert.",
          "Attribuer le même sens aux deux gaz efface la finalité des échanges.",
          "O₂ entre dans le sang, CO₂ en sort.",
          "Expliquer simplement le mécanisme sans conclure à une pathologie.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le trajet de l’oxygène depuis l’air inspiré jusqu’au sang.",
        [
          ["Air inspiré", "Il entre dans les voies aériennes."],
          ["Voies aériennes", "Elles conduisent l’air."],
          ["Alvéoles", "L’air atteint la zone d’échange."],
          ["Capillaires pulmonaires", "L’oxygène passe dans le sang."],
        ],
        ["K-DEA-P06-003", "K-DEA-P06-007"],
        FB(
          "Le trajet sépare transport aérien et passage vers le sang.",
          "Passer directement du nez au sang omet les conduits et les alvéoles.",
          "Air, voies aériennes, alvéoles, sang.",
          "Identifier à quelle étape une difficulté observée pourrait se situer, sans diagnostiquer.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : les échanges gazeux se produisent au niveau des ______ pulmonaires.",
        ["alvéoles", "Les alvéoles sont au contact du réseau capillaire."],
        [
          ["bronches", "Les bronches conduisent l’air."],
          ["plèvres", "Les plèvres entourent les poumons."],
          ["fosses nasales", "Elles appartiennent aux voies aériennes supérieures."],
        ],
        ["K-DEA-P06-007"],
        FB(
          "Le terme attendu désigne la terminaison respiratoire spécialisée dans les échanges.",
          "Bronches et alvéoles sont proches dans le trajet mais n’ont pas la même fonction.",
          "Alvéoles : interface entre air et sang.",
          "Employer ce repère pour relier anatomie et physiologie.",
        ),
      ),
      CLINICAL(
        "Un patient ventile mais présente une mesure d’oxygénation anormale. Quel principe doit rester présent dans le raisonnement ?",
        [
          "Faire entrer de l’air et assurer les échanges gazeux sont deux étapes différentes",
          "La ventilation conduit l’air ; les échanges transfèrent ensuite l’oxygène vers le sang.",
        ],
        [
          [
            "Toute ventilation visible garantit des échanges normaux",
            "Un mouvement d’air ne prouve pas à lui seul l’efficacité des échanges.",
          ],
          [
            "Les échanges ont lieu dans le pharynx",
            "Ils se réalisent au niveau alvéolo-capillaire.",
          ],
          [
            "La fréquence suffit à évaluer toute la respiration",
            "Rythme, amplitude, signes et oxygénation complètent l’évaluation.",
          ],
        ],
        ["K-DEA-P06-001", "K-DEA-P06-007", "K-DEA-P06-012"],
        FB(
          "La distinction entre ventilation et échanges évite une conclusion trop rapide.",
          "Voir le thorax bouger peut donner un faux sentiment de normalité.",
          "Air déplacé ne signifie pas automatiquement oxygène transféré.",
          "Croiser mouvements, fréquence, signes cliniques et mesure disponible.",
          null,
          "Ne jamais rassurer ou alarmer sur un seul paramètre isolé.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quelles différences le support décrit-il entre air ambiant et air alvéolaire ?",
        [
          [
            "L’air alvéolaire contient moins d’oxygène",
            "Il est indiqué autour de 16 % contre environ 21 % dans l’air ambiant.",
          ],
          [
            "L’air alvéolaire contient davantage de dioxyde de carbone",
            "Le support l’indique autour de 5 %.",
          ],
        ],
        [
          [
            "L’air alvéolaire ne contient plus d’azote",
            "Le support ne décrit pas une disparition totale de l’azote.",
          ],
          [
            "L’air ambiant contient majoritairement de l’oxygène",
            "L’azote est le gaz majoritaire.",
          ],
        ],
        ["K-DEA-P06-008"],
        FB(
          "Les changements de composition reflètent les échanges avec le sang.",
          "Confondre gaz utile et gaz majoritaire fait surestimer la proportion d’oxygène.",
          "Après échanges : moins d’O₂, plus de CO₂.",
          "Utiliser les valeurs comme illustration physiologique, pas comme mesure du patient.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quel gaz est majoritaire dans l’air ambiant selon les valeurs du support ?",
        ["L’azote", "Le support indique environ 78 % d’azote."],
        [
          ["L’oxygène", "Il représente environ 21 %."],
          ["Le dioxyde de carbone", "Sa proportion est bien plus faible dans l’air ambiant."],
          ["La vapeur d’eau", "Elle n’est pas donnée comme gaz majoritaire."],
        ],
        ["K-DEA-P06-008"],
        FB(
          "Le gaz majoritaire est identifié par sa proportion, non par son importance biologique.",
          "L’oxygène est vital mais n’est pas le composant principal de l’air.",
          "Air ambiant : environ 78 % d’azote et 21 % d’oxygène.",
          "Éviter de confondre importance physiologique et proportion.",
        ),
      ),
    ],
  },
  {
    id: "dea-p06-l06",
    title: "L’oxygène",
    pages: "24-26, 72",
    section: "Appareil respiratoire - oxygène, finalité respiratoire et SpO₂",
    objectives: [
      "Expliquer le rôle général de l’oxygène.",
      "Relier oxygène et échanges pulmonaires.",
      "Comprendre ce que mesure l’oxymètre de pouls.",
    ],
    competencyIds: RESP,
    prerequisiteIds: ["dea-p06-l05"],
    questions: [
      MCQ(
        "Quelle est la finalité générale de l’apport d’oxygène décrite par le support ?",
        [
          "Fournir aux cellules le gaz nécessaire au fonctionnement de l’organisme",
          "L’oxygène inspiré passe dans le sang puis est distribué aux cellules.",
        ],
        [
          [
            "Remplacer le dioxyde de carbone dans les bronches",
            "Les échanges ont lieu au niveau alvéolaire.",
          ],
          [
            "Déclencher directement la contraction du diaphragme",
            "Le diaphragme assure la mécanique ventilatoire.",
          ],
          ["Former la plèvre autour des poumons", "La plèvre est une structure anatomique."],
        ],
        ["K-DEA-P06-007"],
        FB(
          "Le rôle de la respiration est relié aux besoins des cellules.",
          "S’arrêter au poumon fait oublier que l’oxygène doit ensuite être distribué.",
          "L’oxygène va des alvéoles au sang puis aux cellules.",
          "Relier la mesure respiratoire à l’état global du patient.",
        ),
      ),
      TF(
        "L’oxymètre de pouls estime une saturation pulsée en oxygène appelée SpO₂.",
        true,
        ["K-DEA-P06-012"],
        FB(
          "La SpO₂ est précisément la donnée estimée par cet appareil non invasif.",
          "La confondre avec la fréquence respiratoire mélange deux paramètres différents.",
          "Oxymètre : SpO₂ ; observation : fréquence respiratoire.",
          "Transmettre la valeur avec les signes et les conditions de mesure.",
        ),
        "La proposition décrit le paramètre affiché.",
        "Faux serait incorrect : la SpO₂ est bien la mesure concernée.",
      ),
      MATCH(
        "Associe chaque donnée liée à l’oxygène à sa signification.",
        [
          [
            "Oxygène de l’air ambiant",
            "Environ 21 %",
            "C’est la proportion indiquée dans le support.",
          ],
          [
            "Oxygène de l’air alvéolaire",
            "Environ 16 %",
            "La proportion baisse après les échanges.",
          ],
          ["SpO₂", "Estimation de la saturation pulsée", "Elle est affichée par l’oxymètre."],
          ["Alvéole", "Passage de l’oxygène vers le sang", "Elle constitue la zone d’échange."],
        ],
        ["K-DEA-P06-007", "K-DEA-P06-008", "K-DEA-P06-012"],
        FB(
          "Les associations relient composition, mesure et lieu d’échange.",
          "Confondre pourcentage de gaz dans l’air et saturation du sang mélange deux grandeurs.",
          "21 % décrit l’air ; la SpO₂ estime l’oxygénation pulsée.",
          "Nommer la grandeur transmise et son unité.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre le parcours général de l’oxygène.",
        [
          ["Air ambiant", "L’oxygène est inspiré."],
          ["Alvéoles", "Il atteint la zone d’échange."],
          ["Sang capillaire", "Il traverse l’interface alvéolaire."],
          ["Cellules", "Il est distribué dans l’organisme."],
        ],
        ["K-DEA-P06-007", "K-DEA-P06-008"],
        FB(
          "L’ordre suit le passage du milieu extérieur jusqu’aux cellules.",
          "Placer les cellules avant le sang omet le transport circulatoire.",
          "Air, alvéoles, sang, cellules.",
          "Relier les étapes lors d’une synthèse respiratoire.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : l’oxymètre de pouls affiche une valeur appelée ______.",
        ["SpO₂", "Cette abréviation désigne la saturation pulsée estimée."],
        [
          ["FR", "La FR est le nombre de cycles respiratoires par minute."],
          ["TA", "La TA correspond à la pression artérielle."],
          ["Glasgow", "Le Glasgow apprécie la conscience."],
        ],
        ["K-DEA-P06-012"],
        FB(
          "Le bon sigle permet de transmettre le paramètre sans ambiguïté.",
          "Les appareils peuvent afficher plusieurs données, mais elles ne désignent pas la même mesure.",
          "SpO₂ : saturation pulsée en oxygène.",
          "Annoncer le nom du paramètre et la valeur observée.",
        ),
      ),
      CLINICAL(
        "L’oxymètre affiche une valeur inattendue chez un patient dont les doigts sont froids. Quelle attitude pédagogique est la plus sûre ?",
        [
          "Replacer la mesure dans l’examen clinique et vérifier les conditions de mesure",
          "Le support présente la SpO₂ comme une donnée qui complète l’observation.",
        ],
        [
          [
            "Conclure immédiatement à un diagnostic précis",
            "Une valeur isolée ne suffit pas à établir une cause.",
          ],
          [
            "Ignorer systématiquement toute valeur de SpO₂",
            "La mesure reste utile lorsqu’elle est interprétée avec le contexte.",
          ],
          [
            "Remplacer le comptage de la fréquence par la SpO₂",
            "Les deux paramètres apportent des informations distinctes.",
          ],
        ],
        ["K-DEA-P06-010", "K-DEA-P06-012"],
        FB(
          "La mesure doit être cohérente avec le patient et les conditions techniques.",
          "Un chiffre précis peut donner une illusion de certitude.",
          "Vérifier la mesure, observer le patient, transmettre l’ensemble.",
          "Croiser SpO₂, fréquence, rythme, amplitude et signes.",
          null,
          "Une dégradation clinique prime sur la recherche d’une mesure parfaite.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quelles données complètent utilement une SpO₂ dans un bilan respiratoire ?",
        [
          ["La fréquence respiratoire", "Elle renseigne sur le nombre de cycles."],
          ["Le rythme respiratoire", "Il peut être régulier ou irrégulier."],
          ["L’amplitude des mouvements", "Elle peut être normale, superficielle ou ample."],
          ["Les signes cliniques observés", "Ils contextualisent la mesure."],
        ],
        [
          [
            "Le nombre théorique de lobes uniquement",
            "Cette anatomie ne décrit pas l’état respiratoire instantané.",
          ],
        ],
        ["K-DEA-P06-010", "K-DEA-P06-011", "K-DEA-P06-012"],
        FB(
          "Les paramètres sélectionnés construisent une observation respiratoire complète.",
          "Se fier à un seul écran fait perdre les signes visibles et la dynamique.",
          "SpO₂ plus fréquence, rythme, amplitude et clinique.",
          "Transmettre un ensemble cohérent de données.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Pourquoi ne doit-on pas confondre 21 % d’oxygène dans l’air et une SpO₂ ?",
        [
          "Le premier décrit la composition d’un gaz, la seconde estime une saturation pulsée",
          "Les deux pourcentages portent sur des objets différents.",
        ],
        [
          [
            "Les deux valeurs mesurent exactement la même chose",
            "Composition de l’air et saturation sanguine sont distinctes.",
          ],
          [
            "La SpO₂ mesure le nombre de respirations",
            "Cette donnée correspond à la fréquence respiratoire.",
          ],
          [
            "Les 21 % décrivent la quantité de dioxyde de carbone",
            "Ils correspondent à l’oxygène de l’air ambiant.",
          ],
        ],
        ["K-DEA-P06-008", "K-DEA-P06-012"],
        FB(
          "Le symbole pourcentage ne suffit pas à rendre deux mesures comparables.",
          "Comparer des nombres sans nommer leur grandeur produit une erreur de raisonnement.",
          "Toujours identifier ce que le pourcentage représente.",
          "Annoncer « SpO₂ » plutôt qu’un pourcentage isolé.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
  {
    id: "dea-p06-l07",
    title: "Les principales valeurs normales",
    pages: "71, 72",
    section: "Mesure des paramètres vitaux - fréquence respiratoire et SpO₂",
    objectives: [
      "Mesurer la fréquence respiratoire pendant une minute.",
      "Utiliser les repères adaptés à l’âge.",
      "Décrire rythme et amplitude avec la valeur.",
    ],
    competencyIds: RESP,
    prerequisiteIds: ["dea-p06-l06"],
    questions: [
      MCQ(
        "Quelle plage de fréquence respiratoire au repos le support donne-t-il après 14 ans ?",
        [
          "12 à 20 cycles par minute",
          "Cette plage est indiquée pour l’adulte et le jeune de plus de 14 ans.",
        ],
        [
          ["20 à 30 cycles par minute", "Cette plage est donnée pour l’enfant de 2 à 12 ans."],
          ["30 à 60 cycles par minute", "Cette plage concerne le petit enfant de 1 mois à 2 ans."],
          ["40 à 60 cycles par minute", "Cette plage concerne le nouveau-né de moins d’un mois."],
        ],
        ["K-DEA-P06-011"],
        FB(
          "La réponse dépend de la tranche d’âge demandée.",
          "Appliquer un repère pédiatrique à l’adulte fausse l’interprétation.",
          "Après 14 ans au repos : 12 à 20 cycles par minute.",
          "Toujours transmettre l’âge et le contexte de repos.",
          "Adulte : entre douze et vingt.",
        ),
      ),
      TF(
        "La fréquence respiratoire doit être mesurée pendant une minute chez un patient au repos.",
        true,
        ["K-DEA-P06-010"],
        FB(
          "La durée et le repos font partie de la méthode décrite par le support.",
          "Multiplier un comptage trop court peut masquer une irrégularité.",
          "Repos, observation, une minute.",
          "Observer discrètement le thorax ou l’abdomen.",
        ),
        "La proposition reprend la procédure complète.",
        "Faux serait incorrect : la mesure recommandée dure bien une minute.",
      ),
      MATCH(
        "Associe chaque tranche d’âge à la plage respiratoire du support.",
        [
          ["Plus de 14 ans", "12 à 20 cycles/min", "C’est le repère adulte."],
          ["2 à 12 ans", "20 à 30 cycles/min", "C’est le repère de l’enfant."],
          ["1 mois à 2 ans", "30 à 60 cycles/min", "C’est le repère du petit enfant."],
          ["Moins de 1 mois", "40 à 60 cycles/min", "C’est le repère du nouveau-né."],
        ],
        ["K-DEA-P06-011"],
        FB(
          "Les plages augmentent globalement lorsque l’âge diminue.",
          "Utiliser une seule norme pour tous les âges est l’erreur principale.",
          "Le repère respiratoire dépend de l’âge.",
          "Vérifier l’âge avant de comparer une fréquence.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Remets dans l’ordre la mesure de la fréquence respiratoire.",
        [
          ["Installer ou observer le patient au repos", "Le contexte doit être stabilisé."],
          ["Observer thorax ou abdomen", "Le mouvement permet de compter les cycles."],
          ["Compter pendant une minute", "La durée améliore la fiabilité."],
          ["Noter fréquence, rythme et amplitude", "La transmission ne se limite pas au chiffre."],
        ],
        ["K-DEA-P06-010"],
        FB(
          "La séquence prépare, mesure puis qualifie le résultat.",
          "Annoncer un chiffre avant d’avoir vérifié rythme et amplitude produit un bilan incomplet.",
          "Repos, observation, une minute, description.",
          "Appliquer la même séquence à chaque bilan.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : chez l’adulte au repos, le support situe la fréquence respiratoire entre 12 et ______ cycles par minute.",
        ["20", "La limite supérieure de la plage adulte indiquée est 20."],
        [
          ["30", "Cette valeur appartient à une plage pédiatrique."],
          ["60", "Cette valeur appartient aux tranches d’âge les plus jeunes."],
          ["100", "Cette valeur ne correspond pas au repère décrit."],
        ],
        ["K-DEA-P06-011"],
        FB(
          "Le nombre complète la plage spécifique demandée.",
          "Mémoriser les valeurs sans leur tranche d’âge favorise les inversions.",
          "Adulte au repos : 12 à 20.",
          "Associer toujours nombre, unité, âge et contexte.",
        ),
      ),
      CLINICAL(
        "Un enfant de 6 ans au repos a une fréquence respiratoire de 24 cycles/min, régulière et d’amplitude normale. Quelle transmission est la plus complète ?",
        [
          "Enfant de 6 ans au repos : FR 24/min, régulière, amplitude normale",
          "La formulation contient âge, contexte, chiffre, rythme et amplitude.",
        ],
        [
          ["Respiration normale", "Cette conclusion seule supprime les données mesurées."],
          ["FR 24", "Il manque unité, âge, repos, rythme et amplitude."],
          [
            "Patient sans problème respiratoire",
            "La mesure isolée ne permet pas cette conclusion générale.",
          ],
        ],
        ["K-DEA-P06-010", "K-DEA-P06-011"],
        FB(
          "La transmission factuelle permet au destinataire d’interpréter les données.",
          "Remplacer les observations par « normal » masque les éléments utiles.",
          "Transmettre les faits avant l’interprétation.",
          "Donner âge, contexte, valeur, rythme et amplitude.",
          null,
          "Une valeur dans une plage ne suffit jamais à exclure une détresse si les signes cliniques sont inquiétants.",
        ),
      ),
      MULTI(
        "Quelles caractéristiques faut-il observer en plus du nombre de cycles ?",
        [
          ["La régularité", "Le rythme peut être régulier ou irrégulier."],
          ["L’amplitude", "Les mouvements peuvent être superficiels, normaux ou amples."],
          [
            "Les mouvements du thorax ou de l’abdomen",
            "Ils servent au comptage et à l’observation.",
          ],
        ],
        [
          [
            "Le nombre de lobes pulmonaires",
            "Cette donnée anatomique ne varie pas pendant la mesure.",
          ],
        ],
        ["K-DEA-P06-010", "K-DEA-P06-011"],
        FB(
          "Ces observations qualifient la mécanique respiratoire visible.",
          "Un chiffre seul paraît précis mais peut cacher une respiration inefficace.",
          "Fréquence plus rythme plus amplitude.",
          "Intégrer les trois éléments au bilan.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quelle plage de SpO₂ le support présente-t-il comme normale ?",
        [
          "95 % à 100 %",
          "Cette plage est explicitement indiquée sur la page consacrée à l’oxymètre.",
        ],
        [
          ["12 % à 20 %", "Ces nombres évoquent la fréquence adulte, pas une saturation."],
          ["20 % à 30 %", "Cette plage ne correspond pas à la SpO₂ normale."],
          ["40 % à 60 %", "Cette plage ne correspond pas à une valeur normale de SpO₂."],
        ],
        ["K-DEA-P06-012"],
        FB(
          "La plage demandée concerne la SpO₂ et non un nombre de cycles.",
          "Mélanger les unités fait choisir une plage respiratoire à la place d’une saturation.",
          "SpO₂ normale du support : 95 à 100 %.",
          "Nommer le paramètre avec la valeur et le contexte.",
          null,
          "Le support contient deux seuils différents pour l’hypoxémie ; aucune décision de seuil n’est enseignée ici avant validation formateur.",
        ),
      ),
    ],
  },
  {
    id: "dea-p06-l08",
    title: "Synthèse",
    pages: "23-26, 71-72",
    section: "Appareil respiratoire - synthèse anatomique, physiologique et paramétrique",
    objectives: [
      "Reconstituer le trajet de l’air.",
      "Relier ventilation et échanges.",
      "Construire une transmission respiratoire factuelle.",
    ],
    competencyIds: SYSTEM,
    prerequisiteIds: ["dea-p06-l07"],
    questions: [
      MCQ(
        "Quelle séquence résume correctement le parcours de l’air et de l’oxygène ?",
        [
          "Voies aériennes, alvéoles, capillaires, cellules",
          "Les conduits amènent l’air aux alvéoles, puis l’oxygène rejoint le sang et les cellules.",
        ],
        [
          [
            "Alvéoles, plèvre, pharynx, cellules",
            "La plèvre n’est pas une étape du trajet de l’air.",
          ],
          [
            "Diaphragme, cellules, bronches, capillaires",
            "Le diaphragme agit sur le volume mais ne conduit pas l’oxygène.",
          ],
          [
            "Capillaires, fosses nasales, alvéoles, bronches",
            "L’ordre est inversé et mélange air et sang.",
          ],
        ],
        ["K-DEA-P06-003", "K-DEA-P06-007"],
        FB(
          "La séquence distingue conduction de l’air puis transfert sanguin.",
          "Mélanger structures mécaniques et voies de passage rend le trajet incohérent.",
          "Voies aériennes vers alvéoles, puis sang vers cellules.",
          "Utiliser cette chaîne pour vérifier un raisonnement.",
        ),
      ),
      TF(
        "Une fréquence respiratoire dans la plage attendue suffit, à elle seule, à conclure que la respiration est efficace.",
        false,
        ["K-DEA-P06-010", "K-DEA-P06-011", "K-DEA-P06-012"],
        FB(
          "La fréquence doit être complétée par rythme, amplitude, signes cliniques et mesures disponibles.",
          "Une valeur rassurante peut faire négliger une respiration superficielle ou un patient qui se dégrade.",
          "Aucun chiffre respiratoire ne remplace l’observation globale.",
          "Transmettre toutes les données et leur évolution.",
          null,
          "L’état clinique prime sur une valeur isolée.",
        ),
        "Vrai serait incorrect : une plage attendue n’exclut pas une anomalie.",
        "Faux est correct car plusieurs dimensions doivent être évaluées.",
      ),
      MATCH(
        "Associe chaque composant à sa fonction principale.",
        [
          ["Voies aériennes", "Conduire l’air", "Elles relient l’extérieur aux zones d’échange."],
          ["Diaphragme", "Créer le mouvement ventilatoire", "Il modifie le volume thoracique."],
          ["Alvéoles", "Permettre les échanges gazeux", "Elles sont au contact des capillaires."],
          ["Oxymètre", "Estimer la SpO₂", "Il fournit une mesure non invasive."],
        ],
        ["K-DEA-P06-001", "K-DEA-P06-005", "K-DEA-P06-007", "K-DEA-P06-012"],
        FB(
          "Chaque élément correspond à une étape différente de la fonction respiratoire.",
          "Attribuer toutes les fonctions aux poumons empêche de distinguer le système.",
          "Conduire, ventiler, échanger, mesurer.",
          "Structurer le bilan par fonction.",
        ),
        { difficulty: "medium" },
      ),
      ORDER(
        "Reconstitue une évaluation respiratoire factuelle simple.",
        [
          ["Observer le patient au repos", "L’observation clinique vient d’abord."],
          ["Compter les cycles pendant une minute", "La fréquence est mesurée."],
          ["Qualifier rythme et amplitude", "La qualité des mouvements est décrite."],
          ["Relever la SpO₂ si disponible", "La mesure complète le bilan."],
          ["Transmettre les données et leur contexte", "Les faits sont communiqués ensemble."],
        ],
        ["K-DEA-P06-010", "K-DEA-P06-012"],
        FB(
          "La séquence va de l’observation à la transmission structurée.",
          "Commencer par l’appareil peut faire négliger le patient.",
          "Patient d’abord, mesure ensuite, transmission complète.",
          "Suivre la même trame pour limiter les oublis.",
        ),
        { difficulty: "medium" },
      ),
      FILL(
        "Complète : le lieu des échanges entre air et sang est l’interface alvéolo-______.",
        ["capillaire", "Les capillaires pulmonaires sont au contact des alvéoles."],
        [
          ["pleurale", "La plèvre entoure les poumons."],
          ["trachéale", "La trachée conduit l’air."],
          ["diaphragmatique", "Le diaphragme participe à la ventilation."],
        ],
        ["K-DEA-P06-007"],
        FB(
          "Le mot complète le nom des deux côtés de l’interface d’échange.",
          "Choisir une structure voisine ne suffit pas : il faut la zone en contact avec le sang.",
          "Alvéole côté air, capillaire côté sang.",
          "Relier l’anatomie à la fonction d’échange.",
        ),
      ),
      CLINICAL(
        "Un adulte au repos présente une FR à 18/min, irrégulière et superficielle. Quelle donnée doit être transmise ?",
        [
          "La valeur 18/min ainsi que le caractère irrégulier et superficiel",
          "Le chiffre est dans la plage adulte, mais la qualité des mouvements reste anormale à signaler.",
        ],
        [
          ["Seulement « FR normale »", "Cette formule masque rythme et amplitude."],
          [
            "Seulement la SpO₂ même si elle n’a pas été mesurée",
            "Une donnée absente ne doit pas être inventée.",
          ],
          [
            "Aucune information puisque 18 est dans la plage",
            "Le rythme et l’amplitude imposent une transmission.",
          ],
        ],
        ["K-DEA-P06-010", "K-DEA-P06-011"],
        FB(
          "La fréquence ne doit pas effacer les caractéristiques observées.",
          "Réduire le bilan à une plage numérique peut masquer une ventilation anormale.",
          "Un nombre attendu n’annule pas des signes anormaux.",
          "Transmettre valeur, rythme, amplitude et évolution.",
          null,
          "Ne jamais inventer une mesure non réalisée.",
        ),
        { difficulty: "medium" },
      ),
      MULTI(
        "Quelles données appartiennent à une synthèse respiratoire complète au niveau de cette leçon ?",
        [
          ["Le trajet des voies aériennes", "Il situe la conduction de l’air."],
          ["Les mouvements du diaphragme", "Ils expliquent la ventilation."],
          ["Le lieu des échanges gazeux", "Il relie alvéoles et capillaires."],
          ["La fréquence, le rythme et l’amplitude", "Ils décrivent la respiration observée."],
          ["La SpO₂ si elle est mesurée", "Elle complète l’observation."],
        ],
        [
          [
            "Un diagnostic déduit d’une seule valeur",
            "La leçon demande des données factuelles, pas un diagnostic isolé.",
          ],
        ],
        ["K-DEA-P06-001", "K-DEA-P06-005", "K-DEA-P06-007", "K-DEA-P06-010", "K-DEA-P06-012"],
        FB(
          "Les éléments sélectionnés couvrent anatomie, mécanique, échanges et paramètres.",
          "Chercher une conclusion unique trop tôt réduit la qualité du bilan.",
          "Comprendre le système puis observer et transmettre.",
          "Utiliser une trame pour ne pas omettre une dimension.",
        ),
        { difficulty: "medium" },
      ),
      MCQ(
        "Quelle distinction résume correctement les deux paramètres respiratoires étudiés ?",
        [
          "La fréquence compte des cycles par minute, la SpO₂ estime une saturation en pourcentage",
          "Les deux paramètres utilisent des unités et des méthodes différentes.",
        ],
        [
          [
            "La fréquence et la SpO₂ mesurent toutes deux un volume en litres",
            "Aucune de ces deux données n’est un volume.",
          ],
          [
            "La SpO₂ compte les mouvements thoraciques",
            "Le comptage des mouvements donne la fréquence.",
          ],
          [
            "La fréquence estime directement l’oxygène du sang",
            "Cette estimation correspond à l’oxymètre.",
          ],
        ],
        ["K-DEA-P06-010", "K-DEA-P06-012"],
        FB(
          "Nommer la grandeur et son unité évite de confondre les deux mesures.",
          "Deux valeurs numériques affichées côte à côte peuvent sembler interchangeables.",
          "FR en cycles/min ; SpO₂ en pourcentage.",
          "Transmettre chaque paramètre avec son nom et son unité.",
        ),
        { difficulty: "medium" },
      ),
    ],
  },
];

const BOSS = {
  id: "dea-p06-boss",
  title: "Boss - Système respiratoire",
  pages: "23-26, 71-72",
  section: "Appareil respiratoire - Boss de synthèse",
  competencyIds: SYSTEM,
  questions: [
    ORDER(
      "Reconstitue le trajet anatomique de l’air jusqu’à la zone d’échange.",
      [
        ["Fosses nasales ou bouche", "L’air entre dans les voies aériennes."],
        ["Pharynx", "Il constitue un passage commun."],
        ["Larynx et trachée", "Ils conduisent vers le thorax."],
        ["Bronches puis bronchioles", "Les conduits se ramifient."],
        ["Alvéoles", "Elles constituent la zone d’échange."],
      ],
      ["K-DEA-P06-002", "K-DEA-P06-003", "K-DEA-P06-007"],
      FB(
        "La séquence suit l’arbre respiratoire de l’extérieur vers les alvéoles.",
        "Sauter ou inverser une ramification empêche de localiser correctement une obstruction.",
        "Du nez aux alvéoles, le calibre se ramifie.",
        "Utiliser le trajet pour structurer une description.",
      ),
      { difficulty: "medium" },
    ),
    MATCH(
      "Associe chaque élément du système respiratoire à sa fonction.",
      [
        ["Voies aériennes", "Conduction de l’air", "Elles forment les passages."],
        ["Diaphragme", "Mécanique ventilatoire", "Il modifie le volume thoracique."],
        ["Alvéoles", "Échanges gazeux", "Elles sont au contact des capillaires."],
        ["Centres neurologiques", "Commande respiratoire", "Ils participent à la régulation."],
      ],
      ["K-DEA-P06-001", "K-DEA-P06-005", "K-DEA-P06-007", "K-DEA-P06-009"],
      FB(
        "Les quatre associations reconstruisent l’organisation fonctionnelle du système.",
        "Réduire la respiration aux poumons seuls fait oublier commande, conduits et mécanique.",
        "Commander, conduire, ventiler, échanger.",
        "Identifier l’étape concernée dans une situation.",
      ),
      { difficulty: "medium" },
    ),
    CLINICAL(
      "Un adulte au repos présente une FR à 18/min, irrégulière, avec des mouvements superficiels. Quel bilan est le plus fidèle ?",
      [
        "FR 18/min au repos, rythme irrégulier, amplitude superficielle",
        "La transmission conserve le chiffre et les caractéristiques anormales observées.",
      ],
      [
        [
          "Respiration normale car la fréquence est entre 12 et 20",
          "La plage numérique n’annule pas rythme et amplitude.",
        ],
        [
          "Détresse confirmée par la seule fréquence",
          "La fréquence isolée ne suffit pas à confirmer une cause.",
        ],
        ["SpO₂ normale", "Aucune SpO₂ n’est fournie."],
      ],
      ["K-DEA-P06-010", "K-DEA-P06-011"],
      FB(
        "La réponse transmet uniquement des faits disponibles et utiles.",
        "Résumer par « normal » ou inventer une mesure supprime la nuance clinique.",
        "Valeur, contexte, rythme et amplitude.",
        "Faire un bilan structuré sans poser de diagnostic.",
        null,
        "Toute aggravation clinique doit être signalée sans attendre une mesure supplémentaire.",
      ),
      { difficulty: "medium" },
    ),
    MULTI(
      "Quelles affirmations distinguent correctement ventilation et échanges gazeux ?",
      [
        ["La ventilation déplace l’air", "Elle alterne inspiration et expiration."],
        [
          "Les échanges font passer l’oxygène vers le sang",
          "Ils se produisent au niveau alvéolo-capillaire.",
        ],
        ["Le dioxyde de carbone passe vers l’air alvéolaire", "Il est ensuite expiré."],
      ],
      [["Le diaphragme réalise directement les échanges sanguins", "Il assure un rôle mécanique."]],
      ["K-DEA-P06-005", "K-DEA-P06-007"],
      FB(
        "Les propositions séparent le mouvement d’air du transfert des gaz.",
        "Confondre le muscle ventilatoire avec l’interface d’échange est une erreur fréquente.",
        "Ventiler amène l’air ; échanger transfère les gaz.",
        "Croiser mécanique visible et oxygénation mesurée.",
      ),
      { difficulty: "medium" },
    ),
    MCQ(
      "Chez un enfant de 6 ans au repos, quelle plage de fréquence respiratoire le support indique-t-il ?",
      ["20 à 30 cycles par minute", "La tranche 2 à 12 ans utilise ce repère."],
      [
        ["12 à 20 cycles par minute", "Cette plage est donnée après 14 ans."],
        ["30 à 60 cycles par minute", "Cette plage concerne 1 mois à 2 ans."],
        ["40 à 60 cycles par minute", "Cette plage concerne moins d’un mois."],
      ],
      ["K-DEA-P06-011"],
      FB(
        "L’âge de six ans place l’enfant dans la tranche 2 à 12 ans.",
        "Appliquer automatiquement la plage adulte néglige les différences liées à l’âge.",
        "De 2 à 12 ans : 20 à 30 cycles/min au repos.",
        "Toujours annoncer l’âge avec la fréquence.",
      ),
      { difficulty: "medium" },
    ),
    TF(
      "Une SpO₂ chiffrée remplace l’observation du rythme et de l’amplitude respiratoires.",
      false,
      ["K-DEA-P06-010", "K-DEA-P06-012"],
      FB(
        "La mesure complète l’examen mais ne remplace pas les mouvements et signes observés.",
        "La précision numérique de l’appareil peut faire oublier ses limites et le patient.",
        "Appareil et clinique se complètent.",
        "Transmettre SpO₂, fréquence, rythme, amplitude et signes.",
        null,
        "Ne jamais retarder une prise en charge urgente pour obtenir un chiffre.",
      ),
      "Vrai serait incorrect : la SpO₂ ne décrit ni rythme ni amplitude.",
      "Faux est correct car les données sont complémentaires.",
      { difficulty: "medium" },
    ),
    FILL(
      "Complète : pendant l’inspiration, le diaphragme se contracte, s’abaisse et le volume ______ augmente.",
      ["thoracique", "L’augmentation du volume thoracique accompagne l’entrée d’air."],
      [
        ["alvéolaire uniquement", "Le support décrit d’abord le volume de la cage thoracique."],
        ["cardiaque", "Le cœur ne constitue pas la mécanique inspiratoire."],
        ["digestif", "Ce terme ne correspond pas au cycle ventilatoire."],
      ],
      ["K-DEA-P06-005"],
      FB(
        "Le mot relie l’action du diaphragme à la cage thoracique.",
        "Se concentrer sur un organe isolé fait perdre la mécanique globale.",
        "Diaphragme abaissé, volume thoracique augmenté, air entrant.",
        "Expliquer le mouvement respiratoire en trois étapes.",
      ),
      { difficulty: "medium" },
    ),
    MCQ(
      "Quelle transmission est la plus sûre face à une valeur de SpO₂ inattendue ?",
      [
        "Donner la valeur, les signes cliniques et les conditions de mesure",
        "La mesure prend son sens lorsqu’elle est intégrée au bilan global.",
      ],
      [
        ["Donner uniquement le pourcentage", "Le chiffre isolé manque de contexte."],
        [
          "Annoncer un diagnostic à partir de la valeur",
          "Une mesure seule ne détermine pas une cause.",
        ],
        [
          "Remplacer la valeur par « respiration correcte »",
          "Cette formule perd l’information mesurée.",
        ],
      ],
      ["K-DEA-P06-010", "K-DEA-P06-012"],
      FB(
        "La transmission combine donnée instrumentale, observation et fiabilité.",
        "Un chiffre unique peut conduire à une interprétation excessive.",
        "Mesurer, vérifier, observer, transmettre.",
        "Présenter des faits et leur évolution au régulateur.",
        null,
        "L’état clinique doit toujours rester prioritaire.",
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
    tags: config.tags || ["dea", "parcours-06", "respiration"],
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
    tags: ["dea", "parcours-06", "validation-a-effectuer"],
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
    tags: ["dea", "parcours-06", "boss", "validation-a-effectuer"],
    pedagogicalReference: SOURCE_TITLE + ", p. " + boss.pages,
    pulse: null,
    selection: { strategy: "all", count: items.length },
    learningObjectives: [
      "Relier voies aériennes, ventilation et échanges gazeux.",
      "Mesurer et transmettre les principaux paramètres respiratoires.",
      "Choisir une formulation factuelle adaptée au niveau DEA.",
    ],
    competencyIds: boss.competencyIds,
    prerequisiteIds: ["dea-p06-l08"],
    bossConfiguration: {
      objective: "Valider les bases du système respiratoire au niveau DEA.",
      scenario:
        "L’apprenant reconstitue le trajet de l’air, analyse des observations simples et sélectionne une transmission respiratoire factuelle.",
      tasks: [
        "Reconstituer le trajet de l’air.",
        "Distinguer ventilation et échanges.",
        "Mesurer et transmettre fréquence, rythme, amplitude et SpO₂ disponible.",
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
  if (KNOWLEDGE.length !== 12) throw new Error("Le Parcours 6 doit contenir 12 connaissances.");
  if (LESSONS.length !== 8) throw new Error("Le Parcours 6 doit contenir 8 leçons.");
  for (const lesson of LESSONS) {
    if (lesson.questions.length !== 8) {
      throw new Error(lesson.id + " doit contenir exactement 8 questions.");
    }
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
  const scope =
    "appareil respiratoire, pages 23 à 27 ; fréquence respiratoire et oxymétrie, pages 71 à 72";
  if (!String(document.analyzed_scope || "").includes("appareil respiratoire")) {
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
  "Parcours 6 généré : " +
    KNOWLEDGE.length +
    " connaissances, " +
    LESSONS.length * 8 +
    " questions de leçon et 8 questions de Boss.",
);
