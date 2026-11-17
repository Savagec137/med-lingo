/**
 * Marée Bleue — la simulation.
 *
 * Aucune dépendance au rendu : ce module tourne aussi bien dans le navigateur
 * que dans un test Node. Les foules sont stockées « en colonnes » (typed arrays)
 * pour supporter des milliers de soldats à 60 images par seconde.
 */

import {
  RIPOSTE_PER_HELPER,
  helperCost,
  type GateDef,
  type HazardDef,
  type HelperKind,
  type LevelDef,
  type ObstacleDef,
  type SurvivalDef,
} from "./levels.ts";

export const KIND_NORMAL = 0;
export const KIND_GIANT = 1;

/** Rôles des pillards ordinaires : le pavois encaisse, l'artificier explose au contact. */
export const ROLE_NONE = 0;
export const ROLE_SHIELD = 1;
export const ROLE_BOMBER = 2;

export const R_NORMAL = 0.2;
export const R_GIANT = 0.5;
export const GIANT_SCALE = 2.4;

export const BLUE_CAP = 2200;
/** Pillards vivants au plus : en siège, puis en survie (la horde y est immense). */
export const RED_CAP = 1800;
export const RED_CAP_SURVIVAL = 3000;
const CELL = 0.7;
/** Maille grossière : densités, cibles du mortier, bouchons dans l'entonnoir. */
const COARSE = 2;
/** Maille de navigation, en mètres. */
const NAV = 1;
/** Jusqu'où un soldat repère l'ennemi et dévie de sa route pour aller le chercher. */
const HUNT_BLUE = 8;
const HUNT_RED = 3.4;
/** En deçà, il court droit sur l'adversaire le plus proche. */
const CHARGE = 1.8;
export const BOMB_RADIUS = 1.15;
export const BOULDER_RADIUS = 1.5;
const HELPER_HP = 14;

export type SimState = "playing" | "won" | "lost";

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Pool {
  readonly cap: number;
  n = 0;
  readonly x: Float32Array;
  readonly z: Float32Array;
  readonly pz: Float32Array;
  readonly fx: Float32Array;
  readonly fz: Float32Array;
  readonly sx: Float32Array;
  readonly sz: Float32Array;
  readonly speed: Float32Array;
  readonly age: Float32Array;
  readonly hp: Int16Array;
  readonly maxHp: Int16Array;
  readonly kind: Uint8Array;
  readonly alive: Uint8Array;
  readonly mask: Uint32Array;
  /** Couloir visé (NaN : aucun) — utilisé par les soldats du canon allié. */
  readonly tx: Float32Array;
  /** Profondeur au-delà de laquelle le couloir est oublié. */
  readonly tz: Float32Array;
  /** Rôle d'un pillard ordinaire (ROLE_*). */
  readonly role: Uint8Array;

  constructor(cap: number) {
    this.cap = cap;
    this.x = new Float32Array(cap);
    this.z = new Float32Array(cap);
    this.pz = new Float32Array(cap);
    this.fx = new Float32Array(cap);
    this.fz = new Float32Array(cap);
    this.sx = new Float32Array(cap);
    this.sz = new Float32Array(cap);
    this.speed = new Float32Array(cap);
    this.age = new Float32Array(cap);
    this.hp = new Int16Array(cap);
    this.maxHp = new Int16Array(cap);
    this.kind = new Uint8Array(cap);
    this.alive = new Uint8Array(cap);
    this.mask = new Uint32Array(cap);
    this.tx = new Float32Array(cap);
    this.tz = new Float32Array(cap);
    this.role = new Uint8Array(cap);
  }

  add(
    x: number,
    z: number,
    kind: number,
    hp: number,
    speed: number,
    mask: number,
    fz: number,
  ): number {
    if (this.n >= this.cap) return -1;
    const i = this.n++;
    this.x[i] = x;
    this.z[i] = z;
    this.pz[i] = z;
    this.fx[i] = 0;
    this.fz[i] = fz;
    this.sx[i] = 0;
    this.sz[i] = 0;
    this.speed[i] = speed;
    this.age[i] = 0;
    this.hp[i] = hp;
    this.maxHp[i] = hp;
    this.kind[i] = kind;
    this.alive[i] = 1;
    this.mask[i] = mask;
    this.tx[i] = NaN;
    this.tz[i] = 0;
    this.role[i] = ROLE_NONE;
    return i;
  }

  private copy(dst: number, src: number) {
    this.x[dst] = this.x[src];
    this.z[dst] = this.z[src];
    this.pz[dst] = this.pz[src];
    this.fx[dst] = this.fx[src];
    this.fz[dst] = this.fz[src];
    this.speed[dst] = this.speed[src];
    this.age[dst] = this.age[src];
    this.hp[dst] = this.hp[src];
    this.maxHp[dst] = this.maxHp[src];
    this.kind[dst] = this.kind[src];
    this.alive[dst] = this.alive[src];
    this.mask[dst] = this.mask[src];
    this.tx[dst] = this.tx[src];
    this.tz[dst] = this.tz[src];
    this.role[dst] = this.role[src];
  }

  compact() {
    let i = 0;
    while (i < this.n) {
      if (this.alive[i]) {
        i++;
        continue;
      }
      this.n--;
      if (i !== this.n) this.copy(i, this.n);
    }
  }

  clear() {
    this.n = 0;
  }
}

/** Grille de voisinage reconstruite à chaque pas (tri par comptage). */
class Grid {
  readonly cols: number;
  readonly rows: number;
  readonly minX: number;
  readonly minZ: number;
  readonly start: Int32Array;
  readonly fill: Int32Array;
  readonly items: Int32Array;

  constructor(minX: number, maxX: number, minZ: number, maxZ: number, cap: number) {
    this.minX = minX;
    this.minZ = minZ;
    this.cols = Math.ceil((maxX - minX) / CELL) + 1;
    this.rows = Math.ceil((maxZ - minZ) / CELL) + 1;
    this.start = new Int32Array(this.cols * this.rows + 1);
    this.fill = new Int32Array(this.cols * this.rows);
    this.items = new Int32Array(cap);
  }

  col(x: number) {
    const c = Math.floor((x - this.minX) / CELL);
    return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
  }

  row(z: number) {
    const r = Math.floor((z - this.minZ) / CELL);
    return r < 0 ? 0 : r >= this.rows ? this.rows - 1 : r;
  }

  build(p: Pool) {
    const { start, fill, items } = this;
    start.fill(0);
    for (let i = 0; i < p.n; i++) start[this.col(p.x[i]) + this.row(p.z[i]) * this.cols + 1]++;
    for (let c = 1; c < start.length; c++) start[c] += start[c - 1];
    fill.fill(0);
    for (let i = 0; i < p.n; i++) {
      const c = this.col(p.x[i]) + this.row(p.z[i]) * this.cols;
      items[start[c] + fill[c]++] = i;
    }
  }
}

/**
 * Carte de navigation : pour chaque case, la distance à une cible (ennemi le
 * plus proche, forteresse, rempart…) en contournant les obstacles. Un soldat
 * suit la pente de ce champ : il « sait » où aller.
 */
class Nav {
  readonly cols: number;
  readonly rows: number;
  readonly minX: number;
  readonly minZ: number;
  readonly blocked: Uint8Array;

  constructor(minX: number, maxX: number, minZ: number, maxZ: number) {
    this.minX = minX;
    this.minZ = minZ;
    this.cols = Math.ceil((maxX - minX) / NAV);
    this.rows = Math.ceil((maxZ - minZ) / NAV);
    this.blocked = new Uint8Array(this.cols * this.rows);
  }

  field() {
    return new Float32Array(this.cols * this.rows);
  }

  cell(x: number, z: number) {
    let c = Math.floor((x - this.minX) / NAV);
    let r = Math.floor((z - this.minZ) / NAV);
    if (c < 0) c = 0;
    else if (c >= this.cols) c = this.cols - 1;
    if (r < 0) r = 0;
    else if (r >= this.rows) r = this.rows - 1;
    return c + r * this.cols;
  }

  centerX(c: number) {
    return this.minX + (c + 0.5) * NAV;
  }

  centerZ(r: number) {
    return this.minZ + (r + 0.5) * NAV;
  }

