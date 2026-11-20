import assert from "node:assert/strict";
import test from "node:test";

import { runBattle, autopilotControls } from "./autopilot.ts";
import {
  applyDamage,
  batteryFacing,
  crewFactor,
  gunsAvailable,
  hitZone,
  ignite,
  reloadTime,
  sailFactor,
} from "./combat.ts";
import { AMMO, SHIP_CLASSES, type AmmoId, type Zone } from "./defs.ts";
import { bearingTo, forwardOf, headingTo, starboardOf, wrapAngle } from "./math.ts";
import {
  MISSIONS,
  getMission,
  missionEnemyCount,
  objectiveLabel,
  type MissionDef,
} from "./missions.ts";
import {
  applyBattle,
  buyUpgrade,
  computeRewards,
  isMissionUnlocked,
  newSave,
  parseSave,
  serializeSave,
} from "./save.ts";
import type { Ship, World } from "./types.ts";
import { UPGRADES, buildLoadout, emptyUpgradeLevels, nextCost } from "./upgrades.ts";
import {
  addEnemy,
  battleReport,
  createBattle,
  objectiveProgress,
  playerFire,
  playerRepair,
  selectTarget,
  setPlayerAmmo,
  stepWorld,
} from "./world.ts";

const DT = 1 / 60;
const CALM = { rudder: 0, throttle: 0 };

/** Mission vide : l'unique vague n'arrive jamais, la bataille ne se termine pas seule. */
const SANDBOX: MissionDef = {
  id: "bac-a-sable",
  name: "Bac à sable",
  brief: "",
  objective: { type: "couler-tout" },
  waves: [{ ships: [{ cls: "cotre" }], trigger: { type: "time", t: 1e9 }, spawn: "devant" }],
  difficulty: 1,
  reward: { gold: 0, gems: 0 },
  replayGold: 0,
};

function sandbox(seed = 1, levels = emptyUpgradeLevels()): World {
  return createBattle(SANDBOX, buildLoadout(levels), seed);
}

function player(world: World): Ship {
  return world.ships.find((s) => s.id === world.playerId)!;
}

function run(world: World, seconds: number, controls = CALM, each?: (w: World) => void): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    each?.(world);
    stepWorld(world, DT, controls);
    world.events.length = 0;
  }
}

/** Fige un navire ennemi (ni IA ni déplacement) pour des tirs de référence. */
function freeze(s: Ship): Ship {
  s.ai = null;
  s.throttle = 0;
  s.speed = 0;
  return s;
}

// ---------------------------------------------------------------------------
// Repère et batteries

test("le repère place tribord à droite de la proue et les relèvements tribord sont positifs", () => {
  const f = forwardOf(0);
  const r = starboardOf(0);
  assert.deepEqual([Math.round(f.x), Math.round(f.z)], [0, 1]);
  assert.deepEqual([Math.round(r.x), Math.round(r.z)], [-1, 0]);
  assert.ok(bearingTo(0, 0, 0, -10, 0) > 0, "un point à tribord a un relèvement positif");
  assert.ok(bearingTo(0, 0, 0, 10, 0) < 0, "un point à bâbord a un relèvement négatif");
  assert.equal(Math.round(headingTo(0, 0, 0, 10) * 100), 0);
  assert.ok(Math.abs(wrapAngle(3 * Math.PI) - Math.PI) < 1e-9);
});

test("TIRER choisit la batterie qui fait face à la cible", () => {
  const w = sandbox();
  const p = player(w);
  assert.equal(batteryFacing(p, p.x - 50, p.z), "tribord");
  assert.equal(batteryFacing(p, p.x + 50, p.z), "babord");
  assert.equal(batteryFacing(p, p.x, p.z + 80), "proue");
  assert.equal(batteryFacing(p, p.x, p.z - 80), "poupe");
});

test("la barre à tribord fait virer le navire vers tribord", () => {
  const w = sandbox();
  const p = player(w);
  p.speed = 8;
  run(w, 3, { rudder: 1, throttle: 1 });
  assert.ok(p.x < -2, `le galion a dérivé vers tribord (x=${p.x.toFixed(1)})`);
  assert.ok(p.h < -0.3, "le cap a tourné vers tribord");
});

