/**
 * Effets visuels : particules (fumée, flammes, gerbes, débris, étincelles),
 * boulets en vol, sillages, cercles d'impact des bombes et arc de tir.
 *
 * Tout est mis en commun dans quelques objets (2 nuages de points, 1 maillage
 * instancié) pour rester fluide sur smartphone.
 */

import * as THREE from "three";
import { FOG_FAR, FOG_NEAR, PALETTE } from "./environment.ts";
import { foamLaceTexture } from "./water-textures.ts";
import { waveHeight } from "./waves.ts";

export interface ParticleSpec {
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  life: number;
  size0: number;
  size1: number;
  r: number;
  g: number;
  b: number;
  a: number;
  drag?: number;
  gravity?: number;
}

class ParticlePool {
  readonly max: number;
  count = 0;
  private readonly p: Float32Array; // x y z vx vy vz life maxLife size0 size1 r g b a drag gravity
  private readonly stride = 16;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.ShaderMaterial;

  constructor(max: number, additive: boolean) {
    this.max = max;
    this.p = new Float32Array(max * this.stride);
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 4);
    this.sizes = new Float32Array(max);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.geometry.setAttribute(
      "pcolor",
      new THREE.BufferAttribute(this.colors, 4).setUsage(THREE.DynamicDrawUsage),
    );
    this.geometry.setAttribute(
      "psize",
      new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage),
    );
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uScale: { value: 400 },
        uFog: { value: PALETTE.fog },
        uFogNear: { value: FOG_NEAR },
        uFogFar: { value: FOG_FAR },
        uAdditive: { value: additive ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 pcolor;
        attribute float psize;
        uniform float uScale;
        uniform float uFogNear;
        uniform float uFogFar;
        varying vec4 vColor;
        varying float vFog;
        void main() {
          vColor = pcolor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(psize * uScale / -mv.z, 0.0, 256.0);
          vFog = smoothstep(uFogNear, uFogFar, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uFog;
        uniform float uAdditive;
        varying vec4 vColor;
        varying float vFog;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c) * 2.0;
          if (d > 1.0) discard;
          float a = (1.0 - d * d) * vColor.a;
          vec3 col = mix(vColor.rgb, uFog, uAdditive > 0.5 ? 0.0 : vFog);
          a *= uAdditive > 0.5 ? (1.0 - vFog) : 1.0;
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 4 : 3;
  }

  spawn(s: ParticleSpec): void {
    if (this.count >= this.max) return;
    const o = this.count * this.stride;
    const p = this.p;
    p[o] = s.x;
    p[o + 1] = s.y;
    p[o + 2] = s.z;
    p[o + 3] = s.vx ?? 0;
    p[o + 4] = s.vy ?? 0;
    p[o + 5] = s.vz ?? 0;
    p[o + 6] = 0;
    p[o + 7] = s.life;
    p[o + 8] = s.size0;
    p[o + 9] = s.size1;
    p[o + 10] = s.r;
    p[o + 11] = s.g;
    p[o + 12] = s.b;
    p[o + 13] = s.a;
    p[o + 14] = s.drag ?? 0;
    p[o + 15] = s.gravity ?? 0;
    this.count++;
  }

  update(dt: number): void {
    const p = this.p;
    const st = this.stride;
    let i = 0;
    while (i < this.count) {
      const o = i * st;
      p[o + 6] += dt;
      if (p[o + 6] >= p[o + 7]) {
        // Retire la particule en la remplaçant par la dernière.
        const last = (this.count - 1) * st;
        if (last !== o) p.copyWithin(o, last, last + st);
        this.count--;
        continue;
      }
      const drag = Math.exp(-p[o + 14] * dt);
      p[o + 3] *= drag;
      p[o + 4] = p[o + 4] * drag - p[o + 15] * dt;
      p[o + 5] *= drag;
      p[o] += p[o + 3] * dt;
      p[o + 1] += p[o + 4] * dt;
      p[o + 2] += p[o + 5] * dt;
      const k = p[o + 6] / p[o + 7];
      this.positions[i * 3] = p[o];
      this.positions[i * 3 + 1] = p[o + 1];
      this.positions[i * 3 + 2] = p[o + 2];
      this.sizes[i] = p[o + 8] + (p[o + 9] - p[o + 8]) * k;
      this.colors[i * 4] = p[o + 10];
      this.colors[i * 4 + 1] = p[o + 11];
      this.colors[i * 4 + 2] = p[o + 12];
      this.colors[i * 4 + 3] = p[o + 13] * (k < 0.1 ? k * 10 : 1 - (k - 0.1) / 0.9);
      i++;
    }
    this.geometry.setDrawRange(0, this.count);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.pcolor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.psize as THREE.BufferAttribute).needsUpdate = true;
  }

  clear(): void {
    this.count = 0;
    this.geometry.setDrawRange(0, 0);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/** Sillage : un ruban d'écume qui suit l'historique des positions du navire. */
class Wake {
  private readonly history: { x: number; z: number; w: number }[] = [];
  private readonly segments = 52;
  private readonly geometry: THREE.BufferGeometry;
  readonly mesh: THREE.Mesh;
  private timer = 0;

  constructor(material: THREE.Material) {
    const n = (this.segments + 1) * 2;
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    this.geometry.setAttribute(
      "alpha",
      new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage),
    );
    const idx: number[] = [];
    for (let i = 0; i < this.segments; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geometry.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }

  update(
    x: number,
    z: number,
    h: number,
    beam: number,
    speed: number,
    length: number,
    time: number,
    dt: number,
    alive: boolean,
  ): void {
    this.timer += dt;
    const sx = x - Math.sin(h) * length * 0.48;
    const sz = z - Math.cos(h) * length * 0.48;
    if (this.timer > 0.17 || this.history.length === 0) {
      this.timer = 0;
      this.history.unshift({ x: sx, z: sz, w: alive ? Math.min(1, speed / 6) : 0 });
      if (this.history.length > this.segments + 1) this.history.pop();
    } else {
      this.history[0] = { x: sx, z: sz, w: alive ? Math.min(1, speed / 6) : 0 };
    }
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const uv = this.geometry.attributes.uv as THREE.BufferAttribute;
    const alpha = this.geometry.attributes.alpha as THREE.BufferAttribute;
    const n = this.history.length;
    for (let i = 0; i <= this.segments; i++) {
      const p = this.history[Math.min(i, n - 1)];
      const q = this.history[Math.min(i + 1, n - 1)];
      let dx = p.x - q.x;
      let dz = p.z - q.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const k = i / this.segments;
      const half = beam * (0.45 + k * 1.9);
      const y = waveHeight(p.x, p.z, time) + 0.4;
      pos.setXYZ(i * 2, p.x - dz * half, y, p.z + dx * half);
      pos.setXYZ(i * 2 + 1, p.x + dz * half, y, p.z - dx * half);
      uv.setXY(i * 2, 0, k * 6 - time * 0.3);
      uv.setXY(i * 2 + 1, 1, k * 6 - time * 0.3);
      const a = i >= n ? 0 : p.w * Math.pow(1 - k, 1.4);
      alpha.setX(i * 2, a);
      alpha.setX(i * 2 + 1, a);
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    alpha.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
  }
}

interface BombMarker {
  mesh: THREE.Mesh;
  until: number;
  start: number;
}

export interface Fx {
  group: THREE.Group;
  alpha: ParticlePool;
  additive: ParticlePool;
  setScale(scale: number): void;
  setBalls(balls: readonly { x: number; y: number; z: number; big: boolean }[]): void;
  wake(id: number): Wake;
  dropWake(id: number): void;
  bombMarker(x: number, z: number, radius: number, duration: number, now: number): void;
  setArc(
    visible: boolean,
    x: number,
    z: number,
    heading: number,
    halfAngle: number,
    radius: number,
    ready: boolean,
    inRange: boolean,
  ): void;
  update(dt: number, now: number): void;
  clear(): void;
  dispose(): void;
}

export function createFx(): Fx {
  const group = new THREE.Group();
  const alpha = new ParticlePool(2600, false);
  const additive = new ParticlePool(1400, true);
  group.add(alpha.points, additive.points);

  const ballGeo = new THREE.SphereGeometry(0.42, 10, 8);
  const ballMat = new THREE.MeshStandardMaterial({
    color: "#141416",
    metalness: 0.6,
    roughness: 0.4,
  });
  const balls = new THREE.InstancedMesh(ballGeo, ballMat, 320);
  balls.count = 0;
  balls.frustumCulled = false;
  group.add(balls);
  const m4 = new THREE.Matrix4();
  const one = new THREE.Vector3(1, 1, 1);
  const big = new THREE.Vector3(2.4, 2.4, 2.4);
  const quat = new THREE.Quaternion();
  const vec = new THREE.Vector3();

  // Sillage : dentelle d'écume posée sur l'eau (coordonnées monde), dense au centre.
  const wakeMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uLace: { value: foamLaceTexture() }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float alpha;
      varying float vAlpha;
      varying vec2 vUv;
      varying vec2 vWorldXZ;
      void main() {
        vAlpha = alpha;
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldXZ = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uLace;
      uniform float uTime;
      varying float vAlpha;
      varying vec2 vUv;
      varying vec2 vWorldXZ;
      void main() {
        float across = abs(vUv.x - 0.5) * 2.0;
        float edge = 1.0 - pow(across, 1.6);
        float l1 = texture2D(uLace, vWorldXZ / 5.5 + vec2(0.0, uTime * 0.03)).r;
        float l2 = texture2D(uLace, vWorldXZ / 14.0 - vec2(uTime * 0.012, 0.0)).r;
        float core = 1.0 - smoothstep(0.0, 0.55, across);
        float a = clamp(l1 * 1.1 + l2 * 0.6 + core * 0.55, 0.0, 1.0) * edge * min(1.0, vAlpha * 1.4);
        gl_FragColor = vec4(vec3(0.9, 0.95, 1.0), a);
      }
    `,
  });
  const wakes = new Map<number, Wake>();

  const markerGeo = new THREE.RingGeometry(0.82, 1, 48);
  markerGeo.rotateX(-Math.PI / 2);
  const markerFill = new THREE.CircleGeometry(1, 32);
  markerFill.rotateX(-Math.PI / 2);
  const markerMat = new THREE.MeshBasicMaterial({
    color: "#ff3b2f",
    transparent: true,
    opacity: 0.85,
    depthTest: false,
    depthWrite: false,
  });
  const markerFillMat = new THREE.MeshBasicMaterial({
    color: "#ff3b2f",
    transparent: true,
    opacity: 0.18,
    depthTest: false,
    depthWrite: false,
  });
  const markers: BombMarker[] = [];

  // Arc de tir de la batterie qui fera feu.
  const arcGeo = new THREE.CircleGeometry(1, 32, 0, 1);
  const arcMat = new THREE.MeshBasicMaterial({
    color: "#f3c25b",
    transparent: true,
    opacity: 0.12,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const arc = new THREE.Mesh(arcGeo, arcMat);
  arc.renderOrder = 2;
  arc.visible = false;
  group.add(arc);
  let arcKey = "";

  return {
    group,
    alpha,
    additive,
    setScale(scale) {
      alpha.material.uniforms.uScale.value = scale;
      additive.material.uniforms.uScale.value = scale;
    },
    setBalls(list) {
      const n = Math.min(list.length, 320);
      for (let i = 0; i < n; i++) {
        const b = list[i];
        m4.compose(vec.set(b.x, b.y, b.z), quat, b.big ? big : one);
        balls.setMatrixAt(i, m4);
      }
      balls.count = n;
      balls.instanceMatrix.needsUpdate = true;
    },
    wake(id) {
      let w = wakes.get(id);
      if (!w) {
        w = new Wake(wakeMaterial);
        wakes.set(id, w);
        group.add(w.mesh);
      }
      return w;
    },
    dropWake(id) {
      wakes.get(id)?.dispose();
      wakes.delete(id);
    },
    bombMarker(x, z, radius, duration, now) {
      const ring = new THREE.Mesh(markerGeo, markerMat);
      const fill = new THREE.Mesh(markerFill, markerFillMat);
      ring.add(fill);
      ring.position.set(x, 0.4, z);
      ring.scale.setScalar(radius);
      ring.renderOrder = 6;
      fill.renderOrder = 6;
      group.add(ring);
      markers.push({ mesh: ring, until: now + duration, start: now });
    },
    setArc(visible, x, z, heading, halfAngle, radius, ready, inRange) {
      arc.visible = visible;
      if (!visible) return;
      const key = `${halfAngle.toFixed(3)}`;
      if (key !== arcKey) {
        arcKey = key;
        arc.geometry.dispose();
        const g = new THREE.CircleGeometry(1, 32, -Math.PI / 2 - halfAngle, halfAngle * 2);
        g.rotateX(-Math.PI / 2);
        arc.geometry = g;
      }
      arc.position.set(x, 0.5, z);
      // Le secteur est centré sur +Z local après rotation : on l'oriente sur le cap de la batterie.
      arc.rotation.y = heading;
      arc.scale.setScalar(radius);
      arcMat.color.set(inRange ? (ready ? "#ffd36b" : "#c98b3a") : "#9fb3c8");
      arcMat.opacity = ready && inRange ? 0.18 : 0.08;
    },
    update(dt, now) {
      wakeMaterial.uniforms.uTime.value = now;
      alpha.update(dt);
      additive.update(dt);
      for (let i = markers.length - 1; i >= 0; i--) {
        const m = markers[i];
        if (now >= m.until) {
          m.mesh.removeFromParent();
          markers.splice(i, 1);
          continue;
        }
        // Le disque se remplit à mesure que la bombe approche.
        const k = (now - m.start) / (m.until - m.start);
        const fill = m.mesh.children[0];
        fill.scale.setScalar(Math.max(0.05, k));
        markerFillMat.opacity = 0.2 + 0.15 * Math.sin(now * 14);
      }
    },
    clear() {
      alpha.clear();
      additive.clear();
      balls.count = 0;
      for (const m of markers) m.mesh.removeFromParent();
      markers.length = 0;
      for (const id of [...wakes.keys()]) {
        wakes.get(id)?.dispose();
        wakes.delete(id);
      }
      arc.visible = false;
    },
    dispose() {
      this.clear();
      alpha.dispose();
      additive.dispose();
      ballGeo.dispose();
      ballMat.dispose();
      balls.dispose();
      wakeMaterial.dispose();
      markerGeo.dispose();
      markerFill.dispose();
      markerMat.dispose();
      markerFillMat.dispose();
      arc.geometry.dispose();
      arcMat.dispose();
      group.removeFromParent();
    },
  };
}

// ---------------------------------------------------------------------------
// Recettes d'effets

type Rnd = () => number;

export function muzzleFlash(fx: Fx, rnd: Rnd, x: number, y: number, z: number, dirH: number): void {
  const dx = Math.sin(dirH);
  const dz = Math.cos(dirH);
  fx.additive.spawn({
    x: x + dx * 1.2,
    y,
    z: z + dz * 1.2,
    life: 0.12,
    size0: 4.5,
    size1: 2,
    r: 1,
    g: 0.85,
    b: 0.5,
    a: 1,
  });
  for (let i = 0; i < 4; i++) {
    const s = 10 + rnd() * 14;
    fx.additive.spawn({
      x,
      y,
      z,
      vx: dx * s + (rnd() - 0.5) * 4,
      vy: rnd() * 3,
      vz: dz * s + (rnd() - 0.5) * 4,
      life: 0.25,
      size0: 0.6,
      size1: 0.2,
      r: 1,
      g: 0.7,
      b: 0.3,
      a: 1,
      drag: 3,
    });
  }
  for (let i = 0; i < 6; i++) {
    const s = 4 + rnd() * 7;
    const g = 0.78 + rnd() * 0.12;
    fx.alpha.spawn({
      x: x + dx * (1 + rnd()),
      y: y + rnd() * 0.5,
      z: z + dz * (1 + rnd()),
      vx: dx * s + (rnd() - 0.5) * 2,
      vy: 0.6 + rnd() * 1.4,
      vz: dz * s + (rnd() - 0.5) * 2,
      life: 1.8 + rnd() * 1.2,
      size0: 1.8,
      size1: 7 + rnd() * 4,
      r: g,
      g,
      b: g * 0.97,
      a: 0.5,
      drag: 1.4,
    });
  }
}

export function splash(fx: Fx, rnd: Rnd, x: number, z: number, big: boolean, time: number): void {
  const y = waveHeight(x, z, time);
  const n = big ? 26 : 12;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * (big ? 3 : 1.2);
    fx.alpha.spawn({
      x: x + Math.cos(a) * r,
      y,
      z: z + Math.sin(a) * r,
      vx: Math.cos(a) * (1 + rnd() * 2),
      vy: (big ? 9 : 6) + rnd() * (big ? 8 : 6),
      vz: Math.sin(a) * (1 + rnd() * 2),
      life: 1 + rnd() * 0.4,
      size0: big ? 1.6 : 1,
      size1: big ? 2.4 : 1.6,
      r: 0.92,
      g: 0.96,
      b: 1,
      a: 0.85,
      gravity: 16,
    });
  }
  for (let i = 0; i < (big ? 5 : 2); i++) {
    fx.alpha.spawn({
      x,
      y: y + 0.6,
      z,
      vy: 1.2,
      life: 1.4,
      size0: 2,
      size1: big ? 9 : 5,
      r: 0.9,
      g: 0.94,
      b: 0.98,
      a: 0.45,
      drag: 1,
    });
  }
}

const DEBRIS: Record<"coque" | "voiles" | "canons", [number, number, number]> = {
  coque: [0.42, 0.28, 0.16],
  voiles: [0.86, 0.8, 0.68],
  canons: [1, 0.75, 0.35],
};

export function impact(
  fx: Fx,
  rnd: Rnd,
  x: number,
  y: number,
  z: number,
  zone: "coque" | "voiles" | "canons",
): void {
  fx.additive.spawn({ x, y, z, life: 0.16, size0: 4, size1: 1.5, r: 1, g: 0.62, b: 0.25, a: 1 });
  const [r, g, b] = DEBRIS[zone];
  const n = zone === "voiles" ? 8 : 12;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const s = 3 + rnd() * 7;
    const spec = {
      x,
      y,
      z,
      vx: Math.cos(a) * s,
      vy: 3 + rnd() * 7,
      vz: Math.sin(a) * s,
      life: zone === "voiles" ? 2 : 1.2,
      size0: zone === "canons" ? 0.5 : 0.7,
      size1: zone === "canons" ? 0.1 : 0.5,
      r,
      g,
      b,
      a: 1,
      gravity: zone === "voiles" ? 3 : 16,
      drag: zone === "voiles" ? 1.5 : 0.3,
    };
    if (zone === "canons") fx.additive.spawn(spec);
    else fx.alpha.spawn(spec);
  }
  for (let i = 0; i < 3; i++) {
    fx.alpha.spawn({
      x,
      y,
      z,
      vx: (rnd() - 0.5) * 2,
      vy: 1.5 + rnd(),
      vz: (rnd() - 0.5) * 2,
      life: 1.6,
      size0: 1.5,
      size1: 6,
      r: 0.25,
      g: 0.23,
      b: 0.22,
      a: 0.55,
      drag: 1,
    });
  }
}

export function explosion(fx: Fx, rnd: Rnd, x: number, y: number, z: number, big: boolean): void {
  const k = big ? 1 : 0.6;
  for (let i = 0; i < (big ? 16 : 9); i++) {
    const a = rnd() * Math.PI * 2;
    const s = rnd() * 8 * k;
    fx.additive.spawn({
      x,
      y: y + rnd() * 2,
      z,
      vx: Math.cos(a) * s,
      vy: 2 + rnd() * 8 * k,
      vz: Math.sin(a) * s,
      life: 0.5 + rnd() * 0.4,
      size0: 5 * k + rnd() * 4,
      size1: 10 * k,
      r: 1,
      g: 0.5 + rnd() * 0.3,
      b: 0.15,
      a: 1,
      drag: 2,
    });
  }
  for (let i = 0; i < (big ? 24 : 10); i++) {
    const a = rnd() * Math.PI * 2;
    const s = 5 + rnd() * 12 * k;
    fx.alpha.spawn({
      x,
      y,
      z,
      vx: Math.cos(a) * s,
      vy: 6 + rnd() * 12 * k,
      vz: Math.sin(a) * s,
      life: 1.6,
      size0: 0.9,
      size1: 0.6,
      r: 0.3,
      g: 0.2,
      b: 0.12,
      a: 1,
      gravity: 16,
    });
  }
  for (let i = 0; i < (big ? 12 : 6); i++) {
    fx.alpha.spawn({
      x: x + (rnd() - 0.5) * 4,
      y: y + rnd() * 3,
      z: z + (rnd() - 0.5) * 4,
      vx: (rnd() - 0.5) * 3,
      vy: 2 + rnd() * 3,
      vz: (rnd() - 0.5) * 3,
      life: 3 + rnd() * 2,
      size0: 4 * k,
      size1: 16 * k,
      r: 0.14,
      g: 0.12,
      b: 0.11,
      a: 0.6,
      drag: 0.8,
    });
  }
}

export function flame(fx: Fx, rnd: Rnd, x: number, y: number, z: number, intensity: number): void {
  fx.additive.spawn({
    x: x + (rnd() - 0.5),
    y,
    z: z + (rnd() - 0.5),
    vx: (rnd() - 0.5) * 1.5,
    vy: 3 + rnd() * 3,
    vz: (rnd() - 0.5) * 1.5,
    life: 0.5 + rnd() * 0.4,
    size0: 1.5 + intensity * 2,
    size1: 0.4,
    r: 1,
    g: 0.45 + rnd() * 0.25,
    b: 0.1,
    a: 1,
  });
}

export function smoke(
  fx: Fx,
  rnd: Rnd,
  x: number,
  y: number,
  z: number,
  dark: number,
  size: number,
): void {
  const c = 0.55 - dark * 0.45;
  fx.alpha.spawn({
    x: x + (rnd() - 0.5),
    y,
    z: z + (rnd() - 0.5),
    vx: (rnd() - 0.5) * 1.2 + 0.8,
    vy: 2.5 + rnd() * 2,
    vz: (rnd() - 0.5) * 1.2,
    life: 2.5 + rnd(),
    size0: size * 0.6,
    size1: size * 2.6,
    r: c,
    g: c * 0.95,
    b: c * 0.9,
    a: 0.5,
    drag: 0.6,
  });
}

export function trail(fx: Fx, x: number, y: number, z: number): void {
  fx.alpha.spawn({ x, y, z, life: 0.45, size0: 0.5, size1: 1.4, r: 0.8, g: 0.8, b: 0.78, a: 0.3 });
}

export function spray(
  fx: Fx,
  rnd: Rnd,
  x: number,
  y: number,
  z: number,
  side: { x: number; z: number },
  speed: number,
): void {
  const s = 1.5 + rnd() * speed * 0.35;
  fx.alpha.spawn({
    x,
    y,
    z,
    vx: side.x * s + (rnd() - 0.5),
    vy: 1.5 + rnd() * 2,
    vz: side.z * s + (rnd() - 0.5),
    life: 0.7,
    size0: 0.8,
    size1: 2.2,
    r: 0.93,
    g: 0.97,
    b: 1,
    a: 0.55,
    gravity: 9,
  });
}
