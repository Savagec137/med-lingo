import { promises as fs } from "node:fs";
import path from "node:path";
import { runContentAudit } from "../src/features/content-audit/audit-engine.ts";
import {
  renderAuditHtml,
  renderAuditJson,
  renderAuditMarkdown,
} from "../src/features/content-audit/audit-reporters.ts";
import type { AuditInputFile } from "../src/features/content-audit/audit-domain.ts";

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listJsonFiles(absolutePath);
      return entry.isFile() && entry.name.endsWith(".json") ? [absolutePath] : [];
    }),
  );
  return nested.flat();
}

async function readAuditFile(projectRoot: string, absolutePath: string): Promise<AuditInputFile> {
  const bytes = await fs.readFile(absolutePath);
  const relativePath = path.relative(projectRoot, absolutePath).replaceAll("\\", "/");
  let text = "";
  let utf8Valid = true;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    utf8Valid = false;
    text = bytes.toString("utf8");
  }
  try {
    return {
      path: relativePath,
      sizeBytes: bytes.byteLength,
      data: JSON.parse(text) as unknown,
      utf8Valid,
    };
  } catch (error) {
    return {
      path: relativePath,
      sizeBytes: bytes.byteLength,
      parseError: error instanceof Error ? error.message : "JSON invalide.",
      utf8Valid,
    };
  }
}

async function main() {
  const startedAt = performance.now();
  const projectRoot = process.cwd();
  const contentRoot = path.join(projectRoot, "src", "content");
  const outputRoot = path.join(projectRoot, "docs", "audit");
  const paths = await listJsonFiles(contentRoot);
  const files = await Promise.all(paths.map((file) => readAuditFile(projectRoot, file)));
  const report = runContentAudit(files, {
    rootLabel: "src/content",
    analysisStartedAt: startedAt,
  });

  await fs.mkdir(outputRoot, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputRoot, "audit.json"), renderAuditJson(report), "utf8"),
    fs.writeFile(path.join(outputRoot, "AUDIT_REPORT.md"), renderAuditMarkdown(report), "utf8"),
    fs.writeFile(path.join(outputRoot, "audit.html"), renderAuditHtml(report), "utf8"),
  ]);

  console.log("Audit pédagogique terminé.");
  console.log(`${report.summary.blocks} blocs`);
  console.log(`${report.summary.parcours} parcours`);
  console.log(`${report.summary.lessons} leçons`);
  console.log(`${report.summary.knowledge} connaissances`);
  console.log(`${report.summary.questions} questions`);
  console.log(`${report.summary.bosses} Boss`);
  console.log(`${report.issuesBySeverity.CRITICAL} erreur(s) critique(s)`);
  console.log(`${report.issuesBySeverity.ERROR} erreur(s)`);
  console.log(`${report.issuesBySeverity.WARNING} avertissement(s)`);
  console.log(`Score qualité : ${report.qualityScore.total} / 100`);
  console.log(`Rapports : ${path.relative(projectRoot, outputRoot)}`);
}

await main();
