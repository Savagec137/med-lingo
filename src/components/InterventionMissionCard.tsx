import { motion, type Variants } from "framer-motion";
import {
  Activity,
  Ambulance,
  Baby,
  Brain,
  CheckCircle2,
  Clock3,
  Coins,
  FlaskConical,
  Gift,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  LockKeyhole,
  Route,
  ShieldAlert,
  ShieldPlus,
  Star,
  Wind,
} from "lucide-react";
import type {
  InterventionScenario,
  MissionProgress,
  MissionState,
} from "@/features/intervention-domain";
import { DIFFICULTY_LABELS } from "@/features/intervention-domain";

const artwork = {
  general: {
    Icon: Activity,
    gradient: "from-sky-500/35 via-cyan-500/15 to-transparent",
    accent: "text-sky-300",
  },
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
  respiratory: {
    Icon: Wind,
    gradient: "from-blue-500/35 via-cyan-500/15 to-transparent",
    accent: "text-blue-300",
  },
  neurology: {
    Icon: Brain,
    gradient: "from-violet-500/35 via-indigo-500/15 to-transparent",
    accent: "text-violet-300",
  },
  allergy: {
    Icon: ShieldAlert,
    gradient: "from-fuchsia-500/35 via-rose-500/15 to-transparent",
    accent: "text-fuchsia-300",
  },
  pediatric: {
    Icon: Baby,
    gradient: "from-teal-500/35 via-emerald-500/15 to-transparent",
    accent: "text-teal-300",
  },
  maternity: {
    Icon: HeartHandshake,
    gradient: "from-pink-500/35 via-rose-500/15 to-transparent",
    accent: "text-pink-300",
  },
  toxicology: {
    Icon: FlaskConical,
    gradient: "from-lime-500/30 via-emerald-500/15 to-transparent",
    accent: "text-lime-300",
  },
  complex: {
    Icon: Ambulance,
    gradient: "from-red-500/35 via-blue-500/15 to-transparent",
    accent: "text-red-300",
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
  const success = progress?.bestScore ?? completion;
  const difficultyStars = scenario.difficultyStars ?? 1;

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
      {state === "new" && scenario.unlockAfter && !reducedMotion && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0.9, scale: 0.72 }}
          animate={{ opacity: 0, scale: 1.65 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-cyan-300/10"
        >
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 28, y: -10 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-cyan-200/40 bg-slate-950/85 p-4 text-cyan-200 shadow-[0_0_50px_rgba(34,211,238,0.45)]"
          >
            <LockKeyhole className="h-7 w-7" />
          </motion.div>
        </motion.div>
      )}
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
            {state === "locked"
              ? "Verrouillée"
              : state === "completed"
                ? "Terminée"
                : scenario.unlockAfter
                  ? "Débloquée"
                  : "Nouvelle"}
          </span>
        </div>

        <div className="mt-5">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${accent}`}>
            Mission {index + 1} · {scenario.specialty}
          </p>
          <h2 className="mt-1 font-display text-xl font-black text-white">{scenario.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">
            {scenario.summary}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
          <div
            className="flex items-center gap-1"
            aria-label={`Difficulté : ${difficultyStars} sur 5`}
          >
            {Array.from({ length: 5 }, (_, starIndex) => (
              <Star
                key={starIndex}
                aria-hidden="true"
                className={`h-3.5 w-3.5 ${starIndex < difficultyStars ? "fill-amber-300 text-amber-300" : "text-slate-700"}`}
              />
            ))}
          </div>
          <div className="inline-flex items-center gap-1 font-bold text-slate-400">
            <GraduationCap className="h-3.5 w-3.5" /> Niveau {scenario.minimumLevel ?? 1}
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/[0.05] p-2.5">
            <dt className="text-slate-500">XP</dt>
            <dd className="mt-1 font-bold text-cyan-200">+{scenario.baseXp} XP</dd>
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
          <div className="rounded-xl bg-white/[0.05] p-2.5">
            <dt className="flex items-center gap-1 text-slate-500">
              <Gift className="h-3 w-3" /> Coffre
            </dt>
            <dd className="mt-1 truncate font-bold text-slate-100">
              {scenario.reward.chest ?? "Aucun"}
            </dd>
          </div>
        </dl>

        <div className="mt-2 text-[10px] font-semibold text-slate-500">
          {DIFFICULTY_LABELS[scenario.difficulty]}
          {scenario.reward.chestMinimumScore
            ? ` · coffre à ${scenario.reward.chestMinimumScore}%`
            : ""}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Pourcentage de réussite</span>
            <span>{success}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
              style={{ width: `${success}%` }}
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
