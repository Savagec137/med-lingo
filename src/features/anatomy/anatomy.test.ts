import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ANATOMY_LAYERS, DEFAULT_HOTSPOT_RADIUS, MAX_ZOOM, MIN_ZOOM } from "./anatomy-domain.ts";
import {
  LAYER_BY_SLUG,
  LAYER_PANEL_ORDER,
  LAYER_STACK_ORDER,
  findLayerForSlug,
  isLayerLocked,
  layerForSlug,
  slugOfHotspotId,
  toggleLayer,
} from "./anatomy-layers.ts";
import {
  answerOptions,
  applyZoom,
  clampOffset,
  correct,
  createSelectionState,
  hotspotAriaLabel,
  hotspotAt,
  hotspotStyle,
  hotspotsFromAnswers,
  infoCardFor,
  canOpenKnowledge,
  initialVisibleLayers,
  lockedLayerOf,
  markFound,
  parseRelativePoint,
  pointAriaLabel,
  pointsFromAnswers,
  progressOf,
  recenter,
  registerMissedTap,
  resetView,
  selectHotspot,
  switchLayer,
  visibleLabel,
} from "./anatomy-question.ts";
import { anatomyQuestionSchema } from "./anatomy-schema.ts";
import { PILOT_QUESTION_ID, getAnatomyQuestion } from "./anatomy-catalog.ts";
import {
  FULL_BODY_PLATE,
  announcedViews,
  availableViews,
  getPlateView,
  layersToLoad,
  needsVectorFallback,
} from "./anatomy-plates.ts";
import { EXERCISE_RENDERER_REGISTRY } from "../../components/exercises/exercise-renderer-registry.ts";

const pilot = getAnatomyQuestion(PILOT_QUESTION_ID);
const fresh = () => createSelectionState(pilot);

/* -------------------------------------------------------------------------- */
/* Coordonnées relatives                                                     */
/* -------------------------------------------------------------------------- */

test("les fractions des questions existantes sont converties en pourcentage", () => {
  // Les 28 questions en production stockent « 0.54,0.31 ».
  assert.deepEqual(parseRelativePoint("0.54,0.31"), { x: 54, y: 31 });
  assert.deepEqual(parseRelativePoint("0.5,0.17"), { x: 50, y: 17 });
});

test("une coordonnée déjà en pourcentage n'est pas multipliée deux fois", () => {
  assert.deepEqual(parseRelativePoint("54,31"), { x: 54, y: 31 });
});

test("une coordonnée absente ou illisible retombe au centre", () => {
  assert.deepEqual(parseRelativePoint(undefined), { x: 50, y: 50 });
  assert.deepEqual(parseRelativePoint("nawak"), { x: 50, y: 50 });
});

test("les coordonnées ne dépendent ni du zoom ni de la taille du conteneur", () => {
  const hotspot = pilot.hotspots[0]!;
  const atRest = hotspotStyle(hotspot, 1);
  const zoomed = hotspotStyle(hotspot, 3);
  // La position relative est identique ; seul le contre-facteur change, pour que
  // la pastille conserve sa taille apparente.
  assert.equal(atRest.leftPercent, zoomed.leftPercent);
  assert.equal(atRest.topPercent, zoomed.topPercent);
  assert.equal(atRest.counterScale, 1);
  assert.equal(zoomed.counterScale, 1 / 3);
});

test("un redimensionnement ne change aucune coordonnée de zone", () => {
  // Les zones sont en pourcentage : seul le décalage, exprimé en pixels, dépend
  // de la taille du conteneur.
  const small = clampOffset({ x: -500, y: -500 }, 2, { width: 320, height: 480 });
  const large = clampOffset({ x: -500, y: -500 }, 2, { width: 1024, height: 1536 });
  assert.deepEqual(small, { x: -320, y: -480 });
  assert.deepEqual(large, { x: -500, y: -500 });
  for (const hotspot of pilot.hotspots) {
    assert.ok(hotspot.x >= 0 && hotspot.x <= 100, hotspot.id);
    assert.ok(hotspot.y >= 0 && hotspot.y <= 100, hotspot.id);
  }
});

