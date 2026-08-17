import type {
  FactId,
  InterventionSessionView,
  PlayerActionId,
  ReinforcementStatus,
} from "../v3-domain.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { getFact } from "../facts/fact-registry.ts";
import { readFact } from "../facts/read-fact.ts";
import { actionsForPhase, findAction } from "../actions/action-catalog.ts";
import { currentReevaluation, reevaluationStatus, transportReadiness } from "../engine/queries.ts";
import { actionAvailability } from "./action-availability.ts";

/**
 * Écran 6 — « Réévaluation patient ».
 *
 * L'écran qui rend le temps visible. Trois états, et il faut les trois : une
 * constante **à jour**, une constante **datée**, une constante **jamais relevée**.
 * Les deux dernières se ressemblent à l'écran et ne se corrigent pas de la même
 * façon — l'une se remesure, l'autre se mesure pour la première fois.
 *
 * L'écran affiche ce qu'un départ immédiat coûterait, en points et en vie. Le mode
 * laisse partir : il ne cache pas le prix.
 */

export type ConstantFreshness = "fresh" | "stale" | "never";

export interface ReevaluationRowModel {
  factId: FactId;
  label: string;
  freshness: ConstantFreshness;
  freshnessLabel: string;
  /** Âge de la mesure, en secondes simulées. Nul si jamais relevée. */
  ageSeconds: number | null;
  /** Reprise depuis l'ouverture du cycle courant. */
  refreshed: boolean;
  /** Geste qui la reprendrait, s'il est proposé à cette étape. */
  action: {
    id: PlayerActionId;
    label: string;
    enabled: boolean;
    disabledReason: string | null;
  } | null;
}

export interface ReevaluationScreenModel {
  eyebrow: string;
  title: string;
  narrative: string;
  /** Numéro du cycle en cours. Zéro tant qu'aucun n'est ouvert. */
  cycle: number;
  /** Vrai quand un cycle est ouvert et non validé. */
  open: boolean;
  rows: ReevaluationRowModel[];
  staleCount: number;
  missingCount: number;
  refreshedCount: number;
  /** Validation possible : quelque chose a été repris, ou rien ne manquait. */
  canValidate: boolean;
  validationBlockedReason: string | null;
  reinforcement: ReinforcementStatus;
  reinforcementLabel: string;
  /** Ce qu'un départ immédiat coûterait. */
  transport: {
    ready: boolean;
    /** Points perdus par le départ en l'état. */
    penalty: number;
    /** Vrai si partir maintenant coûte une vie. */
    graveFault: boolean;
    warning: string | null;
  };
}

const FRESHNESS_LABELS: Record<ConstantFreshness, string> = {
  fresh: "À jour",
  stale: "À réévaluer",
  never: "Non mesurée",
};

const REINFORCEMENT_LABELS: Record<ReinforcementStatus, string> = {
  none: "Aucun renfort demandé",
  requested: "Renfort demandé",
  en_route: "Renfort en route",
  on_scene: "Renfort sur place",
};

/** Geste qui reprendrait la constante, parmi ceux offerts à la phase courante. */
function refreshAction(
  session: InterventionSessionView,
  factId: FactId,
): ReevaluationRowModel["action"] {
  const offered = new Set(actionsForPhase(session.phase).map((action) => action.id));
  const actionId = getFact(factId).revealedBy.find((id) => offered.has(id));
  const action = actionId ? findAction(actionId) : undefined;
  if (!action) return null;
  const availability = actionAvailability(session, action);
  return {
    id: action.id,
    label: action.label,
    enabled: availability.enabled,
    disabledReason: availability.disabledReason,
  };
}

export function reevaluationScreenModel(session: InterventionSessionView): ReevaluationScreenModel {
  const scenario = getV3Scenario(session.scenarioId);
  const status = reevaluationStatus(session);
  const current = currentReevaluation(session);
  const readiness = transportReadiness(session);
  const refreshed = new Set(status.refreshed);

  const rows = scenario.expectedHandoverFactIds.map((factId): ReevaluationRowModel => {
    const read = readFact(session, factId);
    const freshness: ConstantFreshness =
      read.status === "unknown" ? "never" : read.isStale ? "stale" : "fresh";
    return {
      factId,
      label: read.fact.label,
      freshness,
      freshnessLabel: FRESHNESS_LABELS[freshness],
      ageSeconds: read.status === "known" ? read.ageSeconds : null,
      refreshed: refreshed.has(factId),
      // Une donnée à jour n'a pas besoin qu'on propose de la reprendre : la
      // proposer inviterait à un geste inutile qui coûterait du temps.
      action: freshness === "fresh" ? null : refreshAction(session, factId),
    };
  });

  const hadGaps = (current?.gapFactIds.length ?? 0) > 0;
  const nothingRefreshed = status.refreshed.length === 0;
  const validationBlockedReason = !current
    ? "Aucune réévaluation en cours."
    : hadGaps && nothingRefreshed
      ? "Aucune mesure n'a été reprise."
      : null;

  return {
    eyebrow: "Intervention en cours",
    title: "Réévaluation patient",
    narrative: scenario.narrative.reevaluation,
    cycle: status.cycle,
    open: current !== undefined,
    rows,
    staleCount: status.stale.length,
    missingCount: status.missing.length,
    refreshedCount: status.refreshed.length,
    canValidate: validationBlockedReason === null,
    validationBlockedReason,
    reinforcement: status.reinforcement,
    reinforcementLabel: REINFORCEMENT_LABELS[status.reinforcement],
    transport: {
      ready: readiness.ready,
      penalty: readiness.penalty,
      graveFault: readiness.graveFault,
      warning: transportWarning(readiness),
    },
  };
}

/**
 * Avertissement de départ.
 *
 * Formulé depuis les chiffres du moteur, jamais depuis un seuil réécrit ici : si
 * la sanction change, l'avertissement change avec elle. Un écran qui annoncerait
 * un coût périmé serait pire que muet.
 */
function transportWarning(readiness: ReturnType<typeof transportReadiness>): string | null {
  if (readiness.graveFault) {
    return "Partir sans avoir réévalué le patient est une faute grave et coûte une vie.";
  }
  if (readiness.penalty > 0) {
    const count = readiness.stale.length;
    return `Départ sur ${count} constante${count > 1 ? "s" : ""} datée${count > 1 ? "s" : ""} : ${readiness.penalty} points.`;
  }
  if (readiness.missing.length > 0) {
    const count = readiness.missing.length;
    return `${count} donnée${count > 1 ? "s" : ""} attendue${count > 1 ? "s" : ""} n'${count > 1 ? "ont" : "a"} jamais été recueillie${count > 1 ? "s" : ""}.`;
  }
  return null;
}
