import { Focus, Minus, Plus, RotateCcw } from "lucide-react";
import { GlassPanel } from "@/components/medoca";

export interface AnatomyZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onRecenter: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export function AnatomyZoomControls(props: AnatomyZoomControlsProps) {
  const actions = [
    { label: "Zoomer", icon: Plus, action: props.onZoomIn, disabled: !props.canZoomIn },
    { label: "Dézoomer", icon: Minus, action: props.onZoomOut, disabled: !props.canZoomOut },
    { label: "Réinitialiser le zoom", icon: RotateCcw, action: props.onReset, disabled: false },
    { label: "Recentrer la planche", icon: Focus, action: props.onRecenter, disabled: false },
  ];
  return (
    <GlassPanel className="flex gap-2 p-2 lg:flex-col" aria-label="Contrôles de la planche">
      {actions.map(({ label, icon: Icon, action, disabled }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          disabled={disabled}
          aria-label={label}
          className="grid h-11 min-w-11 flex-1 place-items-center rounded-[11px] border border-[#2b3b4d] bg-[#152130] text-[#dce4eb] transition-colors hover:border-[#26d878]/55 hover:text-[#26d878] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d878] disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none lg:w-14"
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </button>
      ))}
    </GlassPanel>
  );
}