// ---------------------------------------------------------------------------
// Dégâts localisés

test("la hauteur d'impact détermine la zone touchée", () => {
  const c = SHIP_CLASSES.brick;
  assert.equal(hitZone(c, 0, 0, 1, 0.4), "coque");
  assert.equal(hitZone(c, 0, 0, c.deckHeight + 1.2, 0.4), "canons");
  assert.equal(hitZone(c, 0, 0, c.deckHeight + 8, 0.4), "voiles");
  assert.equal(hitZone(c, c.beam * 3, 0, 1, 0.4), null);
  assert.equal(hitZone(c, 0, 0, c.mastHeight + 3, 0.4), null);
});

/** Tire 12 bordées d'une munition sur un brick immobile par le travers. */
function zoneDamageWith(ammo: AmmoId): Record<Zone, number> {
  const w = sandbox(7);
  const p = player(w);
  const target = freeze(addEnemy(w, "brick", p.x - 40, p.z, 0));
  target.hull = target.hullMax = 1e6;
  target.sails = target.sailsMax = 1e6;
  target.cannons = target.cannonsMax = 1e6;
  target.guns = { babord: 0, tribord: 0, proue: 0, poupe: 0 };
  p.fireStock = 99;
  selectTarget(w, target.id);
  setPlayerAmmo(w, ammo);
  for (let i = 0; i < 12; i++) {
    p.reload.tribord = 0;
    assert.equal(playerFire(w).ok, true);
    run(w, 3);
  }
  return { coque: 1e6 - target.hull, voiles: 1e6 - target.sails, canons: 1e6 - target.cannons };
}

test("chaque munition frappe sa zone de prédilection", () => {
  const boulet = zoneDamageWith("boulet");
  const chaine = zoneDamageWith("chaine");
  const mitraille = zoneDamageWith("mitraille");
  assert.ok(
    boulet.coque > boulet.voiles && boulet.coque > boulet.canons,
    `boulet → coque ${JSON.stringify(boulet)}`,
  );
  assert.ok(chaine.voiles > chaine.coque * 3, `boulet ramé → voiles ${JSON.stringify(chaine)}`);
  assert.ok(
    mitraille.canons > mitraille.coque * 2,
    `mitraille → canons ${JSON.stringify(mitraille)}`,
  );
});

test("des voiles déchirées ralentissent le navire et le font moins bien virer", () => {
  const fast = sandbox();
  const slow = sandbox();
  player(slow).sails = 0;
  run(fast, 12, { rudder: 0, throttle: 1 });
  run(slow, 12, { rudder: 0, throttle: 1 });
  assert.ok(
    player(fast).speed > player(slow).speed * 2,
    "vitesse divisée par plus de deux voiles à zéro",
  );
  assert.ok(sailFactor(player(slow)) < 0.4);
});

test("des canons détruits réduisent la bordée et allongent le rechargement", () => {
  const w = sandbox();
  const p = player(w);
  const before = { guns: gunsAvailable(p, "tribord"), reload: reloadTime(p, "tribord", "boulet") };
  applyDamage(w, p, "canons", p.cannonsMax, null);
  assert.equal(crewFactor(p), 0);
  assert.ok(gunsAvailable(p, "tribord") < before.guns);
  assert.ok(gunsAvailable(p, "tribord") >= 1, "il reste toujours une pièce servie");
  assert.ok(reloadTime(p, "tribord", "boulet") > before.reload * 2);
});

test("une zone détruite reporte une partie des coups sur la coque", () => {
  const w = sandbox();
  const p = player(w);
  p.sails = 0;
  const hull = p.hull;
  applyDamage(w, p, "voiles", 10, null);
  assert.equal(Math.round(hull - p.hull), 4);
});

// ---------------------------------------------------------------------------
// Incendie et réparation