/* -------------------------------------------------------------------------- */
/* Règle de gameplay : pastilles visibles, libellés masqués                   */
/* -------------------------------------------------------------------------- */

test("avant correction, aucune zone non trouvée n'expose son libellé", () => {
  const before = correct(pilot, fresh(), false);
  assert.equal(before.revealed, false);
  for (const hotspot of pilot.hotspots) {
    assert.equal(visibleLabel(hotspot, before, []), null, hotspot.id);
  }
});

test("avant correction, la pastille est annoncée par son numéro", () => {
  const before = correct(pilot, fresh(), false);
  const heart = pilot.hotspots.find((hotspot) => hotspot.id === "hotspot-heart")!;
  assert.equal(hotspotAriaLabel(heart, pilot.hotspots.length, before, []), "Zone 1 sur 6");
  // Le libellé accessible ne doit pas trahir la réponse.
  assert.ok(!hotspotAriaLabel(heart, 6, before, []).includes("Cœur"));
});

test("les cartes de réponses masquent les libellés non trouvés", () => {
  const before = correct(pilot, fresh(), false);
  const options = answerOptions(pilot, before, ["hotspot-brain"]);
  assert.equal(options.length, 6);
  // Une zone déjà trouvée garde son nom ; les autres restent muettes.
  assert.equal(options.find((o) => o.hotspotId === "hotspot-brain")?.label, "Cerveau");
  assert.equal(options.find((o) => o.hotspotId === "hotspot-heart")?.label, null);
  assert.equal(options.filter((o) => o.label === null).length, 5);
});

test("après correction, tous les libellés sont révélés", () => {
  const state = selectHotspot(fresh(), "hotspot-heart");
  const after = correct(pilot, state, true);
  assert.equal(after.revealed, true);
  for (const hotspot of pilot.hotspots) {
    assert.equal(visibleLabel(hotspot, after, []), hotspot.label, hotspot.id);
  }
});

test("les pastilles sont numérotées de 1 à n dans l'ordre de déclaration", () => {
  const orders = pilot.hotspots.map((hotspot) => hotspot.order);
  assert.deepEqual(
    [...orders].sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6],
  );
  assert.equal(pilot.hotspots.find((h) => h.order === 1)?.label, "Cœur");
});

/* -------------------------------------------------------------------------- */
/* Correction                                                                */
/* -------------------------------------------------------------------------- */

test("toucher la bonne zone donne un verdict correct", () => {
  const state = selectHotspot(fresh(), "hotspot-heart");
  const result = correct(pilot, state, true);
  assert.equal(result.verdict, "correct");
  assert.equal(result.selectedLabel, "Cœur");
  assert.match(result.statusMessage, /^Correct\./);
  assert.equal(result.explanation, pilot.explanation);
});

test("toucher une mauvaise zone nomme l'erreur et la bonne réponse", () => {
  const state = selectHotspot(fresh(), "hotspot-stomach");
  const result = correct(pilot, state, true);
  assert.equal(result.verdict, "incorrect");
  assert.equal(result.selectedLabel, "Estomac");
  assert.equal(result.correctHotspotId, "hotspot-heart");
  assert.equal(result.correctLabel, "Cœur");
  // Le message porte l'information sans dépendre d'une couleur.
  assert.match(result.statusMessage, /Estomac/);
  assert.match(result.statusMessage, /Cœur/);
});

test("un contact hors de toute zone est distingué d'une mauvaise zone", () => {
  const result = correct(pilot, registerMissedTap(fresh()), true);
  assert.equal(result.verdict, "missed");
  assert.equal(result.selectedLabel, null);
  assert.match(result.statusMessage, /Aucune zone touchée/);
});

test("le message d'état ne dépend jamais de la couleur", () => {
  for (const [hotspotId, expected] of [
    ["hotspot-heart", "correct"],
    ["hotspot-brain", "incorrect"],
  ] as const) {
    const result = correct(pilot, selectHotspot(fresh(), hotspotId), true);
    assert.equal(result.verdict, expected);
    assert.ok(result.statusMessage.length > 10, result.statusMessage);
  }
});

