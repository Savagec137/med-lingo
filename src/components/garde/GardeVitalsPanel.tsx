import { motion } from "framer-motion";
import { Activity, Droplet, Gauge, HeartPulse, Thermometer, Wind } from "lucide-react";
import type { Vitals } from "@/features/garde/garde-domain";

interface Props {
  vitals: Vitals;
  compact?: boolean;
}

function tone(ok: boolean, warn: boolean) {
  if (!ok && !warn) return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (warn) return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
}

export function GardeVitalsPanel({ vitals, compact = false }: Props) {
  const items = [
    {
      Icon: Wind,
      label: "SpO₂",
      value: `${vitals.spo2} %`,
      tone: tone(vitals.spo2 >= 94, vitals.spo2 >= 90 && vitals.spo2 < 94),
    },
    {
      Icon: Gauge,
      label: "PAS",
      value: `${vitals.sbp} mmHg`,
      tone: tone(vitals.sbp >= 100, vitals.sbp >= 90 && vitals.sbp < 100),
    },
    {
      Icon: HeartPulse,
      label: "FC",
      value: `${vitals.hr} /min`,
      tone: tone(vitals.hr >= 50 && vitals.hr <= 100, vitals.hr > 100 && vitals.hr <= 120),
    },
    {
      Icon: Activity,
      label: "FR",
      value: `${vitals.rr} /min`,
      tone: tone(vitals.rr >= 12 && vitals.rr <= 20, vitals.rr > 20 && vitals.rr <= 25),
    },
    {
      Icon: Thermometer,
      label: "Glasgow",
      value: `${vitals.gcs}/15`,
      tone: tone(vitals.gcs >= 14, vitals.gcs >= 12 && vitals.gcs < 14),
    },
    {
      Icon: Droplet,
      label: "Glycémie",
      value: `${vitals.glycemia} mmol/L`,
      tone: tone(
        vitals.glycemia >= 4 && vitals.glycemia <= 11,
        vitals.glycemia >= 3 && vitals.glycemia < 4,
      ),
    },
  ];

  return (
    <div
      aria-label="Constantes du patient"
      className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          layout
          className={`rounded-2xl border px-3 py-2 ${item.tone}`}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider opacity-80">
            <item.Icon className="h-3 w-3" />
            {item.label}
          </div>
          <div className="mt-0.5 font-display text-lg font-black tabular-nums">{item.value}</div>
        </motion.div>
      ))}
    </div>
  );
}
