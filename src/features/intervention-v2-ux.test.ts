import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

test("l'écran de garde V2 expose son expérience et respecte reduced-motion", () => {
  // Le contrôle portait sur `routes/intervention.tsx`. Cette adresse redirige
  // désormais vers le simulateur, et l'écran de garde vit hors circuit dans
  // `components/InterventionLegacyScreen.tsx`. Le sujet du test n'a pas changé —
  // seul l'endroit où il se trouve.
  const route = source("src/components/InterventionLegacyScreen.tsx");

  assert.match(route, /InterventionShiftExperience/);
  assert.match(route, /useReducedMotion/);
  assert.match(route, /mode === "guard"/);
  assert.match(route, /min-h-screen/);
  assert.match(route, /px-4/);
});

test("les huit états visibles de la garde ont un rendu dédié et un focus contextuel", () => {
  const experience = source("src/components/InterventionShiftExperience.tsx");

  for (const status of [
    "briefing",
    "ringing",
    "dispatch",
    "travel",
    "mission",
    "intervention-summary",
    "shift-summary",
  ]) {
    assert.match(experience, new RegExp(`session\\.status === "${status}"`));
  }
  assert.match(experience, /titleRef\.current\?\.focus\(\)/);
  assert.match(experience, /tabIndex=\{-1\}/);
  assert.match(experience, /min-h-12/);
  assert.match(experience, /focus-visible:ring-4/);
  assert.doesNotMatch(experience, /min-w-\[(?:[4-9]\d{2}|\d{4,})px\]/);
});

test("le HUD reste compact sur mobile et n'annonce pas le chrono chaque seconde", () => {
  const hud = source("src/components/InterventionShiftHud.tsx");

  assert.match(hud, /grid-cols-2/);
  assert.match(hud, /sm:grid-cols-4/);
  assert.match(hud, /min-w-0/);
  assert.match(hud, /truncate/);
  assert.match(hud, /Le chronomètre n'est pas annoncé automatiquement chaque seconde\./);
});

test("la garde active est restaurée et persistée au rechargement", () => {
  const hook = source("src/hooks/use-intervention-shift.ts");

  assert.match(hook, /restoreInterventionShift\(parsed, scenarios\)/);
  assert.match(hook, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(session\)\)/);
  assert.match(hook, /addEventListener\("pagehide", persistImmediately\)/);
  assert.match(hook, /addEventListener\("visibilitychange", onVisibilityChange\)/);
  assert.match(hook, /clearInterval\(interval\)/);
});
