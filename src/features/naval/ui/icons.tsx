/**
 * Icônes dessinées pour Naval Battles (SVG), dans la palette du jeu :
 * or, bois, bleu océan. Les dégradés ont des identifiants uniques par icône
 * pour pouvoir afficher plusieurs icônes identiques sur un même écran.
 */

import { useId, type SVGProps } from "react";
import { SHIP_CLASSES, type AmmoId, type ShipClassId } from "../sim/defs.ts";
import type { UpgradeId } from "../sim/upgrades.ts";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number | undefined, props: SVGProps<SVGSVGElement>) {
  return {
    width: size ?? 24,
    height: size ?? 24,
    viewBox: "0 0 64 64",
    "aria-hidden": true,
    ...props,
  };
}

export function CoinIcon({ size, ...p }: IconProps) {
  const id = useId();
  return (
    <svg {...base(size, p)}>
      <defs>
        <radialGradient id={`${id}g`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#f2c14e" />
          <stop offset="1" stopColor="#a86b12" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill={`url(#${id}g)`} stroke="#6e4308" strokeWidth="3" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="#a86b12" strokeWidth="2.5" opacity="0.8" />
      <path d="M24 22l16 20M40 22L24 42" stroke="#8a560c" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill="#fff0b0" />
    </svg>
  );
}

export function GemIcon({ size, ...p }: IconProps) {
  const id = useId();
  return (
    <svg {...base(size, p)}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1d3ff" />
          <stop offset="0.5" stopColor="#b064f5" />
          <stop offset="1" stopColor="#5a1fa8" />
        </linearGradient>
      </defs>
      <path
        d="M14 22l8-10h20l8 10-18 32z"
        fill={`url(#${id}g)`}
        stroke="#3e1478"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 22h36M22 12l10 10 10-10M32 22v32M22 22l10 32 10-32"
        stroke="#f6e6ff"
        strokeWidth="1.6"
        opacity="0.7"
        fill="none"
      />
    </svg>
  );
}

export function GearIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path
        d="M32 20a12 12 0 100 24 12 12 0 000-24zm22 15.5v-7l-6.4-1.3a17 17 0 00-1.8-4.3l3.6-5.4-5-5-5.4 3.6a17 17 0 00-4.3-1.8L33.5 8h-7l-1.3 6.3a17 17 0 00-4.3 1.8l-5.4-3.6-5 5 3.6 5.4a17 17 0 00-1.8 4.3L6 28.5v7l6.3 1.3a17 17 0 001.8 4.3l-3.6 5.4 5 5 5.4-3.6a17 17 0 004.3 1.8L26.5 56h7l1.3-6.3a17 17 0 004.3-1.8l5.4 3.6 5-5-3.6-5.4a17 17 0 001.8-4.3z"
        fill="#f3c25b"
        stroke="#7a5212"
        strokeWidth="2"
      />
      <circle cx="32" cy="32" r="6" fill="#1a2438" />
    </svg>
  );
}

export function ScrollIcon({ size, ...p }: IconProps) {
  const id = useId();
  return (
    <svg {...base(size, p)}>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c98f3a" />
          <stop offset="0.5" stopColor="#f6d58e" />
          <stop offset="1" stopColor="#c98f3a" />
        </linearGradient>
      </defs>
      <g transform="rotate(-28 32 32)">
        <rect
          x="14"
          y="16"
          width="36"
          height="32"
          rx="3"
          fill={`url(#${id}p)`}
          stroke="#7a4a14"
          strokeWidth="2"
        />
        <rect
          x="9"
          y="12"
          width="10"
          height="40"
          rx="5"
          fill="#e2b061"
          stroke="#7a4a14"
          strokeWidth="2"
        />
        <rect
          x="45"
          y="12"
          width="10"
          height="40"
          rx="5"
          fill="#e2b061"
          stroke="#7a4a14"
          strokeWidth="2"
        />
        <path d="M22 26h20M22 32h16M22 38h18" stroke="#8a5a20" strokeWidth="2" opacity="0.6" />
      </g>
      <circle cx="38" cy="40" r="9" fill="#b3191c" stroke="#6b0b0d" strokeWidth="2" />
      <circle cx="38" cy="40" r="4.5" fill="none" stroke="#e8585a" strokeWidth="1.6" />
    </svg>
  );
}

