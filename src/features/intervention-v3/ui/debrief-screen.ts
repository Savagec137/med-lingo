import type { DebriefReport, FactId } from "../v3-domain.ts";
import { getFact } from "../facts/fact-registry.ts";

/**
 * Écran 7 — « Débriefing ».
 *
 * Le seul écran qui prend un `DebriefReport` plutôt qu'une vue de session, et
 * c'est voulu : le rapport est **reconstruit** par le moteur à la fin de la
 * mission depuis le journal, les gestes et la transmission. Lui redonner la
 * session rouvrirait une porte que le rapport a précisément fermée.
 *
 * Huit sections, dans l'ordre où elles s'apprennent. Ce qui a été bien fait vient
 * en premier — un débriefing qui ouvre sur les fautes fait retenir les fautes, et
 * l'apprenant ressort sans savoir ce qu'il doit reproduire.
 *
 * Une section vide n'est pas affichée. « Aucune erreur de transmission » sur une
 * mission qui n'a rien transmis serait une félicitation imméritée ; l'absence de
 * la section dit la même chose sans mentir.
 */

export const DEBRIEF_SECTION_IDS = [
  "strengths",
  "not_sought",
  "not_measured",
  "handover_errors",
  "dangerous_gestures",
  "missed_gestures",
  "expected_conduct",
  "revision",
] as const;

export type DebriefSectionId = (typeof DEBRIEF_SECTION_IDS)[number];

/** Nature de la section, pour son traitement visuel. */
export type DebriefTone = "positive" | "neutral" | "warning" | "critical";

export interface DebriefEntryModel {
  id: string;
  label: string;
  /** Explication de l'entrée. Vide quand le libellé se suffit. */
  detail: string;
  /** Fiche à ouvrir depuis l'entrée, si le moteur en rattache une. */
  knowledgeId: string | null;
}

export interface DebriefSectionModel {
  id: DebriefSectionId;
  title: string;
  /**
   * Phrase qui dit ce que la section montre. Elle n'apparaît que si la section
   * a des entrées : une consigne sans contenu remplirait l'écran de vide.
   */
  caption: string;
  tone: DebriefTone;
  entries: DebriefEntryModel[];
}

export interface DebriefAxisModel {
  id: string;
  label: string;
  /** Nul quand l'axe n'a pas été mobilisé : affiché « non évalué », jamais 0 %. */
  percentage: number | null;
  rating: string | null;
  ratingLabel: string;
}

export interface DebriefScreenModel {
  eyebrow: string;
  title: string;
  passed: boolean;
  /** Renseigné sur un échec seulement. */
  failureReason: string | null;
  score: number;
  stars: number;
  globalRating: string;
  /** Durée de la mission, en minutes et secondes. */
  duration: string;
  livesRemaining: number;
  criticalErrorCount: number;
  trajectoryLabel: string | null;
  axes: DebriefAxisModel[];
  reward: { xp: number; coins: number; badge: string | null };
  /** Sections non vides, dans l'ordre où elles s'apprennent. */
  sections: DebriefSectionModel[];
}

const AXIS_RATING_LABELS: Record<string, string> = {
  excellent: "Excellent",
  tres_bien: "Très bien",
  bien: "Bien",
  suffisant: "Suffisant",
  a_ameliorer: "À améliorer",
};

const TRAJECTORY_LABELS: Record<string, string> = {
  amelioration: "État du patient amélioré",
  stabilisation: "État du patient stabilisé",
  aggravation: "État du patient aggravé",
  echec: "Prise en charge en échec",
};

const GESTURE_KIND_LABELS: Record<string, string> = {
  refused: "Tenté et refusé",
  not_indicated: "Retenu sans indication",
  unjustified: "Bon geste, sans raisonnement",
  missing: "Attendu et non retenu",
};

const COVERAGE_LABELS: Record<string, string> = {
  not_measured: "Non recueillie",
  not_measurable: "Hors d'atteinte — matériel non embarqué",
};

/** Durée en minutes et secondes. Une mission se compte en minutes, pas en secondes. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

/**
 * Une donnée est **chiffrée** quand une constante du moteur clinique l'alimente.
 *
 * C'est ce qui sépare « constantes non mesurées » de « informations non
 * recherchées » : l'une se prend avec un appareil, l'autre se demande. Les deux
 * oublis ne se corrigent pas de la même façon, et les mêler priverait le
 * débriefing de sa précision.
 */
const isMeasuredFact = (factId: FactId): boolean => getFact(factId).vitalKey !== null;

function section(
  id: DebriefSectionId,
  title: string,
  caption: string,
  tone: DebriefTone,
  entries: DebriefEntryModel[],
): DebriefSectionModel {
  return { id, title, caption, tone, entries };
}

