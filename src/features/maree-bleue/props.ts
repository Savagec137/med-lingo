/**
 * Accessoires de décor : arbres, haies, rochers, cactus, sapins, torches…
 * Chaque accessoire est une géométrie fusionnée à couleurs de sommets,
 * pensée pour être instanciée par dizaines.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { sharedTime } from "./models";

/** Bruit lisse peu coûteux (somme de sinus), stable selon la position. */
export function noise3(x: number, y: number, z: number) {
  return (
    Math.sin(x * 1.7 + y * 0.3 + Math.sin(z * 1.3)) * 0.5 +
    Math.sin(y * 2.3 + z * 1.1 + Math.sin(x * 0.7)) * 0.3 +
    Math.sin(z * 3.1 + x * 2.2) * 0.2
  );
}

export function displace(geo: THREE.BufferGeometry, amount: number, freq: number, seed = 0) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const len = v.length() || 1;
    const n = noise3(v.x * freq + seed, v.y * freq + seed * 0.7, v.z * freq - seed);
    v.multiplyScalar(1 + (n * amount) / len);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Couleur de sommets avec variation ; `grad` assombrit vers le bas. */
export function colorize(
  geo: THREE.BufferGeometry,
  color: number,
  jitter = 0.08,
  grad = 0,
  seed = 1,
) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.attributes.uv) g.deleteAttribute("uv");
  if (g.attributes.uv1) g.deleteAttribute("uv1");
  const n = g.attributes.position.count;
  const pos = g.attributes.position;
  g.computeBoundingBox();
  const bb = g.boundingBox as THREE.Box3;
  const h = bb.max.y - bb.min.y || 1;
  const base = new THREE.Color(color);
  const col = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nz = noise3(x * 4 + seed, y * 4, z * 4 - seed);
    const k = 1 + nz * jitter - grad * (1 - (y - bb.min.y) / h);
    c.copy(base).multiplyScalar(Math.max(0.2, k));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

export function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts, false);
  g.computeBoundingSphere();
  return g;
}

const vcMat = new Map<string, THREE.MeshStandardMaterial>();
export function vertexColorMaterial(rough = 0.85, flat = false, metal = 0) {
  const key = `${rough}-${flat}-${metal}`;
  let m = vcMat.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: rough,
      metalness: metal,
      flatShading: flat,
    });
    vcMat.set(key, m);
  }
  return m;
}

export function disposeSharedMaterials() {
  for (const m of vcMat.values()) m.dispose();
  vcMat.clear();
}

// ---------------------------------------------------------------------------

export function roundTreeGeometry(leaf = 0x3f9b3a, seed = 1) {
  const trunk = colorize(
    new THREE.CylinderGeometry(0.16, 0.26, 1.6, 8).translate(0, 0.8, 0),
    0x6b4226,
    0.1,
    0.3,
    seed,
  );
  const blobs: THREE.BufferGeometry[] = [trunk];
  const spots = [
    [0, 2.2, 0, 1.15],
    [0.6, 1.85, 0.2, 0.8],
    [-0.55, 1.9, -0.15, 0.82],
    [0.1, 2.0, -0.6, 0.75],
    [-0.1, 2.75, 0.1, 0.7],
  ];
  spots.forEach(([x, y, z, r], k) => {
    const g = displace(new THREE.IcosahedronGeometry(r, 2), 0.12, 2.4, seed + k);
    g.translate(x, y, z);
    blobs.push(colorize(g, leaf, 0.22, 0.35, seed + k));
  });
  return merge(blobs);
}

export function topiaryGeometry(seed = 2, cone = false) {
  const pot = colorize(
    new THREE.CylinderGeometry(0.42, 0.32, 0.55, 12).translate(0, 0.275, 0),
    0xc4693d,
    0.06,
    0.25,
    seed,
  );
  const rim = colorize(
    new THREE.TorusGeometry(0.42, 0.06, 6, 14).rotateX(Math.PI / 2).translate(0, 0.55, 0),
    0xd9824f,
    0.04,
    0,
    seed,
  );
  const stem = colorize(
    new THREE.CylinderGeometry(0.05, 0.06, 0.5, 6).translate(0, 0.8, 0),
    0x5a3a22,
    0.05,
    0,
    seed,
  );
  const leafGeo = cone
    ? displace(new THREE.ConeGeometry(0.55, 1.5, 12, 4), 0.05, 4, seed).translate(0, 1.7, 0)
    : displace(new THREE.IcosahedronGeometry(0.6, 2), 0.06, 4, seed).translate(0, 1.55, 0);
  const leaf = colorize(leafGeo, 0x2f8a35, 0.25, 0.3, seed);
  return merge([pot, rim, stem, leaf]);
}

