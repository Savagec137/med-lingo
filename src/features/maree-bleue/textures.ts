/**
 * Textures procédurales dessinées sur canvas — aucune image à télécharger.
 */

import * as THREE from "three";
import { makeRng } from "./sim";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponible");
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)`;
}

function speckle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  n: number,
  alpha: number,
) {
  for (let i = 0; i < n; i++) {
    const v = rng() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rng()})`;
    const s = 1 + rng() * 2.5;
    ctx.fillRect(rng() * w, rng() * h, s, s);
  }
}

export interface PavingStyle {
  hue: number;
  sat: number;
  light: number;
  grout: string;
  /** Pierres irrégulières plutôt que dalles carrées. */
  cobble?: boolean;
  /** Fissures incandescentes (forge). */
  glow?: boolean;
}

/** Dallage du chemin : 4×4 dalles par motif. */
export function pavingTexture(style: PavingStyle, seed = 3) {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rng = makeRng(seed);
  ctx.fillStyle = style.grout;
  ctx.fillRect(0, 0, S, S);
  if (style.cobble) {
    // Pavés arrondis en rangées décalées.
    const rows = 8;
    const rh = S / rows;
    for (let r = 0; r < rows; r++) {
      let x = r % 2 ? -rh * 0.5 : 0;
      while (x < S) {
        const w = rh * (0.8 + rng() * 0.6);
        const l = style.light + (rng() - 0.5) * 0.12;
        ctx.fillStyle = hsl(style.hue + (rng() - 0.5) * 8, style.sat, l);
        roundRect(ctx, x + 3, r * rh + 3, w - 6, rh - 6, 10);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        roundRect(ctx, x + 6, r * rh + 5, w - 14, (rh - 6) * 0.4, 8);
        ctx.fill();
        x += w;
      }
    }
  } else {
    const n = 4;
    const ts = S / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const l = style.light + (rng() - 0.5) * 0.07;
        const g = ctx.createLinearGradient(i * ts, j * ts, (i + 1) * ts, (j + 1) * ts);
        g.addColorStop(0, hsl(style.hue, style.sat, l + 0.03));
        g.addColorStop(1, hsl(style.hue + 4, style.sat, l - 0.03));
        ctx.fillStyle = g;
        roundRect(ctx, i * ts + 3, j * ts + 3, ts - 6, ts - 6, 6);
        ctx.fill();
        // Biseau clair en haut à gauche, sombre en bas à droite.
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(i * ts + 6, (j + 1) * ts - 6);
        ctx.lineTo(i * ts + 6, j * ts + 6);
        ctx.lineTo((i + 1) * ts - 6, j * ts + 6);
        ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.beginPath();
        ctx.moveTo((i + 1) * ts - 5, j * ts + 6);
        ctx.lineTo((i + 1) * ts - 5, (j + 1) * ts - 5);
        ctx.lineTo(i * ts + 6, (j + 1) * ts - 5);
        ctx.stroke();
      }
    }
  }
  speckle(ctx, S, S, rng, 2600, 0.08);
  if (style.glow) {
    ctx.strokeStyle = "rgba(255,120,30,0.9)";
    ctx.shadowColor = "rgba(255,90,0,1)";
    ctx.shadowBlur = 8;
    for (let k = 0; k < 9; k++) {
      ctx.lineWidth = 1 + rng() * 2;
      ctx.beginPath();
      let x = rng() * S;
      let y = rng() * S;
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (rng() - 0.5) * 60;
        y += (rng() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  return toTexture(c);
}

export interface GroundStyle {
  base: [number, number, number];
  /** Brins d'herbe ou rides de sable. */
  detail: "grass" | "sand" | "snow" | "ash" | "moss";
}

export function groundTexture(style: GroundStyle, seed = 5) {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rng = makeRng(seed);
  const [h, s, l] = style.base;
  ctx.fillStyle = hsl(h, s, l);
  ctx.fillRect(0, 0, S, S);
  // Taches douces.
  for (let i = 0; i < 70; i++) {
    const r = 20 + rng() * 70;
    const x = rng() * S;
    const y = rng() * S;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dl = (rng() - 0.5) * 0.12;
    g.addColorStop(
      0,
      hsl(h + (rng() - 0.5) * 12, s, l + dl)
        .replace("hsl", "hsla")
        .replace(")", ", 0.6)"),
    );
    g.addColorStop(1, hsl(h, s, l).replace("hsl", "hsla").replace(")", ", 0)"));
    ctx.fillStyle = g;
    for (const ox of [-S, 0, S])
      for (const oy of [-S, 0, S]) ctx.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
  }
  if (style.detail === "grass" || style.detail === "moss") {
    for (let i = 0; i < 5000; i++) {
      const x = rng() * S;
      const y = rng() * S;
      const len = 3 + rng() * 6;
      ctx.strokeStyle = hsl(h + (rng() - 0.5) * 20, s, l + (rng() - 0.4) * 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 3, y - len);
      ctx.stroke();
    }
  } else if (style.detail === "sand") {
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(120,70,20,${0.05 + rng() * 0.06})`;
      ctx.lineWidth = 2 + rng() * 3;
      const y = rng() * S;
      ctx.beginPath();
      for (let x = -10; x <= S + 10; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 6);
      ctx.stroke();
    }
    speckle(ctx, S, S, rng, 4000, 0.12);
  } else if (style.detail === "snow") {
    speckle(ctx, S, S, rng, 3000, 0.05);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + rng() * 0.5})`;
      ctx.fillRect(rng() * S, rng() * S, 1.5, 1.5);
    }
  } else {
    speckle(ctx, S, S, rng, 5000, 0.15);
  }
  return toTexture(c);
}

/** Feuillage dense pour les haies et buissons. */
export function leafTexture(hue = 112, seed = 9) {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  const rng = makeRng(seed);
  ctx.fillStyle = hsl(hue, 0.55, 0.22);
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 1400; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const r = 3 + rng() * 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng() * Math.PI * 2);
    ctx.fillStyle = hsl(hue + (rng() - 0.5) * 18, 0.5 + rng() * 0.2, 0.25 + rng() * 0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return toTexture(c);
}

/** Maçonnerie de briques/pierres pour la forteresse et les remparts. */
export function brickTexture(hue: number, sat: number, light: number, seed = 11) {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  const rng = makeRng(seed);
  ctx.fillStyle = hsl(hue, sat * 0.6, light * 0.55);
  ctx.fillRect(0, 0, S, S);
  const rows = 8;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    const bw = S / 4;
    for (let k = -1; k < 5; k++) {
      const x = k * bw + (r % 2 ? bw / 2 : 0);
      ctx.fillStyle = hsl(hue + (rng() - 0.5) * 8, sat, light + (rng() - 0.5) * 0.1);
      roundRect(ctx, x + 2, r * rh + 2, bw - 4, rh - 4, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(x + 4, r * rh + 3, bw - 8, 3);
    }
  }
  speckle(ctx, S, S, rng, 1500, 0.1);
  return toTexture(c);
}

/** Bandes d'avertissement jaunes et noires (marteaux). */
export function hazardStripeTexture() {
  const { c, ctx } = canvas(256, 32);
  ctx.fillStyle = "#1c1c22";
  ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = "#ffc41f";
  for (let x = -32; x < 288; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 32);
    ctx.lineTo(x + 16, 32);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 16, 0);
    ctx.closePath();
    ctx.fill();
  }
  const t = toTexture(c);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Disque radial doux (ombres portées, halos). */
