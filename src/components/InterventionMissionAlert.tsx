import { motion } from "framer-motion";
import {
  AlarmClock,
  ArrowLeft,
  Clock3,
  MapPin,
  Navigation,
  Radio,
  Siren,
  UserRound,
} from "lucide-react";
import type { InterventionScenario } from "@/features/intervention-domain";

interface Props {
  scenario: InterventionScenario;
  reducedMotion: boolean;
  onAccept: () => void;
  onBack: () => void;
}

export function InterventionMissionAlert({ scenario, reducedMotion, onAccept, onBack }: Props) {
  const items = [
    { Icon: UserRound, label: "Patient", value: scenario.alert.patient },
    { Icon: Siren, label: "Motif", value: scenario.alert.reason },
    { Icon: Radio, label: "Priorité", value: scenario.alert.priority },
    { Icon: Navigation, label: "Distance", value: scenario.alert.distance },
    { Icon: MapPin, label: "Lieu", value: scenario.alert.location },
    { Icon: Clock3, label: "Heure", value: scenario.alert.time },
  ];

  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="mission-alert-title"
      className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-red-400/25 bg-slate-950 shadow-[0_30px_100px_rgba(239,68,68,0.16)]"
    >
      <div className="relative overflow-hidden border-b border-red-400/15 bg-gradient-to-br from-red-500/25 via-rose-500/10 to-transparent p-6 sm:p-8">
        <motion.div
          aria-hidden="true"
          animate={
            reducedMotion ? undefined : { opacity: [0.2, 0.8, 0.2], scale: [0.95, 1.1, 0.95] }
          }
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-red-500/20 blur-3xl"
        />
        <button
          type="button"
          onClick={onBack}
          className="relative mb-7 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-300 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux missions
        </button>
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-red-300/25 bg-red-500/20 text-red-300">
            <Siren className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
              Alerte SAMU
            </p>
            <h1
              id="mission-alert-title"
              className="mt-1 font-display text-3xl font-black text-white sm:text-4xl"
            >
              {scenario.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(({ Icon, label, value }, index) => (
            <motion.div
              key={label}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.12 + index * 0.06 }}
              className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-4"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {label}
                </div>
                <div className="mt-1 font-bold text-slate-100">{value}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] p-4 text-sm leading-relaxed text-amber-100">
          <span className="font-black">Transmission :</span> {scenario.alert.dispatchNote}
        </div>
        <button
          type="button"
          onClick={onAccept}
          autoFocus
          className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 px-6 font-black text-white shadow-[0_12px_32px_rgba(244,63,94,0.24)] outline-none transition hover:brightness-110 focus-visible:ring-4 focus-visible:ring-red-300/40"
        >
          <AlarmClock className="h-5 w-5" /> Accepter la mission
        </button>
      </div>
    </motion.section>
  );
}
