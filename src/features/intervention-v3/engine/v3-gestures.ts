/**
 * Les gestes prioritaires, et leurs conséquences.
 *
 * Le scénario pilote décrit douze gestes depuis le début — trois recommandés,
 * cinq possibles mais non indiqués, quatre à refuser — avec pour chacun les faits
 * qui le justifient et l'explication de son refus. Rien ne les consommait :
 * `session.gestureRounds` était rempli à la création de la session et plus jamais
 * touché. Une carte se cochait, et le jeu ne bougeait pas.
 *
 * Ce module en fait des décisions qui comptent. Quatre issues, et pas une de
 * plus :
 *
 * - **refusé** — le geste sort du champ de l'ambulancier, ou le tour est clos.
 *   Rien ne se passe, l'explication est rendue, et la tentative est conservée :
 *   c'est le débriefing qui la relèvera.
 * - **choisi et justifié** — les faits qui fondent le geste ont été recueillis.
 * - **choisi sans justification** — le geste est le bon, mais il a été choisi
 *   sans l'élément clinique qui le fonde. Il compte, moins.
 * - **choisi et non indiqué** — le geste ne se rattache à rien dans ce tableau.
 *
 * Le barème vit ici et non dans les données de mission. Un scénario dit ce qui
 * est recommandé pour ce patient ; il n'a pas à dire combien un bon geste vaut,
 * sans quoi deux missions pourraient noter différemment la même faute.
 */

import { readFact } from "../facts/read-fact.ts";
import { physiologyEventForGesture } from "../physiology/action-physiology.ts";
import { withPhysiologyEvent } from "../physiology/physiology-engine.ts";
import type {
  GestureChoice,
  InterventionSession,
  InterventionSessionView,
  PriorityGesture,
  PriorityGestureRound,
} from "../v3-domain.ts";

/** Pourquoi un geste est refusé. C'est cette nature que l'écran traduit. */
export const GESTURE_REFUSAL_KINDS = [
  "out_of_scope",
  "already_selected",
  "round_resolved",
  "round_full",
  "wrong_phase",
] as const;

export type GestureRefusalKind = (typeof GESTURE_REFUSAL_KINDS)[number];

/**
 * Barème des gestes.
 *
 * Un geste recommandé mais choisi à l'aveugle vaut nettement moins qu'un geste
 * fondé sur un élément recueilli : c'est le raisonnement qui est évalué, pas la
 * chance. Il reste positif pour autant — le patient en bénéficie quand même.
 */
export const GESTURE_SCORES = {
  recommendedJustified: 6,
  recommendedUnjustified: 2,
  notIndicatedJustified: -3,
  notIndicatedUnjustified: -5,
} as const;

/** Marqueur d'un bon geste posé sans l'élément clinique qui le fonde. */
export const GESTURE_UNJUSTIFIED_FLAG = "unjustified-act";

/** Marqueur d'un geste qui ne se rattache à rien du tableau clinique. */
export const GESTURE_NOT_INDICATED_FLAG = "gesture-not-indicated";

export interface GestureSelectionResult {
  session: InterventionSession;
  outcome: "selected" | "refused";
  /** Renseigné sur un refus, et sur lui seul. */
  refusal: { kind: GestureRefusalKind; reason: string } | null;
  /** Le détail de la sélection retenue. Nul sur un refus. */
  choice: GestureChoice | null;
}

const findRound = (session: InterventionSession, roundId: string): PriorityGestureRound => {
  const round = session.gestureRounds.find((entry) => entry.id === roundId);
  if (!round) throw new Error(`Tour de gestes inconnu : ${roundId}`);
  return round;
};

const findGesture = (round: PriorityGestureRound, gestureId: string): PriorityGesture => {
  const gesture = round.offered.find((entry) => entry.id === gestureId);
  if (!gesture) throw new Error(`Geste absent du tour ${round.id} : ${gestureId}`);
  return gesture;
};

/**
 * Un geste est justifié quand tous les faits qui le fondent ont été recueillis
 * **et sont encore frais**. C'est la même règle que pour les actions : une mesure
 * périmée ne justifie plus rien, sinon un relevé fait à la première minute
 * autoriserait n'importe quoi une demi-heure plus tard.
 *
 * Un geste sans `justifiedBy` est justifié par défaut : le scénario n'a rattaché
 * sa pertinence à aucun élément particulier.
 */
export function isGestureJustified(
  session: InterventionSessionView,
  gesture: PriorityGesture,
): boolean {
  return gesture.justifiedBy.every((factId) => {
    const read = readFact(session, factId);
    return read.status === "known" && !read.isStale;
  });
}

