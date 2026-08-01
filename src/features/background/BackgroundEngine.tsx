import { memo, type ReactNode } from "react";

export interface BackgroundTheme {
  id: string;
  name: string;
  component: ReactNode;
}

interface BackgroundEngineProps {
  theme: BackgroundTheme;
  intensity?: "low" | "medium" | "high";
  reducedMotion?: boolean;
  className?: string;
}

const OPACITY_BY_INTENSITY = {
  low: 0.6,
  medium: 0.85,
  high: 1,
} as const;

export const BackgroundEngine = memo(function BackgroundEngine({
  theme,
  intensity = "medium",
  reducedMotion = false,
  className = "",
}: BackgroundEngineProps) {
  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden ${
        reducedMotion ? "home-reduced-motion" : ""
      } ${className}`}
      style={{
        opacity: OPACITY_BY_INTENSITY[intensity],
        contain: "strict",
        transform: "translateZ(0)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-10 bg-black/40" />
      <div className="absolute inset-0 h-full w-full">{theme.component}</div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-black/30" />
    </div>
  );
});