  /**
   * Propage les distances depuis les cases à 0 en contournant les obstacles.
   * Balayages croisés de l'équation eikonale : la distance obtenue est quasi
   * euclidienne, donc sa pente pointe droit vers la cible (pas en diagonale).
   */
  solve(f: Float32Array, sweeps: number) {
    const { cols, rows, blocked } = this;
    const BIG = 1e9;
    for (let s = 0; s < sweeps * 4; s++) {
      const ascC = (s & 1) === 0;
      const ascR = (s & 2) === 0;
      for (let rr = 0; rr < rows; rr++) {
        const r = ascR ? rr : rows - 1 - rr;
        for (let cc = 0; cc < cols; cc++) {
          const c = ascC ? cc : cols - 1 - cc;
          const i = c + r * cols;
          if (blocked[i]) continue;
          const l = c > 0 && !blocked[i - 1] ? f[i - 1] : BIG;
          const rt = c < cols - 1 && !blocked[i + 1] ? f[i + 1] : BIG;
          const u = r > 0 && !blocked[i - cols] ? f[i - cols] : BIG;
          const d = r < rows - 1 && !blocked[i + cols] ? f[i + cols] : BIG;
          let a = l < rt ? l : rt;
          let b = u < d ? u : d;
          if (a > b) {
            const t = a;
            a = b;
            b = t;
          }
          if (a >= BIG) continue;
          let v = a + 1;
          if (v > b) v = (a + b + Math.sqrt(2 - (b - a) * (b - a))) / 2;
          if (v < f[i]) f[i] = v;
        }
      }
    }
  }

  /** Vrai si le point tombe dans une case infranchissable. */
  isBlocked(x: number, z: number) {
    return this.blocked[this.cell(x, z)] === 1;
  }

  /** Valeur interpolée du champ en un point. */
  sample(f: Float32Array, x: number, z: number) {
    const fx = (x - this.minX) / NAV - 0.5;
    const fz = (z - this.minZ) / NAV - 0.5;
    let c = Math.floor(fx);
    let r = Math.floor(fz);
    if (c < 0) c = 0;
    else if (c > this.cols - 2) c = this.cols - 2;
    if (r < 0) r = 0;
    else if (r > this.rows - 2) r = this.rows - 2;
    let tx = fx - c;
    let tz = fz - r;
    tx = tx < 0 ? 0 : tx > 1 ? 1 : tx;
    tz = tz < 0 ? 0 : tz > 1 ? 1 : tz;
    const i = c + r * this.cols;
    return (
      (f[i] * (1 - tx) + f[i + 1] * tx) * (1 - tz) +
      (f[i + this.cols] * (1 - tx) + f[i + this.cols + 1] * tx) * tz
    );
  }
}

export interface GateRuntime {
  def: GateDef;
  x: number;
  counter: number;
  /** Impulsion visuelle 0..1, décroît avec le temps. */
  pulse: number;
  passed: number;
}

export interface HazardRuntime {
  def: HazardDef;
  angle: number;
  /** Geyser : 0 repos, 1 alerte, 2 éruption. */
  phase: number;
  timer: number;
  hitGiants: boolean;
}

export interface SimEvent {
  type:
    | "gate"
    | "baseHit"
    | "playerHit"
    | "fire"
    | "champion"
    | "eruption"
    | "brute"
    | "won"
    | "lost"
    | "spinnerHit"
    | "mortarFire"
    | "shellHit"
    | "balisteFire"
    | "built"
    | "surge"
    | "boom"
    | "helperHit"
    | "helperDown"
    | "boulderLaunch"
    | "boulderHit";
  x: number;
  z: number;
  value: number;
  index: number;
}

/** Une défense alliée posée sur un socle. */
export interface HelperRuntime {
  kind: HelperKind;
  x: number;
  z: number;
  cooldown: number;
  aimX: number;
  aimZ: number;
  recoil: number;
  /** Socle occupé. */
  pad: number;
  /** Les pillards s'en prennent aux défenses : à zéro, elle est détruite. */
  hp: number;
  maxHp: number;
  /** Impulsion visuelle quand elle encaisse un coup. */
  flash: number;
}

/** Rocher de la catapulte ennemie : il vise l'endroit où se trouvait le canon au départ du tir. */
export interface Boulder {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  t: number;
  dur: number;
}

/** Obus de mortier en vol. */
export interface Shell {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  t: number;
  dur: number;
}

export interface SimOptions {
  startGold?: number;
}

const MORTAR_RELOAD = 3;
const MORTAR_RADIUS = 1.7;
const BALISTE_RATE = 2.6;

export interface SimInput {
  /** Abscisse visée par le joueur. */
  targetX: number;
  firing: boolean;
}

export class Sim {
  readonly level: LevelDef;
  readonly blue = new Pool(BLUE_CAP);
  readonly red: Pool;
  readonly gates: GateRuntime[];
  readonly hazards: HazardRuntime[];
  readonly obstacles: ObstacleDef[];
  readonly halfW: number;
  readonly baseZ: number;
  readonly baseHalfW: number;
  readonly cannonZ = 1.3;
  readonly playerLineZ = 0.2;
  /** Mode Survie : réglages de la horde, sinon `null`. */
  readonly survival: SurvivalDef | null;
  /** Bout du terrain dallé : la forteresse en siège, le goulot de l'entonnoir en survie. */
  readonly throatZ: number;
  /** Fond du terrain jouable (au-delà du goulot en survie). */
  readonly farZ: number;
  /** Survie : taille de la horde et pillards qui ne sont pas encore entrés en scène. */
  hordeTotal = 0;
  hordeLeft = 0;
  /** Survie : temps restant de la vague en cours (0 hors vague), et numéro de vague. */
  surge = 0;
  wave = 0;
  private tokens = 0;
  private surgeTimer = 0;
  private boulderTimer = 0;
  private navTick = 0;
  private readonly nav: Nav;
  /** Champs fixes : chemin vers la forteresse (bleus) et vers le rempart (rouges). */
  private readonly goalBlue: Float32Array;
  private readonly goalRed: Float32Array;
  /** Champs recalculés en continu : distance au plus proche ennemi. */
  private readonly huntBlue: Float32Array;
  private readonly huntRed: Float32Array;

  state: SimState = "playing";
  time = 0;
  endTime = 0;
  cannonX = 0;
  cannonVel = 0;
  baseHp: number;
  playerHp: number;
  charge = 0;
  shots = 0;
  kills = 0;
  recoil = 0;
  baseFlash = 0;
  playerFlash = 0;
  /** Or gagné en abattant des pillards, dépensé en défenses. */
  gold: number;
  readonly helpers: HelperRuntime[] = [];
  readonly shells: Shell[] = [];
  readonly boulders: Boulder[] = [];
  /** Canon sonné par un rocher : il ne tire plus pendant ce délai. */
  stun = 0;
  /** Socles où se construisent les défenses, dans l'ordre de remplissage. */
  readonly pads: { x: number; z: number }[];

  /** Morts du pas courant : x, z, équipe, géant — consommé par le rendu. */
  readonly deaths = new Float32Array(4 * 4096);
  deathCount = 0;
  /** Naissances par porte : x, z — pour les étincelles. */
  readonly births = new Float32Array(2 * 2048);
  birthCount = 0;
  readonly events: SimEvent[] = [];

  private readonly rng: () => number;
  private fireAcc = 0;
  private spawnAcc = 0;
  private bruteTimer = 0;
  private doorCursor = 0;
  private readonly gridBlue: Grid;
  private readonly gridRed: Grid;
  private readonly coarseCols: number;
  private readonly coarseRows: number;
  private readonly coarseMinX: number;
  private readonly coarseMinZ: number;
  private readonly densBlue: Float32Array;
  private readonly sumXBlue: Float32Array;
  private readonly densRed: Float32Array;
  private readonly sumXRed: Float32Array;