/** Faits qui justifieraient le geste et manquent encore. Alimente l'écran. */
export function missingJustifications(
  session: InterventionSessionView,
  gesture: PriorityGesture,
): string[] {
  return gesture.justifiedBy.filter((factId) => {
    const read = readFact(session, factId);
    return read.status !== "known" || read.isStale;
  });
}

/** Moment où le tour s'est ouvert, déduit du journal plutôt que stocké. */
export function gestureRoundOpenedAt(session: InterventionSessionView): number | null {
  const entry = session.actionLog.find(
    (item) => item.actionId === "action.transmettre-bilan" && item.outcome !== "refused",
  );
  return entry ? entry.atSeconds : null;
}

/** Secondes restantes au chronomètre du tour. Nul si le tour n'en a pas. */
export function gestureRoundTimeLeft(
  session: InterventionSessionView,
  round: PriorityGestureRound,
): number | null {
  if (round.timerSeconds === null) return null;
  const openedAt = gestureRoundOpenedAt(session);
  if (openedAt === null) return round.timerSeconds;
  const elapsed = session.simulatedTimeSeconds - openedAt;
  return Math.max(0, round.timerSeconds - elapsed);
}

export const isGestureRoundExpired = (
  session: InterventionSessionView,
  round: PriorityGestureRound,
): boolean => gestureRoundTimeLeft(session, round) === 0;

function refuse(
  session: InterventionSession,
  round: PriorityGestureRound,
  gestureId: string,
  kind: GestureRefusalKind,
  reason: string,
): GestureSelectionResult {
  // La tentative est conservée. Un geste refusé n'a aucun effet sur le patient,
  // mais le fait de l'avoir tenté est une information pédagogique : c'est ce que
  // le débriefing rapporte sous « gestes dangereux tentés ».
  const updated: PriorityGestureRound = {
    ...round,
    refused: [...round.refused, { gestureId, reason }],
  };
  return {
    session: replaceRound(session, updated),
    outcome: "refused",
    refusal: { kind, reason },
    choice: null,
  };
}

