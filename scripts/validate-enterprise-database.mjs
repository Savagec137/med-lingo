import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const architectureDirectory = join(root, "supabase", "architecture", "v1");
const documentationDirectory = join(root, "docs", "database");
const sqlFiles = readdirSync(architectureDirectory)
  .filter((name) => /^\d{2}_.+\.sql$/.test(name))
  .sort();

const sources = sqlFiles.map((name) => ({
  name,
  content: readFileSync(join(architectureDirectory, name), "utf8"),
}));
const sql = sources.map(({ content }) => content).join("\n");

function splitTopLevel(value) {
  const parts = [];
  let current = "";
  let depth = 0;
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];
    if (character === "'" && quoted && next === "'") {
      current += "''";
      index += 1;
      continue;
    }
    if (character === "'") quoted = !quoted;
    if (!quoted && character === "(") depth += 1;
    if (!quoted && character === ")") depth -= 1;
    if (!quoted && depth === 0 && character === ",") {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

const comments = new Map();
for (const match of sql.matchAll(
  /COMMENT ON TABLE\s+([a-z_]+\.[a-z_]+)\s+IS\s+'((?:''|[^'])*)';/g,
)) {
  comments.set(match[1], match[2].replaceAll("''", "'"));
}

const indexes = new Map();
for (const match of sql.matchAll(
  /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF NOT EXISTS\s+)?([a-zA-Z0-9_]+)\s+ON\s+([a-z_]+\.[a-z_]+)\s+([\s\S]*?);/g,
)) {
  const [, unique, name, table, definition] = match;
  const tableIndexes = indexes.get(table) ?? [];
  tableIndexes.push({
    name,
    unique: Boolean(unique),
    definition: normalizeWhitespace(definition),
  });
  indexes.set(table, tableIndexes);
}

const errors = [];
const warnings = [];
const tables = [];
for (const source of sources) {
  for (const match of source.content.matchAll(
    /CREATE TABLE\s+([a-z_]+\.[a-z_]+)\s*\(([\s\S]*?)\n\)(?:\s+PARTITION BY\s+[^;]+)?;/g,
  )) {
    const [, name, body] = match;
    const entries = splitTopLevel(body);
    const columns = [];
    const constraints = [];

    for (const entry of entries) {
      const normalized = normalizeWhitespace(entry);
      if (/^(CONSTRAINT|PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)\b/i.test(normalized)) {
        constraints.push(normalized);
        continue;
      }

      const columnMatch = normalized.match(/^([a-z_][a-z0-9_]*)\s+(.+)$/i);
      if (!columnMatch) {
        constraints.push(normalized);
        continue;
      }

      const [, columnName, remainder] = columnMatch;
      const keywordMatch = remainder.match(
        /\s+(?=NOT NULL\b|NULL\b|DEFAULT\b|PRIMARY KEY\b|REFERENCES\b|UNIQUE\b|CHECK\b|GENERATED\b)/i,
      );
      const type = keywordMatch ? remainder.slice(0, keywordMatch.index).trim() : remainder.trim();
      const defaultMatch = remainder.match(
        /\bDEFAULT\s+(.+?)(?=\s+(?:NOT NULL|NULL|PRIMARY KEY|REFERENCES|UNIQUE|CHECK|GENERATED)\b|$)/i,
      );
      const referenceMatch = remainder.match(
        /\bREFERENCES\s+([a-z_]+\.[a-z_]+)\s*\(([^)]+)\)(?:\s+ON DELETE\s+([A-Z ]+?))?(?=\s+(?:ON UPDATE|DEFERRABLE|NOT DEFERRABLE|CHECK|UNIQUE)|$)/i,
      );
      columns.push({
        name: columnName,
        type,
        nullable: !/\bNOT NULL\b/i.test(remainder) && !/\bPRIMARY KEY\b/i.test(remainder),
        default: defaultMatch ? defaultMatch[1].trim() : null,
        primaryKey: /\bPRIMARY KEY\b/i.test(remainder),
        unique: /\bUNIQUE\b/i.test(remainder),
        reference: referenceMatch
          ? {
              table: referenceMatch[1],
              column: referenceMatch[2].trim(),
              onDelete: referenceMatch[3]?.trim() ?? null,
            }
          : null,
        checks: [...remainder.matchAll(/\bCHECK\s*(\([\s\S]+\))/gi)].map((item) =>
          normalizeWhitespace(item[1]),
        ),
      });
    }

    const tablePrimaryKey = constraints.find((item) =>
      /^(?:CONSTRAINT\s+\S+\s+)?PRIMARY KEY\b/i.test(item),
    );
    const tableForeignKeys = constraints.filter((item) => /\bFOREIGN KEY\b/i.test(item));
    const tableUnique = constraints.filter((item) =>
      /^(?:CONSTRAINT\s+\S+\s+)?UNIQUE\b/i.test(item),
    );
    const tableChecks = constraints.filter((item) => /\bCHECK\b/i.test(item));

    tables.push({
      name,
      domain: name.split(".")[0],
      file: source.name,
      description: comments.get(name) ?? "",
      columns,
      primaryKey:
        tablePrimaryKey ??
        columns
          .filter((column) => column.primaryKey)
          .map((column) => column.name)
          .join(", "),
      foreignKeys: [
        ...columns
          .filter((column) => column.reference)
          .map(
            (column) =>
              `${column.name} -> ${column.reference.table}.${column.reference.column}` +
              (column.reference.onDelete ? ` ON DELETE ${column.reference.onDelete}` : ""),
          ),
        ...tableForeignKeys,
      ],
      uniqueConstraints: [
        ...columns.filter((column) => column.unique).map((column) => column.name),
        ...tableUnique,
      ],
      checks: [
        ...columns.flatMap((column) => column.checks.map((check) => `${column.name}: ${check}`)),
        ...tableChecks,
      ],
      indexes: indexes.get(name) ?? [],
    });
  }
}