test("un incendie ronge le navire et l'équipage finit par l'éteindre", () => {
  const w = sandbox();
  const p = player(w);
  ignite(w, p, 0.4);
  const hull = p.hull;
  run(w, 3);
  assert.ok(p.hull < hull, "le feu abîme la coque");
  run(w, 25);
  assert.equal(p.fire, 0, "un petit feu finit par s'éteindre");
});

test("un brasier sur un pont dévasté s'étend au lieu de s'éteindre", () => {
  const w = sandbox();
  const p = player(w);
  p.cannons = 0;
  ignite(w, p, 1);
  p.fire = 0.8;
  run(w, 2);
  assert.ok(p.fire > 0.8, `le feu progresse (${p.fire.toFixed(2)})`);
});

test("la réparation éteint le feu, consomme une trousse et immobilise les canons", () => {
  const w = sandbox();
  const p = player(w);
  p.hull = 40;
  p.sails = 20;
  ignite(w, p, 0.6);
  p.reload.tribord = 2;
  const kits = p.repairKits;
  assert.equal(playerRepair(w).ok, true);
  assert.equal(p.fire, 0);
  assert.equal(p.repairKits, kits - 1);
  assert.equal(playerFire(w).ok, false, "on ne tire pas pendant la réparation");
  run(w, 2);
  assert.equal(p.reload.tribord, 2, "le rechargement est suspendu pendant la réparation");
  run(w, 2.5);
  assert.ok(p.hull > 40 + p.hullMax * 0.3, `coque réparée (${p.hull.toFixed(1)})`);
  assert.ok(p.reload.tribord < 2, "le rechargement reprend après la réparation");
  assert.equal(playerRepair(w).ok, false, "les charpentiers ont besoin d'une pause");
});

test("on ne gaspille pas une trousse sur un navire intact", () => {
  const w = sandbox();
  const p = player(w);
  const kits = p.repairKits;
  assert.equal(playerRepair(w).ok, false);
  assert.equal(p.repairKits, kits);
});

// ---------------------------------------------------------------------------
// Tirs et naufrages

test("une bordée part pièce par pièce, touche une cible au travers et recharge", () => {
  const w = sandbox(3);
  const p = player(w);
  const target = freeze(addEnemy(w, "brick", p.x - 45, p.z, 0));
  target.guns = { babord: 0, tribord: 0, proue: 0, poupe: 0 };
  selectTarget(w, target.id);
  const fire = playerFire(w);
  assert.deepEqual(fire, { ok: true, batteries: ["tribord"] });
  assert.ok(w.pending.length === 6, "six pièces au tribord");
  assert.equal(playerFire(w).ok, false, "la batterie recharge");
  run(w, 2.5);
  assert.ok(target.hull < target.hullMax, "la bordée a touché");
  assert.ok(p.stats.hits > 0 && p.stats.hits <= p.stats.shots);
});

test("le butin ne revient au joueur que s'il porte le coup fatal", () => {
  const w = sandbox();
  const a = freeze(addEnemy(w, "cotre", 0, 200, 0));
  const b = freeze(addEnemy(w, "cotre", 50, 200, 0));
  applyDamage(w, a, "coque", 999, w.playerId);
  applyDamage(w, b, "coque", 999, null);
  assert.equal(a.state, "sinking");
  assert.equal(w.kills, 2);
  assert.equal(w.loot, SHIP_CLASSES.cotre.bounty);
  run(w, 6.5);
  assert.equal(a.state, "sunk");
});

test("sans cible, TIRER lâche les deux bordées latérales prêtes", () => {
  const w = sandbox();
  const res = playerFire(w);
  assert.deepEqual(res, { ok: true, batteries: ["babord", "tribord"] });
});

test("les boulets incendiaires sont rationnés", () => {
  const w = sandbox();
  const p = player(w);
  p.fireStock = 1;
  assert.equal(setPlayerAmmo(w, "feu"), true);
  playerFire(w);
  assert.equal(p.fireStock, 0);
  assert.equal(p.ammo, "boulet", "retour au boulet rond quand la soute est vide");
  assert.equal(setPlayerAmmo(w, "feu"), false);
});

