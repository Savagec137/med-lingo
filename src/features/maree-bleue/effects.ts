/**
 * Effets : éclats (débris physiques), halos additifs, ondes de choc, fumée,
 * traces de brûlé et soldats projetés.
 */

import * as THREE from "three";
import { glowTexture, radialTexture } from "./textures";

export class Debris {
  readonly mesh: THREE.InstancedMesh;
  private readonly cap: number;
  private n = 0;
  private readonly p: Float32Array;
  private readonly v: Float32Array;
  private readonly life: Float32Array;
  private readonly max: Float32Array;
  private readonly size: Float32Array;
  private readonly rot: Float32Array;
  private readonly col: Float32Array;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly s = new THREE.Vector3();
  private readonly t = new THREE.Vector3();
  private readonly c = new THREE.Color();

  constructor(cap = 2600) {
    this.cap = cap;
    const geo = new THREE.IcosahedronGeometry(0.07, 0);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.1,
      flatShading: true,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    (this.mesh.instanceColor as THREE.InstancedBufferAttribute).setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.p = new Float32Array(cap * 3);
    this.v = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.max = new Float32Array(cap);
    this.size = new Float32Array(cap);
    this.rot = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 3);
  }

  spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    size: number,
    color: number,
  ) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.p[i * 3] = x;
    this.p[i * 3 + 1] = y;
    this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx;
    this.v[i * 3 + 1] = vy;
    this.v[i * 3 + 2] = vz;
    this.life[i] = life;
    this.max[i] = life;
    this.size[i] = size;
    this.rot[i * 3] = Math.random() * 6;
    this.rot[i * 3 + 1] = Math.random() * 6;
    this.rot[i * 3 + 2] = Math.random() * 6;
    this.c.setHex(color);
    this.col[i * 3] = this.c.r;
    this.col[i * 3 + 1] = this.c.g;
    this.col[i * 3 + 2] = this.c.b;
  }

  burst(
    x: number,
    y: number,
    z: number,
    n: number,
    speed: number,
    color: number,
    size = 1,
    up = 1,
  ) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.spawn(
        x,
        y,
        z,
        Math.cos(a) * s,
        (2 + Math.random() * 3) * up,
        Math.sin(a) * s,
        0.5 + Math.random() * 0.5,
        size * (0.7 + Math.random() * 0.6),
        color,
      );
    }
  }

  update(dt: number) {
    const { p, v, life, max, size, rot, col } = this;
    let i = 0;
    while (i < this.n) {
      life[i] -= dt;
      if (life[i] <= 0) {
        const last = --this.n;
        if (i !== last) {
          for (let k = 0; k < 3; k++) {
            p[i * 3 + k] = p[last * 3 + k];
            v[i * 3 + k] = v[last * 3 + k];
            rot[i * 3 + k] = rot[last * 3 + k];
            col[i * 3 + k] = col[last * 3 + k];
          }
          life[i] = life[last];
          max[i] = max[last];
          size[i] = size[last];
        }
        continue;
      }
      v[i * 3 + 1] -= 14 * dt;
      p[i * 3] += v[i * 3] * dt;
      p[i * 3 + 1] += v[i * 3 + 1] * dt;
      p[i * 3 + 2] += v[i * 3 + 2] * dt;
      if (p[i * 3 + 1] < 0.04) {
        p[i * 3 + 1] = 0.04;
        v[i * 3 + 1] *= -0.35;
        v[i * 3] *= 0.6;
        v[i * 3 + 2] *= 0.6;
      }
      rot[i * 3] += dt * 8;
      rot[i * 3 + 2] += dt * 6;
      i++;
    }
    const arr = this.mesh.instanceMatrix.array as Float32Array;
    const carr = (this.mesh.instanceColor as THREE.InstancedBufferAttribute).array as Float32Array;
    for (let j = 0; j < this.n; j++) {
      const k = Math.min(1, life[j] / (max[j] * 0.4)) * size[j];
      this.e.set(rot[j * 3], rot[j * 3 + 1], rot[j * 3 + 2]);
      this.q.setFromEuler(this.e);
      this.s.set(k, k, k);
      this.t.set(p[j * 3], p[j * 3 + 1], p[j * 3 + 2]);
      this.m.compose(this.t, this.q, this.s);
      this.m.toArray(arr, j * 16);
      carr[j * 3] = col[j * 3];
      carr[j * 3 + 1] = col[j * 3 + 1];
      carr[j * 3 + 2] = col[j * 3 + 2];
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    (this.mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  clear() {
    this.n = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}

/** Halos additifs orientés vers la caméra. */
export class Glows {
  readonly mesh: THREE.InstancedMesh;
  private readonly cap: number;
  private n = 0;
  private readonly p: Float32Array;
  private readonly vy: Float32Array;
  private readonly life: Float32Array;
  private readonly max: Float32Array;
  private readonly size: Float32Array;
  private readonly grow: Float32Array;
  private readonly col: Float32Array;
  private readonly tex: THREE.Texture;
  private readonly m = new THREE.Matrix4();
  private readonly s = new THREE.Vector3();
  private readonly t = new THREE.Vector3();
  private readonly c = new THREE.Color();

  constructor(cap = 600) {
    this.cap = cap;
    this.tex = glowTexture();
    const mat = new THREE.MeshBasicMaterial({
      map: this.tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.p = new Float32Array(cap * 3);
    this.vy = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.max = new Float32Array(cap);
    this.size = new Float32Array(cap);
    this.grow = new Float32Array(cap);
    this.col = new Float32Array(cap * 3);
  }

  spawn(
    x: number,
    y: number,
    z: number,
    size: number,
    color: number,
    life = 0.4,
    grow = 1.5,
    vy = 0,
  ) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.p[i * 3] = x;
    this.p[i * 3 + 1] = y;
    this.p[i * 3 + 2] = z;
    this.vy[i] = vy;
    this.life[i] = life;
    this.max[i] = life;
    this.size[i] = size;
    this.grow[i] = grow;
    this.c.setHex(color);
    this.col[i * 3] = this.c.r;
    this.col[i * 3 + 1] = this.c.g;
    this.col[i * 3 + 2] = this.c.b;
  }

  update(dt: number, camera: THREE.Camera) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const last = --this.n;
        if (i !== last) {
          for (let k = 0; k < 3; k++) {
            this.p[i * 3 + k] = this.p[last * 3 + k];
            this.col[i * 3 + k] = this.col[last * 3 + k];
          }
          this.vy[i] = this.vy[last];
          this.life[i] = this.life[last];
          this.max[i] = this.max[last];
          this.size[i] = this.size[last];
          this.grow[i] = this.grow[last];
        }
        continue;
      }
      this.p[i * 3 + 1] += this.vy[i] * dt;
      i++;
    }
    const arr = this.mesh.instanceMatrix.array as Float32Array;
    const carr = (this.mesh.instanceColor as THREE.InstancedBufferAttribute).array as Float32Array;
    for (let j = 0; j < this.n; j++) {
      const u = 1 - this.life[j] / this.max[j];
      const k = this.size[j] * (1 + u * this.grow[j]);
      const fade = 1 - u;
      this.s.set(k, k, k);
      this.t.set(this.p[j * 3], this.p[j * 3 + 1], this.p[j * 3 + 2]);
      this.m.compose(this.t, camera.quaternion, this.s);
      this.m.toArray(arr, j * 16);
      carr[j * 3] = this.col[j * 3] * fade;
      carr[j * 3 + 1] = this.col[j * 3 + 1] * fade;
      carr[j * 3 + 2] = this.col[j * 3 + 2] * fade;
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    (this.mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  clear() {
    this.n = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.tex.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}

/** Ondes de choc au sol. */
export class Rings {
  readonly group = new THREE.Group();
  private readonly items: { mesh: THREE.Mesh; life: number; max: number; size: number }[] = [];
  private readonly geo = new THREE.RingGeometry(0.8, 1, 48);

  spawn(x: number, z: number, size: number, color: number, life = 0.6) {
    let it = this.items.find((r) => r.life <= 0);
    if (!it) {
      if (this.items.length >= 16) return;
      const mesh = new THREE.Mesh(
        this.geo,
        new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      this.group.add(mesh);
      it = { mesh, life: 0, max: 1, size: 1 };
      this.items.push(it);
    }
    it.mesh.position.set(x, 0.06, z);
    (it.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    it.life = life;
    it.max = life;
    it.size = size;
    it.mesh.visible = true;
  }

  update(dt: number) {
    for (const it of this.items) {
      if (it.life <= 0) {
        it.mesh.visible = false;
        continue;
      }
      it.life -= dt;
      const u = 1 - Math.max(0, it.life) / it.max;
      const k = it.size * (0.2 + u);
      it.mesh.scale.set(k, k, k);
      (it.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.9;
    }
  }

  clear() {
    for (const it of this.items) {
      it.life = 0;
      it.mesh.visible = false;
    }
  }

  dispose() {
    this.geo.dispose();
    for (const it of this.items) (it.mesh.material as THREE.Material).dispose();
  }
}

/** Fumée : bouffées opaques qui montent, grossissent et se dissipent. */
export class Smoke {
  readonly mesh: THREE.InstancedMesh;
  private readonly cap: number;
  private n = 0;
  private readonly p: Float32Array;
  private readonly v: Float32Array;
  private readonly life: Float32Array;
  private readonly max: Float32Array;
  private readonly size: Float32Array;
  private readonly tone: Float32Array;
  private readonly fx: THREE.InstancedBufferAttribute;
  private readonly tex: THREE.Texture;
  private readonly m = new THREE.Matrix4();
  private readonly s = new THREE.Vector3();
  private readonly t = new THREE.Vector3();

  constructor(cap = 260) {
    this.cap = cap;
    this.tex = glowTexture();
    const geo = new THREE.PlaneGeometry(1, 1);
    this.fx = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    this.fx.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aFx", this.fx);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { map: { value: this.tex } },
      vertexShader: `
        attribute vec4 aFx;
        varying vec2 vUv;
        varying vec4 vFx;
        void main() {
          vUv = uv;
          vFx = aFx;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec2 vUv;
        varying vec4 vFx;
        void main() {
          float a = texture2D(map, vUv).a * vFx.a;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vFx.rgb, a);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.p = new Float32Array(cap * 3);
    this.v = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.max = new Float32Array(cap);
    this.size = new Float32Array(cap);
    this.tone = new Float32Array(cap);
  }

  /** `tone` : 0 = suie noire, 1 = vapeur blanche. */
  puff(x: number, y: number, z: number, size: number, tone = 0.5, life = 0.9, rise = 1.2) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.p[i * 3] = x;
    this.p[i * 3 + 1] = y;
    this.p[i * 3 + 2] = z;
    this.v[i * 3] = (Math.random() - 0.5) * 0.8;
    this.v[i * 3 + 1] = rise * (0.6 + Math.random() * 0.8);
    this.v[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    this.life[i] = life;
    this.max[i] = life;
    this.size[i] = size;
    this.tone[i] = tone;
  }

  update(dt: number, camera: THREE.Camera) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const last = --this.n;
        if (i !== last) {
          for (let k = 0; k < 3; k++) {
            this.p[i * 3 + k] = this.p[last * 3 + k];
            this.v[i * 3 + k] = this.v[last * 3 + k];
          }
          this.life[i] = this.life[last];
          this.max[i] = this.max[last];
          this.size[i] = this.size[last];
          this.tone[i] = this.tone[last];
        }
        continue;
      }
      for (let k = 0; k < 3; k++) this.p[i * 3 + k] += this.v[i * 3 + k] * dt;
      this.v[i * 3 + 1] *= 1 - dt * 0.8;
      i++;
    }
    const arr = this.mesh.instanceMatrix.array as Float32Array;
    const fx = this.fx.array as Float32Array;
    for (let j = 0; j < this.n; j++) {
      const u = 1 - this.life[j] / this.max[j];
      const k = this.size[j] * (0.5 + u * 1.3);
      this.s.set(k, k, k);
      this.t.set(this.p[j * 3], this.p[j * 3 + 1], this.p[j * 3 + 2]);
      this.m.compose(this.t, camera.quaternion, this.s);
      this.m.toArray(arr, j * 16);
      const g = 0.12 + this.tone[j] * 0.8;
      fx[j * 4] = g;
      fx[j * 4 + 1] = g * 0.98;
      fx[j * 4 + 2] = g * 0.95;
      fx[j * 4 + 3] = Math.min(1, u * 8) * (1 - u) * 0.75;
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.fx.needsUpdate = true;
  }

  clear() {
    this.n = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.tex.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}

/** Traces de brûlé laissées par les obus : elles s'estompent en quelques secondes. */
export class Scorches {
  readonly group = new THREE.Group();
  private readonly items: { mesh: THREE.Mesh; life: number }[] = [];
  private readonly geo = new THREE.CircleGeometry(1, 20);
  private readonly tex = radialTexture("rgba(20,12,8,0.85)");

  spawn(x: number, z: number, radius: number) {
    let it = this.items.find((s) => s.life <= 0);
    if (!it) {
      if (this.items.length >= 14) it = this.items.reduce((a, b) => (a.life < b.life ? a : b));
      else {
        const mesh = new THREE.Mesh(
          this.geo,
          new THREE.MeshBasicMaterial({
            map: this.tex,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = -2;
        this.group.add(mesh);
        it = { mesh, life: 0 };
        this.items.push(it);
      }
    }
    it.mesh.position.set(x, 0.02, z);
    it.mesh.scale.setScalar(radius);
    it.mesh.rotation.z = Math.random() * 6;
    it.life = 7;
    it.mesh.visible = true;
  }

  update(dt: number) {
    for (const it of this.items) {
      if (it.life <= 0) continue;
      it.life -= dt;
      (it.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, it.life / 3);
      if (it.life <= 0) it.mesh.visible = false;
    }
  }

  clear() {
    for (const it of this.items) {
      it.life = 0;
      it.mesh.visible = false;
    }
  }

  dispose() {
    this.geo.dispose();
    this.tex.dispose();
    for (const it of this.items) (it.mesh.material as THREE.Material).dispose();
  }
}

/** Soldats projetés en l'air quand ils tombent : ils culbutent puis disparaissent. */
export class Bodies {
  readonly mesh: THREE.InstancedMesh;
  private readonly cap: number;
  private n = 0;
  private readonly p: Float32Array;
  private readonly v: Float32Array;
  private readonly yaw: Float32Array;
  private readonly pitch: Float32Array;
  private readonly spin: Float32Array;
  private readonly life: Float32Array;
  private readonly scale: Float32Array;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly s = new THREE.Vector3();
  private readonly t = new THREE.Vector3();

  /** La géométrie et le matériau appartiennent à l'appelant (partagés avec la foule). */
  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, cap = 140) {
    this.cap = cap;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.p = new Float32Array(cap * 3);
    this.v = new Float32Array(cap * 3);
    this.yaw = new Float32Array(cap);
    this.pitch = new Float32Array(cap);
    this.spin = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.scale = new Float32Array(cap);
  }

  get full() {
    return this.n >= this.cap;
  }

  /** `away` : +1 projette vers le bas du terrain (z positif), -1 vers le haut. */
  toss(x: number, z: number, away: number, scale = 1) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.p[i * 3] = x;
    this.p[i * 3 + 1] = 0.1;
    this.p[i * 3 + 2] = z;
    this.v[i * 3] = (Math.random() - 0.5) * 4.5;
    this.v[i * 3 + 1] = 4.5 + Math.random() * 3.5;
    this.v[i * 3 + 2] = away * (1.5 + Math.random() * 3);
    this.yaw[i] = Math.random() * Math.PI * 2;
    this.pitch[i] = 0;
    this.spin[i] = (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 7);
    this.life[i] = 0.85;
    this.scale[i] = scale;
  }

  update(dt: number) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const last = --this.n;
        if (i !== last) {
          for (let k = 0; k < 3; k++) {
            this.p[i * 3 + k] = this.p[last * 3 + k];
            this.v[i * 3 + k] = this.v[last * 3 + k];
          }
          this.yaw[i] = this.yaw[last];
          this.pitch[i] = this.pitch[last];
          this.spin[i] = this.spin[last];
          this.life[i] = this.life[last];
          this.scale[i] = this.scale[last];
        }
        continue;
      }
      this.v[i * 3 + 1] -= 17 * dt;
      for (let k = 0; k < 3; k++) this.p[i * 3 + k] += this.v[i * 3 + k] * dt;
      if (this.p[i * 3 + 1] < 0.05) {
        this.p[i * 3 + 1] = 0.05;
        this.v[i * 3 + 1] *= -0.3;
        this.v[i * 3] *= 0.5;
        this.v[i * 3 + 2] *= 0.5;
      }
      this.pitch[i] += this.spin[i] * dt;
      i++;
    }
    const arr = this.mesh.instanceMatrix.array as Float32Array;
    for (let j = 0; j < this.n; j++) {
      const k = this.scale[j] * Math.min(1, this.life[j] / 0.25);
      this.e.set(this.pitch[j], this.yaw[j], 0);
      this.q.setFromEuler(this.e);
      this.s.set(k, k, k);
      this.t.set(this.p[j * 3], this.p[j * 3 + 1] + 0.3 * k, this.p[j * 3 + 2]);
      this.m.compose(this.t, this.q, this.s);
      this.m.toArray(arr, j * 16);
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    this.n = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.mesh.dispose();
  }
}
