/**
 * Placement du schéma — fonctions pures, aucun DOM.
 *
 * Les données du logigramme ne portent qu'une grille : une colonne et une
 * ligne par case. Ce module en tire des pixels : la position de chaque case,
 * le tracé de chaque flèche, et la taille du plan qui les contient. Le calcul
 * est séparé du composant pour une raison simple — une flèche qui traverse une
 * case ou une case posée hors du plan se voient dans un test, pas dans un
 * rendu React.
 *
 * Le repère final commence toujours en haut à gauche, marge comprise : les
 * couloirs de retour passent à gauche de la première colonne, donc en
 * coordonnées négatives, et tout est ramené dans le plan à la fin.
 */

import type { Logigramme, LogigrammeEdgeTone, LogigrammeNode } from "./logigramme-domain.ts";

export const LOGIGRAMME_LAYOUT = {
  /** Largeur d'une cellule de la grille. */
  columnWidth: 212,
  /** Hauteur d'une cellule de la grille. */
  rowHeight: 126,
  /** Largeur d'une case, centrée dans sa cellule. */
  nodeWidth: 172,
  /** Hauteur d'une case. */
  nodeHeight: 82,
  /** Marge entre le plan et ce qu'il contient. */
  padding: 28,
  /** Rayon des angles d'une flèche coudée. */
  cornerRadius: 14,
} as const;

export interface LogigrammePoint {
  x: number;
  y: number;
}

