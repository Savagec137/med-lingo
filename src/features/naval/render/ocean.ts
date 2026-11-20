/**
 * Océan : une grille qui suit la caméra (dense au centre, clairsemée vers
 * l'horizon), déformée par les vagues de Gerstner de `waves.ts`. Les vagues
 * sont calculées en coordonnées monde : la mer ne « glisse » pas avec la
 * caméra.
 */

import * as THREE from "three";
import { FOG_FAR, FOG_NEAR, PALETTE, SUN_DIR } from "./environment.ts";
import { foamLaceTexture, oceanDetailTexture } from "./water-textures.ts";
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
      uDetail: { value: oceanDetailTexture() },
      uFoam: { value: foamLaceTexture() },
      uSunDir: { value: SUN_DIR },
      uSunColor: { value: PALETTE.sun },
      uDeep: { value: PALETTE.deep },
      uShallow: { value: PALETTE.shallow },
      uZenith: { value: PALETTE.zenith },
      uMid: { value: PALETTE.waterSky },
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
      uniform sampler2D uDetail;
      uniform sampler2D uFoam;
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

      // Une couche de vagues : texture tournée, mise à l'échelle et en dérive ;
      // la pente est ramenée dans le repère du monde.
      vec2 waveLayer(vec2 w, float scale, float ang, vec2 drift, float strength, out float h) {
        float c = cos(ang);
        float s = sin(ang);
        mat2 R = mat2(c, s, -s, c);
        vec4 t = texture2D(uDetail, (R * w) / scale + drift * uTime);
        h = t.b;
        return (transpose(R) * (t.rg * 2.0 - 1.0)) * strength;
      }

      void main() {
        vec2 w = vWorld.xz;
        float dist = length(vWorld - cameraPosition);
        float near = 1.0 - smoothstep(30.0, 220.0, dist);
        float hA;
        float hB;
        float hC;
        float hD;
        // Quatre échelles incommensurables : pas de motif répété visible.
        vec2 g = waveLayer(w, 36.0, 0.0, vec2(0.011, 0.006), 0.24, hA)
               + waveLayer(w, 14.5, 1.1, vec2(-0.017, 0.02), 0.17, hB)
               + waveLayer(w, 88.0, -0.7, vec2(0.004, -0.008), 0.22, hC)
               + waveLayer(w, 5.8, 2.3, vec2(0.032, -0.021), 0.08 * near, hD);
        g += -vNormal.xz / max(vNormal.y, 0.2);
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        float hc = hA * 0.42 + hB * 0.3 + hC * 0.28;

        vec3 V = normalize(cameraPosition - vWorld);
        float ndv = max(dot(N, V), 0.0);
        float fres = min(0.02 + 0.98 * pow(1.0 - ndv, 5.0), 0.6);
        vec3 R = reflect(-V, N);
        // Les faces des vagues renvoient le bleu du ciel plutôt que l'horizon délavé.
        R.y = abs(R.y) * 0.8 + 0.14;
        float towardSun = pow(max(dot(normalize(R.xz + vec2(1e-4)), normalize(uSunDir.xz)), 0.0), 2.0);
        vec3 horizon = mix(uHorizon, uSunHorizon, towardSun * 0.85);
        vec3 sky = mix(mix(horizon, uMid, smoothstep(0.0, 0.17, R.y)), uZenith, smoothstep(0.17, 0.75, R.y));

        // Reflet du soleil sur chaque facette : un chemin doré brisé en éclats.
        float sunAmt = max(dot(R, uSunDir), 0.0);
        // Éclats dorés (et non blancs saturés), plafonnés pour rester des étincelles.
        vec3 gold = uSunColor * vec3(1.0, 0.78, 0.5);
        vec3 glitter = min(gold * (pow(sunAmt, 420.0) * 10.0 + pow(sunAmt, 70.0) * 0.5), vec3(2.6))
                     + uSunColor * pow(sunAmt, 14.0) * 0.025;

        // Corps de l'eau : creux sombres, faces de vagues plus claires, transparence des crêtes.
        float lit = max(dot(N, uSunDir), 0.0);
        float sss = pow(max(dot(V, -uSunDir), 0.0), 3.0) * smoothstep(0.45, 0.9, hc) * 0.7;
        vec3 body = mix(uDeep, uShallow, smoothstep(0.25, 0.85, hc) * 0.75) * (0.7 + 0.3 * lit);
        body += uShallow * sss;
        // Soleil rasant : les éclats se concentrent vers l'horizon, l'eau proche reste sombre.
        glitter *= smoothstep(70.0, 320.0, dist);
        vec3 col = mix(body, sky, fres) + glitter;

        // Moutons : fines lignes d'écume sur les crêtes, découpées en dentelle.
        float lace = texture2D(uFoam, w / 8.5 + vec2(0.012, -0.007) * uTime).r;
        float lace2 = texture2D(uFoam, w / 24.0 - vec2(0.005, 0.009) * uTime).r;
        // Les crêtes aiguës de chaque couche dessinent de fines lignes blanches.
        float crest = max(smoothstep(0.8, 0.95, hA), smoothstep(0.82, 0.96, hB) * 0.75);
        crest = max(crest, smoothstep(0.74, 0.88, hc + vCrest * 0.1) * 0.6);
        float foam = crest * lace * (0.55 + 0.45 * lace2) * 1.4;
        foam *= 1.0 - 0.75 * smoothstep(200.0, 900.0, dist);
        vec3 foamCol = mix(vec3(0.8, 0.87, 0.94), vec3(1.0, 0.9, 0.76), towardSun * 0.35);
        col = mix(col, foamCol, clamp(foam, 0.0, 1.0) * 0.9);

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
