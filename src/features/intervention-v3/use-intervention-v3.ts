import { useCallback, useMemo, useState } from "react";
import { applyAction } from "./engine/apply-action.ts";
import { createDebriefReport } from "./engine/v3-debrief.ts";
import { commitGestureRound, transmitHandover } from "./engine/v3-handover.ts";
import { deselectGesture, selectGesture } from "./engine/v3-gestures.ts";
import { answerRegulatorQuestion } from "./engine/v3-transmission.ts";
import { openReevaluation, validateReevaluation } from "./engine/v3-reevaluation.ts";
import { advanceV3Phase } from "./engine/v3-phases.ts";
import { getV3Scenario, PILOT_SCENARIO_ID } from "./scenarios/v3-catalog.ts";
import { createV3Session, ALL_EQUIPMENT } from "./v3-session.ts";
import {
  toSessionView,
  type DebriefReport,
  type EquipmentId,
  type InterventionSession,
  type InterventionSessionView,
  type PlayerActionId,
} from "./v3-domain.ts";

/**
 * Le point unique où la session complète existe côté interface.
 *
 * Tout le reste de l'interface — présentateurs et composants — ne voit qu'une
 * `InterventionSessionView`, dont les données cliniques cachées sont retirées par
 * liste d'autorisation. Ce hook est la seule exception, et il ne la laisse pas
 * fuir : il garde la session dans son état interne et n'expose que la vue.
 *
 * Il n'implémente **aucune règle**. Chaque commande délègue au moteur et range le
 * résultat. Une règle réécrite ici finirait par diverger de celle du moteur, et
 * l'interface proposerait alors des gestes que le jeu rejette.
 */

/** Ce que la dernière commande a produit, pour l'affichage d'un retour immédiat. */
export interface InterventionFeedback {
  kind: "refused" | "applied" | "fault";
  /** Message destiné au joueur. Toujours celui du moteur, jamais réécrit. */
  message: string;
}

export interface InterventionV3Controller {
  /** Ce que l'interface reçoit. Jamais la session complète. */
  session: InterventionSessionView;
  /** Rapport de fin de mission, disponible seulement en phase de débriefing. */
  debrief: DebriefReport | null;
  /** Retour de la dernière commande, ou rien. */
  feedback: InterventionFeedback | null;
  clearFeedback: () => void;

  play: (actionId: PlayerActionId) => void;
  chooseGesture: (roundId: string, gestureId: string) => void;
  dropGesture: (roundId: string, gestureId: string) => void;
  commitGestures: (roundId: string) => void;
  transmit: (itemIds: readonly string[], additions?: readonly string[]) => void;
  answerRegulator: (questionId: string, answerId: string) => void;
  beginReevaluation: () => void;
  closeReevaluation: (note?: string) => void;
  /**
   * Passe à l'étape suivante de la mission.
   *
   * Toutes les transitions ne découlent pas d'une action : accepter l'appel,
   * passer du bilan circonstanciel à l'évaluation du patient, ouvrir le relevé
   * des constantes. Sans cette commande la mission ne démarrait pas — le premier
   * geste de terrain n'existe qu'à partir de la phase d'arrivée, et rien ne l'y
   * amenait.
   */
  advance: () => void;
  restart: () => void;
}

export interface InterventionV3Options {
  scenarioId?: string;
  preparedEquipment?: readonly EquipmentId[];
}