export function HelmIcon({ size, ...p }: IconProps) {
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <svg {...base(size, p)}>
      {spokes.map((a) => (
        <g key={a}>
          <line
            x1={32}
            y1={32}
            x2={32 + Math.cos(a) * 28}
            y2={32 + Math.sin(a) * 28}
            stroke="#f3c25b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={32 + Math.cos(a) * 28} cy={32 + Math.sin(a) * 28} r="3.4" fill="#f3c25b" />
        </g>
      ))}
      <circle cx="32" cy="32" r="19" fill="none" stroke="#f3c25b" strokeWidth="4.5" />
      <circle cx="32" cy="32" r="7" fill="#f3c25b" stroke="#8a5a12" strokeWidth="2" />
    </svg>
  );
}

export function CannonIcon({ size, ...p }: IconProps) {
  const id = useId();
  return (
    <svg {...base(size, p)}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.5" stopColor="#e3a93a" />
          <stop offset="1" stopColor="#8f5c10" />
        </linearGradient>
        <radialGradient id={`${id}f`} cx="0.3" cy="0.5" r="0.7">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="0.4" stopColor="#ffc95a" />
          <stop offset="1" stopColor="#ff7a1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M48 20l14-8-6 12 8 2-12 4z" fill={`url(#${id}f)`} />
      <path
        d="M8 34l38-14 4 9-36 13z"
        fill={`url(#${id}b)`}
        stroke="#6a420c"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect
        x="44"
        y="18"
        width="6"
        height="13"
        rx="2"
        transform="rotate(-20 47 24)"
        fill="#c58a28"
        stroke="#6a420c"
        strokeWidth="2"
      />
      <path d="M12 40h22l4 8H10z" fill="#8a5a28" stroke="#4e3014" strokeWidth="2" />
      <circle cx="16" cy="50" r="6" fill="#d9a441" stroke="#6a420c" strokeWidth="2" />
      <circle cx="32" cy="50" r="6" fill="#d9a441" stroke="#6a420c" strokeWidth="2" />
    </svg>
  );
}

export function HammerIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M30 30l-18 18a4 4 0 006 6l18-18z" fill="#b07a3c" stroke="#5a3a18" strokeWidth="2" />
      <path
        d="M26 16l12-6 16 16-6 12-6-6-6 6-6-6 6-6z"
        fill="#cfd6df"
        stroke="#4a5260"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FlameIcon({ size, ...p }: IconProps) {
  const id = useId();
  return (
    <svg {...base(size, p)}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#c81d0f" />
          <stop offset="0.5" stopColor="#ff8a1e" />
          <stop offset="1" stopColor="#ffe17a" />
        </linearGradient>
      </defs>
      <path
        d="M32 6c4 12 16 16 16 32a16 16 0 01-32 0c0-8 4-12 6-16 2 6 4 8 6 8-2-10 0-18 4-24z"
        fill={`url(#${id}g)`}
      />
    </svg>
  );
}

export function SailIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M30 6v52" stroke="#c7a46a" strokeWidth="3" />
      <path
        d="M12 14h36c-4 8-4 16 0 24H12c4-8 4-16 0-24z"
        fill="#f2ecdc"
        stroke="#8a7a5a"
        strokeWidth="2"
      />
      <path d="M14 42h32l-4 8H18z" fill="#6b4626" />
    </svg>
  );
}

export function StarIcon({ size, filled = true, ...p }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size, p)}>
      <path
        d="M32 6l7.6 16.4 17.9 2-13.3 12.2 3.7 17.7L32 45.4l-15.9 8.9 3.7-17.7L6.5 24.4l17.9-2z"
        fill={filled ? "#f6c64f" : "rgba(255,255,255,0.08)"}
        stroke={filled ? "#8a5a12" : "rgba(243,194,91,0.5)"}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M20 28v-8a12 12 0 0124 0v8" fill="none" stroke="#c9b48a" strokeWidth="5" />
      <rect
        x="14"
        y="28"
        width="36"
        height="28"
        rx="5"
        fill="#8a6a3a"
        stroke="#4e3a1a"
        strokeWidth="2"
      />
      <circle cx="32" cy="40" r="4" fill="#2a1e10" />
      <path d="M32 42v7" stroke="#2a1e10" strokeWidth="3" />
    </svg>
  );
}

export function SkullIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path
        d="M10 52l44-36M54 52L10 16"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="28" rx="15" ry="14" fill="currentColor" />
      <rect x="23" y="36" width="18" height="10" rx="3" fill="currentColor" />
      <ellipse cx="26" cy="28" rx="4.5" ry="5" fill="#141018" />
      <ellipse cx="38" cy="28" rx="4.5" ry="5" fill="#141018" />
      <path d="M32 33l-2 4h4z" fill="#141018" />
    </svg>
  );
}