const tablesByName = new Map(tables.map((table) => [table.name, table]));
for (const table of tables) {
  for (const foreignKey of table.foreignKeys) {
    const match = foreignKey.match(
      /FOREIGN KEY\s*\(([^)]+)\)\s+REFERENCES\s+([a-z_]+\.[a-z_]+)\s*\(([^)]+)\)(?:\s+ON DELETE\s+([A-Z ]+?))?(?:\s|$)/i,
    );
    if (!match) continue;
    const localColumns = match[1].split(",").map((column) => column.trim());
    const referencedColumns = match[3].split(",").map((column) => column.trim());
    if (localColumns.length !== 1 || referencedColumns.length !== 1) continue;
    const column = table.columns.find((candidate) => candidate.name === localColumns[0]);
    if (column && !column.reference) {
      column.reference = {
        table: match[2],
        column: referencedColumns[0],
        onDelete: match[4]?.trim() ?? null,
      };
    }
  }
}

for (const match of sql.matchAll(
  /ALTER TABLE\s+([a-z_]+\.[a-z_]+)\s+ADD CONSTRAINT\s+([a-zA-Z0-9_]+)\s+FOREIGN KEY\s*\(([^)]+)\)\s+REFERENCES\s+([a-z_]+\.[a-z_]+)\s*\(([^)]+)\)(?:\s+ON DELETE\s+([A-Z ]+?))?(?=\s+(?:ON UPDATE|DEFERRABLE|NOT DEFERRABLE)|;)/gi,
)) {
  const [, tableName, constraintName, localColumns, referencedTable, referencedColumns, onDelete] =
    match;
  const table = tablesByName.get(tableName);
  if (!table) {
    errors.push(`ALTER TABLE references missing local table ${tableName}`);
    continue;
  }

  const localColumnNames = localColumns.split(",").map((column) => column.trim());
  const referencedColumnNames = referencedColumns.split(",").map((column) => column.trim());
  const relation =
    `CONSTRAINT ${constraintName}: (${localColumns}) -> ` +
    `${referencedTable} (${referencedColumns})` +
    (onDelete ? ` ON DELETE ${onDelete.trim()}` : "");
  table.foreignKeys.push(relation);

  if (localColumnNames.length === 1 && referencedColumnNames.length === 1) {
    const column = table.columns.find((candidate) => candidate.name === localColumnNames[0]);
    if (column && !column.reference) {
      column.reference = {
        table: referencedTable,
        column: referencedColumnNames[0],
        onDelete: onDelete?.trim() ?? null,
      };
    }
  }
}