test("une zone attendue absente des hotspots lève une erreur", () => {
  const broken = { ...pilot, targetHotspotId: "hotspot-inexistant" };
  assert.throws(() => correct(broken, fresh(), true), /zone attendue absente/);
});

/* -------------------------------------------------------------------------- */
/* Détection du contact                                                      */
/* -------------------------------------------------------------------------- */

test("un contact dans le rayon touche la zone, hors du rayon ne touche rien", () => {
  const layers = pilot.visibleLayers;
  assert.equal(hotspotAt(pilot, { x: 54, y: 31 }, layers)?.id, "hotspot-heart");
  assert.equal(hotspotAt(pilot, { x: 5, y: 95 }, layers), null);
});

test("entre deux zones qui se chevauchent, la plus proche gagne", () => {
  // Abdomen (50,49) et intestin grêle (50,54) sont à cinq points d'écart.
  const layers = ["skin", "organs"] as const;
  assert.equal(hotspotAt(pilot, { x: 50, y: 49 }, layers)?.id, "hotspot-abdomen");
  assert.equal(hotspotAt(pilot, { x: 50, y: 55 }, layers)?.id, "hotspot-small_intestine");
});

test("une zone dont la couche est masquée n'est pas touchable", () => {
  // Le diaphragme est un muscle : sans la couche muscles, il est hors d'atteinte.
  assert.equal(hotspotAt(pilot, { x: 50, y: 39 }, ["organs"]), null);
  assert.equal(hotspotAt(pilot, { x: 50, y: 39 }, ["muscles"])?.id, "hotspot-diaphragm");
});

test("le rayon de contact par défaut respecte le minimum tactile", () => {
  // 7 % de 360 pixels donnent 50 pixels de diamètre, au-dessus des 44 requis.
  assert.equal(DEFAULT_HOTSPOT_RADIUS, 7);
  assert.ok((DEFAULT_HOTSPOT_RADIUS / 100) * 360 * 2 >= 44);
});

/* -------------------------------------------------------------------------- */
/* Couches                                                                   */
/* -------------------------------------------------------------------------- */

test("les couches peuvent être activées et désactivées", () => {
  const state = fresh();
  assert.ok(state.visibleLayers.includes("skin"));
  const hidden = switchLayer(pilot, state, "skin", false);
  assert.ok(!hidden.visibleLayers.includes("skin"));
  const shown = switchLayer(pilot, hidden, "skin", false);
  assert.ok(shown.visibleLayers.includes("skin"));
});

test("la couche de la zone attendue ne peut pas être masquée avant correction", () => {
  const locked = lockedLayerOf(pilot);
  assert.equal(locked, "organs");
  const state = fresh();
  const attempt = switchLayer(pilot, state, "organs", false);
  assert.ok(attempt.visibleLayers.includes("organs"), "la couche cible reste visible");
  assert.ok(isLayerLocked("organs", locked));
});

test("le verrou de couche tombe une fois la question corrigée", () => {
  const after = switchLayer(pilot, fresh(), "organs", true);
  assert.ok(!after.visibleLayers.includes("organs"));
});

test("une couche non activable est ignorée", () => {
  const limited = { ...pilot, enabledLayers: ["organs" as const] };
  const state = switchLayer(limited, fresh(), "muscles", false);
  assert.deepEqual(state.visibleLayers, fresh().visibleLayers);
});

test("les couches visibles conservent l'ordre d'empilement", () => {
  const state = switchLayer(pilot, fresh(), "muscles", false);
  const indexes = state.visibleLayers.map((layer) => LAYER_STACK_ORDER.indexOf(layer));
  assert.deepEqual(
    indexes,
    [...indexes].sort((a, b) => a - b),
  );
});

test("une configuration masquant la cible est corrigée à l'ouverture", () => {
  const broken = { ...pilot, visibleLayers: ["skin" as const] };
  assert.ok(initialVisibleLayers(broken).includes("organs"));
});

