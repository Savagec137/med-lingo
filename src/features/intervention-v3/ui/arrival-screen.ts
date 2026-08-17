import type { InterventionSessionView, PlayerActionId } from "../v3-domain.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { actionsForPhase } from "../actions/action-catalog.ts";

/**
 * Écran 2 — « Arrivée sur les lieux ».
 *
 * La liste d'actions n'est pas écrite en dur : elle est dérivée du catalogue
 * d'actions pour la phase courante. Un écran qui recopierait les libellés de la
 * maquette afficherait des boutons que le moteur refuse, ou masquerait des
 * actions qu'il autorise.
 *
 * **Écart connu avec la maquette**, consigné et testé plus bas : la maquette
 * montre quatre actions, le catalogue n'en propose que deux à cette phase.
 * « Approcher le patient » y existe mais pour la phase suivante, et « Demander
 * renfort » n'existe pas du tout. Ces deux points attendent un arbitrage : ils ne
 * sont ni ajoutés au catalogue ni effacés de la maquette de ma seule initiative.
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
  const used = new Set(session.actionLog.map((entry) => entry.actionId));

  const actions = actionsForPhase(session.phase).map((action): ArrivalActionModel => {
    const exhausted =
      action.requires.maxUses !== null &&
      session.actionLog.filter((entry) => entry.actionId === action.id).length >=
        action.requires.maxUses;
    const missingEquipment = action.requires.equipment.filter(
      (equipmentId) => !session.equipment.some((item) => item.id === equipmentId && item.prepared),
    );
    const blocked = action.requires.blockingActions.filter((required) => !used.has(required));

    let disabledReason: string | null = null;
    if (action.outOfScope) disabledReason = action.outOfScopeReason;
    else if (exhausted) disabledReason = "Action déjà réalisée.";
    else if (missingEquipment.length > 0) disabledReason = "Matériel indisponible.";
    else if (blocked.length > 0) disabledReason = "Une action préalable manque.";

    return {
      id: action.id,
      label: action.label,
      hint: action.hint,
      enabled: disabledReason === null,
      disabledReason,
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
