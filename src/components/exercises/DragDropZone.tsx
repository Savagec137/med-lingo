import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";

export interface DragItem {
  id: string;
  label: string;
}
interface DragDropZoneProps {
  items: DragItem[];
  onReorder?: (ordered: DragItem[]) => void;
  title?: string;
}

/**
 * Liste réordonnable au drag&drop (tactile + souris) via framer-motion Reorder.
 * Utilisation : ordonner les étapes d'un bilan ABCDE, reconstituer une séquence.
 */
export function DragDropZone({ items, onReorder, title }: DragDropZoneProps) {
  const [order, setOrder] = useState<DragItem[]>(items);
  return (
    <div className="mx-auto w-full max-w-xl">
      {title ? <p className="section-eyebrow mb-2">{title}</p> : null}
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={(next) => {
          setOrder(next);
          onReorder?.(next);
        }}
        className="grid gap-2"
      >
        {order.map((it, i) => (
          <Reorder.Item
            key={it.id}
            value={it}
            className="panel press flex cursor-grab items-center gap-3 px-3 py-3 active:cursor-grabbing"
            whileDrag={{ scale: 1.03, boxShadow: "var(--glow-primary)" }}
          >
            <span className="chip tabular-nums" style={{ minWidth: 28, justifyContent: "center" }}>
              {i + 1}
            </span>
            <span className="flex-1 text-sm font-bold">{it.label}</span>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

// Named export for consumers who want the motion primitive
export { motion };