export function useInterventionV3(options: InterventionV3Options = {}): InterventionV3Controller {
  const scenarioId = options.scenarioId ?? PILOT_SCENARIO_ID;
  const preparedEquipment = options.preparedEquipment ?? ALL_EQUIPMENT;

  const start = useCallback(
    () => createV3Session(getV3Scenario(scenarioId), { preparedEquipment }),
    [scenarioId, preparedEquipment],
  );

  const [session, setSession] = useState<InterventionSession>(start);
  const [feedback, setFeedback] = useState<InterventionFeedback | null>(null);

  const play = useCallback((actionId: PlayerActionId) => {
    setSession((current) => {
      const result = applyAction(current, actionId);
      // Le message vient du moteur. Le reformuler ici ferait deux vérités pour un
      // même refus, et celle de l'écran finirait par mentir.
      setFeedback(
        result.classification === "impossible"
          ? { kind: "refused", message: result.reason ?? "Action impossible." }
          : result.classification === "fault"
            ? { kind: "fault", message: "Action réalisée sans les prérequis attendus." }
            : { kind: "applied", message: "" },
      );
      return result.session;
    });
  }, []);

  const chooseGesture = useCallback((roundId: string, gestureId: string) => {
    setSession((current) => {
      const result = selectGesture(current, roundId, gestureId);
      setFeedback(
        result.outcome === "refused"
          ? { kind: "refused", message: result.refusal!.reason }
          : result.choice!.flag
            ? { kind: "fault", message: "Geste retenu, mais rien ne le fonde ici." }
            : { kind: "applied", message: "" },
      );
      return result.session;
    });
  }, []);

  const dropGesture = useCallback((roundId: string, gestureId: string) => {
    setSession((current) => deselectGesture(current, roundId, gestureId));
    setFeedback(null);
  }, []);

  const commitGestures = useCallback((roundId: string) => {
    setSession((current) => {
      const result = commitGestureRound(current, roundId);
      setFeedback(result.refusalReason ? { kind: "refused", message: result.refusalReason } : null);
      return result.session;
    });
  }, []);

  const transmit = useCallback((itemIds: readonly string[], additions?: readonly string[]) => {
    setSession((current) => {
      const result = transmitHandover(current, {
        itemIds,
        ...(additions ? { additions } : {}),
      });
      setFeedback(
        result.refusalReason
          ? { kind: "refused", message: result.refusalReason }
          : result.silentGaps.length > 0
            ? { kind: "fault", message: "Des éléments manquants sont passés sous silence." }
            : { kind: "applied", message: "" },
      );
      return result.session;
    });
  }, []);

  const answerRegulator = useCallback((questionId: string, answerId: string) => {
    setSession((current) => {
      const result = answerRegulatorQuestion(current, questionId, answerId);
      setFeedback(
        result.refusalReason
          ? { kind: "refused", message: result.refusalReason }
          : // L'explication du scénario est rendue dans les deux cas : c'est elle
            // qui enseigne, pas le score.
            { kind: result.correct ? "applied" : "fault", message: result.rationale ?? "" },
      );
      return result.session;
    });
  }, []);

  const beginReevaluation = useCallback(() => {
    setSession(openReevaluation);
    setFeedback(null);
  }, []);

  const closeReevaluation = useCallback((note?: string) => {
    setSession((current) => {
      const result = validateReevaluation(current, note ?? null);
      setFeedback(
        result.validated
          ? null
          : { kind: "refused", message: result.reason ?? "Validation refusée." },
      );
      return result.session;
    });
  }, []);

  const advance = useCallback(() => {
    setSession((current) => {
      const result = advanceV3Phase(current);
      setFeedback(
        result.transitioned
          ? null
          : { kind: "refused", message: result.reason ?? "Transition impossible." },
      );
      return result.session;
    });
  }, []);

  const restart = useCallback(() => {
    setSession(start());
    setFeedback(null);
  }, [start]);

  // Le rapport n'existe qu'à la fin. Le calculer plus tôt donnerait à l'interface
  // un objet qui décrit une mission inachevée, et rien n'empêcherait de
  // l'afficher.
  const debrief = useMemo(
    () =>
      session.phase === "debrief"
        ? createDebriefReport(session, getV3Scenario(session.scenarioId))
        : null,
    [session],
  );

  const view = useMemo(() => toSessionView(session), [session]);

  return {
    session: view,
    debrief,
    feedback,
    clearFeedback: useCallback(() => setFeedback(null), []),
    play,
    chooseGesture,
    dropGesture,
    commitGestures,
    transmit,
    answerRegulator,
    beginReevaluation,
    closeReevaluation,
    advance,
    restart,
  };
}
