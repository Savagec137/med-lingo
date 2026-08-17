/**
 * La réévaluation : ce qui vieillit doit être reprisé.
 *
 * `session.reevaluations` existait dans le contrat et n'était jamais alimenté, et
 * « Réévaluer le patient » rapportait huit points sans rien exiger. La boucle
 * pédagogique était donc vide : le joueur pouvait relever ses constantes à la
 * deuxième minute, traverser la transmission et les gestes, puis partir en
 * transport sur un bilan d'un quart d'heure sans que rien ne le signale.
 *
 * Trois pièces la ferment.
 *
 * **La péremption existait déjà** : `isStale` découle du gel de la valeur au
 * moment du relevé, sans mécanisme dédié. Ce module ne la réinvente pas, il
 * l'exploite.
 *
 * **Le cycle** ouvre une réévaluation, constate ce qui a vieilli, et n'est validé
 * que si les mesures ont réellement été reprises. Ce qui a été rafraîchi n'est pas
 * stocké mais **déduit du journal** : une action de mesure jouée après l'ouverture
 * du cycle est un rafraîchissement, et rien d'autre n'a besoin d'être écrit.
 *
 * **La sanction du départ** distingue deux fautes de nature différente. Partir
 * sans avoir réévalué du tout est une faute grave qui coûte une vie — c'est la
 * règle `premature-transport`, qui existait. Partir après avoir réévalué mais avec
 * des constantes périmées coûte des points sans coûter de vie : le joueur a fait
 * la démarche, il l'a mal faite. Confondre les deux rendrait la sanction
 * illisible.
 */

import { readFact } from "../facts/read-fact.ts";
import { getFact } from "../facts/fact-registry.ts";
import { getAction } from "../actions/action-catalog.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import type {
  FactId,
  InterventionScenario,
  InterventionSession,
  InterventionSessionView,
  ReevaluationState,
  ReinforcementStatus,
} from "../v3-domain.ts";

/**
 * Constantes attendues au bilan qui périment.
 *
 * Les données d'interrogatoire en sont exclues d'office : un antécédent ne
 * vieillit pas, et demander de « réévaluer les allergies » n'aurait aucun sens.
 * Le tri se fait sur `freshnessSeconds`, déclaré au registre, plutôt que sur une
 * liste écrite ici.
 */
export function perishableExpectedFactIds(scenario: InterventionScenario): FactId[] {
  return scenario.expectedHandoverFactIds.filter(
    (factId) => getFact(factId).freshnessSeconds !== null,
  );
}

/** Constantes attendues relevées mais périmées. C'est le « à réévaluer » de l'écran. */
export function staleExpectedFactIds(
  session: InterventionSessionView,
  scenario: InterventionScenario,
): FactId[] {
  return scenario.expectedHandoverFactIds.filter((factId) => {
    const read = readFact(session, factId);
    return read.status === "known" && read.isStale;
  });
}

/** Constantes attendues jamais relevées. Distinct d'une mesure périmée. */
export function missingExpectedFactIds(
  session: InterventionSessionView,
  scenario: InterventionScenario,
): FactId[] {
  return scenario.expectedHandoverFactIds.filter(
    (factId) => readFact(session, factId).status === "unknown",
  );
}

/* -------------------------------------------------------------------------- */
/* Le renfort                                                                 */
/* -------------------------------------------------------------------------- */

/** Délais de mise en route d'un renfort, en secondes simulées. */
export const REINFORCEMENT_EN_ROUTE_SECONDS = 120;
export const REINFORCEMENT_ON_SCENE_SECONDS = 420;

/**
 * Où en est le renfort, **déduit du journal et du temps écoulé**.
 *
 * Rien n'est stocké : un renfort demandé à la minute trois est en route à la
 * minute cinq et sur place à la dixième, parce que le temps a passé. Stocker le
 * statut obligerait à le faire progresser à chaque action, et un oubli le
 * figerait sans que rien ne le dise.
 */
