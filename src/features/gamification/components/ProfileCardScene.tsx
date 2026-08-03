import { memo } from "react";
import type { ProfileCardTheme } from "@/features/gamification/domain/profile-cards";

type SceneProps = {
  theme: ProfileCardTheme;
  accent: string;
  accentAlt: string;
  foreground: string;
  compact?: boolean;
};

/**
 * Décor visuel signature de chaque carte de visite.
 * 100 % présentation : SVG animés, aucune logique métier.
 */
export const ProfileCardScene = memo(function ProfileCardScene({
  theme,
  accent,
  accentAlt,
  foreground,
  compact = false,
}: SceneProps) {
  const opacity = compact ? 0.55 : 0.75;

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[26px]">
      <svg
        viewBox="0 0 420 260"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        style={{ opacity }}
      >
        <defs>
          <linearGradient id={`grad-${theme}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accentAlt} stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id={`glow-${theme}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentAlt} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accentAlt} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Aura diffuse commune */}
        <circle cx="350" cy="40" r="120" fill={`url(#glow-${theme})`} />
        <circle cx="40" cy="240" r="110" fill={`url(#glow-${theme})`} opacity="0.6" />

        {theme === "vitals" && <VitalsScene accent={accent} accentAlt={accentAlt} fg={foreground} />}
        {theme === "helix" && <HelixScene accent={accent} accentAlt={accentAlt} />}
        {theme === "lab" && <LabScene accent={accent} accentAlt={accentAlt} fg={foreground} />}
        {theme === "blueprint" && <BlueprintScene accent={accent} accentAlt={accentAlt} />}
        {theme === "molecule" && <MoleculeScene accent={accent} accentAlt={accentAlt} />}
        {theme === "neural" && <NeuralScene accent={accent} accentAlt={accentAlt} />}
        {theme === "pulse" && <PulseScene accent={accent} accentAlt={accentAlt} />}
        {theme === "deco" && <DecoScene accent={accent} accentAlt={accentAlt} />}
        {theme === "constellation" && <ConstellationScene accent={accent} accentAlt={accentAlt} />}
      </svg>
    </span>
  );
});

/* ---------- Scènes ---------- */

function VitalsScene({ accent, accentAlt, fg }: { accent: string; accentAlt: string; fg: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line
          key={i}
          x1={i * 60}
          y1="0"
          x2={i * 60 - 60}
          y2="260"
          stroke={fg}
          strokeOpacity="0.08"
          strokeWidth="1"
        />
      ))}
      <path
        d="M-10 150 H60 l12 -34 l14 66 l14 -44 l12 12 H190 l12 -30 l14 60 l14 -40 l12 10 H430"
        fill="none"
        stroke={accent}
        strokeWidth="2.4"
        strokeLinecap="round"
        className="animate-ecg-trace"
        opacity="0.85"
      />
      <path
        d="M-10 195 H80 l10 -18 l10 36 l10 -22 l8 6 H240 l10 -20 l10 40 l10 -26 l8 8 H430"
        fill="none"
        stroke={accentAlt}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="330" cy="70" r="46" fill="none" stroke={accent} strokeOpacity="0.28" strokeWidth="1" />
      <circle cx="330" cy="70" r="70" fill="none" stroke={accent} strokeOpacity="0.14" strokeWidth="1" />
    </g>
  );
}

function HelixScene({ accent, accentAlt }: { accent: string; accentAlt: string }) {
  const rungs = Array.from({ length: 16 }, (_, i) => i);
  return (
    <g className="animate-scene-drift">
      <path
        d="M60 -20 C160 40, -40 100, 60 160 C160 220, -40 280, 60 340"
        fill="none"
        stroke={accent}
        strokeWidth="2.2"
        opacity="0.7"
      />
      <path
        d="M60 -20 C-40 40, 160 100, 60 160 C-40 220, 160 280, 60 340"
        fill="none"
        stroke={accentAlt}
        strokeWidth="2.2"
        opacity="0.5"
      />
      {rungs.map((i) => {
        const y = -10 + i * 22;
        const w = 46 * Math.abs(Math.sin((i / 16) * Math.PI * 2));
        return (
          <line
            key={i}
            x1={60 - w}
            y1={y}
            x2={60 + w}
            y2={y}
            stroke={accent}
            strokeOpacity="0.35"
            strokeWidth="1.4"
          />
        );
      })}
      <g opacity="0.3">
        <circle cx="320" cy="90" r="60" fill="none" stroke={accentAlt} strokeWidth="1" strokeDasharray="4 8" />
        <circle cx="320" cy="90" r="90" fill="none" stroke={accentAlt} strokeWidth="1" strokeDasharray="2 12" />
      </g>
    </g>
  );
}

