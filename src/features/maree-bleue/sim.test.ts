import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIFFICULTIES,
  LEVELS,
  SURVIVAL,
  difficultyDef,
  helperCost,
  starsFor,
  withDifficulty,
  type Difficulty,
  type LevelDef,
} from "./levels.ts";
import { Sim } from "./sim.ts";
import { buildGiantGeometry, buildSoldierGeometry, triangleCount } from "./soldiers.ts";

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

interface PlayOptions {
  difficulty?: Difficulty;
  /** Le joueur construit mortiers et canons alliés dès qu'il peut. */
  build?: boolean;
  seed?: number;
  limit?: number;
}

function play(base: LevelDef, aim: (sim: Sim) => number, o: PlayOptions = {}) {
  const d = o.difficulty ?? "normal";
  const sim = new Sim(withDifficulty(base, d), o.seed ?? 7, {
    startGold: difficultyDef(d).startGold,
  });
  let peak = 0;
  let built = 0;
  while (sim.state === "playing" && sim.time < (o.limit ?? 300)) {
    sim.step(1 / 60, { targetX: aim(sim), firing: true });
    if (sim.championReady) sim.fireChampion();
    if (o.build && sim.build(built % 2 === 0 ? "mortier" : "baliste")) built++;
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

test("en normal, chaque niveau se gagne en jouant bien et en construisant ses défenses", () => {
  for (const level of LEVELS) {
    const { sim } = play(level, expert(), { build: true });
    assert.equal(sim.state, "won", `niveau ${level.id} : ${sim.state}, forteresse à ${sim.baseHp}`);
    assert.ok(sim.time < 300, `niveau ${level.id} trop long : ${sim.time.toFixed(0)} s`);
  }
});

test("même en difficile, le dernier niveau reste gagnable", () => {
  const { sim } = play(LEVELS[4], expert(), { build: true, difficulty: "difficile" });
  assert.equal(sim.state, "won", `forteresse à ${sim.baseHp}`);
});

test("la difficulté change la horde, le rempart et l'or de départ", () => {
  const [easy, normal, hard] = DIFFICULTIES.map((d) => withDifficulty(LEVELS[2], d.id));
  assert.ok(easy.enemy.horde < normal.enemy.horde && normal.enemy.horde < hard.enemy.horde);
  assert.ok(easy.enemy.rate < hard.enemy.rate);
  assert.ok(easy.playerHp > hard.playerHp);
  assert.ok(difficultyDef("facile").startGold > difficultyDef("difficile").startGold);
  // Le niveau 1 en difficile envoie des colosses, absents en normal.
  assert.equal(withDifficulty(LEVELS[0], "normal").enemy.bruteEvery, 0);
  assert.ok(withDifficulty(LEVELS[0], "difficile").enemy.bruteEvery > 0);
});

test("viser n'importe où ne suffit pas à partir du troisième niveau", () => {
  // Le couloir central du fjord passe par la porte ÷2 : rester au centre mène à la défaite.
  const { sim } = play(LEVELS[2], () => 0);
  assert.equal(sim.state, "lost");
});

test("les défenses aident : sans elles, le dernier niveau en difficile ne tombe pas", () => {
  const opts = { difficulty: "difficile" as const, limit: 150 };
  const without = play(LEVELS[4], expert(), { ...opts, build: false });
  const withHelpers = play(LEVELS[4], expert(), { ...opts, build: true });
  assert.equal(withHelpers.sim.state, "won");
  assert.ok(
    without.sim.baseHp > without.sim.level.baseHp / 2,
    `sans défenses : ${without.sim.baseHp}`,
  );
});

test("en normal, les défenses font tomber la dernière forteresse bien plus vite", () => {
  const without = play(LEVELS[4], expert(), { build: false });
  const withHelpers = play(LEVELS[4], expert(), { build: true });
  assert.ok(withHelpers.sim.time < without.sim.time * 0.7);
});

test("construire coûte de l'or, renchérit la suivante et fait riposter la forteresse", () => {
  const level: LevelDef = { ...LEVELS[0], enemy: { ...LEVELS[0].enemy, horde: 0 } };
  const sim = new Sim(level, 3, { startGold: 1000 });
  const redBefore = sim.red.n;
  assert.equal(sim.costOf("mortier"), helperCost("mortier", 0));
  assert.ok(sim.build("mortier"));
  assert.equal(sim.gold, 1000 - helperCost("mortier", 0));
  assert.ok(sim.red.n > redBefore, "une vague de pillards sort de la forteresse");
  assert.ok(sim.costOf("baliste") > helperCost("baliste", 0));
  // Quatre socles, pas un de plus.
  sim.gold = 1e6;
  assert.ok(sim.build("baliste") && sim.build("mortier") && sim.build("baliste"));
  assert.equal(sim.build("mortier"), false);
  assert.equal(sim.helpers.length, 4);
});

test("sans or, rien ne se construit", () => {
  const sim = new Sim(LEVELS[0], 3, { startGold: 0 });
  assert.equal(sim.canBuild("mortier"), false);
  assert.equal(sim.build("mortier"), false);
});

test("le mortier pilonne la horde", () => {
  const level: LevelDef = {
    ...LEVELS[0],
    enemy: { ...LEVELS[0].enemy, rate: 0, ramp: 0, horde: 0 },
  };
  const sim = new Sim(level, 5, { startGold: 1000 });
  sim.build("mortier");
  // Une grappe de pillards à mi-terrain, immobile pendant le test.
  sim.red.clear();
  for (let i = 0; i < 40; i++)
    sim.red.add((i % 8) * 0.25 - 1, -14 + Math.floor(i / 8) * 0.25, 0, 1, 0, 0, 1);
  const before = sim.red.n;
  for (let i = 0; i < 60 * 5; i++) {
    sim.step(1 / 60, { targetX: 0, firing: false });
    sim.drain();
  }
  assert.ok(sim.red.n < before - 10, `pillards restants : ${sim.red.n} / ${before}`);
  assert.ok(sim.gold > 1000 - helperCost("mortier", 0), "chaque pillard abattu rapporte de l'or");
});

test("les soldats du canon allié visent une porte multiplicatrice", () => {
  const level: LevelDef = {
    ...LEVELS[0],
    enemy: { ...LEVELS[0].enemy, rate: 0, ramp: 0, horde: 0 },
  };
  const sim = new Sim(level, 5, { startGold: 1000 });
  sim.build("baliste");
  for (let i = 0; i < 60 * 6; i++) {
    sim.step(1 / 60, { targetX: 0, firing: false });
    sim.drain();
  }
  const passed = sim.gates.reduce((n, g) => n + (g.def.op === "mul" ? g.passed : 0), 0);
  assert.ok(passed > 5, `passages de portes : ${passed}`);
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

// ---------------------------------------------------------------------------
// Mode Survie
// ---------------------------------------------------------------------------

test("survie : une horde de plusieurs milliers de pillards, massée dans l'entonnoir", () => {
  const sim = new Sim(withDifficulty(SURVIVAL, "normal"), 3);
  assert.ok(sim.survival, "le niveau est bien en mode survie");
  assert.ok(sim.hordeTotal >= 6000, `horde : ${sim.hordeTotal}`);
  assert.ok(sim.red.n >= 1500, `pillards visibles au départ : ${sim.red.n}`);
  assert.equal(sim.enemiesLeft, sim.hordeTotal);
  // Tous derrière le goulot, entre les parois de l'entonnoir.
  for (let i = 0; i < sim.red.n; i++) {
    assert.ok(sim.red.z[i] < sim.throatZ);
    assert.ok(Math.abs(sim.red.x[i]) <= sim.halfWAt(sim.red.z[i]));
  }
});

test("survie : on gagne en tenant jusqu'au dernier pillard, pas en prenant une forteresse", () => {
  const { sim } = play(SURVIVAL, expert());
  assert.equal(sim.state, "won");
  assert.equal(sim.enemiesLeft, 0);
  assert.ok(sim.kills >= sim.hordeTotal - 5, `abattus : ${sim.kills} / ${sim.hordeTotal}`);
  assert.ok(sim.time > 45 && sim.time < 240, `durée : ${sim.time.toFixed(0)} s`);
});

test("survie : sans viser les portes, la horde finit par submerger le rempart", () => {
  const { sim } = play(SURVIVAL, () => 0);
  assert.equal(sim.state, "lost");
  assert.ok(sim.time > 40, `le début laisse le temps de s'installer : ${sim.time.toFixed(0)} s`);
  assert.ok(sim.enemiesLeft > 1000);
});

test("survie : la pression monte avec le temps, par vagues", () => {
  const sim = new Sim(withDifficulty(SURVIVAL, "normal"), 3);
  const start = sim.hordeFlow;
  let surges = 0;
  for (let i = 0; i < 60 * 60; i++) {
    sim.step(1 / 60, { targetX: 0, firing: true });
    surges += sim.events.filter((e) => e.type === "surge").length;
    sim.drain();
    if (sim.state !== "playing") break;
  }
  assert.ok(sim.hordeFlow > start * 1.5, `débit : ${start} → ${sim.hordeFlow}`);
  assert.ok(surges >= 2, `vagues : ${surges}`);
});

test("survie : construire une défense fait grossir la horde", () => {
  const sim = new Sim(withDifficulty(SURVIVAL, "normal"), 3, { startGold: 1000 });
  const before = sim.hordeTotal;
  const flow = sim.hordeFlow;
  assert.ok(sim.build("mortier"));
  assert.ok(sim.hordeTotal > before);
  assert.ok(sim.hordeFlow > flow);
});

test("survie : la difficulté change la taille de la horde", () => {
  const [easy, normal, hard] = DIFFICULTIES.map((d) => withDifficulty(SURVIVAL, d.id).survival!);
  assert.ok(easy.total < normal.total && normal.total < hard.total);
  assert.ok(easy.flow[0] < hard.flow[0]);
});

// ---------------------------------------------------------------------------
// Budget des modèles
// ---------------------------------------------------------------------------

test("les modèles de soldats tiennent leur budget de triangles", () => {
  for (const team of ["blue", "red"] as const) {
    const high = triangleCount(buildSoldierGeometry(team, "high"));
    const mid = triangleCount(buildSoldierGeometry(team, "mid"));
    const low = triangleCount(buildSoldierGeometry(team, "low"));
    // Le modèle lointain sert à des milliers d'exemplaires : il doit rester minuscule.
    assert.ok(low <= 160, `${team} low : ${low}`);
    assert.ok(mid <= 700, `${team} mid : ${mid}`);
    assert.ok(high <= 2400, `${team} high : ${high}`);
    assert.ok(low < mid && mid < high);
    assert.ok(triangleCount(buildGiantGeometry(team)) <= 2800);
  }
});
