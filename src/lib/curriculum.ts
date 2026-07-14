export type QuestionType = "mcq" | "match";

export interface Question {
  id: string;
  type: "mcq";
  prompt: string;
  question: string;
  choices: string[];
  answer: number; // index
  explanation?: string;
}

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  questions: Question[];
}

export interface Unit {
  id: string;
  title: string;
  subtitle: string;
  color: string; // css var name suffix
  icon: string;
  lessons: Lesson[];
}

// Helper to build MCQ quickly
const q = (
  id: string,
  question: string,
  choices: string[],
  answer: number,
  explanation?: string,
  prompt = "Choisis la bonne réponse",
): Question => ({ id, type: "mcq", prompt, question, choices, answer, explanation });

import { DEA_UNITS } from "./curriculum-dea";

const BASE_UNITS: Unit[] = [
  {
    id: "os",
    title: "Les Os",
    subtitle: "Squelette et ossature",
    color: "primary",
    icon: "🦴",
    lessons: [
      {
        id: "os-1",
        title: "Os du crâne et du visage",
        emoji: "🧠",
        questions: [
          q("os-1-1", "Comment s'appelle l'os du front ?", ["Frontal", "Pariétal", "Occipital", "Temporal"], 0),
          q("os-1-2", "Quel os forme la mâchoire inférieure ?", ["Maxillaire", "Mandibule", "Zygomatique", "Vomer"], 1),
          q("os-1-3", "Où se trouve l'os occipital ?", ["Devant le crâne", "Sur les côtés", "À l'arrière du crâne", "Sous la mâchoire"], 2),
          q("os-1-4", "Combien y a-t-il d'os pariétaux ?", ["1", "2", "3", "4"], 1),
          q("os-1-5", "Les os zygomatiques forment les :", ["Tempes", "Pommettes", "Sourcils", "Oreilles"], 1),
        ],
      },
      {
        id: "os-2",
        title: "Colonne vertébrale",
        emoji: "🦴",
        questions: [
          q("os-2-1", "Combien de vertèbres cervicales ?", ["5", "7", "12", "24"], 1),
          q("os-2-2", "Combien de vertèbres dorsales (thoraciques) ?", ["7", "10", "12", "15"], 2),
          q("os-2-3", "Combien de vertèbres lombaires ?", ["3", "5", "7", "12"], 1),
          q("os-2-4", "L'atlas est :", ["La 1ère cervicale", "La 1ère lombaire", "Le sacrum", "Le coccyx"], 0),
          q("os-2-5", "Le sacrum est composé de vertèbres :", ["Mobiles", "Soudées", "Cartilagineuses", "Absentes"], 1),
        ],
      },
      {
        id: "os-3",
        title: "Membres supérieurs",
        emoji: "💪",
        questions: [
          q("os-3-1", "Os du bras ?", ["Fémur", "Humérus", "Tibia", "Radius"], 1),
          q("os-3-2", "Os de l'avant-bras (côté pouce) ?", ["Cubitus", "Ulna", "Radius", "Carpe"], 2),
          q("os-3-3", "La clavicule s'articule avec :", ["Fémur", "Sternum", "Bassin", "Crâne"], 1),
          q("os-3-4", "Le carpe se trouve :", ["Au poignet", "Au coude", "À l'épaule", "Au doigt"], 0),
          q("os-3-5", "Combien de phalanges par doigt (sauf pouce) ?", ["1", "2", "3", "4"], 2),
        ],
      },
      {
        id: "os-4",
        title: "Membres inférieurs",
        emoji: "🦵",
        questions: [
          q("os-4-1", "Os le plus long du corps ?", ["Tibia", "Fémur", "Humérus", "Fibula"], 1),
          q("os-4-2", "La rotule protège :", ["La hanche", "Le genou", "La cheville", "Le coude"], 1),
          q("os-4-3", "Os du talon ?", ["Calcanéus", "Talus", "Cuboïde", "Naviculaire"], 0),
          q("os-4-4", "Péroné est l'ancien nom de :", ["Tibia", "Fibula", "Fémur", "Rotule"], 1),
          q("os-4-5", "Tarse, métatarse, phalanges sont les os :", ["De la main", "Du pied", "Du bassin", "Du crâne"], 1),
        ],
      },
    ],
  },
  {
    id: "organes",
    title: "Les Organes",
    subtitle: "Anatomie interne",
    color: "success",
    icon: "❤️",
    lessons: [
      {
        id: "org-1",
        title: "Système cardiovasculaire",
        emoji: "❤️",
        questions: [
          q("org-1-1", "Combien de cavités a le cœur ?", ["2", "3", "4", "5"], 2),
          q("org-1-2", "Les ventricules éjectent le sang vers :", ["Les oreillettes", "Les artères", "Les veines caves", "Les capillaires"], 1),
          q("org-1-3", "Le sang oxygéné arrive au cœur par :", ["Veines caves", "Veines pulmonaires", "Artère aorte", "Artères pulmonaires"], 1),
          q("org-1-4", "La plus grosse artère du corps ?", ["Fémorale", "Carotide", "Aorte", "Pulmonaire"], 2),
          q("org-1-5", "Les valvules empêchent :", ["La coagulation", "Le reflux du sang", "L'oxygénation", "La contraction"], 1),
        ],
      },
      {
        id: "org-2",
        title: "Système respiratoire",
        emoji: "🫁",
        questions: [
          q("org-2-1", "L'air passe des bronches aux :", ["Alvéoles", "Ventricules", "Néphrons", "Villosités"], 0),
          q("org-2-2", "Le muscle principal de la respiration ?", ["Diaphragme", "Trapèze", "Cœur", "Larynx"], 0),
          q("org-2-3", "La trachée se divise en :", ["Bronchioles", "Bronches", "Alvéoles", "Poumons"], 1),
          q("org-2-4", "Le poumon droit a combien de lobes ?", ["1", "2", "3", "4"], 2),
          q("org-2-5", "Les échanges gazeux se font dans :", ["La trachée", "Le larynx", "Les alvéoles", "Les bronches"], 2),
        ],
      },
      {
        id: "org-3",
        title: "Système digestif",
        emoji: "🍽️",
        questions: [
          q("org-3-1", "Ordre correct :", ["Bouche → estomac → œsophage", "Bouche → œsophage → estomac", "Estomac → bouche → intestin", "Œsophage → bouche → estomac"], 1),
          q("org-3-2", "Le foie produit :", ["L'insuline", "La bile", "L'urine", "Le mucus"], 1),
          q("org-3-3", "L'absorption des nutriments se fait principalement dans :", ["L'estomac", "Le côlon", "L'intestin grêle", "L'œsophage"], 2),
          q("org-3-4", "Le pancréas sécrète :", ["Bile uniquement", "Insuline et enzymes", "Urée", "Salive"], 1),
          q("org-3-5", "Le côlon fait partie de :", ["L'intestin grêle", "Le gros intestin", "L'estomac", "Le foie"], 1),
        ],
      },
      {
        id: "org-4",
        title: "Système urinaire & nerveux",
        emoji: "🧠",
        questions: [
          q("org-4-1", "L'unité fonctionnelle du rein est :", ["Alvéole", "Néphron", "Neurone", "Villosité"], 1),
          q("org-4-2", "L'urine passe du rein à la vessie par :", ["L'urètre", "L'uretère", "Le canal cholédoque", "Le tube digestif"], 1),
          q("org-4-3", "La cellule du système nerveux est :", ["Neurone", "Néphron", "Myocyte", "Hépatocyte"], 0),
          q("org-4-4", "Le SNC comprend :", ["Cerveau et moelle épinière", "Nerfs uniquement", "Muscles", "Glandes"], 0),
          q("org-4-5", "Le cervelet contrôle :", ["La vision", "L'équilibre et coordination", "La digestion", "La respiration"], 1),
        ],
      },
    ],
  },
  {
    id: "prefixes",
    title: "Préfixes",
    subtitle: "Le début du mot",
    color: "warning",
    icon: "🔤",
    lessons: [
      {
        id: "pref-1",
        title: "Préfixes de quantité & position",
        emoji: "🔤",
        questions: [
          q("pref-1-1", "« Hyper- » signifie :", ["En dessous", "Au-dessus / excès", "Autour", "Avant"], 1, "Hypertension = tension trop élevée."),
          q("pref-1-2", "« Hypo- » signifie :", ["Excès", "Insuffisance / en dessous", "Autour", "À travers"], 1),
          q("pref-1-3", "« Péri- » signifie :", ["À l'intérieur", "Autour", "Avant", "Sous"], 1, "Péricarde = autour du cœur."),
          q("pref-1-4", "« Endo- » signifie :", ["À l'extérieur", "Autour", "À l'intérieur", "Au-dessus"], 2),
          q("pref-1-5", "« Sub- » signifie :", ["Sur", "Sous", "À côté", "Dans"], 1),
        ],
      },
      {
        id: "pref-2",
        title: "Préfixes médicaux courants",
        emoji: "🧬",
        questions: [
          q("pref-2-1", "« Tachy- » signifie :", ["Lent", "Rapide", "Absent", "Double"], 1, "Tachycardie = rythme cardiaque rapide."),
          q("pref-2-2", "« Brady- » signifie :", ["Rapide", "Lent", "Fort", "Faible"], 1),
          q("pref-2-3", "« A- » ou « An- » signifie :", ["Sans / absence", "Plus", "Petit", "Grand"], 0, "Anémie = manque de sang."),
          q("pref-2-4", "« Dys- » signifie :", ["Bien", "Difficulté / anomalie", "Excès", "Absence"], 1, "Dyspnée = difficulté à respirer."),
          q("pref-2-5", "« Poly- » signifie :", ["Un seul", "Plusieurs", "Sans", "À travers"], 1),
        ],
      },
    ],
  },
  {
    id: "suffixes",
    title: "Suffixes",
    subtitle: "La fin du mot",
    color: "accent",
    icon: "✏️",
    lessons: [
      {
        id: "suf-1",
        title: "Suffixes de pathologie",
        emoji: "🩺",
        questions: [
          q("suf-1-1", "« -ite » indique :", ["Une ablation", "Une inflammation", "Une tumeur", "Une douleur"], 1, "Ex : appendicite, gastrite."),
          q("suf-1-2", "« -ome » indique souvent :", ["Une inflammation", "Une tumeur", "Un rétrécissement", "Un examen"], 1, "Ex : carcinome, lipome."),
          q("suf-1-3", "« -algie » signifie :", ["Ablation", "Douleur", "Formation", "Rupture"], 1, "Ex : névralgie, myalgie."),
          q("suf-1-4", "« -ose » indique :", ["Inflammation aiguë", "Maladie / état chronique", "Douleur", "Coupure"], 1, "Ex : arthrose, cirrhose."),
          q("suf-1-5", "« -pathie » signifie :", ["Guérison", "Maladie", "Réparation", "Analyse"], 1),
        ],
      },
      {
        id: "suf-2",
        title: "Suffixes chirurgicaux & d'examen",
        emoji: "🔬",
        questions: [
          q("suf-2-1", "« -ectomie » signifie :", ["Ouverture", "Ablation chirurgicale", "Examen", "Suture"], 1, "Appendicectomie = ablation de l'appendice."),
          q("suf-2-2", "« -tomie » signifie :", ["Ablation", "Incision / ouverture", "Réparation", "Mesure"], 1),
          q("suf-2-3", "« -stomie » signifie :", ["Ablation", "Création d'un abouchement", "Suture", "Fermeture"], 1, "Colostomie = abouchement du côlon."),
          q("suf-2-4", "« -scopie » signifie :", ["Ablation", "Examen visuel avec instrument", "Réparation", "Radiographie"], 1),
          q("suf-2-5", "« -graphie » désigne :", ["Une chirurgie", "Un enregistrement / image", "Une douleur", "Une inflammation"], 1),
        ],
      },
    ],
  },
  {
    id: "radicaux",
    title: "Radicaux",
    subtitle: "La racine du mot",
    color: "primary",
    icon: "🌱",
    lessons: [
      {
        id: "rad-1",
        title: "Radicaux d'organes",
        emoji: "🌱",
        questions: [
          q("rad-1-1", "« Cardio- » désigne :", ["Le foie", "Le cœur", "Le rein", "Le poumon"], 1),
          q("rad-1-2", "« Néphro- » désigne :", ["Le rein", "Le foie", "Le nerf", "Le nez"], 0),
          q("rad-1-3", "« Hépato- » désigne :", ["Le cœur", "Le foie", "L'estomac", "La rate"], 1),
          q("rad-1-4", "« Pneumo- » désigne :", ["Le rein", "Le poumon", "Le pancréas", "Le colon"], 1),
          q("rad-1-5", "« Gastro- » désigne :", ["L'intestin", "L'estomac", "Le foie", "Le pancréas"], 1),
        ],
      },
      {
        id: "rad-2",
        title: "Radicaux tissus & structures",
        emoji: "🧬",
        questions: [
          q("rad-2-1", "« Ostéo- » désigne :", ["Le muscle", "L'os", "Le sang", "Le nerf"], 1),
          q("rad-2-2", "« Myo- » désigne :", ["Le muscle", "L'os", "La peau", "Le sang"], 0),
          q("rad-2-3", "« Derm(o)- » désigne :", ["La peau", "L'œil", "Le nez", "L'oreille"], 0),
          q("rad-2-4", "« Hémato- » désigne :", ["Le foie", "Le sang", "L'urine", "La lymphe"], 1),
          q("rad-2-5", "« Neuro- » désigne :", ["Le nerf", "Le rein", "Le nez", "La peau"], 0),
        ],
      },
    ],
  },
  {
    id: "pathologies",
    title: "Pathologies",
    subtitle: "Applique tout ce que tu as appris",
    color: "destructive",
    icon: "⚕️",
    lessons: [
      {
        id: "pat-1",
        title: "Pathologies cardio-respiratoires",
        emoji: "❤️‍🩹",
        questions: [
          q("pat-1-1", "L'infarctus du myocarde est :", ["Une inflammation du foie", "Une nécrose du muscle cardiaque", "Un trouble digestif", "Une infection pulmonaire"], 1),
          q("pat-1-2", "« Péricardite » signifie :", ["Ablation du péricarde", "Inflammation autour du cœur", "Tumeur du cœur", "Rythme lent"], 1, "Péri- (autour) + card (cœur) + -ite (inflammation)."),
          q("pat-1-3", "Une bronchite est :", ["Une tumeur", "Une inflammation des bronches", "Une ablation", "Une douleur pulmonaire"], 1),
          q("pat-1-4", "La BPCO touche :", ["Les reins", "Les poumons", "Le foie", "Le cerveau"], 1),
          q("pat-1-5", "Une tachycardie est :", ["Un rythme lent", "Un rythme rapide", "Une absence de pouls", "Une douleur thoracique"], 1),
        ],
      },
      {
        id: "pat-2",
        title: "Pathologies digestives & urinaires",
        emoji: "🩺",
        questions: [
          q("pat-2-1", "« Gastrite » signifie :", ["Ablation de l'estomac", "Inflammation de l'estomac", "Tumeur", "Rétrécissement"], 1),
          q("pat-2-2", "Une cirrhose touche :", ["Le rein", "Le foie", "Le pancréas", "L'estomac"], 1),
          q("pat-2-3", "« Néphrite » signifie :", ["Inflammation du rein", "Ablation du rein", "Douleur du rein", "Calcul rénal"], 0),
          q("pat-2-4", "Une colite est :", ["Une ablation du côlon", "Une inflammation du côlon", "Une tumeur du côlon", "Un abouchement"], 1),
          q("pat-2-5", "L'appendicectomie est :", ["L'inflammation de l'appendice", "L'ablation de l'appendice", "Une douleur", "Un examen"], 1),
        ],
      },
      {
        id: "pat-3",
        title: "Pathologies ostéo-articulaires & neuro",
        emoji: "🦴",
        questions: [
          q("pat-3-1", "L'arthrose est :", ["Une inflammation aiguë", "Une usure chronique des articulations", "Une fracture", "Un cancer"], 1, "-ose = état chronique."),
          q("pat-3-2", "L'ostéoporose est :", ["Une fragilité des os", "Une tumeur osseuse", "Une luxation", "Une infection"], 0),
          q("pat-3-3", "Une myalgie est :", ["Une douleur musculaire", "Une inflammation osseuse", "Une paralysie", "Une fracture"], 0, "Myo- (muscle) + -algie (douleur)."),
          q("pat-3-4", "L'AVC est :", ["Un accident vasculaire cérébral", "Une inflammation du cœur", "Une atteinte hépatique", "Une fracture"], 0),
          q("pat-3-5", "Une hémiplégie est :", ["Une paralysie totale", "Une paralysie d'un côté du corps", "Une douleur diffuse", "Un tremblement"], 1),
        ],
      },
      {
        id: "pat-4",
        title: "Décoder les termes complexes",
        emoji: "🧩",
        questions: [
          q("pat-4-1", "« Hépatomégalie » signifie :", ["Ablation du foie", "Augmentation de taille du foie", "Inflammation du foie", "Douleur du foie"], 1),
          q("pat-4-2", "« Dyspnée » signifie :", ["Absence de respiration", "Difficulté à respirer", "Respiration rapide", "Respiration normale"], 1),
          q("pat-4-3", "« Bradycardie » signifie :", ["Rythme cardiaque rapide", "Rythme cardiaque lent", "Arrêt cardiaque", "Fibrillation"], 1),
          q("pat-4-4", "« Colonoscopie » est :", ["Une ablation du côlon", "Un examen visuel du côlon", "Une inflammation", "Une chirurgie"], 1),
          q("pat-4-5", "« Néphrectomie » signifie :", ["Inflammation du rein", "Examen du rein", "Ablation du rein", "Douleur du rein"], 2),
        ],
      },
    ],
  },
];