  constructor(level: LevelDef, seed = 1234, opts: SimOptions = {}) {
    this.level = level;
    this.gold = opts.startGold ?? 60;
    this.rng = makeRng(seed);
    this.halfW = level.width / 2;
    this.survival = level.survival ?? null;
    this.throatZ = -level.length;
    const sv = this.survival;
    if (sv) {
      // Pas de forteresse : « baseZ » devient le fond de l'entonnoir.
      this.farZ = this.throatZ - sv.funnel.depth;
      this.baseZ = this.farZ + 0.5;
      this.baseHalfW = sv.funnel.topHalfW;
      // Deux murs ferment le terrain de part et d'autre du goulot. Ils débordent
      // loin vers l'extérieur pour que les soldats bloqués glissent vers l'ouverture.
      this.obstacles = [
        ...level.obstacles,
        {
          kind: "box",
          minX: -this.halfW - 40,
          maxX: -sv.funnel.throatHalfW,
          minZ: this.throatZ - 1.2,
          maxZ: this.throatZ,
        },
        {
          kind: "box",
          minX: sv.funnel.throatHalfW,
          maxX: this.halfW + 40,
          minZ: this.throatZ - 1.2,
          maxZ: this.throatZ,
        },
      ];
    } else {
      this.farZ = this.throatZ;
      this.baseZ = -level.length + 1.2;
      this.baseHalfW = Math.min(4.2, level.width / 2 - 1);
      this.obstacles = level.obstacles;
    }
    this.red = new Pool(sv ? RED_CAP_SURVIVAL : RED_CAP);
    this.baseHp = level.baseHp;
    this.playerHp = level.playerHp;
    // Socles en retrait des bords : la caméra, proche, ne montre pas toute la largeur.
    const px = this.halfW - 1.9;
    this.pads = [
      { x: -px, z: -2.9 },
      { x: px, z: -2.9 },
      { x: -px, z: -5.9 },
      { x: px, z: -5.9 },
    ];
    this.gates = level.gates.map((def) => ({ def, x: def.x, counter: 0, pulse: 0, passed: 0 }));
    this.hazards = level.hazards.map((def) => ({
      def,
      angle: 0,
      phase: 0,
      timer: 0,
      hitGiants: false,
    }));
    const reach = Math.max(this.halfW, sv ? sv.funnel.topHalfW : 0);
    const minX = -reach - 1;
    const maxX = reach + 1;
    const minZ = this.farZ - 2;
    const maxZ = 4;
    this.gridBlue = new Grid(minX, maxX, minZ, maxZ, BLUE_CAP);
    this.gridRed = new Grid(minX, maxX, minZ, maxZ, this.red.cap);
    this.coarseMinX = minX;
    this.coarseMinZ = minZ;
    this.coarseCols = Math.ceil((maxX - minX) / COARSE) + 1;
    this.coarseRows = Math.ceil((maxZ - minZ) / COARSE) + 1;
    const cells = this.coarseCols * this.coarseRows;
    this.densBlue = new Float32Array(cells);
    this.sumXBlue = new Float32Array(cells);
    this.densRed = new Float32Array(cells);
    this.sumXRed = new Float32Array(cells);
    this.nav = new Nav(minX, maxX, minZ, maxZ);
    this.goalBlue = this.nav.field();
    this.goalRed = this.nav.field();
    this.huntBlue = this.nav.field();
    this.huntRed = this.nav.field();
    this.buildNav();
    if (sv) this.massHorde(sv);
    else this.placeHorde(level.enemy.horde);
    this.bruteTimer = level.enemy.bruteEvery > 0 ? level.enemy.bruteEvery * 0.6 : 0;
    this.boulderTimer = (level.enemy.boulderEvery ?? 0) * 0.8;
  }

  /** Marque les cases infranchissables et calcule les deux chemins fixes. */
  private buildNav() {
    const nav = this.nav;
    const FAR = 1e4;
    for (let r = 0; r < nav.rows; r++) {
      const z = nav.centerZ(r);
      for (let c = 0; c < nav.cols; c++) {
        const x = nav.centerX(c);
        let blocked = Math.abs(x) > this.halfWAt(z) + 0.4 || z < this.farZ - 0.5;
        for (const o of this.obstacles) {
          if (blocked) break;
          if (o.kind === "box") {
            blocked =
              x > o.minX - 0.15 && x < o.maxX + 0.15 && z > o.minZ - 0.15 && z < o.maxZ + 0.15;
          } else {
            blocked = (x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + 0.2) ** 2;
          }
        }
        nav.blocked[c + r * nav.cols] = blocked ? 1 : 0;
      }
    }
    this.goalBlue.fill(FAR);
    this.goalRed.fill(FAR);
    // Bleus : la façade de la forteresse (ou le fond de l'entonnoir en survie).
    const goalZ = this.baseZ + 0.3;
    for (let c = 0; c < nav.cols; c++) {
      const x = nav.centerX(c);
      if (Math.abs(x) <= this.baseHalfW - 0.3) this.goalBlue[nav.cell(x, goalZ)] = 0;
      // Rouges : toute la ligne du rempart.
      if (Math.abs(x) <= this.halfW) this.goalRed[nav.cell(x, this.playerLineZ + 0.6)] = 0;
    }
    nav.solve(this.goalBlue, 4);
    nav.solve(this.goalRed, 4);
  }

  /** Met à jour les deux champs de chasse : où sont les ennemis de chaque camp. */
  private updateHunt() {
    const nav = this.nav;
    const hb = this.huntBlue;
    const hr = this.huntRed;
    hb.fill(HUNT_BLUE);
    hr.fill(HUNT_RED);
    const r = this.red;
    for (let i = 0; i < r.n; i++) hb[nav.cell(r.x[i], r.z[i])] = 0;
    const b = this.blue;
    for (let i = 0; i < b.n; i++) hr[nav.cell(b.x[i], b.z[i])] = 0;
    // Les pillards visent aussi les défenses et le canon.
    for (const h of this.helpers) hr[nav.cell(h.x, h.z)] = 0;
    hr[nav.cell(this.cannonX, this.cannonZ - 0.6)] = 0;
    nav.solve(hb, 1);
    nav.solve(hr, 1);
  }

  /** L'adversaire vivant le plus proche dans le voisinage immédiat, ou -1. */
  private nearest(g: Grid, p: Pool, x: number, z: number) {
    const c0 = g.col(x);
    const r0 = g.row(z);
    let best = -1;
    let bestD = CHARGE * CHARGE * 1.6;
    for (let rr = r0 - 3; rr <= r0 + 3; rr++) {
      if (rr < 0 || rr >= g.rows) continue;
      for (let cc = c0 - 3; cc <= c0 + 3; cc++) {
        if (cc < 0 || cc >= g.cols) continue;
        const cell = cc + rr * g.cols;
        for (let k = g.start[cell]; k < g.start[cell + 1]; k++) {
          const j = g.items[k];
          if (!p.alive[j]) continue;
          const dx = p.x[j] - x;
          const dz = p.z[j] - z;
          const d = dx * dx + dz * dz;
          if (d < bestD) {
            bestD = d;
            best = j;
          }
        }
      }
    }
    return best;
  }

  /** Ajoute un pillard ordinaire en tirant son rôle au sort (pavois, artificier ou simple). */
  private addRaider(x: number, z: number, speed: number, allowBomber = true) {
    const e = this.level.enemy;
    const roll = this.rng();
    const shield = e.shieldShare ?? 0;
    const bomber = allowBomber ? (e.bomberShare ?? 0) : 0;
    let role = ROLE_NONE;
    if (roll < shield) role = ROLE_SHIELD;
    else if (roll < shield + bomber) role = ROLE_BOMBER;
    const hp = role === ROLE_SHIELD ? 3 : 1;
    const k = role === ROLE_SHIELD ? 0.8 : role === ROLE_BOMBER ? 1.55 : 1;
    const i = this.red.add(x, z, KIND_NORMAL, hp, speed * k, 0, 1);
    if (i >= 0) this.red.role[i] = role;
    return i;
  }

  /** Demi-largeur praticable à une profondeur donnée (l'entonnoir s'évase vers le fond). */
  halfWAt(z: number) {
    const sv = this.survival;
    if (!sv || z >= this.throatZ) return this.halfW;
    const t = Math.min(1, (this.throatZ - z) / sv.funnel.depth);
    return sv.funnel.throatHalfW + (sv.funnel.topHalfW - sv.funnel.throatHalfW) * t;
  }

  /** Survie : pillards encore à abattre (vivants + pas encore entrés). */
  get enemiesLeft() {
    return this.hordeLeft + this.red.n;
  }

  /** Survie : part de la horde déjà abattue, de 0 à 1. */
  get hordeProgress() {
    return this.hordeTotal > 0 ? 1 - this.enemiesLeft / this.hordeTotal : 0;
  }