// ---------------------------------------------------------------------------
// Comportements ennemis

function duel(
  cls: "brick" | "cotre" | "fregate" | "galiote" | "brulot",
  seconds: number,
  seed = 5,
) {
  const w = sandbox(seed);
  const p = player(w);
  p.hull = p.hullMax = 1e6;
  const e = addEnemy(w, cls, 0, 130, Math.PI);
  const samples: { d: number; bearing: number; mode: string }[] = [];
  let t = 0;
  run(w, seconds, { rudder: 0, throttle: 0.5 }, () => {
    t += DT;
    if (t > 15 && e.state === "afloat") {
      samples.push({
        d: Math.hypot(e.x - p.x, e.z - p.z),
        bearing: Math.abs(bearingTo(e.x, e.z, e.h, p.x, p.z)),
        mode: e.ai!.mode,
      });
    }
  });
  const avg = (f: (s: (typeof samples)[number]) => number) =>
    samples.reduce((a, s) => a + f(s), 0) / samples.length;
  return { w, p, e, samples, avgDist: avg((s) => s.d), avgBearing: avg((s) => s.bearing) };
}

test("le brick se bat bord à bord : il présente son flanc à distance moyenne", () => {
  const r = duel("brick", 60);
  assert.ok(
    r.avgBearing > 1.1 && r.avgBearing < 2.1,
    `relèvement moyen ${r.avgBearing.toFixed(2)} rad`,
  );
  assert.ok(r.avgDist > 30 && r.avgDist < 75, `distance moyenne ${r.avgDist.toFixed(0)}`);
  assert.ok(r.p.stats.damageTaken > 0, "il tire");
  assert.ok(
    r.samples.some((s) => s.mode === "virement") || r.e.stats.shots > 20,
    "il change d'amure ou tire sans relâche",
  );
});

test("la frégate tient la distance plus loin que le brick", () => {
  const brick = duel("brick", 60);
  const fregate = duel("fregate", 60);
  assert.ok(
    fregate.avgDist > brick.avgDist + 10,
    `frégate ${fregate.avgDist.toFixed(0)} vs brick ${brick.avgDist.toFixed(0)}`,
  );
});

test("la frégate brise d'abord la voilure d'une cible plus rapide", () => {
  const w = sandbox(9);
  const p = player(w);
  p.hull = p.hullMax = 1e6;
  const e = addEnemy(w, "fregate", 0, 70, Math.PI / 2);
  const used = new Set<string>();
  run(w, 40, { rudder: 0.3, throttle: 1 }, () => used.add(e.ammo));
  assert.ok(used.has("chaine"), `munitions utilisées : ${[...used].join(", ")}`);
  assert.ok(p.sails < p.sailsMax * 0.9, "la voilure du joueur a souffert");
});

test("la frégate se répare une seule fois quand sa coque faiblit", () => {
  const w = sandbox();
  const e = addEnemy(w, "fregate", 0, 80, Math.PI);
  e.hull = e.hullMax * 0.3;
  run(w, 1);
  assert.ok(e.repairT > 0 || e.ai!.repaired, "réparation lancée");
  run(w, 6);
  assert.ok(e.hull > e.hullMax * 0.3);
  e.hull = e.hullMax * 0.2;
  run(w, 2);
  assert.equal(e.repairKits, 0);
  assert.equal(e.repairT, 0, "pas de seconde réparation");
});

test("le cotre blessé prend la fuite puis revient", () => {
  const w = sandbox();
  const p = player(w);
  p.hull = p.hullMax = 1e6;
  const e = addEnemy(w, "cotre", 0, 50, Math.PI);
  e.hull = e.hullMax * 0.3;
  run(w, 1);
  assert.equal(e.ai!.mode, "fuite");
  const d0 = Math.hypot(e.x - p.x, e.z - p.z);
  run(w, 5);
  const d1 = Math.hypot(e.x - p.x, e.z - p.z);
  assert.ok(d1 > d0 + 20, `il s'éloigne (${d0.toFixed(0)} → ${d1.toFixed(0)})`);
  run(w, 4);
  assert.notEqual(e.ai!.mode, "fuite", "il revient au combat");
});

