import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import deaFormation from "./formations/dea/formation.json" with { type: "json" };
import { FormationCatalog } from "./formation-catalog.ts";
import { parseLessonContentFile } from "./learning-schema.ts";

/**
 * Les règles de qualité d'un boss valent pour tous les parcours, pas pour le
 * seul parcours dont on s'occupe le jour où on les écrit. Ce fichier les
 * applique à chaque boss déclaré dans le catalogue : dès qu'un parcours en
 * ajoute un, il est tenu par les mêmes contraintes sans qu'on ait à y penser.
 *
 * Le périmètre est celui du briefing — contexte, informations initiales,
 * décisions, priorités, pièges, feedback final. Les énoncés des questions ne
 * sont pas examinés ici : les reprendre est un chantier de contenu distinct,
 * consigné dans `docs/BOSS_QUALITE.md`.
 */

const deaRoot = new URL("./formations/dea/", import.meta.url);
const DEA_FORMATION = new FormationCatalog([deaFormation]).getFormation("dea");

const bosses = DEA_FORMATION.parcours.flatMap((parcours) =>
  parcours.lessons
    .filter((reference) => reference.kind === "boss")
    .map((reference) => ({
      parcoursId: parcours.id,
      lesson: parseLessonContentFile(
        JSON.parse(readFileSync(new URL(reference.file, deaRoot), "utf8")) as unknown,
      ),
    })),
);

test("le catalogue déclare au moins un boss, et tous sont lisibles", () => {
  assert.ok(bosses.length >= 8, `${bosses.length} boss déclarés`);
});

/** Marqueurs d'un texte posé en situation plutôt qu'en consigne de cours. */
const SITUATIONAL =
  /victime|patient|apprenant|vous |votre |bilan|centre 15|samu|chute|témoin|collègue|intervention|transmission/i;

/* -------------------------------------------------------------------------- */
/* Le briefing : exigé de tous les boss, sans exception                       */
/* -------------------------------------------------------------------------- */

test("chaque boss porte une configuration et reste sur le moteur de leçon", () => {
  for (const { lesson } of bosses) {
    const configuration = lesson.bossConfiguration;
    assert.ok(configuration, `${lesson.id} sans bossConfiguration`);
    assert.equal(configuration!.engine, "existing_lesson_engine", lesson.id);
    assert.equal(configuration!.excludedEngine, "mode_intervention", lesson.id);
    assert.equal(configuration!.successThreshold, 0.8, lesson.id);
  }
});

test("chaque boss pose un contexte d'intervention, pas une consigne", () => {
  for (const { lesson } of bosses) {
    const scenario = lesson.bossConfiguration!.scenario;
    assert.ok(scenario.length >= 150, `${lesson.id} : contexte de ${scenario.length} caractères`);
    assert.ok(SITUATIONAL.test(scenario), `${lesson.id} : le contexte ne décrit aucune situation`);
  }
});

test("chaque boss annonce ce que le joueur sait en arrivant", () => {
  for (const { lesson } of bosses) {
    const initial = lesson.bossConfiguration!.initialInformation ?? [];
    assert.ok(initial.length >= 3, `${lesson.id} : ${initial.length} informations initiales`);
    for (const line of initial) {
      assert.ok(line.length >= 25, `${lesson.id} : « ${line} » est trop courte`);
    }
  }
});

test("les décisions à prendre sont des décisions, pas des fragments de phrase", () => {
  // Les boss importés portaient un `tasks` obtenu en découpant la phrase du
  // scénario sur ses retours à la ligne : « Mission : » y figurait comme tâche.
  for (const { lesson } of bosses) {
    const tasks = lesson.bossConfiguration!.tasks;
    assert.ok(tasks.length >= 3, `${lesson.id} : ${tasks.length} décisions`);
    for (const task of tasks) {
      assert.ok(task.length >= 25, `${lesson.id} : « ${task} » est trop courte`);
      assert.ok(!task.trimEnd().endsWith(":"), `${lesson.id} : « ${task} » est une amorce`);
    }
  }
});

test("chaque boss ordonne ses priorités et nomme ses pièges", () => {
  for (const { lesson } of bosses) {
    const configuration = lesson.bossConfiguration!;
    assert.ok(
      (configuration.priorities ?? []).length >= 3,
      `${lesson.id} : ${(configuration.priorities ?? []).length} priorités`,
    );
    assert.ok(
      (configuration.pitfalls ?? []).length >= 3,
      `${lesson.id} : ${(configuration.pitfalls ?? []).length} pièges`,
    );
  }
});