test("la peau est la couche la plus superficielle et le squelette la plus profonde", () => {
  assert.equal(LAYER_STACK_ORDER[0], "skeleton");
  assert.equal(LAYER_STACK_ORDER[LAYER_STACK_ORDER.length - 1], "skin");
  // Le panneau de la maquette liste dans l'autre sens, du superficiel au profond.
  assert.equal(LAYER_PANEL_ORDER[0], "skin");
});

test("toggleLayer sans verrou reste une bascule pure", () => {
  assert.deepEqual(toggleLayer(["organs"], "muscles"), ["organs", "muscles"]);
  assert.deepEqual(toggleLayer(["organs", "muscles"], "muscles"), ["organs"]);
});

/* -------------------------------------------------------------------------- */
/* Zoom, recentrage, réinitialisation                                        */
/* -------------------------------------------------------------------------- */

test("le zoom reste borné", () => {
  const size = { width: 400, height: 600 };
  assert.equal(applyZoom(fresh(), 99, size).zoom, MAX_ZOOM);
  assert.equal(applyZoom(fresh(), 0.1, size).zoom, MIN_ZOOM);
});

test("le zoom et la réinitialisation ne cassent pas les coordonnées des zones", () => {
  const size = { width: 400, height: 600 };
  const before = pilot.hotspots.map((hotspot) => hotspotStyle(hotspot, 1));
  let state = applyZoom(fresh(), 3, size);
  state = { ...state, offset: clampOffset({ x: -200, y: -300 }, 3, size) };
  state = resetView(pilot, state);
  const after = pilot.hotspots.map((hotspot) => hotspotStyle(hotspot, state.zoom));
  assert.deepEqual(after, before);
  assert.equal(state.zoom, MIN_ZOOM);
  assert.deepEqual(state.offset, { x: 0, y: 0 });
});

test("recentrer ne change pas le zoom, réinitialiser le remet à 1", () => {
  const size = { width: 400, height: 600 };
  const zoomed = applyZoom(fresh(), 2.5, size);
  const centered = recenter(zoomed);
  assert.equal(centered.zoom, 2.5);
  assert.deepEqual(centered.offset, { x: 0, y: 0 });
  assert.equal(resetView(pilot, zoomed).zoom, MIN_ZOOM);
});

test("réinitialiser restaure aussi les couches de départ", () => {
  const hidden = switchLayer(pilot, fresh(), "skin", false);
  assert.ok(!hidden.visibleLayers.includes("skin"));
  assert.ok(resetView(pilot, hidden).visibleLayers.includes("skin"));
});

test("le décalage ne laisse jamais sortir la planche du cadre", () => {
  const size = { width: 400, height: 600 };
  assert.deepEqual(clampOffset({ x: 50, y: 50 }, 2, size), { x: 0, y: 0 });
  assert.deepEqual(clampOffset({ x: -9999, y: -9999 }, 2, size), { x: -400, y: -600 });
  // Sans zoom, aucun déplacement n'est possible.
  assert.deepEqual(clampOffset({ x: -100, y: -100 }, 1, size), { x: 0, y: 0 });
});

/* -------------------------------------------------------------------------- */
/* Progression                                                               */
/* -------------------------------------------------------------------------- */

test("la progression est mise à jour et se lit comme la maquette", () => {
  let found: string[] = [];
  assert.equal(progressOf(pilot, found).label, "0 / 6 zones trouvées");
  found = markFound(found, "hotspot-heart");
  found = markFound(found, "hotspot-brain");
  found = markFound(found, "hotspot-stomach");
  found = markFound(found, "hotspot-abdomen");
  const progress = progressOf(pilot, found);
  assert.equal(progress.label, "4 / 6 zones trouvées");
  assert.equal(progress.found, 4);
  assert.equal(progress.total, 6);
  assert.ok(Math.abs(progress.ratio - 4 / 6) < 1e-9);
});

test("une zone trouvée deux fois ne compte qu'une fois", () => {
  const twice = markFound(markFound([], "hotspot-heart"), "hotspot-heart");
  assert.deepEqual(twice, ["hotspot-heart"]);
  assert.equal(progressOf(pilot, twice).found, 1);
});