test("le brûlot fonce, explose au contact et met le feu sans rapporter de butin", () => {
  const w = sandbox();
  const p = player(w);
  const e = addEnemy(w, "brulot", 0, 90, Math.PI);
  const hull = p.hull;
  run(w, 20);
  assert.notEqual(e.state, "afloat", "le brûlot s'est sacrifié");
  assert.ok(p.hull < hull - 20, `coque touchée (${hull} → ${p.hull.toFixed(0)})`);
  assert.ok(p.fire > 0 || p.stats.damageTaken > 30, "le joueur a pris feu");
  assert.equal(w.loot, 0);
  assert.equal(w.kills, 1);
});

test("le brûlot zigzague quand une bordée chargée le vise", () => {
  const w = sandbox();
  const p = player(w);
  // Le brûlot arrive par le travers tribord, batterie chargée.
  const e = addEnemy(w, "brulot", -70, 0, Math.PI / 2);
  const headings: number[] = [];
  run(w, 2, CALM, () => headings.push(e.h));
  const swing = Math.max(...headings) - Math.min(...headings);
  assert.ok(swing > 0.15, `le cap oscille (${swing.toFixed(2)} rad)`);
});

test("la galiote reste à distance et lobe des bombes signalées à l'avance", () => {
  const w = sandbox();
  const p = player(w);
  p.hull = p.hullMax = 1e6;
  const e = addEnemy(w, "galiote", 0, 110, Math.PI);
  let launches = 0;
  let minDist = Infinity;
  for (let i = 0; i < 40 * 60; i++) {
    stepWorld(w, DT, { rudder: 0, throttle: 0.3 });
    for (const ev of w.events) if (ev.type === "bombe-lancee") launches++;
    w.events.length = 0;
    minDist = Math.min(minDist, Math.hypot(e.x - p.x, e.z - p.z));
  }
  assert.ok(launches >= 3, `bombes lancées : ${launches}`);
  assert.ok(minDist > 45, `distance minimale ${minDist.toFixed(0)}`);
  assert.ok(p.stats.damageTaken > 0, "une cible lente se fait toucher");
});

test("esquiver les bombes réduit nettement les dégâts subis", () => {
  const taken = (dodges: boolean) => {
    let total = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const w = sandbox(seed);
      const p = player(w);
      p.hull = p.hullMax = 1e6;
      const e = addEnemy(w, "galiote", 0, 110, Math.PI);
      e.guns = { babord: 0, tribord: 0, proue: 0, poupe: 0 };
      selectTarget(w, e.id);
      for (let i = 0; i < 45 * 60; i++) {
        stepWorld(w, DT, autopilotControls(w, { fires: false, dodges, standoff: 1.3 }));
        w.events.length = 0;
      }
      total += p.stats.damageTaken;
    }
    return total;
  };
  const still = taken(false);
  const dodging = taken(true);
  assert.ok(
    dodging < still * 0.75,
    `esquive ${dodging.toFixed(0)} vs sans esquive ${still.toFixed(0)}`,
  );
});

test("l'IA contourne les îles au lieu de s'échouer", () => {
  const w = sandbox();
  const p = player(w);
  p.x = -175;
  p.z = 420;
  // Le brick part au sud du fort du cap et doit le contourner pour rejoindre le joueur.
  const e = addEnemy(w, "brick", -175, 180, 0);
  let grounded = 0;
  run(w, 30, CALM, () => {
    if (e.groundedFor > 0) grounded += DT;
  });
  assert.ok(grounded < 0.5, `temps échoué ${grounded.toFixed(2)} s`);
});

// ---------------------------------------------------------------------------
// Missions de bout en bout (pilote automatique)

