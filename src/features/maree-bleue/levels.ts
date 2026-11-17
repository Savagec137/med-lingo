/**
 * Marée Bleue — les cinq niveaux.
 *
 * Repère : le canon du joueur est en bas, vers z positif ; la forteresse rouge
 * est en haut, à z = -length. Le chemin s'étend de x = -width/2 à x = +width/2.
 * Toutes les distances sont en mètres « monde ».
 */

export type ThemeId = "jardin" | "canyon" | "fjord" | "forge" | "citadelle";

export type GateOp = "mul" | "div";

export interface GateDef {
  op: GateOp;
  value: number;
  x: number;
  z: number;
  /** Largeur de la porte. */
  w: number;
  /** Porte dorée : gros multiplicateur, plus étroite. */
  gold?: boolean;
  move?: { amp: number; speed: number; phase?: number };
}

export type ObstacleDef =
  | { kind: "box"; minX: number; maxX: number; minZ: number; maxZ: number; height?: number }
  | { kind: "pillar"; x: number; z: number; r: number; height?: number };

export type HazardDef =
  | { kind: "spinner"; x: number; z: number; r: number; speed: number }
  | { kind: "geyser"; x: number; z: number; r: number; period: number; phase?: number };

export interface EnemyDef {
  /** Soldats rouges par seconde au départ. */
  rate: number;
  /** Accroissement du débit, par seconde de partie. */
  ramp: number;
  /** Plafond du débit. */
  maxRate: number;
  /** Horde déjà massée devant la forteresse au lancement. */
  horde: number;
  /** Un colosse rouge toutes les N secondes (0 = jamais). */
  bruteEvery: number;
  /** Abscisses des portes de la forteresse. */
  doors: number[];
  /** Part de porte-pavois parmi les renforts : il faut quatre soldats pour en venir à bout. */
  shieldShare?: number;
  /** Part d'artificiers : rapides, ils explosent au contact et fauchent un groupe entier. */
  bomberShare?: number;
  /** La catapulte ennemie vise le canon toutes les N secondes (absente si 0). */
  boulderEvery?: number;
}

/**
 * Mode Survie : pas de forteresse à abattre. Une horde immense est massée
 * dans un entonnoir au bout du terrain et déferle par son goulot ; on gagne
 * en tenant jusqu'au dernier pillard.
 */
export interface SurvivalDef {
  /** Nombre total de pillards à abattre. */
  total: number;
  /** L'entonnoir, au-delà du bout du terrain : demi-largeur au goulot, au fond, et profondeur. */
  funnel: { throatHalfW: number; topHalfW: number; depth: number };
  /** Pillards lâchés par seconde à travers le goulot : au départ, puis gain par seconde de partie. */
  flow: [number, number];
  /** Une vague toutes les N secondes : le débit double pendant quelques secondes. */
  surgeEvery: number;
  /** Vitesse de marche : piétinement dans l'entonnoir, puis charge à découvert. */
  speed: [number, number];
  /** Or gagné par pillard abattu (ils sont des milliers : moins qu'en siège). */
  goldPerKill: number;
}

