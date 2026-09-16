import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import blocFiveInput from "./bloc-05-logigramme.json" with { type: "json" };
import {
  getLogigrammeStartNode,
  getLogigrammeWalkthrough,
  getOutgoingEdges,
} from "./logigramme-domain.ts";
import { buildLogigrammeGeometry, logigrammeEdgePath } from "./logigramme-layout.ts";
import { findLogigramme, findLogigrammeForBloc, LOGIGRAMMES } from "./logigramme-registry.ts";
import { parseLogigramme } from "./logigramme-schema.ts";
import { findCompetency, findDocument, findKnowledge } from "../library/library-catalog.ts";
import { getRoadmapParcours } from "../roadmap-registry.ts";

const logigramme = findLogigramme("bloc-05")!;
const geometry = buildLogigrammeGeometry(logigramme);

const componentSource = (name: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../components/logigramme/${name}`, import.meta.url)),
    "utf8",
  );

/** Copie profonde des données brutes, pour éprouver le schéma sur un cas faux. */
const rawCopy = () => JSON.parse(JSON.stringify(blocFiveInput)) as Record<string, unknown>;

test("le logigramme du bloc 5 décrit une mission entière, du départ à la disponibilité", () => {
  assert.equal(LOGIGRAMMES.length, 1);
  assert.equal(findLogigrammeForBloc("bloc-05")?.id, "bloc-05");
  assert.equal(findLogigrammeForBloc("bloc-01"), null);
  assert.equal(getLogigrammeStartNode(logigramme).id, "reception-mission");
  assert.ok(logigramme.nodes.some((node) => node.id === "disponible" && node.kind === "end"));
  // Le parcours part du départ et passe par chaque case : une étape qu'aucun
  // enchaînement n'atteint serait invisible pour qui suit le schéma.
  assert.equal(getLogigrammeWalkthrough(logigramme).length, logigramme.nodes.length);
});

test("la liste des étapes ne présente une case qu'après tout ce qui y mène", () => {
  const walkthrough = getLogigrammeWalkthrough(logigramme);
  const position = new Map(walkthrough.map((node, index) => [node.id, index]));
  assert.equal(new Set(position.keys()).size, logigramme.nodes.length);
  assert.equal(walkthrough[0]!.id, "reception-mission");
  assert.equal(walkthrough.at(-1)!.id, "disponible");

  // Une seule flèche remonte la liste : le retour d'une aggravation vers la
  // décision d'appel. Toute autre inversion signalerait un ordre de lecture
  // qui coupe la mission en deux.
  const backwards = logigramme.edges.filter(
    (edge) => position.get(edge.to)! <= position.get(edge.from)!,
  );
  assert.deepEqual(
    backwards.map((edge) => `${edge.from}→${edge.to}`),
    ["degradation-evolution→uph-15"],
  );
});

test("chaque case ouvre une fiche qui dit quoi faire, dans quel ordre et ce qui se rate", () => {
  for (const node of logigramme.nodes) {
    assert.ok(node.fiche.role.length > 20, `${node.id} : rôle trop court`);
    assert.ok(node.fiche.summary.length > 60, `${node.id} : résumé trop court`);
    assert.ok(node.fiche.checklist.length >= 2, `${node.id} : ordre des gestes manquant`);
    assert.ok(node.fiche.keyPoints.length >= 2, `${node.id} : moins de deux points clés`);
    assert.ok(node.fiche.commonErrors.length >= 1, `${node.id} : aucune erreur fréquente`);
    assert.ok(node.fiche.competencyIds.length >= 1, `${node.id} : aucune compétence`);
    // Le titre de la fiche doit dire l'étape en toutes lettres, là où la case
    // du schéma se contente d'une abréviation tenant en trois lignes.
    assert.ok(
      node.title.length >= node.boardLabel.join(" ").length - 6,
      `${node.id} : titre court`,
    );
  }
});

test("un point clé officiel cite un document indexé, un point interne n'en cite aucun", () => {
  for (const node of logigramme.nodes) {
    for (const point of node.fiche.keyPoints) {
      if (point.provenance === "official") {
        assert.ok(
          findDocument(point.sourceDocumentId!),
          `${node.id} cite un document absent de la bibliothèque : ${point.sourceDocumentId}`,
        );
        assert.ok(point.sourceSection, `${node.id} cite un document sans section`);
      } else {
        assert.equal(point.sourceDocumentId, null, `${node.id} : point interne citant un texte`);
      }
    }
  }
});

test("les renvois des fiches pointent vers des compétences, des thèmes et des parcours réels", () => {
  for (const node of logigramme.nodes) {
    for (const competencyId of node.fiche.competencyIds) {
      assert.ok(findCompetency(competencyId), `${node.id} : compétence inconnue ${competencyId}`);
    }
    if (node.fiche.knowledgeId) {
      assert.ok(
        findKnowledge(node.fiche.knowledgeId),
        `${node.id} : connaissance inconnue ${node.fiche.knowledgeId}`,
      );
    }
    if (node.fiche.parcoursId) {
      assert.ok(
        getRoadmapParcours(node.fiche.parcoursId),
        `${node.id} : parcours inconnu ${node.fiche.parcoursId}`,
      );
    }
  }
});

test("chaque sortie de décision porte son intitulé, et aucune autre flèche n'en porte", () => {
  for (const node of logigramme.nodes) {
    const outgoing = getOutgoingEdges(logigramme, node.id);
    if (node.kind === "decision") {
      assert.ok(outgoing.length >= 2, `${node.id} : une décision ouvre au moins deux suites`);
      assert.ok(
        outgoing.every((edge) => edge.label !== null),
        `${node.id} : sortie sans intitulé`,
      );
    } else {
      assert.ok(
        outgoing.every((edge) => edge.label === null),
        `${node.id} : intitulé hors choix`,
      );
    }
  }
});

test("le schéma refuse une flèche vers une case inconnue", () => {
  const broken = rawCopy();
  (broken.edges as { to: string }[])[0]!.to = "case-qui-nexiste-pas";
  assert.throws(() => parseLogigramme(broken), /case-qui-nexiste-pas/);
});

test("le schéma refuse une décision dont une sortie n'est pas nommée", () => {
  const broken = rawCopy();
  const edges = broken.edges as { from: string; label: string | null }[];
  const branch = edges.find((edge) => edge.from === "uph-15")!;
  branch.label = null;
  assert.throws(() => parseLogigramme(broken), /sans intitulé/);
});

test("le schéma refuse deux cases posées sur la même cellule", () => {
  const broken = rawCopy();
  const nodes = broken.nodes as { id: string; column: number; row: number }[];
  const first = nodes[0]!;
  const second = nodes[1]!;
  second.column = first.column;
  second.row = first.row;
  assert.throws(() => parseLogigramme(broken), /même cellule/);
});

test("le placement tient dans le plan, boucles de retour comprises", () => {
  assert.ok(geometry.width > 0 && geometry.height > 0);
  for (const box of geometry.nodes) {
    assert.ok(box.x >= 0 && box.y >= 0, `${box.node.id} sort du plan par le haut ou par la gauche`);
    assert.ok(box.x + box.width <= geometry.width, `${box.node.id} déborde à droite`);
    assert.ok(box.y + box.height <= geometry.height, `${box.node.id} déborde en bas`);
  }
  for (const edge of geometry.edges) {
    for (const point of edge.points) {
      assert.ok(point.x >= 0 && point.x <= geometry.width, `${edge.id} sort du plan`);
      assert.ok(point.y >= 0 && point.y <= geometry.height, `${edge.id} sort du plan`);
    }
  }
});

test("deux cases ne se recouvrent jamais", () => {
  for (const [index, box] of geometry.nodes.entries()) {
    for (const other of geometry.nodes.slice(index + 1)) {
      const overlaps =
        box.x < other.x + other.width &&
        other.x < box.x + box.width &&
        box.y < other.y + other.height &&
        other.y < box.y + box.height;
      assert.ok(!overlaps, `${box.node.id} recouvre ${other.node.id}`);
    }
  }
});

test("aucune flèche ne traverse une case qu'elle ne relie pas", () => {
  // Une flèche part du bord d'une case et arrive sur le bord d'une autre : la
  // tolérance écarte ces contacts de bord et ne retient que les traversées.
  const inset = 3;
  for (const edge of geometry.edges) {
    for (let index = 0; index < edge.points.length - 1; index += 1) {
      const a = edge.points[index]!;
      const b = edge.points[index + 1]!;
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      for (const box of geometry.nodes) {
        if (box.node.id === edge.from || box.node.id === edge.to) continue;
        const crosses =
          maxX > box.x + inset &&
          minX < box.x + box.width - inset &&
          maxY > box.y + inset &&
          minY < box.y + box.height - inset;
        assert.ok(!crosses, `${edge.id} traverse la case ${box.node.id}`);
      }
    }
  }
});

test("le tracé d'une flèche arrondit chacun de ses angles", () => {
  const straight = logigrammeEdgePath([
    { x: 0, y: 0 },
    { x: 0, y: 100 },
  ]);
  assert.equal(straight, "M 0 0 L 0 100");

  const elbow = logigrammeEdgePath([
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 80, y: 100 },
  ]);
  assert.equal((elbow.match(/Q/g) ?? []).length, 1);
  assert.match(elbow, /^M 0 0 /);
  assert.match(elbow, / 80 100$/);

  const loop = geometry.edges.find((edge) => edge.from === "degradation-evolution")!;
  assert.ok(logigrammeEdgePath(loop.points).length > 0);
  assert.equal(logigrammeEdgePath([{ x: 1, y: 1 }]), "");
});

test("les cases du schéma et de la liste sont des boutons qui ouvrent la fiche", () => {
  for (const file of ["LogigrammeBoard.tsx", "LogigrammeStepList.tsx"]) {
    const source = componentSource(file);
    assert.match(source, /type="button"/, `${file} : case qui n'est pas un bouton`);
    assert.match(source, /aria-haspopup="dialog"/, `${file} : clic sans dialogue annoncé`);
    assert.match(source, /onSelectNode\(/, `${file} : clic sans sélection`);
    assert.match(source, /aria-label=/, `${file} : bouton sans intitulé accessible`);
  }
  // Le SVG ne porte aucune information que la fiche ne redonne pas : il est
  // masqué aux lecteurs d'écran, qui suivent les boutons et les suites.
  assert.match(componentSource("LogigrammeBoard.tsx"), /aria-hidden="true"/);
});

test("la fiche annonce sa provenance et reste navigable de sortie en sortie", () => {
  const source = componentSource("LogigrammeFicheDialog.tsx");
  assert.match(source, /DialogTitle/);
  assert.match(source, /DialogDescription/);
  assert.match(source, /LOGIGRAMME_POINT_PROVENANCE_LABELS/);
  assert.match(source, /Relecture formateur en attente/);
  assert.match(source, /getOutgoingEdges/);
  assert.match(componentSource("LogigrammeView.tsx"), /aria-pressed=/);
});