test("les vagues arrivent quand la précédente est presque coulée", () => {
  const w = createBattle(getMission("coulez-cinq"), buildLoadout(emptyUpgradeLevels()), 2);
  assert.equal(w.ships.filter((s) => s.team === "pirates").length, 2);
  for (const s of w.ships.filter((s) => s.team === "pirates"))
    applyDamage(w, s, "coque", 999, w.playerId);
  run(w, DT);
  assert.equal(w.ships.filter((s) => s.team === "pirates").length, 4, "la deuxième vague est là");
  assert.deepEqual(objectiveProgress(w), { done: 2, total: 5 });
  assert.equal(objectiveLabel(getMission("coulez-cinq")), "Coulez 5 pirates");
});

test("une mission d'élite se gagne en coulant le capitaine nommé, escorte comprise ou non", () => {
  const w = createBattle(getMission("le-borgne"), buildLoadout(emptyUpgradeLevels()), 4);
  const borgne = w.ships.find((s) => s.name === "Le Borgne")!;
  assert.ok(borgne.elite && borgne.hullMax > SHIP_CLASSES.brick.hull);
  applyDamage(w, borgne, "coque", 1e6, w.playerId);
  run(w, 3);
  assert.equal(w.outcome, "victoire");
  assert.equal(battleReport(w).loot, Math.round(SHIP_CLASSES.brick.bounty * 2.5));
});

test("le pilote automatique gagne les deux premières missions sans amélioration", () => {
  for (const id of ["premiers-boulets", "coulez-cinq"]) {
    let wins = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const w = runBattle(
        createBattle(getMission(id), buildLoadout(emptyUpgradeLevels()), seed * 7919),
      );
      if (w.outcome === "victoire") wins++;
      assert.notEqual(w.outcome, "en-cours", "la bataille se termine");
    }
    assert.ok(wins >= 4, `${id} : ${wins}/6 victoires`);
  }
});

test("la dernière mission est perdue sans amélioration et gagnable avec l'arsenal", () => {
  const mission = getMission("tempete-de-fer");
  const play = (level: number) => {
    const levels = emptyUpgradeLevels();
    for (const u of UPGRADES) levels[u.id] = Math.min(level, u.costs.length);
    let wins = 0;
    for (let seed = 1; seed <= 6; seed++) {
      if (
        runBattle(createBattle(mission, buildLoadout(levels), seed * 7919)).outcome === "victoire"
      )
        wins++;
    }
    return wins;
  };
  assert.equal(play(0), 0);
  assert.ok(play(4) >= 2, "un arsenal complet rend la victoire possible");
});

test("une défaite survient quand le galion sombre", () => {
  const w = createBattle(getMission("premiers-boulets"), buildLoadout(emptyUpgradeLevels()), 1);
  applyDamage(w, player(w), "coque", 1e6, null);
  run(w, 3.5);
  assert.equal(w.outcome, "defaite");
  assert.equal(battleReport(w).stars, 0);
});

test("une même graine rejoue exactement la même bataille", () => {
  const a = runBattle(
    createBattle(getMission("coulez-cinq"), buildLoadout(emptyUpgradeLevels()), 42),
  );
  const b = runBattle(
    createBattle(getMission("coulez-cinq"), buildLoadout(emptyUpgradeLevels()), 42),
  );
  assert.deepEqual(battleReport(a), battleReport(b));
});

