import type { AuditIssue, AuditReport } from "./audit-domain.ts";
import { bytesLabel } from "./audit-utils.ts";

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sortedEntries(values: Record<string, number>): Array<[string, number]> {
  return Object.entries(values).sort((left, right) => right[1] - left[1]);
}

function issueRows(issues: AuditIssue[]): string {
  return issues
    .map(
      (issue) => `<tr>
        <td><span class="severity severity-${issue.severity.toLowerCase()}">${issue.severity}</span></td>
        <td>${escapeHtml(issue.category)}</td>
        <td><code>${escapeHtml(issue.code)}</code></td>
        <td>${escapeHtml(issue.entityId ?? "—")}</td>
        <td>${escapeHtml(issue.message)}</td>
        <td class="path">${escapeHtml(issue.file ?? "—")}</td>
      </tr>`,
    )
    .join("");
}

function barRows(values: Record<string, number>, color: string): string {
  const maximum = Math.max(1, ...Object.values(values));
  return sortedEntries(values)
    .map(
      ([label, value]) => `<div class="bar-row">
        <span>${escapeHtml(label)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(value / maximum) * 100}%;background:${color}"></div></div>
        <strong>${value}</strong>
      </div>`,
    )
    .join("");
}

export function renderAuditJson(report: AuditReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderAuditMarkdown(report: AuditReport): string {
  const lines = [
    "# Audit professionnel de la base pédagogique",
    "",
    `Généré le : ${report.generatedAt}`,
    "",
    "## Résumé",
    "",
    `- ${report.summary.blocks} blocs`,
    `- ${report.summary.parcours} parcours`,
    `- ${report.summary.lessons} leçons prévues`,
    `- ${report.summary.contentLessons} fichiers de contenu de leçon`,
    `- ${report.summary.knowledge} connaissances / compétences`,
    `- ${report.summary.questions} questions actives`,
    `- ${report.summary.bosses} Boss prévus`,
    `- ${report.summary.populatedBosses} Boss alimentés`,
    "",
    `**Score qualité : ${report.qualityScore.total} / 100**`,
    "",
    "## Niveau des anomalies",
    "",
    ...Object.entries(report.issuesBySeverity).map(
      ([severity, count]) => `- ${severity} : ${count}`,
    ),
    "",
    "## Types de questions",
    "",
    "| Type | Nombre |",
    "|---|---:|",
    ...sortedEntries(report.questionTypes).map(([type, count]) => `| ${type} | ${count} |`),
    "",
    "## Difficulté",
    "",
    "| Difficulté | Nombre |",
    "|---|---:|",
    ...sortedEntries(report.difficulties).map(
      ([difficulty, count]) => `| ${difficulty} | ${count} |`,
    ),
    "",
    "## Performance",
    "",
    `- Fichiers analysés : ${report.performance.fileCount}`,
    `- Taille : ${bytesLabel(report.performance.totalSizeBytes)}`,
    `- Mémoire estimée : ${bytesLabel(report.performance.estimatedMemoryBytes)}`,
    `- Durée : ${report.performance.analysisTimeMs} ms`,
    `- Moyenne : ${report.performance.averageTimePerQuestionMs} ms/question`,
    "",
    "## Supabase",
    "",
    `- Statut : ${report.supabase.status}`,
    `- ${report.supabase.message}`,
    "",
    "## Détail des anomalies",
    "",
    "| Niveau | Catégorie | Code | Entité | Message | Fichier |",
    "|---|---|---|---|---|---|",
    ...report.issues.map(
      (issue) =>
        `| ${issue.severity} | ${issue.category} | ${issue.code} | ${issue.entityId ?? "—"} | ${issue.message.replaceAll("|", "\\|")} | ${(issue.file ?? "—").replaceAll("|", "\\|")} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

export function renderAuditHtml(report: AuditReport): string {
  const counts = [
    ["Blocs", report.summary.blocks],
    ["Parcours", report.summary.parcours],
    ["Leçons", report.summary.lessons],
    ["Connaissances", report.summary.knowledge],
    ["Questions", report.summary.questions],
    ["Boss", report.summary.bosses],
  ];
  const scoreAngle = Math.max(0, Math.min(360, report.qualityScore.total * 3.6));
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Audit pédagogique Medoca</title>
  <style>
    :root{color-scheme:dark;--bg:#050b18;--panel:#0d1728;--line:#24334b;--cyan:#22d3ee;--purple:#a78bfa;--green:#34d399;--amber:#fbbf24;--red:#fb7185}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#172554 0,transparent 28%),var(--bg);color:#e5eefb;font:14px/1.45 Inter,system-ui,sans-serif}
    main{width:min(1400px,calc(100% - 32px));margin:0 auto;padding:42px 0 80px}h1,h2{margin:0}h1{font-size:36px}h2{margin-bottom:18px;font-size:19px}.muted{color:#94a3b8}.header{display:flex;justify-content:space-between;gap:24px;align-items:center;margin-bottom:28px}
    .score{width:132px;height:132px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--cyan) ${scoreAngle}deg,#1e293b 0);position:relative}.score:after{content:"";position:absolute;inset:12px;border-radius:50%;background:#07101e}.score strong{z-index:1;font-size:27px}.score small{z-index:1;display:block;text-align:center;color:#94a3b8}
    .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.card,.panel{border:1px solid var(--line);background:linear-gradient(145deg,rgba(15,27,47,.96),rgba(8,16,30,.96));box-shadow:0 16px 50px rgba(0,0,0,.24)}.card{border-radius:18px;padding:18px}.card strong{font-size:28px;display:block;color:#f8fafc}.panel{border-radius:22px;padding:22px;margin-top:18px}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.bar-row{display:grid;grid-template-columns:150px 1fr 60px;gap:12px;align-items:center;margin:10px 0}.bar-track{height:9px;border-radius:99px;background:#1e293b;overflow:hidden}.bar-fill{height:100%;border-radius:99px}
    .severity-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.severity-card{border-radius:14px;padding:14px;background:#101c2e}.severity-card strong{font-size:22px;display:block}.critical{color:#fda4af}.error{color:#fb7185}.warning{color:#fbbf24}.info{color:#7dd3fc}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:10px;border-bottom:1px solid #1e293b;vertical-align:top}th{position:sticky;top:0;background:#0d1728;color:#94a3b8}.table-wrap{max-height:720px;overflow:auto}.path{max-width:290px;word-break:break-all;color:#94a3b8}.severity{font-weight:800}.severity-critical{color:#fda4af}.severity-error{color:#fb7185}.severity-warning{color:#fbbf24}.severity-info{color:#7dd3fc}code{color:#c4b5fd}
    @media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}.two{grid-template-columns:1fr}.header{align-items:flex-start}.bar-row{grid-template-columns:110px 1fr 45px}}
    @media print{body{background:#fff;color:#111}.panel,.card{box-shadow:none;background:#fff;border-color:#ddd}.muted,.path{color:#555}.table-wrap{max-height:none;overflow:visible}.score:after{background:#fff}th{position:static;background:#fff}}
  </style>
</head>
<body>
<main>
  <header class="header">
    <div><p class="muted">MEDOCA · CONTRÔLE AVANT DÉPLOIEMENT</p><h1>Audit de la base pédagogique</h1><p class="muted">Généré le ${escapeHtml(report.generatedAt)} · périmètre : ${escapeHtml(report.scope.activeDefinition)}</p></div>
    <div class="score"><div><strong>${report.qualityScore.total}</strong><small>/ 100</small></div></div>
  </header>
  <section class="grid">${counts.map(([label, value]) => `<div class="card"><span class="muted">${label}</span><strong>${value}</strong></div>`).join("")}</section>
  <section class="panel"><h2>Niveaux d'anomalie</h2><div class="severity-grid">${Object.entries(
    report.issuesBySeverity,
  )
    .map(
      ([severity, count]) =>
        `<div class="severity-card"><span class="${severity.toLowerCase()}">${severity}</span><strong>${count}</strong></div>`,
    )
    .join("")}</div></section>
  <section class="two">
    <div class="panel"><h2>Types de questions</h2>${barRows(report.questionTypes, "linear-gradient(90deg,#06b6d4,#22d3ee)")}</div>
    <div class="panel"><h2>Difficulté</h2>${barRows(report.difficulties, "linear-gradient(90deg,#7c3aed,#c084fc)")}</div>
  </section>
  <section class="two">
    <div class="panel"><h2>Performance</h2><p>${report.performance.fileCount} fichiers · ${bytesLabel(report.performance.totalSizeBytes)}</p><p>${report.performance.analysisTimeMs} ms au total · ${report.performance.averageTimePerQuestionMs} ms/question</p><p class="muted">Mémoire estimée : ${bytesLabel(report.performance.estimatedMemoryBytes)}</p></div>
    <div class="panel"><h2>Supabase</h2><p><strong>${escapeHtml(report.supabase.status)}</strong></p><p>${escapeHtml(report.supabase.message)}</p></div>
  </section>
  <section class="panel"><h2>Détail complet (${report.issues.length})</h2><div class="table-wrap"><table><thead><tr><th>Niveau</th><th>Catégorie</th><th>Code</th><th>Entité</th><th>Message</th><th>Fichier</th></tr></thead><tbody>${issueRows(report.issues)}</tbody></table></div></section>
</main>
</body>
</html>`;
}
