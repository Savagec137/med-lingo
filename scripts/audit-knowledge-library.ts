import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditKnowledgeLibrary } from "../src/features/knowledge-library/library-engine.ts";
import { parseKnowledgeLibrarySnapshot } from "../src/features/knowledge-library/library-schema.ts";

const root = process.cwd();

async function readJson(relativePath: string) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8")) as Record<
    string,
    unknown
  >;
}

const [
  officialDocuments,
  internalDocuments,
  knowledge,
  questions,
  bosses,
  clinicalCases,
  glossary,
  versions,
] = await Promise.all([
  readJson("docs/official_sources/document_catalog.json"),
  readJson("docs/internal_sources/internal_source_catalog.json"),
  readJson("docs/master_knowledge_base/knowledge.json"),
  readJson("docs/questions/references.json"),
  readJson("docs/boss/references.json"),
  readJson("docs/clinical_cases/references.json"),
  readJson("docs/glossary/glossary.json"),
  readJson("docs/versioning/library_versions.json"),
]);

const snapshot = parseKnowledgeLibrarySnapshot({
  schemaVersion: "1.0.0",
  libraryVersion: officialDocuments.library_version,
  documents: officialDocuments.documents,
  internalDocuments: internalDocuments.documents,
  knowledge: knowledge.knowledge,
  questions: questions.questions,
  bosses: bosses.bosses,
  clinicalCases: clinicalCases.clinical_cases,
  glossary: glossary.terms,
  versions: versions.versions,
});
const report = auditKnowledgeLibrary(snapshot);
const outputDirectory = path.join(root, "docs", "updates");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "library-audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const markdown = `# Audit de la bibliothèque Pulseeo

- Version : ${report.libraryVersion}
- Généré le : ${report.generatedAt}
- Score qualité : ${report.qualityScore} %
- Documents officiels : ${report.counts.officialDocuments}
- Connaissances : ${report.counts.knowledge}
- Questions : ${report.counts.questions}
- Boss : ${report.counts.bosses}
- Erreurs critiques : ${report.issuesBySeverity.CRITICAL}
- Erreurs : ${report.issuesBySeverity.ERROR}
- Avertissements : ${report.issuesBySeverity.WARNING}

## Anomalies

${
  report.issues.length === 0
    ? "Aucune anomalie détectée."
    : report.issues
        .map((issue) => `- **${issue.severity} — ${issue.code}** : ${issue.message}`)
        .join("\n")
}

Ce rapport est produit en lecture seule. Aucune donnée pédagogique n'a été modifiée.
`;

await writeFile(path.join(outputDirectory, "LIBRARY_AUDIT.md"), markdown, "utf8");

console.log(
  [
    "Audit de la bibliothèque terminé.",
    `${report.counts.officialDocuments} document(s) officiel(s)`,
    `${report.counts.knowledge} connaissance(s)`,
    `${report.counts.questions} question(s)`,
    `${report.issuesBySeverity.CRITICAL} erreur(s) critique(s)`,
    `Score : ${report.qualityScore} %`,
  ].join("\n"),
);