test("chaque mission déclare une prime, des vagues et assez d'ennemis pour son objectif", () => {
  const ids = new Set<string>();
  for (const m of MISSIONS) {
    assert.ok(!ids.has(m.id));
    ids.add(m.id);
    assert.ok(m.waves.length > 0 && missionEnemyCount(m) > 0);
    assert.equal(m.waves[0].trigger.type, "start", `${m.id} commence par une vague immédiate`);
    assert.ok(m.reward.gold > m.replayGold);
    if (m.objective.type === "couler-elite") {
      const name = m.objective.name;
      assert.ok(
        m.waves.some((w) => w.ships.some((s) => s.elite && s.name === name)),
        `${m.id} contient ${name}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Sauvegarde et économie

test("une sauvegarde absente, corrompue ou partielle donne une progression valide", () => {
  assert.deepEqual(parseSave(null), newSave());
  assert.deepEqual(parseSave("{pas du json"), newSave());
  const partial = parseSave(
    JSON.stringify({
      gold: 250.7,
      upgrades: { calibre: 99, inconnu: 3 },
      missions: { "premiers-boulets": { wins: 2, bestStars: 9 } },
    }),
  );
  assert.equal(partial.gold, 250);
  assert.equal(partial.upgrades.calibre, 5, "niveau borné au maximum");
  assert.equal(partial.missions["premiers-boulets"].bestStars, 3);
  assert.ok(!("inconnu" in partial.upgrades));
  assert.deepEqual(parseSave(serializeSave(partial)), partial);
});

test("première victoire : prime complète et gemmes ; reprise : prime réduite ; défaite : moitié du butin", () => {
  const save = newSave();
  const report = (outcome: "victoire" | "defaite") => ({
    missionId: "le-borgne",
    outcome,
    duration: 60,
    kills: 3,
    killsByClass: {},
    loot: 101,
    shots: 10,
    hits: 5,
    damageDealt: 100,
    damageTaken: 20,
    hullRatio: 0.8,
    stars: outcome === "victoire" ? 3 : 0,
  });
  const first = applyBattle(save, report("victoire"));
  assert.deepEqual(first.rewards, {
    loot: 101,
    missionGold: 320,
    gems: 1,
    firstClear: true,
    total: 421,
  });
  assert.equal(first.save.gold, 421);
  assert.equal(first.save.gems, 1);
  const replay = computeRewards(first.save, report("victoire"));
  assert.deepEqual(replay, { loot: 101, missionGold: 110, gems: 0, firstClear: false, total: 211 });
  const loss = computeRewards(first.save, report("defaite"));
  assert.deepEqual(loss, { loot: 50, missionGold: 0, gems: 0, firstClear: false, total: 50 });
  assert.equal(save.gold, 0, "applyBattle ne modifie pas la sauvegarde d'origine");
});

test("les missions se débloquent dans l'ordre", () => {
  let save = newSave();
  assert.equal(isMissionUnlocked(save, MISSIONS[0].id), true);
  assert.equal(isMissionUnlocked(save, MISSIONS[1].id), false);
  save = { ...save, missions: { [MISSIONS[0].id]: { wins: 1, bestStars: 2 } } };
  assert.equal(isMissionUnlocked(save, MISSIONS[1].id), true);
  assert.equal(isMissionUnlocked(save, MISSIONS[2].id), false);
});

test("acheter une amélioration coûte son prix et change réellement le galion", () => {
  const save = { ...newSave(), gold: 160 };
  const bought = buyUpgrade(save, "calibre");
  assert.equal(bought.ok, true);
  assert.equal(bought.save.gold, 10);
  assert.equal(bought.save.upgrades.calibre, 1);
  assert.ok(buildLoadout(bought.save.upgrades).gunDamage > buildLoadout(save.upgrades).gunDamage);
  const refused = buyUpgrade(bought.save, "calibre");
  assert.equal(refused.ok, false);
  assert.match(refused.reason ?? "", /Il manque 290/);
  const maxed = { ...newSave(), gold: 1e6, upgrades: { ...emptyUpgradeLevels(), poudre: 3 } };
  assert.equal(nextCost("poudre", 3), null);
  assert.equal(buyUpgrade(maxed, "poudre").ok, false);
});

test("les munitions déclarent des effets distincts", () => {
  assert.ok(AMMO.chaine.damage.voiles > AMMO.boulet.damage.voiles * 3);
  assert.ok(AMMO.mitraille.rangeMul < AMMO.chaine.rangeMul);
  assert.ok(AMMO.feu.limited && AMMO.feu.ignite > 0.3);
});

test("un équipage valide maîtrise même un brasier sans réparer", () => {
  const w = sandbox();
  const p = player(w);
  ignite(w, p, 1);
  run(w, 2);
  assert.ok(p.fire < 1, "le feu recule dès les premières secondes");
  run(w, 40);
  assert.equal(p.fire, 0);
  assert.equal(p.state, "afloat", "un brasier seul ne coule pas un galion intact");
});