export interface LevelDef {
  id: number;
  name: string;
  tagline: string;
  theme: ThemeId;
  width: number;
  length: number;
  baseHp: number;
  playerHp: number;
  /** Tirs par seconde quand on maintient le doigt. */
  fireRate: number;
  /** Tirs nécessaires pour charger un champion. */
  chargeShots: number;
  enemy: EnemyDef;
  gates: GateDef[];
  obstacles: ObstacleDef[];
  hazards: HazardDef[];
  survival?: SurvivalDef;
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "Le Jardin des Arches",
    tagline: "Vise les portes, la foule fera le reste.",
    theme: "jardin",
    width: 11,
    length: 34,
    baseHp: 1100,
    playerHp: 12,
    fireRate: 8,
    chargeShots: 70,
    enemy: {
      rate: 5,
      ramp: 0.16,
      maxRate: 14,
      horde: 140,
      bruteEvery: 0,
      doors: [0],
      shieldShare: 0.05,
    },
    gates: [
      { op: "mul", value: 2, x: -2.6, z: -9, w: 3.4 },
      { op: "mul", value: 3, x: -2.6, z: -18, w: 3.4 },
      { op: "mul", value: 3, x: 2.6, z: -13, w: 3.4 },
    ],
    obstacles: [
      { kind: "box", minX: -5.5, maxX: -3.6, minZ: -25, maxZ: -22.4, height: 1.3 },
      { kind: "box", minX: 3.6, maxX: 5.5, minZ: -25, maxZ: -22.4, height: 1.3 },
    ],
    hazards: [],
  },
  {
    id: 2,
    name: "Le Canyon Doré",
    tagline: "Les portes bougent. Le sable, lui, ne pardonne pas.",
    theme: "canyon",
    width: 11,
    length: 38,
    baseHp: 3600,
    playerHp: 12,
    fireRate: 8,
    chargeShots: 70,
    enemy: {
      rate: 8,
      ramp: 0.24,
      maxRate: 24,
      horde: 260,
      bruteEvery: 14,
      doors: [0],
      shieldShare: 0.09,
      bomberShare: 0.03,
      boulderEvery: 15,
    },
    gates: [
      { op: "mul", value: 3, x: -3, z: -8, w: 3.5 },
      { op: "mul", value: 4, x: 0, z: -14, w: 3.0, move: { amp: 3, speed: 0.7 } },
      {
        op: "mul",
        value: 10,
        x: 0,
        z: -22,
        w: 1.7,
        gold: true,
        move: { amp: 3.6, speed: 1.25, phase: 1.2 },
      },
      { op: "div", value: 2, x: 3, z: -27, w: 3.2 },
    ],
    obstacles: [
      { kind: "pillar", x: 0, z: -18, r: 0.9, height: 2.6 },
      { kind: "pillar", x: -4, z: -26, r: 0.8, height: 2.2 },
    ],
    hazards: [],
  },
  {
    id: 3,
    name: "Le Fjord Gelé",
    tagline: "Trois couloirs de glace. Un seul est généreux.",
    theme: "fjord",
    width: 12,
    length: 40,
    baseHp: 3800,
    playerHp: 12,
    fireRate: 8.5,
    chargeShots: 65,
    enemy: {
      rate: 8,
      ramp: 0.22,
      maxRate: 26,
      horde: 340,
      bruteEvery: 10,
      doors: [-1.5, 1.5],
      shieldShare: 0.11,
      bomberShare: 0.05,
      boulderEvery: 12,
    },
    gates: [
      { op: "mul", value: 2, x: -4, z: -10, w: 3.2 },
      { op: "div", value: 2, x: 0, z: -10, w: 3.2 },
      { op: "mul", value: 5, x: 4, z: -10, w: 3.2 },
      { op: "mul", value: 4, x: 0, z: -22, w: 3.4, move: { amp: 3.5, speed: 0.8 } },
      {
        op: "mul",
        value: 12,
        x: 0,
        z: -29,
        w: 1.6,
        gold: true,
        move: { amp: 4.2, speed: 1.5, phase: 2 },
      },
    ],
    obstacles: [
      { kind: "box", minX: -2.25, maxX: -1.75, minZ: -15.5, maxZ: -6, height: 1.4 },
      { kind: "box", minX: 1.75, maxX: 2.25, minZ: -15.5, maxZ: -6, height: 1.4 },
    ],
    hazards: [],
  },
  {
    id: 4,
    name: "La Forge Volcanique",
    tagline: "Le marteau tourne, les geysers grondent. Passe au bon moment.",
    theme: "forge",
    width: 12,
    length: 42,
    baseHp: 3000,
    playerHp: 12,
    fireRate: 9,
    chargeShots: 60,
    enemy: {
      rate: 7,
      ramp: 0.2,
      maxRate: 26,
      horde: 360,
      bruteEvery: 8,
      doors: [-2, 2],
      shieldShare: 0.13,
      bomberShare: 0.06,
      boulderEvery: 10,
    },
    gates: [
      { op: "mul", value: 3, x: -3.4, z: -8, w: 3.4 },
      { op: "mul", value: 2, x: 3.4, z: -8, w: 3.4 },
      { op: "mul", value: 10, x: 0, z: -19.5, w: 2.2, gold: true, move: { amp: 4.6, speed: 0.85 } },
      { op: "div", value: 3, x: 0, z: -31, w: 3.0, move: { amp: 3.6, speed: 0.9, phase: 1.6 } },
      { op: "mul", value: 2, x: 0, z: -35, w: 5.0 },
    ],
    obstacles: [],
    hazards: [
      { kind: "spinner", x: 0, z: -14, r: 2.4, speed: 1.1 },
      { kind: "geyser", x: -3.7, z: -25, r: 1.6, period: 4.2 },
      { kind: "geyser", x: 3.7, z: -27.5, r: 1.6, period: 4.2, phase: 2.1 },
    ],
  },
  {
    id: 5,
    name: "La Citadelle de Minuit",
    tagline: "Deux portes, trois marteaux, une horde sans fin.",
    theme: "citadelle",
    width: 13,
    length: 46,
    baseHp: 4600,
    playerHp: 14,
    fireRate: 9.5,
    chargeShots: 55,
    enemy: {
      rate: 9.5,
      ramp: 0.24,
      maxRate: 30,
      horde: 500,
      bruteEvery: 6,
      doors: [-3.2, 0, 3.2],
      shieldShare: 0.12,
      bomberShare: 0.06,
      boulderEvery: 8,
    },
    gates: [
      { op: "mul", value: 3, x: 0, z: -8, w: 3.4, move: { amp: 2.6, speed: 1.0 } },
      { op: "div", value: 2, x: 0, z: -8, w: 3.0, move: { amp: 2.6, speed: 1.0, phase: Math.PI } },
      { op: "mul", value: 5, x: 0, z: -19, w: 2.8, move: { amp: 3.2, speed: 0.6, phase: 0.8 } },
      { op: "mul", value: 20, x: 0, z: -27, w: 1.8, gold: true, move: { amp: 4.2, speed: 1.4 } },
      { op: "mul", value: 4, x: -3.6, z: -33, w: 3.4 },
      { op: "div", value: 2, x: 3.6, z: -33, w: 3.4 },
    ],
    obstacles: [
      { kind: "box", minX: -6.5, maxX: -4.4, minZ: -23.4, maxZ: -21.2, height: 1.8 },
      { kind: "box", minX: 4.4, maxX: 6.5, minZ: -23.4, maxZ: -21.2, height: 1.8 },
    ],
    hazards: [
      { kind: "spinner", x: -3.4, z: -14.5, r: 2.1, speed: 1.2 },
      { kind: "spinner", x: 3.4, z: -14.5, r: 2.1, speed: -1.2 },
      { kind: "spinner", x: 0, z: -38.5, r: 3.0, speed: 1.1 },
    ],
  },
];