/** Haie touffue : boîte arrondie, bosselée, plus sombre à la base, UV « monde » pour la texture de feuilles. */
export function hedgeGeometry(w: number, h: number, d: number, seed = 3) {
  const g = new RoundedBoxGeometry(w, h, d, 5, Math.min(0.22, h * 0.2, w * 0.2, d * 0.2));
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n =
      noise3(x * 2.7 + seed, y * 2.9, z * 2.7 - seed) * 0.6 +
      noise3(x * 7.1, y * 6.3 + seed, z * 7.4) * 0.4;
    const a = n * 0.09;
    pos.setXYZ(i, x + nor.getX(i) * a, y + nor.getY(i) * a, z + nor.getZ(i) * a);
  }
  g.computeVertexNormals();
  g.translate(0, h / 2, 0);
  const out = g.index ? g.toNonIndexed() : g;
  const p2 = out.attributes.position;
  const nrm = out.attributes.normal;
  const uv = new Float32Array(p2.count * 2);
  for (let i = 0; i < p2.count; i++) {
    const ny = Math.abs(nrm.getY(i));
    const nx = Math.abs(nrm.getX(i));
    const x = p2.getX(i);
    const y = p2.getY(i);
    const z = p2.getZ(i);
    if (ny > 0.7) {
      uv[i * 2] = x * 0.8;
      uv[i * 2 + 1] = z * 0.8;
    } else if (nx > 0.7) {
      uv[i * 2] = z * 0.8;
      uv[i * 2 + 1] = y * 0.8;
    } else {
      uv[i * 2] = x * 0.8;
      uv[i * 2 + 1] = y * 0.8;
    }
  }
  const colored = colorize(out, 0xffffff, 0.3, 0.5, seed);
  colored.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return colored;
}

export function flowerBedGeometry(w: number, d: number, seed = 4) {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(
    colorize(
      new RoundedBoxGeometry(w, 0.3, d, 2, 0.06).translate(0, 0.15, 0),
      0xe9e4d8,
      0.05,
      0.2,
      seed,
    ),
  );
  parts.push(
    colorize(
      new THREE.BoxGeometry(w - 0.16, 0.06, d - 0.16).translate(0, 0.3, 0),
      0x4b3222,
      0.1,
      0,
      seed,
    ),
  );
  const colors = [0xff5d8f, 0xffd23f, 0xffffff, 0xb16cff, 0xff7a3d];
  let s = seed * 97;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const n = Math.round(w * d * 14);
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * (w - 0.3);
    const z = (rnd() - 0.5) * (d - 0.3);
    parts.push(
      colorize(
        new THREE.IcosahedronGeometry(0.07 + rnd() * 0.04, 0).translate(x, 0.38 + rnd() * 0.08, z),
        colors[i % colors.length],
        0.1,
        0,
        i,
      ),
    );
    parts.push(
      colorize(
        new THREE.IcosahedronGeometry(0.09, 0).translate(x + 0.05, 0.32, z - 0.04),
        0x2f7a2c,
        0.1,
        0,
        i,
      ),
    );
  }
  return merge(parts);
}

export function lampGeometry() {
  const parts = [
    colorize(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 10).translate(0, 0.1, 0), 0x2b2f3a, 0.05),
    colorize(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 8).translate(0, 1.3, 0), 0x2b2f3a, 0.05),
    colorize(new THREE.ConeGeometry(0.26, 0.2, 6).translate(0, 2.75, 0), 0x2b2f3a, 0.05),
  ];
  return merge(parts);
}

export function lanternGlowGeometry() {
  return new THREE.OctahedronGeometry(0.17, 0).scale(1, 1.3, 1).translate(0, 2.52, 0);
}

