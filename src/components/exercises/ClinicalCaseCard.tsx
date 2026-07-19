import type { ReactNode } from "react";
import { User, Activity, AlertTriangle, Stethoscope } from "lucide-react";

interface Vital {
  label: string;
  value: string;
  abnormal?: boolean;
}
interface ClinicalCaseCardProps {
  patient: { age?: number; sex?: "M" | "F" | "X"; context?: string };
  scenario: string;
  vitals?: Vital[];
  question?: string;
  children?: ReactNode;
}

/**
 * Fiche de cas clinique — présente le patient, le contexte, les constantes,
 * puis laisse le parent injecter les réponses (McqCard, DragDropZone, etc.).
 */
export function ClinicalCaseCard({
  patient,
  scenario,
  vitals = [],
  question,
  children,
}: ClinicalCaseCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="panel p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--color-info)]/15 text-[color:var(--color-info)]">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="section-eyebrow">Cas clinique</p>
            <p className="truncate text-sm font-bold">
              {patient.sex ? `${patient.sex} · ` : ""}
              {patient.age != null ? `${patient.age} ans` : "Patient"}
              {patient.context ? ` · ${patient.context}` : ""}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{scenario}</p>

        {vitals.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {vitals.map((v) => (
              <div
                key={v.label}
                className={`rounded-xl border p-2.5 text-center ${
                  v.abnormal
                    ? "border-[color:var(--color-destructive)]/60 bg-[color:var(--color-destructive)]/10"
                    : "border-white/10 bg-secondary/40"
                }`}
              >
                <p className="section-eyebrow flex items-center justify-center gap-1">
                  {v.abnormal ? <AlertTriangle className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                  {v.label}
                </p>
                <p
                  className={`mt-0.5 text-base font-black tabular-nums ${
                    v.abnormal ? "text-[color:var(--color-destructive)]" : ""
                  }`}
                >
                  {v.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {question ? (
        <div className="mt-6 flex items-start gap-2">
          <Stethoscope className="mt-1 h-5 w-5 shrink-0 text-[color:var(--color-primary)]" />
          <h2 className="text-xl font-extrabold leading-tight">{question}</h2>
        </div>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
