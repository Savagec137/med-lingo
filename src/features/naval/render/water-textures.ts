/**
 * Textures de mer générées au lancement (aucun fichier à télécharger) :
 *
 * - « détail » : un champ de vagues courtes et hachées (mer de vent), raccordable
 *   sans couture. R et G portent la pente (normale), B la hauteur — la hauteur
 *   sert à placer l'écume sur les crêtes ;
 * - « écume » : une dentelle cellulaire (réseau de Voronoï) pour les moutons et
 *   le sillage.
 *
 * Les données sont écrites directement dans des DataTexture (pas de canevas :
 * aucune prémultiplication alpha ne vient fausser les pentes).
 */

import * as THREE from "three";
import { createRng } from "../sim/math.ts";

const SIZE = 256;

let detail: THREE.DataTexture | null = null;
let foam: THREE.DataTexture | null = null;

function finish(data: Uint8Array<ArrayBuffer>): THREE.DataTexture {
  const t = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/**
 * Somme de vagues à crête aiguë (profil exp(k·(cos θ − 1))), à nombres d'onde
 * entiers pour que la texture se raccorde, avec un spectre en k^−2,1 : les vagues
 * dominent, les rides restent discrètes.
 */
export function oceanDetailTexture(): THREE.DataTexture {
  if (detail) return detail;
  const rng = createRng(20261120);
  const comps: {
    kx: number;
    ky: number;
    amp: number;
    sharp: number;
    cu: Float32Array;
    su: Float32Array;
    cv: Float32Array;
    sv: Float32Array;
  }[] = [];
  while (comps.length < 40) {
    const mag = 2 + Math.pow(rng(), 2.2) * 26;
    const ang = (rng() - 0.5) * 2.6;
    const kx = Math.round(mag * Math.cos(ang));
    const ky = Math.round(mag * Math.sin(ang));
    if (kx === 0 && ky === 0) continue;
    const k = Math.hypot(kx, ky);
    const phase = rng() * Math.PI * 2;
    const cu = new Float32Array(SIZE);
    const su = new Float32Array(SIZE);
    const cv = new Float32Array(SIZE);
    const sv = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
      const a = (2 * Math.PI * kx * i) / SIZE + phase;
      const b = (2 * Math.PI * ky * i) / SIZE;
      cu[i] = Math.cos(a);
      su[i] = Math.sin(a);
      cv[i] = Math.cos(b);
      sv[i] = Math.sin(b);
    }
    // Pente ∝ k·amplitude : en k^−2,1 ce sont les vagues, pas les rides, qui dessinent la mer.
    comps.push({ kx, ky, amp: Math.pow(k, -2.1), sharp: 1.2 + rng() * 2, cu, su, cv, sv });
  }
  const n = SIZE * SIZE;
  const height = new Float32Array(n);
  const gu = new Float32Array(n);
  const gv = new Float32Array(n);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let h = 0;
      let du = 0;
      let dv = 0;
      for (const c of comps) {
        // Addition d'angles : cos/sin de (kx·u + ky·v + φ) sans trigonométrie par pixel.
        const cos = c.cu[x] * c.cv[y] - c.su[x] * c.sv[y];
        const sin = c.su[x] * c.cv[y] + c.cu[x] * c.sv[y];
        const g = Math.exp(c.sharp * (cos - 1));
        h += c.amp * g;
        const dg = -c.sharp * sin * g * c.amp * 2 * Math.PI;
        du += dg * c.kx;
        dv += dg * c.ky;
      }
      const i = y * SIZE + x;
      height[i] = h;
      gu[i] = du;
      gv[i] = dv;
    }
  }
  let hMin = Infinity;
  let hMax = -Infinity;
  let gMax = 0;
  for (let i = 0; i < n; i++) {
    hMin = Math.min(hMin, height[i]);
    hMax = Math.max(hMax, height[i]);
    gMax = Math.max(gMax, Math.abs(gu[i]), Math.abs(gv[i]));
  }
  // Les pentes extrêmes sont rares : on les écrête pour garder de la précision.
  const gScale = gMax * 0.6;
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const enc = (g: number) =>
      Math.round((Math.max(-1, Math.min(1, g / gScale)) * 0.5 + 0.5) * 255);
    data[i * 4] = enc(gu[i]);
    data[i * 4 + 1] = enc(gv[i]);
    data[i * 4 + 2] = Math.round(((height[i] - hMin) / (hMax - hMin)) * 255);
    data[i * 4 + 3] = 255;
  }
  detail = finish(data);
  return detail;
}

/** Dentelle d'écume : bords des cellules de Voronoï, sur deux échelles. */
export function foamLaceTexture(): THREE.DataTexture {
  if (foam) return foam;
  const rng = createRng(77);
  const layer = (cells: number) => {
    const pts = new Float32Array(cells * cells * 2);
    for (let i = 0; i < cells * cells; i++) {
      pts[i * 2] = rng();
      pts[i * 2 + 1] = rng();
    }
    const out = new Float32Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const fx = (x / SIZE) * cells;
        const fy = (y / SIZE) * cells;
        const cx = Math.floor(fx);
        const cy = Math.floor(fy);
        let f1 = 9;
        let f2 = 9;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const gx = cx + ox;
            const gy = cy + oy;
            const wx = ((gx % cells) + cells) % cells;
            const wy = ((gy % cells) + cells) % cells;
            const px = gx + pts[(wy * cells + wx) * 2];
            const py = gy + pts[(wy * cells + wx) * 2 + 1];
            const d = Math.hypot(px - fx, py - fy);
            if (d < f1) {
              f2 = f1;
              f1 = d;
            } else if (d < f2) f2 = d;
          }
        }
        out[y * SIZE + x] = f2 - f1;
      }
    }
    return out;
  };
  const coarse = layer(7);
  const fine = layer(17);
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const a = Math.max(0, 1 - coarse[i] / 0.16);
    const b = Math.max(0, 1 - fine[i] / 0.12);
    const v = Math.min(1, a * a * 0.9 + b * b * 0.6);
    const byte = Math.round(v * 255);
    data[i * 4] = byte;
    data[i * 4 + 1] = byte;
    data[i * 4 + 2] = byte;
    data[i * 4 + 3] = 255;
  }
  foam = finish(data);
  return foam;
}

export function disposeWaterTextures(): void {
  detail?.dispose();
  foam?.dispose();
  detail = null;
  foam = null;
}
