/**
 * Données de référence : classes de navires, batteries et munitions.
 *
 * Toutes les valeurs d'équilibrage vivent ici pour rester lisibles en un seul
 * endroit. Unités : mètres-jeu, secondes, points de structure.
 */

export type BatteryId = "babord" | "tribord" | "proue" | "poupe";
export type AmmoId = "boulet" | "chaine" | "mitraille" | "feu";
export type Zone = "coque" | "voiles" | "canons";
export type ShipClassId = "galion" | "cotre" | "brick" | "fregate" | "brulot" | "galiote";
export type AiRole = "joueur" | "harceleur" | "duelliste" | "artilleur" | "kamikaze" | "bombardier";

export const BATTERIES: readonly BatteryId[] = ["babord", "tribord", "proue", "poupe"];
export const AMMO_IDS: readonly AmmoId[] = ["boulet", "chaine", "mitraille", "feu"];
export const ZONES: readonly Zone[] = ["coque", "voiles", "canons"];

export const BATTERY_LABEL: Record<BatteryId, string> = {
  babord: "Bâbord",
  tribord: "Tribord",
  proue: "Proue",
  poupe: "Poupe",
};

export const ZONE_LABEL: Record<Zone, string> = {
  coque: "Coque",
  voiles: "Voiles",
  canons: "Canons",
};

/** Apparence : lue par le rendu, sans effet sur la simulation. */
export interface ShipLook {
  hull: string;
  trim: string;
  sail: string;
  emblem: "crane" | "croix" | "aucun" | "flamme";
  flag: "pavillon-noir" | "pavillon-rouge" | "aucun";
}

export interface MortarSpec {
  damage: number;
  radius: number;
  reload: number;
  minRange: number;
  range: number;
  flightTime: number;
}

export interface RamSpec {
  hull: number;
  sails: number;
  fire: number;
  radius: number;
}

export interface ShipClass {
  id: ShipClassId;
  name: string;
  description: string;
  role: AiRole;
  /** Longueur et largeur de coque. */
  length: number;
  beam: number;
  /** Hauteur du pont au-dessus de l'eau, et sommet de la mâture. */
  deckHeight: number;
  mastHeight: number;
  masts: number;
  hull: number;
  sails: number;
  cannons: number;
  maxSpeed: number;
  accel: number;
  turnRate: number;
  guns: Record<BatteryId, number>;
  gunDamage: number;
  range: number;
  /** Rechargement d'une bordée latérale ; les pièces de chasse rechargent plus vite. */
  reload: number;
  /** Dispersion angulaire (radians) d'un tir à 100 m. */
  spread: number;
  mortar?: MortarSpec;
  ram?: RamSpec;
  bounty: number;
  look: ShipLook;
}