/* -------------------------------------------------------------------------- */
/* Fiche pédagogique et provenance                                           */
/* -------------------------------------------------------------------------- */

test("la fiche du cœur porte ses quatre chiffres clés", () => {
  const card = infoCardFor(pilot, "hotspot-heart");
  assert.ok(card);
  assert.equal(card!.stats.length, 4);
  assert.deepEqual(
    card!.stats.map((stat) => stat.label),
    ["Taille", "Poids", "Battements", "Fonction"],
  );
});

test("les chiffres non sourcés sont marqués à valider avec une note", () => {
  const card = infoCardFor(pilot, "hotspot-heart")!;
  assert.equal(card.trust, "internal_to_validate");
  assert.ok(card.reviewNote && card.reviewNote.length >= 20);
});

test("le schéma refuse une fiche à valider sans note de relecture", () => {
  const broken = {
    ...pilot,
    infoCards: [{ ...pilot.infoCards[0]!, reviewNote: null }],
  };
  const result = anatomyQuestionSchema.safeParse(broken);
  assert.equal(result.success, false);
  assert.ok(result.error!.issues.some((issue) => /note de relecture/.test(issue.message)));
});

test("le schéma refuse des chiffres présentés comme vérifiés sans fiche", () => {
  const broken = {
    ...pilot,
    infoCards: [{ ...pilot.infoCards[0]!, trust: "official_verified", reviewNote: null }],
  };
  const result = anatomyQuestionSchema.safeParse(broken);
  assert.equal(result.success, false);
});

test("En savoir plus reste absent tant qu'aucune fiche ne se résout", () => {
  // Aucune fiche anatomique n'existe dans la bibliothèque : mieux vaut aucun
  // bouton qu'un lien mort.
  assert.equal(
    canOpenKnowledge(pilot, "hotspot-heart", () => true),
    false,
  );
  const linked = {
    ...pilot,
    infoCards: [{ ...pilot.infoCards[0]!, knowledgeId: "library.exemple" }],
  };
  assert.equal(
    canOpenKnowledge(linked, "hotspot-heart", () => true),
    true,
  );
  assert.equal(
    canOpenKnowledge(linked, "hotspot-heart", () => false),
    false,
  );
});

/* -------------------------------------------------------------------------- */
/* Schéma du pilote                                                          */
/* -------------------------------------------------------------------------- */

test("le pilote valide son schéma", () => {
  assert.equal(anatomyQuestionSchema.safeParse(pilot).success, true);
});

test("le pilote reprend la maquette : six zones, cœur attendu", () => {
  assert.equal(pilot.instruction, "Clique sur le cœur");
  assert.equal(pilot.title, "Les grands systèmes");
  assert.equal(pilot.subtitle, "Découvrir le corps humain");
  assert.equal(pilot.targetLabel, "Cœur");
  assert.deepEqual(
    [...pilot.hotspots].sort((a, b) => a.order - b.order).map((h) => h.label),
    ["Cœur", "Estomac", "Cerveau", "Intestin grêle", "Abdomen", "Diaphragme"],
  );
});

test("le schéma refuse une question dont la cible est sur une couche masquée", () => {
  const result = anatomyQuestionSchema.safeParse({ ...pilot, visibleLayers: ["skin"] });
  assert.equal(result.success, false);
  assert.ok(result.error!.issues.some((issue) => /masquée à l'ouverture/.test(issue.message)));
});

test("le schéma refuse une couche de zone contredisant la table des couches", () => {
  const broken = {
    ...pilot,
    hotspots: pilot.hotspots.map((hotspot) =>
      hotspot.id === "hotspot-heart" ? { ...hotspot, layer: "skeleton" } : hotspot,
    ),
  };
  const result = anatomyQuestionSchema.safeParse(broken);
  assert.equal(result.success, false);
  assert.ok(result.error!.issues.some((issue) => /LAYER_BY_SLUG/.test(issue.message)));
});

test("le schéma refuse une consigne qui ne nomme pas la zone attendue", () => {
  const result = anatomyQuestionSchema.safeParse({ ...pilot, targetLabel: "Poumons" });
  assert.equal(result.success, false);
});

/* -------------------------------------------------------------------------- */
/* Compatibilité avec les 28 questions existantes                             */
/* -------------------------------------------------------------------------- */

function existingAnatomyItems() {
  const root = "src/content/formations/dea";
  const items: Array<{ file: string; item: Record<string, unknown> }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".json")) {
        const parsed = JSON.parse(readFileSync(path, "utf8")) as {
          items?: Array<Record<string, unknown>>;
        };
        for (const item of parsed.items ?? []) {
          if (item.type === "anatomy_location") items.push({ file: path, item });
        }
      }
    }
  };
  walk(root);
  return items;
}