/**
 * Le mode Survie. Identifiant 0 : il ne fait pas partie de la campagne et
 * reste disponible dès le départ, dans chaque difficulté.
 */
export const SURVIVAL: LevelDef = {
  id: 0,
  name: "La Grande Horde",
  tagline: "Aucune forteresse à prendre. Tiens jusqu'au dernier pillard.",
  theme: "canyon",
  width: 12,
  length: 23,
  baseHp: 0,
  playerHp: 30,
  fireRate: 9.5,
  chargeShots: 60,
  enemy: {
    rate: 0,
    ramp: 0,
    maxRate: 0,
    horde: 0,
    bruteEvery: 9,
    doors: [0],
    shieldShare: 0.1,
    bomberShare: 0.04,
    boulderEvery: 11,
  },
  gates: [
    { op: "mul", value: 3, x: -3.7, z: -6.5, w: 3.4 },
    { op: "mul", value: 2, x: 3.7, z: -6.5, w: 3.4 },
    { op: "mul", value: 3, x: 0, z: -11.5, w: 3.2, move: { amp: 3.9, speed: 0.75 } },
    {
      op: "div",
      value: 2,
      x: 0,
      z: -11.5,
      w: 2.6,
      move: { amp: 3.9, speed: 0.75, phase: Math.PI },
    },
    {
      op: "mul",
      value: 6,
      x: 0,
      z: -16.5,
      w: 1.9,
      gold: true,
      move: { amp: 4.6, speed: 1.3, phase: 0.7 },
    },
  ],
  obstacles: [
    // Lices entre les couloirs, à la sortie du canon.
    { kind: "box", minX: -0.3, maxX: 0.3, minZ: -9, maxZ: -4.4, height: 0.9 },
  ],
  hazards: [],
  survival: {
    total: 7000,
    funnel: { throatHalfW: 2.4, topHalfW: 9.5, depth: 21 },
    flow: [10, 0.3],
    surgeEvery: 24,
    speed: [0.9, 1.7],
    goldPerKill: 0.18,
  },
};

