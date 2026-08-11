import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FileText,
  Gauge,
  LoaderCircle,
  Play,
  ShieldCheck,
} from "lucide-react";
import type { AuditReport, AuditSeverity } from "./audit-domain.ts";
import { bytesLabel } from "./audit-utils.ts";

const SEVERITY_STYLES: Record<AuditSeverity, string> = {
  INFO: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  WARNING: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  ERROR: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  CRITICAL: "border-red-500/40 bg-red-500/10 text-red-200",
};

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function exportReport(report: AuditReport, format: "json" | "markdown" | "html") {
  const reporters = await import("./audit-reporters.ts");
  if (format === "json") {
    downloadText("audit.json", reporters.renderAuditJson(report), "application/json;charset=utf-8");
    return;
  }
  if (format === "markdown") {
    downloadText(
      "AUDIT_REPORT.md",
      reporters.renderAuditMarkdown(report),
      "text/markdown;charset=utf-8",
    );
    return;
  }
  downloadText("audit.html", reporters.renderAuditHtml(report), "text/html;charset=utf-8");
}

async function exportPdf(report: AuditReport) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.opener = null;
  const { renderAuditHtml } = await import("./audit-reporters.ts");
  printWindow.document.open();
  printWindow.document.write(renderAuditHtml(report));
  printWindow.document.close();
  printWindow.addEventListener(
    "load",
    () => {
      printWindow.focus();
      printWindow.print();
    },
    { once: true },
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-xl">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs text-white/45">{detail}</p> : null}
    </article>
  );
}

