import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./${name}.tsx`, import.meta.url)), "utf8");

test("AnatomyBoard branche le contrat de correction et masque les libellés par défaut", () => {
  const board = source("AnatomyBoard");
  assert.match(board, /correct\(config, selectionState, checked\)/);
  assert.match(board, /visibleLabel\(hotspot, correction, foundHotspotIds\)/);
  assert.match(board, /hotspotAriaLabel\(/);
  assert.match(board, /answerOptions\(config, correction, foundHotspotIds\)/);
  assert.doesNotMatch(board, /selectedHotspot\.label/);
});

test("les pastilles utilisent des coordonnées relatives et un rayon tactile de sept pour cent", () => {
  const board = source("AnatomyBoard");
  assert.match(board, /left: `\$\{hotspot\.x\}%`/);
  assert.match(board, /top: `\$\{hotspot\.y\}%`/);
  assert.match(board, /w-\[14%\]/);
  assert.match(board, /DEFAULT_HOTSPOT_RADIUS/);
});

test("le pilote fidèle à la maquette conserve le corps réaliste et les panneaux satellites", () => {
  const board = source("AnatomyBoard");
  const plate = source("AnatomyHumanPlate");
  for (const component of [
    "MedocaHUD",
    "AnatomyFeedbackPanel",
    "AnatomyMiniMap",
    "AnatomyZoomControls",
    "AnatomyLayerToggle",
    "AnatomyAnswerCards",
    "AnatomyInfoCard",
  ]) {
    assert.match(board, new RegExp(component));
  }
  assert.match(plate, /anatomy-body-realistic\.png/);
  assert.match(plate, /useReviewedPilotAsset/);
  assert.match(board, /config\.targetHotspotId === pilotQuestion\.targetHotspotId/);
  assert.doesNotMatch(plate, /radial-gradient|linear-gradient/);
  assert.doesNotMatch(plate, /rounded-\[48%_48%_26%_26%\]/);
});

test("aucune ancienne vignette anatomique non auditée n'est réutilisée", () => {
  const cards = source("AnatomyAnswerCards");
  assert.doesNotMatch(cards, /avatar-brain\.png/);
  assert.match(cards, /pictogrammes neutres/);
  assert.match(cards, /showReviewedPilotAssets/);
});

test("les chiffres médicaux du cœur restent signalés comme internes à valider", () => {
  const pilot = readFileSync(
    fileURLToPath(new URL("../../features/anatomy/pilot-grands-systemes.json", import.meta.url)),
    "utf8",
  );
  const parsed = JSON.parse(pilot) as { infoCards: Array<{ trust: string; reviewNote: string }> };
  assert.equal(parsed.infoCards[0]?.trust, "internal_to_validate");
  assert.ok(parsed.infoCards[0]?.reviewNote.length > 20);
});

test("chaque actif anatomique du pilote porte un statut de relecture explicite", () => {
  const audit = readFileSync(
    fileURLToPath(new URL("../../assets/ANATOMY_ASSET_AUDIT.md", import.meta.url)),
    "utf8",
  );
  assert.match(audit, /anatomy-heart-realistic\.png/);
  assert.match(audit, /exactement trois branches principales/);
  assert.match(audit, /2D6BFA068DE233C97CD63632ED0D703F73FB3825975748BA1C235D561798F767/);
  assert.match(audit, /anatomy-body-realistic\.png/);
  assert.match(audit, /Statut : À vérifier/);
});

test("ImageHotspot reste disponible pour interactive_image sans faire fuiter la cible", () => {
  const imageHotspot = readFileSync(
    fileURLToPath(new URL("../exercises/ImageHotspot.tsx", import.meta.url)),
    "utf8",
  );
  const registry = readFileSync(
    fileURLToPath(new URL("../exercises/exercise-renderer-registry.ts", import.meta.url)),
    "utf8",
  );
  assert.match(registry, /anatomy_location: \{ component: "AnatomyBoard"/);
  assert.match(registry, /interactive_image: \{ component: "ImageHotspot"/);
  assert.doesNotMatch(imageHotspot, /hotspots\.find\(.*target.*\)\?\.label/);
  assert.match(imageHotspot, /DEFAULT_HOTSPOT_RADIUS/);
});
