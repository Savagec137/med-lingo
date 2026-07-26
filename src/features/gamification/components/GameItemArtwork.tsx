import { BadgeIcon, ShopItemIcon } from "@/lib/icon-map";
import { SHOP_IMAGE } from "@/lib/asset-map";
import { ShopItemArtwork } from "@/features/gamification/components/ShopItemArtwork";

type GameItemArtworkProps = {
  code: string;
  type?: string;
  label?: string;
  className?: string;
  fallbackClassName?: string;
};

export function GameItemArtwork({
  code,
  type,
  label = "",
  className = "h-20 w-20 rounded-2xl",
  fallbackClassName = "h-full w-full object-contain",
}: GameItemArtworkProps) {
  const image = SHOP_IMAGE[code];

  return (
    <ShopItemArtwork
      code={code}
      className={className}
      fallback={
        image ? (
          <img
            src={image}
            alt={label}
            loading="lazy"
            decoding="async"
            className={fallbackClassName}
          />
        ) : type === "badge" ? (
          <BadgeIcon code={code} className={fallbackClassName} strokeWidth={2.25} />
        ) : (
          <ShopItemIcon code={code} type={type} className={fallbackClassName} strokeWidth={2.25} />
        )
      }
    />
  );
}
