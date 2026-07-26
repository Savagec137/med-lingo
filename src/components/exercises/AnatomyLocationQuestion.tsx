import type { PreparedLessonAnswer } from "@/content/lesson-runtime";

function coordinates(answer: PreparedLessonAnswer) {
  const [x, y] = (answer.detail ?? "").split(",").map(Number);
  return {
    x: Number.isFinite(x) ? x : 0.5,
    y: Number.isFinite(y) ? y : 0.5,
  };
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
        className="relative aspect-[2/3] overflow-hidden rounded-[2rem] border-2 border-border bg-gradient-to-b from-cyan-400/10 to-violet-500/10"
        role="group"
        aria-label="Schéma anatomique interactif"
      >
        <svg
          viewBox="0 0 200 300"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full text-cyan-200/30"
        >
          <circle cx="100" cy="27" r="19" fill="currentColor" />
          <path
            d="M78 52 Q100 43 122 52 L137 142 Q123 157 116 178 L125 278 H102 L98 184 L94 278 H71 L83 178 Q76 156 63 142 Z"
            fill="currentColor"
          />
          <path
            d="M70 64 L30 151 M130 64 L170 151"
            stroke="currentColor"
            strokeWidth="17"
            strokeLinecap="round"
          />
          <path d="M100 51 L100 181" stroke="currentColor" strokeWidth="2" strokeDasharray="5 6" />
          <path
            d="M75 102 Q100 121 125 102 M76 145 Q100 132 124 145"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>

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
              className={`absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-black shadow-lg transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                correct
                  ? "z-20 scale-110 border-emerald-200 bg-emerald-500 text-white"
                  : wrong
                    ? "z-20 border-red-200 bg-red-500 text-white"
                    : selected
                      ? "z-10 scale-110 border-white bg-cyan-500 text-slate-950"
                      : "border-cyan-200/70 bg-slate-950/85 text-cyan-100 hover:scale-110 hover:bg-cyan-400 hover:text-slate-950"
              }`}
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            >
              {index + 1}
            </button>
          );
        })}
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