  /** Survie : pillards lâchés par seconde à travers le goulot, à cet instant. */
  get hordeFlow() {
    const sv = this.survival;
    if (!sv) return 0;
    const base = sv.flow[0] + sv.flow[1] * this.time;
    return base * (this.surge > 0 ? 2 : 1) * (1 + 0.1 * this.helpers.length);
  }

  /** Survie : remplit l'entonnoir d'une masse compacte de pillards. */
  private massHorde(sv: SurvivalDef) {
    this.hordeTotal = sv.total;
    const f = sv.funnel;
    const area = f.depth * (f.throatHalfW + f.topHalfW);
    const count = Math.min(sv.total, Math.floor(this.red.cap * 0.82), Math.floor(area * 6.2));
    for (let i = 0; i < count; i++) {
      // Tirage uniforme sur le trapèze : plus de monde là où il est large.
      let t = this.rng();
      const w0 = f.throatHalfW;
      const w1 = f.topHalfW;
      t = (Math.sqrt(w0 * w0 + t * (w1 * w1 - w0 * w0)) - w0) / (w1 - w0);
      const z = this.throatZ - 0.3 - t * (f.depth - 0.8);
      const x = (this.rng() * 2 - 1) * (this.halfWAt(z) - 0.25);
      this.addRaider(x, z, 0.86 + this.rng() * 0.28, false);
    }
    this.hordeLeft = sv.total - count;
  }

  /** Survie : la horde se reforme au fond de l'entonnoir tant qu'il reste des pillards. */
  private refillHorde() {
    const r = this.red;
    let want = Math.min(this.hordeLeft, r.cap - r.n, 6);
    let tries = want * 3;
    while (want > 0 && tries-- > 0) {
      const z = this.farZ + 0.6 + this.rng() * 3;
      const x = (this.rng() * 2 - 1) * (this.halfWAt(z) - 0.3);
      if (this.densRed[this.coarseCell(x, z)] > 22) continue;
      if (this.addRaider(x, z, 0.86 + this.rng() * 0.28) < 0) break;
      this.hordeLeft--;
      want--;
    }
  }

  get championReady() {
    return this.charge >= this.level.chargeShots;
  }

  private placeHorde(count: number) {
    const depth = Math.min(16, 3 + count / 40);
    for (let i = 0; i < count; i++) {
      const t = this.rng();
      const z = this.baseZ + 1.2 + t * depth;
      // Entonnoir : la horde est plus large loin de la forteresse.
      const spread = Math.min(this.halfW - 0.4, 2.5 + t * (this.halfW - 2.5));
      const x = (this.rng() * 2 - 1) * spread;
      this.addRaider(x, z, 0.55 + this.rng() * 0.35, false);
    }
  }

  private emit(type: SimEvent["type"], x: number, z: number, value = 0, index = 0) {
    if (this.events.length < 256) this.events.push({ type, x, z, value, index });
  }

  private pushDeath(x: number, z: number, team: number, giant: number) {
    if (this.deathCount >= 4096) return;
    const o = this.deathCount * 4;
    this.deaths[o] = x;
    this.deaths[o + 1] = z;
    this.deaths[o + 2] = team;
    this.deaths[o + 3] = giant;
    this.deathCount++;
  }

  private kill(p: Pool, i: number, team: number, reward = true) {
    if (!p.alive[i]) return;
    p.alive[i] = 0;
    this.pushDeath(p.x[i], p.z[i], team, p.kind[i]);
    if (team === 1 && reward) {
      this.kills++;
      this.gold += p.kind[i] ? 8 : (this.survival?.goldPerKill ?? 1);
    }
  }

  // --- Défenses alliées -----------------------------------------------------

  costOf(kind: HelperKind) {
    return helperCost(kind, this.helpers.length);
  }

  /** Premier socle libre, ou -1. */
  private freePad() {
    for (let p = 0; p < this.pads.length; p++) {
      if (!this.helpers.some((h) => h.pad === p)) return p;
    }
    return -1;
  }

  canBuild(kind: HelperKind) {
    return this.state === "playing" && this.freePad() >= 0 && this.gold >= this.costOf(kind);
  }

  /** Construit une défense sur le prochain socle libre. La forteresse riposte aussitôt. */
  build(kind: HelperKind): boolean {
    if (!this.canBuild(kind)) return false;
    this.gold -= this.costOf(kind);
    const padIndex = this.freePad();
    const pad = this.pads[padIndex];
    this.helpers.push({
      kind,
      x: pad.x,
      z: pad.z,
      cooldown: 0.8,
      aimX: pad.x,
      aimZ: pad.z - 6,
      recoil: 0,
      pad: padIndex,
      hp: HELPER_HP,
      maxHp: HELPER_HP,
      flash: 0,
    });
    if (this.survival) {
      // Riposte : la horde grossit et déferle plus vite (voir hordeFlow).
      const more = 120 + 60 * this.helpers.length;
      this.hordeTotal += more;
      this.hordeLeft += more;
      this.emit("built", pad.x, pad.z, this.helpers.length, padIndex);
      return true;
    }
    // Riposte : une vague de pillards sort immédiatement des portes.
    const wave = 8 + 5 * this.helpers.length;
    const doors = this.level.enemy.doors;
    for (let k = 0; k < wave; k++) {
      const door = doors[this.doorCursor++ % doors.length];
      this.addRaider(
        door + (this.rng() * 2 - 1) * 1.2,
        this.baseZ + 0.6 + this.rng() * 1.4,
        1.9 + this.rng() * 0.4,
      );
    }
    this.emit("built", pad.x, pad.z, this.helpers.length, padIndex);
    return true;
  }

  /** Une défense encaisse un coup ; détruite, elle libère son socle. */
  private hitHelper(h: HelperRuntime, dmg: number) {
    h.hp -= dmg;
    h.flash = 1;
    if (h.hp > 0) {
      this.emit("helperHit", h.x, h.z, h.hp / h.maxHp, h.pad);
      return;
    }
    this.helpers.splice(this.helpers.indexOf(h), 1);
    this.emit("helperDown", h.x, h.z, 0, h.pad);
  }

  /** Explosion d'un artificier : fauche les soldats bleus alentour. */
  private detonate(x: number, z: number) {
    const b = this.blue;
    const g = this.gridBlue;
    const c0 = g.col(x);
    const r0 = g.row(z);
    const reach = Math.ceil(BOMB_RADIUS / CELL);
    let killed = 0;
    for (let rr = r0 - reach; rr <= r0 + reach; rr++) {
      if (rr < 0 || rr >= g.rows) continue;
      for (let cc = c0 - reach; cc <= c0 + reach; cc++) {
        if (cc < 0 || cc >= g.cols) continue;
        const cell = cc + rr * g.cols;
        for (let k = g.start[cell]; k < g.start[cell + 1]; k++) {
          const j = g.items[k];
          if (!b.alive[j]) continue;
          const dx = b.x[j] - x;
          const dz = b.z[j] - z;
          if (dx * dx + dz * dz > BOMB_RADIUS * BOMB_RADIUS) continue;
          if (b.kind[j]) {
            b.hp[j] -= 6;
            if (b.hp[j] <= 0) this.kill(b, j, 0);
          } else if (killed < 8) {
            this.kill(b, j, 0);
            killed++;
          }
        }
      }
    }
    this.emit("boom", x, z, killed);
  }

  /** Cible du mortier : la masse rouge la plus dense, en priorité près du rempart. */
  private mortarTarget() {
    let best = -1;
    let bestScore = 3;
    // En survie, le mortier garde le goulot : il ne tire pas au fond de l'entonnoir.
    const zMin = this.survival ? this.throatZ - 7 : this.baseZ + 2.5;
    const zMax = this.playerLineZ - 1.5;
    for (let r = 0; r < this.coarseRows; r++) {
      const zc = this.coarseMinZ + (r + 0.5) * COARSE;
      if (zc < zMin || zc > zMax) continue;
      const near = 1 + 1.5 * (1 - (zMax - zc) / (zMax - zMin));
      for (let c = 0; c < this.coarseCols; c++) {
        const idx = c + r * this.coarseCols;
        const score = this.densRed[idx] * near;
        if (score > bestScore) {
          bestScore = score;
          best = idx;
        }
      }
    }
    if (best < 0) return null;
    const r = Math.floor(best / this.coarseCols);
    return { x: this.sumXRed[best] / this.densRed[best], z: this.coarseMinZ + (r + 0.5) * COARSE };
  }