export const SHIP_CLASSES: Record<ShipClassId, ShipClass> = {
  galion: {
    id: "galion",
    name: "Galion",
    description: "Votre navire : trois mâts, deux batteries de six pièces et des pièces de chasse.",
    role: "joueur",
    length: 26,
    beam: 8,
    deckHeight: 3.2,
    mastHeight: 24,
    masts: 3,
    hull: 100,
    sails: 80,
    cannons: 60,
    maxSpeed: 9,
    accel: 2.4,
    turnRate: 0.6,
    guns: { babord: 6, tribord: 6, proue: 2, poupe: 1 },
    gunDamage: 6,
    range: 78,
    reload: 4.5,
    spread: 0.03,
    bounty: 0,
    look: {
      hull: "#3a2414",
      trim: "#c99a3c",
      sail: "#1b1b22",
      emblem: "crane",
      flag: "pavillon-noir",
    },
  },
  cotre: {
    id: "cotre",
    name: "Cotre pirate",
    description: "Rapide et fragile, il tourne autour de sa proie et fuit quand il saigne.",
    role: "harceleur",
    length: 15,
    beam: 5,
    deckHeight: 2,
    mastHeight: 14,
    masts: 1,
    hull: 45,
    sails: 30,
    cannons: 20,
    maxSpeed: 11.5,
    accel: 3.6,
    turnRate: 0.95,
    guns: { babord: 3, tribord: 3, proue: 1, poupe: 0 },
    gunDamage: 4,
    range: 60,
    reload: 4,
    spread: 0.07,
    bounty: 30,
    look: {
      hull: "#4a2c18",
      trim: "#8a2a1e",
      sail: "#9c2a22",
      emblem: "crane",
      flag: "pavillon-noir",
    },
  },
  brick: {
    id: "brick",
    name: "Brick pirate",
    description:
      "Un duelliste : il se met bord à bord et change d'amure pour garder une bordée prête.",
    role: "duelliste",
    length: 21,
    beam: 6.5,
    deckHeight: 2.6,
    mastHeight: 19,
    masts: 2,
    hull: 85,
    sails: 55,
    cannons: 40,
    maxSpeed: 8.8,
    accel: 2.4,
    turnRate: 0.62,
    guns: { babord: 5, tribord: 5, proue: 1, poupe: 1 },
    gunDamage: 5,
    range: 70,
    reload: 5,
    spread: 0.06,
    bounty: 55,
    look: {
      hull: "#2f1d12",
      trim: "#a33224",
      sail: "#7d1f1a",
      emblem: "crane",
      flag: "pavillon-rouge",
    },
  },
  fregate: {
    id: "fregate",
    name: "Frégate corsaire",
    description: "Lourde et lente, elle tient la distance, brise vos voiles puis vous pilonne.",
    role: "artilleur",
    length: 30,
    beam: 9,
    deckHeight: 3.6,
    mastHeight: 27,
    masts: 3,
    hull: 170,
    sails: 110,
    cannons: 80,
    maxSpeed: 7.4,
    accel: 1.6,
    turnRate: 0.42,
    guns: { babord: 8, tribord: 8, proue: 2, poupe: 2 },
    gunDamage: 4.5,
    range: 88,
    reload: 6.5,
    spread: 0.05,
    bounty: 120,
    look: {
      hull: "#1d1a1c",
      trim: "#b8862e",
      sail: "#e4d6b4",
      emblem: "croix",
      flag: "pavillon-rouge",
    },
  },
  brulot: {
    id: "brulot",
    name: "Brûlot",
    description: "Un navire bourré de poudre qui fonce sur vous. Coulez-le avant le contact.",
    role: "kamikaze",
    length: 14,
    beam: 5,
    deckHeight: 1.8,
    mastHeight: 12,
    masts: 1,
    hull: 40,
    sails: 25,
    cannons: 10,
    maxSpeed: 10.5,
    accel: 3,
    turnRate: 0.85,
    guns: { babord: 0, tribord: 0, proue: 0, poupe: 0 },
    gunDamage: 0,
    range: 0,
    reload: 99,
    spread: 0,
    ram: { hull: 32, sails: 20, fire: 0.65, radius: 9 },
    bounty: 25,
    look: { hull: "#3b2a1c", trim: "#5a3a1e", sail: "#6b5a44", emblem: "flamme", flag: "aucun" },
  },
  galiote: {
    id: "galiote",
    name: "Galiote à bombes",
    description: "Elle lobe des bombes de loin : un cercle rouge marque l'impact, sortez-en.",
    role: "bombardier",
    length: 18,
    beam: 7,
    deckHeight: 2.4,
    mastHeight: 15,
    masts: 2,
    hull: 70,
    sails: 45,
    cannons: 35,
    maxSpeed: 6.5,
    accel: 1.8,
    turnRate: 0.5,
    guns: { babord: 2, tribord: 2, proue: 0, poupe: 0 },
    gunDamage: 3,
    range: 50,
    reload: 5,
    spread: 0.08,
    mortar: { damage: 24, radius: 9, reload: 7, minRange: 35, range: 135, flightTime: 3.2 },
    bounty: 70,
    look: {
      hull: "#2c2620",
      trim: "#6d6a62",
      sail: "#8f8a80",
      emblem: "crane",
      flag: "pavillon-noir",
    },
  },
};

