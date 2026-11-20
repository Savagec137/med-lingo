/**
 * Houle partagée entre le shader de l'océan et le CPU : les navires tanguent
 * exactement sur les vagues affichées.
 */

export interface Wave {
  dirX: number;
  dirZ: number;
  k: number;
  amp: number;
  omega: number;
  steep: number;
}

function wave(angleDeg: number, wavelength: number, amp: number, steep: number): Wave {
  const a = (angleDeg * Math.PI) / 180;
  const k = (Math.PI * 2) / wavelength;
  return { dirX: Math.cos(a), dirZ: Math.sin(a), k, amp, omega: Math.sqrt(9.8 * k) * 0.85, steep };
}

export const WAVES: readonly Wave[] = [
  wave(20, 62, 0.62, 0.55),
  wave(105, 35, 0.36, 0.6),
  wave(-40, 19, 0.17, 0.65),
  wave(200, 11, 0.08, 0.6),
];

/** Hauteur de l'eau au point (x, z) à l'instant t. */
export function waveHeight(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of WAVES) h += w.amp * Math.sin(w.k * (w.dirX * x + w.dirZ * z) - w.omega * t);
  return h;
}

/** Déclaration GLSL des vagues (mêmes valeurs que le CPU). */
export function wavesGlsl(): string {
  const f = (n: number) => n.toFixed(6);
  const dirs = WAVES.map((w) => `vec4(${f(w.dirX)}, ${f(w.dirZ)}, ${f(w.k)}, ${f(w.amp)})`).join(
    ", ",
  );
  const params = WAVES.map((w) => `vec2(${f(w.omega)}, ${f(w.steep)})`).join(", ");
  return `
const int WAVE_COUNT = ${WAVES.length};
const vec4 WAVE_A[${WAVES.length}] = vec4[](${dirs});
const vec2 WAVE_B[${WAVES.length}] = vec2[](${params});
`;
}
