import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

/**
 * Le routage du Mode Intervention.
 *
 * C'était le trou : huit règles du mode étaient tenues par des tests, et aucun
 * ne vérifiait **ce sur quoi le joueur atterrit**. Le mode pouvait être
 * irréprochable et injoignable — c'est exactement ce qui s'est produit, et cela
 * ne s'est vu que sur des captures d'écran montrant l'ancien quiz.
 *
 * Ces contrôles portent sur le code source des routes, faute de rendu React
 * dans ce harnais. Ils ne remplacent pas le parcours en navigateur ; ils
 * empêchent la régression silencieuse qu'un parcours manuel ne rattrape que par
 * hasard.
 */

const ROUTES = path.resolve(import.meta.dirname, "../../../routes");
const read = (file: string): string => readFileSync(path.join(ROUTES, file), "utf8");

/** Retire les commentaires : une prose qui parle du quiz n'est pas un montage. */
const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//gu, " ").replace(/\/\/[^\n]*/gu, " ");

/* -------------------------------------------------------------------------- */
/* L'ancienne adresse ne mène plus au quiz                                    */
/* -------------------------------------------------------------------------- */

test("/intervention redirige vers le simulateur", () => {
  const source = withoutComments(read("intervention.tsx"));
  assert.match(source, /redirect\(\{\s*to:\s*"\/intervention-v3"/u, "aucune redirection déclarée");
});

test("/intervention ne monte plus aucun écran de l'ancien moteur", () => {
  const source = withoutComments(read("intervention.tsx"));
  for (const legacy of [
    "InterventionDecisionScreen",
    "InterventionShiftExperience",
    "InterventionDebrief",
    "intervention-engine",
    "use-intervention-session",
  ]) {
    assert.equal(source.includes(legacy), false, `la route monte encore « ${legacy} »`);
  }
});

/* -------------------------------------------------------------------------- */
/* L'entrée du mode mène au simulateur                                        */
/* -------------------------------------------------------------------------- */

test("l'accueil n'offre qu'une entrée « Mode Intervention », et elle mène à V3", () => {
  const source = read("index.tsx");
  const links = [...source.matchAll(/to="(\/intervention[^"]*)"/gu)].map((match) => match[1]);
  assert.ok(links.length > 0, "l'accueil ne mène plus au mode intervention");
  assert.deepEqual(
    [...new Set(links)],
    ["/intervention-v3"],
    "une entrée de l'accueil mène encore à l'ancienne adresse",
  );
});

test("aucun écran de l'application ne mène à l'ancien mode", () => {
  // Le contrôle porte sur toutes les routes : une entrée oubliée dans un coin de
  // l'application suffit à ramener un joueur sur le quiz.
  const offenders: string[] = [];
  for (const name of readdirSync(ROUTES)) {
    if (!name.endsWith(".tsx") || name === "intervention.tsx") continue;
    const source = withoutComments(read(name));
    if (/to="\/intervention"/u.test(source)) offenders.push(name);
  }
  assert.deepEqual(offenders, []);
});

/* -------------------------------------------------------------------------- */
/* La route V3 monte bien le simulateur                                       */
/* -------------------------------------------------------------------------- */

test("/intervention-v3 monte les écrans de simulation", () => {
  const source = withoutComments(read("intervention-v3.tsx"));
  // Les sept écrans du parcours, plus la liste de missions. Leur absence
  // signifierait que la route rend autre chose que la simulation.
  for (const screen of [
    "MissionListScreen",
    "NewCallScreen",
    "ArrivalScreen",
    "VitalsScreen",
    "Centre15Screen",
    "PriorityActionsScreen",
    "ReevaluationScreen",
    "DebriefScreen",
  ]) {
    assert.ok(source.includes(screen), `la route V3 ne monte pas ${screen}`);
  }
  assert.match(source, /useInterventionV3/u, "la route V3 n'utilise pas le moteur de simulation");
});

test("la route V3 n'emprunte rien à l'ancien moteur", () => {
  const source = withoutComments(read("intervention-v3.tsx"));
  for (const legacy of [
    "intervention-engine",
    "intervention-scenarios",
    "intervention-scenario-builder",
    "use-intervention-session",
    "InterventionDecisionScreen",
  ]) {
    assert.equal(source.includes(legacy), false, `la route V3 importe « ${legacy} »`);
  }
});

/* -------------------------------------------------------------------------- */
/* L'écran historique est hors circuit, pas perdu                             */
/* -------------------------------------------------------------------------- */

test("l'écran de l'ancien mode n'est monté par aucune route", () => {
  const offenders = readdirSync(ROUTES)
    .filter((name) => name.endsWith(".tsx"))
    .filter((name) => withoutComments(read(name)).includes("InterventionLegacyScreen"));
  assert.deepEqual(
    offenders,
    [],
    "une route monte l'écran historique : le joueur peut retomber sur le quiz",
  );
});

test("l'écran historique existe toujours, hors circuit", () => {
  // Il porte quinze missions de contenu rédigé. Le retirer est une décision de
  // contenu, pas un effet de bord du changement de routage.
  const legacy = readFileSync(
    path.resolve(import.meta.dirname, "../../../components/InterventionLegacyScreen.tsx"),
    "utf8",
  );
  assert.match(legacy, /export function InterventionLegacyScreen/u);
});
