import type { FactId, InterventionSessionView } from "../v3-domain.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { getFact } from "../facts/fact-registry.ts";
import {
  gestureRoundTimeLeft,
  isGestureJustified,
  isGestureRoundExpired,
  missingJustifications,
} from "../engine/queries.ts";

/**
 * Écran 5 — « Gestes prioritaires ».
 *
 * Douze cartes, dont quatre à ne pas choisir. Chaque carte porte ce que le moteur
 * en dira : recommandée ou non, fondée sur le bilan ou choisie à l'aveugle, hors
 * du champ de l'ambulancier.
 *
 * Un point de conception qui compte : les cartes hors périmètre restent
 * **affichées et cliquables**. Les masquer supprimerait la décision, et le mode
 * repose sur le fait que l'erreur soit possible. Le refus, avec l'explication du
 * scénario, est le moment pédagogique.
 *
 * En revanche l'écran ne dit jamais *lesquelles* sont recommandées. Il dit ce qui
 * manque pour fonder un geste — « conscience non évaluée » — ce qui est une aide au
 * raisonnement et non la réponse.
 */

export interface GestureCardModel {
  id: string;
  label: string;
  hint: string;
  /** Retenu dans le tour courant. */
  selected: boolean;
  /**
   * Hors du champ de l'ambulancier. La carte reste cliquable : c'est le refus
   * expliqué qui enseigne, pas l'absence de carte.
   */
  outOfScope: boolean;
  /** Explication du refus, tirée du scénario. Nulle si le geste est permis. */
  refusalReason: string | null;
  /** Vrai si tous les faits qui fondent le geste sont recueillis et frais. */
  justified: boolean;
  /**
   * Libellés des données qui manquent pour fonder le geste. Ne dit pas si le geste
   * est recommandé — seulement ce qui manque pour le décider.
   */
  missingJustifications: Array<{ factId: FactId; label: string }>;
  /** Nature de la conséquence, telle que le scénario la déclare. */
  consequenceFamily: string;
  /** Cliquable en l'état : le tour est ouvert et la carte n'est pas déjà retenue. */
  selectable: boolean;
  /** Pourquoi la carte n'est pas cliquable. Nul quand elle l'est. */
  blockedReason: string | null;
}

export interface PriorityActionsScreenModel {
  eyebrow: string;
  title: string;
  narrative: string;
  roundId: string;
  /** Combien de gestes le tour attend. */
  requiredSelections: number;
  selectedCount: number;
  /** Secondes restantes au chronomètre. Nul si le tour n'en a pas. */
  secondsLeft: number | null;
  expired: boolean;
  resolved: boolean;
  cards: GestureCardModel[];
  /** Validation possible : le compte attendu est atteint et le tour est ouvert. */
  canResolve: boolean;
  /** Tentatives refusées du tour, pour le rappel à l'écran. */
  refusedAttempts: Array<{ gestureId: string; label: string; reason: string }>;
}

export function priorityActionsScreenModel(
  session: InterventionSessionView,
  roundId?: string,
): PriorityActionsScreenModel {
  const scenario = getV3Scenario(session.scenarioId);
  const round = roundId
    ? session.gestureRounds.find((entry) => entry.id === roundId)
    : session.gestureRounds[0];
  if (!round) throw new Error(`Aucun tour de gestes dans la session ${session.scenarioId}`);

  const selected = new Set(round.selected);
  const full = round.selected.length >= round.requiredSelections;
  const offered = new Map(round.offered.map((gesture) => [gesture.id, gesture]));

  const cards = round.offered.map((gesture): GestureCardModel => {
    const isSelected = selected.has(gesture.id);
    const missing = missingJustifications(session, gesture);

    // L'ordre des raisons suit celui du moteur : le tour clos d'abord, puis la
    // sélection existante, puis le hors-périmètre, puis le tour complet. Une
    // carte hors périmètre reste « cliquable » — elle produira un refus expliqué.
    let blockedReason: string | null = null;
    if (round.resolved) blockedReason = "Tour validé.";
    else if (isSelected) blockedReason = "Déjà retenu.";
    else if (full && !gesture.outOfScope) {
      blockedReason = `Ce tour attend ${round.requiredSelections} gestes.`;
    }

    return {
      id: gesture.id,
      label: gesture.label,
      hint: gesture.hint,
      selected: isSelected,
      outOfScope: gesture.outOfScope,
      refusalReason: gesture.outOfScope ? gesture.outOfScopeReason : null,
      justified: isGestureJustified(session, gesture),
      missingJustifications: missing.map((factId) => ({
        factId,
        label: getFact(factId).label,
      })),
      consequenceFamily: gesture.consequenceFamily,
      selectable: blockedReason === null,
      blockedReason,
    };
  });

  return {
    eyebrow: "Intervention en cours",
    title: "Gestes prioritaires",
    narrative: scenario.narrative.priority_actions,
    roundId: round.id,
    requiredSelections: round.requiredSelections,
    selectedCount: round.selected.length,
    secondsLeft: gestureRoundTimeLeft(session, round),
    expired: isGestureRoundExpired(session, round),
    resolved: round.resolved,
    cards,
    canResolve: !round.resolved && full,
    refusedAttempts: round.refused.map((attempt) => ({
      gestureId: attempt.gestureId,
      label: offered.get(attempt.gestureId)?.label ?? attempt.gestureId,
      reason: attempt.reason,
    })),
  };
}
