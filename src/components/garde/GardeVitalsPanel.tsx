import { motion } from "framer-motion";
import { Activity, Droplet, Gauge, HeartPulse, Thermometer, Wind, Zap } from "lucide-react";
import type { VitalKey, VitalSeverity, Vitals } from "@/features/garde/garde-domain";
import { vitalSeverity } from "@/features/garde/garde-vitals";

interface Props {
  vitals: Vitals;
  compact?: boolean;
}

const TONES: Record<VitalSeverity, string> = {
  normal: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  critical: "border-rose-400/40 bg-rose-400/15 text-rose-200",
};

export function GardeVitalsPanel({ vitals, compact = false }: Props) {
  const items: Array<{ key: VitalKey; Icon: typeof Wind; label: string; value: string }> = [
    { key: "spo2", Icon: Wind, label: "SpO₂", value: `${vitals.spo2} %` },
    { key: "sbp", Icon: Gauge, label: "PAS", value: `${vitals.sbp} mmHg` },
    { key: "hr", Icon: HeartPulse, label: "FC", value: `${vitals.hr} /min` },
    { key: "rr", Icon: Activity, label: "FR", value: `${vitals.rr} /min` },
    { key: "gcs", Icon: Thermometer, label: "Glasgow", value: `${vitals.gcs}/15` },
    { key: "pain", Icon: Zap, label: "Douleur", value: `${vitals.pain}/10` },
    { key: "glycemia", Icon: Droplet, label: "Glycémie", value: `${vitals.glycemia} mmol/L` },
  ];


  return (
    <div
      aria-label="Constantes du patient"
      className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}
    >
      {items.map((item) => {
        const severity = vitalSeverity(item.key, vitals[item.key]);
        return (
          <motion.div
            key={item.label}
            layout
            aria-label={`${item.label} ${item.value}${severity === "critical" ? ", seuil critique" : severity === "warning" ? ", à surveiller" : ""}`}
            className={`rounded-2xl border px-3 py-2 ${TONES[severity]} ${severity === "critical" ? "animate-pulse" : ""}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider opacity-80">
              <item.Icon className="h-3 w-3" />
              {item.label}
            </div>
            <div className="mt-0.5 font-display text-lg font-black tabular-nums">{item.value}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