  /** Couloir du canon allié : la porte multiplicatrice la plus rentable, là où elle sera. */
  private bestLane(fromZ: number) {
    let best: { x: number; z: number } | null = null;
    let bestScore = 0;
    for (const g of this.gates) {
      if (g.def.op !== "mul" || g.def.z >= fromZ) continue;
      const tArr = (fromZ - g.def.z) / 5.4;
      const m = g.def.move;
      let gx = m
        ? g.def.x + Math.sin((this.time + tArr) * m.speed + (m.phase ?? 0)) * m.amp
        : g.def.x;
      const lim = this.halfW - g.def.w / 2;
      gx = Math.max(-lim, Math.min(lim, gx));
      const score = g.def.value / (1 + (fromZ - g.def.z) * 0.03);
      if (score > bestScore) {
        bestScore = score;
        best = { x: gx, z: g.def.z - 0.6 };
      }
    }
    return best;
  }

  private updateHelpers(dt: number) {
    for (let k = 0; k < this.helpers.length; k++) {
      const h = this.helpers[k];
      h.recoil = Math.max(0, h.recoil - dt * 3);
      h.flash = Math.max(0, h.flash - dt * 4);
      h.cooldown -= dt;
      if (h.kind === "mortier") {
        if (h.cooldown > 0) continue;
        const t = this.mortarTarget();
        if (!t) {
          h.cooldown = 0.4;
          continue;
        }
        h.cooldown = MORTAR_RELOAD;
        h.aimX = t.x;
        h.aimZ = t.z;
        h.recoil = 1;
        const dist = Math.hypot(t.x - h.x, t.z - h.z);
        this.shells.push({ x0: h.x, z0: h.z, x1: t.x, z1: t.z, t: 0, dur: 0.9 + dist * 0.025 });
        this.emit("mortarFire", h.x, h.z, 0, h.pad);
      } else {
        if (h.cooldown > 0) continue;
        h.cooldown += 1 / BALISTE_RATE;
        if (h.cooldown < 0) h.cooldown = 0;
        const lane = this.bestLane(h.z);
        const j = this.blue.add(
          h.x + (this.rng() * 2 - 1) * 0.15,
          h.z - 0.7,
          KIND_NORMAL,
          1,
          5.2 + this.rng() * 0.5,
          0,
          -1,
        );
        if (j < 0) continue;
        if (lane) {
          this.blue.tx[j] = lane.x;
          this.blue.tz[j] = lane.z;
          h.aimX = lane.x;
          h.aimZ = lane.z;
        }
        h.recoil = 1;
        this.emit("balisteFire", h.x, h.z, 0, h.pad);
      }
    }
  }

