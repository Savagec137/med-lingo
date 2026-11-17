/**
 * Personnages modélisés avec Higgsfield : décodage des modèles compressés
 * (voir `assets/packed.ts`) en géométries prêtes pour la foule instanciée.
 */

import * as THREE from "three";
import type { PackedCharacter, PackedLod } from "./assets/packed";
import { KNIGHT } from "./assets/knight.ts";
import type { Detail, Pose } from "./soldiers.ts";

function bytesOf(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Les couleurs cuites sont en sRVB 8 bits ; le rendu travaille en linéaire. */
function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Décode un niveau de détail : géométrie indexée avec membres et matières par sommet. */
export function decodeLod(lod: PackedLod): THREE.BufferGeometry {
  const buf = bytesOf(lod.data).buffer;
  const n = lod.vertices;
  const t = lod.triangles;
  let o = 0;
  const pos16 = new Int16Array(buf, o, 3 * n);
  o += 6 * n;
  let uv: Uint16Array | null = null;
  if (lod.mode === "uv") {
    uv = new Uint16Array(buf, o, 2 * n);
    o += 4 * n;
  }
  const index = new Uint16Array(buf, o, 3 * t);
  o += 6 * t;
  const nrm = new Int8Array(buf, o, 3 * n);
  o += 3 * n;
  const part = new Uint8Array(buf, o, n);
  o += n;
  const mat = new Uint8Array(buf, o, 2 * n);
  o += 2 * n;

  const g = new THREE.BufferGeometry();
  const position = new Float32Array(3 * n);
  for (let i = 0; i < 3 * n; i++) position[i] = pos16[i] / 16384;
  g.setAttribute("position", new THREE.BufferAttribute(position, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3, true));
  if (uv) g.setAttribute("uv", new THREE.BufferAttribute(uv, 2, true));
  if (lod.mode === "color") {
    const col8 = new Uint8Array(buf, o, 3 * n);
    const color = new Float32Array(3 * n);
    for (let i = 0; i < 3 * n; i++) color[i] = srgbToLinear(col8[i] / 255);
    g.setAttribute("color", new THREE.BufferAttribute(color, 3));
  }
  g.setAttribute("aPart", new THREE.BufferAttribute(Float32Array.from(part), 1));
  const aMat = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    aMat[i * 3] = mat[i * 2] / 255;
    aMat[i * 3 + 1] = mat[i * 2 + 1] / 255;
  }
  g.setAttribute("aMat", new THREE.BufferAttribute(aMat, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}

function characterTexture(c: PackedCharacter) {
  const img = new Image();
  const tex = new THREE.Texture(img);
  // Convention glTF : la texture ne se retourne pas.
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  img.onload = () => {
    tex.needsUpdate = true;
  };
  img.src = c.texture;
  return tex;
}

/** Chevalier bleu (Higgsfield) : modèle texturé de près, couleurs cuites au loin. */
export function buildKnightGeometry(detail: Detail) {
  return decodeLod(KNIGHT.lods[detail]);
}

export const KNIGHT_POSE: Pose = KNIGHT.pivots;
export const KNIGHT_HEIGHT = KNIGHT.height;

/** Texture du chevalier (navigateur uniquement). */
export function knightTexture() {
  return characterTexture(KNIGHT);
}
