import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  strength?: "soft" | "strong";
  interactive?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { className, strength = "soft", interactive = false, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-[14px] border text-[#f4f7fa]",
        strength === "strong"
          ? "border-[#304255] bg-[#091522]/98 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_16px_38px_rgba(0,0,0,0.24)]"
          : "border-[#27384a] bg-[#0b1724]/96 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_10px_28px_rgba(0,0,0,0.18)]",
        interactive &&
          "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#26d878]/45 focus-within:border-[#26d878]/60 motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
});
