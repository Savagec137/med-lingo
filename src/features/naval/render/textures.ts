/**
 * Textures peintes au canevas au lancement : voiles et emblèmes, bordé et
 * sabords, pont, pavillons, fenêtres de poupe, palmes, écume. Aucune image
 * externe à charger : tout est prêt en quelques millisecondes.
 */

import * as THREE from "three";
import type { ShipLook } from "../sim/defs.ts";

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponible");
  return [c, ctx];
}

function finish(
  c: HTMLCanvasElement,
  opts: { repeat?: boolean; srgb?: boolean } = {},
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function cached(key: string, make: () => THREE.Texture): THREE.Texture {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

export function disposeTextures(): void {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

/** Bruit de salissure : taches irrégulières pour vieillir les surfaces. */
function grime(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number, seed = 1): void {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < 220; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 4 + rnd() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.6;
    g.addColorStop(
      0,
      dark ? `rgba(0,0,0,${alpha * rnd()})` : `rgba(255,240,210,${alpha * 0.5 * rnd()})`,
    );
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function drawSkull(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  color: string,
  hole: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  // Sabres croisés derrière le crâne.
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (const dir of [-1, 1]) {
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.moveTo(-0.95 * dir, 1.05);
    ctx.quadraticCurveTo(-0.2 * dir, 0.35, 0.9 * dir, -0.55);
    ctx.stroke();
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    ctx.moveTo(-0.98 * dir, 1.1);
    ctx.lineTo(-0.78 * dir, 0.9);
    ctx.stroke();
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(-0.95 * dir, 0.78);
    ctx.lineTo(-0.62 * dir, 1.08);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -0.12, 0.52, 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-0.3, 0.18, 0.6, 0.34, 0.08);
  ctx.fill();
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.ellipse(-0.2, -0.08, 0.14, 0.16, 0.2, 0, Math.PI * 2);
  ctx.ellipse(0.2, -0.08, 0.14, 0.16, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0.08);
  ctx.lineTo(-0.07, 0.2);
  ctx.lineTo(0.07, 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-0.2, 0.36, 0.4, 0.035);
  for (let i = -2; i <= 2; i++) ctx.fillRect(i * 0.08 - 0.012, 0.3, 0.024, 0.2);
  ctx.restore();
}

function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
}

export function sailTexture(look: ShipLook, withEmblem: boolean): THREE.Texture {
  return cached(`sail:${look.sail}:${look.emblem}:${withEmblem}`, () => {
    const [c, ctx] = canvas(256, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, shade(look.sail, 1.12));
    g.addColorStop(1, shade(look.sail, 0.8));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    // Laizes de toile cousues.
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1.5;
    for (let x = 16; x < 256; x += 21) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 3, 256);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let x = 18; x < 256; x += 21) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 3, 256);
      ctx.stroke();
    }
    grime(ctx, 256, 256, 0.22, look.sail.length);
    // Ralingue renforcée au bord.
    ctx.strokeStyle = "rgba(20,12,6,0.55)";
    ctx.lineWidth = 6;
    ctx.strokeRect(2, 2, 252, 252);
    if (withEmblem) {
      const light = new THREE.Color(look.sail).getHSL({ h: 0, s: 0, l: 0 }).l < 0.4;
      if (look.emblem === "crane") {
        drawSkull(
          ctx,
          128,
          120,
          62,
          light ? "#efe6cf" : "#16110d",
          light ? shade(look.sail, 0.9) : look.sail,
        );
      } else if (look.emblem === "croix") {
        ctx.fillStyle = "#9b1d1d";
        ctx.fillRect(110, 30, 36, 196);
        ctx.fillRect(40, 100, 176, 36);
      } else if (look.emblem === "flamme") {
        ctx.fillStyle = "rgba(60,30,10,0.55)";
        for (let i = 0; i < 6; i++) ctx.fillRect(30 + i * 34, 40 + ((i * 53) % 120), 28, 34);
      }
    }
    return finish(c);
  });
}

export function hullTexture(look: ShipLook): THREE.Texture {
  return cached(`hull:${look.hull}:${look.trim}`, () => {
    const [c, ctx] = canvas(512, 256);
    ctx.fillStyle = look.hull;
    ctx.fillRect(0, 0, 512, 256);
    // Bordages : virures horizontales de largeur et teinte variables.
    let y = 0;
    let i = 0;
    while (y < 256) {
      const h = 9 + ((i * 7) % 5);
      ctx.fillStyle = shade(look.hull, 0.82 + ((i * 37) % 30) / 100);
      ctx.fillRect(0, y, 512, h - 1);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, y + h - 1, 512, 1);
      for (let x = (i * 61) % 90; x < 512; x += 90 + ((i * 13) % 40)) {
        ctx.fillRect(x, y, 1, h - 1);
      }
      y += h;
      i++;
    }
    grime(ctx, 512, 256, 0.3, 3);
    // v = 0 en haut du bordé (bastingage) ; préceinte peinte et sabords.
    const band = (top: number, height: number) => {
      ctx.fillStyle = look.trim;
      ctx.fillRect(0, top, 512, height);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(0, top, 512, 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, top + height - 2, 512, 2);
    };
    band(10, 9);
    band(52, 6);
    for (let x = 30; x < 512; x += 52) {
      ctx.fillStyle = shade(look.trim, 0.7);
      ctx.fillRect(x - 2, 21, 22, 22);
      ctx.fillStyle = "#0b0805";
      ctx.fillRect(x, 23, 18, 18);
    }
    // Ligne de flottaison sombre.
    const wl = ctx.createLinearGradient(0, 150, 0, 256);
    wl.addColorStop(0, "rgba(0,0,0,0)");
    wl.addColorStop(0.35, "rgba(20,40,30,0.55)");
    wl.addColorStop(1, "rgba(10,20,15,0.8)");
    ctx.fillStyle = wl;
    ctx.fillRect(0, 150, 512, 106);
    return finish(c, { repeat: true });
  });
}

