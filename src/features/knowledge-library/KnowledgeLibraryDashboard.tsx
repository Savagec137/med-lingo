import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  Database,
  FileCheck2,
  LibraryBig,
  Play,
  Search,
  ShieldCheck,
} from "lucide-react";
import type {
  KnowledgeLibrarySnapshot,
  LibraryAuditReport,
  LibrarySearchResult,
} from "./library-domain.ts";

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className={`mt-2 text-3xl font-black ${warning ? "text-amber-300" : "text-white"}`}>
        {value}
      </p>
    </article>
  );
}

function downloadAudit(report: LibraryAuditReport) {
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(report, null, 2)}\n`], {
      type: "application/json;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "pulseeo-library-audit.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function KnowledgeLibraryDashboard() {
  const [snapshot, setSnapshot] = useState<KnowledgeLibrarySnapshot | null>(null);
  const [report, setReport] = useState<LibraryAuditReport | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibrarySearchResult[]>([]);
  const [running, setRunning] = useState(false);

  const lastUpdate = useMemo(() => {
    const versions = snapshot?.versions ?? [];
    return versions.length > 0 ? versions.at(-1)?.created_at : undefined;
  }, [snapshot]);

  async function runAudit() {
    setRunning(true);
    try {
      const [{ loadKnowledgeLibrarySnapshot }, { auditKnowledgeLibrary }] = await Promise.all([
        import("./library-data.ts"),
        import("./library-engine.ts"),
      ]);
      const loaded = loadKnowledgeLibrarySnapshot();
      setSnapshot(loaded);
      setReport(auditKnowledgeLibrary(loaded));
      setResults([]);
    } finally {
      setRunning(false);
    }
  }

  async function runSearch() {
    if (!snapshot || !query.trim()) {
      setResults([]);
      return;
    }
    const { buildLibrarySearchIndex, searchKnowledgeLibrary } = await import("./library-engine.ts");
    setResults(searchKnowledgeLibrary(buildLibrarySearchIndex(snapshot), query));
  }

  return (
    <main className="min-h-screen pb-28 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_42%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(5,11,24,0.98))] p-6 shadow-2xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                <LibraryBig className="h-4 w-4" />
                Source unique de vérité
              </div>
              <h1 className="mt-3 font-display text-3xl font-black sm:text-4xl">
                Bibliothèque Pulseeo
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                Documents, connaissances et références versionnés. L’audit ne modifie jamais le
                contenu et bloque toute génération insuffisamment sourcée.
              </p>
            </div>
            <button
              type="button"
              onClick={runAudit}
              disabled={running}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 font-black text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.3)] transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70"
            >
              <Play className={`h-5 w-5 ${running ? "animate-pulse" : ""}`} />
              {running ? "Audit en cours…" : "Auditer la bibliothèque"}
            </button>
          </div>
        </header>

        {!report ? (
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              [FileCheck2, "Sources contrôlées", "Identité, version, hash et disponibilité."],
              [ShieldCheck, "Traçabilité complète", "Du document jusqu’à l’explication."],
              [Bot, "Pulse IA contraint", "Aucune connaissance absente de la bibliothèque."],
            ].map(([Icon, title, description]) => {
              const ItemIcon = Icon as typeof FileCheck2;
              return (
                <article
                  key={String(title)}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"
                >
                  <ItemIcon className="h-6 w-6 text-cyan-300" />
                  <h2 className="mt-4 font-bold">{String(title)}</h2>
                  <p className="mt-1 text-sm text-white/50">{String(description)}</p>
                </article>
              );
            })}
          </section>
        ) : (
          <>
            <section
              aria-live="polite"
              className="mt-6 flex flex-col gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {report.issuesBySeverity.CRITICAL === 0 ? (
                  <CheckCircle2 className="h-7 w-7 text-emerald-300" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-red-300" />
                )}
                <div>
                  <p className="font-black">Audit de bibliothèque terminé</p>
                  <p className="text-sm text-white/55">
                    {report.issuesBySeverity.CRITICAL} critique · {report.issuesBySeverity.WARNING}{" "}
                    avertissement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => downloadAudit(report)}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
              >
                Exporter l’audit JSON
              </button>
            </section>

            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Documents officiels" value={report.counts.officialDocuments} />
              <Metric label="Connaissances" value={report.counts.knowledge} />
              <Metric label="Questions" value={report.counts.questions} />
              <Metric label="Boss" value={report.counts.bosses} />
              <Metric
                label="Documents obsolètes"
                value={report.counts.obsoleteDocuments}
                warning={report.counts.obsoleteDocuments > 0}
              />
              <Metric
                label="Connaissances sans source"
                value={report.counts.knowledgeWithoutSource}
                warning={report.counts.knowledgeWithoutSource > 0}
              />
              <Metric
                label="Questions sans référence"
                value={report.counts.questionsWithoutReference}
                warning={report.counts.questionsWithoutReference > 0}
              />
              <Metric label="Score qualité" value={`${report.qualityScore} %`} />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-cyan-300" />
                  <h2 className="font-display text-lg font-black">Recherche plein texte</h2>
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void runSearch();
                    }}
                    placeholder="Rechercher une notion sourcée…"
                    className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 text-sm outline-none focus:border-cyan-300"
                  />
                  <button
                    type="button"
                    onClick={runSearch}
                    className="rounded-xl bg-white/10 px-4 text-sm font-bold hover:bg-white/15"
                  >
                    Rechercher
                  </button>
                </div>
                {snapshot?.knowledge.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100/75">
                    Aucun contenu officiel n’est encore importé. La recherche restera vide tant
                    qu’une source identifiable n’aura pas été enregistrée.
                  </p>
                ) : null}
                <div className="mt-4 space-y-2">
                  {results.map((result) => (
                    <div key={`${result.type}:${result.id}`} className="rounded-xl bg-black/20 p-3">
                      <p className="text-xs font-black uppercase text-cyan-300">{result.type}</p>
                      <p className="mt-1 font-bold">{result.title}</p>
                      <p className="mt-1 text-sm text-white/50">{result.excerpt}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-cyan-300" />
                  <h2 className="font-display text-lg font-black">État de la V1</h2>
                </div>
                <dl className="mt-4 space-y-4 text-sm">
                  <div>
                    <dt className="text-white/45">Version</dt>
                    <dd className="font-bold">{report.libraryVersion}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Dernière mise à jour</dt>
                    <dd className="font-bold">
                      {lastUpdate ? new Date(lastUpdate).toLocaleString("fr-FR") : "Non renseignée"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Ordre Pulse IA</dt>
                    <dd className="mt-1 text-white/70">
                      Master KB → Sources officielles → Connaissances → Questions → Cas cliniques
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 space-y-2">
                  {report.issues.slice(0, 8).map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-3"
                    >
                      <p className="text-xs font-black text-amber-300">{issue.severity}</p>
                      <p className="mt-1 text-sm text-white/65">{issue.message}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5 text-cyan-300" />
                <h2 className="font-display text-lg font-black">Garantie de publication</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Le contrôle de génération refuse une question si sa connaissance, son document, sa
                page ou sa version ne sont pas identifiables. La mise à jour d’une source produit
                uniquement un rapport d’impact ; aucune question ni connaissance n’est réécrite.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
