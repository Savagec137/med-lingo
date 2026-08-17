import type { InterventionSessionView, PlayerActionId } from "../v3-domain.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { actionsForPhase } from "../actions/action-catalog.ts";
import { actionAvailability } from "./action-availability.ts";

/**
 * Écran 2 — « Arrivée sur les lieux ».
 *
 * La liste d'actions n'est pas écrite en dur : elle est dérivée du catalogue
 * d'actions pour la phase courante. Un écran qui recopierait les libellés de la
 * maquette afficherait des boutons que le moteur refuse, ou masquerait des
 * actions qu'il autorise.
 *
 * L'écart initial est résorbé : le catalogue ne proposait que deux des quatre
 * actions de la maquette, il a été étendu sur autorisation et un test interdit
 * que l'écart se rouvre.
 *
 * Ce qui active ou désactive une carte n'est pas décidé ici : `actionAvailability`
 * interroge le moteur, qui reste seul juge des refus.
 */

/** Les quatre actions de la maquette 2, dans son ordre, pour comparaison. */
export const ARRIVAL_MOCKUP_ACTIONS: readonly string[] = [
  "Sécuriser la zone",
  "Observer l'environnement",
  "Approcher le patient",
  "Demander renfort",
];

export interface ArrivalActionModel {
  id: PlayerActionId;
  label: string;
  /** Sous-titre de la carte, repris du catalogue : c'est le `hint` de l'action. */
  hint: string;
  enabled: boolean;
  /** Renseigné quand l'action est présentée mais refusée. */
  disabledReason: string | null;
  /** Action hors périmètre DEA : la maquette la barrerait. */
  outOfScope: boolean;
}

export interface ArrivalMeta {
  label: string;
  value: string;
}

export interface ArrivalScreenModel {
  eyebrow: string;
  title: string;
  subtitle: string;
  priorityChip: string;
  /** Météo affichée en surimpression de la photo. Nul si le scénario n'en donne pas. */
  weather: string | null;
  meta: ArrivalMeta[];
  actions: ArrivalActionModel[];
  progress: {
    label: string;
    completedSteps: number;
    totalSteps: number;
  };
}

/** Extrait la météo de la note de dispatch, sans l'inventer si elle est absente. */
export function weatherFromDispatch(dispatchNote: string): string | null {
  const match = /(-?\d+)\s*°\s*C/u.exec(dispatchNote);
  return match ? `${match[1]} °C` : null;
}

export function arrivalScreenModel(
  session: InterventionSessionView,
  options: { totalSteps: number },
): ArrivalScreenModel {
  const scenario = getV3Scenario(session.scenarioId);
  const alert = scenario.alert;

  const actions = actionsForPhase(session.phase).map((action): ArrivalActionModel => {
    const availability = actionAvailability(session, action);
    return {
      id: action.id,
      label: action.label,
      hint: action.hint,
      enabled: availability.enabled,
      disabledReason: availability.disabledReason,
      outOfScope: action.outOfScope,
    };
  });

  return {
    eyebrow: "Intervention en cours",
    title: "Arrivée sur les lieux",
    subtitle: alert.reason,
    priorityChip: `Priorité ${alert.priority.toLocaleLowerCase("fr")}`,
    weather: weatherFromDispatch(alert.dispatchNote),
    meta: [
      { label: "Heure", value: alert.time },
      { label: "Localisation", value: alert.location },
      { label: "Distance", value: alert.distance },
    ],
    actions,
    progress: {
      label: "01: Arrivée",
      completedSteps:
        session.actionLog.length === 0
          ? 1
          : Math.min(session.actionLog.length + 1, options.totalSteps),
      totalSteps: options.totalSteps,
    },
  };
}
