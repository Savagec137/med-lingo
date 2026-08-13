import { Eye, EyeOff, Layers3 } from "lucide-react";
import { GlassPanel } from "@/components/medoca";
import type { AnatomyLayer } from "@/features/anatomy/anatomy-domain";

const LAYERS: Array<{ id: AnatomyLayer; label: string }> = [
  { id: "skin", label: "Peau" },
  { id: "muscles", label: "Muscles" },
  { id: "skeleton", label: "Squelette" },
  { id: "organs", label: "Organes" },
  { id: "vessels", label: "Vaisseaux" },
];

export function AnatomyLayerToggle({
  value,
  onChange,
  lockedLayer,
}: {
  value: Record<AnatomyLayer, boolean>;
  onChange: (layer: AnatomyLayer) => void;
  lockedLayer?: AnatomyLayer;
}) {
  return (
    <GlassPanel className="p-4">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#dce4eb]">
        <Layers3 className="h-4 w-4 text-[#26d878]" aria-hidden="true" /> Affichage
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-1 lg:grid-cols-1">
        {LAYERS.map((layer) => {
          const visible = value[layer.id];
          const locked = visible && lockedLayer === layer.id;
          const Icon = visible ? Eye : EyeOff;
          return (
            <button
              key={layer.id}
              type="button"
              aria-pressed={visible}
              aria-disabled={locked}
              onClick={() => onChange(layer.id)}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-[10px] px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d878] motion-reduce:transition-none ${visible ? "bg-[#102a25] text-[#f4f7fa]" : "text-[#8290a0] hover:bg-[#111d2b] hover:text-[#dce4eb]"}`}
            >
              {layer.label}
              <Icon className={`h-4 w-4 ${visible ? "text-[#26d878]" : "text-[#667485]"}`} />
            </button>
          );
        })}
      </div>
    </GlassPanel>
  );
}
