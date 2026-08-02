import type { ReactNode } from "react";
import { BACKGROUND_IMAGE, SHOP_IMAGE } from "@/lib/asset-map";

type ShopItemArtworkProps = {
  code: string;
  fallback: ReactNode;
  className?: string;
  alt?: string;
};

/**
 * Rendu unifié des visuels boutique/inventaire : une image individuelle,
 * parfaitement centrée, sans découpe ni débordement.
 */
export function ShopItemArtwork({
  code,
  fallback,
  className = "h-20 w-20",
  alt = "",
}: ShopItemArtworkProps) {
  const background = BACKGROUND_IMAGE[code];
  const image = background ?? SHOP_IMAGE[code];

  if (!image) return <>{fallback}</>;

  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-2xl ${className}`}
      aria-hidden={alt ? undefined : "true"}
    >
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`absolute inset-0 h-full w-full ${
          background ? "object-cover" : "object-contain p-[6%]"
        }`}
      />
    </span>
  );
}
