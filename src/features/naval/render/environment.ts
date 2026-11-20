/**
 * Ambiance « heure dorée » : ciel couchant procédural, soleil bas sur
 * l'horizon, lumières et brouillard accordés à la couleur de l'horizon.
 */

import * as THREE from "three";

export const PALETTE = {
  zenith: new THREE.Color("#0e2347"),
  midSky: new THREE.Color("#2f5d9a"),
  horizon: new THREE.Color("#7f93b8"),
  sunHorizon: new THREE.Color("#ffad5c"),
  sun: new THREE.Color("#ffd29a"),
  fog: new THREE.Color("#6d84ab"),
  deep: new THREE.Color("#031a33"),
  shallow: new THREE.Color("#0b4a70"),
} as const;

/** Soleil devant la position de départ, un peu à bâbord, à 5° au-dessus de l'eau. */
export const SUN_DIR = new THREE.Vector3(0.38, 0.09, 1).normalize();

export const FOG_NEAR = 220;
export const FOG_FAR = 1800;

const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
`;

export { NOISE_GLSL };

export function createSky(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uZenith: { value: PALETTE.zenith },
      uMid: { value: PALETTE.midSky },
      uHorizon: { value: PALETTE.horizon },
      uSunHorizon: { value: PALETTE.sunHorizon },
      uSunColor: { value: PALETTE.sun },
      uFog: { value: PALETTE.fog },
      uSunDir: { value: SUN_DIR },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uSunHorizon;
      uniform vec3 uSunColor;
      uniform vec3 uFog;
      uniform vec3 uSunDir;
      uniform float uTime;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;
        float sunDot = max(dot(dir, uSunDir), 0.0);
        float towardSun = pow(max(dot(normalize(dir.xz + vec2(1e-4)), normalize(uSunDir.xz)), 0.0), 2.0);
        vec3 horizon = mix(uHorizon, uSunHorizon, towardSun * 0.85);
        // Bande chaude basse, bleu franc au-dessus, nuit au zénith.
        vec3 col = mix(horizon, uMid, smoothstep(0.0, 0.17, h));
        col = mix(col, uZenith, smoothstep(0.17, 0.75, h));
        col = mix(col, uFog, smoothstep(0.01, -0.05, h));
        // Nuages en bandes, éclairés par-dessous côté soleil.
        vec2 cuv = dir.xz / (max(h, 0.0) + 0.12) * 0.9 + vec2(uTime * 0.004, 0.0);
        float c = fbm(cuv * 1.4) * 0.65 + fbm(cuv * 4.0) * 0.35;
        float band = smoothstep(0.015, 0.09, h) * (1.0 - smoothstep(0.25, 0.6, h));
        float cloud = smoothstep(0.56, 0.84, c) * band;
        vec3 cloudShade = mix(vec3(0.22, 0.26, 0.38), vec3(0.95, 0.62, 0.42), towardSun * 0.9);
        cloudShade += uSunColor * pow(sunDot, 6.0) * 0.6;
        col = mix(col, cloudShade, cloud * 0.85);
        // Disque solaire et halo.
        col += uSunColor * (pow(sunDot, 900.0) * 14.0 + pow(sunDot, 90.0) * 0.5 + pow(sunDot, 12.0) * 0.07);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1900, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

export function createLights(scene: THREE.Scene): void {
  const hemi = new THREE.HemisphereLight("#a9c1ea", "#1a3550", 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffc690", 2.6);
  sun.position.copy(SUN_DIR).multiplyScalar(500);
  scene.add(sun);
  // Contre-jour : une lumière froide venant de derrière la caméra garde la poupe lisible.
  const fill = new THREE.DirectionalLight("#9fb6de", 1.1);
  fill.position.set(-SUN_DIR.x * 400, 260, -SUN_DIR.z * 400);
  scene.add(fill);
  scene.fog = new THREE.Fog(PALETTE.fog, FOG_NEAR, FOG_FAR);
}