function LabScene({ accent, accentAlt, fg }: { accent: string; accentAlt: string; fg: string }) {
  const hexes: Array<[number, number]> = [];
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      hexes.push([c * 52 + (r % 2 ? 26 : 0), r * 45]);
    }
  }
  return (
    <g>
      {hexes.map(([x, y], i) => (
        <polygon
          key={i}
          points="0,-16 14,-8 14,8 0,16 -14,8 -14,-8"
          transform={`translate(${x} ${y})`}
          fill="none"
          stroke={i % 7 === 0 ? accent : fg}
          strokeOpacity={i % 7 === 0 ? 0.45 : 0.12}
          strokeWidth="1"
        />
      ))}
      <g className="animate-scene-scan">
        <rect x="0" y="0" width="420" height="42" fill={accentAlt} opacity="0.14" />
      </g>
      <path d="M300 200 h90 M300 216 h60" stroke={accent} strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function BlueprintScene({ accent, accentAlt }: { accent: string; accentAlt: string }) {
  return (
    <g>
      <g stroke={accent} strokeOpacity="0.16" strokeWidth="1">
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`v${i}`} x1={i * 32} y1="0" x2={i * 32} y2="260" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 32} x2="420" y2={i * 32} />
        ))}
      </g>
      <g stroke={accentAlt} strokeWidth="1.6" fill="none" opacity="0.75">
        <circle cx="320" cy="120" r="54" strokeDasharray="10 6" className="animate-scene-spin" style={{ transformOrigin: "320px 120px" }} />
        <circle cx="320" cy="120" r="30" />
        <path d="M266 120 h108 M320 66 v108" strokeOpacity="0.5" />
      </g>
      <path
        d="M40 210 l30 -46 l28 24 l34 -62 l26 40"
        fill="none"
        stroke={accent}
        strokeWidth="2"
        opacity="0.6"
        strokeLinejoin="round"
      />
      <rect x="26" y="26" width="70" height="18" fill="none" stroke={accent} strokeOpacity="0.4" />
    </g>
  );
}

function MoleculeScene({ accent, accentAlt }: { accent: string; accentAlt: string }) {
  const nodes: Array<[number, number, number]> = [
    [70, 60, 9], [140, 110, 6], [60, 170, 7], [200, 60, 5],
    [250, 150, 8], [330, 90, 6], [370, 190, 9], [160, 220, 5],
  ];
  return (
    <g>
      <g stroke={accent} strokeOpacity="0.35" strokeWidth="1.4">
        <path d="M70 60 L140 110 L60 170 M140 110 L200 60 M140 110 L250 150 L330 90 M250 150 L370 190 M250 150 L160 220" fill="none" />
      </g>
      {nodes.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill={i % 2 ? accentAlt : accent}
          opacity="0.75"
          className="animate-scene-pulse"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
      <circle cx="250" cy="150" r="42" fill="none" stroke={accentAlt} strokeOpacity="0.25" strokeDasharray="3 7" />
    </g>
  );
}

function NeuralScene({ accent, accentAlt }: { accent: string; accentAlt: string }) {
  return (
    <g>
      <g stroke={accent} strokeWidth="1.5" fill="none" opacity="0.6">
        <path d="M-10 200 C60 150, 60 90, 130 70 C190 54, 210 100, 270 80 C330 60, 360 100, 430 70" />
        <path d="M-10 240 C70 210, 90 160, 170 150 C240 142, 260 190, 340 170 C390 158, 400 200, 430 190" />
        <path d="M-10 120 C50 100, 70 40, 150 26 C220 14, 250 60, 320 40 C380 24, 400 60, 430 40" />
      </g>
      {[[130, 70], [270, 80], [170, 150], [340, 170], [150, 26], [320, 40]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="16" fill={accentAlt} opacity="0.14" className="animate-scene-pulse" style={{ animationDelay: `${i * 0.5}s` }} />
          <circle cx={x} cy={y} r="4.5" fill={accent} />
        </g>
      ))}
      <g stroke={accentAlt} strokeOpacity="0.3" strokeWidth="1">
        <path d="M0 0 L420 260 M420 0 L0 260" strokeDasharray="2 14" />
      </g>
    </g>
  );
}