  private updateShells(dt: number) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.t += dt;
      if (s.t < s.dur) continue;
      this.shells.splice(i, 1);
      let killed = 0;
      const R2 = MORTAR_RADIUS * MORTAR_RADIUS;
      const r = this.red;
      for (let j = 0; j < r.n; j++) {
        if (!r.alive[j]) continue;
        const dx = r.x[j] - s.x1;
        const dz = r.z[j] - s.z1;
        if (dx * dx + dz * dz > R2) continue;
        if (r.kind[j]) {
          r.hp[j] -= 6;
          if (r.hp[j] <= 0) {
            this.kill(r, j, 1);
            killed++;
          }
        } else {
          this.kill(r, j, 1);
          killed++;
        }
      }
      this.emit("shellHit", s.x1, s.z1, killed);
    }
  }

  private updateBoulders(dt: number) {
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const bd = this.boulders[i];
      bd.t += dt;
      if (bd.t < bd.dur) continue;
      this.boulders.splice(i, 1);
      // Les soldats pris dessous sont écrasés.
      const b = this.blue;
      for (let j = 0; j < b.n; j++) {
        if (!b.alive[j] || b.kind[j]) continue;
        const dx = b.x[j] - bd.x1;
        const dz = b.z[j] - bd.z1;
        if (dx * dx + dz * dz < BOULDER_RADIUS * BOULDER_RADIUS) this.kill(b, j, 0);
      }
      // Le canon, s'il n'a pas bougé, est sonné et le rempart encaisse.
      const hit = Math.abs(this.cannonX - bd.x1) < BOULDER_RADIUS && this.state === "playing";
      if (hit) {
        this.playerHp -= 3;
        this.playerFlash = 1;
        this.stun = 1.4;
      }
      this.emit("boulderHit", bd.x1, bd.z1, hit ? 1 : 0);
    }
  }

  fireChampion(): boolean {
    if (this.state !== "playing" || !this.championReady) return false;
    this.charge = 0;
    const i = this.blue.add(this.cannonX, this.cannonZ - 2.4, KIND_GIANT, 40, 3.2, 0xffffffff, -1);
    if (i >= 0) {
      this.recoil = 1;
      this.emit("champion", this.cannonX, this.cannonZ);
    }
    return i >= 0;
  }

  /** Avance la simulation d'un pas fixe. Le tampon d'événements est vidé par le rendu. */
  step(dt: number, input: SimInput) {
    this.time += dt;
    const lvl = this.level;
    const rng = this.rng;

    // --- Canon : il suit le doigt avec un peu d'inertie.
    const limit = this.halfW - 0.9;
    const target = Math.max(-limit, Math.min(limit, input.targetX));
    const prev = this.cannonX;
    this.cannonX += (target - this.cannonX) * Math.min(1, dt * 14);
    this.cannonVel = (this.cannonX - prev) / dt;
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.baseFlash = Math.max(0, this.baseFlash - dt * 4);
    this.playerFlash = Math.max(0, this.playerFlash - dt * 3);

    this.stun = Math.max(0, this.stun - dt);
    if (this.state === "playing") {
      if (input.firing && this.stun <= 0) {
        this.fireAcc += dt * lvl.fireRate;
        while (this.fireAcc >= 1) {
          this.fireAcc -= 1;
          const jitter = (rng() * 2 - 1) * 0.28;
          if (
            this.blue.add(
              this.cannonX + jitter,
              this.cannonZ - 2.1,
              KIND_NORMAL,
              1,
              5.4 + rng() * 0.6,
              0,
              -1,
            ) >= 0
          ) {
            this.shots++;
            this.charge = Math.min(lvl.chargeShots, this.charge + 1);
            this.recoil = 1;
            this.emit("fire", this.cannonX, this.cannonZ);
          }
        }
      } else {
        this.fireAcc = Math.min(this.fireAcc, 0.999);
      }

      if (this.survival) {
        this.refillHorde();
        const sv = this.survival;
        this.surge = Math.max(0, this.surge - dt);
        this.surgeTimer += dt;
        if (this.surgeTimer >= sv.surgeEvery) {
          this.surgeTimer = 0;
          this.surge = 5;
          this.wave++;
          this.emit("surge", 0, this.throatZ, this.wave);
        }
        // Le goulot ne laisse passer qu'un débit donné : la pression monte avec le temps.
        // Trois secondes de répit au départ, le temps de prendre le canon en main.
        const flow = this.time < 3 ? 0 : this.hordeFlow;
        this.tokens = Math.min(Math.max(4, flow * 0.5), this.tokens + flow * dt);
      }

      // --- Renforts rouges.
      const boost = 1 + RIPOSTE_PER_HELPER * this.helpers.length;
      const rate = Math.min(lvl.enemy.maxRate, lvl.enemy.rate + lvl.enemy.ramp * this.time) * boost;
      this.spawnAcc += dt * rate;
      const doors = lvl.enemy.doors;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        const door = doors[this.doorCursor++ % doors.length];
        this.addRaider(
          door + (rng() * 2 - 1) * 0.9,
          this.baseZ + 0.6 + rng() * 0.6,
          1.75 + rng() * 0.4,
        );
      }
      // --- Catapulte ennemie : elle vise le canon là où il se trouve au départ du tir.
      const every = lvl.enemy.boulderEvery ?? 0;
      if (every > 0 && this.time > 6) {
        this.boulderTimer -= dt;
        if (this.boulderTimer <= 0) {
          this.boulderTimer = every * (0.85 + rng() * 0.3);
          const z0 = this.survival ? this.throatZ - 2 : this.baseZ - 1;
          const bd: Boulder = {
            x0: (rng() * 2 - 1) * 2,
            z0,
            x1: this.cannonX,
            z1: this.cannonZ - 0.2,
            t: 0,
            dur: 2.3,
          };
          this.boulders.push(bd);
          this.emit("boulderLaunch", bd.x1, bd.z1, bd.dur, this.boulders.length - 1);
        }
      }
      if (lvl.enemy.bruteEvery > 0) {
        this.bruteTimer -= dt;
        if (this.bruteTimer <= 0) {
          this.bruteTimer = lvl.enemy.bruteEvery;
          if (this.survival) {
            // Les colosses sortent du rang, juste derrière le goulot.
            if (this.hordeLeft > 0) {
              const bz = this.throatZ - 2 - rng() * 3;
              const bx = (rng() * 2 - 1) * (this.halfWAt(bz) - 0.8);
              if (this.red.add(bx, bz, KIND_GIANT, 14, 0.8, 0, 1) >= 0) {
                this.hordeTotal++;
                this.emit("brute", bx, bz);
              }
            }
          } else {
            const door = doors[this.doorCursor++ % doors.length];
            if (this.red.add(door, this.baseZ + 1, KIND_GIANT, 14, 1.35, 0, 1) >= 0)
              this.emit("brute", door, this.baseZ + 1);
          }
        }
      }
    }

    // --- Portes et pièges.
    for (const g of this.gates) {
      const m = g.def.move;
      g.x = m ? g.def.x + Math.sin(this.time * m.speed + (m.phase ?? 0)) * m.amp : g.def.x;
      const lim = this.halfW - g.def.w / 2;
      g.x = Math.max(-lim, Math.min(lim, g.x));
      g.pulse = Math.max(0, g.pulse - dt * 3);
    }
    for (const h of this.hazards) {
      if (h.def.kind === "spinner") {
        h.angle += h.def.speed * dt;
      } else {
        const period = h.def.period;
        const t = (this.time + (h.def.phase ?? 0)) % period;
        const phase = t < period - 1.8 ? 0 : t < period - 0.7 ? 1 : 2;
        if (phase === 2 && h.phase !== 2) {
          h.hitGiants = false;
          this.emit("eruption", h.def.x, h.def.z, h.def.r, this.hazards.indexOf(h));
        }
        h.phase = phase;
        h.timer = t;
      }
    }

    this.gridBlue.build(this.blue);
    this.gridRed.build(this.red);
    this.buildDensity(this.blue, this.densBlue, this.sumXBlue);
    this.buildDensity(this.red, this.densRed, this.sumXRed);
    if (this.navTick++ % 3 === 0) this.updateHunt();
    this.updateBoulders(dt);
    if (this.state === "playing") this.updateHelpers(dt);
    this.updateShells(dt);
    this.separate(this.blue, this.gridBlue);
    this.separate(this.red, this.gridRed);
    this.combat();
    this.moveBlue(dt);
    this.moveRed(dt);
    this.applyHazards();
    this.blue.compact();
    this.red.compact();

    if (this.state === "playing") {
      const won = this.survival ? this.hordeLeft === 0 && this.red.n === 0 : this.baseHp <= 0;
      if (won) {
        this.baseHp = 0;
        this.state = "won";
        this.endTime = this.time;
        this.emit("won", 0, this.survival ? this.throatZ : this.baseZ);
      } else if (this.playerHp <= 0) {
        this.playerHp = 0;
        this.state = "lost";
        this.endTime = this.time;
        this.emit("lost", this.cannonX, this.cannonZ);
      }
    } else if (this.state === "won") {
      // La horde se disperse en fumée après la victoire.
      const n = Math.min(this.red.n, 40);
      for (let i = 0; i < n; i++) this.kill(this.red, i, 1, false);
      this.red.compact();
    }
  }

  private buildDensity(p: Pool, dens: Float32Array, sumX: Float32Array) {
    dens.fill(0);
    sumX.fill(0);
    for (let i = 0; i < p.n; i++) {
      const c = this.coarseCell(p.x[i], p.z[i]);
      const w = p.kind[i] ? 6 : 1;
      dens[c] += w;
      sumX[c] += p.x[i] * w;
    }
  }

  private coarseCell(x: number, z: number) {
    let c = Math.floor((x - this.coarseMinX) / COARSE);
    let r = Math.floor((z - this.coarseMinZ) / COARSE);
    if (c < 0) c = 0;
    else if (c >= this.coarseCols) c = this.coarseCols - 1;
    if (r < 0) r = 0;
    else if (r >= this.coarseRows) r = this.coarseRows - 1;
    return c + r * this.coarseCols;
  }

  private separate(p: Pool, g: Grid) {
    const { x, z, sx, sz, kind } = p;
    const { start, items, cols, rows } = g;
    for (let i = 0; i < p.n; i++) {
      sx[i] = 0;
      sz[i] = 0;
    }
    for (let i = 0; i < p.n; i++) {
      const xi = x[i];
      const zi = z[i];
      const ri = kind[i] ? R_GIANT : R_NORMAL;
      const mi = kind[i] ? 8 : 1;
      const c0 = g.col(xi);
      const r0 = g.row(zi);
      const reach = kind[i] ? 2 : 1;
      for (let rr = r0 - reach; rr <= r0 + reach; rr++) {
        if (rr < 0 || rr >= rows) continue;
        for (let cc = c0 - reach; cc <= c0 + reach; cc++) {
          if (cc < 0 || cc >= cols) continue;
          const cell = cc + rr * cols;
          for (let k = start[cell]; k < start[cell + 1]; k++) {
            const j = items[k];
            if (j === i) continue;
            // Les paires de même gabarit sont traitées une fois (j > i),
            // les paires géant/normal depuis le géant uniquement.
            if (kind[i] === kind[j]) {
              if (j < i) continue;
            } else if (!kind[i]) continue;
            const dx = xi - x[j];
            const dz = zi - z[j];
            const rj = kind[j] ? R_GIANT : R_NORMAL;
            const min = ri + rj;
            const d2 = dx * dx + dz * dz;
            if (d2 >= min * min || d2 < 1e-8) continue;
            const d = Math.sqrt(d2);
            const overlap = (min - d) / d;
            const mj = kind[j] ? 8 : 1;
            const wi = mj / (mi + mj);
            const wj = mi / (mi + mj);
            sx[i] += dx * overlap * wi * 0.5;
            sz[i] += dz * overlap * wi * 0.5;
            sx[j] -= dx * overlap * wj * 0.5;
            sz[j] -= dz * overlap * wj * 0.5;
          }
        }
      }
    }
  }

  private combat() {
    const b = this.blue;
    const r = this.red;
    const g = this.gridRed;
    const { start, items, cols, rows } = g;
    for (let i = 0; i < b.n; i++) {
      if (!b.alive[i]) continue;
      const xi = b.x[i];
      const zi = b.z[i];
      const ri = b.kind[i] ? R_GIANT : R_NORMAL;
      const c0 = g.col(xi);
      const r0 = g.row(zi);
      const reach = b.kind[i] ? 2 : 1;
      outer: for (let rr = r0 - reach; rr <= r0 + reach; rr++) {
        if (rr < 0 || rr >= rows) continue;
        for (let cc = c0 - reach; cc <= c0 + reach; cc++) {
          if (cc < 0 || cc >= cols) continue;
          const cell = cc + rr * cols;
          for (let k = start[cell]; k < start[cell + 1]; k++) {
            const j = items[k];
            if (!r.alive[j]) continue;
            const dx = xi - r.x[j];
            const dz = zi - r.z[j];
            const min = ri + (r.kind[j] ? R_GIANT : R_NORMAL) + 0.06;
            if (dx * dx + dz * dz > min * min) continue;
            if (r.role[j] === ROLE_BOMBER) {
              // L'artificier saute au premier contact.
              this.kill(r, j, 1);
              this.detonate(r.x[j], r.z[j]);
              if (!b.alive[i]) break outer;
              continue;
            }
            const dmg = Math.min(b.hp[i], r.hp[j]);
            b.hp[i] -= dmg;
            r.hp[j] -= dmg;
            if (r.hp[j] <= 0) this.kill(r, j, 1);
            if (b.hp[i] <= 0) {
              this.kill(b, i, 0);
              break outer;
            }
          }
        }
      }
    }
  }

  private collide(p: Pool, i: number, team: number) {
    const r = p.kind[i] ? R_GIANT : R_NORMAL;
    let x = p.x[i];
    let z = p.z[i];
    for (const o of this.obstacles) {
      if (o.kind === "box") {
        if (x < o.minX - r || x > o.maxX + r || z < o.minZ - r || z > o.maxZ + r) continue;
        const pl = x - (o.minX - r);
        const pr = o.maxX + r - x;
        const pn = z - (o.minZ - r);
        const pf = o.maxZ + r - z;
        const px = Math.min(pl, pr);
        const pzz = Math.min(pn, pf);
        if (px < pzz) {
          x = pl < pr ? o.minX - r : o.maxX + r;
        } else {
          z = pn < pf ? o.minZ - r : o.maxZ + r;
          // Bloqué de face : on glisse vers le bord le plus proche.
          const cx = (o.minX + o.maxX) / 2;
          x += (x < cx ? -1 : 1) * 0.06;
        }
      } else {
        this.pushCircle(p, i, o.x, o.z, o.r + r);
        x = p.x[i];
        z = p.z[i];
      }
    }
    // Poteaux des portes.
    for (const g of this.gates) {
      const hw = g.def.w / 2;
      if (Math.abs(z - g.def.z) > 0.6) continue;
      for (const side of [-1, 1]) {
        const px = g.x + side * hw;
        const dx = x - px;
        const dz = z - g.def.z;
        const min = 0.17 + r;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-8) {
          const d = Math.sqrt(d2);
          x = px + (dx / d) * min;
          z = g.def.z + (dz / d) * min;
        }
      }
    }
    for (const h of this.helpers) {
      const dx = x - h.x;
      const dz = z - h.z;
      const min = 0.55 + r;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        x = h.x + (dx / d) * min;
        z = h.z + (dz / d) * min;
      }
    }
    for (const h of this.hazards) {
      if (h.def.kind !== "spinner") continue;
      const dx = x - h.def.x;
      const dz = z - h.def.z;
      const min = 0.42 + r;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        x = h.def.x + (dx / d) * min + (team === 0 ? 0.02 : -0.02) * Math.sign(dx || 1);
        z = h.def.z + (dz / d) * min;
      }
    }
    const lim = this.halfWAt(z) - r;
    if (x < -lim) x = -lim;
    if (x > lim) x = lim;
    p.x[i] = x;
    p.z[i] = z;
  }

  private pushCircle(p: Pool, i: number, cx: number, cz: number, min: number) {
    const dx = p.x[i] - cx;
    const dz = p.z[i] - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) return;
    const d = Math.sqrt(d2) || 1e-4;
    p.x[i] = cx + (dx / d) * min;
    p.z[i] = cz + (dz / d) * min;
    if (Math.abs(dx) < 0.25) p.x[i] += (dx >= 0 ? 1 : -1) * 0.05;
  }

  private moveBlue(dt: number) {
    const b = this.blue;
    const r = this.red;
    const nav = this.nav;
    const goal = this.goalBlue;
    const hunt = this.huntBlue;
    // À l'approche de la forteresse, la foule converge vers sa façade.
    const nearGoal = this.survival ? -1e9 : this.baseZ + 8;
    for (let i = 0; i < b.n; i++) {
      if (!b.alive[i]) continue;
      b.age[i] += dt;
      const x0 = b.x[i];
      const z0 = b.z[i];

      // 1. La route : tout droit dans le couloir visé par le joueur. La carte ne sert
      //    que si un obstacle barre le passage, ou à l'approche de la forteresse.
      let dx = 0;
      let dz = -1;
      let len = 1;
      if (nav.isBlocked(x0, z0 - 1.6) || nav.isBlocked(x0, z0 - 3.4) || z0 < nearGoal) {
        dx = nav.sample(goal, x0 - 0.5, z0) - nav.sample(goal, x0 + 0.5, z0);
        dz = nav.sample(goal, x0, z0 - 0.5) - nav.sample(goal, x0, z0 + 0.5);
        len = Math.hypot(dx, dz);
        if (len < 1e-4 || len > 50) {
          dx = 0;
          dz = -1;
        } else {
          dx /= len;
          dz /= len;
        }
      }
      // Soldats du canon allié : ils gardent le couloir qu'on leur a donné.
      if (!Number.isNaN(b.tx[i])) {
        if (z0 < b.tz[i]) b.tx[i] = NaN;
        else {
          dx = Math.max(-0.55, Math.min(0.55, (b.tx[i] - x0) * 0.45));
          dz = -Math.sqrt(1 - dx * dx);
        }
      }

      // 2. La chasse : dès qu'un pillard est repéré, on dévie pour aller le chercher ;
      //    de près, on court droit sur lui.
      const d = nav.sample(hunt, x0, z0);
      if (d < HUNT_BLUE - 0.15) {
        let hx: number;
        let hz: number;
        let w: number;
        const j = d < CHARGE ? this.nearest(this.gridRed, r, x0, z0) : -1;
        if (j >= 0) {
          hx = r.x[j] - x0;
          hz = r.z[j] - z0;
          w = 1;
        } else {
          hx = nav.sample(hunt, x0 - 0.5, z0) - nav.sample(hunt, x0 + 0.5, z0);
          hz = nav.sample(hunt, x0, z0 - 0.5) - nav.sample(hunt, x0, z0 + 0.5);
          w = Math.min(1, (HUNT_BLUE - d) / (HUNT_BLUE * 0.6));
          if (hz > 0) {
            // Un ennemi passé derrière ne fait faire demi-tour que s'il est tout proche ;
            // sinon on se décale vers lui sans cesser d'avancer vers les portes.
            if (d > 3.2) hz = 0;
          }
          if (d > 3.2) w *= 0.75;
        }
        const hl = Math.hypot(hx, hz);
        if (w > 0 && hl > 1e-4) {
          dx = dx * (1 - w) + (hx / hl) * w;
          dz = dz * (1 - w) + (hz / hl) * w;
          len = Math.hypot(dx, dz);
          if (len < 0.05) {
            dx = hx / hl;
            dz = hz / hl;
          } else {
            dx /= len;
            dz /= len;
          }
        }
      }

      const sp = b.speed[i];
      const sx = b.sx[i] > 0.09 ? 0.09 : b.sx[i] < -0.09 ? -0.09 : b.sx[i];
      const sz = b.sz[i] > 0.09 ? 0.09 : b.sz[i] < -0.09 ? -0.09 : b.sz[i];
      b.pz[i] = z0;
      b.x[i] = x0 + dx * sp * dt + sx;
      b.z[i] = z0 + dz * sp * dt + sz;
      this.collide(b, i, 0);
      b.fx[i] += (dx - b.fx[i]) * Math.min(1, dt * 8);
      b.fz[i] += (dz - b.fz[i]) * Math.min(1, dt * 8);

      if (b.kind[i] === KIND_NORMAL) this.crossGates(i, z0);
      if (!b.alive[i]) continue;

      if (b.z[i] <= this.baseZ + (b.kind[i] ? R_GIANT : R_NORMAL)) {
        if (this.survival) {
          // Au fond de l'entonnoir il n'y a rien à prendre : le soldat quitte le terrain.
          b.alive[i] = 0;
          continue;
        }
        if (Math.abs(b.x[i]) <= this.baseHalfW && this.state === "playing") {
          const dmg = b.kind[i] ? 30 : 1;
          this.baseHp -= dmg;
          this.baseFlash = 1;
          this.emit("baseHit", b.x[i], this.baseZ, dmg);
        }
        this.kill(b, i, 0);
      }
    }
  }

  private crossGates(i: number, prevZ: number) {
    const b = this.blue;
    const z = b.z[i];
    for (let k = 0; k < this.gates.length; k++) {
      const g = this.gates[k];
      const gz = g.def.z;
      if (!(prevZ > gz && z <= gz)) continue;
      const bit = 1 << k;
      if (b.mask[i] & bit) continue;
      if (Math.abs(b.x[i] - g.x) > g.def.w / 2) continue;
      b.mask[i] |= bit;
      g.pulse = 1;
      g.passed++;
      if (g.def.op === "mul") {
        const extra = g.def.value - 1;
        let made = 0;
        for (let c = 0; c < extra; c++) {
          const nx = g.x + (this.rng() * 2 - 1) * (g.def.w / 2 - 0.25);
          const nz = gz - 0.15 - this.rng() * 0.9;
          const j = b.add(nx, nz, KIND_NORMAL, 1, b.speed[i], b.mask[i], -1);
          if (j < 0) break;
          b.age[j] = 0;
          made++;
          if (this.birthCount < 2048) {
            this.births[this.birthCount * 2] = nx;
            this.births[this.birthCount * 2 + 1] = nz;
            this.birthCount++;
          }
        }
        this.emit("gate", g.x, gz, made, k);
      } else {
        g.counter++;
        if (g.counter % g.def.value !== 0) {
          this.kill(b, i, 0);
          this.emit("gate", g.x, gz, -1, k);
          return;
        }
        this.emit("gate", g.x, gz, 0, k);
      }
    }
  }

  private moveRed(dt: number) {
    const r = this.red;
    const b = this.blue;
    const nav = this.nav;
    const goal = this.goalRed;
    const hunt = this.huntRed;
    const sv = this.survival;
    for (let i = 0; i < r.n; i++) {
      if (!r.alive[i]) continue;
      r.age[i] += dt;
      const x0 = r.x[i];
      const z0 = r.z[i];
      const inFunnel = sv !== null && z0 < this.throatZ;
      let pace = r.speed[i];
      if (sv) {
        if (inFunnel) {
          // Dans l'entonnoir, la horde piétine — et ralentit encore là où elle est trop serrée.
          const dens = this.densRed[this.coarseCell(x0, z0 + COARSE)];
          pace *= sv.speed[0] * (dens > 26 ? 0.25 : dens > 20 ? 0.6 : 1);
        } else pace *= sv.speed[1];
      }
      const speed = this.state === "lost" ? pace * 0.3 : pace;

      // 1. La route : droit vers le rempart ; la carte sert à contourner les obstacles
      //    et à trouver le goulot quand on est dans l'entonnoir.
      let dx = 0;
      let dz = 1;
      let len = 1;
      if (inFunnel || nav.isBlocked(x0, z0 + 1.6) || nav.isBlocked(x0, z0 + 3.4)) {
        dx = nav.sample(goal, x0 - 0.5, z0) - nav.sample(goal, x0 + 0.5, z0);
        dz = nav.sample(goal, x0, z0 - 0.5) - nav.sample(goal, x0, z0 + 0.5);
        len = Math.hypot(dx, dz);
        if (len < 1e-4 || len > 50) {
          dx = 0;
          dz = 1;
        } else {
          dx /= len;
          dz /= len;
        }
      }

      // 2. La chasse : soldats bleus, défenses et canon à portée.
      const d = inFunnel ? HUNT_RED : nav.sample(hunt, x0, z0);
      if (d < HUNT_RED - 0.15) {
        let hx: number;
        let hz: number;
        let w: number;
        const j = d < CHARGE ? this.nearest(this.gridBlue, b, x0, z0) : -1;
        if (j >= 0) {
          hx = b.x[j] - x0;
          hz = b.z[j] - z0;
          w = 1;
        } else {
          hx = nav.sample(hunt, x0 - 0.5, z0) - nav.sample(hunt, x0 + 0.5, z0);
          hz = nav.sample(hunt, x0, z0 - 0.5) - nav.sample(hunt, x0, z0 + 0.5);
          w = Math.min(1, (HUNT_RED - d) / (HUNT_RED * 0.6));
          if (hz < 0 && d > 2.2) hz = 0;
        }
        const hl = Math.hypot(hx, hz);
        if (w > 0 && hl > 1e-4) {
          dx = dx * (1 - w) + (hx / hl) * w;
          dz = dz * (1 - w) + (hz / hl) * w;
          len = Math.hypot(dx, dz);
          if (len < 0.05) {
            dx = hx / hl;
            dz = hz / hl;
          } else {
            dx /= len;
            dz /= len;
          }
        }
      }

      const sx = r.sx[i] > 0.09 ? 0.09 : r.sx[i] < -0.09 ? -0.09 : r.sx[i];
      const sz = r.sz[i] > 0.09 ? 0.09 : r.sz[i] < -0.09 ? -0.09 : r.sz[i];
      r.pz[i] = z0;
      r.x[i] = x0 + dx * speed * dt + sx;
      r.z[i] = z0 + dz * speed * dt + sz;
      if (r.z[i] < this.baseZ + 0.4) r.z[i] = this.baseZ + 0.4;
      if (sv && z0 < this.throatZ && r.z[i] >= this.throatZ) {
        // Passage du goulot : un jeton par pillard, sinon il attend son tour.
        if (this.tokens >= 1) this.tokens -= 1;
        else r.z[i] = this.throatZ - 0.01;
      }
      this.collide(r, i, 1);
      r.fx[i] += (dx - r.fx[i]) * Math.min(1, dt * 8);
      r.fz[i] += (dz - r.fz[i]) * Math.min(1, dt * 8);
      if (this.state !== "playing") continue;

      // 3. Les défenses à portée de coup : le pillard s'y jette.
      const giant = r.kind[i] === KIND_GIANT;
      const bomber = r.role[i] === ROLE_BOMBER;
      const reach = 0.64 + (giant ? R_GIANT : R_NORMAL);
      let struck = false;
      for (const h of this.helpers) {
        const hx = r.x[i] - h.x;
        const hz = r.z[i] - h.z;
        if (hx * hx + hz * hz > reach * reach) continue;
        this.hitHelper(h, giant ? 4 : bomber ? 6 : 1);
        if (bomber) this.detonate(r.x[i], r.z[i]);
        this.kill(r, i, 1, false);
        struck = true;
        break;
      }
      if (struck) continue;

      if (r.z[i] >= this.playerLineZ) {
        const dmg = giant || bomber ? 3 : 1;
        this.playerHp -= dmg;
        this.playerFlash = 1;
        this.emit("playerHit", r.x[i], r.z[i], dmg);
        if (bomber) this.detonate(r.x[i], r.z[i]);
        this.kill(r, i, 1, false);
      }
    }
  }

  private applyHazards() {
    for (let hi = 0; hi < this.hazards.length; hi++) {
      const h = this.hazards[hi];
      if (h.def.kind === "spinner") {
        const ca = Math.cos(h.angle);
        const sa = Math.sin(h.angle);
        const R = h.def.r;
        const cx = h.def.x;
        const cz = h.def.z;
        const sweep = (p: Pool, team: number) => {
          for (let i = 0; i < p.n; i++) {
            if (!p.alive[i] || p.kind[i]) continue;
            const dx = p.x[i] - cx;
            const dz = p.z[i] - cz;
            if (dx * dx + dz * dz > (R + 0.4) * (R + 0.4)) continue;
            // Distance au segment [-R, R] porté par (ca, sa).
            const along = dx * ca + dz * sa;
            const perp = Math.abs(-dx * sa + dz * ca);
            if (Math.abs(along) <= R + 0.15 && perp < 0.3) {
              this.kill(p, i, team);
              this.emit("spinnerHit", p.x[i], p.z[i], team, hi);
            }
          }
        };
        sweep(this.blue, 0);
        sweep(this.red, 1);
      } else if (h.phase === 2) {
        const R2 = h.def.r * h.def.r;
        const burn = (p: Pool, team: number) => {
          for (let i = 0; i < p.n; i++) {
            if (!p.alive[i]) continue;
            const dx = p.x[i] - h.def.x;
            const dz = p.z[i] - h.def.z;
            if (dx * dx + dz * dz > R2) continue;
            if (p.kind[i]) {
              if (!h.hitGiants) {
                p.hp[i] -= 8;
                if (p.hp[i] <= 0) this.kill(p, i, team);
              }
              continue;
            }
            this.kill(p, i, team);
          }
        };
        burn(this.blue, 0);
        burn(this.red, 1);
        h.hitGiants = true;
      }
    }
  }

  /** À appeler par le rendu après lecture des morts et naissances. */
  drain() {
    this.deathCount = 0;
    this.birthCount = 0;
    this.events.length = 0;
  }
}
