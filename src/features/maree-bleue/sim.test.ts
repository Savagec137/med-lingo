import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, starsFor, type LevelDef } from "./levels.ts";
import { Sim } from "./sim.ts";

/**
 * Un joueur appliqué : il anticipe où seront les portes quand ses tirs les
 * atteindront, évite les marteaux et les geysers, et ne bouge pas son doigt
 * plus vite qu'un humain.
 */
function expert() {
  let cur = 0;
  return (sim: Sim) => {
    const lim = sim.halfW - 0.9;
    let best = cur;
    let bestScore = -1;
    for (let x = -lim; x <= lim + 1e-6; x += 0.25) {
      let m = 1;
      for (const g of sim.gates) {
        const tArr = (sim.cannonZ - 1 - g.def.z) / 5.7;
        const mv = g.def.move;
        const gx = mv
          ? g.def.x + Math.sin((sim.time + tArr) * mv.speed + (mv.phase ?? 0)) * mv.amp
          : g.def.x;
        if (Math.abs(x - gx) > g.def.w / 2 - 0.3) continue;
        m *= g.def.op === "mul" ? g.def.value : 1 / g.def.value;
      }
      for (const h of sim.hazards) {
        if (h.def.kind === "spinner" && Math.abs(x - h.def.x) < h.def.r) m *= 0.6;
        if (h.def.kind === "geyser" && Math.abs(x - h.def.x) < h.def.r) m *= 0.7;
      }
      const score = m - Math.abs(x - cur) * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = x;
      }
    }
    cur += Math.max(-0.25, Math.min(0.25, best - cur));
    return cur;
  };
}

function play(level: LevelDef, aim: (sim: Sim) => number, seed = 7, limit = 240) {
  const sim = new Sim(level, seed);
  let peak = 0;
  while (sim.state === "playing" && sim.time < limit) {
    sim.step(1 / 60, { targetX: aim(sim), firing: true });
    if (sim.championReady) sim.fireChampion();
    sim.drain();
    peak = Math.max(peak, sim.blue.n);
  }
  return { sim, peak };
}

test("les cinq niveaux existent, chacun avec son thème", () => {
  assert.equal(LEVELS.length, 5);
  assert.equal(new Set(LEVELS.map((l) => l.theme)).size, 5);
  LEVELS.forEach((l, i) => assert.equal(l.id, i + 1));
});

test("chaque niveau se gagne en jouant bien, en moins de quatre minutes", () => {
  for (const level of LEVELS) {
    const { sim } = play(level, expert());
    assert.equal(sim.state, "won", `niveau ${level.id} : ${sim.state}, forteresse à ${sim.baseHp}`);
    assert.ok(sim.time < 240, `niveau ${level.id} trop long : ${sim.time.toFixed(0)} s`);
  }
});

test("la difficulté monte : la forteresse résiste plus longtemps de niveau en niveau", () => {
  const times = LEVELS.map((l) => play(l, expert()).sim.time);
  assert.ok(
    times[4] > times[0],
    `niveau 5 (${times[4]}) devrait durer plus que le 1 (${times[0]})`,
  );
});

test("viser n'importe où ne suffit pas à partir du troisième niveau", () => {
  // Le couloir central du fjord passe par la porte ÷2 : rester au centre mène à la défaite.
  const { sim } = play(LEVELS[2], () => 0);
  assert.equal(sim.state, "lost");
});

test("les portes multiplient la foule : on dépasse des centaines de soldats", () => {
  const { peak } = play(LEVELS[2], expert());
  assert.ok(peak > 300, `foule max ${peak}`);
});

test("une porte ne multiplie qu'une fois le même soldat", () => {
  const level: LevelDef = {
    ...LEVELS[0],
    gates: [{ op: "mul", value: 3, x: 0, z: -5, w: 4 }],
    obstacles: [],
    enemy: { ...LEVELS[0].enemy, rate: 0, ramp: 0, horde: 0 },
  };
  const sim = new Sim(level, 1);
  sim.blue.add(0, -4.9, 0, 1, 5, 0, -1);
  for (let i = 0; i < 30; i++) sim.step(1 / 60, { targetX: 0, firing: false });
  assert.equal(sim.blue.n, 3);
  assert.equal(sim.gates[0].passed, 1);
});

test("les étoiles dépendent du rempart restant", () => {
  assert.equal(starsFor(12, 12), 3);
  assert.equal(starsFor(6, 12), 2);
  assert.equal(starsFor(2, 12), 1);
});