export function ContentAuditDashboard() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | "ALL">("ALL");
  const [failure, setFailure] = useState<string | null>(null);

  const visibleIssues = useMemo(() => {
    if (!report) return [];
    if (selectedSeverity === "ALL") return report.issues;
    return report.issues.filter((issue) => issue.severity === selectedSeverity);
  }, [report, selectedSeverity]);

  async function runAudit() {
    setRunning(true);
    setFailure(null);
    try {
      const startedAt = performance.now();
      const [{ loadBrowserAuditFiles }, { runContentAudit }] = await Promise.all([
        import("./browser-audit-loader.ts"),
        import("./audit-engine.ts"),
      ]);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      setReport(
        runContentAudit(loadBrowserAuditFiles(), {
          rootLabel: "src/content",
          analysisStartedAt: startedAt,
        }),
      );
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "L'audit n'a pas pu être exécuté.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen pb-28 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <header className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.19),transparent_42%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(5,11,24,0.98))] p-6 shadow-2xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                <ShieldCheck className="h-4 w-4" />
                Contrôle avant déploiement
              </div>
              <h1 className="mt-3 font-display text-3xl font-black sm:text-4xl">
                Audit de la base pédagogique
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                Analyse en lecture seule des structures, identifiants, références, réponses,
                explications et performances. Aucune donnée n’est modifiée.
              </p>
            </div>
            <button
              type="button"
              onClick={runAudit}
              disabled={running}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 font-black text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.32)] transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70"
            >
              {running ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              {running ? "Analyse en cours…" : "Lancer l’audit"}
            </button>
          </div>
        </header>

        {failure ? (
          <div role="alert" className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4">
            <p className="font-bold text-red-200">Échec de l’audit</p>
            <p className="mt-1 text-sm text-red-100/70">{failure}</p>
          </div>
        ) : null}

        {!report && !running ? (
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              [Database, "Intégrité", "Relations, références et objets orphelins."],
              [BarChart3, "Qualité", "Doublons, difficultés et explications pédagogiques."],
              [Gauge, "Performance", "Taille, mémoire et temps moyen par question."],
            ].map(([Icon, title, description]) => {
              const CardIcon = Icon as typeof Database;
              return (
                <article
                  key={String(title)}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"
                >
                  <CardIcon className="h-6 w-6 text-cyan-300" />
                  <h2 className="mt-4 font-bold">{String(title)}</h2>
                  <p className="mt-1 text-sm text-white/50">{String(description)}</p>
                </article>
              );
            })}
          </section>
        ) : null}

        {report ? (
          <>
            <section
              aria-live="polite"
              className="mt-6 flex flex-col gap-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-300" />
                <div>
                  <p className="font-black text-emerald-100">Audit terminé</p>
                  <p className="text-sm text-emerald-100/60">
                    {report.summary.questions} questions analysées ·{" "}
                    {report.issuesBySeverity.CRITICAL} erreur(s) critique(s)
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-300/20 bg-black/20 px-4 py-2 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-100/55">
                  Score qualité
                </p>
                <p className="text-2xl font-black text-emerald-200">
                  {report.qualityScore.total} / 100
                </p>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Metric label="Blocs" value={report.summary.blocks} />
              <Metric label="Parcours" value={report.summary.parcours} />
              <Metric
                label="Leçons"
                value={report.summary.lessons}
                detail={`${report.summary.contentLessons} alimentées`}
              />
              <Metric label="Connaissances" value={report.summary.knowledge} />
              <Metric label="Questions" value={report.summary.questions} />
              <Metric
                label="Boss"
                value={report.summary.bosses}
                detail={`${report.summary.populatedBosses} alimentés`}
              />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
              <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <h2 className="font-display text-lg font-black">Niveaux des anomalies</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(["CRITICAL", "ERROR", "WARNING", "INFO"] as const).map((severity) => (
                    <button
                      type="button"
                      key={severity}
                      onClick={() =>
                        setSelectedSeverity((current) => (current === severity ? "ALL" : severity))
                      }
                      className={`rounded-xl border p-4 text-left transition ${SEVERITY_STYLES[severity]} ${
                        selectedSeverity === severity ? "ring-2 ring-white/50" : ""
                      }`}
                    >
                      <p className="text-xs font-black">{severity}</p>
                      <p className="mt-1 text-2xl font-black">
                        {report.issuesBySeverity[severity]}
                      </p>
                    </button>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <h2 className="font-display text-lg font-black">Performance de l’analyse</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Fichiers" value={report.performance.fileCount} />
                  <Metric label="Taille" value={bytesLabel(report.performance.totalSizeBytes)} />
                  <Metric label="Durée" value={`${report.performance.analysisTimeMs} ms`} />
                  <Metric
                    label="Par question"
                    value={`${report.performance.averageTimePerQuestionMs} ms`}
                  />
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                  <p className="text-xs leading-5 text-white/55">{report.supabase.message}</p>
                </div>
              </article>
            </section>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-lg font-black">Exports</h2>
                  <p className="text-sm text-white/50">
                    Les rapports contiennent le détail complet des anomalies.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => exportReport(report, "json")}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
                  >
                    <FileJson className="h-4 w-4" /> JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => exportReport(report, "markdown")}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
                  >
                    <FileText className="h-4 w-4" /> Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => exportReport(report, "html")}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" /> HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => exportPdf(report)}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-400 px-3 py-2 text-sm font-black text-slate-950 hover:bg-violet-300"
                  >
                    <Download className="h-4 w-4" /> PDF
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
              <div className="flex flex-col gap-2 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-lg font-black">Anomalies détaillées</h2>
                  <p className="text-sm text-white/45">
                    {visibleIssues.length} résultat(s)
                    {selectedSeverity === "ALL" ? "" : ` · filtre ${selectedSeverity}`}
                  </p>
                </div>
                {selectedSeverity !== "ALL" ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSeverity("ALL")}
                    className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
                  >
                    Afficher tous les niveaux
                  </button>
                ) : null}
              </div>
              <div className="max-h-[720px] overflow-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-950">
                    <tr className="text-white/45">
                      <th className="p-3">Niveau</th>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Entité</th>
                      <th className="p-3">Message</th>
                      <th className="p-3">Fichier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleIssues.map((issue) => (
                      <tr key={issue.id} className="border-t border-white/[0.06] align-top">
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${SEVERITY_STYLES[issue.severity]}`}
                          >
                            {issue.severity}
                          </span>
                        </td>
                        <td className="p-3 text-white/55">{issue.category}</td>
                        <td className="p-3 font-mono text-violet-200">{issue.code}</td>
                        <td className="p-3 font-mono text-cyan-200">{issue.entityId ?? "—"}</td>
                        <td className="max-w-xl p-3 leading-5 text-white/75">{issue.message}</td>
                        <td className="max-w-xs break-all p-3 text-white/35">
                          {issue.file ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {report.issuesBySeverity.CRITICAL > 0 ? (
              <div className="mt-6 flex gap-3 rounded-2xl border border-red-400/30 bg-red-400/10 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-300" />
                <p className="text-sm text-red-100/75">
                  Le déploiement devrait être suspendu jusqu’à l’analyse des erreurs critiques.
                  L’auditeur ne modifie jamais les fichiers concernés.
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