export function rockGeometry(color: number, seed = 5, flat = true) {
  const g = displace(new THREE.DodecahedronGeometry(1, 1), 0.28, 1.6, seed);
  g.scale(1, 0.7, 1);
  g.translate(0, 0.35, 0);
  void flat;
  return colorize(g, color, 0.18, 0.35, seed);
}

export function cactusGeometry(seed = 6) {
  const green = 0x3f8f3f;
  const ribbed = (r: number, h: number) => {
    const g = new THREE.CylinderGeometry(r, r * 1.05, h, 10, 4);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const k = 1 + Math.cos(a * 5) * 0.08;
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
    }
    g.computeVertexNormals();
    return g;
  };
  const parts: THREE.BufferGeometry[] = [];
  parts.push(colorize(ribbed(0.28, 2.2).translate(0, 1.1, 0), green, 0.12, 0.25, seed));
  parts.push(
    colorize(
      new THREE.SphereGeometry(0.29, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.2, 0),
      green,
      0.1,
      0,
      seed,
    ),
  );
  for (const [side, y, h] of [
    [-1, 1.0, 0.8],
    [1, 1.35, 0.65],
  ] as const) {
    parts.push(
      colorize(
        ribbed(0.15, 0.5)
          .rotateZ(Math.PI / 2)
          .translate(side * 0.45, y, 0),
        green,
        0.12,
        0,
        seed + side,
      ),
    );
    parts.push(
      colorize(ribbed(0.15, h).translate(side * 0.68, y + h / 2, 0), green, 0.12, 0.2, seed + side),
    );
    parts.push(
      colorize(
        new THREE.SphereGeometry(0.155, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(
          side * 0.68,
          y + h,
          0,
        ),
        green,
        0.1,
        0,
        seed,
      ),
    );
  }
  // Fleur au sommet
  parts.push(
    colorize(
      new THREE.IcosahedronGeometry(0.1, 0).translate(0.05, 2.45, 0),
      0xff5d8f,
      0.1,
      0,
      seed,
    ),
  );
  return merge(parts);
}

export function palmGeometry(seed = 7) {
  const parts: THREE.BufferGeometry[] = [];
  let x = 0;
  let y = 0;
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const r = 0.2 - i * 0.015;
    const seg = new THREE.CylinderGeometry(r * 0.85, r, 0.5, 8).translate(0, 0.25, 0);
    seg.rotateZ(-0.06 * i);
    seg.translate(x, y, 0);
    parts.push(colorize(seg, i % 2 ? 0x8b6a43 : 0x9d7a50, 0.08, 0, seed + i));
    x += Math.sin(0.06 * i) * 0.5;
    y += Math.cos(0.06 * i) * 0.48;
  }
  const fronds = 7;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2;
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.08);
    shape.quadraticCurveTo(0.9, -0.32, 1.8, 0);
    shape.quadraticCurveTo(0.9, 0.32, 0, 0.08);
    const leaf = new THREE.ShapeGeometry(shape, 6);
    const pos = leaf.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      pos.setZ(i, -0.25 * lx * lx * 0.5);
    }
    leaf.rotateX(-Math.PI / 2);
    leaf.rotateZ(-0.35);
    leaf.rotateY(a);
    leaf.translate(x, y, 0);
    const back = leaf.clone();
    const idx = back.index;
    if (idx) {
      const arr = idx.array as Uint16Array | Uint32Array;
      for (let t = 0; t < arr.length; t += 3) {
        const tmp = arr[t];
        arr[t] = arr[t + 2];
        arr[t + 2] = tmp;
      }
    }
    back.computeVertexNormals();
    parts.push(colorize(leaf, 0x3d9a3a, 0.2, 0, seed + f));
    parts.push(colorize(back, 0x2f7d2e, 0.2, 0, seed + f));
  }
  parts.push(
    colorize(
      new THREE.IcosahedronGeometry(0.16, 0).translate(x + 0.1, y - 0.1, 0.1),
      0x6b4a22,
      0.1,
      0,
      seed,
    ),
  );
  return merge(parts);
}