export function starsFor(playerHp: number, maxHp: number): number {
  const ratio = playerHp / maxHp;
  if (ratio >= 0.7) return 3;
  if (ratio >= 0.35) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Difficulté
// ---------------------------------------------------------------------------

export type Difficulty = "facile" | "normal" | "difficile";

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  hint: string;
  /** Multiplie le débit et la horde rouges. Les défenses alliées existent : la horde est plus grosse qu'avant. */
  enemy: number;
  horde: number;
  /** Multiplie l'intervalle entre deux colosses (plus petit = plus fréquent). */
  brute: number;
  baseHp: number;
  playerHpDelta: number;
  /** Or de départ pour les défenses. */
  startGold: number;
  /** Multiplie la part d'ennemis spéciaux (pavois, artificiers). */
  special: number;
  /** Multiplie l'intervalle entre deux tirs de catapulte. */
  boulder: number;
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "facile",
    label: "Facile",
    hint: "Horde réduite, rempart solide.",
    enemy: 0.85,
    horde: 0.8,
    brute: 1.6,
    baseHp: 0.8,
    playerHpDelta: 4,
    startGold: 100,
    special: 0.6,
    boulder: 1.4,
  },
  {
    id: "normal",
    label: "Normal",
    hint: "La marée contre la horde, à armes égales.",
    enemy: 1.1,
    horde: 1.15,
    brute: 0.9,
    baseHp: 1,
    playerHpDelta: 0,
    startGold: 60,
    special: 1,
    boulder: 1,
  },
  {
    id: "difficile",
    label: "Difficile",
    hint: "Horde déchaînée, colosses en série.",
    enemy: 1.3,
    horde: 1.35,
    brute: 0.65,
    baseHp: 1.1,
    playerHpDelta: -2,
    startGold: 30,
    special: 1.2,
    boulder: 0.8,
  },
];

export function difficultyDef(id: Difficulty): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

/** Le niveau tel qu'il se joue dans une difficulté donnée. */
export function withDifficulty(level: LevelDef, id: Difficulty): LevelDef {
  const d = difficultyDef(id);
  const survival = level.survival
    ? {
        ...level.survival,
        total: Math.round((level.survival.total * d.horde) / 50) * 50,
        flow: [level.survival.flow[0] * d.enemy, level.survival.flow[1] * d.enemy] as [
          number,
          number,
        ],
      }
    : undefined;
  return {
    ...level,
    survival,
    baseHp: Math.round((level.baseHp * d.baseHp) / 10) * 10,
    playerHp: Math.max(6, level.playerHp + d.playerHpDelta),
    enemy: {
      ...level.enemy,
      rate: level.enemy.rate * d.enemy,
      ramp: level.enemy.ramp * d.enemy,
      maxRate: level.enemy.maxRate * d.enemy,
      horde: Math.round(level.enemy.horde * d.horde),
      shieldShare: (level.enemy.shieldShare ?? 0) * d.special,
      bomberShare: (level.enemy.bomberShare ?? 0) * d.special,
      boulderEvery: (level.enemy.boulderEvery ?? 0) * d.boulder,
      // Même au niveau 1, la horde envoie des colosses dès le mode difficile.
      bruteEvery:
        level.enemy.bruteEvery > 0 ? level.enemy.bruteEvery * d.brute : id === "difficile" ? 14 : 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Défenses alliées
// ---------------------------------------------------------------------------

export type HelperKind = "mortier" | "baliste";

export interface HelperDef {
  kind: HelperKind;
  label: string;
  hint: string;
  cost: number;
}

/**
 * Le mortier pilonne la horde là où elle est la plus dense ; la baliste est un
 * petit canon allié qui tire ses propres soldats vers la meilleure porte.
 * Chaque défense construite fait riposter la forteresse : plus de pillards.
 */
export const HELPERS: HelperDef[] = [
  { kind: "mortier", label: "Mortier", hint: "Pilonne la horde", cost: 120 },
  { kind: "baliste", label: "Canon allié", hint: "Tire ses soldats", cost: 160 },
];

/** Chaque défense déjà construite renchérit la suivante. */
export function helperCost(kind: HelperKind, built: number) {
  const base = HELPERS.find((h) => h.kind === kind)?.cost ?? 50;
  return Math.round(base * Math.pow(1.5, built));
}

/** Surcroît de renforts rouges par défense construite. */
export const RIPOSTE_PER_HELPER = 0.12;
