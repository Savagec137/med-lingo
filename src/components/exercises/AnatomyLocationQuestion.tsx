import type { PreparedLessonAnswer } from "@/content/lesson-runtime";

function coordinates(answer: PreparedLessonAnswer) {
  const [x, y] = (answer.detail ?? "").split(",").map(Number);
  return {
    x: Number.isFinite(x) ? x : 0.5,
    y: Number.isFinite(y) ? y : 0.5,
  };
}

/** Planche anatomique détaillée (silhouette + squelette + organes). 100 % présentation. */
function HumanBodyPlate() {
  return (
    <svg
      viewBox="0 0 200 300"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="anat-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.30" />
          <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id="anat-bone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="anat-aura" cx="50%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <pattern id="anat-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="#22d3ee" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="200" height="300" fill="url(#anat-grid)" />
      <ellipse cx="100" cy="120" rx="92" ry="128" fill="url(#anat-aura)" />

      {/* Silhouette du corps */}
      <g fill="url(#anat-skin)" stroke="#67e8f9" strokeOpacity="0.45" strokeWidth="1.1">
        {/* tête + cou */}
        <path d="M100 10c11 0 18 8 18 19 0 8-2 12-5 16l1 7c6 1 9 3 12 5l-26 4-26-4c3-2 6-4 12-5l1-7c-3-4-5-8-5-16 0-11 7-19 18-19Z" />
        {/* tronc */}
        <path d="M74 57c8-4 17-6 26-6s18 2 26 6c6 3 9 7 10 13l4 42c1 8-2 13-6 17l-3 30c-1 8-3 13-6 17l3 76c0 5-3 8-8 8h-9c-4 0-6-2-7-7l-4-64-4 64c-1 5-3 7-7 7h-9c-5 0-8-3-8-8l3-76c-3-4-5-9-6-17l-3-30c-4-4-7-9-6-17l4-42c1-6 4-10 10-13Z" />
        {/* bras */}
        <path d="M70 62c-6 2-9 6-11 12l-16 55c-2 6-1 10 3 12s8 0 10-6l18-50Z" />
        <path d="M130 62c6 2 9 6 11 12l16 55c2 6 1 10-3 12s-8 0-10-6l-18-50Z" />
        {/* mains */}
        <ellipse cx="45" cy="146" rx="6.5" ry="9" />
        <ellipse cx="155" cy="146" rx="6.5" ry="9" />
        {/* pieds */}
        <path d="M78 291h14c2 0 3 2 1 3l-16 2c-3 0-4-2-3-3Z" />
        <path d="M122 291h-14c-2 0-3 2-1 3l16 2c3 0 4-2 3-3Z" />
      </g>

      {/* Squelette : cage thoracique, clavicules, rachis, bassin */}
      <g fill="none" stroke="url(#anat-bone)" strokeOpacity="0.7" strokeLinecap="round">
        <path d="M80 68q20-6 40 0" strokeWidth="2.2" />
        <path d="M100 66v92" strokeWidth="2.4" strokeDasharray="4 4" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <path d={`M100 ${78 + i * 8}q-16 2-20 ${9 + i}`} strokeWidth="1.7" />
            <path d={`M100 ${78 + i * 8}q16 2 20 ${9 + i}`} strokeWidth="1.7" />
          </g>
        ))}
        <path d="M78 152q22 16 44 0" strokeWidth="2.4" />
        <path d="M80 152q6 20 20 20t20-20" strokeWidth="1.6" strokeOpacity="0.45" />
        {/* fémurs */}
        <path d="M90 176l-4 88M110 176l4 88" strokeWidth="1.5" strokeOpacity="0.35" />
      </g>

      {/* Organes suggérés */}
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* poumons */}
        <path
          d="M96 82c-2 12-6 20-14 24-5 2-8 0-8-6 1-11 5-19 12-24 6-4 11-2 10 6Z"
          fill="#38bdf8"
          fillOpacity="0.16"
          stroke="#7dd3fc"
          strokeOpacity="0.5"
        />
        <path
          d="M104 82c2 12 6 20 14 24 5 2 8 0 8-6-1-11-5-19-12-24-6-4-11-2-10 6Z"
          fill="#38bdf8"
          fillOpacity="0.16"
          stroke="#7dd3fc"
          strokeOpacity="0.5"
        />
        {/* cœur */}
        <path
          d="M100 88c3-5 11-4 12 2 1 7-6 12-12 17-6-5-13-10-12-17 1-6 9-7 12-2Z"
          fill="#fb7185"
          fillOpacity="0.28"
          stroke="#fda4af"
          strokeOpacity="0.6"
        />
        {/* foie / estomac */}
        <path
          d="M82 120q18-7 26 1-4 9-16 9t-10-10Z"
          fill="#f59e0b"
          fillOpacity="0.18"
          stroke="#fcd34d"
          strokeOpacity="0.45"
        />
        <path
          d="M112 120q9-2 10 6t-9 8q-6-1-7-7t6-7Z"
          fill="#a78bfa"
          fillOpacity="0.18"
          stroke="#c4b5fd"
          strokeOpacity="0.45"
        />
        {/* intestins */}
        <path
          d="M86 140q14 10 28 0M88 148q12 8 24 0"
          fill="none"
          stroke="#5eead4"
          strokeOpacity="0.45"
          strokeWidth="2"
        />
        {/* cerveau */}
        <path
          d="M92 22q4-6 8-6t8 6q3 5 0 9-4 5-8 5t-8-5q-3-4 0-9Z"
          fill="#c084fc"
          fillOpacity="0.2"
          stroke="#ddd6fe"
          strokeOpacity="0.5"
        />
      </g>
    </svg>
  );
}

