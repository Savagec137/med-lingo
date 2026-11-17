import type { Pose } from "../soldiers";

/**
 * Personnage compressé pour la foule : chaque niveau de détail est un tampon
 * binaire en base64 (positions int16, normales int8, membres, matières, et
 * coordonnées de texture ou couleurs cuites). Décodé par `characters.ts`.
 */
export interface PackedLod {
  vertices: number;
  triangles: number;
  /** "uv" : le niveau se colore avec la texture ; "color" : couleurs cuites dans les sommets. */
  mode: "uv" | "color";
  data: string;
}

export interface PackedCharacter {
  /** Hauteur du modèle, plumet compris, en unités du jeu. */
  height: number;
  /** Pivots de l'animation des membres (hanches, épaules, cape). */
  pivots: Pose;
  lods: { high: PackedLod; mid: PackedLod; low: PackedLod };
  /** Texture du niveau proche (JPEG en data URL). */
  texture: string;
}
