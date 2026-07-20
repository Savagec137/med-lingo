import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useProgress } from "@/lib/use-progress";
import { useAuth } from "@/lib/use-auth";
import { useChest } from "@/lib/use-chest";
import { ChestOpeningModal } from "@/components/ChestOpeningModal";
import topBarSrc from "@/assets/top-bar-source.png";

// Full source image is 768x1376. The pill bar occupies roughly the top 160px.
// We show it via a container with matching aspect ratio (768 / 160 = 4.8)
// and background-size: 100% auto so only the top strip is visible.
const BAR_ASPECT = 768 / 160;

export function TopBar() {
  const { progress, hydrated } = useProgress();
  const { user } = useAuth();
  const chest = useChest();

  const lastZeroRef = useRef(false);
  useEffect(() => {
    if (!user || !hydrated) return;
    const isZero = progress.hearts <= 0;
    if (isZero && !lastZeroRef.current) {
      lastZeroRef.current = true;
      chest.claimCompensation();
    } else if (!isZero) {
      lastZeroRef.current = false;
    }
  }, [progress.hearts, user, hydrated, chest]);

  return (
    <header className="sticky top-0 z-20 w-full">
      <div className="mx-auto w-full max-w-3xl px-2 pt-2">
        <div
          role="navigation"
          aria-label="Barre supérieure"
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: `${BAR_ASPECT}`,
            backgroundImage: `url(${topBarSrc})`,
            backgroundSize: "100% auto",
            backgroundPosition: "top left",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Overlay 4 transparent hit zones matching the pills */}
          <div className="absolute inset-0 grid grid-cols-4">
            <Link to="/boutique" aria-label="Pièces" className="press" />
            <Link to="/boutique" aria-label="Gemmes" className="press" />
            <Link to="/boutique" aria-label="Énergie" className="press" />
            <Link to="/profil" aria-label="Profil" className="press" />
          </div>
        </div>
      </div>
      <ChestOpeningModal result={chest.pending} onClose={chest.close} />
    </header>
  );
}
