import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specificationFile = path.join(
  root,
  "src",
  "content",
  "formations",
  "dea",
  "roadmap-v2.specification.txt",
);
const formationFile = path.join(root, "src", "content", "formations", "dea", "formation.json");

const specification = fs.readFileSync(specificationFile, "utf8");
const currentFormation = JSON.parse(fs.readFileSync(formationFile, "utf8"));

const headingPattern = /(?:BLOC|Parcours)\s+\d+\s+—[^\r\n]+/g;
const headings = [...specification.matchAll(headingPattern)].map((match) => {
  const raw = match[0].trim();
  const block = raw.match(/^BLOC\s+(\d+)\s+—\s+(.+)$/);
  if (block) {
    return {
      kind: "block",
      order: Number(block[1]),
      title: block[2].trim(),
      start: match.index,
      contentStart: match.index + match[0].length,
    };
  }
  const parcours = raw.match(/^Parcours\s+(\d+)\s+—\s+(.+)$/);
  if (!parcours) throw new Error(`Titre de feuille de route invalide : ${raw}`);
  return {
    kind: "parcours",
    order: Number(parcours[1]),
    title: parcours[2].trim(),
    start: match.index,
    contentStart: match.index + match[0].length,
  };
});

const nextHeadingStart = (index) => headings[index + 1]?.start ?? specification.length;
const sectionLines = (index) =>
  specification
    .slice(headings[index].contentStart, nextHeadingStart(index))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

function indexOfLabel(lines, patterns) {
  return lines.findIndex((line) => patterns.some((pattern) => pattern.test(line)));
}

function valueAfter(lines, patterns) {
  const index = indexOfLabel(lines, patterns);
  return index >= 0 ? (lines[index + 1] ?? null) : null;
}

function rangeAfter(lines, startPatterns, endPatterns) {
  const start = indexOfLabel(lines, startPatterns);
  if (start < 0) return [];
  const following = lines.slice(start + 1);
  const end = following.findIndex((line) => endPatterns.some((pattern) => pattern.test(line)));
  return end < 0 ? following : following.slice(0, end);
}

function parseDifficulty(label) {
  if (!label) return null;
  const normalized = label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (normalized.includes("debutant")) return "easy";
  if (normalized.includes("intermediaire")) return "medium";
  if (normalized.includes("difficile")) return "hard";
  if (normalized.includes("expert")) return "expert";
  return null;
}