test("chaque boss porte un feedback final, en réussite comme en échec", () => {
  for (const { lesson } of bosses) {
    const debrief = lesson.bossConfiguration!.debrief;
    assert.ok(debrief, `${lesson.id} sans débriefing`);
    assert.ok(debrief!.success.length >= 100, `${lesson.id} : retour en réussite trop court`);
    assert.ok(debrief!.failure.length >= 100, `${lesson.id} : retour en échec trop court`);
    assert.notEqual(debrief!.success, debrief!.failure, lesson.id);
    assert.ok(debrief!.commonErrors.length >= 3, `${lesson.id} : erreurs fréquentes non nommées`);
  }
});

/* -------------------------------------------------------------------------- */
/* Le champ DEA : le briefing ne fait pas franchir la frontière               */
/* -------------------------------------------------------------------------- */

test("aucun briefing n'engage un geste hors du champ ambulancier", () => {
  const excluded = /inject|perfus|voie[\s-]veineuse|intraveineu|cath[eé]ter|seringue|intub/i;
  for (const { lesson } of bosses) {
    const configuration = lesson.bossConfiguration!;
    const text = [
      configuration.scenario,
      ...configuration.tasks,
      ...(configuration.initialInformation ?? []),
      ...(configuration.priorities ?? []),
      ...(configuration.pitfalls ?? []),
    ].join(" ");
    assert.ok(!excluded.test(text), `${lesson.id} : le briefing évoque un geste exclu`);
  }
});

test("aucune décision demandée au joueur ne relève du médecin", () => {
  // Interpréter, diagnostiquer, prescrire, orienter : quatre actes qui
  // appartiennent au médecin régulateur. Un boss peut les nommer comme piège,
  // jamais les demander comme tâche.
  //
  // Une tâche peut en revanche les employer sous forme niée — « rapporter sans
  // l'interpréter » demande exactement le contraire de l'acte interdit. Ces
  // tournures sont retirées avant l'examen, faute de quoi le test refuserait
  // précisément la formulation qu'il cherche à obtenir.
  const negated = /\bsans\s+(?:l['’]|les?\s+|en\s+)?[a-zà-ÿ]+(?:er|re|ir)\b/gi;
  const medical = /interpr[ée]t|diagnostiqu|prescri|orienter le patient/i;
  for (const { lesson } of bosses) {
    for (const task of lesson.bossConfiguration!.tasks) {
      const demanded = task.replace(negated, " ");
      assert.ok(!medical.test(demanded), `${lesson.id} : « ${task} » sort du champ DEA`);
    }
  }
});

test("chaque boss rappelle que la décision médicale ne lui appartient pas", () => {
  // Le Centre 15 reste décisionnaire : un boss qui ne le dit nulle part laisse
  // croire que l'ambulancier tranche.
  const regulation = /centre 15|médecin régulateur|médecin|régulation|samu/i;
  for (const { lesson } of bosses) {
    const configuration = lesson.bossConfiguration!;
    const text = [
      configuration.scenario,
      ...configuration.tasks,
      ...(configuration.priorities ?? []),
      ...(configuration.pitfalls ?? []),
      configuration.debrief?.success ?? "",
      configuration.debrief?.failure ?? "",
    ].join(" ");
    assert.ok(regulation.test(text), `${lesson.id} : la régulation n'est nommée nulle part`);
  }
});

/* -------------------------------------------------------------------------- */
/* Cliquet : la part d'énoncés en situation ne peut que monter                */
/* -------------------------------------------------------------------------- */

/**
 * Part d'énoncés posés en situation, boss par boss, relevée au moment où le
 * briefing a été posé. Les énoncés eux-mêmes n'ont pas été repris : ce budget
 * constate l'état actuel et **ne peut que monter**. Reprendre un boss, c'est
 * augmenter son plancher ici.
 */
const SITUATIONAL_FLOOR: Record<string, number> = {
  "dea-p01-boss": 1, //  1/15
  "dea-p02-boss": 3, //  3/15
  "dea-p03-boss": 3, //  3/15
  "dea-p04-boss": 1, //  1/8
  "dea-p05-boss": 1, //  1/8
  "dea-p06-boss": 2, //  2/8
  "dea-p07-boss": 1, //  1/8
  "dea-p08-boss": 6, //  6/10
  "dea-p18-boss": 4, //  4/14
};

test("la part d'énoncés en situation ne régresse dans aucun boss", () => {
  for (const { lesson } of bosses) {
    const floor = SITUATIONAL_FLOOR[lesson.id];
    assert.notEqual(floor, undefined, `${lesson.id} : plancher non déclaré`);
    const situational = lesson.items.filter((item) => SITUATIONAL.test(item.question));
    assert.ok(
      situational.length >= floor!,
      `${lesson.id} : ${situational.length} énoncés en situation, plancher à ${floor}`,
    );
  }
});

test("le plancher déclaré couvre exactement les boss du catalogue", () => {
  assert.deepEqual(
    Object.keys(SITUATIONAL_FLOOR).sort(),
    bosses.map(({ lesson }) => lesson.id).sort(),
  );
});
