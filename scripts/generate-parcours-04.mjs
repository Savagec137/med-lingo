import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "src", "content", "formations", "dea", "parcours-04");
const SOURCE_ID = "DOC-AFTRAL-DEA-B2-M4-2022";
const SOURCE_TITLE = "B2.M4 - Support Etudiant.pdf";
const SOURCE_VERSION = "Version 1 - Août 2022";
const PARCOURS_ID = "parcours-04";
const CONTENT_ID = "dea-p04";

const source = (section, pages) => ({ section, pages, pageStatus: "verified" });

const KNOWLEDGE = [
  {
    knowledgeId: "K-DEA-P04-001",
    title: "Composition et rôle de l’appareil locomoteur",
    summary:
      "L’appareil locomoteur associe les os, les articulations, les muscles et leurs structures de liaison pour soutenir le corps et permettre le mouvement.",
    keyPoints: [
      "Le squelette forme la charpente du corps.",
      "Les articulations organisent la mobilité entre les os.",
      "Les muscles produisent le mouvement des segments osseux.",
    ],
    commonErrors: [
      "Réduire l’appareil locomoteur aux seuls os.",
      "Confondre articulation et muscle.",
    ],
    clinicalApplication:
      "Nommer séparément l’os, l’articulation et le segment corporel concernés améliore la précision d’un repérage.",
    ...source("Appareil locomoteur - vue d’ensemble", [34, 35, 36, 37]),
    competencyIds: ["body.system.locomotor"],
    lessonIds: ["dea-p04-l01", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-002",
    title: "Organisation générale du squelette",
    summary:
      "Le squelette compte plus de 200 os et s’organise en trois grandes parties : la tête, le tronc et les membres.",
    keyPoints: [
      "La tête comprend le crâne et la face.",
      "Le tronc comprend notamment le rachis, les côtes et le sternum.",
      "Les membres comprennent les membres supérieurs et inférieurs.",
    ],
    commonErrors: ["Classer le sternum ou les côtes parmi les membres."],
    clinicalApplication:
      "Cette organisation permet de situer d’abord une zone dans une grande partie du squelette.",
    ...source("Appareil locomoteur - Les os", [35]),
    competencyIds: ["body.system.locomotor", "anatomy.landmarks"],
    lessonIds: ["dea-p04-l01", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-003",
    title: "Catégories d’os",
    summary:
      "Le support distingue les os courts, les os plats et les os longs ; il identifie le sternum comme os plat et l’humérus comme os long.",
    keyPoints: [
      "Trois catégories sont citées : courts, plats et longs.",
      "Le sternum est explicitement présenté comme un os plat.",
      "L’humérus illustre la structure d’un os long.",
    ],
    commonErrors: ["Déduire du support un exemple d’os court qu’il ne précise pas explicitement."],
    clinicalApplication:
      "La catégorie d’un os aide à organiser les repères anatomiques sans remplacer l’identification précise de l’os.",
    ...source("Appareil locomoteur - Les os", [35, 36]),
    competencyIds: ["body.system.locomotor"],
    lessonIds: ["dea-p04-l01", "dea-p04-l02", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-004",
    title: "Principaux os et repères du squelette",
    summary:
      "Le support localise notamment le crâne, les vertèbres, la clavicule, le sternum, les côtes, l’humérus, le radius, le cubitus, le fémur, la rotule, le tibia et le péroné.",
    keyPoints: [
      "L’humérus appartient au bras.",
      "Le radius et le cubitus appartiennent à l’avant-bras.",
      "Le fémur appartient à la cuisse ; le tibia et le péroné à la jambe.",
    ],
    commonErrors: [
      "Employer bras pour désigner tout le membre supérieur.",
      "Employer jambe pour désigner tout le membre inférieur.",
    ],
    clinicalApplication:
      "Utiliser le nom du segment et de l’os visible sur le schéma rend une localisation moins vague.",
    ...source("Appareil locomoteur - schéma des repères osseux", [34, 35]),
    competencyIds: ["anatomy.landmarks", "anatomy.location.description"],
    lessonIds: ["dea-p04-l02", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-005",
    title: "Structure d’un os long",
    summary:
      "Un os long comprend une diaphyse centrale et deux épiphyses couvertes de cartilage articulaire.",
    keyPoints: [
      "La diaphyse correspond au corps de l’os long.",
      "Les épiphyses correspondent aux deux extrémités.",
      "Le cartilage articulaire recouvre les extrémités décrites.",
    ],
    commonErrors: ["Inverser diaphyse et épiphyses."],
    clinicalApplication:
      "Les termes diaphyse et épiphyse permettent de décrire plus précisément une zone d’un os long.",
    ...source("Appareil locomoteur - Un os long", [36]),
    competencyIds: ["body.system.locomotor", "anatomy.location.description"],
    lessonIds: ["dea-p04-l02", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-006",
    title: "Articulation, mobilité et stabilité",
    summary:
      "Une articulation se situe à l’union de deux os, organise leur mobilité et est stabilisée par des ligaments.",
    keyPoints: [
      "Les surfaces articulaires sont cartilagineuses.",
      "Le liquide synovial se trouve dans la capsule synoviale.",
      "Les ligaments participent à la stabilité.",
    ],
    commonErrors: ["Confondre ligament, qui stabilise l’articulation, et tendon."],
    clinicalApplication:
      "Repérer une articulation aide à distinguer une douleur articulaire d’une douleur située sur un segment osseux.",
    ...source("Appareil locomoteur - Les articulations", [36]),
    competencyIds: ["body.system.locomotor", "anatomy.landmarks"],
    lessonIds: ["dea-p04-l03", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-007",
    title: "Mouvements articulaires",
    summary:
      "Le support cite la flexion, l’extension, l’adduction, l’abduction et la rotation parmi les mouvements permis par les articulations.",
    keyPoints: [
      "Les articulations peuvent être fixes, semi-mobiles ou mobiles.",
      "Les os du crâne illustrent les articulations fixes.",
      "Le coude illustre une articulation mobile.",
    ],
    commonErrors: ["Prendre un mouvement articulaire pour une région anatomique."],
    clinicalApplication:
      "Décrire le mouvement possible ou limité complète la localisation de l’articulation concernée.",
    ...source("Appareil locomoteur - Les articulations", [36]),
    competencyIds: ["body.system.locomotor", "anatomy.location.description"],
    lessonIds: ["dea-p04-l03", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-008",
    title: "Muscles et tendons",
    summary:
      "Les contractions et relaxations musculaires génèrent le mouvement des segments osseux, les muscles s’insérant sur eux par l’intermédiaire de tendons.",
    keyPoints: [
      "Le tendon assure l’intermédiaire entre le muscle et le segment osseux.",
      "Les muscles striés décrits obéissent à la volonté.",
      "Les muscles lisses décrits n’obéissent pas à la volonté.",
    ],
    commonErrors: ["Dire qu’un tendon relie deux os entre eux."],
    clinicalApplication:
      "Distinguer muscle, tendon et os évite de confondre les structures lors d’un repérage.",
    ...source("Appareil locomoteur - Les muscles", [37]),
    competencyIds: ["body.system.locomotor", "anatomy.landmarks"],
    lessonIds: ["dea-p04-l04", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-009",
    title: "Propriétés et rôles des muscles",
    summary:
      "Les muscles sont contractiles, élastiques et excitables ; ils participent au mouvement, au travail, à l’équilibre et à la production de chaleur.",
    keyPoints: [
      "La contraction et la relaxation participent au mouvement.",
      "Les muscles contribuent au maintien de l’équilibre.",
      "Les muscles participent à la production de chaleur.",
    ],
    commonErrors: ["Limiter le rôle musculaire à la seule pratique sportive."],
    clinicalApplication:
      "Connaître ces rôles aide à interpréter la fonction générale d’un groupe musculaire sans poser de diagnostic.",
    ...source("Appareil locomoteur - Les muscles", [37]),
    competencyIds: ["body.system.locomotor"],
    lessonIds: ["dea-p04-l04", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-010",
    title: "Rachis et répartition des vertèbres",
    summary:
      "Le rachis appartient au tronc et le support le décrit comme une colonne de 33 vertèbres réparties en régions cervicale, dorsale, lombaire, sacrée et coccygienne.",
    keyPoints: [
      "7 vertèbres cervicales.",
      "12 vertèbres dorsales et 5 lombaires.",
      "5 vertèbres sacrées et 4 à 6 coccygiennes dans le décompte présenté.",
    ],
    commonErrors: ["Inverser le nombre de vertèbres cervicales et dorsales."],
    clinicalApplication:
      "Nommer la région cervicale, dorsale ou lombaire améliore la précision d’une localisation sur le rachis.",
    ...source("Appareil locomoteur - Les os - Le tronc", [35]),
    competencyIds: ["anatomy.landmarks", "anatomy.location.description"],
    lessonIds: ["dea-p04-l05", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-011",
    title: "Repères du membre supérieur",
    summary:
      "Le membre supérieur comprend la ceinture scapulaire, l’humérus, le cubitus, le radius, le carpe, les métacarpes et les phalanges.",
    keyPoints: [
      "L’humérus correspond au bras.",
      "Le cubitus et le radius correspondent à l’avant-bras.",
      "Le carpe, les métacarpes et les phalanges structurent le poignet, la main et les doigts.",
    ],
    commonErrors: ["Confondre bras et avant-bras."],
    clinicalApplication:
      "Situer un repère au bras, à l’avant-bras, au poignet, à la main ou aux doigts rend la description exploitable.",
    ...source("Appareil locomoteur - schéma et membres supérieurs", [34, 35]),
    competencyIds: ["anatomy.region.upper-limb", "anatomy.landmarks"],
    lessonIds: ["dea-p04-l06", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-012",
    title: "Repères du membre inférieur",
    summary:
      "Le membre inférieur comprend le bassin, le fémur, la rotule, le tibia, le péroné, le tarse, les métatarses et les phalanges.",
    keyPoints: [
      "Le fémur correspond à la cuisse.",
      "Le tibia et le péroné correspondent à la jambe.",
      "Le tarse, les métatarses et les phalanges structurent la cheville, le pied et les orteils.",
    ],
    commonErrors: ["Employer jambe pour désigner la cuisse ou tout le membre inférieur."],
    clinicalApplication:
      "Situer un repère à la cuisse, au genou, à la jambe, à la cheville ou au pied précise la transmission.",
    ...source("Appareil locomoteur - schéma et membres inférieurs", [34, 35]),
    competencyIds: ["anatomy.region.lower-limb", "anatomy.landmarks"],
    lessonIds: ["dea-p04-l07", "dea-p04-l08", "dea-p04-boss"],
  },
  {
    knowledgeId: "K-DEA-P04-013",
    title: "Repères anatomiques locomoteurs pour la description",
    summary:
      "Le schéma distingue les segments du membre supérieur et du membre inférieur ainsi que leurs principaux repères osseux et articulaires.",
    keyPoints: [
      "Membre supérieur : épaule, bras, coude, avant-bras, poignet, main, doigts.",
      "Membre inférieur : hanche, cuisse, genou, jambe, cheville, pied, orteils.",
      "Un segment corporel et un repère osseux ne sont pas interchangeables.",
    ],
    commonErrors: [
      "Décrire une localisation par des expressions vagues comme « en bas » ou « au bras » pour tout le membre supérieur.",
    ],
    clinicalApplication:
      "Associer segment, côté et repère anatomique améliore la précision du bilan descriptif.",
    ...source("Appareil locomoteur - schéma des repères anatomiques", [34]),
    competencyIds: [
      "anatomy.landmarks",
      "anatomy.location.description",
      "anatomy.location.injury",
      "anatomy.location.transmission",
    ],
    lessonIds: ["dea-p04-l02", "dea-p04-l06", "dea-p04-l07", "dea-p04-l08", "dea-p04-boss"],
  },
].map((entry) => ({
  ...entry,
  sourceDocument: SOURCE_ID,
  sourceTitle: SOURCE_TITLE,
  sourceType: "training_source",
  plannedParcoursIds: [PARCOURS_ID],
  status: "to_validate",
}));

function option(text, explanation, { correct = false, distractorType, match } = {}) {
  return { text, explanation, correct, distractorType, match };
}

function feedback(whyCorrect, commonMistake, keyTakeaway, fieldApplication, extras = {}) {
  return { whyCorrect, commonMistake, keyTakeaway, fieldApplication, ...extras };
}

function question(config) {
  return config;
}

const LESSONS = [
  {
    id: "dea-p04-l01",
    title: "Le squelette humain",
    pages: "35",
    section: "Appareil locomoteur - Les os",
    objectives: [
      "Identifier le rôle général du squelette.",
      "Distinguer la tête, le tronc et les membres.",
      "Reconnaître les trois catégories d’os citées par le support.",
    ],
    competencyIds: ["body.system.locomotor", "anatomy.landmarks"],
    questions: [
      question({
        kind: "single",
        prompt: "Quel rôle général le support attribue-t-il au squelette ?",
        options: [
          option(
            "Former la charpente du corps humain",
            "Le support définit le squelette comme la charpente du corps.",
            { correct: true },
          ),
          option(
            "Assurer seul la circulation du sang",
            "La circulation relève de l’appareil circulatoire, pas du squelette seul.",
            { distractorType: "other-context" },
          ),
          option(
            "Produire seul tous les mouvements",
            "Le mouvement implique aussi les articulations et les muscles.",
            { distractorType: "frequent-error" },
          ),
          option(
            "Commander les informations nerveuses",
            "Cette fonction appartient au système nerveux.",
            { distractorType: "other-context" },
          ),
        ],
        knowledgeIds: ["K-DEA-P04-002"],
        tags: ["squelette", "role"],
        feedback: feedback(
          "Le support présente le squelette comme la charpente du corps humain : il en constitue l’armature.",
          "Une erreur fréquente consiste à attribuer au squelette, seul, toutes les fonctions de l’appareil locomoteur.",
          "Le squelette soutient la structure corporelle ; le mouvement mobilise aussi articulations et muscles.",
          "Commencer un repérage en identifiant la grande structure osseuse concernée.",
          { memoryTip: "Squelette = charpente." },
        ),
      }),
      question({
        kind: "true_false",
        prompt: "Le squelette est formé d’os et d’articulations.",
        correct: true,
        trueExplanation:
          "Le support associe explicitement os et articulations dans la composition du squelette.",
        falseExplanation:
          "Faux serait incorrect : les articulations font partie de l’organisation décrite du squelette.",
        knowledgeIds: ["K-DEA-P04-001", "K-DEA-P04-002"],
        tags: ["squelette", "composition"],
        feedback: feedback(
          "La proposition reprend la composition indiquée dans le support : des os et des articulations.",
          "Oublier les articulations conduit à réduire le squelette à une simple collection d’os.",
          "Os et articulations structurent ensemble le squelette.",
          "Lors d’un repérage, distinguer une zone osseuse d’une zone articulaire.",
        ),
      }),
      question({
        kind: "single",
        prompt: "En combien de grandes parties le support divise-t-il le squelette ?",
        options: [
          option("Deux", "Le support ne retient pas une division en deux parties."),
          option("Trois", "La tête, le tronc et les membres forment les trois parties décrites.", {
            correct: true,
          }),
          option(
            "Quatre",
            "Les membres supérieurs et inférieurs restent regroupés dans la partie « membres ».",
            { distractorType: "frequent-error" },
          ),
          option(
            "Sept",
            "Sept correspond au nombre d’appareils dans un autre tableau du support, pas aux parties du squelette.",
            { distractorType: "other-context" },
          ),
        ],
        knowledgeIds: ["K-DEA-P04-002"],
        tags: ["squelette", "organisation"],
        feedback: feedback(
          "Le squelette est divisé en trois parties : la tête, le tronc et les membres.",
          "Compter séparément les membres supérieurs et inférieurs conduit à une division différente de celle du support.",
          "Retenir l’organisation tête - tronc - membres.",
          "Cette première classification permet de situer rapidement une zone corporelle.",
          { memoryTip: "TTM : Tête, Tronc, Membres." },
        ),
      }),
      question({
        kind: "matching",
        prompt: "Associe chaque grande partie du squelette aux éléments décrits dans le support.",
        instruction: "Associe chaque partie à sa description.",
        options: [
          option("Tête", "La tête comprend le crâne et la face.", { match: "Crâne et face" }),
          option("Tronc", "Le tronc comprend notamment le rachis, les côtes et le sternum.", {
            match: "Rachis, côtes et sternum",
          }),
          option("Membres", "Cette partie regroupe les membres supérieurs et inférieurs.", {
            match: "Membres supérieurs et inférieurs",
          }),
        ],
        knowledgeIds: ["K-DEA-P04-002"],
        tags: ["squelette", "association"],
        feedback: feedback(
          "Chaque association suit directement la division anatomique donnée par le support.",
          "Le sternum et les côtes sont parfois classés à tort avec les membres alors qu’ils appartiennent au tronc.",
          "Tête : crâne et face ; tronc : rachis, côtes, sternum ; membres : supérieurs et inférieurs.",
          "Employer ces grandes régions avant de préciser l’os concerné.",
        ),
      }),
      question({
        kind: "multiple_choice",
        prompt: "Quels éléments appartiennent au tronc selon le support ?",
        instruction: "Sélectionne les deux réponses correctes.",
        options: [
          option("La colonne vertébrale", "Le rachis est cité dans la partie tronc.", {
            correct: true,
          }),
          option("Les côtes", "Les côtes sont citées dans la partie tronc.", { correct: true }),
          option("L’humérus", "L’humérus appartient au membre supérieur.", {
            distractorType: "other-context",
          }),
          option("Le fémur", "Le fémur appartient au membre inférieur.", {
            distractorType: "other-context",
          }),
        ],
        knowledgeIds: ["K-DEA-P04-002"],
        tags: ["tronc", "squelette"],
        feedback: feedback(
          "La colonne vertébrale et les côtes sont deux éléments du tronc décrits page 35.",
          "Humérus et fémur sont des os des membres et ne doivent pas être déplacés vers le tronc.",
          "Le tronc comprend notamment rachis, côtes et sternum.",
          "Distinguer tronc et membres évite une localisation anatomique trop large.",
        ),
      }),
      question({
        kind: "fill_blank",
        prompt: "Complète : le squelette humain est formé de plus de ______ os.",
        options: [option("200", "Le support indique « plus de 200 » os.", { correct: true })],
        knowledgeIds: ["K-DEA-P04-002"],
        tags: ["squelette", "nombre"],
        feedback: feedback(
          "Le nombre attendu est 200, dans la formulation « plus de 200 os ».",
          "Donner un nombre exact différent dépasse ce que précise ce support.",
          "Le support retient une valeur supérieure à 200, sans exiger ici un décompte exact.",
          "Cette donnée sert de repère général, pas de critère clinique isolé.",
        ),
      }),
      question({
        kind: "clinical_case",
        prompt:
          "Une personne désigne une douleur située au niveau du sternum. Dans quelle grande partie du squelette situes-tu d’abord ce repère ?",
        options: [
          option("La tête", "Le sternum n’appartient pas à la tête."),
          option("Le tronc", "Le sternum est cité parmi les éléments du tronc.", { correct: true }),
          option("Le membre supérieur", "Le sternum n’est pas un os du membre supérieur.", {
            distractorType: "sign-misinterpretation",
          }),
          option("Le membre inférieur", "Le sternum n’est pas un os du membre inférieur.", {
            distractorType: "sign-misinterpretation",
          }),
        ],
        knowledgeIds: ["K-DEA-P04-002", "K-DEA-P04-013"],
        competencyIds: ["anatomy.landmarks", "anatomy.location.description"],
        tags: ["sternum", "repere", "cas"],
        feedback: feedback(
          "Le sternum se situe dans le tronc ; c’est la première catégorie anatomique à retenir.",
          "Le voisinage des membres supérieurs ne transforme pas le sternum en os du membre supérieur.",
          "Localiser d’abord la grande région, puis préciser le repère osseux.",
          "Une transmission descriptive peut préciser « tronc, région sternale » sans conclure à un diagnostic.",
          { safetyPoint: "La localisation anatomique ne remplace pas l’évaluation clinique." },
        ),
      }),
      question({
        kind: "true_false",
        prompt:
          "Dans la division du support, les membres supérieurs et inférieurs constituent deux des trois grandes parties séparées du squelette.",
        correct: false,
        trueExplanation: "Cette affirmation sépare artificiellement les deux types de membres.",
        falseExplanation:
          "Le support regroupe membres supérieurs et inférieurs dans une seule grande partie : les membres.",
        knowledgeIds: ["K-DEA-P04-002"],
        tags: ["squelette", "membres"],
        feedback: feedback(
          "L’affirmation est fausse : « les membres » forment une seule des trois grandes parties.",
          "Le piège consiste à compter séparément membres supérieurs et inférieurs.",
          "Les trois parties restent tête, tronc et membres.",
          "Cette nomenclature commune facilite un repérage cohérent entre professionnels.",
        ),
      }),
    ],
  },
  {
    id: "dea-p04-l02",
    title: "Les principaux os",
    pages: "34-36",
    section: "Appareil locomoteur - schéma et principaux os",
    objectives: [
      "Identifier les principaux os des membres et du tronc.",
      "Distinguer os longs et os plats explicitement illustrés.",
      "Employer des repères anatomiques précis.",
    ],
    competencyIds: ["body.system.locomotor", "anatomy.landmarks"],
    prerequisiteIds: ["dea-p04-l01"],
    questions: [
      question({
        kind: "matching",
        prompt: "Associe chaque os à la région indiquée par le support.",
        options: [
          option("Humérus", "L’humérus est l’os du bras.", { match: "Bras" }),
          option("Radius et cubitus", "Ces deux os sont situés dans l’avant-bras.", {
            match: "Avant-bras",
          }),
          option("Fémur", "Le fémur est l’os de la cuisse.", { match: "Cuisse" }),
          option("Tibia et péroné", "Ces deux os sont situés dans la jambe.", { match: "Jambe" }),
        ],
        knowledgeIds: ["K-DEA-P04-004", "K-DEA-P04-013"],
        tags: ["os", "reperes", "association"],
        feedback: feedback(
          "Les associations reprennent les repères du schéma : humérus-bras, radius/cubitus-avant-bras, fémur-cuisse, tibia/péroné-jambe.",
          "Bras et avant-bras, comme cuisse et jambe, sont souvent employés à tort comme synonymes.",
          "Nommer le segment exact évite de désigner tout un membre par un seul mot.",
          "Utiliser le segment puis l’os correspondant dans une description anatomique.",
          { memoryTip: "Bras : humérus ; cuisse : fémur." },
        ),
      }),
      question({
        kind: "ordering",
        prompt:
          "Classe les repères osseux du membre supérieur du plus proche du tronc au plus éloigné.",
        instruction: "Remets les éléments dans l’ordre proximal vers distal.",
        options: [
          option("Ceinture scapulaire", "Elle relie le membre supérieur au tronc."),
          option("Humérus", "Il forme le segment osseux du bras."),
          option("Radius et cubitus", "Ils forment le squelette de l’avant-bras."),
          option("Carpe", "Il correspond au repère osseux du poignet."),
          option("Métacarpes et phalanges", "Ils se situent dans la main et les doigts."),
        ],
        knowledgeIds: ["K-DEA-P04-011"],
        competencyIds: ["anatomy.region.upper-limb", "anatomy.landmarks"],
        tags: ["membre-superieur", "ordre"],
        feedback: feedback(
          "L’ordre suit la description du membre supérieur depuis la ceinture scapulaire jusqu’aux phalanges.",
          "Commencer par la main inverse le sens proximal-distal demandé.",
          "Ceinture scapulaire → humérus → radius/cubitus → carpe → métacarpes/phalanges.",
          "Parcourir mentalement le membre depuis l’épaule vers les doigts aide à localiser un repère.",
        ),
      }),
      question({
        kind: "ordering",
        prompt:
          "Classe les repères osseux du membre inférieur du plus proche du tronc au plus éloigné.",
        instruction: "Remets les éléments dans l’ordre proximal vers distal.",
        options: [
          option("Bassin", "Le bassin constitue le repère proximal décrit du membre inférieur."),
          option("Fémur", "Il se situe dans la cuisse."),
          option("Rotule", "Elle se situe au niveau du genou."),
          option("Tibia et péroné", "Ils se situent dans la jambe."),
          option(
            "Tarse, métatarses et phalanges",
            "Ils se situent vers la cheville, le pied et les orteils.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-012"],
        competencyIds: ["anatomy.region.lower-limb", "anatomy.landmarks"],
        tags: ["membre-inferieur", "ordre"],
        feedback: feedback(
          "L’ordre suit le membre inférieur depuis le bassin jusqu’aux phalanges.",
          "La jambe anatomique vient après le genou et ne comprend pas la cuisse.",
          "Bassin → fémur → rotule → tibia/péroné → tarse/métatarses/phalanges.",
          "Suivre la trajectoire hanche-pied permet de vérifier la cohérence d’une localisation.",
        ),
      }),
      question({
        kind: "single",
        prompt: "Quel os est explicitement présenté comme un os plat ?",
        options: [
          option("Le sternum", "Le support précise que le sternum est un os plat.", {
            correct: true,
          }),
          option("L’humérus", "L’humérus est utilisé comme exemple d’os long."),
          option(
            "Le fémur",
            "Le fémur appartient au membre inférieur et n’est pas qualifié d’os plat dans ce passage.",
          ),
          option(
            "Le radius",
            "Le radius est un os de l’avant-bras, sans qualification d’os plat ici.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-003"],
        pages: "35",
        tags: ["os-plat", "sternum"],
        feedback: feedback(
          "Le sternum est le seul os que cette page qualifie explicitement d’os plat.",
          "L’humérus peut attirer l’attention parce qu’il est illustré ensuite, mais comme os long.",
          "Dans ce support : sternum = os plat ; humérus = exemple d’os long.",
          "Associer le nom de l’os à sa catégorie seulement lorsque la source le précise.",
        ),
      }),
      question({
        kind: "single",
        prompt: "Quel os sert d’exemple pour présenter la structure d’un os long ?",
        options: [
          option("L’humérus", "La figure de la page 36 est légendée « Os long (humérus) ».", {
            correct: true,
          }),
          option("Le sternum", "Le sternum est présenté comme un os plat."),
          option(
            "La rotule",
            "La rotule est repérée au genou, mais n’illustre pas la structure de l’os long.",
          ),
          option(
            "Une vertèbre",
            "Les vertèbres sont décrites dans le rachis, pas comme l’exemple illustré d’os long.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-003", "K-DEA-P04-005"],
        pages: "36",
        tags: ["os-long", "humerus"],
        feedback: feedback(
          "La page 36 utilise l’humérus pour illustrer diaphyse et épiphyses d’un os long.",
          "Confondre l’os illustré avec le sternum mélange os long et os plat.",
          "L’humérus est l’exemple d’os long retenu par ce support.",
          "Identifier l’os puis la partie de l’os évite une description imprécise.",
        ),
      }),
      question({
        kind: "clinical_case",
        prompt:
          "Une personne montre une douleur entre le coude et le poignet. Quels os principaux correspondent à ce segment ?",
        options: [
          option("L’humérus seul", "L’humérus correspond au bras, au-dessus du coude.", {
            distractorType: "sign-misinterpretation",
          }),
          option(
            "Le radius et le cubitus",
            "Ces deux os correspondent à l’avant-bras, entre coude et poignet.",
            { correct: true },
          ),
          option("Le fémur et la rotule", "Ces os appartiennent au membre inférieur.", {
            distractorType: "other-context",
          }),
          option("Le tibia et le péroné", "Ces os correspondent à la jambe.", {
            distractorType: "other-context",
          }),
        ],
        knowledgeIds: ["K-DEA-P04-004", "K-DEA-P04-011", "K-DEA-P04-013"],
        competencyIds: ["anatomy.region.upper-limb", "anatomy.location.description"],
        pages: "34-35",
        tags: ["avant-bras", "cas"],
        feedback: feedback(
          "Le segment entre coude et poignet est l’avant-bras, où le support situe radius et cubitus.",
          "Employer « bras » pour toute la zone du membre supérieur masque la distinction avec l’avant-bras.",
          "Avant-bras = radius + cubitus dans la nomenclature du support.",
          "Décrire « avant-bras » puis préciser le côté est plus utile qu’une expression vague.",
          {
            safetyPoint:
              "Cette localisation ne permet pas, à elle seule, de conclure à une lésion précise.",
          },
        ),
      }),
      question({
        kind: "multiple_choice",
        prompt: "Quels os principaux le schéma situe dans la jambe ?",
        instruction: "Sélectionne les deux réponses correctes.",
        options: [
          option("Le tibia", "Le tibia est repéré dans la jambe.", { correct: true }),
          option("Le péroné", "Le péroné est repéré dans la jambe.", { correct: true }),
          option("Le fémur", "Le fémur correspond à la cuisse.", {
            distractorType: "frequent-error",
          }),
          option("L’humérus", "L’humérus correspond au bras.", { distractorType: "other-context" }),
        ],
        knowledgeIds: ["K-DEA-P04-004", "K-DEA-P04-012"],
        competencyIds: ["anatomy.region.lower-limb", "anatomy.landmarks"],
        pages: "34-35",
        tags: ["jambe", "tibia", "perone"],
        feedback: feedback(
          "Le tibia et le péroné sont les deux os principaux repérés dans la jambe.",
          "Le fémur est souvent sélectionné par extension abusive du mot jambe à tout le membre inférieur.",
          "Cuisse : fémur ; jambe : tibia et péroné.",
          "Nommer le segment exact améliore le repérage d’une douleur ou d’une lésion visible.",
        ),
      }),
      question({
        kind: "fill_blank",
        prompt: "Complète : l’os principal de la cuisse est le ______.",
        options: [option("fémur", "Le schéma situe le fémur dans la cuisse.", { correct: true })],
        knowledgeIds: ["K-DEA-P04-004", "K-DEA-P04-012"],
        competencyIds: ["anatomy.region.lower-limb", "anatomy.landmarks"],
        pages: "34-35",
        tags: ["cuisse", "femur"],
        feedback: feedback(
          "Le terme attendu est « fémur », l’os repéré dans la cuisse.",
          "Répondre tibia confond la cuisse avec la jambe située sous le genou.",
          "Fémur = cuisse.",
          "Associer segment et os facilite une transmission anatomique concise.",
          { memoryTip: "Fémur rime avec longueur de la cuisse." },
        ),
      }),
    ],
  },
  {
    id: "dea-p04-l03",
    title: "Les articulations",
    pages: "36",
    section: "Appareil locomoteur - Les articulations",
    objectives: [
      "Définir une articulation.",
      "Distinguer cartilage, capsule synoviale et ligaments.",
      "Reconnaître les mouvements et les degrés de mobilité cités.",
    ],
    competencyIds: ["body.system.locomotor", "anatomy.landmarks"],
    prerequisiteIds: ["dea-p04-l02"],
    questions: [
      question({
        kind: "single",
        prompt: "Où se situe une articulation ?",
        options: [
          option(
            "À l’union de deux os",
            "Le support définit l’articulation à l’union de deux os.",
            { correct: true },
          ),
          option(
            "Au centre de la diaphyse",
            "La diaphyse est le corps d’un os long, pas l’union de deux os.",
          ),
          option(
            "Entre un muscle et un tendon",
            "Le tendon relie le muscle au segment osseux dans la description du support.",
          ),
          option(
            "Uniquement dans le rachis",
            "Les articulations existent dans de nombreuses régions du squelette.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-006"],
        tags: ["articulation", "definition"],
        feedback: feedback(
          "Une articulation correspond à la zone d’union entre deux os.",
          "La confondre avec une partie interne d’un os long fait perdre la notion d’union.",
          "Articulation = union entre deux os.",
          "Repérer l’articulation avant de décrire précisément une douleur périarticulaire.",
          { memoryTip: "Deux os qui se rencontrent : une articulation." },
        ),
      }),
      question({
        kind: "true_false",
        prompt: "Les ligaments participent à la stabilité d’une articulation.",
        correct: true,
        trueExplanation: "Le support précise que l’articulation est stabilisée par des ligaments.",
        falseExplanation:
          "Faux serait incorrect : la stabilité ligamentaire est explicitement citée.",
        knowledgeIds: ["K-DEA-P04-006"],
        tags: ["ligament", "stabilite"],
        feedback: feedback(
          "Les ligaments contribuent à stabiliser l’union articulaire.",
          "Une erreur fréquente consiste à attribuer ce rôle au tendon, dont la relation décrite est muscle-os.",
          "Ligament : stabilité articulaire ; tendon : insertion musculaire sur l’os.",
          "Nommer la structure concernée sans conclure sur la nature d’une lésion.",
        ),
      }),
      question({
        kind: "matching",
        prompt: "Associe chaque élément articulaire à son rôle ou à sa localisation décrite.",
        options: [
          option("Cartilage articulaire", "Il recouvre les surfaces articulaires décrites.", {
            match: "Recouvre les surfaces articulaires",
          }),
          option("Liquide synovial", "Il est contenu dans la capsule synoviale.", {
            match: "Présent dans la capsule synoviale",
          }),
          option("Ligaments", "Ils participent à la stabilité de l’articulation.", {
            match: "Stabilisent l’articulation",
          }),
        ],
        knowledgeIds: ["K-DEA-P04-006"],
        tags: ["articulation", "association"],
        feedback: feedback(
          "Les surfaces sont cartilagineuses, le liquide synovial est dans la capsule et les ligaments stabilisent l’ensemble.",
          "Intervertir ligament et liquide synovial mélange une structure de stabilité et un contenu articulaire.",
          "Cartilage, synovie et ligaments ont des rôles distincts dans l’articulation.",
          "Une description anatomique précise distingue ces éléments au lieu d’employer uniquement « l’articulation ».",
        ),
      }),
      question({
        kind: "multiple_choice",
        prompt: "Quels mouvements sont explicitement cités dans le support ?",
        instruction: "Sélectionne les trois réponses correctes.",
        options: [
          option("Flexion", "La flexion est citée parmi les mouvements articulaires.", {
            correct: true,
          }),
          option("Extension", "L’extension est citée parmi les mouvements articulaires.", {
            correct: true,
          }),
          option("Rotation", "La rotation est citée parmi les mouvements articulaires.", {
            correct: true,
          }),
          option(
            "Digestion",
            "La digestion est une fonction d’un autre appareil, pas un mouvement articulaire.",
          ),
          option(
            "Ventilation",
            "La ventilation n’est pas donnée comme catégorie de mouvement articulaire.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-007"],
        tags: ["mouvement", "articulation"],
        feedback: feedback(
          "Flexion, extension et rotation font partie des mouvements articulaires cités avec adduction et abduction.",
          "Choisir une fonction physiologique générale à la place d’un mouvement articulaire confond deux niveaux de description.",
          "Les mouvements cités sont flexion, extension, adduction, abduction et rotation.",
          "Décrire un mouvement observé complète le repérage sans imposer de mobilisation au patient.",
          {
            safetyPoint:
              "Cette notion anatomique ne justifie pas de tester un mouvement douloureux ou traumatique.",
          },
        ),
      }),
      question({
        kind: "single",
        prompt: "Quel exemple correspond à une articulation fixe dans le support ?",
        options: [
          option(
            "Les os du crâne",
            "Le support cite les os du crâne comme exemple d’articulation fixe.",
            { correct: true },
          ),
          option("Le coude", "Le coude est cité comme articulation mobile."),
          option("Le muscle strié", "Un muscle n’est pas une catégorie de mobilité articulaire."),
          option("La diaphyse", "La diaphyse est une partie d’un os long."),
        ],
        knowledgeIds: ["K-DEA-P04-007"],
        tags: ["articulation-fixe", "crane"],
        feedback: feedback(
          "Les os du crâne illustrent les articulations fixes dans ce support.",
          "Le coude est plausible parce qu’il s’agit bien d’une articulation, mais il est mobile.",
          "Crâne : articulation fixe ; coude : articulation mobile.",
          "Distinguer le degré de mobilité avant de décrire la fonction d’une articulation.",
        ),
      }),
      question({
        kind: "clinical_case",
        prompt:
          "Une personne montre une douleur exactement au niveau du coude. Quelle structure générale faut-il d’abord identifier dans la transmission anatomique ?",
        options: [
          option(
            "Une articulation mobile",
            "Le support cite le coude comme exemple d’articulation mobile.",
            { correct: true },
          ),
          option(
            "Une articulation fixe",
            "Le coude permet des mouvements et n’est pas classé fixe.",
          ),
          option(
            "La diaphyse du fémur",
            "Le fémur appartient au membre inférieur et ne correspond pas au coude.",
          ),
          option("Un os du crâne", "Le crâne est sans rapport avec le repère indiqué."),
        ],
        knowledgeIds: ["K-DEA-P04-006", "K-DEA-P04-007", "K-DEA-P04-013"],
        competencyIds: ["anatomy.landmarks", "anatomy.location.description"],
        tags: ["coude", "cas", "transmission"],
        feedback: feedback(
          "Le coude est un repère articulaire mobile du membre supérieur.",
          "Décrire toute la zone comme « bras » perd la précision apportée par le repère du coude.",
          "Nommer d’abord le segment ou l’articulation exacte, puis le côté.",
          "Une formulation utile est « douleur au niveau de l’articulation du coude droit/gauche ».",
          { safetyPoint: "Ne pas forcer la mobilité d’une articulation douloureuse." },
        ),
      }),
      question({
        kind: "fill_blank",
        prompt: "Complète : le liquide présent dans la capsule articulaire est le liquide ______.",
        options: [option("synovial", "Le support nomme le liquide synovial.", { correct: true })],
        knowledgeIds: ["K-DEA-P04-006"],
        tags: ["synovie", "articulation"],
        feedback: feedback(
          "Le mot attendu est « synovial ».",
          "Le cartilage recouvre les surfaces ; il ne désigne pas le liquide de la capsule.",
          "Capsule synoviale et liquide synovial sont liés dans la description de l’articulation.",
          "Employer le vocabulaire exact évite de confondre les composants articulaires.",
        ),
      }),
      question({
        kind: "true_false",
        prompt: "Toutes les articulations possèdent le même degré de mobilité.",
        correct: false,
        trueExplanation: "Cette affirmation efface les catégories fixe, semi-mobile et mobile.",
        falseExplanation: "Le support distingue des articulations fixes, semi-mobiles et mobiles.",
        knowledgeIds: ["K-DEA-P04-007"],
        tags: ["mobilite", "articulation"],
        feedback: feedback(
          "L’affirmation est fausse : le degré de mobilité varie selon l’articulation.",
          "Prendre le coude comme modèle universel ferait croire que toutes les articulations sont mobiles.",
          "Trois degrés sont cités : fixe, semi-mobile et mobile.",
          "Adapter la description au repère anatomique concerné, sans généraliser.",
        ),
      }),
    ],
  },
  {
    id: "dea-p04-l04",
    title: "Les muscles",
    pages: "37",
    section: "Appareil locomoteur - Les muscles",
    objectives: [
      "Expliquer le rôle des muscles dans le mouvement.",
      "Distinguer muscle, tendon et ligament.",
      "Reconnaître les propriétés et rôles musculaires cités.",
    ],
    competencyIds: ["body.system.locomotor", "anatomy.landmarks"],
    prerequisiteIds: ["dea-p04-l03"],
    questions: [
      question({
        kind: "single",
        prompt:
          "Comment les muscles produisent-ils le mouvement des segments osseux selon le support ?",
        options: [
          option(
            "Par leurs contractions et relaxations",
            "Le support relie contractions et relaxations au mouvement.",
            { correct: true },
          ),
          option(
            "Par la seule présence du cartilage",
            "Le cartilage appartient aux surfaces articulaires, pas à la production musculaire du mouvement.",
          ),
          option(
            "Par le liquide synovial uniquement",
            "Le liquide synovial est articulaire et ne remplace pas l’action musculaire.",
          ),
          option(
            "Par l’immobilité des articulations",
            "Le mouvement suppose au contraire l’action coordonnée sur les segments.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-008", "K-DEA-P04-009"],
        tags: ["muscle", "mouvement"],
        feedback: feedback(
          "L’alternance contraction-relaxation des muscles génère le mouvement des segments osseux.",
          "Attribuer ce mouvement au cartilage ou à la synovie confond composants articulaires et action musculaire.",
          "Contraction et relaxation musculaires participent au mouvement.",
          "Identifier le groupe musculaire et le segment mobilisé permet une description fonctionnelle simple.",
        ),
      }),
      question({
        kind: "true_false",
        prompt: "Les muscles s’insèrent sur les segments osseux par l’intermédiaire de tendons.",
        correct: true,
        trueExplanation: "Cette relation muscle-tendon-os est explicitement décrite page 37.",
        falseExplanation:
          "Faux serait incorrect : le support nomme précisément les tendons comme intermédiaires.",
        knowledgeIds: ["K-DEA-P04-008"],
        tags: ["tendon", "muscle"],
        feedback: feedback(
          "Le tendon assure l’intermédiaire décrit entre le muscle et le segment osseux.",
          "Le confondre avec un ligament revient à mélanger insertion musculaire et stabilité articulaire.",
          "Tendon : muscle vers os ; ligament : stabilité entre structures articulaires.",
          "Nommer tendon ou ligament seulement lorsque la structure concernée est identifiée.",
          { memoryTip: "Tendon : le muscle se tend vers l’os." },
        ),
      }),
      question({
        kind: "matching",
        prompt: "Associe chaque propriété musculaire à sa formulation.",
        options: [
          option("Contractile", "Capacité à se contracter.", { match: "Peut se contracter" }),
          option("Élastique", "Capacité à reprendre sa forme.", {
            match: "Possède une élasticité",
          }),
          option("Excitable", "Capacité à répondre à une stimulation.", {
            match: "Peut être excité",
          }),
        ],
        knowledgeIds: ["K-DEA-P04-009"],
        tags: ["muscle", "proprietes"],
        feedback: feedback(
          "Le support qualifie les muscles de contractiles, élastiques et excitables.",
          "Ces propriétés ne sont pas des types de mouvements articulaires.",
          "Les trois propriétés citées sont contractilité, élasticité et excitabilité.",
          "Les retenir aide à comprendre la fonction générale d’un muscle sans extrapolation clinique.",
        ),
      }),
      question({
        kind: "multiple_choice",
        prompt: "Quels rôles des muscles sont cités dans le support ?",
        instruction: "Sélectionne les trois réponses correctes.",
        options: [
          option("Participer au mouvement", "Le mouvement est un rôle musculaire central.", {
            correct: true,
          }),
          option("Contribuer à l’équilibre", "Le maintien de l’équilibre est cité.", {
            correct: true,
          }),
          option("Produire de la chaleur", "La production de chaleur est citée.", {
            correct: true,
          }),
          option("Former seuls le squelette", "Le squelette est formé d’os et d’articulations."),
          option("Remplacer les ligaments", "Muscles et ligaments sont des structures distinctes."),
        ],
        knowledgeIds: ["K-DEA-P04-009"],
        tags: ["muscle", "roles"],
        feedback: feedback(
          "Les muscles participent au mouvement, à l’équilibre et à la production de chaleur, ainsi qu’au travail.",
          "Limiter le muscle au sport ou lui attribuer la formation du squelette déforme ses rôles.",
          "Muscles : mouvement, travail, équilibre et chaleur.",
          "Observer la fonction globale sans transformer ces notions en diagnostic.",
        ),
      }),
      question({
        kind: "single",
        prompt: "Quel type de muscle décrit dans le support obéit à la volonté ?",
        options: [
          option(
            "Le muscle strié",
            "Le support précise que les muscles striés obéissent à la volonté.",
            { correct: true },
          ),
          option(
            "Le muscle lisse",
            "Le support indique que les muscles lisses n’obéissent pas à la volonté.",
          ),
          option("Le ligament", "Le ligament n’est pas un muscle."),
          option("Le cartilage", "Le cartilage n’est pas un type de muscle."),
        ],
        knowledgeIds: ["K-DEA-P04-008"],
        tags: ["muscle-strie", "volontaire"],
        feedback: feedback(
          "Dans la classification présentée, les muscles striés obéissent à la volonté.",
          "Le distracteur muscle lisse est crédible mais sa commande est décrite comme involontaire.",
          "Strié : volontaire ; lisse : involontaire dans ce support.",
          "Utiliser cette distinction comme repère général au niveau DEA.",
        ),
      }),
      question({
        kind: "clinical_case",
        prompt:
          "Une victime localise une gêne sur le trajet entre un muscle et son insertion osseuse. Quelle structure de liaison le support décrit-il à cet endroit ?",
        options: [
          option(
            "Un tendon",
            "Le tendon relie le muscle au segment osseux dans la description fournie.",
            { correct: true },
          ),
          option(
            "Un ligament",
            "Le ligament stabilise une articulation et ne correspond pas à la liaison muscle-os demandée.",
          ),
          option(
            "Du liquide synovial",
            "Le liquide synovial est contenu dans la capsule articulaire.",
          ),
          option(
            "Une épiphyse uniquement",
            "L’épiphyse est une extrémité d’os long, pas la structure de liaison demandée.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-008"],
        competencyIds: ["body.system.locomotor", "anatomy.location.description"],
        tags: ["tendon", "cas"],
        feedback: feedback(
          "La structure décrite entre muscle et os est le tendon.",
          "Le ligament paraît proche parce qu’il appartient aussi au système locomoteur, mais son rôle articulaire diffère.",
          "Tendon et ligament ne sont pas interchangeables.",
          "Décrire la zone et la structure supposée sans annoncer une lésion non établie.",
          { safetyPoint: "Une localisation ne suffit pas à identifier la nature de la lésion." },
        ),
      }),
      question({
        kind: "fill_blank",
        prompt:
          "Complète : un muscle qui n’obéit pas à la volonté est qualifié de muscle ______ dans la classification du support.",
        options: [
          option(
            "lisse",
            "Le support oppose muscles lisses involontaires et muscles striés volontaires.",
            { correct: true },
          ),
        ],
        knowledgeIds: ["K-DEA-P04-008"],
        tags: ["muscle-lisse", "involontaire"],
        feedback: feedback(
          "Le terme attendu est « lisse ».",
          "Répondre strié inverse les deux catégories présentées.",
          "Muscle lisse : involontaire dans cette classification.",
          "Cette distinction reste une base de vocabulaire, pas une évaluation clinique à elle seule.",
        ),
      }),
      question({
        kind: "true_false",
        prompt: "Le rôle des muscles se limite au déplacement volontaire des membres.",
        correct: false,
        trueExplanation:
          "Cette affirmation exclut l’équilibre, la chaleur et les autres rôles cités.",
        falseExplanation:
          "Les muscles contribuent aussi au travail, à l’équilibre et à la production de chaleur.",
        knowledgeIds: ["K-DEA-P04-009"],
        tags: ["muscle", "roles"],
        feedback: feedback(
          "L’affirmation est fausse : plusieurs rôles musculaires sont décrits au-delà du déplacement volontaire.",
          "Une vision centrée uniquement sur le mouvement des membres oublie équilibre et production de chaleur.",
          "Le rôle musculaire est pluriel.",
          "Rechercher la fonction générale avant de réduire le muscle à un seul mouvement.",
        ),
      }),
    ],
  },
  {
    id: "dea-p04-l05",
    title: "Le rachis",
    pages: "35",
    section: "Appareil locomoteur - Les os - Le tronc",
    objectives: [
      "Situer le rachis dans le tronc.",
      "Reconnaître les régions vertébrales décrites.",
      "Employer un repère rachidien précis dans une localisation.",
    ],
    competencyIds: ["anatomy.landmarks", "anatomy.location.description"],
    prerequisiteIds: ["dea-p04-l04"],
    questions: [
      question({
        kind: "single",
        prompt: "À quelle grande partie du squelette appartient la colonne vertébrale ?",
        options: [
          option("Au tronc", "Le support classe la colonne vertébrale dans le tronc.", {
            correct: true,
          }),
          option("À la tête", "La tête comprend le crâne et la face."),
          option("Au membre supérieur", "Le membre supérieur débute à la ceinture scapulaire."),
          option(
            "Au membre inférieur",
            "Le bassin et les os du membre inférieur sont décrits séparément.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-002", "K-DEA-P04-010"],
        tags: ["rachis", "tronc"],
        feedback: feedback(
          "Le rachis est un élément central du tronc.",
          "La proximité du rachis cervical avec la tête peut conduire à classer tout le rachis dans la tête.",
          "Le rachis appartient au tronc et se divise en régions.",
          "Nommer la région du rachis précise davantage une localisation que le seul mot « dos ».",
        ),
      }),
      question({
        kind: "true_false",
        prompt: "Le support décrit le rachis comme une colonne de 33 vertèbres.",
        correct: true,
        trueExplanation: "La page 35 indique une colonne de 33 vertèbres.",
        falseExplanation: "Faux serait incorrect au regard du nombre donné dans le support.",
        knowledgeIds: ["K-DEA-P04-010"],
        tags: ["rachis", "vertebres"],
        feedback: feedback(
          "Le chiffre de référence présenté est 33 vertèbres.",
          "Additionner mécaniquement une plage variable coccygienne peut sembler contradictoire ; ici il faut retenir la formulation du support.",
          "Le support retient une colonne de 33 vertèbres.",
          "Utiliser ce nombre comme repère pédagogique général.",
        ),
      }),
      question({
        kind: "matching",
        prompt: "Associe chaque région du rachis au nombre de vertèbres indiqué.",
        options: [
          option("Cervicale", "Le support indique 7 vertèbres cervicales.", { match: "7" }),
          option("Dorsale", "Le support indique 12 vertèbres dorsales.", { match: "12" }),
          option("Lombaire", "Le support indique 5 vertèbres lombaires.", { match: "5" }),
          option("Sacrée", "Le support indique 5 vertèbres sacrées.", { match: "5 soudées" }),
        ],
        knowledgeIds: ["K-DEA-P04-010"],
        tags: ["rachis", "association"],
        feedback: feedback(
          "La répartition demandée suit la liste cervicale 7, dorsale 12, lombaire 5 et sacrée 5 soudées.",
          "Les nombres cervical et dorsal sont fréquemment inversés.",
          "Retenir 7 cervicales, 12 dorsales, 5 lombaires.",
          "Le nom de la région est plus utile dans une transmission que le numéro isolé d’une vertèbre non identifié.",
          { memoryTip: "7-12-5 : cou, dos, lombes." },
        ),
      }),
      question({
        kind: "ordering",
        prompt: "Classe les régions du rachis du haut vers le bas.",
        instruction: "Remets les régions dans l’ordre cranio-caudal.",
        options: [
          option("Cervicale", "La région cervicale est la plus haute de la liste."),
          option("Dorsale", "Elle suit la région cervicale."),
          option("Lombaire", "Elle suit la région dorsale."),
          option("Sacrée", "Elle se situe sous la région lombaire."),
          option("Coccygienne", "Elle termine la succession décrite."),
        ],
        knowledgeIds: ["K-DEA-P04-010"],
        tags: ["rachis", "ordre"],
        feedback: feedback(
          "L’ordre anatomique est cervical, dorsal, lombaire, sacré puis coccygien.",
          "Commencer par la région lombaire confond une région basse avec le sommet du rachis.",
          "Du haut vers le bas : cervical → dorsal → lombaire → sacré → coccygien.",
          "Suivre mentalement le rachis du cou au coccyx sécurise l’ordre de description.",
        ),
      }),
      question({
        kind: "single",
        prompt: "Combien de vertèbres cervicales le support indique-t-il ?",
        options: [
          option("5", "Cinq correspond au nombre lombaire cité."),
          option("7", "Le support indique sept vertèbres cervicales.", { correct: true }),
          option("12", "Douze correspond au nombre dorsal cité."),
          option("33", "Trente-trois correspond au total présenté pour la colonne."),
        ],
        knowledgeIds: ["K-DEA-P04-010"],
        tags: ["cervical", "nombre"],
        feedback: feedback(
          "La région cervicale compte sept vertèbres dans le support.",
          "Cinq et douze appartiennent à d’autres régions et peuvent être sélectionnés par confusion.",
          "Cervicales = 7.",
          "Employer « région cervicale » pour une localisation au cou sur le rachis.",
        ),
      }),
      question({
        kind: "clinical_case",
        prompt:
          "Une victime consciente indique une douleur sur la partie basse du dos, au-dessus du sacrum. Quelle région du rachis décrit le mieux ce repère ?",
        options: [
          option("Cervicale", "La région cervicale correspond au cou."),
          option("Dorsale", "La région dorsale se situe plus haut que la région décrite."),
          option(
            "Lombaire",
            "La région lombaire se situe dans la partie basse du dos, au-dessus du sacrum.",
            { correct: true },
          ),
          option("Coccygienne", "La région coccygienne se situe sous le sacrum."),
        ],
        knowledgeIds: ["K-DEA-P04-010", "K-DEA-P04-013"],
        competencyIds: [
          "anatomy.landmarks",
          "anatomy.location.description",
          "anatomy.location.transmission",
        ],
        tags: ["rachis", "lombaire", "cas"],
        feedback: feedback(
          "Le repère décrit correspond à la région lombaire.",
          "Employer uniquement « dos » est moins précis et peut englober plusieurs régions.",
          "Une localisation rachidienne gagne à préciser cervicale, dorsale ou lombaire.",
          "Transmettre le côté si pertinent et la région, sans déduire une lésion.",
          {
            safetyPoint:
              "En contexte traumatique, la localisation ne justifie aucune mobilisation non indiquée.",
          },
        ),
      }),
      question({
        kind: "fill_blank",
        prompt:
          "Complète : la région située entre le rachis dorsal et le sacrum est la région ______.",
        options: [
          option(
            "lombaire",
            "La région lombaire suit la région dorsale et précède la région sacrée.",
            { correct: true },
          ),
        ],
        knowledgeIds: ["K-DEA-P04-010"],
        tags: ["rachis", "lombaire"],
        feedback: feedback(
          "Le terme attendu est « lombaire ».",
          "Confondre lombaire et cervical inverse une région basse et une région haute.",
          "Dorsal → lombaire → sacré.",
          "Ce vocabulaire rend une localisation plus exploitable.",
        ),
      }),
      question({
        kind: "true_false",
        prompt: "La région dorsale est située sous la région lombaire.",
        correct: false,
        trueExplanation: "Cette proposition inverse l’ordre anatomique des deux régions.",
        falseExplanation: "La région dorsale se situe au-dessus de la région lombaire.",
        knowledgeIds: ["K-DEA-P04-010"],
        tags: ["rachis", "orientation"],
        feedback: feedback(
          "L’affirmation est fausse : la région dorsale précède la région lombaire du haut vers le bas.",
          "Une représentation mentale partant du bassin peut conduire à inverser l’ordre demandé.",
          "Dorsal au-dessus, lombaire en dessous.",
          "Vérifier le sens de description avant une transmission anatomique.",
        ),
      }),
    ],
  },
  {
    id: "dea-p04-l06",
    title: "Les membres supérieurs",
    pages: "34-35",
    section: "Appareil locomoteur - Membres supérieurs",
    objectives: [
      "Identifier les segments du membre supérieur.",
      "Associer les principaux os à leur segment.",
      "Décrire un repère du membre supérieur avec précision.",
    ],
    competencyIds: ["anatomy.region.upper-limb", "anatomy.landmarks"],
    prerequisiteIds: ["dea-p04-l05"],
    questions: [
      question({
        kind: "single",
        prompt: "Quel os principal correspond au bras ?",
        options: [
          option("L’humérus", "Le support situe l’humérus dans le bras.", { correct: true }),
          option("Le radius", "Le radius appartient à l’avant-bras."),
          option("Le cubitus", "Le cubitus appartient à l’avant-bras."),
          option("Le fémur", "Le fémur appartient à la cuisse."),
        ],
        knowledgeIds: ["K-DEA-P04-004", "K-DEA-P04-011"],
        tags: ["bras", "humerus"],
        feedback: feedback(
          "L’humérus est l’os principal du bras.",
          "Radius et cubitus sont proches mais appartiennent au segment inférieur : l’avant-bras.",
          "Bras = humérus.",
          "Distinguer bras et avant-bras avant de nommer l’os concerné.",
          { memoryTip: "Humérus dans le bras, fémur dans la cuisse." },
        ),
      }),
      question({
        kind: "true_false",
        prompt: "Le radius et le cubitus appartiennent à l’avant-bras.",
        correct: true,
        trueExplanation: "Ces deux os sont situés dans l’avant-bras sur le schéma.",
        falseExplanation: "Faux serait incorrect : le support les associe à l’avant-bras.",
        knowledgeIds: ["K-DEA-P04-011"],
        tags: ["avant-bras", "radius", "cubitus"],
        feedback: feedback(
          "Radius et cubitus constituent les repères osseux principaux de l’avant-bras décrits.",
          "Les placer dans le bras confond les segments séparés par le coude.",
          "Avant-bras = radius et cubitus.",
          "Préciser le côté et le segment rend le bilan plus clair.",
        ),
      }),
      question({
        kind: "matching",
        prompt: "Associe chaque segment du membre supérieur à son repère osseux.",
        options: [
          option("Bras", "Le bras correspond à l’humérus.", { match: "Humérus" }),
          option("Avant-bras", "L’avant-bras correspond au radius et au cubitus.", {
            match: "Radius et cubitus",
          }),
          option("Poignet", "Le carpe correspond au repère osseux du poignet.", { match: "Carpe" }),
          option("Doigts", "Les doigts sont structurés par des phalanges.", { match: "Phalanges" }),
        ],
        knowledgeIds: ["K-DEA-P04-011", "K-DEA-P04-013"],
        tags: ["membre-superieur", "association"],
        feedback: feedback(
          "Chaque association relie le segment au repère osseux décrit dans le support.",
          "Le mot main est parfois utilisé à tort pour inclure le poignet et l’avant-bras.",
          "Bras-humérus ; avant-bras-radius/cubitus ; poignet-carpe ; doigts-phalanges.",
          "Décrire du segment général vers le repère précis.",
        ),
      }),
      question({
        kind: "ordering",
        prompt: "Classe ces segments du membre supérieur du plus proximal au plus distal.",
        options: [
          option("Épaule", "L’épaule relie le membre au tronc."),
          option("Bras", "Le bras suit l’épaule."),
          option("Coude", "Le coude sépare bras et avant-bras."),
          option("Avant-bras", "L’avant-bras suit le coude."),
          option("Poignet", "Le poignet précède la main."),
          option("Main", "La main est la plus distale de cette liste."),
        ],
        knowledgeIds: ["K-DEA-P04-013"],
        tags: ["membre-superieur", "ordre"],
        feedback: feedback(
          "L’ordre va de l’épaule vers la main en suivant le membre supérieur.",
          "Placer l’avant-bras avant le coude inverse le repère qui sépare bras et avant-bras.",
          "Épaule → bras → coude → avant-bras → poignet → main.",
          "Parcourir visuellement le membre aide à structurer une transmission.",
        ),
      }),
      question({
        kind: "multiple_choice",
        prompt: "Quels éléments appartiennent au membre supérieur dans le support ?",
        instruction: "Sélectionne les trois réponses correctes.",
        options: [
          option("La clavicule", "Elle participe à la ceinture scapulaire du membre supérieur.", {
            correct: true,
          }),
          option("L’omoplate", "Elle participe à la ceinture scapulaire du membre supérieur.", {
            correct: true,
          }),
          option("L’humérus", "Il constitue l’os du bras.", { correct: true }),
          option("Le fémur", "Il appartient au membre inférieur."),
          option("La rotule", "Elle appartient à la région du genou."),
        ],
        knowledgeIds: ["K-DEA-P04-011"],
        tags: ["membre-superieur", "os"],
        feedback: feedback(
          "Clavicule, omoplate et humérus appartiennent à l’organisation du membre supérieur décrite.",
          "Fémur et rotule sont des repères du membre inférieur.",
          "La ceinture scapulaire précède l’humérus dans le membre supérieur.",
          "Vérifier le membre concerné avant de nommer une structure.",
        ),
      }),
      question({
        kind: "clinical_case",
        prompt:
          "Une douleur est signalée entre l’épaule et le coude gauches. Quelle localisation est la plus précise ?",
        options: [
          option(
            "Bras gauche, sur le trajet de l’humérus",
            "Le segment entre épaule et coude est le bras, où se situe l’humérus.",
            { correct: true },
          ),
          option(
            "Avant-bras gauche, sur le radius",
            "L’avant-bras se situe entre coude et poignet.",
          ),
          option("Main gauche, au niveau du carpe", "Le carpe se situe au poignet."),
          option("Cuisse gauche, au niveau du fémur", "La cuisse appartient au membre inférieur."),
        ],
        knowledgeIds: ["K-DEA-P04-011", "K-DEA-P04-013"],
        competencyIds: [
          "anatomy.region.upper-limb",
          "anatomy.location.description",
          "anatomy.location.transmission",
        ],
        tags: ["bras", "cas", "transmission"],
        feedback: feedback(
          "Entre épaule et coude, le segment correct est le bras ; son repère osseux est l’humérus.",
          "Employer avant-bras déplacerait la localisation sous le coude.",
          "Une description associe côté, segment et repère anatomique.",
          "Transmettre « bras gauche » plutôt que « membre gauche » si cette précision est disponible.",
          { safetyPoint: "Ne pas déduire une fracture de la seule localisation douloureuse." },
        ),
      }),
      question({
        kind: "fill_blank",
        prompt: "Complète : les os des doigts sont les ______.",
        options: [
          option("phalanges", "Le support situe les phalanges au niveau des doigts.", {
            correct: true,
          }),
        ],
        knowledgeIds: ["K-DEA-P04-011"],
        tags: ["doigts", "phalanges"],
        feedback: feedback(
          "Le terme attendu est « phalanges ».",
          "Métacarpes et carpe sont des repères proches, mais ne désignent pas les os des doigts.",
          "Doigts = phalanges.",
          "Préciser doigt et côté si le repérage le permet.",
        ),
      }),
      question({
        kind: "true_false",
        prompt:
          "Le mot bras désigne anatomiquement tout le membre supérieur, de l’épaule aux doigts.",
        correct: false,
        trueExplanation: "Cette formulation élargit à tort le bras à tout le membre supérieur.",
        falseExplanation: "Le bras est le segment entre l’épaule et le coude.",
        knowledgeIds: ["K-DEA-P04-011", "K-DEA-P04-013"],
        tags: ["bras", "precision"],
        feedback: feedback(
          "L’affirmation est fausse : bras et membre supérieur ne sont pas synonymes.",
          "Dans le langage courant, « bras » peut être employé largement, mais la description anatomique doit distinguer les segments.",
          "Bras : épaule-coude ; avant-bras : coude-poignet.",
          "Corriger ce vocabulaire améliore immédiatement la qualité d’une transmission.",
        ),
      }),
    ],
  },
  {
    id: "dea-p04-l07",
    title: "Les membres inférieurs",
    pages: "34-35",
    section: "Appareil locomoteur - Membres inférieurs",
    objectives: [
      "Identifier les segments du membre inférieur.",
      "Associer les principaux os à leur segment.",
      "Décrire un repère du membre inférieur avec précision.",
    ],
    competencyIds: ["anatomy.region.lower-limb", "anatomy.landmarks"],
    prerequisiteIds: ["dea-p04-l06"],
    questions: [
      question({
        kind: "single",
        prompt: "Quel os principal correspond à la cuisse ?",
        options: [
          option("Le fémur", "Le support situe le fémur dans la cuisse.", { correct: true }),
          option("Le tibia", "Le tibia appartient à la jambe."),
          option("Le péroné", "Le péroné appartient à la jambe."),
          option("L’humérus", "L’humérus appartient au bras."),
        ],
        knowledgeIds: ["K-DEA-P04-004", "K-DEA-P04-012"],
        tags: ["cuisse", "femur"],
        feedback: feedback(
          "Le fémur est l’os principal de la cuisse.",
          "Tibia et péroné sont proches mais appartiennent au segment situé sous le genou.",
          "Cuisse = fémur.",
          "Distinguer cuisse et jambe avant de nommer l’os concerné.",
          { memoryTip: "Fémur dans la cuisse ; tibia et péroné dans la jambe." },
        ),
      }),
      question({
        kind: "true_false",
        prompt: "Le tibia et le péroné appartiennent à la jambe.",
        correct: true,
        trueExplanation: "Ces deux os sont situés dans la jambe sur le schéma.",
        falseExplanation: "Faux serait incorrect : le support les associe à la jambe.",
        knowledgeIds: ["K-DEA-P04-012"],
        tags: ["jambe", "tibia", "perone"],
        feedback: feedback(
          "Tibia et péroné sont les principaux repères osseux de la jambe décrits.",
          "Les placer dans la cuisse confond les segments séparés par le genou.",
          "Jambe = tibia et péroné.",
          "Préciser le segment et le côté évite une localisation vague.",
        ),
      }),
      question({
        kind: "matching",
        prompt: "Associe chaque segment du membre inférieur à son repère osseux.",
        options: [
          option("Cuisse", "La cuisse correspond au fémur.", { match: "Fémur" }),
          option("Genou", "La rotule est un repère du genou.", { match: "Rotule" }),
          option("Jambe", "La jambe correspond au tibia et au péroné.", {
            match: "Tibia et péroné",
          }),
          option("Orteils", "Les orteils comportent des phalanges.", { match: "Phalanges" }),
        ],
        knowledgeIds: ["K-DEA-P04-012", "K-DEA-P04-013"],
        tags: ["membre-inferieur", "association"],
        feedback: feedback(
          "Chaque association correspond aux repères du membre inférieur présentés.",
          "Le mot jambe est souvent étendu à tort à la cuisse et au pied.",
          "Cuisse-fémur ; genou-rotule ; jambe-tibia/péroné ; orteils-phalanges.",
          "Nommer le segment exact avant le repère osseux.",
        ),
      }),
      question({
        kind: "ordering",
        prompt: "Classe ces segments du membre inférieur du plus proximal au plus distal.",
        options: [
          option("Hanche", "La hanche relie le membre inférieur au bassin."),
          option("Cuisse", "La cuisse suit la hanche."),
          option("Genou", "Le genou sépare cuisse et jambe."),
          option("Jambe", "La jambe suit le genou."),
          option("Cheville", "La cheville précède le pied."),
          option("Pied", "Le pied est la partie la plus distale de cette liste."),
        ],
        knowledgeIds: ["K-DEA-P04-013"],
        tags: ["membre-inferieur", "ordre"],
        feedback: feedback(
          "L’ordre suit le membre inférieur de la hanche au pied.",
          "Placer la jambe avant le genou inverse le repère qui sépare cuisse et jambe.",
          "Hanche → cuisse → genou → jambe → cheville → pied.",
          "Suivre mentalement le membre du bassin vers les orteils aide au repérage.",
        ),
      }),
      question({
        kind: "multiple_choice",
        prompt: "Quels éléments appartiennent au membre inférieur dans le support ?",
        instruction: "Sélectionne les trois réponses correctes.",
        options: [
          option("Le bassin", "Le bassin est le repère proximal cité du membre inférieur.", {
            correct: true,
          }),
          option("Le fémur", "Le fémur appartient à la cuisse.", { correct: true }),
          option("La rotule", "La rotule est située au genou.", { correct: true }),
          option("L’humérus", "L’humérus appartient au membre supérieur."),
          option("Le carpe", "Le carpe appartient au poignet."),
        ],
        knowledgeIds: ["K-DEA-P04-012"],
        tags: ["membre-inferieur", "os"],
        feedback: feedback(
          "Bassin, fémur et rotule appartiennent aux repères du membre inférieur présentés.",
          "Humérus et carpe sont des repères du membre supérieur.",
          "Le membre inférieur s’organise du bassin jusqu’aux phalanges des orteils.",
          "Vérifier le membre concerné avant de nommer une structure.",
        ),
      }),
      question({
        kind: "clinical_case",
        prompt:
          "Une douleur est signalée entre la hanche et le genou droits. Quelle localisation est la plus précise ?",
        options: [
          option(
            "Cuisse droite, sur le trajet du fémur",
            "Le segment entre hanche et genou est la cuisse, où se situe le fémur.",
            { correct: true },
          ),
          option("Jambe droite, sur le tibia", "La jambe se situe entre genou et cheville."),
          option("Pied droit, au niveau du tarse", "Le tarse est situé au pied."),
          option("Bras droit, au niveau de l’humérus", "Le bras appartient au membre supérieur."),
        ],
        knowledgeIds: ["K-DEA-P04-012", "K-DEA-P04-013"],
        competencyIds: [
          "anatomy.region.lower-limb",
          "anatomy.location.description",
          "anatomy.location.transmission",
        ],
        tags: ["cuisse", "cas", "transmission"],
        feedback: feedback(
          "Entre hanche et genou, le segment correct est la cuisse ; son repère osseux principal est le fémur.",
          "Employer jambe déplacerait la localisation sous le genou.",
          "Associer côté, segment et repère rend la description précise.",
          "Transmettre « cuisse droite » plutôt que « jambe droite » si la zone est au-dessus du genou.",
          { safetyPoint: "La douleur seule ne permet pas d’affirmer une fracture." },
        ),
      }),
      question({
        kind: "fill_blank",
        prompt: "Complète : l’os repéré au niveau du genou est la ______.",
        options: [option("rotule", "Le schéma situe la rotule au genou.", { correct: true })],
        knowledgeIds: ["K-DEA-P04-012"],
        tags: ["genou", "rotule"],
        feedback: feedback(
          "Le terme attendu est « rotule ».",
          "Le fémur et le tibia sont voisins du genou mais la question vise l’os explicitement repéré au genou.",
          "Genou : repère de la rotule.",
          "Préciser la face et le côté si ces informations sont observables.",
        ),
      }),
      question({
        kind: "true_false",
        prompt:
          "Le mot jambe désigne anatomiquement tout le membre inférieur, de la hanche au pied.",
        correct: false,
        trueExplanation: "Cette formulation étend à tort la jambe à tout le membre inférieur.",
        falseExplanation: "La jambe est le segment situé entre le genou et la cheville.",
        knowledgeIds: ["K-DEA-P04-012", "K-DEA-P04-013"],
        tags: ["jambe", "precision"],
        feedback: feedback(
          "L’affirmation est fausse : jambe et membre inférieur ne sont pas synonymes en anatomie.",
          "Le langage courant emploie parfois « jambe » pour tout le membre, ce qui rend le bilan imprécis.",
          "Cuisse : hanche-genou ; jambe : genou-cheville.",
          "Cette distinction améliore directement la transmission d’une localisation.",
        ),
      }),
    ],
  },
  {
    id: "dea-p04-l08",
    title: "Synthèse du système locomoteur",
    pages: "34-37",
    section: "Appareil locomoteur - Synthèse",
    objectives: [
      "Relier squelette, articulations, muscles, tendons et ligaments.",
      "Mobiliser les principaux repères anatomiques.",
      "Formuler une localisation précise au niveau DEA.",
    ],
    competencyIds: ["body.system.locomotor", "anatomy.landmarks", "anatomy.location.description"],
    prerequisiteIds: ["dea-p04-l07"],
    difficulty: "medium",
    questions: [
      question({
        kind: "matching",
        prompt: "Associe chaque structure du système locomoteur à sa fonction générale décrite.",
        options: [
          option("Squelette", "Il forme la charpente du corps.", { match: "Charpente du corps" }),
          option("Articulation", "Elle organise l’union et la mobilité entre deux os.", {
            match: "Union de deux os",
          }),
          option("Ligament", "Il contribue à la stabilité articulaire.", {
            match: "Stabilité de l’articulation",
          }),
          option("Tendon", "Il relie le muscle au segment osseux.", {
            match: "Intermédiaire muscle-os",
          }),
        ],
        knowledgeIds: ["K-DEA-P04-001", "K-DEA-P04-006", "K-DEA-P04-008"],
        tags: ["synthese", "association"],
        feedback: feedback(
          "Chaque structure possède un rôle distinct dans l’organisation locomotrice.",
          "Tendon et ligament sont les deux structures le plus souvent interverties.",
          "Squelette-charpente ; articulation-union ; ligament-stabilité ; tendon-muscle-os.",
          "Nommer la bonne structure évite une description anatomique ambiguë.",
          { memoryTip: "Tendon pour le muscle, ligament pour l’articulation." },
        ),
      }),
      question({
        kind: "ordering",
        prompt: "Classe ces repères du haut du corps vers le bas.",
        options: [
          option("Crâne", "Le crâne est le repère le plus haut de la liste."),
          option("Sternum", "Le sternum se situe dans le thorax."),
          option("Bassin", "Le bassin se situe sous le tronc thoracique."),
          option("Fémur", "Le fémur se situe dans la cuisse."),
          option("Tibia", "Le tibia se situe dans la jambe."),
        ],
        knowledgeIds: ["K-DEA-P04-004", "K-DEA-P04-013"],
        tags: ["synthese", "ordre", "reperes"],
        feedback: feedback(
          "L’ordre suit les repères du crâne vers la jambe.",
          "Intervertir bassin et sternum inverse deux régions du tronc.",
          "Crâne → sternum → bassin → fémur → tibia.",
          "Parcourir le corps dans un seul sens aide à vérifier une description.",
        ),
      }),
      question({
        kind: "multiple_choice",
        prompt:
          "Quelles formulations sont anatomiquement précises d’après les repères du parcours ?",
        instruction: "Sélectionne les deux réponses correctes.",
        options: [
          option(
            "Douleur de l’avant-bras droit entre coude et poignet",
            "La formulation précise segment, côté et limites anatomiques.",
            { correct: true },
          ),
          option("Douleur de la région lombaire", "La région du rachis est clairement nommée.", {
            correct: true,
          }),
          option(
            "Douleur quelque part dans le bras",
            "La localisation reste vague et le mot bras peut être mal employé.",
          ),
          option("Mal en bas", "Cette formulation ne donne aucun repère anatomique exploitable."),
        ],
        knowledgeIds: ["K-DEA-P04-010", "K-DEA-P04-011", "K-DEA-P04-013"],
        competencyIds: ["anatomy.location.description", "anatomy.location.transmission"],
        tags: ["transmission", "precision"],
        feedback: feedback(
          "Un segment, un côté et un repère anatomique rendent la localisation exploitable.",
          "Les expressions courantes vagues ne suffisent pas pour une transmission structurée.",
          "Décrire où, de quel côté et par rapport à quel repère.",
          "Reformuler les mots du patient avec une localisation anatomique fidèle, sans modifier ses symptômes.",
        ),
      }),
      question({
        kind: "single",
        prompt: "Quelle distinction est correcte ?",
        options: [
          option(
            "Le tendon relie le muscle à l’os, le ligament stabilise l’articulation",
            "Cette distinction reprend les fonctions décrites.",
            { correct: true },
          ),
          option(
            "Le tendon stabilise l’articulation, le ligament produit le mouvement",
            "Les deux rôles sont mal attribués.",
          ),
          option(
            "Le cartilage relie le muscle à l’os",
            "Le cartilage recouvre les surfaces articulaires décrites.",
          ),
          option(
            "La synovie constitue le corps d’un os long",
            "La synovie est articulaire ; la diaphyse est le corps de l’os long.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-006", "K-DEA-P04-008"],
        difficulty: "medium",
        tags: ["tendon", "ligament", "synthese"],
        feedback: feedback(
          "Le tendon est l’intermédiaire muscle-os ; le ligament contribue à la stabilité articulaire.",
          "La proximité anatomique de ces structures explique leur confusion fréquente.",
          "Tendon et ligament ont des relations différentes.",
          "Ne pas utiliser ces termes comme synonymes dans un bilan descriptif.",
        ),
      }),
      question({
        kind: "true_false",
        prompt:
          "Le mouvement locomoteur dépend des seuls muscles, indépendamment du squelette et des articulations.",
        correct: false,
        trueExplanation: "Cette affirmation isole le muscle du système auquel il participe.",
        falseExplanation: "Le mouvement associe muscles, segments osseux et articulations.",
        knowledgeIds: ["K-DEA-P04-001", "K-DEA-P04-006", "K-DEA-P04-008"],
        tags: ["synthese", "mouvement"],
        feedback: feedback(
          "L’affirmation est fausse : le mouvement résulte de l’action musculaire sur des segments osseux articulés.",
          "Attribuer toute la fonction à une seule structure oublie l’organisation en système.",
          "Le système locomoteur fonctionne par coopération de plusieurs structures.",
          "Identifier séparément les structures concernées tout en comprenant leur interaction.",
        ),
      }),
      question({
        kind: "clinical_case",
        prompt:
          "Une personne signale une douleur entre le genou et la cheville gauches. Quelle transmission anatomique est la plus adaptée ?",
        options: [
          option(
            "Douleur de la jambe gauche, région tibia-péroné",
            "La formulation correspond au segment et aux repères osseux décrits.",
            { correct: true },
          ),
          option("Douleur de la cuisse gauche", "La cuisse se situe au-dessus du genou."),
          option("Douleur du membre supérieur gauche", "Le membre supérieur n’est pas concerné."),
          option(
            "Douleur en bas à gauche",
            "La formulation est trop vague pour être anatomiquement exploitable.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-012", "K-DEA-P04-013"],
        competencyIds: [
          "anatomy.region.lower-limb",
          "anatomy.location.description",
          "anatomy.location.transmission",
        ],
        difficulty: "medium",
        tags: ["jambe", "cas", "transmission"],
        feedback: feedback(
          "Entre genou et cheville, le segment est la jambe ; tibia et péroné en sont les repères osseux principaux.",
          "Le langage courant peut appeler tout le membre « jambe », mais ici les limites anatomiques sont explicites.",
          "Genou-cheville = jambe.",
          "Transmettre segment, côté et repère sans annoncer la nature de la lésion.",
          { safetyPoint: "Une localisation précise n’autorise pas à conclure à une fracture." },
        ),
      }),
      question({
        kind: "fill_blank",
        prompt: "Complète : la partie centrale d’un os long est la ______.",
        options: [
          option("diaphyse", "La diaphyse correspond au corps central de l’os long.", {
            correct: true,
          }),
        ],
        knowledgeIds: ["K-DEA-P04-005"],
        tags: ["os-long", "diaphyse"],
        feedback: feedback(
          "Le terme attendu est « diaphyse ».",
          "Les épiphyses sont les extrémités et ne désignent pas la partie centrale.",
          "Diaphyse au centre, épiphyses aux extrémités.",
          "Ce vocabulaire améliore la précision de localisation sur un os long.",
          { memoryTip: "Diaphyse : au milieu ; épiphyses : aux extrémités." },
        ),
      }),
      question({
        kind: "single",
        prompt: "Quelle formulation respecte le mieux le niveau DEA et les données disponibles ?",
        options: [
          option(
            "Décrire la région, le côté et le repère sans poser de diagnostic",
            "La description anatomique précise reste dans le périmètre des connaissances sourcées.",
            { correct: true },
          ),
          option(
            "Affirmer une fracture à partir de la douleur seule",
            "La source anatomique et la douleur seule ne permettent pas cette conclusion.",
          ),
          option(
            "Forcer le mouvement pour identifier l’articulation",
            "Le parcours n’autorise pas un test forcé, particulièrement en contexte douloureux.",
          ),
          option(
            "Inventer un mécanisme lésionnel absent",
            "Une transmission doit rester fidèle aux éléments recueillis.",
          ),
        ],
        knowledgeIds: ["K-DEA-P04-013"],
        competencyIds: ["anatomy.location.description", "anatomy.location.transmission"],
        difficulty: "medium",
        tags: ["dea", "securite", "transmission"],
        feedback: feedback(
          "Le rôle attendu ici est de localiser et transmettre fidèlement, sans transformer un repère anatomique en diagnostic.",
          "Une erreur fréquente consiste à surinterpréter une douleur ou une déformation sans données suffisantes.",
          "Observer, localiser, décrire et transmettre ; ne pas inventer.",
          "Utiliser les repères du parcours pour structurer le bilan anatomique.",
          {
            safetyPoint:
              "Le contenu de ce parcours ne remplace pas les protocoles de prise en charge traumatique.",
          },
        ),
      }),
    ],
  },
];

const BOSS = {
  id: "dea-p04-boss",
  pages: "34-37",
  section: "Appareil locomoteur - Boss de synthèse",
  competencyIds: [
    "body.system.locomotor",
    "anatomy.landmarks",
    "anatomy.location.description",
    "anatomy.location.transmission",
  ],
  questions: [
    question({
      kind: "clinical_case",
      prompt:
        "Une victime consciente indique une douleur entre le coude et le poignet droits. Quel bilan anatomique est le plus précis ?",
      options: [
        option(
          "Douleur de l’avant-bras droit, au niveau du radius et du cubitus",
          "Le segment et ses deux principaux repères osseux sont correctement identifiés.",
          { correct: true },
        ),
        option(
          "Douleur du bras droit, au niveau de l’humérus",
          "Le bras est situé entre l’épaule et le coude.",
        ),
        option(
          "Douleur de la main droite, au niveau des phalanges",
          "La main est située au-delà du poignet.",
        ),
        option("Douleur du membre inférieur droit", "Le membre inférieur n’est pas concerné."),
      ],
      knowledgeIds: ["K-DEA-P04-004", "K-DEA-P04-011", "K-DEA-P04-013"],
      competencyIds: [
        "anatomy.region.upper-limb",
        "anatomy.location.description",
        "anatomy.location.transmission",
      ],
      difficulty: "medium",
      tags: ["boss", "avant-bras", "transmission"],
      feedback: feedback(
        "La zone coude-poignet correspond à l’avant-bras, où se situent radius et cubitus.",
        "Le mot bras est souvent employé pour tout le membre supérieur mais manque ici de précision.",
        "Coude-poignet = avant-bras.",
        "Associer côté, segment et repères osseux dans la transmission.",
        { safetyPoint: "Ne pas déduire une fracture de cette seule localisation." },
      ),
    }),
    question({
      kind: "matching",
      prompt: "Associe chaque repère au segment corporel exact.",
      options: [
        option("Humérus", "Il correspond au bras.", { match: "Bras" }),
        option("Fémur", "Il correspond à la cuisse.", { match: "Cuisse" }),
        option("Tibia et péroné", "Ils correspondent à la jambe.", { match: "Jambe" }),
        option("Carpe", "Il correspond au poignet.", { match: "Poignet" }),
      ],
      knowledgeIds: ["K-DEA-P04-004", "K-DEA-P04-011", "K-DEA-P04-012"],
      difficulty: "medium",
      tags: ["boss", "association", "reperes"],
      feedback: feedback(
        "Les associations utilisent les repères osseux majeurs du parcours.",
        "Bras/avant-bras et cuisse/jambe sont les couples de segments le plus souvent confondus.",
        "Humérus-bras ; fémur-cuisse ; tibia/péroné-jambe ; carpe-poignet.",
        "Vérifier le segment avant d’ajouter le nom de l’os.",
      ),
    }),
    question({
      kind: "single",
      prompt: "Quelle structure contribue directement à stabiliser une articulation ?",
      options: [
        option("Le ligament", "Le support attribue aux ligaments la stabilité articulaire.", {
          correct: true,
        }),
        option("Le tendon", "Le tendon est décrit comme l’intermédiaire entre muscle et os."),
        option("La diaphyse", "La diaphyse est la partie centrale d’un os long."),
        option(
          "Le muscle lisse",
          "Le muscle lisse n’est pas présenté comme stabilisateur ligamentaire.",
        ),
      ],
      knowledgeIds: ["K-DEA-P04-006", "K-DEA-P04-008"],
      difficulty: "medium",
      tags: ["boss", "ligament", "articulation"],
      feedback: feedback(
        "Le ligament participe à la stabilité de l’articulation.",
        "Tendon et ligament sont souvent confondus parce qu’ils se trouvent tous deux dans l’appareil locomoteur.",
        "Ligament : articulation ; tendon : muscle-os.",
        "Employer le bon terme lors d’une description anatomique.",
      ),
    }),
    question({
      kind: "ordering",
      prompt: "Classe ces repères du membre inférieur du plus proximal au plus distal.",
      options: [
        option("Bassin", "Il constitue le repère proximal de la liste."),
        option("Fémur", "Il suit le bassin dans la cuisse."),
        option("Rotule", "Elle se situe au niveau du genou."),
        option("Tibia et péroné", "Ils se situent dans la jambe."),
        option("Phalanges", "Elles se situent aux orteils, en distal."),
      ],
      knowledgeIds: ["K-DEA-P04-012", "K-DEA-P04-013"],
      competencyIds: ["anatomy.region.lower-limb", "anatomy.landmarks"],
      difficulty: "medium",
      tags: ["boss", "ordre", "membre-inferieur"],
      feedback: feedback(
        "L’ordre suit le membre inférieur du bassin vers les orteils.",
        "La rotule peut être placée après le tibia par confusion entre genou et jambe.",
        "Bassin → fémur → rotule → tibia/péroné → phalanges.",
        "Suivre le membre dans un sens constant sécurise le repérage.",
      ),
    }),
    question({
      kind: "multiple_choice",
      prompt: "Quels éléments participent ensemble au mouvement locomoteur décrit ?",
      instruction: "Sélectionne les trois réponses correctes.",
      options: [
        option("Les segments osseux", "Les muscles agissent sur des segments osseux.", {
          correct: true,
        }),
        option("Les articulations", "Elles permettent les mouvements entre les os.", {
          correct: true,
        }),
        option("Les muscles", "Leurs contractions et relaxations produisent le mouvement.", {
          correct: true,
        }),
        option("Le système digestif seul", "Il ne remplace pas l’organisation locomotrice."),
        option(
          "Le liquide synovial seul",
          "La synovie est un composant articulaire, pas l’ensemble du système.",
        ),
      ],
      knowledgeIds: ["K-DEA-P04-001", "K-DEA-P04-006", "K-DEA-P04-008"],
      difficulty: "medium",
      tags: ["boss", "mouvement", "systeme"],
      feedback: feedback(
        "Le mouvement associe segments osseux, articulations et action musculaire.",
        "Choisir un seul composant revient à oublier la logique de système.",
        "Le mouvement est une fonction coordonnée du système locomoteur.",
        "Distinguer les structures tout en comprenant leur coopération.",
      ),
    }),
    question({
      kind: "true_false",
      prompt: "La diaphyse correspond à l’une des deux extrémités d’un os long.",
      correct: false,
      trueExplanation: "Cette proposition confond la diaphyse avec une épiphyse.",
      falseExplanation: "La diaphyse est la partie centrale ; les épiphyses sont les extrémités.",
      knowledgeIds: ["K-DEA-P04-005"],
      difficulty: "medium",
      tags: ["boss", "os-long"],
      feedback: feedback(
        "L’affirmation est fausse : la diaphyse forme le corps central de l’os long.",
        "Les préfixes et la présence de deux épiphyses peuvent favoriser l’inversion.",
        "Diaphyse au centre, épiphyses aux extrémités.",
        "Utiliser ces termes uniquement lorsque la zone de l’os est clairement localisée.",
        { memoryTip: "Épiphyses aux extrémités." },
      ),
    }),
    question({
      kind: "clinical_case",
      prompt:
        "Une personne signale une douleur au bas du dos, juste au-dessus du sacrum. Quelle information transmettre en priorité dans ce Boss anatomique ?",
      options: [
        option(
          "La douleur est localisée dans la région lombaire",
          "Cette formulation nomme la région anatomique correspondante.",
          { correct: true },
        ),
        option(
          "La personne a forcément une lésion vertébrale",
          "La localisation seule ne permet pas d’affirmer une lésion.",
        ),
        option("La douleur est cervicale", "La région cervicale correspond au cou."),
        option("La douleur concerne le membre supérieur", "Le repère décrit appartient au rachis."),
      ],
      knowledgeIds: ["K-DEA-P04-010", "K-DEA-P04-013"],
      competencyIds: [
        "anatomy.landmarks",
        "anatomy.location.description",
        "anatomy.location.transmission",
      ],
      difficulty: "medium",
      tags: ["boss", "rachis", "lombaire"],
      feedback: feedback(
        "La région lombaire est le repère anatomique correct pour la zone située au-dessus du sacrum.",
        "Transformer immédiatement une localisation en diagnostic dépasse les informations disponibles.",
        "Localiser précisément avant d’interpréter.",
        "Transmettre la région, le contexte et les observations réellement recueillies.",
        {
          safetyPoint:
            "En contexte traumatique, appliquer les protocoles validés sans provoquer de mouvement inutile.",
        },
      ),
    }),
    question({
      kind: "single",
      prompt: "Quelle conclusion finale est la plus rigoureuse après ce parcours ?",
      options: [
        option(
          "Le système locomoteur associe plusieurs structures qu’il faut localiser sans surinterpréter",
          "Cette conclusion relie les connaissances du parcours à une description DEA prudente.",
          { correct: true },
        ),
        option(
          "Toute douleur osseuse prouve une fracture",
          "Une douleur ne suffit pas à établir ce diagnostic.",
        ),
        option(
          "Un ligament et un tendon sont deux noms de la même structure",
          "Leurs relations et fonctions décrites diffèrent.",
        ),
        option(
          "Le bras et l’avant-bras sont un seul segment anatomique",
          "Le coude sépare ces deux segments.",
        ),
      ],
      knowledgeIds: ["K-DEA-P04-001", "K-DEA-P04-013"],
      competencyIds: [
        "body.system.locomotor",
        "anatomy.location.description",
        "anatomy.location.transmission",
      ],
      difficulty: "medium",
      tags: ["boss", "synthese", "dea"],
      feedback: feedback(
        "Le parcours vise une compréhension structurée et un repérage précis, sans diagnostic non étayé.",
        "La surinterprétation clinique et l’emploi de termes interchangeables sont les erreurs principales à éviter.",
        "Comprendre, localiser, décrire et transmettre fidèlement.",
        "Appliquer ce vocabulaire au bilan tout en respectant les limites des données observées.",
        {
          safetyPoint:
            "Les conduites de prise en charge doivent rester fondées sur les protocoles validés applicables.",
        },
      ),
    }),
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
    competencyIds: config.competencyIds ?? lesson.competencyIds,
    lessonId: lesson.id,
    plannedParcoursIds: [PARCOURS_ID],
    pedagogicalFeedback,
    validationStatus: "to_validate",
    generationSource: "library_extracted_knowledge",
    why_correct: pedagogicalFeedback.whyCorrect,
    common_mistake: pedagogicalFeedback.commonMistake,
    key_takeaway: pedagogicalFeedback.keyTakeaway,
    ...(pedagogicalFeedback.memoryTip ? { memory_tip: pedagogicalFeedback.memoryTip } : {}),
    tags: ["dea", "parcours-04", ...(config.tags ?? [])],
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
      competencyIds: config.competencyIds ?? lesson.competencyIds,
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
    tags: ["dea", "parcours-04", "validation-a-effectuer"],
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
    id: "dea-p04-boss",
    title: "Boss - Système locomoteur",
    kind: "boss",
    status: "review",
    difficulty: "medium",
    estimatedMinutes: 12,
    level: 1,
    xp: null,
    tags: ["dea", "parcours-04", "boss", "validation-a-effectuer"],
    pedagogicalReference: `${SOURCE_TITLE}, p. 34-37`,
    pulse: null,
    selection: { strategy: "all", count: items.length },
    learningObjectives: [
      "Identifier les principaux éléments du système locomoteur.",
      "Localiser les principaux repères osseux et articulaires.",
      "Distinguer os, articulation, muscle, tendon et ligament.",
    ],
    competencyIds: boss.competencyIds,
    prerequisiteIds: ["dea-p04-l08"],
    bossConfiguration: {
      objective: "Valider les principaux repères du système locomoteur au niveau DEA.",
      scenario:
        "Une victime consciente signale une douleur d’un membre. L’apprenant doit localiser et nommer les structures sans poser de diagnostic.",
      tasks: [
        "Identifier le segment corporel.",
        "Nommer le repère anatomique utile.",
        "Distinguer les structures locomotrices.",
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

async function assertNoExistingActiveFiles() {
  try {
    const entries = await readFile(join(OUTPUT_DIR, "lesson-01.json"), "utf8");
    if (entries.trim()) throw new Error("Le Parcours 4 possède déjà un fichier actif.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await assertNoExistingActiveFiles();
await mkdir(OUTPUT_DIR, { recursive: true });
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
await writeJson(join(ROOT, "docs", "master_knowledge_base", "documents", `${SOURCE_ID}.json`), {
  schema_version: "1.0.0",
  document_id: SOURCE_ID,
  title: "Module 4 - Appréciation de l’état clinique du patient",
  organization: "AFTRAL - Institut de Formation d’Ambulanciers",
  document_type: "training_source",
  content_status: "content_verified",
  version: SOURCE_VERSION,
  pages: 175,
  analyzed_scope: "Appareil locomoteur, pages 34 à 38",
  analysis_status: "partial_content_verified",
  review_status: "source_verified",
  knowledge: KNOWLEDGE,
});
console.log(
  `Parcours 4 généré : ${LESSONS.length} leçons, ${LESSONS.length * 8} questions et 8 questions de Boss.`,
);