const physicalPartitions = [
  ...sql.matchAll(
    /CREATE TABLE\s+([a-z_]+\.[a-z_]+)\s+PARTITION OF\s+([a-z_]+\.[a-z_]+)\s+DEFAULT;/g,
  ),
].map((match) => ({ name: match[1], parent: match[2] }));

const tableNames = new Set();
for (const table of tables) {
  if (tableNames.has(table.name)) errors.push(`Duplicate table: ${table.name}`);
  tableNames.add(table.name);
  if (!table.description) errors.push(`Missing table comment: ${table.name}`);
  if (!table.primaryKey) warnings.push(`No explicit primary key: ${table.name}`);
  const columnNames = new Set();
  for (const column of table.columns) {
    if (columnNames.has(column.name)) {
      errors.push(`Duplicate column: ${table.name}.${column.name}`);
    }
    columnNames.add(column.name);
  }
  for (const foreignKey of table.foreignKeys) {
    const referencedTable = foreignKey.match(/->\s+([a-z_]+\.[a-z_]+)/)?.[1];
    if (
      referencedTable &&
      !tableNames.has(referencedTable) &&
      !tables.some((candidate) => candidate.name === referencedTable) &&
      !["auth.users", "storage.objects", "storage.buckets"].includes(referencedTable)
    ) {
      errors.push(`${table.name} references missing table ${referencedTable}`);
    }
  }
}