export function mesaGeometry(seed = 8) {
  const layers = [0xc8743d, 0xdc9a5a, 0xb85f32, 0xe6b072, 0xc06a38];
  const parts: THREE.BufferGeometry[] = [];
  let y = 0;
  let r = 1;
  for (let i = 0; i < 5; i++) {
    const h = 0.6 + ((seed * 7 + i * 3) % 5) * 0.12;
    const g = displace(new THREE.CylinderGeometry(r * 0.95, r, h, 9, 2), 0.06, 2.5, seed + i);
    g.translate(0, y + h / 2, 0);
    parts.push(colorize(g, layers[i % layers.length], 0.12, 0, seed + i));
    y += h;
    r *= 0.9 - (i === 3 ? 0.05 : 0);
  }
  return merge(parts);
}

export function pineGeometry(snow: boolean, seed = 9) {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(
    colorize(
      new THREE.CylinderGeometry(0.1, 0.16, 0.8, 7).translate(0, 0.4, 0),
      0x5a3b24,
      0.1,
      0.2,
      seed,
    ),
  );
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const r = 1.05 - i * 0.2;
    const h = 1.0 - i * 0.1;
    const y = 0.6 + i * 0.62;
    const cone = new THREE.ConeGeometry(r, h, 9, 1);
    const pos = cone.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      if (pos.getY(k) < 0) {
        const x = pos.getX(k);
        const z = pos.getZ(k);
        const a = Math.atan2(z, x);
        const jag = 1 + Math.sin(a * 9 + i) * 0.08;
        pos.setX(k, x * jag);
        pos.setZ(k, z * jag);
        pos.setY(k, pos.getY(k) - 0.06 * Math.cos(a * 9));
      }
    }
    cone.computeVertexNormals();
    parts.push(colorize(cone.translate(0, y + h / 2, 0), 0x1f5e3a, 0.18, 0.35, seed + i));
    if (snow) {
      const cap = new THREE.ConeGeometry(r * 0.72, h * 0.45, 9, 1).translate(0, y + h * 0.78, 0);
      parts.push(colorize(cap, 0xf4f8ff, 0.04, 0, seed + i));
    }
  }
  return merge(parts);
}

export function crystalGeometry(seed = 10) {
  const parts: THREE.BufferGeometry[] = [];
  const shards = [
    [0, 0, 0, 0.35, 1.6, 0],
    [0.3, 0, 0.1, 0.22, 1.0, 0.4],
    [-0.28, 0, -0.05, 0.25, 1.2, -0.35],
    [0.05, 0, -0.3, 0.18, 0.8, 0.2],
  ];
  shards.forEach(([x, y, z, r, h, tilt], k) => {
    const g = new THREE.OctahedronGeometry(1, 0).scale(r, h, r);
    g.rotateZ(tilt);
    g.translate(x, y + h * 0.6, z);
    parts.push(colorize(g, 0x9fe3ff, 0.12, 0.2, seed + k));
  });
  return merge(parts);
}

export function snowMoundGeometry(seed = 11) {
  const g = displace(
    new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    0.08,
    2,
    seed,
  );
  g.scale(1.3, 0.45, 1);
  return colorize(g, 0xf6f9ff, 0.04, 0.1, seed);
}

export function deadTreeGeometry(seed = 12) {
  const parts: THREE.BufferGeometry[] = [];
  const bark = 0x3a2f2c;
  parts.push(
    colorize(
      new THREE.CylinderGeometry(0.1, 0.22, 2.2, 7).translate(0, 1.1, 0),
      bark,
      0.1,
      0.3,
      seed,
    ),
  );
  const branches = [
    [0.4, 1.6, 0.9, -0.9, 0],
    [-0.35, 1.9, 0.8, 0.9, 0.3],
    [0.15, 2.3, 0.7, -0.4, -0.6],
    [-0.1, 1.2, 0.6, 1.1, -0.2],
  ];
  for (const [x, y, len, rz, ry] of branches) {
    const g = new THREE.CylinderGeometry(0.03, 0.07, len, 5).translate(0, len / 2, 0);
    g.rotateZ(rz);
    g.rotateY(ry);
    g.translate(x * 0.2, y, 0);
    parts.push(colorize(g, bark, 0.1, 0, seed));
  }
  return merge(parts);
}

export function standingStoneGeometry(seed = 13) {
  const g = displace(new RoundedBoxGeometry(0.7, 1.6, 0.35, 2, 0.12), 0.05, 2.5, seed);
  g.translate(0, 0.75, 0);
  g.rotateZ(((seed % 5) - 2) * 0.04);
  return colorize(g, 0x6c7280, 0.16, 0.3, seed);
}