const replaceRound = (
  session: InterventionSession,
  round: PriorityGestureRound,
): InterventionSession => ({
  ...session,
  gestureRounds: session.gestureRounds.map((entry) => (entry.id === round.id ? round : entry)),
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Choisit un geste dans un tour.
 *
 * Les refus ne consomment ni temps, ni score, ni vie — comme pour les actions.
 * Un geste retenu pèse sur le score immédiatement : le joueur doit sentir la
 * conséquence au moment du choix, pas seulement au débriefing.
 */
export function selectGesture(
  session: InterventionSession,
  roundId: string,
  gestureId: string,
): GestureSelectionResult {
  const round = findRound(session, roundId);
  const gesture = findGesture(round, gestureId);

  if (session.phase !== "priority_actions") {
    return refuse(
      session,
      round,
      gestureId,
      "wrong_phase",
      "Les gestes prioritaires se choisissent après la transmission du bilan.",
    );
  }
  if (round.resolved) {
    return refuse(session, round, gestureId, "round_resolved", "Ce tour est déjà validé.");
  }
  if (round.selected.includes(gestureId)) {
    return refuse(session, round, gestureId, "already_selected", "Ce geste est déjà retenu.");
  }
  if (gesture.outOfScope) {
    return refuse(
      session,
      round,
      gestureId,
      "out_of_scope",
      gesture.outOfScopeReason ?? "Ce geste ne relève pas de l'ambulancier.",
    );
  }
  if (round.selected.length >= round.requiredSelections) {
    return refuse(
      session,
      round,
      gestureId,
      "round_full",
      `Ce tour attend ${round.requiredSelections} gestes : retirez-en un pour en changer.`,
    );
  }

  const justified = isGestureJustified(session, gesture);
  const scoreDelta = gesture.recommended
    ? justified
      ? GESTURE_SCORES.recommendedJustified
      : GESTURE_SCORES.recommendedUnjustified
    : justified
      ? GESTURE_SCORES.notIndicatedJustified
      : GESTURE_SCORES.notIndicatedUnjustified;
  const flag = !gesture.recommended
    ? GESTURE_NOT_INDICATED_FLAG
    : justified
      ? null
      : GESTURE_UNJUSTIFIED_FLAG;

  const choice: GestureChoice = {
    gestureId,
    recommended: gesture.recommended,
    justified,
    atSeconds: session.simulatedTimeSeconds,
    scoreDelta,
    flag,
  };
  const updatedRound: PriorityGestureRound = {
    ...round,
    selected: [...round.selected, gestureId],
    choices: [...round.choices, choice],
  };

  const withRound = replaceRound(session, updatedRound);
  return {
    session: {
      ...withRound,
      score: clamp(withRound.score + scoreDelta, 0, 100),
      flags: flag ? Array.from(new Set([...withRound.flags, flag])) : withRound.flags,
    },
    outcome: "selected",
    refusal: null,
    choice,
  };
}

/**
 * Retire un geste retenu.
 *
 * Permis tant que le tour n'est pas validé, et le score revient exactement à ce
 * qu'il était : sans cela, le joueur qui se corrige serait puni deux fois. Aucun
 * risque de sondage, puisqu'un geste ne révèle aucune information.
 */
export function deselectGesture(
  session: InterventionSession,
  roundId: string,
  gestureId: string,
): InterventionSession {
  const round = findRound(session, roundId);
  if (round.resolved || !round.selected.includes(gestureId)) return session;
  const choice = round.choices.find((entry) => entry.gestureId === gestureId);
  const remaining = round.choices.filter((entry) => entry.gestureId !== gestureId);

  const updatedRound: PriorityGestureRound = {
    ...round,
    selected: round.selected.filter((id) => id !== gestureId),
    choices: remaining,
  };
  const withRound = replaceRound(session, updatedRound);

  // Le marqueur ne retombe que si aucun autre geste retenu ne le porte encore.
  const stillFlagged = new Set(
    withRound.gestureRounds.flatMap((entry) =>
      entry.choices.map((item) => item.flag).filter((flag): flag is string => flag !== null),
    ),
  );
  return {
    ...withRound,
    score: clamp(withRound.score - (choice?.scoreDelta ?? 0), 0, 100),
    flags: withRound.flags.filter(
      (flag) =>
        stillFlagged.has(flag) ||
        (flag !== GESTURE_UNJUSTIFIED_FLAG && flag !== GESTURE_NOT_INDICATED_FLAG),
    ),
  };
}

export interface GestureRoundResolution {
  session: InterventionSession;
  correct: boolean;
  /** Gestes recommandés que le joueur n'a pas retenus. */
  missing: string[];
  /** Gestes retenus qui n'étaient pas indiqués. */
  notIndicated: string[];
  /** Gestes retenus sans l'élément clinique qui les fonde. */
  unjustified: string[];
}

/**
 * Valide le tour.
 *
 * `correct` exige les deux moitiés : tous les gestes recommandés retenus, et
 * aucun geste non indiqué. Se contenter du compte attendu laisserait passer trois
 * gestes inutiles.
 */
export function resolveGestureRound(
  session: InterventionSession,
  roundId: string,
): GestureRoundResolution {
  const round = findRound(session, roundId);
  const selected = new Set(round.selected);
  const missing = round.offered
    .filter((gesture) => gesture.recommended && !selected.has(gesture.id))
    .map((gesture) => gesture.id);
  const notIndicated = round.choices
    .filter((choice) => !choice.recommended)
    .map((choice) => choice.gestureId);
  const unjustified = round.choices
    .filter((choice) => choice.recommended && !choice.justified)
    .map((choice) => choice.gestureId);
  const correct = missing.length === 0 && notIndicated.length === 0;

  // Les conséquences physiologiques s'inscrivent **à la validation**, pas au
  // cochage : cocher une carte n'est pas faire le geste, et le joueur peut se
  // reprendre tant que le tour est ouvert. Un événement inscrit au cochage
  // survivrait au décochage, et l'oxygène continuerait d'agir après avoir été
  // retiré de la liste.
  const resolvedSession = replaceRound(session, { ...round, resolved: true, correct });
  let physiology = resolvedSession.physiology;
  for (const choice of round.choices) {
    const kind = physiologyEventForGesture(choice.gestureId);
    if (kind)
      physiology = withPhysiologyEvent(physiology, kind, choice.atSeconds, choice.gestureId);
  }

  return {
    session: { ...resolvedSession, physiology },
    correct,
    missing,
    notIndicated,
    unjustified,
  };
}

/** Tous les gestes retenus de la mission, tous tours confondus. */
export const allGestureChoices = (session: InterventionSessionView): GestureChoice[] =>
  session.gestureRounds.flatMap((round) => round.choices);

/** Toutes les tentatives refusées de la mission. Alimente le débriefing. */
export const allRefusedGestures = (session: InterventionSessionView) =>
  session.gestureRounds.flatMap((round) => round.refused);
