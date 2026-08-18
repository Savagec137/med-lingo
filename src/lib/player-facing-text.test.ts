import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { documentLabel } from "./document-label.ts";

/**
 * Ce que le joueur voit à l'écran.
 *
 * Deux règles, nées de la même remontée de terrain : un mode qu'aucun écran ne
 * relie n'existe pas, et un chemin de fichier affiché tel quel ressemble à du
 * code oublié dans le jeu.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (relative: string): string => readFileSync(path.join(ROOT, relative), "utf8");

// ── Le mode simulation doit rester atteignable ──────────────────────────────

test("la page d'accueil mène au mode simulation", () => {
  assert.match(
    read("routes/index.tsx"),
    /to="\/intervention-v3"/u,
    "Sans lien depuis l'accueil, le mode simulation n'est joignable qu'en tapant l'URL.",
  );
});

test("l'ancienne adresse du Mode Intervention mène au simulateur", () => {
  // Elle y menait par un lien, à côté de l'ancien quiz. Elle y mène désormais
  // par une redirection : le quiz n'est plus une destination possible.
  assert.match(
    read("routes/intervention.tsx"),
    /redirect\(\{\s*to:\s*"\/intervention-v3"/u,
    "Les deux modes tournent sur des moteurs différents : celui qui n'est lié nulle part est invisible.",
  );
});

test("la route du mode simulation existe", () => {
  assert.match(read("routes/intervention-v3.tsx"), /createFileRoute\("\/intervention-v3"\)/u);
  assert.match(read("routeTree.gen.ts"), /intervention-v3/u);
});

// ── Aucun repère de développement à l'écran ─────────────────────────────────

/** Tous les fichiers d'interface, routes et composants confondus. */
function interfaceFiles(): string[] {
  const found: string[] = [];
  const walk = (relative: string): void => {
    for (const entry of readdirSync(path.join(ROOT, relative), { withFileTypes: true })) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith(".tsx")) found.push(child);
    }
  };
  walk("components");
  walk("routes");
  return found;
}

test("aucun écran n'affiche le chemin d'un fichier du dépôt", () => {
  // `repositoryPath` est un repère interne : il pointe vers le PDF source dans
  // l'arborescence du projet. Affiché, il donne « docs/official_sources/... » au
  // milieu d'un débriefing clinique.
  const offenders = interfaceFiles().filter((file) =>
    /\{[^}]*repositoryPath[^}]*\}/u.test(read(file)),
  );
  assert.deepEqual(offenders, [], "Un écran rend un chemin de dépôt.");
});

// ── Le nom d'un document se lit ─────────────────────────────────────────────

test("documentLabel retire chemin, extension et séparateurs techniques", () => {
  assert.equal(
    documentLabel(
      "docs/official_sources/Transport_Sanitaire/VFF_Referentiel_formation_securite_routiere_2026.pdf",
    ),
    "VFF Referentiel formation securite routiere 2026",
  );
  assert.equal(documentLabel("B2.M4 - Support Etudiant.pdf"), "B2.M4 - Support Etudiant");
  assert.equal(documentLabel("Référentiel DEA"), "Référentiel DEA");
});

test("documentLabel ne laisse jamais un libellé vide", () => {
  assert.equal(documentLabel(undefined), "Source non précisée");
  assert.equal(documentLabel(""), "Source non précisée");
  assert.equal(documentLabel("docs/"), "Source non précisée");
});
