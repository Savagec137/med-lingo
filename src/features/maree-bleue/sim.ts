/**
 * Marée Bleue — la simulation.
 *
 * Aucune dépendance au rendu : ce module tourne aussi bien dans le navigateur
 * que dans un test Node. Les foules sont stockées « en colonnes » (typed arrays)
 * pour supporter des milliers de soldats à 60 images par seconde.
 */

import type { GateDef, HazardDef, LevelDef, ObstacleDef } from "./levels";

export const KIND_NORMAL = 0;
export const KIND_GIANT = 1;

export const R_NORMAL = 0.2;
export const R_GIANT = 0.5;
export const GIANT_SCALE = 2.4;

const BLUE_CAP = 2200;
const RED_CAP = 1800;
const CELL = 0.7;
/** Maille grossière pour l'attraction entre foules. */
const COARSE = 2;

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
    | "spinnerHit";
  x: number;
  z: number;
  value: number;
  index: number;
}

export interface SimInput {
  /** Abscisse visée par le joueur. */
  targetX: number;
  firing: boolean;
}

export class Sim {
  readonly level: LevelDef;
  readonly blue = new Pool(BLUE_CAP);
  readonly red = new Pool(RED_CAP);
  readonly gates: GateRuntime[];
  readonly hazards: HazardRuntime[];
  readonly obstacles: ObstacleDef[];
  readonly halfW: number;
  readonly baseZ: number;
  readonly baseHalfW: number;
  readonly cannonZ = 1.3;
  readonly playerLineZ = 0.2;

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