export function AnchorIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <circle cx="32" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="4" />
      <path
        d="M32 17v38M22 26h20M10 38c2 10 12 17 22 17s20-7 22-17"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path d="M6 40l6-6 4 8zM58 40l-6-6-4 8z" fill="currentColor" />
    </svg>
  );
}

/** Munitions : chaque projectile est reconnaissable d'un coup d'œil. */
export function AmmoIcon({ ammo, size, ...p }: IconProps & { ammo: AmmoId }) {
  const id = useId();
  const ball = (cx: number, cy: number, r: number) => (
    <circle cx={cx} cy={cy} r={r} fill={`url(#${id}i)`} stroke="#0a0a0c" strokeWidth="1.5" />
  );
  return (
    <svg {...base(size, p)}>
      <defs>
        <radialGradient id={`${id}i`} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#8c95a6" />
          <stop offset="0.5" stopColor="#3a3f4a" />
          <stop offset="1" stopColor="#101216" />
        </radialGradient>
      </defs>
      {ammo === "boulet" && ball(32, 34, 17)}
      {ammo === "chaine" && (
        <>
          {ball(16, 44, 10)}
          {ball(48, 20, 10)}
          <path
            d="M23 38l3-3m3-3l3-3m3-3l3-3"
            stroke="#c9c2b0"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
      {ammo === "mitraille" && (
        <>
          {ball(22, 24, 8)}
          {ball(40, 22, 8)}
          {ball(18, 40, 8)}
          {ball(34, 38, 8)}
          {ball(48, 40, 7)}
          {ball(30, 52, 7)}
        </>
      )}
      {ammo === "feu" && (
        <>
          {ball(30, 38, 15)}
          <path
            d="M40 30c2-6 0-12-4-18 8 4 14 12 12 20-1 4-4 6-8 6 2-2 2-5 0-8z"
            fill="#ff8a1e"
            stroke="#c8301a"
            strokeWidth="1.5"
          />
          <path d="M42 30c1-3 0-6-2-9 4 3 5 7 4 10z" fill="#ffe17a" />
        </>
      )}
    </svg>
  );
}

/** Silhouettes des classes de navires (vue de profil). */
export function ShipSilhouette({ cls, size, ...p }: IconProps & { cls: ShipClassId }) {
  const masts: Record<ShipClassId, number[]> = {
    galion: [22, 34, 46],
    cotre: [34],
    brick: [26, 42],
    fregate: [20, 32, 45],
    brulot: [32],
    galiote: [28, 42],
  };
  // Couleurs lues dans la définition du navire : une seule source de vérité.
  const look = SHIP_CLASSES[cls].look;
  const sail = look.sail;
  const flag =
    look.flag === "pavillon-gouverneur"
      ? "#1b3a7a"
      : look.flag === "pavillon-noir"
        ? "#0c0c0f"
        : null;
  const xs = masts[cls];
  return (
    <svg {...base(size, p)}>
      {xs.map((x, i) => (
        <g key={x}>
          <line
            x1={x}
            y1={44}
            x2={x}
            y2={i === Math.floor(xs.length / 2) ? 8 : 13}
            stroke="#4a3220"
            strokeWidth="2"
          />
          <path
            d={`M${x - 8} ${i === Math.floor(xs.length / 2) ? 12 : 16}h16c-2 5-2 10 0 14h-16c2-4 2-9 0-14z`}
            fill={sail}
            stroke="#2a1a10"
            strokeWidth="1.2"
          />
          <path
            d={`M${x - 7} 32h14c-1.5 3-1.5 6 0 9h-14c1.5-3 1.5-6 0-9z`}
            fill={sail}
            stroke="#2a1a10"
            strokeWidth="1.2"
          />
        </g>
      ))}
      {cls === "brulot" && (
        <path d="M26 30c2-6 6-8 6-14 4 6 8 8 6 16z" fill="#ff8a1e" opacity="0.9" />
      )}
      {cls === "galiote" && <rect x="12" y="38" width="8" height="5" rx="2" fill="#2a2a2e" />}
      {flag && (
        <path
          d={`M${xs[Math.floor(xs.length / 2)]} 8h9l-2 3 2 3h-9z`}
          fill={flag}
          stroke={look.flag === "pavillon-gouverneur" ? "#e3b64c" : "#f1ead8"}
          strokeWidth="0.8"
        />
      )}
      <path d="M6 44h52l-6 12H14z" fill={look.hull} stroke="#0d0a08" strokeWidth="1.5" />
      <path d="M8 46h48" stroke={look.trim} strokeWidth="1.8" />
    </svg>
  );
}

export function UpgradeIcon({ id: upgrade, size, ...p }: IconProps & { id: UpgradeId }) {
  switch (upgrade) {
    case "calibre":
      return <CannonIcon size={size} {...p} />;
    case "cadence":
      return (
        <svg {...base(size, p)}>
          <path d="M18 8h28M18 56h28" stroke="#c99a3c" strokeWidth="5" strokeLinecap="round" />
          <path
            d="M20 10c0 14 24 14 24 22S20 40 20 54h24c0-14-24-14-24-22s24-8 24-22z"
            fill="#e9dcc0"
            stroke="#7a5a2a"
            strokeWidth="2.5"
          />
          <path d="M26 48h12l-6-8z" fill="#d8a84a" />
        </svg>
      );
    case "portee":
      return (
        <svg {...base(size, p)}>
          <rect
            x="6"
            y="28"
            width="22"
            height="12"
            rx="3"
            transform="rotate(-20 17 34)"
            fill="#c99a3c"
            stroke="#6a420c"
            strokeWidth="2"
          />
          <rect
            x="24"
            y="20"
            width="18"
            height="14"
            rx="3"
            transform="rotate(-20 33 27)"
            fill="#e3b45a"
            stroke="#6a420c"
            strokeWidth="2"
          />
          <rect
            x="40"
            y="12"
            width="18"
            height="18"
            rx="4"
            transform="rotate(-20 49 21)"
            fill="#8a5a28"
            stroke="#4e3014"
            strokeWidth="2"
          />
          <circle cx="51" cy="19" r="5" fill="#9fd3ff" stroke="#4e3014" strokeWidth="1.5" />
        </svg>
      );
    case "pointage":
      return (
        <svg {...base(size, p)}>
          <circle cx="32" cy="32" r="22" fill="none" stroke="#f3c25b" strokeWidth="4" />
          <circle cx="32" cy="32" r="12" fill="none" stroke="#f3c25b" strokeWidth="3" />
          <circle cx="32" cy="32" r="4" fill="#ff5a4a" />
          <path d="M32 4v14M32 46v14M4 32h14M46 32h14" stroke="#f3c25b" strokeWidth="3" />
        </svg>
      );
    case "coque":
      return (
        <svg {...base(size, p)}>
          <path
            d="M32 6l22 8v16c0 14-10 22-22 28C20 52 10 44 10 30V14z"
            fill="#7a4e26"
            stroke="#3e2812"
            strokeWidth="2.5"
          />
          <path d="M14 22h36M12 32h40M16 42h32" stroke="#4e3014" strokeWidth="2" />
          <path d="M32 6l22 8v16c0 14-10 22-22 28" fill="none" stroke="#f3c25b" strokeWidth="2.5" />
        </svg>
      );
    case "poudre":
      return (
        <svg {...base(size, p)}>
          <ellipse cx="32" cy="14" rx="16" ry="5" fill="#9a6a34" stroke="#4e3014" strokeWidth="2" />
          <path
            d="M16 14c-3 12-3 24 0 36h32c3-12 3-24 0-36"
            fill="#b07a3c"
            stroke="#4e3014"
            strokeWidth="2"
          />
          <path d="M15 24h34M15 40h34" stroke="#3a3a40" strokeWidth="3.5" />
          <ellipse cx="32" cy="50" rx="16" ry="5" fill="#7a4e26" stroke="#4e3014" strokeWidth="2" />
          <path d="M26 30l6-6 6 6-6 6z" fill="#ff8a1e" />
        </svg>
      );
    case "charpentiers":
      return <HammerIcon size={size} {...p} />;
  }
}

/** Emblème du capitaine : pavillon noir dans un médaillon doré. */
export function CaptainEmblem({ size = 64 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9a6" />
          <stop offset="0.5" stopColor="#d49a32" />
          <stop offset="1" stopColor="#7a4e10" />
        </linearGradient>
        <radialGradient id={`${id}b`} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#2a3f66" />
          <stop offset="1" stopColor="#0b1428" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${id}r)`} />
      <circle cx="32" cy="32" r="25.5" fill={`url(#${id}b)`} stroke="#5a3a0c" strokeWidth="1.5" />
      <g transform="translate(14 14) scale(0.56)" color="#f1ead8">
        <SkullIcon size={64} />
      </g>
    </svg>
  );
}
