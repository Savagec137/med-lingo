import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock3,
  Coins,
  PackageOpen,
  RefreshCcw,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import type { InterventionScenario, MissionResult } from "@/features/intervention-domain";

interface Props {
  scenario: InterventionScenario;
  result: MissionResult;
  reducedMotion: boolean;
  onRestart: () => void;
  onBack: () => void;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)} min ${seconds % 60}s`;

export function InterventionDebrief({ scenario, result, reducedMotion, onRestart, onBack }: Props) {
  const metrics = [
    {
      Icon: Clock3,
      label: "Temps",
      value: formatTime(result.elapsedSeconds),
      color: "text-cyan-300",
    },
    { Icon: Star, label: "Note", value: result.grade, color: "text-amber-300" },
    {
      Icon: AlertTriangle,
      label: "Erreurs",
      value: String(result.errors.length),
      color: "text-rose-300",
    },
    {
      Icon: CheckCircle2,
      label: "Bonnes décisions",
      value: String(result.goodDecisions.length),
      color: "text-emerald-300",
    },
  ];

  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="debrief-title"
      className="mx-auto max-w-5xl"
    >
      <div className="relative overflow-hidden rounded-[2.25rem] border border-cyan-300/15 bg-slate-950 shadow-[0_30px_100px_rgba(8,145,178,0.12)]">
        <div
          className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.18),transparent_65%)]"
          aria-hidden="true"
        />
        <div className="relative p-6 sm:p-9">
          <div className="text-center">
            <motion.div
              initial={reducedMotion ? false : { scale: 0.6, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: reducedMotion ? "tween" : "spring", stiffness: 180, damping: 14 }}
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-cyan-200/25 bg-gradient-to-br from-cyan-300 to-blue-600 text-4xl font-black text-slate-950 shadow-[0_0_50px_rgba(34,211,238,.25)]"
            >
              {result.grade}
            </motion.div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
              Mission terminée
            </p>
            <h1
              id="debrief-title"
              className="mt-2 font-display text-3xl font-black text-white sm:text-4xl"
            >
              Débriefing opérationnel
            </h1>
            <p className="mt-2 text-slate-400">
              {scenario.title} · Score final {result.score}/100
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metrics.map(({ Icon, label, value, color }) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <Icon className={`h-5 w-5 ${color}`} />
                <div className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {label}
                </div>
                <div className="mt-1 font-display text-xl font-black text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Reward Icon={Zap} label="XP gagnée" value={`+${result.xp} XP`} />
            <Reward Icon={Coins} label="Récompense" value={`${result.coins} pièces`} />
            <Reward Icon={Award} label="Badge obtenu" value={result.badge ?? "Non obtenu"} />
            <Reward Icon={PackageOpen} label="Coffre obtenu" value={result.chest ?? "Non obtenu"} />
          </div>

          {(result.badge || result.chest) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-200">
              {result.badge && (
                <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1.5">
                  Badge : {result.badge}
                </span>
              )}
              {result.chest && (
                <span className="rounded-full border border-violet-300/15 bg-violet-300/10 px-3 py-1.5">
                  Coffre : {result.chest}
                </span>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5">
              <div className="flex items-center gap-2 font-black text-white">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                Décisions maîtrisées
              </div>
              <ul className="mt-4 space-y-3">
                {result.goodDecisions.slice(0, 4).map((item) => (
                  <li key={item.stepId} className="text-sm leading-relaxed text-slate-400">
                    <span className="font-bold text-slate-200">{item.choiceLabel}.</span>{" "}
                    {item.feedback}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.5rem] border border-violet-300/15 bg-violet-300/[0.055] p-5">
              <div className="flex items-center gap-2 font-black text-white">
                <Sparkles className="h-5 w-5 text-violet-300" />
                Conseils Pulse IA
              </div>
              <ul className="mt-4 space-y-3">
                {scenario.pulseAdvice.map((advice) => (
                  <li key={advice} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />
                    {advice}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {result.errors.length > 0 && (
            <details className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-300/[0.04] p-4">
              <summary className="cursor-pointer font-bold text-rose-200 outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
                Revoir les décisions perfectibles ({result.errors.length})
              </summary>
              <ul className="mt-3 space-y-3">
                {result.errors.map((item) => (
                  <li key={item.stepId} className="text-sm leading-relaxed text-slate-400">
                    <span className="font-bold text-slate-200">{item.choiceLabel}.</span>{" "}
                    {item.feedback}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 font-bold text-slate-200 outline-none hover:bg-white/5 focus-visible:ring-4 focus-visible:ring-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Toutes les missions
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 font-black text-slate-950 outline-none hover:bg-cyan-200 focus-visible:ring-4 focus-visible:ring-cyan-200/35"
            >
              <RefreshCcw className="h-4 w-4" />
              Rejouer la mission
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function Reward({ Icon, label, value }: { Icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="mt-1 font-black text-white">{value}</div>
      </div>
    </div>
  );
}