function PulseScene({ accent, accentAlt }: { accent: string; accentAlt: string }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx="330"
          cy="90"
          r={40 + i * 26}
          fill="none"
          stroke={accent}
          strokeOpacity="0.3"
          strokeWidth="1.6"
          className="animate-scene-ring"
          style={{ animationDelay: `${i * 0.9}s`, transformOrigin: "330px 90px" }}
        />
      ))}
      <path
        d="M330 66 c-10 -16 -34 -12 -34 8 c0 18 22 30 34 40 c12 -10 34 -22 34 -40 c0 -20 -24 -24 -34 -8 z"
        fill={accentAlt}
        opacity="0.5"
        className="animate-scene-beat"
        style={{ transformOrigin: "330px 100px" }}
      />
      <path
        d="M-10 190 H70 l14 -40 l16 78 l16 -52 l12 14 H240 l14 -34 l16 66 l14 -44 l12 12 H430"
        fill="none"
        stroke={accent}
        strokeWidth="2.6"
        strokeLinecap="round"
        className="animate-ecg-trace"
      />
      <g stroke={accentAlt} strokeOpacity="0.16" strokeWidth="1">
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="0" y1={i * 28} x2="420" y2={i * 28} />
        ))}
      </g>
    </g>
  );
}

function DecoScene({ accent, accentAlt }: { accent: string; accentAlt: string }) {
  return (
    <g>
      <g stroke={accent} strokeOpacity="0.5" fill="none" strokeWidth="1.2">
        <path d="M14 14 h70 M14 14 v70 M406 246 h-70 M406 246 v-70" />
        <path d="M26 26 h48 M26 26 v48 M394 234 h-48 M394 234 v-48" strokeOpacity="0.3" />
      </g>
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} className="animate-scene-drift" style={{ animationDelay: `${i * 0.7}s` }}>
          <path
            d={`M${40 + i * 60} 130 l18 -30 l18 30 l-18 30 z`}
            fill="none"
            stroke={i % 2 ? accentAlt : accent}
            strokeOpacity="0.4"
            strokeWidth="1.3"
          />
        </g>
      ))}
      <g stroke={accentAlt} strokeOpacity="0.35" strokeWidth="1">
        <path d="M0 92 H420 M0 168 H420" />
        <path d="M0 84 H420 M0 176 H420" strokeOpacity="0.15" />
      </g>
      <circle cx="210" cy="130" r="86" fill="none" stroke={accent} strokeOpacity="0.18" strokeDasharray="6 10" className="animate-scene-spin" style={{ transformOrigin: "210px 130px" }} />
    </g>
  );
}

function ConstellationScene({ accent, accentAlt }: { accent: string; accentAlt: string }) {
  const stars: Array<[number, number, number]> = [
    [40, 60, 2.5], [96, 34, 1.8], [150, 82, 3], [210, 40, 2], [268, 96, 2.6],
    [330, 52, 1.9], [382, 110, 2.8], [70, 150, 2.2], [140, 200, 3.1],
    [220, 168, 2], [300, 214, 2.6], [370, 176, 2.1],
  ];
  return (
    <g>
      <path
        d="M40 60 L96 34 L150 82 L210 40 L268 96 L330 52 L382 110"
        fill="none"
        stroke={accent}
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      <path
        d="M70 150 L140 200 L220 168 L300 214 L370 176"
        fill="none"
        stroke={accentAlt}
        strokeOpacity="0.3"
        strokeWidth="1.2"
      />
      {stars.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill={i % 3 === 0 ? accentAlt : accent}
          className="animate-scene-pulse"
          style={{ animationDelay: `${(i % 5) * 0.6}s` }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <circle
          key={`b${i}`}
          cx={90 + i * 130}
          cy={130 + (i % 2) * 40}
          r={26 + i * 8}
          fill="none"
          stroke={accentAlt}
          strokeOpacity="0.18"
          strokeWidth="1"
          className="animate-scene-ring"
          style={{ animationDelay: `${i}s`, transformOrigin: `${90 + i * 130}px ${130 + (i % 2) * 40}px` }}
        />
      ))}
    </g>
  );
}
