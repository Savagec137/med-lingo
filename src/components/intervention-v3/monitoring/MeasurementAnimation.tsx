import { Activity, Droplet } from "lucide-react";

/**
 * L'animation d'une mesure en cours.
 *
 * Elle occupe le temps entre le geste et son résultat — un brassard qui se
 * gonfle, un glucomètre qui analyse. Elle ne montre **jamais** de valeur : elle
 * dit qu'une mesure est en train de se faire, et rien de plus. Le résultat
 * apparaît après, comme un instantané.
 *
 * C'est une distinction de fond avec l'onde de pouls. Celle-ci représente une
 * surveillance continue et a besoin d'une cadence mesurée ; celle-là n'a besoin
 * que d'une durée, et n'a donc aucun accès à quoi que ce soit de clinique.
 */

export type MeasurementKind = "blood_pressure" | "glucose";

interface Props {
  kind: MeasurementKind;
  /** Mesure en cours. Faux : le composant ne rend rien. */
  inProgress: boolean;
  /** Durée simulée du geste, en secondes. Donne le rythme de la barre. */
  durationSeconds: number;
  reducedMotion: boolean;
}

const KIND_LABELS: Record<MeasurementKind, string> = {
  blood_pressure: "Brassard en place, mesure en cours",
  glucose: "Analyse capillaire en cours",
};

export function MeasurementAnimation({ kind, inProgress, durationSeconds, reducedMotion }: Props) {
  if (!inProgress) return null;
  const Icon = kind === "glucose" ? Droplet : Activity;

  return (
    <div
      className="flex items-center gap-2 rounded-xl bg-slate-950/40 px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <Icon
        className={`h-4 w-4 shrink-0 text-cyan-300 ${
          reducedMotion ? "" : "animate-[medoca-beat_1.2s_ease-in-out_infinite]"
        }`}
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="text-xs font-bold text-slate-200">{KIND_LABELS[kind]}</p>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full bg-cyan-300 ${
              reducedMotion
                ? "w-1/2"
                : "w-full origin-left animate-[medoca-fill_var(--measure-duration)_linear_forwards]"
            }`}
            style={{ ["--measure-duration" as string]: `${durationSeconds}s` }}
          />
        </div>
      </div>
    </div>
  );
}

/** La mesure au brassard, nommée comme la maquette la nomme. */
export const BloodPressureMeasurementAnimation = (props: Omit<Props, "kind">) => (
  <MeasurementAnimation {...props} kind="blood_pressure" />
);

/** L'analyse capillaire, nommée comme la maquette la nomme. */
export const GlucoseMeasurementAnimation = (props: Omit<Props, "kind">) => (
  <MeasurementAnimation {...props} kind="glucose" />
);
