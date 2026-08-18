/**
 * Des points normalisés vers un chemin SVG.
 *
 * Le moteur rend un tracé sous forme de nombres entre -1 et 1 : sans unité, sans
 * valeur, sans rien qui puisse trahir une constante. Ce module en fait une
 * courbe, et c'est tout ce qu'il fait.
 *
 * Le repère est inversé : un point à +1 est un pic, donc en **haut** de l'écran,
 * alors que l'axe vertical d'un SVG descend.
 */
export function tracePath(points: readonly number[], height = 40): string {
  if (points.length < 2) return "";
  const step = 100 / (points.length - 1);
  return points
    .map((value, index) => {
      const x = (index * step).toFixed(2);
      const y = (height / 2 - (value * height) / 2.4).toFixed(2);
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}