export function reinforcementStatus(session: InterventionSessionView): ReinforcementStatus {
  const requested = session.actionLog.find(
    (entry) => entry.actionId === "action.demander-renfort" && entry.outcome !== "refused",
  );
  if (!requested) return "none";
  const elapsed = session.simulatedTimeSeconds - requested.atSeconds;
  if (elapsed >= REINFORCEMENT_ON_SCENE_SECONDS) return "on_scene";
  if (elapsed >= REINFORCEMENT_EN_ROUTE_SECONDS) return "en_route";
  return "requested";
}

/* -------------------------------------------------------------------------- */
/* Le cycle                                                                   */
/* -------------------------------------------------------------------------- */

/** Cycle en cours : le dernier ouvert et non validé. */
export function currentReevaluation(
  session: InterventionSessionView,
): ReevaluationState | undefined {
  const last = session.reevaluations[session.reevaluations.length - 1];
  return last && !last.validated ? last : undefined;
}

/**
 * Ouvre un cycle de réévaluation.
 *
 * Idempotent : rouvrir alors qu'un cycle est en cours rend la session inchangée,
 * sans quoi revenir sur l'écran remettrait le compteur à zéro et effacerait les
 * mesures déjà reprises.
 */
export function openReevaluation(session: InterventionSession): InterventionSession {
  if (currentReevaluation(session)) return session;
  const scenario = getV3Scenario(session.scenarioId);
  const state: ReevaluationState = {
    cycle: session.reevaluations.length + 1,
    startedAtSeconds: session.simulatedTimeSeconds,
    reinforcement: reinforcementStatus(session),
    refreshedFactIds: [],
    gapFactIds: [
      ...staleExpectedFactIds(session, scenario),
      ...missingExpectedFactIds(session, scenario),
    ],
    note: null,
    validated: false,
  };
  return { ...session, reevaluations: [...session.reevaluations, state] };
}

/**
 * Faits repris depuis l'ouverture du cycle, déduits du journal.
 *
 * Une action refusée n'y figure pas : elle n'a rien mesuré. Le seuil est large
 * (`>=`) parce qu'une mesure jouée dans la même seconde que l'ouverture du cycle
 * en fait partie.
 */
export function refreshedSince(session: InterventionSessionView, sinceSeconds: number): FactId[] {
  const ids = new Set<FactId>();
  for (const entry of session.actionLog) {
    if (entry.outcome === "refused") continue;
    if (entry.atSeconds < sinceSeconds) continue;
    for (const factId of entry.revealedFactIds) ids.add(factId);
  }
  return [...ids];
}

export interface ReevaluationStatus {
  cycle: number;
  /** Constantes attendues relevées mais périmées : à reprendre. */
  stale: FactId[];
  /** Constantes attendues jamais relevées. */
  missing: FactId[];
  /** Constantes reprises depuis l'ouverture du cycle. */
  refreshed: FactId[];
  reinforcement: ReinforcementStatus;
  /** Vrai quand plus rien n'est ni périmé ni manquant. */
  complete: boolean;
}

/** État de la réévaluation en cours, tel que l'écran doit l'afficher. */
export function reevaluationStatus(session: InterventionSessionView): ReevaluationStatus {
  const scenario = getV3Scenario(session.scenarioId);
  const current = currentReevaluation(session);
  const startedAt = current?.startedAtSeconds ?? session.simulatedTimeSeconds;
  const stale = staleExpectedFactIds(session, scenario);
  const missing = missingExpectedFactIds(session, scenario);
  return {
    cycle: current?.cycle ?? session.reevaluations.length,
    stale,
    missing,
    refreshed: refreshedSince(session, startedAt),
    reinforcement: reinforcementStatus(session),
    complete: stale.length === 0 && missing.length === 0,
  };
}

export interface ReevaluationValidation {
  session: InterventionSession;
  validated: boolean;
  /** Renseigné quand la validation est refusée. */
  reason: string | null;
  status: ReevaluationStatus;
}