test("les 28 questions anatomiques existantes se convertissent sans perte", () => {
  const found = existingAnatomyItems();
  assert.ok(found.length >= 28, `${found.length} questions trouvées`);
  for (const { file, item } of found) {
    const answers = item.answers as Array<{ id: string; text: string; detail?: string }>;
    const hotspots = hotspotsFromAnswers(answers);
    assert.equal(hotspots.length, answers.length, `${file} ${String(item.id)}`);
    for (const hotspot of hotspots) {
      assert.ok(hotspot.x >= 0 && hotspot.x <= 100, `${hotspot.id} x=${hotspot.x}`);
      assert.ok(hotspot.y >= 0 && hotspot.y <= 100, `${hotspot.id} y=${hotspot.y}`);
      assert.ok(ANATOMY_LAYERS.includes(hotspot.layer), hotspot.id);
    }
  }
});

test("chaque structure des questions existantes a une couche déclarée", () => {
  for (const { file, item } of existingAnatomyItems()) {
    const answers = item.answers as Array<{ id: string }>;
    for (const answer of answers) {
      const slug = slugOfHotspotId(answer.id);
      assert.ok(findLayerForSlug(slug), `${slug} (${file}) n'a pas de couche dans LAYER_BY_SLUG`);
    }
  }
});

test("une structure inconnue échoue franchement au lieu de retomber sur une couche", () => {
  assert.throws(() => layerForSlug("pancreas_imaginaire"), /sans couche déclarée/);
});

test("correctAnswer et metadata.anatomyTarget concordent sur les questions existantes", () => {
  // `correctAnswer` est la seule autorité ; ce test vérifie que la métadonnée
  // redondante ne la contredit pas. Si elle divergeait, c'est la donnée qu'il
  // faudrait corriger, pas le lecteur.
  for (const { file, item } of existingAnatomyItems()) {
    const target = (item.metadata as { anatomyTarget?: string } | undefined)?.anatomyTarget;
    if (!target) continue;
    const correctAnswer = item.correctAnswer as string;
    assert.equal(
      slugOfHotspotId(correctAnswer),
      target,
      `${file} ${String(item.id)} : correctAnswer=${correctAnswer} metadata=${target}`,
    );
  }
});

test("toutes les entrées de LAYER_BY_SLUG servent à une question existante", () => {
  const used = new Set<string>();
  for (const { item } of existingAnatomyItems()) {
    for (const answer of item.answers as Array<{ id: string }>) {
      used.add(slugOfHotspotId(answer.id));
    }
  }
  const pilotSlugs = pilot.hotspots.map((hotspot) => slugOfHotspotId(hotspot.id));
  for (const slug of Object.keys(LAYER_BY_SLUG)) {
    assert.ok(
      used.has(slug) || pilotSlugs.includes(slug),
      `${slug} est déclaré sans être utilisé nulle part`,
    );
  }
});

/* -------------------------------------------------------------------------- */
/* Planche vectorielle historique                                             */
/* -------------------------------------------------------------------------- */

test("la planche historique lit ses zones sans exiger de couche", () => {
  // `AnatomyLocationQuestion` n'a pas de couches : lui imposer la table
  // ferait planter une leçon dès qu'une structure n'y figure pas.
  const points = pointsFromAnswers([
    { id: "hotspot-inconnu-du-registre", text: "Structure inédite", detail: "0.4,0.6" },
  ]);
  assert.equal(points.length, 1);
  assert.deepEqual({ x: points[0]!.x, y: points[0]!.y }, { x: 40, y: 60 });
  assert.equal(points[0]!.order, 1);
});