export function AnatomyLocationQuestion({
  answers,
  selectedId,
  correctAnswerIds,
  checked,
  onSelect,
}: {
  answers: PreparedLessonAnswer[];
  selectedId: string | null;
  correctAnswerIds: string[];
  checked: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-[2rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.14),transparent_60%),linear-gradient(180deg,#04121f_0%,#061a2b_55%,#0b1030_100%)] shadow-[0_24px_60px_-30px_rgba(34,211,238,0.7)]"
        role="group"
        aria-label="Schéma anatomique interactif"
      >
        <HumanBodyPlate />

        {answers.map((answer, index) => {
          const point = coordinates(answer);
          const selected = selectedId === answer.id;
          const correct = checked && correctAnswerIds.includes(answer.id);
          const wrong = checked && selected && !correct;
          return (
            <button
              key={answer.id}
              type="button"
              disabled={checked}
              onClick={() => onSelect(answer.id)}
              aria-label={
                checked ? answer.text : `Zone anatomique ${index + 1} sur ${answers.length}`
              }
              aria-pressed={selected}
              className={`absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-black backdrop-blur-sm transition-all duration-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                correct
                  ? "z-20 scale-115 border-emerald-200 bg-emerald-500 text-white shadow-[0_0_22px_rgba(16,185,129,0.75)]"
                  : wrong
                    ? "z-20 border-red-200 bg-red-500 text-white shadow-[0_0_22px_rgba(239,68,68,0.7)]"
                    : selected
                      ? "z-10 scale-115 border-white bg-cyan-400 text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.85)]"
                      : "border-cyan-200/60 bg-slate-950/70 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.25)] hover:scale-110 hover:border-white hover:bg-cyan-400 hover:text-slate-950"
              }`}
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            >
              {index + 1}
            </button>
          );
        })}

        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent" />
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-cyan-300/30 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
          Planche anatomique
        </span>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">
        Sélectionne une zone sur le schéma. Les libellés sont révélés après la correction.
      </p>
      {checked ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {answers.map((answer, index) => (
            <span
              key={answer.id}
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                correctAnswerIds.includes(answer.id)
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/5 text-white/50"
              }`}
            >
              {index + 1}. {answer.text}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
