import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { formatMedocaNumber, getProgressPercent } from "./utils.ts";

const componentSource = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./${name}.tsx`, import.meta.url)), "utf8");

test("les utilitaires du design system bornent la progression et formatent les valeurs", () => {
  assert.equal(getProgressPercent(50, 100), 50);
  assert.equal(getProgressPercent(120, 100), 100);
  assert.equal(getProgressPercent(-10, 100), 0);
  assert.equal(getProgressPercent(10, 0), 0);
  assert.match(formatMedocaNumber(2450), /2[\s\u202f]450/);
});

test("les onze composants partagés sont exportés par le module Medoca", () => {
  const index = readFileSync(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8");
  for (const component of [
    "MedocaHUD",
    "CurrencyPill",
    "LivesPill",
    "PlayerAvatar",
    "PremiumCard",
    "RewardCard",
    "BadgeCard",
    "BottomNav",
    "RarityBadge",
    "ProgressBar",
    "GlassPanel",
  ]) {
    assert.ok(index.includes(`export * from "./${component}"`));
  }
});

test("les composants interactifs conservent leurs contrats accessibles", () => {
  assert.match(componentSource("BottomNav"), /aria-current=/);
  assert.match(componentSource("BottomNav"), /min-h-14/);
  assert.match(componentSource("ProgressBar"), /role="progressbar"/);
  assert.match(componentSource("ProgressBar"), /aria-valuenow=/);
  assert.match(componentSource("BadgeCard"), /aria-pressed=/);
  assert.match(componentSource("PremiumCard"), /min-h-12/);
  assert.match(componentSource("PlayerAvatar"), /loading="lazy"/);
});

test("le HUD lit le nom de marque officiel au lieu de coder un ancien nom", () => {
  const hud = componentSource("MedocaHUD");
  assert.match(hud, /APP_NAME/);
  assert.doesNotMatch(hud, /Medoka|Pulseo/);
});

test("le langage visuel reprend le vert clinique et les surfaces bleu nuit de la maquette", () => {
  const tokens = readFileSync(fileURLToPath(new URL("./tokens.ts", import.meta.url)), "utf8");
  const panel = componentSource("GlassPanel");
  const progress = componentSource("ProgressBar");

  assert.match(tokens, /#26d878/);
  assert.match(panel, /#0b1724/);
  assert.match(progress, /tone = "emerald"/);
});