function parseNumber(label) {
  if (!label) return null;
  const match = label.replace(/\s/g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function parseBadge(lines) {
  const index = lines.findIndex((line) => line.includes("🏅 Badge"));
  if (index < 0) return null;
  const inline = lines[index].replace(/^.*🏅\s*Badge(?:\s+légendaire)?\s*/i, "").trim();
  if (inline) return inline;
  return lines[index + 1] ?? null;
}

function parseChest(lines) {
  const line = lines.find((item) => item.includes("📦 Coffre"));
  if (!line) return null;
  const label = line
    .replace(/^.*📦\s*Coffre\s*/i, "")
    .replace(/[.。]$/, "")
    .trim();
  if (!label) return null;
  const normalized = label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (normalized.includes("bronze")) return "bronze";
  if (normalized.includes("argent")) return "silver";
  if (normalized.includes("or")) return "gold";
  if (normalized.includes("legendaire")) return "legendary";
  if (normalized.includes("mythique")) return "mythic";
  if (normalized.includes("platine")) return "platinum";
  return null;
}

function parseLessonBlueprints(parcoursOrder, lines) {
  const lessonStart = indexOfLabel(lines, [/^Leçons$/, /^Les 8 leçons$/, /^Les 8 leçons sont/]);
  const bossStart = indexOfLabel(lines, [/^Boss(?:\s|$)/, /^Boss Final(?:\s|$)/]);
  if (lessonStart < 0 || bossStart < 0 || bossStart <= lessonStart) return [];

  const outline = lines.slice(lessonStart + 1, bossStart);
  const explicit = outline
    .map((line) => line.match(/^(?:Leçon|Mission)\s+(\d+)\s+—\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({ order: Number(match[1]), title: match[2].trim() }));
  const inferred = explicit.length
    ? explicit
    : outline.slice(0, 8).map((title, index) => ({ order: index + 1, title }));

  return inferred.map((lesson) => ({
    id: `dea-p${String(parcoursOrder).padStart(2, "0")}-l${String(lesson.order).padStart(2, "0")}`,
    order: lesson.order,
    title: lesson.title,
    status: "awaiting_content",
  }));
}

function parseBoss(parcoursOrder, parcoursTitle, lines) {
  const start = indexOfLabel(lines, [/^Boss(?:\s|$)/, /^Boss Final(?:\s|$)/]);
  const reward = indexOfLabel(lines, [/^Récompense(?:s)?$/]);
  const scenario = start >= 0 ? lines.slice(start + 1, reward > start ? reward : undefined) : [];
  const heading = start >= 0 ? lines[start] : null;
  return {
    id: `dea-p${String(parcoursOrder).padStart(2, "0")}-boss`,
    parcoursId: `parcours-${String(parcoursOrder).padStart(2, "0")}`,
    title: heading && heading.includes("—") ? heading : `Boss — ${parcoursTitle}`,
    status: "awaiting_content",
    scenario,
    selection: {
      strategy: "mixed_competency_pool",
      minimumExercises: 8,
      maximumExercises: 12,
    },
    successThreshold: 0.8,
    rewardMultiplier: 1.5,
  };
}

const blockThemes = [
  "green",
  "blue",
  "purple",
  "teal",
  "orange",
  "red",
  "pink",
  "yellow",
  "indigo",
  "slate",
  "red",
  "cyan",
  "purple",
  "pink",
  "teal",
];

const blockHeadings = headings.filter((heading) => heading.kind === "block");
const parcoursHeadings = headings.filter((heading) => heading.kind === "parcours");

const blocks = blockHeadings.map((heading) => {
  const index = headings.indexOf(heading);
  const lines = sectionLines(index);
  return {
    id: `bloc-${String(heading.order).padStart(2, "0")}`,
    order: heading.order,
    title: heading.title,
    description: valueAfter(lines, [/^Objectif du bloc$/]),
    stage: heading.order <= 10 ? "core_dea" : "advanced",
    theme: blockThemes[heading.order - 1],
    sourceAnchor: `BLOC ${heading.order} — ${heading.title}`,
  };
});

const parcours = parcoursHeadings.map((heading) => {
  const index = headings.indexOf(heading);
  const lines = sectionLines(index);
  const block = [...blockHeadings].reverse().find((candidate) => candidate.start < heading.start);
  if (!block) throw new Error(`Bloc absent pour le parcours ${heading.order}`);

  const subtitle = valueAfter(lines, [/^Sous-titre$/]);
  const objective = valueAfter(lines, [/^Objectif(?: du parcours)?$/]);
  const competencies = rangeAfter(
    lines,
    [/^Compétences(?: développées| évaluées)?$/],
    [
      /^Difficulté$/,
      /^Durée(?: estimée)?$/,
      /^XP$/,
      /^Leçons$/,
      /^Les 8 leçons/,
      /^Boss(?:\s|$)/,
      /^Boss Final(?:\s|$)/,
      /^Récompense/,
    ],
  );
  const difficultyLabel = valueAfter(lines, [/^Difficulté$/]);
  const durationLabel = valueAfter(lines, [/^Durée(?: estimée)?$/]);
  const xpLabel = valueAfter(lines, [/^XP$/]);
  const lessonBlueprints = parseLessonBlueprints(heading.order, lines);
  const badge = parseBadge(lines);
  const chest = parseChest(lines);
  const xp = parseNumber(xpLabel);
  const metadataPending = [];
  if (!objective) metadataPending.push("objectives");
  if (competencies.length === 0) metadataPending.push("competencies");
  if (!difficultyLabel) metadataPending.push("difficulty");
  if (!durationLabel) metadataPending.push("duration");
  if (xp === null) metadataPending.push("xp");
  if (!chest || chest === "platinum") metadataPending.push("chest");

  return {
    id: `parcours-${String(heading.order).padStart(2, "0")}`,
    contentId: `dea-p${String(heading.order).padStart(2, "0")}`,
    blocId: `bloc-${String(block.order).padStart(2, "0")}`,
    order: heading.order,
    title: heading.title,
    subtitle,
    description: objective,
    objectives: objective ? [objective] : [],
    competencies,
    difficulty: parseDifficulty(difficultyLabel),
    difficultyLabel,
    estimatedMinutes: parseNumber(durationLabel),
    estimatedDurationLabel: durationLabel,
    xp,
    badge,
    chest,
    plannedLessonCount: lessonBlueprints.length,
    lessonBlueprints,
    bossId: `dea-p${String(heading.order).padStart(2, "0")}-boss`,
    prerequisiteIds:
      heading.order === 1 ? [] : [`dea-p${String(heading.order - 1).padStart(2, "0")}-boss`],
    unlocksParcoursId:
      heading.order === parcoursHeadings.length
        ? null
        : `parcours-${String(heading.order + 1).padStart(2, "0")}`,
    stage: heading.order <= 50 ? "core_dea" : "advanced",
    pedagogicalScope:
      block.order <= 4
        ? "foundation"
        : block.order === 5 || block.order === 8 || block.order === 9
          ? "professional_practice"
          : block.order === 6
            ? "emergency_recognition"
            : block.order === 7
              ? "pathology"
              : block.order === 10
                ? "professional_practice"
                : "advanced_differential",
    contentStatus: "awaiting_content",
    metadataStatus: metadataPending.length === 0 ? "complete" : "pending_specification",
    pendingFields: metadataPending,
    sourceAnchor: `Parcours ${heading.order} — ${heading.title}`,
  };
});

const bosses = parcoursHeadings.map((heading) => {
  const index = headings.indexOf(heading);
  return parseBoss(heading.order, heading.title, sectionLines(index));
});

const roadmap = {
  schemaVersion: 1,
  id: "dea-roadmap-v2",
  formationId: "dea",
  status: "official_structure",
  source: {
    file: "roadmap-v2.specification.txt",
    projection: "structure_only",
    medicalValidation: "required_before_publication",
  },
  stages: [
    {
      id: "core_dea",
      title: "Socle DEA",
      firstParcoursOrder: 1,
      lastParcoursOrder: 50,
      capstoneBossId: "dea-p50-boss",
    },
    {
      id: "advanced",
      title: "Approfondissements",
      firstParcoursOrder: 51,
      lastParcoursOrder: 75,
      prerequisiteBossId: "dea-p50-boss",
    },
  ],
  blocks,
  parcours,
  bosses,
};

function buildFormation() {
  const currentById = new Map(currentFormation.parcours.map((item) => [item.id, item]));
  return {
    schemaVersion: 2,
    id: currentFormation.id,
    title: currentFormation.title,
    charterId: currentFormation.charterId,
    roadmapFile: "roadmap-v2.json",
    blocs: blocks.map(({ id, order, title, description, stage, theme, sourceAnchor }) => ({
      id,
      order,
      title,
      description,
      stage,
      theme,
      sourceAnchor,
    })),
    parcours: parcours.map((item) => {
      const current = currentById.get(item.id);
      return {
        id: item.id,
        contentId: item.contentId,
        blocId: item.blocId,
        order: item.order,
        title: item.title,
        subtitle: current?.subtitle ?? item.subtitle ?? item.title,
        objective: current?.objective ?? item.description ?? undefined,
        manifestFile: current?.manifestFile,
        unlocksParcoursId: item.unlocksParcoursId ?? undefined,
        theme: blockThemes[Number(item.blocId.slice(-2)) - 1],
        stage: item.stage,
        pedagogicalScope: item.pedagogicalScope,
        difficulty: item.difficulty,
        estimatedMinutes: item.estimatedMinutes,
        xp: item.xp,
        badge: item.badge,
        chest: item.chest,
        plannedLessonCount: item.plannedLessonCount,
        bossId: item.bossId,
        prerequisiteIds: item.prerequisiteIds,
        contentStatus: current?.lessons?.some((lesson) => lesson.status === "published")
          ? "partial"
          : "awaiting_content",
        metadataStatus: item.metadataStatus,
        pendingFields: item.pendingFields,
        sourceAnchor: item.sourceAnchor,
        lessons: current?.lessons ?? [],
      };
    }),
  };
}

const kind = process.argv[2] ?? "roadmap";
if (kind === "roadmap") {
  process.stdout.write(`${JSON.stringify(roadmap, null, 2)}\n`);
} else if (kind === "formation") {
  process.stdout.write(`${JSON.stringify(buildFormation(), null, 2)}\n`);
} else {
  throw new Error(`Sortie inconnue : ${kind}`);
}
