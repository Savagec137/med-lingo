import { cn } from "@/lib/utils";
import type { MedocaNavItem } from "./types";

export interface BottomNavProps {
  items: readonly MedocaNavItem[];
  activeId: string;
  onNavigate?: (id: string) => void;
  ariaLabel?: string;
  position?: "fixed" | "static";
  className?: string;
}

export function BottomNav({
  items,
  activeId,
  onNavigate,
  ariaLabel = "Navigation principale",
  position = "fixed",
  className,
}: BottomNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "z-40 border-t border-[#243548] bg-[#07111d]/98 shadow-[0_-12px_30px_rgba(0,0,0,0.24)]",
        position === "fixed" ? "fixed inset-x-0 bottom-0" : "relative w-full rounded-[14px] border",
        className,
      )}
      style={{ paddingBottom: position === "fixed" ? "env(safe-area-inset-bottom)" : undefined }}
    >
      <ul
        className="mx-auto grid max-w-2xl px-2 py-1.5"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          const Icon = item.icon;

          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                disabled={item.disabled}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate?.(item.id)}
                className={cn(
                  "group relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-[12px] px-1 text-[#718091] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d878]/75 disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none",
                  active && "text-[#26d878]",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 min-w-12 items-center justify-center rounded-xl transition-[background-color,transform,box-shadow]",
                    active && "scale-105 bg-[#102a25] shadow-[0_0_18px_rgba(38,216,120,0.10)]",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2.1} aria-hidden="true" />
                  {item.badge !== undefined ? (
                    <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-400 px-1 text-[9px] font-black leading-4 text-slate-950">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate text-[9px] font-black uppercase tracking-[0.08em]">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
