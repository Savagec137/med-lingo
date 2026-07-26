import assert from "node:assert/strict";
import test from "node:test";

import formationInput from "../content/formations/dea/formation.json" with { type: "json" };
import { FormationCatalog } from "../content/formation-catalog.ts";
import {
  ROADMAP_BLOCK_VISUALS,
  ROADMAP_ICON_NAMES,
  ROADMAP_PALETTES,
  ROADMAP_PARCOURS_VISUALS,
} from "./roadmap-visuals.ts";

const formation = new FormationCatalog([formationInput]).getFormation("dea");

test("chaque bloc officiel possède une identité visuelle cohérente", () => {
  assert.equal(Object.keys(ROADMAP_BLOCK_VISUALS).length, 15);
  for (const bloc of formation.blocs ?? []) {
    const visual = ROADMAP_BLOCK_VISUALS[bloc.id];
    assert.ok(visual, `Identité visuelle absente pour ${bloc.id}`);
    assert.ok(ROADMAP_ICON_NAMES.includes(visual.icon));
    assert.ok(ROADMAP_PALETTES.includes(visual.palette));
  }
});

test("chacun des 75 parcours possède un asset vectoriel dédié", () => {
  assert.equal(Object.keys(ROADMAP_PARCOURS_VISUALS).length, 75);
  for (const parcours of formation.parcours) {
    const icon = ROADMAP_PARCOURS_VISUALS[parcours.id];
    assert.ok(icon, `Asset absent pour ${parcours.id}`);
    assert.ok(ROADMAP_ICON_NAMES.includes(icon));
  }
});