// Ordre pédagogique : d'abord les bases du vocabulaire médical (préfixes / suffixes /
// radicaux), puis l'anatomie (os, organes), puis les pathologies qui réutilisent tout
// ce qui précède, et enfin les cas et gestes de terrain (DEA ambulancier).
const ORDER = ["prefixes", "suffixes", "radicaux", "os", "organes", "pathologies"];
const ORDERED_BASE = ORDER
  .map((id) => BASE_UNITS.find((u) => u.id === id))
  .filter((u): u is Unit => Boolean(u));
export const UNITS: Unit[] = [...ORDERED_BASE, ...DEA_UNITS];

// Ids de repères pour le placement de niveau (onboarding).
export const LEVEL_MILESTONES = {
  debutant: [] as string[],
  vocabulaire: ["prefixes", "suffixes", "radicaux"],
  anatomie: ["prefixes", "suffixes", "radicaux", "os", "organes", "pathologies"],
  dea: ["prefixes", "suffixes", "radicaux", "os", "organes", "pathologies"],
} as const;
export type LevelKey = keyof typeof LEVEL_MILESTONES;

export function lessonsForLevel(level: LevelKey): string[] {
  const unitIds = LEVEL_MILESTONES[level];
  const out: string[] = [];
  for (const uid of unitIds) {
    const u = UNITS.find((x) => x.id === uid);
    if (u) for (const l of u.lessons) out.push(l.id);
  }
  return out;
}

export function findLesson(lessonId: string): { unit: Unit; lesson: Lesson } | null {
  for (const unit of UNITS) {
    const lesson = unit.lessons.find((l) => l.id === lessonId);
    if (lesson) return { unit, lesson };
  }
  return null;
}

export function allLessonsInOrder(): { unitId: string; lessonId: string }[] {
  const out: { unitId: string; lessonId: string }[] = [];
  for (const u of UNITS) for (const l of u.lessons) out.push({ unitId: u.id, lessonId: l.id });
  return out;
}
