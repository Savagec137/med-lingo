import { z } from "zod";
import {
  LOGIGRAMME_EDGE_SHAPES,
  LOGIGRAMME_EDGE_TONES,
  LOGIGRAMME_FICHE_STATUSES,
  LOGIGRAMME_NODE_KINDS,
  LOGIGRAMME_POINT_PROVENANCES,
  type Logigramme,
} from "./logigramme-domain.ts";

const identifier = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "identifiant en minuscules, chiffres et tirets");
const label = z.string().trim().min(1);
const prose = z.string().trim().min(20);

const fichePointSchema = z
  .object({
    text: prose,
    provenance: z.enum(LOGIGRAMME_POINT_PROVENANCES),
    sourceDocumentId: identifier.nullable(),
    sourceSection: label.nullable(),
  })
  .superRefine((point, context) => {
    // Un point officiel sans document ni section n'est pas vérifiable : il se
    // lirait comme une obligation légale que personne ne peut retrouver.
    if (point.provenance === "official" && (!point.sourceDocumentId || !point.sourceSection)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceDocumentId"],
        message: "Un point officiel cite le document indexé et la section exacte.",
      });
    }
    // Et l'inverse compte autant : une affirmation MedLingo qui emprunte un
    // texte officiel lui ferait dire ce qu'il ne dit pas.
    if (point.provenance === "internal" && point.sourceDocumentId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceDocumentId"],
        message: "Un point interne ne cite aucun document officiel.",
      });
    }
  });

const ficheSchema = z.object({
  role: prose,
  summary: prose,
  checklist: z.array(label).min(2),
  keyPoints: z.array(fichePointSchema).min(2),
  commonErrors: z.array(label).min(1),
  competencyIds: z.array(z.string().regex(/^dea\.c\d{2}$/, "compétence au format dea.cNN")).min(1),
  knowledgeId: z.string().min(1).nullable(),
  parcoursId: z.string().min(1).nullable(),
  status: z.enum(LOGIGRAMME_FICHE_STATUSES),
});

const nodeSchema = z.object({
  id: identifier,
  kind: z.enum(LOGIGRAMME_NODE_KINDS),
  title: label,
  boardLabel: z.array(label).min(1).max(3),
  column: z.number(),
  row: z.number().int().min(0),
  fiche: ficheSchema,
});

const edgeSchema = z
  .object({
    from: identifier,
    to: identifier,
    label: label.nullable(),
    tone: z.enum(LOGIGRAMME_EDGE_TONES),
    shape: z.enum(LOGIGRAMME_EDGE_SHAPES),
    lane: z.number().nullable(),
  })
  .superRefine((edge, context) => {
    if (edge.from === edge.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: `Une flèche ne peut pas revenir sur son propre nœud : ${edge.from}.`,
      });
    }
    // Le couloir n'a de sens que pour une boucle : ailleurs il décrirait un
    // détour que le tracé n'emprunte pas.
    if ((edge.shape === "loop") !== (edge.lane !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lane"],
        message: "Seule une flèche `loop` emprunte un couloir, et elle en déclare toujours un.",
      });
    }
  });

const logigrammeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifier,
    blocId: identifier,
    deaBlocId: z.string().regex(/^dea\.bloc-\d{2}$/, "bloc du diplôme au format dea.bloc-NN"),
    title: label,
    subtitle: label,
    description: prose,
    sourceNote: prose,
    nodes: z.array(nodeSchema).min(2),
    edges: z.array(edgeSchema).min(1),
  })
  .superRefine((logigramme, context) => {
    const fail = (message: string, path: (string | number)[] = []) =>
      context.addIssue({ code: z.ZodIssueCode.custom, path, message });

    const nodesById = new Map<string, (typeof logigramme.nodes)[number]>();
    const cells = new Map<string, string>();
    for (const [index, node] of logigramme.nodes.entries()) {
      if (nodesById.has(node.id)) fail(`Nœud déclaré deux fois : ${node.id}.`, ["nodes", index]);
      nodesById.set(node.id, node);

      // Deux cases sur la même cellule se superposeraient à l'écran, et la
      // seconde deviendrait incliquable sans qu'aucun test ne le remarque.
      const cell = `${node.column}:${node.row}`;
      const occupant = cells.get(cell);
      if (occupant) {
        fail(`${node.id} occupe la même cellule que ${occupant}.`, ["nodes", index, "column"]);
      }
      cells.set(cell, node.id);
    }

    const starts = logigramme.nodes.filter((node) => node.kind === "start");
    if (starts.length !== 1) fail("Un logigramme a exactement un nœud de départ.", ["nodes"]);
    if (!logigramme.nodes.some((node) => node.kind === "end")) {
      fail("Un logigramme a au moins une fin de mission.", ["nodes"]);
    }

    const seenEdges = new Set<string>();
    const outgoing = new Map<string, number>();
    const incoming = new Map<string, number>();
    for (const [index, edge] of logigramme.edges.entries()) {
      if (!nodesById.has(edge.from)) fail(`Nœud inconnu : ${edge.from}.`, ["edges", index, "from"]);
      if (!nodesById.has(edge.to)) fail(`Nœud inconnu : ${edge.to}.`, ["edges", index, "to"]);

      const key = `${edge.from}→${edge.to}`;
      if (seenEdges.has(key)) fail(`Flèche déclarée deux fois : ${key}.`, ["edges", index]);
      seenEdges.add(key);

      outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);

      const source = nodesById.get(edge.from);
      if (!source) continue;
      // **La garantie centrale du schéma** : une sortie de losange se lit par
      // son intitulé. Sans lui, deux flèches partent de la même décision sans
      // que rien ne dise laquelle suit un « oui ».
      if (source.kind === "decision" && edge.label === null) {
        fail(`La sortie ${key} quitte une décision sans intitulé.`, ["edges", index, "label"]);
      }
      if (source.kind !== "decision" && edge.label !== null) {
        fail(`La flèche ${key} porte un intitulé alors qu'elle ne suit aucun choix.`, [
          "edges",
          index,
          "label",
        ]);
      }
    }

    for (const [index, node] of logigramme.nodes.entries()) {
      const out = outgoing.get(node.id) ?? 0;
      const into = incoming.get(node.id) ?? 0;
      if (node.kind === "end" && out > 0) fail(`${node.id} est une fin et n'a pas de suite.`);
      if (node.kind !== "end" && out === 0) fail(`${node.id} n'a aucune suite.`, ["nodes", index]);
      if (node.kind === "start" && into > 0) fail(`${node.id} est le départ et ne se vise pas.`);
      if (node.kind !== "start" && into === 0) {
        fail(`${node.id} n'est atteint par aucune flèche.`, ["nodes", index]);
      }
      if (node.kind === "decision" && out < 2) {
        fail(`${node.id} est une décision et ouvre au moins deux suites.`, ["nodes", index]);
      }
    }

    // Une case qu'aucun enchaînement n'atteint est invisible pour le joueur
    // qui suit le schéma, même si elle s'affiche.
    if (starts.length === 1) {
      const reachable = new Set<string>();
      const queue = [starts[0]!.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (reachable.has(current)) continue;
        reachable.add(current);
        for (const edge of logigramme.edges) {
          if (edge.from === current && !reachable.has(edge.to)) queue.push(edge.to);
        }
      }
      for (const node of logigramme.nodes) {
        if (!reachable.has(node.id)) fail(`${node.id} n'est atteignable depuis aucun départ.`);
      }
    }
  });

export type LogigrammeInput = z.input<typeof logigrammeSchema>;

export function parseLogigramme(input: unknown): Logigramme {
  const parsed = logigrammeSchema.parse(input);
  const { schemaVersion: _schemaVersion, ...logigramme } = parsed;
  return logigramme;
}