export function brokenPillarGeometry(color: number, seed = 14) {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(
    colorize(
      new RoundedBoxGeometry(0.9, 0.3, 0.9, 2, 0.05).translate(0, 0.15, 0),
      color,
      0.1,
      0.2,
      seed,
    ),
  );
  const h = 1.2 + (seed % 3) * 0.5;
  const col = new THREE.CylinderGeometry(0.3, 0.33, h, 12, 3);
  const pos = col.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > h / 2 - 0.01) pos.setY(i, pos.getY(i) - Math.max(0, pos.getX(i)) * 0.5);
  }
  col.computeVertexNormals();
  parts.push(colorize(col.translate(0, 0.3 + h / 2, 0), color, 0.12, 0.2, seed));
  return merge(parts);
}

export function balusterGeometry() {
  const profile = [
    [0, 0],
    [0.1, 0],
    [0.1, 0.06],
    [0.06, 0.12],
    [0.11, 0.3],
    [0.05, 0.48],
    [0.07, 0.52],
    [0.07, 0.56],
    [0, 0.56],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return colorize(new THREE.LatheGeometry(profile, 8), 0xf1eee6, 0.05, 0.15);
}

export function torchGeometry() {
  return merge([
    colorize(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6).translate(0, 0.7, 0), 0x3a2a1e, 0.1),
    colorize(new THREE.CylinderGeometry(0.2, 0.1, 0.22, 8).translate(0, 1.5, 0), 0x2c2c30, 0.05),
  ]);
}

// ---------------------------------------------------------------------------
// Matériaux animés : eau, lave, flammes
// ---------------------------------------------------------------------------

export function waterMaterial(deep: number, shallow: number, opacity = 0.9) {
  return new THREE.ShaderMaterial({
    transparent: opacity < 1,
    uniforms: {
      uTime: sharedTime,
      uDeep: { value: new THREE.Color(deep) },
      uShallow: { value: new THREE.Color(shallow) },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform float uOpacity;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz;
        float w = sin(p.x * 1.7 + uTime * 1.3) * 0.5 + sin(p.y * 2.3 - uTime * 1.1) * 0.5;
        float w2 = sin((p.x + p.y) * 3.1 + uTime * 2.0) * 0.5 + 0.5;
        vec3 col = mix(uDeep, uShallow, 0.35 + 0.25 * w);
        float spark = smoothstep(0.92, 1.0, w2 * (0.6 + 0.4 * sin(p.x * 5.0 - uTime)));
        col += vec3(0.85, 0.95, 1.0) * spark * 0.22;
        gl_FragColor = vec4(col, uOpacity);
        #include <colorspace_fragment>
      }`,
  });
}

export function lavaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: sharedTime },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vWorld;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      void main() {
        vec2 p = vWorld.xz * 0.6 + vec2(0.0, uTime * 0.25);
        float f = n(p) * 0.6 + n(p * 2.3 - uTime * 0.2) * 0.3 + n(p * 5.0) * 0.1;
        float crust = smoothstep(0.38, 0.62, f);
        vec3 hot = mix(vec3(1.0, 0.62, 0.15), vec3(0.95, 0.22, 0.03), f);
        vec3 col = mix(hot * 1.15, vec3(0.1, 0.045, 0.035), crust);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

export function flameMaterial(color = 0xffa040) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: sharedTime, uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      uniform float uTime;
      varying float vY;
      void main() {
        vec3 p = position;
        float seed = modelMatrix[3].x * 3.1 + modelMatrix[3].z * 1.7;
        #ifdef USE_INSTANCING
          seed = instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 1.7;
        #endif
        p.x += sin(uTime * 9.0 + p.y * 6.0 + seed) * 0.04 * p.y;
        p.y *= 1.0 + sin(uTime * 13.0 + seed) * 0.12;
        vY = position.y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        #ifdef USE_INSTANCING
          mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        #endif
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vY;
      void main() {
        float a = clamp(1.0 - vY / 0.55, 0.0, 1.0);
        gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.95, 0.6), a * 0.6) * a, a);
      }`,
  });
}
