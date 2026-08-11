import { Activity, Clock3, Radio, ShieldCheck, TimerReset } from "lucide-react";
import { formatShiftMinute } from "@/features/intervention-shift-engine";
import type { InterventionShiftSession } from "@/features/intervention-shift-domain";

interface Props {
  session: InterventionShiftSession;
  elapsedSeconds?: number;
}

function formatElapsed(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(
    2,
    "0",
  )}`;
}

export function InterventionShiftHud({ session, elapsedSeconds = 0 }: Props) {
  const metrics = [
    {
      Icon: Clock3,
      label: "Heure de garde",
      value: formatShiftMinute(session.currentMinute),
      color: "text-cyan-300",
    },
    {
      Icon: Activity,
      label: "Vigilance",
      value: `${session.vigilance}%`,
      color:
        session.vigilance >= 60
          ? "text-emerald-300"
          : session.vigilance >= 35
            ? "text-amber-300"
            : "text-rose-300",
    },
    {
      Icon: TimerReset,
      label: "Chronomètre",
      value: formatElapsed(elapsedSeconds),
      color: "text-amber-300",
    },
    {
      Icon: Radio,
      label: "Radio",
      value: session.radioConnected ? "Connectée" : "Hors ligne",
      color: session.radioConnected ? "text-emerald-300" : "text-rose-300",
    },
  ];

  return (
    <aside
      aria-label="État de la garde"
      className="sticky top-2 z-30 mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-cyan-300/15 bg-[#071321]/95 p-2 shadow-2xl backdrop-blur-xl sm:grid-cols-4"
    >
      {metrics.map(({ Icon, label, value, color }) => (
        <div
          key={label}
          className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.035] p-2.5"
        >
          <Icon className={`h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
          <div className="min-w-0">
            <div className="truncate text-[8px] font-black uppercase tracking-wider text-slate-500">
              {label}
            </div>
            <div className="truncate text-xs font-black text-white">{value}</div>
          </div>
        </div>
      ))}
      <div className="sr-only">
        <ShieldCheck />
        Le chronomètre n'est pas annoncé automatiquement chaque seconde.
      </div>
    </aside>
  );
}