/**
 * Valide le cycle en cours.
 *
 * Refusée si rien n'a été repris alors que des constantes avaient vieilli :
 * valider une réévaluation sans avoir remesuré, ce n'est pas réévaluer. En
 * revanche un cycle où tout était déjà frais se valide sans exiger de geste —
 * inventer une obligation de remesurer une constante fraîche apprendrait le
 * contraire de ce qu'on veut.
 */
export function validateReevaluation(
  session: InterventionSession,
  note: string | null = null,
): ReevaluationValidation {
  const current = currentReevaluation(session);
  const status = reevaluationStatus(session);
  if (!current) {
    return { session, validated: false, reason: "Aucune réévaluation en cours.", status };
  }
  const hadGaps = current.gapFactIds.length > 0;
  if (hadGaps && status.refreshed.length === 0) {
    return {
      session,
      validated: false,
      reason: "Aucune mesure n'a été reprise : la réévaluation ne peut pas être validée.",
      status,
    };
  }
  const updated: ReevaluationState = {
    ...current,
    reinforcement: status.reinforcement,
    refreshedFactIds: status.refreshed,
    gapFactIds: [...status.stale, ...status.missing],
    note,
    validated: true,
  };
  return {
    validated: true,
    reason: null,
    status,
    session: {
      ...session,
      reevaluations: session.reevaluations.map((entry) =>
        entry.cycle === updated.cycle ? updated : entry,
      ),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* La sanction du départ                                                      */
/* -------------------------------------------------------------------------- */

/** Marqueur d'un départ sur des constantes datées. Volontairement non grave. */
export const STALE_TRANSPORT_FLAG = "transport-on-stale-vitals";

/** Points perdus par constante périmée, et plafond de la sanction. */
export const STALE_TRANSPORT_PENALTY_PER_FACT = 3;
export const STALE_TRANSPORT_PENALTY_CAP = 12;

/**
 * Coût d'un départ immédiat, en points.
 *
 * Plafonné : un joueur qui n'a rien réévalué du tout est déjà sanctionné par
 * `premature-transport`, qui lui coûte une vie. Empiler une pénalité sans borne
 * par-dessus ferait tomber le score à zéro sur une seule décision, et un score à
 * zéro n'apprend plus rien.
 */
export function staleTransportPenalty(
  session: InterventionSessionView,
  scenario: InterventionScenario,
): number {
  const stale = staleExpectedFactIds(session, scenario).length;
  return Math.min(STALE_TRANSPORT_PENALTY_CAP, stale * STALE_TRANSPORT_PENALTY_PER_FACT);
}

/**
 * Ce que le joueur doit savoir avant de partir. Alimente l'avertissement de
 * l'écran : le mode laisse partir, il ne cache pas le prix.
 */
export interface TransportReadiness {
  /** Vrai quand plus aucune constante attendue n'est périmée ni manquante. */
  ready: boolean;
  stale: FactId[];
  missing: FactId[];
  /** Points que le départ coûterait en l'état. */
  penalty: number;
  /** Vrai si partir maintenant constitue une faute grave, donc une vie perdue. */
  graveFault: boolean;
}

export function transportReadiness(session: InterventionSessionView): TransportReadiness {
  const scenario = getV3Scenario(session.scenarioId);
  const reevaluated = session.actionLog.some(
    (entry) => entry.actionId === "action.reevaluer-patient" && entry.outcome !== "refused",
  );
  const stale = staleExpectedFactIds(session, scenario);
  const missing = missingExpectedFactIds(session, scenario);
  // La faute grave est celle que le catalogue décrit : partir sans avoir réévalué.
  // Elle est lue dans le catalogue plutôt que réécrite ici, pour qu'un changement
  // de données ne laisse pas cet avertissement mentir.
  const requiresReevaluation = getAction(
    "action.preparer-transport",
  ).requires.justifyingActions.includes("action.reevaluer-patient");
  return {
    ready: stale.length === 0 && missing.length === 0,
    stale,
    missing,
    penalty: staleTransportPenalty(session, scenario),
    graveFault: requiresReevaluation && !reevaluated,
  };
}