  constructor(level: LevelDef, seed = 1234) {
    this.level = level;
    this.rng = makeRng(seed);
    this.halfW = level.width / 2;
    this.baseZ = -level.length + 1.2;
    this.baseHalfW = Math.min(4.2, level.width / 2 - 1);
    this.baseHp = level.baseHp;
    this.playerHp = level.playerHp;
    this.obstacles = level.obstacles;
    this.gates = level.gates.map((def) => ({ def, x: def.x, counter: 0, pulse: 0, passed: 0 }));
    this.hazards = level.hazards.map((def) => ({
      def,
      angle: 0,
      phase: 0,
      timer: 0,
      hitGiants: false,
    }));
    const minX = -this.halfW - 1;
    const maxX = this.halfW + 1;
    const minZ = -level.length - 2;
    const maxZ = 4;
    this.gridBlue = new Grid(minX, maxX, minZ, maxZ, BLUE_CAP);
    this.gridRed = new Grid(minX, maxX, minZ, maxZ, RED_CAP);
    this.coarseMinX = minX;
    this.coarseMinZ = minZ;
    this.coarseCols = Math.ceil((maxX - minX) / COARSE) + 1;
    this.coarseRows = Math.ceil((maxZ - minZ) / COARSE) + 1;
    const cells = this.coarseCols * this.coarseRows;
    this.densBlue = new Float32Array(cells);
    this.sumXBlue = new Float32Array(cells);
    this.densRed = new Float32Array(cells);
    this.sumXRed = new Float32Array(cells);
    this.placeHorde(level.enemy.horde);
    this.bruteTimer = level.enemy.bruteEvery > 0 ? level.enemy.bruteEvery * 0.6 : 0;
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
      this.red.add(x, z, KIND_NORMAL, 1, 0.55 + this.rng() * 0.35, 0, 1);
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

  private kill(p: Pool, i: number, team: number) {
    if (!p.alive[i]) return;
    p.alive[i] = 0;
    this.pushDeath(p.x[i], p.z[i], team, p.kind[i]);
    if (team === 1) this.kills++;
  }

  fireChampion(): boolean {
    if (this.state !== "playing" || !this.championReady) return false;
    this.charge = 0;
    const i = this.blue.add(this.cannonX, this.cannonZ - 1.2, KIND_GIANT, 40, 3.2, 0xffffffff, -1);
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

    if (this.state === "playing") {
      if (input.firing) {
        this.fireAcc += dt * lvl.fireRate;
        while (this.fireAcc >= 1) {
          this.fireAcc -= 1;
          const jitter = (rng() * 2 - 1) * 0.28;
          if (
            this.blue.add(
              this.cannonX + jitter,
              this.cannonZ - 1.0,
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

      // --- Renforts rouges.
      const rate = Math.min(lvl.enemy.maxRate, lvl.enemy.rate + lvl.enemy.ramp * this.time);
      this.spawnAcc += dt * rate;
      const doors = lvl.enemy.doors;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        const door = doors[this.doorCursor++ % doors.length];
        this.red.add(
          door + (rng() * 2 - 1) * 0.9,
          this.baseZ + 0.6 + rng() * 0.6,
          KIND_NORMAL,
          1,
          1.75 + rng() * 0.4,
          0,
          1,
        );
      }
      if (lvl.enemy.bruteEvery > 0) {
        this.bruteTimer -= dt;
        if (this.bruteTimer <= 0) {
          this.bruteTimer = lvl.enemy.bruteEvery;
          const door = doors[this.doorCursor++ % doors.length];
          if (this.red.add(door, this.baseZ + 1, KIND_GIANT, 14, 1.35, 0, 1) >= 0)
            this.emit("brute", door, this.baseZ + 1);
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
    this.separate(this.blue, this.gridBlue);
    this.separate(this.red, this.gridRed);
    this.combat();
    this.moveBlue(dt);
    this.moveRed(dt);
    this.applyHazards();
    this.blue.compact();
    this.red.compact();

    if (this.state === "playing") {
      if (this.baseHp <= 0) {
        this.baseHp = 0;
        this.state = "won";
        this.endTime = this.time;
        this.emit("won", 0, this.baseZ);
      } else if (this.playerHp <= 0) {
        this.playerHp = 0;
        this.state = "lost";
        this.endTime = this.time;
        this.emit("lost", this.cannonX, this.cannonZ);
      }
    } else if (this.state === "won") {
      // La horde se disperse en fumée après la victoire.
      const n = Math.min(this.red.n, 40);
      for (let i = 0; i < n; i++) this.kill(this.red, i, 1);
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

  /**
   * Attraction latérale vers la foule adverse, juste devant soi.
   * Renvoie la vitesse latérale souhaitée (0 si personne en vue).
   */
  private seek(
    x: number,
    z: number,
    ahead: number,
    dens: Float32Array,
    sumX: Float32Array,
    gain: number,
    max: number,
  ) {
    const cell = this.coarseCell(x, z);
    const c0 = cell % this.coarseCols;
    const r0 = (cell - c0) / this.coarseCols;
    let n = 0;
    let sx = 0;
    for (let k = 0; k <= 1; k++) {
      const r = r0 + ahead * k;
      if (r < 0 || r >= this.coarseRows) continue;
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        if (c < 0 || c >= this.coarseCols) continue;
        const idx = c + r * this.coarseCols;
        n += dens[idx];
        sx += sumX[idx];
      }
    }
    if (n < 1) return 0;
    const v = (sx / n - x) * gain;
    return v > max ? max : v < -max ? -max : v;
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
    const lim = this.halfW - r;
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
    const nearBase = this.baseZ + 9;
    for (let i = 0; i < b.n; i++) {
      if (!b.alive[i]) continue;
      b.age[i] += dt;
      const vz = -b.speed[i];
      const z0 = b.z[i];
      let vx = this.seek(b.x[i], z0, -1, this.densRed, this.sumXRed, 1.4, 2.6);
      if (z0 < nearBase && vx === 0) {
        const lim = this.baseHalfW - 0.6;
        const tx = Math.max(-lim, Math.min(lim, b.x[i]));
        vx = (tx - b.x[i]) * 1.6;
      }
      b.pz[i] = z0;
      b.x[i] += vx * dt + b.sx[i];
      b.z[i] += vz * dt + b.sz[i];
      // Ne jamais reculer à cause de la poussée : la foule avance.
      if (b.z[i] > z0 + 0.02) b.z[i] = z0 + 0.02;
      this.collide(b, i, 0);
      const len = Math.hypot(vx, vz) || 1;
      b.fx[i] += (vx / len - b.fx[i]) * Math.min(1, dt * 8);
      b.fz[i] += (vz / len - b.fz[i]) * Math.min(1, dt * 8);

      if (b.kind[i] === KIND_NORMAL) this.crossGates(i, z0);
      if (!b.alive[i]) continue;

      if (b.z[i] <= this.baseZ + (b.kind[i] ? R_GIANT : R_NORMAL)) {
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
    const nearPlayer = this.playerLineZ - 10;
    for (let i = 0; i < r.n; i++) {
      if (!r.alive[i]) continue;
      r.age[i] += dt;
      const speed = this.state === "lost" ? r.speed[i] * 0.3 : r.speed[i];
      const vz = speed;
      const z0 = r.z[i];
      let vx = this.seek(r.x[i], z0, 1, this.densBlue, this.sumXBlue, 1.0, 1.6);
      if (z0 > nearPlayer && vx === 0)
        vx = Math.max(-speed, Math.min(speed, (this.cannonX - r.x[i]) * 0.5));
      r.pz[i] = z0;
      r.x[i] += vx * dt + r.sx[i];
      r.z[i] += vz * dt + r.sz[i];
      if (r.z[i] < z0 - 0.02) r.z[i] = z0 - 0.02;
      if (r.z[i] < this.baseZ + 0.4) r.z[i] = this.baseZ + 0.4;
      this.collide(r, i, 1);
      const len = Math.hypot(vx, vz) || 1;
      r.fx[i] += (vx / len - r.fx[i]) * Math.min(1, dt * 8);
      r.fz[i] += (vz / len - r.fz[i]) * Math.min(1, dt * 8);
      if (r.z[i] >= this.playerLineZ && this.state === "playing") {
        const dmg = r.kind[i] ? 3 : 1;
        this.playerHp -= dmg;
        this.playerFlash = 1;
        this.emit("playerHit", r.x[i], r.z[i], dmg);
        this.kill(r, i, 1);
        this.kills--;
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
