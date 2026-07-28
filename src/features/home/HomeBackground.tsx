import { memo } from "react";
import { BackgroundEngine } from "@/features/background/BackgroundEngine";
import { THEMES } from "@/features/background/themes";

export const HomeBackground = memo(function HomeBackground() {
  return <BackgroundEngine theme={THEMES.samu} intensity="medium" />;
});