test("la planche historique masque les libellés avant correction", () => {
  const points = pointsFromAnswers([
    { id: "hotspot-heart", text: "Cœur", detail: "0.54,0.31" },
    { id: "hotspot-stomach", text: "Estomac", detail: "0.45,0.46" },
  ]);
  assert.equal(pointAriaLabel(points[0]!, 2, false), "Zone 1 sur 2");
  assert.equal(pointAriaLabel(points[0]!, 2, true), "Cœur");
});

test("les positions de la planche historique sont exprimées en pourcentage", () => {
  // Le composant applique désormais `left: ${x}%` sans multiplier de nouveau.
  const [point] = pointsFromAnswers([{ id: "z", text: "Z", detail: "0.5,0.25" }]);
  assert.equal(point!.x, 50);
  assert.equal(point!.y, 25);
});

/* -------------------------------------------------------------------------- */
/* Actifs : rien de lourd chargé inutilement                                  */
/* -------------------------------------------------------------------------- */

test("aucun actif de planche n'est livré dans ce lot", () => {
  for (const view of FULL_BODY_PLATE.views) {
    for (const layer of view.layers) {
      assert.equal(layer.available, false, `${view.view}/${layer.layer}`);
    }
  }
  assert.deepEqual(availableViews(FULL_BODY_PLATE.id), []);
  assert.equal(announcedViews(FULL_BODY_PLATE.id).length, 3);
});

test("aucune couche n'est demandée tant qu'aucun actif n'existe", () => {
  assert.deepEqual(layersToLoad(FULL_BODY_PLATE.id, "front", pilot.visibleLayers), []);
  assert.ok(needsVectorFallback(FULL_BODY_PLATE.id, "front"));
});

test("seules les couches visibles seraient chargées", () => {
  // Simulation d'un lot ultérieur où les actifs existent.
  const view = getPlateView(FULL_BODY_PLATE.id, "front");
  const asIfAvailable = view.layers.map((layer) => ({ ...layer, available: true }));
  const requested = asIfAvailable.filter((layer) => pilot.visibleLayers.includes(layer.layer));
  assert.equal(requested.length, pilot.visibleLayers.length);
  assert.ok(!requested.some((layer) => layer.layer === "muscles"));
});

test("chaque couche déclare un budget de poids et un repli WebP", () => {
  for (const view of FULL_BODY_PLATE.views) {
    for (const layer of view.layers) {
      assert.match(layer.src, /\.avif$/);
      assert.match(layer.fallbackSrc, /\.webp$/);
      assert.equal(layer.maxWeightKb, 250);
    }
    // Cinq couches à 250 Ko tiennent dans le budget d'une vue.
    assert.ok(view.layers.length * 250 <= 1250);
  }
});

test("la peau est translucide par défaut", () => {
  const skin = getPlateView(FULL_BODY_PLATE.id, "front").layers.find(
    (layer) => layer.layer === "skin",
  );
  assert.ok(skin!.defaultOpacity < 0.5);
});

/* -------------------------------------------------------------------------- */
/* Routage des types de questions                                            */
/* -------------------------------------------------------------------------- */

test("ImageHotspot reste le composant des images interactives génériques", () => {
  assert.equal(EXERCISE_RENDERER_REGISTRY.interactive_image.component, "ImageHotspot");
  assert.equal(EXERCISE_RENDERER_REGISTRY.interactive_image.answerMode, "point");
});

test("anatomy_location promet le clavier, ce que la couche logique respecte", () => {
  assert.equal(EXERCISE_RENDERER_REGISTRY.anatomy_location.supportsKeyboard, true);
  // La promesse est tenable : chaque zone a un libellé accessible, neutre avant
  // correction, donc navigable au clavier sans souffler la réponse.
  const before = correct(pilot, fresh(), false);
  for (const hotspot of pilot.hotspots) {
    const label = hotspotAriaLabel(hotspot, pilot.hotspots.length, before, []);
    assert.match(label, /^Zone \d+ sur 6$/);
  }
});
