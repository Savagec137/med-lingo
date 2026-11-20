/**
 * Outils mathématiques de la simulation navale.
 *
 * Repère : plan XZ, Y vers le haut. Un cap `h` (radians) oriente la proue
 * selon (sin h, cos h). Tribord (droite du navire) est donc (-cos h, sin h),
 * ce qui correspond au repère droitier de Three.js (avant × haut = droite).
 */

export const TAU = Math.PI * 2;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ramène un angle dans ]-π, π]. */
export function wrapAngle(a: number): number {
  let r = a % TAU;
  if (r <= -Math.PI) r += TAU;
  else if (r > Math.PI) r -= TAU;
  return r;
}

export interface Vec2 {
  x: number;
  z: number;
}

export function forwardOf(h: number): Vec2 {
  return { x: Math.sin(h), z: Math.cos(h) };
}

/** Direction de tribord (droite du navire). */
export function starboardOf(h: number): Vec2 {
  return { x: -Math.cos(h), z: Math.sin(h) };
}

/** Cap qui pointe de (fx, fz) vers (tx, tz). */
export function headingTo(fx: number, fz: number, tx: number, tz: number): number {
  return Math.atan2(tx - fx, tz - fz);
}

/**
 * Relèvement d'un point vu du navire : 0 = droit devant, positif = tribord,
 * négatif = bâbord, ±π = droit derrière.
 */
export function bearingTo(x: number, z: number, h: number, tx: number, tz: number): number {
  const dx = tx - x;
  const dz = tz - z;
  const f = forwardOf(h);
  const r = starboardOf(h);
  return Math.atan2(dx * r.x + dz * r.z, dx * f.x + dz * f.z);
}

/** Coordonnées locales (latérale vers tribord, longitudinale vers la proue). */
export function toLocal(
  x: number,
  z: number,
  h: number,
  px: number,
  pz: number,
): { side: number; along: number } {
  const dx = px - x;
  const dz = pz - z;
  const f = forwardOf(h);
  const r = starboardOf(h);
  return { side: dx * r.x + dz * r.z, along: dx * f.x + dz * f.z };
}

export function toWorld(x: number, z: number, h: number, side: number, along: number): Vec2 {
  const f = forwardOf(h);
  const r = starboardOf(h);
  return { x: x + r.x * side + f.x * along, z: z + r.z * side + f.z * along };
}

export function dist(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(bx - ax, bz - az);
}

export type Rng = () => number;

/** Générateur déterministe (mulberry32) : rejouer une graine rejoue la bataille. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Approximation gaussienne centrée réduite (somme de 4 uniformes). */
export function gaussian(rng: Rng): number {
  return (rng() + rng() + rng() + rng() - 2) * 1.732;
}

export function range(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}