function leadingIndexedColumns(table) {
  const leadingColumns = new Set(
    table.columns
      .filter((column) => column.primaryKey || column.unique)
      .map((column) => column.name),
  );
  const primaryKeyColumn = String(table.primaryKey).match(
    /PRIMARY KEY\s*\(\s*([a-z_][a-z0-9_]*)/i,
  )?.[1];
  if (primaryKeyColumn) leadingColumns.add(primaryKeyColumn);
  for (const constraint of table.uniqueConstraints) {
    const column = String(constraint).match(/UNIQUE\s*\(\s*([a-z_][a-z0-9_]*)/i)?.[1];
    if (column) leadingColumns.add(column);
  }
  for (const index of table.indexes) {
    const column = index.definition.match(/(?:USING\s+[a-z_]+\s*)?\(\s*([a-z_][a-z0-9_]*)/i)?.[1];
    if (column) leadingColumns.add(column);
  }
  return leadingColumns;
}

const foreignKeyIndexGaps = [];
for (const table of tables) {
  const leadingColumns = leadingIndexedColumns(table);
  for (const column of table.columns.filter((candidate) => candidate.reference)) {
    if (!leadingColumns.has(column.name)) {
      foreignKeyIndexGaps.push(`${table.name}.${column.name}`);
    }
  }
}
if (foreignKeyIndexGaps.length) {
  warnings.push(
    `${foreignKeyIndexGaps.length} foreign keys lack a leading index: ` +
      foreignKeyIndexGaps.join(", "),
  );
}

for (const match of sql.matchAll(/'([a-z_]+\.[a-z_]+)'::regclass/g)) {
  const referencedTable = match[1];
  if (
    !tableNames.has(referencedTable) &&
    !["storage.objects", "storage.buckets", "realtime.messages"].includes(referencedTable)
  ) {
    errors.push(`Dynamic SQL references missing table ${referencedTable}`);
  }
}

const ownerReadSection =
  sql.match(
    /-- Direct owner-read tables[\s\S]*?-- Self-service profile\/preferences\/device settings/,
  )?.[0] ?? "";
for (const match of ownerReadSection.matchAll(/'([a-z_]+\.[a-z_]+)'::regclass/g)) {
  const table = tablesByName.get(match[1]);
  if (table && !table.columns.some((column) => column.name === "user_id")) {
    errors.push(`Owner-read RLS target has no user_id: ${table.name}`);
  }
}

for (const match of sql.matchAll(
  /CREATE TRIGGER\s+broadcast_[a-z_]+[\s\S]*?\sON\s+([a-z_]+\.[a-z_]+)[\s\S]*?operations\.broadcast_user_projection\(\);/g,
)) {
  const table = tablesByName.get(match[1]);
  if (!table) {
    errors.push(`Broadcast trigger references missing table ${match[1]}`);
  } else if (!table.columns.some((column) => column.name === "user_id")) {
    errors.push(`Broadcast target has no user_id: ${table.name}`);
  }
}

if (/\bDROP\s+TABLE\b/i.test(sql)) errors.push("Destructive DROP TABLE detected");
if (/\bTRUNCATE\b/i.test(sql)) errors.push("Destructive TRUNCATE detected");
if (/\bDELETE\s+FROM\b/i.test(sql)) {
  warnings.push("DELETE FROM detected; verify that it is not destructive migration logic");
}

for (const match of sql.matchAll(
  /CREATE OR REPLACE FUNCTION\s+([a-z_]+\.[a-z_]+)\s*\([\s\S]*?\)\s*RETURNS[\s\S]*?\$\$;/g,
)) {
  const block = match[0];
  if (/\bSECURITY DEFINER\b/i.test(block) && !/\bSET search_path = ''/i.test(block)) {
    errors.push(`SECURITY DEFINER without empty search_path: ${match[1]}`);
  }
}

if (!/ENABLE ROW LEVEL SECURITY/.test(sql)) {
  errors.push("No RLS enabling statement found");
}
if (!/FORCE ROW LEVEL SECURITY/.test(sql)) {
  errors.push("RLS is not forced");
}
if (
  /GRANT EXECUTE ON FUNCTION\s+practice\.grade_response\([^;]+?\)\s+TO\s+[^;]*authenticated/i.test(
    sql,
  )
) {
  errors.push("Sensitive answer-grading helper is executable by authenticated");
}
if (
  /GRANT EXECUTE ON FUNCTION\s+gamification\.grant_reward_bundle\([^;]+?\)\s+TO\s+[^;]*authenticated/i.test(
    sql,
  )
) {
  errors.push("Reward grant helper is executable by authenticated");
}
if (
  /CREATE OR REPLACE FUNCTION\s+api\.[a-z_]+\s*\([\s\S]*?\)\s*RETURNS[\s\S]*?\bSECURITY DEFINER\b[\s\S]*?\$\$;/i.test(
    sql,
  )
) {
  errors.push("SECURITY DEFINER function found in exposed api schema");
}
if (!/realtime\.broadcast_changes\s*\(/i.test(sql)) {
  errors.push("Private Realtime Broadcast function is missing");
}
if (/ALTER PUBLICATION\s+supabase_realtime\s+ADD TABLE/i.test(sql)) {
  warnings.push("Postgres Changes publication detected; Broadcast is the scale target");
}

const domainCounts = Object.entries(Object.groupBy(tables, (table) => table.domain))
  .map(([domain, entries]) => ({ domain, count: entries.length }))
  .sort((left, right) => left.domain.localeCompare(right.domain));

function cardinalityFor(column, table) {
  if (!column.reference) return "";
  const singleUnique =
    column.primaryKey ||
    column.unique ||
    table.uniqueConstraints.some((constraint) =>
      new RegExp(`\\(${column.name}\\)`, "i").test(constraint),
    );
  return singleUnique ? "1:0..1" : "N:1";
}

function renderCatalog() {
  const lines = [
    "# Dictionnaire de données MedLingo Enterprise V1",
    "",
    "> Ce document est généré depuis le SQL de référence. Le SQL reste la",
    "> définition exécutable exacte des types, valeurs par défaut, contraintes et index.",
    "",
    `- Tables logiques : **${tables.length}**`,
    `- Partitions physiques par défaut : **${physicalPartitions.length}**`,
    `- Index explicites : **${[...indexes.values()].flat().length}**`,
    "",
    "## Répartition par domaine",
    "",
    "| Domaine | Tables |",
    "|---|---:|",
    ...domainCounts.map(({ domain, count }) => `| \`${domain}\` | ${count} |`),
    "",
  ];

  for (const { domain } of domainCounts) {
    lines.push(`## Domaine \`${domain}\``, "");
    for (const table of tables.filter((candidate) => candidate.domain === domain)) {
      lines.push(
        `### \`${table.name}\``,
        "",
        `**Description et justification.** ${table.description}`,
        "",
        `**Définition SQL.** [${table.file}](../../supabase/architecture/v1/${table.file})`,
        "",
        "| Colonne | Type PostgreSQL | NULL | Défaut | PK | Unique | Référence / cardinalité | Contraintes |",
        "|---|---|:---:|---|:---:|:---:|---|---|",
      );
      for (const column of table.columns) {
        const reference = column.reference
          ? `\`${column.reference.table}.${column.reference.column}\` (${cardinalityFor(column, table)})`
          : "—";
        lines.push(
          `| \`${column.name}\` | \`${column.type}\` | ${column.nullable ? "oui" : "non"} | ` +
            `${column.default ? `\`${column.default.replaceAll("|", "\\|")}\`` : "—"} | ` +
            `${column.primaryKey ? "oui" : "—"} | ${column.unique ? "oui" : "—"} | ` +
            `${reference} | ${column.checks.length ? column.checks.map((item) => `\`${item.replaceAll("|", "\\|")}\``).join("<br>") : "—"} |`,
        );
      }
      lines.push(
        "",
        `**Clé primaire.** ${table.primaryKey ? `\`${table.primaryKey}\`` : "Aucune clé autonome : partition physique."}`,
        "",
        `**Relations.** ${table.foreignKeys.length ? table.foreignKeys.map((item) => `\`${item}\``).join("; ") : "Aucune relation sortante."}`,
        "",
        `**Contraintes uniques.** ${table.uniqueConstraints.length ? table.uniqueConstraints.map((item) => `\`${item}\``).join("; ") : "Aucune au-delà de la clé primaire."}`,
        "",
        `**Checks.** ${table.checks.length ? table.checks.map((item) => `\`${item.replaceAll("|", "\\|")}\``).join("; ") : "Aucun check de table supplémentaire."}`,
        "",
        `**Index.** ${table.indexes.length ? table.indexes.map((index) => `\`${index.name}\` (${index.unique ? "unique, " : ""}${index.definition})`).join("; ") : "Clé primaire / uniques uniquement."}`,
        "",
      );
    }
  }

  if (physicalPartitions.length) {
    lines.push("## Partitions physiques", "");
    for (const partition of physicalPartitions) {
      lines.push(`- \`${partition.name}\` : partition par défaut de \`${partition.parent}\`.`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const report = {
  generatedAt: new Date().toISOString(),
  sqlFiles,
  logicalTableCount: tables.length,
  physicalPartitionCount: physicalPartitions.length,
  explicitIndexCount: [...indexes.values()].flat().length,
  tableCommentCount: comments.size,
  foreignKeyIndexGapCount: foreignKeyIndexGaps.length,
  foreignKeyIndexGaps,
  domainCounts,
  errors,
  warnings,
};

if (process.argv.includes("--write")) {
  mkdirSync(documentationDirectory, { recursive: true });
  writeFileSync(join(documentationDirectory, "TABLE_CATALOG.md"), renderCatalog(), "utf8");
  writeFileSync(
    join(documentationDirectory, "VALIDATION_REPORT.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