export interface LogigrammeNodeBox {
  node: LogigrammeNode;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface LogigrammeEdgeGeometry {
  id: string;
  from: string;
  to: string;
  label: string | null;
  tone: LogigrammeEdgeTone;
  points: LogigrammePoint[];
  /** Où poser l'intitulé « Oui » / « Non » : au milieu du premier segment. */
  labelX: number;
  labelY: number;
}

export interface LogigrammeGeometry {
  width: number;
  height: number;
  nodes: LogigrammeNodeBox[];
  edges: LogigrammeEdgeGeometry[];
}

const { columnWidth, rowHeight, nodeWidth, nodeHeight, padding } = LOGIGRAMME_LAYOUT;

function boxFor(node: LogigrammeNode): LogigrammeNodeBox {
  const centerX = node.column * columnWidth + columnWidth / 2;
  const centerY = node.row * rowHeight + rowHeight / 2;
  return {
    node,
    x: centerX - nodeWidth / 2,
    y: centerY - nodeHeight / 2,
    width: nodeWidth,
    height: nodeHeight,
    centerX,
    centerY,
  };
}

/** Le point du bord d'une case par lequel une flèche entre ou sort. */
function anchor(
  box: LogigrammeNodeBox,
  side: "top" | "bottom" | "left" | "right",
): LogigrammePoint {
  switch (side) {
    case "top":
      return { x: box.centerX, y: box.y };
    case "bottom":
      return { x: box.centerX, y: box.y + box.height };
    case "left":
      return { x: box.x, y: box.centerY };
    case "right":
      return { x: box.x + box.width, y: box.centerY };
  }
}

function verticalSide(from: LogigrammeNodeBox, to: LogigrammeNodeBox) {
  return to.centerY > from.centerY
    ? ({ exit: "bottom", enter: "top" } as const)
    : ({ exit: "top", enter: "bottom" } as const);
}

function horizontalSide(from: LogigrammeNodeBox, to: LogigrammeNodeBox) {
  return to.centerX > from.centerX
    ? ({ exit: "right", enter: "left" } as const)
    : ({ exit: "left", enter: "right" } as const);
}

function directPoints(from: LogigrammeNodeBox, to: LogigrammeNodeBox): LogigrammePoint[] {
  if (Math.abs(from.centerX - to.centerX) < 1) {
    const sides = verticalSide(from, to);
    return [anchor(from, sides.exit), anchor(to, sides.enter)];
  }
  if (Math.abs(from.centerY - to.centerY) < 1) {
    const sides = horizontalSide(from, to);
    return [anchor(from, sides.exit), anchor(to, sides.enter)];
  }
  return elbowVerticalFirst(from, to);
}

/** On descend (ou on monte) d'abord, puis on rejoint la case par le côté. */
function elbowVerticalFirst(from: LogigrammeNodeBox, to: LogigrammeNodeBox): LogigrammePoint[] {
  const vertical = verticalSide(from, to);
  const horizontal = horizontalSide(from, to);
  const start = anchor(from, vertical.exit);
  const end = anchor(to, horizontal.enter);
  return [start, { x: start.x, y: end.y }, end];
}

/** On part sur le côté, puis on rejoint la case par le haut ou par le bas. */
function elbowHorizontalFirst(from: LogigrammeNodeBox, to: LogigrammeNodeBox): LogigrammePoint[] {
  const horizontal = horizontalSide(from, to);
  const vertical = verticalSide(from, to);
  const start = anchor(from, horizontal.exit);
  const end = anchor(to, vertical.enter);
  return [start, { x: end.x, y: start.y }, end];
}

/**
 * Le retour en arrière. Il sort par le côté qui regarde le couloir, remonte
 * dans ce couloir, puis entre dans la case par le même côté : aucune case
 * n'est traversée, parce que le couloir est une colonne vide de la grille.
 */
function loopPoints(
  from: LogigrammeNodeBox,
  to: LogigrammeNodeBox,
  lane: number,
): LogigrammePoint[] {
  const laneX = lane * columnWidth + columnWidth / 2;
  const side = laneX < from.centerX ? "left" : "right";
  const start = anchor(from, side);
  const end = anchor(to, side);
  return [start, { x: laneX, y: start.y }, { x: laneX, y: end.y }, end];
}

/**
 * Transforme la grille en pixels.
 *
 * Le résultat est complet : il n'y a rien à calculer dans le composant, qui se
 * contente de poser les cases aux coordonnées reçues et de tracer les chemins.
 */
export function buildLogigrammeGeometry(logigramme: Logigramme): LogigrammeGeometry {
  const boxes = new Map(logigramme.nodes.map((node) => [node.id, boxFor(node)]));

  const edges: LogigrammeEdgeGeometry[] = logigramme.edges.map((edge) => {
    const from = boxes.get(edge.from);
    const to = boxes.get(edge.to);
    if (!from || !to) {
      throw new Error(`Flèche vers un nœud inconnu : ${edge.from} → ${edge.to}`);
    }

    const points =
      edge.shape === "loop" && edge.lane !== null
        ? loopPoints(from, to, edge.lane)
        : edge.shape === "elbow-vh"
          ? elbowVerticalFirst(from, to)
          : edge.shape === "elbow-hv"
            ? elbowHorizontalFirst(from, to)
            : directPoints(from, to);

    const [first, second] = points;
    return {
      id: `${edge.from}--${edge.to}`,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      tone: edge.tone,
      points,
      labelX: (first!.x + second!.x) / 2,
      labelY: (first!.y + second!.y) / 2,
    };
  });

  // Les couloirs de retour passent à gauche de la première colonne : sans ce
  // recalage, la moitié d'une boucle sortirait du plan et serait rognée.
  const xs = [
    ...[...boxes.values()].flatMap((box) => [box.x, box.x + box.width]),
    ...edges.flatMap((edge) => edge.points.map((point) => point.x)),
  ];
  const ys = [
    ...[...boxes.values()].flatMap((box) => [box.y, box.y + box.height]),
    ...edges.flatMap((edge) => edge.points.map((point) => point.y)),
  ];
  const offsetX = padding - Math.min(...xs);
  const offsetY = padding - Math.min(...ys);

  return {
    width: Math.max(...xs) - Math.min(...xs) + padding * 2,
    height: Math.max(...ys) - Math.min(...ys) + padding * 2,
    nodes: [...boxes.values()].map((box) => ({
      ...box,
      x: box.x + offsetX,
      y: box.y + offsetY,
      centerX: box.centerX + offsetX,
      centerY: box.centerY + offsetY,
    })),
    edges: edges.map((edge) => ({
      ...edge,
      points: edge.points.map((point) => ({ x: point.x + offsetX, y: point.y + offsetY })),
      labelX: edge.labelX + offsetX,
      labelY: edge.labelY + offsetY,
    })),
  };
}

function shorten(from: LogigrammePoint, to: LogigrammePoint, distance: number): LogigrammePoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { ...to };
  const ratio = Math.min(distance, length / 2) / length;
  return { x: from.x + dx * ratio, y: from.y + dy * ratio };
}

/**
 * Le chemin SVG d'une flèche, angles arrondis.
 *
 * Chaque angle est coupé à `radius` de part et d'autre, et rejoint par une
 * courbe quadratique dont le point de contrôle est l'angle lui-même — le tracé
 * reste orthogonal, sans la dureté d'un angle droit.
 */
export function logigrammeEdgePath(
  points: LogigrammePoint[],
  radius = LOGIGRAMME_LAYOUT.cornerRadius,
): string {
  if (points.length < 2) return "";
  const [start, ...rest] = points;
  const commands = [`M ${round(start!.x)} ${round(start!.y)}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]!;
    const corner = points[index]!;
    const next = points[index + 1]!;
    const entry = shorten(corner, previous, radius);
    const exit = shorten(corner, next, radius);
    commands.push(`L ${round(entry.x)} ${round(entry.y)}`);
    commands.push(`Q ${round(corner.x)} ${round(corner.y)} ${round(exit.x)} ${round(exit.y)}`);
  }

  const end = rest.at(-1)!;
  commands.push(`L ${round(end.x)} ${round(end.y)}`);
  return commands.join(" ");
}

const round = (value: number) => Math.round(value * 100) / 100;
