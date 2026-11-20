/**
 * Océan : une grille qui suit la caméra (dense au centre, clairsemée vers
 * l'horizon), déformée par les vagues de Gerstner de `waves.ts`. Les vagues
 * sont calculées en coordonnées monde : la mer ne « glisse » pas avec la
 * caméra.
 */

import * as THREE from "three";
import { FOG_FAR, FOG_NEAR, NOISE_GLSL, PALETTE, SUN_DIR } from "./environment.ts";
import { wavesGlsl } from "./waves.ts";

const HALF_SIZE = 2200;

function createOceanGeometry(segments: number): THREE.BufferGeometry {
  const n = segments + 1;
  const positions = new Float32Array(n * n * 3);
  let k = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = (i / segments) * 2 - 1;
      const v = (j / segments) * 2 - 1;
      // Répartition quadratique : beaucoup de sommets près du joueur.
      positions[k++] = Math.sign(u) * u * u * HALF_SIZE;
      positions[k++] = 0;
      positions[k++] = Math.sign(v) * v * v * HALF_SIZE;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

export interface Ocean {
  mesh: THREE.Mesh;
  update(time: number, focusX: number, focusZ: number): void;
  dispose(): void;
}

export function createOcean(quality: "haute" | "basse"): Ocean {
  const geometry = createOceanGeometry(quality === "haute" ? 200 : 140);
  const material = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector2() },
      uSunDir: { value: SUN_DIR },
      uSunColor: { value: PALETTE.sun },
      uDeep: { value: PALETTE.deep },
      uShallow: { value: PALETTE.shallow },
      uZenith: { value: PALETTE.zenith },
      uMid: { value: PALETTE.midSky },
      uHorizon: { value: PALETTE.horizon },
      uSunHorizon: { value: PALETTE.sunHorizon },
      uFog: { value: PALETTE.fog },
      uFogNear: { value: FOG_NEAR },
      uFogFar: { value: FOG_FAR },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uCenter;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vCrest;
      varying float vFade;
      ${wavesGlsl()}
      void main() {
        vec3 p = position + vec3(uCenter.x, 0.0, uCenter.y);
        float d = length(p.xz - cameraPosition.xz);
        float fade = 1.0 - smoothstep(300.0, 1100.0, d);
        vec3 disp = vec3(0.0);
        vec3 n = vec3(0.0, 1.0, 0.0);
        float crest = 0.0;
        for (int i = 0; i < WAVE_COUNT; i++) {
          vec4 a = WAVE_A[i];
          vec2 b = WAVE_B[i];
          float ph = a.z * dot(a.xy, p.xz) - b.x * uTime;
          float s = sin(ph);
          float c = cos(ph);
          float q = b.y;
          disp.x += q * a.w * a.x * c;
          disp.z += q * a.w * a.y * c;
          disp.y += a.w * s;
          n.x -= a.x * a.z * a.w * c;
          n.z -= a.y * a.z * a.w * c;
          n.y -= q * a.z * a.w * s;
          crest += s * a.w;
        }
        vec3 wp = p + disp * fade;
        vWorld = wp;
        vNormal = normalize(mix(vec3(0.0, 1.0, 0.0), n, fade));
        vCrest = crest;
        vFade = fade;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uZenith;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uSunHorizon;
      uniform vec3 uFog;
      uniform float uFogNear;
      uniform float uFogFar;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vCrest;
      varying float vFade;
      ${NOISE_GLSL}
      vec2 noiseGrad(vec2 p) {
        float c = vnoise(p);
        return vec2(vnoise(p + vec2(0.2, 0.0)) - c, vnoise(p + vec2(0.0, 0.2)) - c) * 5.0;
      }
      void main() {
        vec2 uv = vWorld.xz;
        float dist = length(vWorld - cameraPosition);
        float detail = 1.0 - smoothstep(60.0, 420.0, dist);
        // Ridules : gradient d'un bruit non périodique (pas de moiré vu de haut).
        vec2 dn = noiseGrad(uv * 0.21 + vec2(uTime * 0.06, uTime * 0.035)) * 0.6
                + noiseGrad(uv * 0.53 - vec2(uTime * 0.11, -uTime * 0.05)) * 0.4;
        vec3 N = normalize(vNormal + vec3(dn.x, 0.0, dn.y) * (0.05 + 0.09 * detail));
        vec3 V = normalize(cameraPosition - vWorld);
        float ndv = max(dot(N, V), 0.0);
        float fres = 0.02 + 0.62 * pow(1.0 - ndv, 5.0);
        vec3 R = reflect(-V, N);
        R.y = abs(R.y);
        float towardSun = pow(max(dot(normalize(R.xz + vec2(1e-4)), normalize(uSunDir.xz)), 0.0), 2.0);
        vec3 horizon = mix(uHorizon, uSunHorizon, towardSun * 0.85);
        vec3 sky = mix(mix(horizon, uMid, smoothstep(0.0, 0.17, R.y)), uZenith, smoothstep(0.17, 0.75, R.y)) * 0.82;
        float sunAmt = max(dot(R, uSunDir), 0.0);
        vec3 glitter = uSunColor * (pow(sunAmt, 700.0) * 18.0 + pow(sunAmt, 80.0) * 0.8 + pow(sunAmt, 14.0) * 0.07);
        float sss = pow(max(dot(V, -uSunDir), 0.0), 3.0) * max(vCrest, 0.0) * 0.6;
        vec3 body = mix(uDeep, uShallow, clamp(0.35 + vCrest * 0.35, 0.0, 1.0));
        body *= 0.55 + 0.45 * max(dot(N, uSunDir), 0.0);
        body += uShallow * sss;
        vec3 col = mix(body, sky, fres) + glitter * (0.4 + 0.6 * fres);
        // Écume sur les crêtes.
        float foamNoise = vnoise(uv * 0.35 + vec2(uTime * 0.08, -uTime * 0.05)) * 0.6 + vnoise(uv * 1.3 - uTime * 0.2) * 0.4;
        float foam = smoothstep(0.82, 1.22, vCrest + foamNoise * 0.32) * vFade * (0.35 + 0.65 * detail);
        foam *= smoothstep(0.35, 0.75, vnoise(uv * 0.08 + uTime * 0.02));
        col = mix(col, vec3(0.86, 0.92, 0.98), foam * 0.6);
        float f = smoothstep(uFogNear, uFogFar, dist);
        col = mix(col, uFog, f);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -5;
  const step = HALF_SIZE / ((quality === "haute" ? 200 : 140) / 2) ** 2;
  return {
    mesh,
    update(time, focusX, focusZ) {
      material.uniforms.uTime.value = time;
      // Recentre la grille par pas entiers pour éviter le scintillement des sommets.
      const snap = Math.max(step * 4, 1);
      (material.uniforms.uCenter.value as THREE.Vector2).set(
        Math.round(focusX / snap) * snap,
        Math.round(focusZ / snap) * snap,
      );
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