export function deckTexture(): THREE.Texture {
  return cached("deck", () => {
    const [c, ctx] = canvas(256, 256);
    ctx.fillStyle = "#7a5a3a";
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 16) {
      ctx.fillStyle = shade("#7a5a3a", 0.85 + ((x * 7) % 25) / 100);
      ctx.fillRect(x, 0, 15, 256);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x + 15, 0, 1, 256);
    }
    grime(ctx, 256, 256, 0.25, 5);
    return finish(c, { repeat: true });
  });
}

export function flagTexture(kind: ShipLook["flag"]): THREE.Texture {
  return cached(`flag:${kind}`, () => {
    const [c, ctx] = canvas(128, 96);
    ctx.fillStyle = kind === "pavillon-rouge" ? "#8c1414" : "#0c0c0f";
    ctx.fillRect(0, 0, 128, 96);
    drawSkull(ctx, 64, 44, 26, "#f1ead8", kind === "pavillon-rouge" ? "#8c1414" : "#0c0c0f");
    grime(ctx, 128, 96, 0.2, 9);
    return finish(c);
  });
}

/** Fenêtres de la galerie de poupe : la carte émissive les fait luire. */
export function sternTexture(): { map: THREE.Texture; emissive: THREE.Texture } {
  const map = cached("stern-map", () => {
    const [c, ctx] = canvas(256, 128);
    ctx.fillStyle = "#3a2414";
    ctx.fillRect(0, 0, 256, 128);
    grime(ctx, 256, 128, 0.3, 4);
    ctx.fillStyle = "#c99a3c";
    ctx.fillRect(0, 0, 256, 8);
    ctx.fillRect(0, 120, 256, 8);
    for (let i = 0; i < 4; i++) {
      const x = 22 + i * 58;
      ctx.fillStyle = "#c99a3c";
      ctx.fillRect(x - 4, 26, 44, 70);
      ctx.fillStyle = "#ffcf7a";
      ctx.fillRect(x, 30, 36, 62);
      ctx.fillStyle = "#3a2414";
      ctx.fillRect(x + 17, 30, 2, 62);
      ctx.fillRect(x, 58, 36, 2);
    }
    return finish(c);
  });
  const emissive = cached("stern-emissive", () => {
    const [c, ctx] = canvas(256, 128);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 4; i++) {
      const x = 22 + i * 58;
      const g = ctx.createRadialGradient(x + 18, 60, 4, x + 18, 60, 40);
      g.addColorStop(0, "#ffd890");
      g.addColorStop(1, "#ff8a2a");
      ctx.fillStyle = g;
      ctx.fillRect(x, 30, 36, 62);
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 17, 30, 2, 62);
      ctx.fillRect(x, 58, 36, 2);
    }
    return finish(c);
  });
  return { map, emissive };
}

export function leafTexture(): THREE.Texture {
  return cached("leaf", () => {
    const [c, ctx] = canvas(128, 32);
    ctx.clearRect(0, 0, 128, 32);
    ctx.fillStyle = "#3f7a2a";
    ctx.strokeStyle = "#2a5a1c";
    ctx.beginPath();
    ctx.moveTo(0, 16);
    for (let x = 0; x <= 128; x += 6) {
      const w = Math.sin((x / 128) * Math.PI) * 14;
      ctx.lineTo(x, 16 - w);
      ctx.lineTo(x + 3, 16 - w * 0.6);
    }
    for (let x = 128; x >= 0; x -= 6) {
      const w = Math.sin((x / 128) * Math.PI) * 14;
      ctx.lineTo(x, 16 + w);
      ctx.lineTo(x - 3, 16 + w * 0.6);
    }
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(128, 16);
    ctx.stroke();
    return finish(c);
  });
}

export function foamTexture(): THREE.Texture {
  return cached("foam", () => {
    const [c, ctx] = canvas(64, 256);
    ctx.clearRect(0, 0, 64, 256);
    for (let i = 0; i < 380; i++) {
      const x = 32 + (Math.random() - 0.5) * 60 * Math.random();
      const y = Math.random() * 256;
      const r = 1 + Math.random() * 4;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return finish(c, { repeat: true });
  });
}

/** Petite tache douce pour les particules et halos. */
export function glowTexture(): THREE.Texture {
  return cached("glow", () => {
    const [c, ctx] = canvas(64, 64);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return finish(c);
  });
}
