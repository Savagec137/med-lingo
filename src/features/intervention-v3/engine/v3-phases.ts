import { PHASE_LABELS } from "../v3-domain.ts";
import type {
  InterventionPhase,
  InterventionSession,
  InterventionSessionView,
} from "../v3-domain.ts";

export const V3_PHASE_SEQUENCE: readonly InterventionPhase[] = [
  "new_call",
  "arrival",
  "scene_assessment",
  "patient_assessment",
  "vitals",
  "centre15_call",
  "priority_actions",
  "reevaluation",
  "transport",
  "debrief",
];

const phaseIndex = new Map(V3_PHASE_SEQUENCE.map((phase, index) => [phase, index]));

const completedActionIds = (session: InterventionSessionView) =>
  new Set(
    session.actionLog
      .filter((entry) => entry.outcome === "applied" || entry.outcome === "unjustified")
      .map((entry) => entry.actionId),
  );

export interface PhaseTransitionResult {
  session: InterventionSession;
  transitioned: boolean;
  reason?: string;
}

export function nextV3Phase(phase: InterventionPhase): InterventionPhase | undefined {
  const index = phaseIndex.get(phase);
  return index === undefined ? undefined : V3_PHASE_SEQUENCE[index + 1];
}

function transitionRequirement(
  session: InterventionSessionView,
  target: InterventionPhase,
): string | undefined {
  const actions = completedActionIds(session);
  switch (target) {
    case "patient_assessment":
      return actions.has("action.approcher-patient")
        ? undefined
        : "Approcher le patient avant de commencer son évaluation.";
    case "centre15_call":
      return actions.has("action.appeler-centre15")
        ? undefined
        : "Joindre le Centre 15 avant d'ouvrir la transmission.";
    case "priority_actions":
      return actions.has("action.transmettre-bilan")
        ? undefined
        : "Transmettre le bilan avant de choisir les gestes prioritaires.";
    case "reevaluation":
      return actions.has("action.choisir-gestes-prioritaires")
        ? undefined
        : "Valider les gestes prioritaires avant la réévaluation.";
    case "transport":
      return actions.has("action.reevaluer-patient") && actions.has("action.preparer-transport")
        ? undefined
        : "Réévaluer le patient et préparer le transport avant le départ.";
    case "debrief":
      return actions.has("action.preparer-transport")
        ? undefined
        : "Préparer le transport avant de terminer la mission.";
    default:
      return undefined;
  }
}

/**
 * Transition explicite, sans saut de phase et sans coût temporel caché.
 * Les actions de terrain portent elles-mêmes leur durée ; changer d'écran ne
 * doit jamais modifier le patient.
 */
export function transitionV3Phase(
  session: InterventionSession,
  target: InterventionPhase,
): PhaseTransitionResult {
  const currentIndex = phaseIndex.get(session.phase);
  const targetIndex = phaseIndex.get(target);
  if (currentIndex === undefined || targetIndex !== currentIndex + 1) {
    return {
      session,
      transitioned: false,
      reason: `Transition impossible de ${session.phase} vers ${target}.`,
    };
  }
  const reason = transitionRequirement(session, target);
  if (reason) return { session, transitioned: false, reason };
  return {
    transitioned: true,
    session: {
      ...session,
      phase: target,
      status: target === "debrief" ? "debrief" : "active",
    },
  };
}

export function advanceV3Phase(session: InterventionSession): PhaseTransitionResult {
  const target = nextV3Phase(session.phase);
  return target
    ? transitionV3Phase(session, target)
    : { session, transitioned: false, reason: "La mission est déjà terminée." };
}

/** Les actions structurantes changent de phase, les autres laissent la main au flux UI. */
export function phaseAfterAction(
  session: InterventionSession,
  actionId: string,
): InterventionSession {
  const targetByAction: Partial<Record<string, InterventionPhase>> = {
    "action.appeler-centre15": "centre15_call",
    "action.transmettre-bilan": "priority_actions",
    "action.choisir-gestes-prioritaires": "reevaluation",
    "action.preparer-transport": "transport",
  };
  const target = targetByAction[actionId];
  if (!target) return session;
  return { ...session, phase: target, status: target === "debrief" ? "debrief" : "active" };
}

/**
 * Ce qui empêche la mission d'avancer d'une étape, ou `null` si rien.
 *
 * Une **requête**, sans effet : l'interface a besoin de savoir si le bouton
 * « continuer » est actif, et de dire pourquoi il ne l'est pas. Sans elle, un
 * écran devrait tenter la transition pour découvrir qu'elle est refusée — ou
 * réécrire les conditions de son côté, ce qui finirait par diverger.
 */
export function nextPhaseBlocker(session: InterventionSessionView): string | null {
  const target = nextV3Phase(session.phase);
  if (!target) return "La mission est terminée.";
  return transitionRequirement(session, target) ?? null;
}

/** Étape suivante, telle que l'interface doit la nommer. Nulle à la fin. */
export const nextPhaseLabel = (session: InterventionSessionView): string | null => {
  const target = nextV3Phase(session.phase);
  return target ? PHASE_LABELS[target] : null;
};
