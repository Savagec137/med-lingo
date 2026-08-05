import type { GardeCase, GardeOption, GardeQuestion, Vitals } from "./garde-domain";

/* ---------------------------------- utils --------------------------------- */

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function pickMany<T>(list: readonly T[], count: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (pool.length > 0 && out.length < count) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
  }
  return out;
}

function between(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/* --------------------------------- context -------------------------------- */

const ENVIRONMENTS = [
  "Appartement 4e sans ascenseur",
  "Pavillon de banlieue",
  "Usine, zone industrielle",
  "Chemin forestier",
  "Bande d'arrêt d'urgence, autoroute A6",
  "Cour d'école primaire",
  "EHPAD Les Tilleuls",
  "Hall de gare",
  "Vestiaire d'un stade municipal",
  "Parking de supermarché",
  "Chantier de gros œuvre",
  "Camping en bord de lac",
];

const WEATHERS = [
  "Pluie soutenue",
  "Ciel dégagé",
  "Brouillard dense",
  "Vent fort",
  "Chaleur 34 °C",
  "Verglas",
  "Nuit noire",
];

const TRAFFIC = [
  { label: "Trafic fluide", factor: 1 },
  { label: "Trafic dense", factor: 1.5 },
  { label: "Bouchons, itinéraire dévié", factor: 2 },
];

const ANTECEDENTS = [
  "HTA",
  "Diabète de type 2",
  "BPCO",
  "Fibrillation auriculaire",
  "Asthme",
  "Insuffisance cardiaque",
  "AVC ischémique en 2021",
  "Épilepsie",
  "Traitement anticoagulant",
  "Aucun antécédent connu",
];

/* --------------------------------- gestes --------------------------------- */

const GESTURES: Array<{ id: string; label: string }> = [
  { id: "o2", label: "Oxygénothérapie adaptée à la SpO₂" },
  { id: "aspiration", label: "Aspiration des voies aériennes" },
  { id: "pls", label: "Position latérale de sécurité" },
  { id: "dae", label: "Pose du DAE" },
  { id: "rcp", label: "Massage cardiaque 30/2" },
  { id: "bavu", label: "Ventilation au BAVU" },
  { id: "collier", label: "Collier cervical + immobilisation" },
  { id: "plan-dur", label: "Relevage plan dur / matelas coquille" },
  { id: "glycemie", label: "Glycémie capillaire" },
  { id: "sucre", label: "Resucrage adapté" },
  { id: "garrot", label: "Pansement compressif / garrot" },
  { id: "refroidir", label: "Refroidissement de la brûlure" },
  { id: "chaleur", label: "Lutte contre l'hypothermie" },
  { id: "demi-assis", label: "Installation demi-assise" },
  { id: "scope", label: "Scope, TA et SpO₂ en continu" },
  { id: "vvp", label: "Préparation d'une voie veineuse pour le SMUR" },
  { id: "accouchement", label: "Kit d'accouchement prêt" },
  { id: "nouveau-ne", label: "Séchage et réchauffement du nouveau-né" },
  { id: "surveillance", label: "Surveillance rapprochée et réévaluation" },
];

function gestureLabel(id: string): string {
  return GESTURES.find((g) => g.id === id)?.label ?? id;
}

/* ------------------------------- pathologies ------------------------------- */

interface Template {
  id: string;
  label: string;
  family: GardeCase["family"];
  reason: string;
  priority: GardeCase["priority"];
  callerLines: string[];
  ageRange: [number, number];
  vitals: () => Vitals;
  abcde: { correct: string; wrong: string[]; note: string };
  redFlags: string[];
  questions: string[];
  gestures: string[];
  transitEvents: string[];
  decision: { correct: string; note: string; wrong: string[] };
  arrest?: boolean;
  birth?: boolean;
}

const TEMPLATES: Template[] = [
  {
    id: "acr",
    label: "Arrêt cardio-respiratoire",
    family: "cardiac",
    reason: "Personne inconsciente qui ne respire pas",
    priority: "P0",
    callerLines: [
      "Bonjour… mon mari ne respire plus !",
      "Il est tombé, il est tout bleu, il ne bouge plus !",
      "Ma mère ne répond pas, je crois qu'elle ne respire plus…",
    ],
    ageRange: [45, 82],
    vitals: () => ({ spo2: 0, sbp: 0, hr: 0, rr: 0, gcs: 3, pain: 0, glycemia: 5.2 }),
    abcde: {
      correct: "C — absence de pouls carotidien et de ventilation efficace",
      wrong: [
        "D — déficit moteur du côté droit",
        "B — sibilants diffus à l'auscultation",
        "E — hypothermie isolée",
      ],
      note: "Absence de signes de vie : la priorité est la réanimation immédiate.",
    },
    redFlags: ["Absence de pouls", "Absence de ventilation", "Glasgow 3"],
    questions: [
      "Heure exacte de l'effondrement",
      "Un massage a-t-il été débuté avant notre arrivée ?",
      "Douleur thoracique dans les heures précédentes ?",
    ],
    gestures: ["rcp", "dae", "bavu", "aspiration"],
    transitEvents: [
      "Le requérant rappelle : il a commencé le massage cardiaque, il s'épuise.",
      "La régulation déclenche le SMUR en renfort sur votre intervention.",
    ],
    decision: {
      correct: "Poursuivre la RCP sur place et attendre le SMUR engagé",
      note: "En ACR, la réanimation se fait sur place, pas dans le véhicule en mouvement.",
      wrong: [
        "Charger immédiatement le patient et rouler vers l'hôpital",
        "Interrompre la RCP pour un bilan complet",
        "Laisser la famille poursuivre le massage",
      ],
    },
    arrest: true,
  },
  {
    id: "sca",
    label: "Syndrome coronarien aigu",
    family: "cardiac",
    reason: "Douleur thoracique constrictive",
    priority: "P1",
    callerLines: [
      "J'ai une douleur dans la poitrine depuis une heure, ça serre…",
      "Mon père est pâle et se plaint d'un poids sur la poitrine.",
    ],
    ageRange: [48, 79],
    vitals: () => ({
      spo2: between(90, 96),
      sbp: between(95, 145),
      hr: between(52, 112),
      rr: between(18, 26),
      gcs: 15,
      pain: between(6, 9),
      glycemia: 6.1,
    }),
    abcde: {
      correct: "C — douleur thoracique avec sueurs et marbrures",
      wrong: [
        "A — obstruction des voies aériennes",
        "D — pupilles anisocoriques",
        "E — plaie hémorragique du membre inférieur",
      ],
      note: "Signe circulatoire prioritaire : suspicion de SCA.",
    },
    redFlags: ["Douleur > 7/10", "Sueurs profuses", "Irradiation au bras gauche"],
    questions: [
      "Heure de début exacte de la douleur",
      "Irradiation de la douleur (mâchoire, bras) ?",
      "Prise de trinitrine ou d'anticoagulants ?",
    ],
    gestures: ["demi-assis", "o2", "scope", "vvp"],
    transitEvents: [
      "Nouvel appel du requérant : la douleur s'intensifie et il vomit.",
      "La circulation est bloquée, la régulation vous propose un itinéraire bis.",
    ],
    decision: {
      correct: "Bilan au médecin régulateur et transport vers la salle de coronarographie",
      note: "Le SCA impose une filière cardiologie interventionnelle régulée.",
      wrong: [
        "Transport vers les urgences les plus proches sans régulation",
        "Laisser le patient sur place avec conseil de consulter",
        "Faire marcher le patient jusqu'au véhicule",
      ],
    },
  },
  {
    id: "avc",
    label: "Accident vasculaire cérébral",
    family: "neuro",
    reason: "Déficit neurologique brutal",
    priority: "P1",
    callerLines: [
      "Ma femme parle bizarrement et son bras ne bouge plus.",
      "Il a la bouche de travers depuis le petit-déjeuner.",
    ],
    ageRange: [55, 88],
    vitals: () => ({
      spo2: between(92, 98),
      sbp: between(150, 195),
      hr: between(60, 95),
      rr: between(14, 20),
      gcs: between(13, 15),
      pain: between(0, 3),
      glycemia: between(48, 72) / 10,
    }),
    abcde: {
      correct: "D — déficit moteur unilatéral et trouble de la parole",
      wrong: [
        "B — détresse respiratoire majeure",
        "C — état de choc hémorragique",
        "A — corps étranger laryngé",
      ],
      note: "Le déficit neurologique focal oriente vers l'AVC.",
    },
    redFlags: ["Asymétrie faciale", "Déficit du membre supérieur", "Troubles du langage"],
    questions: [
      "Heure précise des derniers signes de normalité",
      "Traitement anticoagulant en cours ?",
      "Antécédent d'AVC ou de fibrillation auriculaire ?",
    ],
    gestures: ["glycemie", "o2", "scope", "surveillance"],
    transitEvents: [
      "Le requérant précise que les troubles ont débuté plus tôt qu'annoncé.",
      "Pluie battante : ralentissement sur le trajet.",
    ],
    decision: {
      correct: "Alerte thrombolyse : transport régulé vers l'unité neurovasculaire",
      note: "L'heure de début conditionne la thrombolyse : chaque minute compte.",
      wrong: [
        "Transport simple vers l'hôpital de proximité",
        "Attendre l'amélioration spontanée sur place",
        "Faire boire le patient pour tester la déglutition",
      ],
    },
  },
  {
    id: "hypoglycemie",
    label: "Hypoglycémie sévère",
    family: "medical",
    reason: "Malaise chez un patient diabétique",
    priority: "P1",
    callerLines: [
      "Mon frère est diabétique, il transpire et il délire.",
      "Elle est confuse et elle tremble beaucoup.",
    ],
    ageRange: [20, 80],
    vitals: () => ({
      spo2: between(94, 99),
      sbp: between(105, 140),
      hr: between(90, 125),
      rr: between(16, 22),
      gcs: between(11, 14),
      pain: 0,
      glycemia: between(12, 28) / 10,
    }),
    abcde: {
      correct: "D — troubles de conscience avec sueurs et tremblements",
      wrong: [
        "C — hémorragie extériorisée",
        "B — bradypnée majeure",
        "E — brûlure étendue du tronc",
      ],
      note: "Toute conscience altérée impose une glycémie capillaire.",
    },
    redFlags: ["Sueurs froides", "Confusion", "Glycémie effondrée"],
    questions: [
      "Dernière injection d'insuline et dernier repas",
      "Épisodes d'hypoglycémie récents ?",
      "Le patient peut-il déglutir sans risque ?",
    ],
    gestures: ["glycemie", "sucre", "surveillance", "scope"],
    transitEvents: [
      "Le requérant signale que le patient devient agressif.",
      "Nouvel appel : le patient a perdu connaissance.",
    ],
    decision: {
      correct: "Resucrage puis contrôle glycémique et avis du régulateur avant orientation",
      note: "On contrôle l'efficacité du resucrage avant toute décision d'orientation.",
      wrong: [
        "Transport immédiat sans resucrage",
        "Laisser sur place sans contrôle glycémique",
        "Donner à boire à un patient somnolent",
      ],
    },
  },
  {
    id: "convulsion",
    label: "Crise convulsive",
    family: "neuro",
    reason: "Crise tonico-clonique",
    priority: "P1",
    callerLines: [
      "Il fait une crise, il tremble de partout !",
      "Ma fille convulse, elle est toute raide.",
    ],
    ageRange: [4, 70],
    vitals: () => ({
      spo2: between(88, 96),
      sbp: between(110, 150),
      hr: between(95, 140),
      rr: between(20, 30),
      gcs: between(8, 13),
      pain: 0,
      glycemia: between(38, 70) / 10,
    }),
    abcde: {
      correct: "A/B — encombrement des voies aériennes en phase post-critique",
      wrong: [
        "C — choc hypovolémique",
        "E — fracture ouverte du fémur",
        "D — pupilles en myosis serré isolé",
      ],
      note: "En post-critique, la liberté des voies aériennes prime.",
    },
    redFlags: ["Phase post-critique", "Encombrement", "Désaturation"],
    questions: [
      "Durée de la crise et heure de début",
      "Antécédent d'épilepsie et traitement",
      "Traumatisme pendant la crise ?",
    ],
    gestures: ["pls", "aspiration", "o2", "glycemie"],
    transitEvents: [
      "Nouvel appel pendant le trajet : le patient convulse de nouveau.",
      "Le requérant indique que la crise dure depuis plus de 5 minutes.",
    ],
    decision: {
      correct: "Bilan régulé, surveillance de la reprise de conscience et transport",
      note: "Une crise prolongée ou répétée impose un avis médical immédiat.",
      wrong: [
        "Laisser le patient sur place dès l'arrêt de la crise",
        "Contenir physiquement le patient pendant la crise",
        "Introduire un objet dans la bouche",
      ],
    },
  },
  {
    id: "asthme",
    label: "Détresse respiratoire aiguë",
    family: "respiratory",
    reason: "Difficulté respiratoire majeure",
    priority: "P1",
    callerLines: [
      "Je n'arrive plus à respirer…",
      "Mon fils est asthmatique et son inhalateur ne fait plus effet.",
    ],
    ageRange: [8, 78],
    vitals: () => ({
      spo2: between(82, 92),
      sbp: between(110, 150),
      hr: between(100, 135),
      rr: between(26, 38),
      gcs: between(13, 15),
      pain: between(0, 3),
      glycemia: 5.6,
    }),
    abcde: {
      correct: "B — polypnée, tirage et désaturation",
      wrong: [
        "C — bradycardie extrême",
        "D — déficit sensitif hémicorporel",
        "E — hypothermie profonde",
      ],
      note: "Détresse ventilatoire : oxygène et position assise sans délai.",
    },
    redFlags: ["SpO₂ < 92 %", "Tirage intercostal", "Phrases hachées"],
    questions: [
      "Traitement de fond et prises récentes",
      "Facteur déclenchant identifié ?",
      "Antécédent d'hospitalisation en réanimation ?",
    ],
    gestures: ["demi-assis", "o2", "scope", "surveillance"],
    transitEvents: [
      "Le requérant signale que le patient ne parle plus qu'en mots isolés.",
      "Brouillard dense : vitesse réduite sur le trajet.",
    ],
    decision: {
      correct: "Bilan au régulateur et transport en position assise sous oxygène",
      note: "Jamais d'allongement forcé chez un patient en détresse respiratoire.",
      wrong: [
        "Allonger le patient à plat pour le transport",
        "Retirer l'oxygène dès amélioration",
        "Laisser sur place après une seule bouffée",
      ],
    },
  },
  {
    id: "polytrauma",
    label: "Polytraumatisé (AVP)",
    family: "trauma",
    reason: "Accident de la voie publique",
    priority: "P0",
    callerLines: [
      "Une voiture est sortie de la route, le conducteur est coincé !",
      "Un scooter a été percuté, il ne se relève pas.",
    ],
    ageRange: [18, 60],
    vitals: () => ({
      spo2: between(88, 95),
      sbp: between(78, 110),
      hr: between(105, 140),
      rr: between(22, 32),
      gcs: between(9, 14),
      pain: between(6, 10),
      glycemia: 5.8,
    }),
    abcde: {
      correct: "C — signes de choc hémorragique avec tachycardie et hypotension",
      wrong: [
        "B — asthme aigu grave",
        "D — hypoglycémie",
        "E — réaction allergique cutanée isolée",
      ],
      note: "Cinétique violente + hypotension : hémorragie interne jusqu'à preuve du contraire.",
    },
    redFlags: ["PAS < 100 mmHg", "Cinétique violente", "Douleur abdominale"],
    questions: [
      "Cinétique de l'accident et port de la ceinture",
      "Perte de connaissance initiale ?",
      "Douleurs rachidiennes ou déficit moteur ?",
    ],
    gestures: ["collier", "plan-dur", "o2", "garrot", "chaleur"],
    transitEvents: [
      "La régulation annonce une seconde victime sur les lieux.",
      "Pluie et nuit : sécurisation renforcée nécessaire à l'arrivée.",
    ],
    decision: {
      correct: "Damage control : immobilisation, bilan régulé, transport en trauma center",
      note: "Le polytraumatisé relève d'un centre spécialisé, pas de l'hôpital le plus proche.",
      wrong: [
        "Extraction rapide sans immobilisation rachidienne",
        "Transport vers la clinique la plus proche",
        "Faire marcher la victime jusqu'au brancard",
      ],
    },
  },
  {
    id: "accouchement",
    label: "Accouchement imminent",
    family: "obstetric",
    reason: "Contractions rapprochées, envie de pousser",
    priority: "P1",
    callerLines: [
      "Ma femme accouche, on n'aura jamais le temps d'aller à la maternité !",
      "J'ai des contractions toutes les deux minutes, j'ai envie de pousser !",
    ],
    ageRange: [19, 42],
    vitals: () => ({
      spo2: between(95, 99),
      sbp: between(110, 140),
      hr: between(90, 120),
      rr: between(18, 26),
      gcs: 15,
      pain: between(7, 10),
      glycemia: 5.4,
    }),
    abcde: {
      correct: "E — travail avancé avec envie de pousser irrépressible",
      wrong: [
        "C — état de choc septique",
        "B — bronchospasme",
        "D — déficit neurologique focal",
      ],
      note: "Envie de pousser = accouchement imminent, on se prépare sur place.",
    },
    redFlags: ["Contractions < 2 min", "Envie de pousser", "Perte des eaux"],
    questions: [
      "Terme de la grossesse et nombre d'enfants",
      "Perte des eaux : heure et couleur",
      "Grossesse suivie, jumeaux, complications ?",
    ],
    gestures: ["accouchement", "nouveau-ne", "chaleur", "surveillance"],
    transitEvents: [
      "Nouvel appel : la tête de l'enfant est visible.",
      "La régulation engage une équipe SMUR pédiatrique.",
    ],
    decision: {
      correct: "Accouchement sur place puis transport mère-enfant régulé vers la maternité",
      note: "Quand la présentation est visible, on n'embarque pas : on accouche sur place.",
      wrong: [
        "Demander à la patiente de se retenir pendant le transport",
        "Transport immédiat vers la maternité la plus lointaine",
        "Attendre le SMUR sans préparer le kit",
      ],
    },
    birth: true,
  },
  {
    id: "sepsis",
    label: "Sepsis",
    family: "medical",
    reason: "Fièvre élevée et confusion",
    priority: "P1",
    callerLines: [
      "Il a 40 de fièvre et il ne reconnaît plus personne.",
      "Elle grelotte, elle est brûlante et très fatiguée.",
    ],
    ageRange: [55, 92],
    vitals: () => ({
      spo2: between(88, 94),
      sbp: between(78, 100),
      hr: between(110, 135),
      rr: between(24, 32),
      gcs: between(12, 15),
      pain: between(2, 6),
      glycemia: 7.4,
    }),
    abcde: {
      correct: "C — hypotension et tachycardie fébriles",
      wrong: [
        "A — obstruction complète des voies aériennes",
        "E — fracture fermée de l'avant-bras",
        "D — crise convulsive en cours",
      ],
      note: "Hypotension + fièvre + confusion : sepsis à régulation urgente.",
    },
    redFlags: ["PAS < 100 mmHg", "FR > 22", "Confusion"],
    questions: [
      "Point d'appel infectieux (urinaire, pulmonaire, cutané)",
      "Depuis quand la fièvre évolue-t-elle ?",
      "Immunodépression ou traitement en cours ?",
    ],
    gestures: ["o2", "scope", "vvp", "surveillance"],
    transitEvents: [
      "Le requérant signale des marbrures sur les genoux.",
      "La régulation demande un bilan précoce dès l'arrivée.",
    ],
    decision: {
      correct: "Bilan régulé urgent et transport rapide vers un service d'accueil des urgences",
      note: "Le sepsis est une urgence horaire : bilan précoce et transport sans délai.",
      wrong: [
        "Conseiller un paracétamol et laisser sur place",
        "Attendre la baisse de la fièvre avant de partir",
        "Transporter sans transmettre les constantes",
      ],
    },
  },
  {
    id: "brulure",
    label: "Brûlure étendue",
    family: "trauma",
    reason: "Brûlure thermique",
    priority: "P1",
    callerLines: [
      "Il s'est renversé une casserole d'huile bouillante !",
      "Un ouvrier a été brûlé par de la vapeur.",
    ],
    ageRange: [6, 65],
    vitals: () => ({
      spo2: between(90, 97),
      sbp: between(95, 130),
      hr: between(100, 130),
      rr: between(20, 28),
      gcs: 15,
      pain: between(7, 10),
      glycemia: 5.9,
    }),
    abcde: {
      correct: "E — brûlure étendue avec risque d'hypothermie",
      wrong: [
        "D — hémiplégie droite",
        "C — bradycardie sinusale",
        "B — apnée prolongée",
      ],
      note: "Refroidir la brûlure, réchauffer le patient.",
    },
    redFlags: ["Surface brûlée étendue", "Douleur majeure", "Risque d'hypothermie"],
    questions: [
      "Nature de l'agent et durée d'exposition",
      "Brûlure du visage ou des voies aériennes ?",
      "Surface atteinte estimée",
    ],
    gestures: ["refroidir", "chaleur", "o2", "surveillance"],
    transitEvents: [
      "Le requérant indique que la victime a inhalé des fumées.",
      "Accès difficile : le véhicule doit se garer à distance.",
    ],
    decision: {
      correct: "Bilan régulé et orientation vers un centre de traitement des brûlés",
      note: "Les brûlures graves relèvent d'une filière spécialisée régulée.",
      wrong: [
        "Appliquer un corps gras sur la brûlure",
        "Percer les phlyctènes avant transport",
        "Transport sans protection thermique",
      ],
    },
  },
  {
    id: "noyade",
    label: "Noyade",
    family: "respiratory",
    reason: "Victime retirée de l'eau",
    priority: "P0",
    callerLines: [
      "On vient de le sortir de l'eau, il ne réagit pas !",
      "Un enfant est tombé dans le lac, il crache de l'eau.",
    ],
    ageRange: [6, 55],
    vitals: () => ({
      spo2: between(72, 88),
      sbp: between(85, 115),
      hr: between(45, 120),
      rr: between(6, 26),
      gcs: between(6, 13),
      pain: 0,
      glycemia: 5.1,
    }),
    abcde: {
      correct: "A/B — encombrement majeur et hypoxie",
      wrong: [
        "C — hémorragie externe massive",
        "D — agitation psychomotrice isolée",
        "E — brûlure du tronc",
      ],
      note: "La noyade est une asphyxie : oxygénation avant tout.",
    },
    redFlags: ["Hypoxie sévère", "Encombrement", "Hypothermie"],
    questions: [
      "Durée d'immersion estimée",
      "Température de l'eau et circonstances de la chute",
      "Traumatisme associé (plongeon) ?",
    ],
    gestures: ["aspiration", "o2", "bavu", "chaleur"],
    transitEvents: [
      "Le requérant signale que la victime devient bleue.",
      "Chemin d'accès boueux : brancardage long à prévoir.",
    ],
    decision: {
      correct: "Oxygénation, lutte contre l'hypothermie et transport régulé systématique",
      note: "Toute noyade, même paucisymptomatique, est transportée pour surveillance.",
      wrong: [
        "Laisser repartir la victime qui semble aller mieux",
        "Comprimer l'abdomen pour évacuer l'eau",
        "Déshabiller la victime en plein vent sans couverture",
      ],
    },
  },
  {
    id: "pendaison",
    label: "Pendaison",
    family: "trauma",
    reason: "Tentative de suicide par pendaison",
    priority: "P0",
    callerLines: [
      "Mon voisin s'est pendu dans son garage, on vient de le décrocher !",
      "Il est suspendu, je n'arrive pas à le décrocher !",
    ],
    ageRange: [18, 60],
    vitals: () => ({
      spo2: between(70, 90),
      sbp: between(80, 120),
      hr: between(40, 130),
      rr: between(0, 18),
      gcs: between(3, 10),
      pain: 0,
      glycemia: 5.5,
    }),
    abcde: {
      correct: "A — atteinte des voies aériennes avec suspicion de lésion rachidienne",
      wrong: [
        "E — brûlure du membre supérieur",
        "C — choc anaphylactique",
        "D — hypoglycémie sévère",
      ],
      note: "Voies aériennes + rachis cervical : les deux se traitent ensemble.",
    },
    redFlags: ["Hypoxie", "Trouble de conscience", "Suspicion rachidienne"],
    questions: [
      "Heure de découverte et durée de suspension",
      "Le patient a-t-il été décroché en soutenant le corps ?",
      "Antécédents psychiatriques et traitements",
    ],
    gestures: ["o2", "collier", "bavu", "scope"],
    transitEvents: [
      "La régulation engage le SMUR et demande la présence des forces de l'ordre.",
      "Le requérant est en panique et ne répond plus clairement.",
    ],
    decision: {
      correct: "Immobilisation rachidienne, oxygénation et transport médicalisé régulé",
      note: "La pendaison associe asphyxie et risque rachidien : jamais de transport simple.",
      wrong: [
        "Mobiliser la tête pour dégager les voies aériennes sans précaution",
        "Transport en position assise sans immobilisation",
        "Laisser sur place après reprise de conscience",
      ],
    },
  },
];

/* -------------------------------- questions -------------------------------- */

function toOptions(
  correct: string[],
  wrong: string[],
  noteCorrect: string,
  noteWrong: string,
): GardeOption[] {
  const options: GardeOption[] = [
    ...correct.map((label, index) => ({
      id: `ok-${index}`,
      label,
      correct: true,
      note: noteCorrect,
    })),
    ...wrong.map((label, index) => ({
      id: `ko-${index}`,
      label,
      correct: false,
      note: noteWrong,
    })),
  ];
  return shuffle(options);
}

function buildQuestions(template: Template, ctx: GardeCase): GardeQuestion[] {
  const dispatchCorrect = [
    "Faire préciser la conscience et la respiration",
    "Localiser précisément l'adresse et l'accès",
    template.priority === "P0"
      ? "Engager immédiatement une équipe"
      : "Engager une équipe et prévenir la régulation médicale",
  ];
  if (template.arrest) dispatchCorrect.push("Guider un massage cardiaque par téléphone");

  const dispatchWrong = pickMany(
    [
      "Rappeler l'appelant dans dix minutes",
      "Demander à l'appelant d'emmener le patient lui-même",
      "Raccrocher pour libérer la ligne",
      "Attendre un second appel pour confirmer",
      "Demander le numéro de sécurité sociale avant d'engager",
    ],
    3,
  );

  const vitalsCorrect = template.redFlags;
  const vitalsWrong = pickMany(
    [
      "Température normale à 37,1 °C",
      "Glasgow à 15 sans particularité",
      "Pouls radial parfaitement régulier",
      "Absence totale de douleur exprimée",
      "Coloration cutanée normale",
    ],
    3,
  );

  const interroWrong = pickMany(
    [
      "Profession et employeur du patient",
      "Situation familiale détaillée",
      "Opinion de l'entourage sur le diagnostic",
      "Historique des vacances récentes",
    ],
    2,
  );

  const gestureWrong = pickMany(
    GESTURES.filter((g) => !template.gestures.includes(g.id)).map((g) => g.label),
    4,
  );

  const bilanCorrect = [
    "Âge, sexe et motif d'appel",
    "Constantes complètes et évolution",
    "Antécédents et traitements en cours",
    "Gestes réalisés et effet obtenu",
    "Délai d'arrivée estimé à l'hôpital",
  ];
  const bilanWrong = pickMany(
    [
      "Description du décor de l'appartement",
      "Avis personnel sur le diagnostic final",
      "Nom du voisin qui a appelé",
      "Détails du trajet emprunté",
    ],
    2,
  );

  return [
    {
      phase: "dispatch",
      eyebrow: "Centre 15 — appel entrant",
      title: "Traitement de l'appel",
      prompt: `« ${ctx.callerLine} » — Que faites-vous immédiatement ?`,
      multiple: true,
      options: toOptions(
        dispatchCorrect,
        dispatchWrong,
        "Action attendue lors de la prise d'appel.",
        "Action inutile ou dangereuse qui retarde l'engagement.",
      ),
      timeCostMinutes: 3,
    },
    {
      phase: "transit",
      eyebrow: `Départ VSAV — ${ctx.etaMinutes} min estimées`,
      title: "Adaptation pendant le trajet",
      prompt: `${ctx.transitEvent} Comment adaptez-vous la prise en charge ?`,
      multiple: false,
      options: toOptions(
        [
          template.arrest
            ? "Confirmer la poursuite du massage guidé et préparer le DAE"
            : "Anticiper le matériel nécessaire et informer l'équipage",
        ],
        pickMany(
          [
            "Continuer sans modifier la préparation",
            "Demander à l'appelant de rappeler plus tard",
            "Augmenter la vitesse au maximum sans sécurité",
          ],
          3,
        ),
        "Anticiper pendant le trajet fait gagner de précieuses minutes.",
        "Réaction inadaptée : elle n'améliore pas la prise en charge.",
      ),
      timeCostMinutes: ctx.etaMinutes,
    },
    {
      phase: "abcde",
      eyebrow: `Sur place — ${ctx.environment}`,
      title: "Bilan primaire ABCDE",
      prompt: "Quelle est l'anomalie prioritaire retrouvée au bilan primaire ?",
      multiple: false,
      options: toOptions(
        [template.abcde.correct],
        template.abcde.wrong,
        template.abcde.note,
        "Ce n'est pas l'atteinte prioritaire de ce patient.",
      ),
      timeCostMinutes: 3,
    },
    {
      phase: "vitals",
      eyebrow: "Constantes",
      title: "Éléments d'alerte",
      prompt: "Quelles constantes ou signes doivent déclencher une alerte ?",
      multiple: true,
      options: toOptions(
        vitalsCorrect,
        vitalsWrong,
        "Signe d'alerte à transmettre au régulateur.",
        "Donnée rassurante : ce n'est pas un critère d'alerte ici.",
      ),
      timeCostMinutes: 3,
    },
    {
      phase: "interrogation",
      eyebrow: "Interrogatoire",
      title: "Questions utiles",
      prompt: "Quelles questions posez-vous au patient ou à l'entourage ?",
      multiple: true,
      options: toOptions(
        template.questions,
        interroWrong,
        "Élément qui change la prise en charge ou l'orientation.",
        "Information sans impact sur la conduite à tenir.",
      ),
      timeCostMinutes: 4,
    },
    {
      phase: "gestures",
      eyebrow: "Gestes",
      title: "Actions à réaliser",
      prompt: "Sélectionnez les gestes adaptés à ce patient.",
      multiple: true,
      options: toOptions(
        template.gestures.map(gestureLabel),
        gestureWrong,
        "Geste indiqué : son oubli dégrade le patient.",
        "Geste non indiqué ici : il fait perdre du temps.",
      ),
      timeCostMinutes: 6,
    },
    {
      phase: "regulation",
      eyebrow: "Médecin régulateur",
      title: "« Bilan ? »",
      prompt: "Construisez un bilan oral structuré : que transmettez-vous ?",
      multiple: true,
      options: toOptions(
        bilanCorrect,
        bilanWrong,
        "Élément indispensable d'un bilan structuré.",
        "Information parasite : elle allonge le bilan sans l'enrichir.",
      ),
      timeCostMinutes: 3,
    },
    {
      phase: "decision",
      eyebrow: "Décision",
      title: "Orientation du patient",
      prompt: "Quelle décision prenez-vous après accord du régulateur ?",
      multiple: false,
      options: toOptions(
        [template.decision.correct],
        template.decision.wrong,
        template.decision.note,
        "Orientation inadaptée au tableau clinique.",
      ),
      timeCostMinutes: 4,
    },
  ];
}

/* -------------------------------- generator -------------------------------- */

export function generateGardeCase(clockMinutes: number, index: number): GardeCase {
  const template = pick(TEMPLATES);
  const age = between(template.ageRange[0], template.ageRange[1]);
  const sex = Math.random() > 0.5 ? "Homme" : "Femme";
  const traffic = pick(TRAFFIC);
  const distanceKm = between(2, 24);
  const etaMinutes = Math.max(4, Math.round((distanceKm / 60) * 60 * traffic.factor) + 2);
  const environment = pick(ENVIRONMENTS);
  const weather = pick(WEATHERS);

  const base: GardeCase = {
    id: `garde-case-${index}-${Date.now()}`,
    pathologyId: template.id,
    pathologyLabel: template.label,
    family: template.family,
    callerLine: pick(template.callerLines),
    reason: template.reason,
    priority: template.priority,
    patientLabel: `${sex}, ${age} ans`,
    age,
    sex,
    antecedents: pickMany(ANTECEDENTS, between(1, 3)),
    environment,
    weather,
    trafficLabel: traffic.label,
    distanceKm,
    etaMinutes,
    transitEvent: pick(template.transitEvents),
    vitals: template.vitals(),
    questions: [],
    isCardiacArrest: Boolean(template.arrest),
    isBirth: Boolean(template.birth),
  };

  base.questions = buildQuestions(template, base);
  void clockMinutes;
  return base;
}