export interface AmmoDef {
  id: AmmoId;
  name: string;
  short: string;
  effect: string;
  /** Multiplicateur de dégâts selon la zone touchée. */
  damage: Record<Zone, number>;
  rangeMul: number;
  reloadMul: number;
  speedMul: number;
  pellets: number;
  pelletDamage: number;
  ignite: number;
  /** Zone visée par les pointeurs. */
  aim: Zone;
  /** Munition rationnée (stock par bataille). */
  limited: boolean;
}

export const AMMO: Record<AmmoId, AmmoDef> = {
  boulet: {
    id: "boulet",
    name: "Boulet rond",
    short: "Boulet",
    effect: "Perce la coque. Portée normale.",
    damage: { coque: 1, canons: 0.7, voiles: 0.45 },
    rangeMul: 1,
    reloadMul: 1,
    speedMul: 1,
    pellets: 1,
    pelletDamage: 1,
    ignite: 0.04,
    aim: "coque",
    limited: false,
  },
  chaine: {
    id: "chaine",
    name: "Boulet ramé",
    short: "Ramé",
    effect: "Déchire les voiles : l'ennemi ralentit et tourne mal. Portée réduite.",
    damage: { coque: 0.25, canons: 0.35, voiles: 2.4 },
    rangeMul: 0.72,
    reloadMul: 1.1,
    speedMul: 0.9,
    pellets: 1,
    pelletDamage: 1,
    ignite: 0,
    aim: "voiles",
    limited: false,
  },
  mitraille: {
    id: "mitraille",
    name: "Mitraille",
    short: "Mitraille",
    effect: "Balaye le pont : servants et canons hors d'usage. Courte portée.",
    damage: { coque: 0.2, canons: 1, voiles: 0.35 },
    rangeMul: 0.5,
    reloadMul: 0.9,
    speedMul: 1,
    pellets: 3,
    pelletDamage: 0.6,
    ignite: 0,
    aim: "canons",
    limited: false,
  },
  feu: {
    id: "feu",
    name: "Boulet incendiaire",
    short: "Feu",
    effect: "Embrase le navire touché. Stock limité.",
    damage: { coque: 0.55, canons: 0.5, voiles: 0.7 },
    rangeMul: 0.85,
    reloadMul: 1.25,
    speedMul: 0.95,
    pellets: 1,
    pelletDamage: 1,
    ignite: 0.55,
    aim: "coque",
    limited: true,
  },
};

/** Physique balistique commune. */
export const BALLISTICS = {
  gravity: 18,
  muzzleSpeed: 58,
  ballRadius: 0.4,
  /** Les pièces de chasse rechargent plus vite qu'une bordée complète. */
  chaserReloadMul: 0.55,
  /** Délai entre deux pièces d'une même bordée (tir roulant). */
  rippleDelay: 0.075,
} as const;

/** Réparation du joueur : la réparation immobilise les servants. */
export const REPAIR = {
  duration: 4,
  cooldown: 10,
  hull: 0.32,
  sails: 0.4,
  cannons: 0.4,
} as const;

/** Incendie : intensité 0..1, combattue par l'équipage. */
export const FIRE = {
  hullDps: 4,
  sailsDps: 3,
  cannonsDps: 1.5,
  /** Croissance de base et propagation (plus le feu est grand, plus il s'étend). */
  growth: 0.03,
  spread: 0.03,
  /** Lutte de l'équipage : un équipage valide l'emporte toujours, un pont dévasté non. */
  suppression: 0.09,
  igniteAmount: 0.4,
} as const;

/** Les canonniers pirates visent moins bien que ceux du joueur. */
export const AI_SPREAD_MUL = 2.5;

/** Bonus des navires d'élite (capitaines nommés). */
export const ELITE = {
  structure: 1.45,
  damage: 1.15,
  accuracy: 0.85,
  bounty: 2.5,
} as const;

/** Le cap d'une batterie latérale tolère ±55° autour de la perpendiculaire. */
export const BROADSIDE_ARC = (55 * Math.PI) / 180;
/** Les pièces de chasse tirent dans un cône de ±35°. */
export const CHASER_ARC = (35 * Math.PI) / 180;
