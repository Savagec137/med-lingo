import caseCatalog from "./intervention-aftral-cases.json" with { type: "json" };
import type { ScenarioIllustration } from "./intervention-domain.ts";
import type {
  DispatchActionId,
  ShiftCaseTemplate,
  ShiftEnvironment,
  ShiftTraffic,
  ShiftWeather,
  TravelDecisionId,
} from "./intervention-shift-domain.ts";

interface RawCaseCatalog {
  source: string;
  version: number;
  cases: Array<Omit<ShiftCaseTemplate, "source">>;
}

const rawCatalog = caseCatalog as RawCaseCatalog;

if (rawCatalog.source !== "IFA AFTRAL") {
  throw new Error("La source du catalogue AFTRAL est invalide.");
}

const ids = new Set<string>();
const orders = new Set<number>();
for (const item of rawCatalog.cases) {
  if (!item.id || ids.has(item.id)) throw new Error(`Cas AFTRAL dupliqué ou sans ID : ${item.id}`);
  if (!Number.isInteger(item.order) || item.order < 1 || orders.has(item.order)) {
    throw new Error(`Ordre AFTRAL invalide ou dupliqué : ${item.order}`);
  }
  if (item.availability === "playable" && !item.mappedScenarioId) {
    throw new Error(`Le cas jouable ${item.id} ne référence aucun scénario.`);
  }
  ids.add(item.id);
  orders.add(item.order);
}

export const AFTRAL_CASE_CATALOG: ShiftCaseTemplate[] = [...rawCatalog.cases]
  .sort((left, right) => left.order - right.order)
  .map((item) => ({ ...item, source: "IFA AFTRAL" }));

export const PLAYABLE_AFTRAL_CASES = AFTRAL_CASE_CATALOG.filter(
  (item) => item.availability === "playable",
);

export const DISPATCH_ACTIONS: ReadonlyArray<{
  id: DispatchActionId;
  label: string;
  detail: string;
}> = [
  {
    id: "locate",
    label: "Localiser précisément l’appel",
    detail: "Confirmer l’adresse, l’étage, l’accès et un numéro de rappel.",
  },
  {
    id: "engage",
    label: "Engager les moyens adaptés",
    detail: "Déclencher l’envoi après avoir sécurisé les informations indispensables.",
  },
  {
    id: "question",
    label: "Poser les questions essentielles",
    detail: "Recueillir les signes utiles sans retarder la réponse opérationnelle.",
  },
  {
    id: "advice",
    label: "Transmettre les premiers conseils",
    detail: "Donner uniquement les consignes prévues par le scénario pédagogique.",
  },
];

export const TRAVEL_DECISIONS: ReadonlyArray<{
  id: TravelDecisionId;
  label: string;
  detail: string;
}> = [
  {
    id: "update-regulation",
    label: "Actualiser la régulation et l’équipage",
    detail: "Faire préciser l’évolution et réévaluer la priorité avant l’arrivée.",
  },
  {
    id: "wait-arrival",
    label: "Attendre l’arrivée pour réévaluer",
    detail: "Conserver le plan initial malgré l’information nouvelle.",
  },
  {
    id: "unsafe-speed",
    label: "Accélérer sans réévaluer le risque routier",
    detail: "Chercher à gagner du temps sans actualiser la coordination.",
  },
];

export const SHIFT_WEATHER_LABELS: Record<ShiftWeather, string> = {
  clear: "Temps clair",
  rain: "Pluie",
  storm: "Orage",
  fog: "Brouillard",
  heat: "Forte chaleur",
};

export const SHIFT_TRAFFIC_LABELS: Record<ShiftTraffic, string> = {
  fluid: "Fluide",
  moderate: "Modéré",
  dense: "Dense",
  blocked: "Très perturbé",
};

export const SHIFT_ENVIRONMENT_LABELS: Record<ShiftEnvironment, string> = {
  apartment: "Appartement",
  house: "Maison",
  factory: "Site industriel",
  forest: "Zone boisée",
  highway: "Axe routier",
  school: "Établissement scolaire",
  "nursing-home": "EHPAD",
  station: "Gare",
  stadium: "Stade",
  "public-space": "Espace public",
};

