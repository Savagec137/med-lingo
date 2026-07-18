import { motion, type Variants } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Coins,
  HeartPulse,
  LockKeyhole,
  Route,
  ShieldPlus,
  Star,
} from "lucide-react";
import type {
  InterventionScenario,
  MissionProgress,
  MissionState,
} from "@/features/intervention-domain";
import { DIFFICULTY_LABELS } from "@/features/intervention-domain";

const artwork = {
  cardiac: {
    Icon: HeartPulse,
    gradient: "from-rose-500/35 via-red-500/15 to-transparent",
    accent: "text-rose-300",
  },
  metabolic: {
    Icon: Activity,
    gradient: "from-cyan-500/35 via-blue-500/15 to-transparent",
    accent: "text-cyan-300",
  },
  trauma: {
    Icon: ShieldPlus,
    gradient: "from-amber-500/35 via-orange-500/15 to-transparent",
    accent: "text-amber-300",
  },
} as const;

const variants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  }),
};

interface Props {
  scenario: InterventionScenario;
  state: MissionState;
  progress?: MissionProgress;
  index: number;
  reducedMotion: boolean;
  onSelect: () => void;
}

export function InterventionMissionCard({
  scenario,
  state,
  progress,
  index,
  reducedMotion,
  onSelect,
}: Props) {
  const { Icon, gradient, accent } = artwork[scenario.illustration];
  const completion = progress?.completed ? 100 : 0;

  return (
    <motion.article
      custom={index}
      variants={reducedMotion ? undefined : variants}
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      whileHover={state === "locked" || reducedMotion ? undefined : { y: -4 }}
      className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/80 shadow-[0_20px_60px_rgba(2,8,23,0.35)]"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} aria-hidden="true" />
      <div className="relative flex min-h-56 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/65 ${accent}`}
          >
            <Icon className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
            {state === "locked" ? (
              <LockKeyhole className="h-3 w-3" />
            ) : state === "completed" ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            ) : (
              <Star className="h-3 w-3 text-cyan-300" />
            )}
            {state === "locked" ? "Verrouillée" : state === "completed" ? "Terminée" : "Nouvelle"}
          </span>
        </div>

        <div className="mt-5">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${accent}`}>
            {scenario.specialty}
          </p>
          <h2 className="mt-1 font-display text-xl font-black text-white">{scenario.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">
            {scenario.summary}
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-white/[0.05] p-2.5">
            <dt className="text-slate-500">Difficulté</dt>
            <dd className="mt-1 font-bold text-slate-100">
              {DIFFICULTY_LABELS[scenario.difficulty]}
            </dd>
          </div>
          <div className="rounded-xl bg-white/[0.05] p-2.5">
            <dt className="flex items-center gap-1 text-slate-500">
              <Clock3 className="h-3 w-3" />
              Temps
            </dt>
            <dd className="mt-1 font-bold text-slate-100">{scenario.estimatedMinutes} min</dd>
          </div>
          <div className="rounded-xl bg-white/[0.05] p-2.5">
            <dt className="text-slate-500">Récompense</dt>
            <dd className="mt-1 flex items-center gap-1 font-bold text-slate-100">
              <Coins className="h-3 w-3 text-amber-300" />
              {scenario.reward.coins}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Progression</span>
            <span>
              {progress?.bestScore ?? completion}% · {scenario.baseXp} XP
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
              style={{ width: `${progress?.bestScore ?? completion}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={state === "locked"}
          onClick={onSelect}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 text-sm font-black text-slate-950 outline-none transition hover:bg-cyan-300 focus-visible:ring-4 focus-visible:ring-cyan-300/35 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {state === "locked" ? <LockKeyhole className="h-4 w-4" /> : <Route className="h-4 w-4" />}
          {state === "locked"
            ? "Termine la mission précédente"
            : state === "completed"
              ? "Rejouer la mission"
              : "Voir l'alerte"}
        </button>
      </div>
    </motion.article>
  );
}