export function debriefScreenModel(report: DebriefReport): DebriefScreenModel {
  const missingExpected = report.factCoverage.filter(
    (item) => item.expected && item.state !== "measured",
  );

  const sections: DebriefSectionModel[] = [
    section(
      "strengths",
      "Ce qui a été bien fait",
      "À reproduire lors de la prochaine intervention.",
      "positive",
      report.strengths.map((strength, index) => ({
        id: `${strength.axis}-${index}`,
        label: strength.label,
        detail: "",
        knowledgeId: null,
      })),
    ),

    section(
      "not_sought",
      "Informations non recherchées",
      "Attendues au bilan, elles se demandent au patient, à l'entourage ou aux documents.",
      "warning",
      missingExpected
        .filter((item) => !isMeasuredFact(item.factId))
        .map((item) => ({
          id: item.factId,
          label: item.label,
          detail: COVERAGE_LABELS[item.state] ?? "",
          knowledgeId: null,
        })),
    ),

    section(
      "not_measured",
      "Constantes non mesurées",
      "Attendues au bilan, elles se prennent avec le matériel embarqué.",
      "warning",
      missingExpected
        .filter((item) => isMeasuredFact(item.factId))
        .map((item) => ({
          id: item.factId,
          label: item.label,
          // « Hors d'atteinte » n'est pas un oubli : le matériel manquait.
          detail: COVERAGE_LABELS[item.state] ?? "",
          knowledgeId: null,
        })),
    ),

    section(
      "handover_errors",
      "Erreurs de transmission",
      "Ce que la régulation n'a pas su, et pourquoi.",
      "critical",
      report.handoverReview.map((entry) => ({
        id: entry.itemId,
        label: entry.label,
        detail: entry.detail,
        knowledgeId: null,
      })),
    ),

    section(
      "dangerous_gestures",
      "Gestes dangereux ou non indiqués",
      "Tentés, refusés, ou retenus sans élément clinique les fondant.",
      "critical",
      report.gestureReview
        .filter((entry) => entry.kind !== "missing")
        .map((entry) => ({
          id: entry.gestureId,
          label: `${entry.label} — ${GESTURE_KIND_LABELS[entry.kind] ?? entry.kind}`,
          detail: entry.detail,
          knowledgeId: null,
        })),
    ),

    section(
      "missed_gestures",
      "Gestes attendus non retenus",
      "Ils faisaient partie de la conduite à tenir pour ce patient.",
      "warning",
      report.gestureReview
        .filter((entry) => entry.kind === "missing")
        .map((entry) => ({
          id: entry.gestureId,
          label: entry.label,
          detail: entry.detail,
          knowledgeId: null,
        })),
    ),

    section(
      "expected_conduct",
      "La conduite attendue",
      "Ce qu'il fallait faire, indépendamment de ce qui a été fait.",
      "neutral",
      report.expectedConduct.map((line, index) => ({
        id: `conduct-${index}`,
        label: line,
        detail: "",
        knowledgeId: null,
      })),
    ),

    section(
      "revision",
      "À réviser",
      "Tiré des erreurs de cette mission, pas de tout ce qu'elle a mobilisé.",
      "neutral",
      report.revisionPoints.map((reference) => ({
        id: reference.knowledgeId,
        label: reference.title,
        detail: reference.subtitle,
        knowledgeId: reference.knowledgeId,
      })),
    ),
  ];

  return {
    eyebrow: "Mission terminée",
    title: "Débriefing",
    passed: report.passed,
    failureReason: report.failureReason ?? null,
    score: report.score,
    stars: report.stars,
    globalRating: report.globalRating,
    duration: formatDuration(report.totalSeconds),
    livesRemaining: report.livesRemaining,
    criticalErrorCount: report.criticalErrorCount,
    trajectoryLabel: report.trajectory ? (TRAJECTORY_LABELS[report.trajectory] ?? null) : null,
    axes: report.axes.map((axis) => ({
      id: axis.id,
      label: axis.label,
      percentage: axis.percentage,
      rating: axis.rating,
      // Un axe non mobilisé se dit, il ne se note pas à zéro : afficher 0 %
      // reprocherait au joueur une épreuve qu'il n'a pas passée.
      ratingLabel: axis.rating ? (AXIS_RATING_LABELS[axis.rating] ?? axis.rating) : "Non évalué",
    })),
    reward: {
      xp: report.reward.xp,
      coins: report.reward.coins,
      badge: report.reward.badge ?? null,
    },
    // Une section vide est retirée plutôt qu'affichée avec « aucun » : sur une
    // mission qui n'a rien transmis, « aucune erreur de transmission » serait une
    // félicitation imméritée.
    sections: sections.filter((entry) => entry.entries.length > 0),
  };
}