export const ENVIRONMENTS_BY_ILLUSTRATION: Record<ScenarioIllustration, ShiftEnvironment[]> = {
  general: ["apartment", "house", "public-space", "station"],
  cardiac: ["apartment", "house", "public-space", "stadium"],
  respiratory: ["apartment", "school", "nursing-home", "public-space"],
  neurology: ["apartment", "nursing-home", "station", "public-space"],
  metabolic: ["house", "school", "station", "public-space"],
  trauma: ["highway", "factory", "forest", "stadium", "public-space"],
  allergy: ["house", "school", "stadium", "public-space"],
  pediatric: ["house", "school", "public-space"],
  maternity: ["house", "apartment", "public-space"],
  toxicology: ["apartment", "house", "factory", "public-space"],
  complex: ["factory", "highway", "station", "stadium", "public-space"],
};

export const SHIFT_ADDRESSES: Record<ShiftEnvironment, string[]> = {
  apartment: ["12 rue des Tilleuls", "8 avenue Victor-Hugo", "4 place de la République"],
  house: ["27 chemin des Vignes", "6 rue des Écoles", "19 impasse du Moulin"],
  factory: ["Zone industrielle Nord", "Atelier des Forges", "Entrepôt logistique Est"],
  forest: ["Chemin forestier 4", "Aire du Belvédère", "Route départementale 18"],
  highway: ["Axe N104, borne 24", "Boulevard périphérique, sortie 6", "Avenue de l’Europe"],
  school: ["Groupe scolaire Jean-Moulin", "Collège des Acacias", "Lycée du Parc"],
  "nursing-home": ["EHPAD Les Jardins", "Résidence du Parc", "EHPAD Saint-Louis"],
  station: ["Gare centrale", "Parvis de la gare", "Quai des correspondances"],
  stadium: ["Stade municipal", "Gymnase Pierre-Curie", "Complexe sportif Ouest"],
  "public-space": ["Place de la Mairie", "Marché couvert", "Parc municipal"],
};

export const TRAVEL_UPDATES_BY_ILLUSTRATION: Record<ScenarioIllustration, string[]> = {
  general: [
    "Le témoin rappelle : l’état de conscience semble évoluer.",
    "Une nouvelle information modifie le contexte initial de l’appel.",
  ],
  cardiac: [
    "Le témoin signale une dégradation brutale de l’état du patient.",
    "L’appelant décrit un changement de la respiration et de la vigilance.",
  ],
  respiratory: [
    "Le témoin signale que la gêne respiratoire s’accentue.",
    "L’appelant décrit une modification rapide de la respiration.",
  ],
  neurology: [
    "Le témoin signale une modification de la vigilance.",
    "De nouveaux signes neurologiques sont rapportés pendant le trajet.",
  ],
  metabolic: [
    "Le comportement du patient change pendant que l’équipe approche.",
    "L’appelant décrit une baisse de réactivité.",
  ],
  trauma: [
    "Les témoins signalent un changement de l’état de la victime.",
    "L’accès au site et le nombre de personnes présentes sont actualisés.",
  ],
  allergy: [
    "L’appelant rapporte une extension rapide des signes.",
    "La respiration du patient semble se modifier.",
  ],
  pediatric: [
    "Le parent rapporte une modification du comportement de l’enfant.",
    "L’état général de l’enfant semble évoluer.",
  ],
  maternity: [
    "Les contractions se rapprochent selon l’appelant.",
    "La situation obstétricale semble évoluer plus vite que prévu.",
  ],
  toxicology: [
    "Un second impliqué présente maintenant des symptômes.",
    "Le contexte d’exposition est précisé pendant le trajet.",
  ],
  complex: [
    "Le nombre d’impliqués et les risques du site sont réévalués.",
    "Le commandement transmet une évolution de la situation.",
  ],
};

export function getCaseVariantsForScenario(scenarioId: string) {
  return PLAYABLE_AFTRAL_CASES.filter((item) => item.mappedScenarioId === scenarioId);
}