export function radialTexture(inner = "rgba(0,0,0,0.55)", outer = "rgba(0,0,0,0)") {
  const { c, ctx } = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(0.55, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function glowTexture() {
  const { c, ctx } = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const GATE_COLORS = {
  mul: { top: "#5ab0ff", bottom: "#1f5fe0", edge: "#d9ecff", glow: 0x3d8bff },
  gold: { top: "#ffe066", bottom: "#f29a0c", edge: "#fff6cf", glow: 0xffb81f },
  div: { top: "#ff7a7a", bottom: "#c4162a", edge: "#ffd9d9", glow: 0xff3344 },
};

/** Panneau de porte : dégradé, liseré et grand chiffre. */
export function gateLabelTexture(text: string, kind: keyof typeof GATE_COLORS, widthRatio: number) {
  const H = 160;
  const W = Math.round(Math.max(1, widthRatio) * H);
  const { c, ctx } = canvas(W, H);
  const col = GATE_COLORS[kind];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, col.top);
  g.addColorStop(1, col.bottom);
  ctx.fillStyle = g;
  roundRect(ctx, 4, 4, W - 8, H - 8, 18);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = col.edge;
  roundRect(ctx, 6, 6, W - 12, H - 12, 16);
  ctx.stroke();
  // Reflet.
  const sh = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  sh.addColorStop(0, "rgba(255,255,255,0.45)");
  sh.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sh;
  roundRect(ctx, 12, 10, W - 24, H * 0.42, 12);
  ctx.fill();
  ctx.font = `900 ${Math.round(H * 0.74)}px "Nunito", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 12;
  ctx.strokeStyle = "rgba(10,20,60,0.55)";
  ctx.strokeText(text, W / 2, H / 2 + 6);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, W / 2, H / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Bannière de la forteresse : tissu rouge et emblème cornu. */
export function bannerTexture(color = "#c3202e", seed = 13) {
  const { c, ctx } = canvas(128, 256);
  const rng = makeRng(seed);
  const g = ctx.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, shade(color, -0.25));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.25));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(128, 0);
  ctx.lineTo(128, 220);
  ctx.lineTo(64, 256);
  ctx.lineTo(0, 220);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#f3c34a";
  ctx.lineWidth = 6;
  ctx.stroke();
  // Emblème : un heaume à cornes stylisé.
  ctx.fillStyle = "#f3c34a";
  ctx.beginPath();
  ctx.arc(64, 112, 26, Math.PI, 0);
  ctx.lineTo(90, 140);
  ctx.lineTo(38, 140);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(40, 104);
  ctx.quadraticCurveTo(14, 96, 18, 62);
  ctx.quadraticCurveTo(30, 88, 46, 92);
  ctx.closePath();
  ctx.moveTo(88, 104);
  ctx.quadraticCurveTo(114, 96, 110, 62);
  ctx.quadraticCurveTo(98, 88, 82, 92);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(color, -0.4);
  ctx.fillRect(46, 118, 36, 8);
  speckle(ctx, 128, 256, rng, 400, 0.08);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Ciel en dégradé vertical pour le fond. */
export function skyTexture(top: string, horizon: string) {
  const { c, ctx } = canvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Bois veiné en planches, pour affûts, roues et caisses. */
export function woodTexture(seed = 17) {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  const rng = makeRng(seed);
  ctx.fillStyle = "#8a5a30";
  ctx.fillRect(0, 0, S, S);
  for (let p = 0; p < 4; p++) {
    const y0 = p * 64;
    const l = 0.3 + rng() * 0.08;
    ctx.fillStyle = hsl(26 + rng() * 6, 0.5, l);
    ctx.fillRect(0, y0, S, 64);
    for (let k = 0; k < 16; k++) {
      ctx.strokeStyle = `rgba(${rng() < 0.5 ? "40,20,5" : "230,180,120"},${0.08 + rng() * 0.14})`;
      ctx.lineWidth = 1 + rng() * 1.5;
      ctx.beginPath();
      const y = y0 + 3 + rng() * 58;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(S * 0.3, y + (rng() - 0.5) * 8, S * 0.7, y + (rng() - 0.5) * 8, S, y);
      ctx.stroke();
    }
    if (rng() < 0.7) {
      const kx = rng() * S;
      const ky = y0 + 16 + rng() * 32;
      ctx.strokeStyle = "rgba(50,25,8,0.45)";
      for (let r = 2; r < 9; r += 2.5) {
        ctx.beginPath();
        ctx.ellipse(kx, ky, r * 1.8, r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(30,14,4,0.6)";
    ctx.fillRect(0, y0, S, 2);
  }
  return toTexture(c);
}

/** Toile de jute des sacs de sable. */
export function burlapTexture(seed = 19) {
  const S = 64;
  const { c, ctx } = canvas(S, S);
  const rng = makeRng(seed);
  ctx.fillStyle = "#c8a56e";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 4) {
    ctx.fillStyle = `rgba(90,60,20,${0.12 + rng() * 0.12})`;
    ctx.fillRect(i, 0, 1.5, S);
    ctx.fillStyle = `rgba(255,235,190,${0.1 + rng() * 0.12})`;
    ctx.fillRect(0, i + 2, S, 1.5);
  }
  speckle(ctx, S, S, rng, 200, 0.12);
  return toTexture(c);
}
