import type { InterventionPhase } from "../v3-domain.ts";
import { V3_PHASE_SEQUENCE } from "../engine/queries.ts";

/**
 * La barre de mission, reprise du prototype Bolt.
 *
 * **Ce qu'elle est, et ce qu'elle n'est pas.** Le prototype en fait une
 * navigation : ses cinq onglets sautent librement d'un écran à l'autre, parce
 * que son état d'écran est un simple `useState` sans contrainte. Medoca ne peut
 * pas s'y prêter — ses phases s'enchaînent, et chacune ouvre la suivante en
 * consommant du temps simulé. Un onglet qui mènerait à « Patient » depuis
 * l'appel du 15 sauterait le bilan circonstanciel, c'est-à-dire l'apprentissage.
 *
 * Elle est donc un **repère de progression** : cinq stations, celle où l'on se
 * trouve allumée, celles déjà passées marquées, les suivantes en attente. Elle
 * donne l'ancrage visuel de la maquette sans inventer une navigation que le
 * moteur ne peut pas honorer.
 */

export const MISSION_STATIONS = ["mission", "patient", "surveillance", "gestes", "bilan"] as const;

export type MissionStationId = (typeof MISSION_STATIONS)[number];

export interface MissionStationModel {
  id: MissionStationId;
  label: string;
  /** La phase courante appartient à cette station. */
  current: boolean;
  /** Station déjà traversée. */
  done: boolean;
}

/**
 * Les phases regroupées par station.
 *
 * Dix phases pour cinq stations : le joueur n'a pas besoin de savoir qu'il passe
 * de `arrival` à `scene_assessment`, il a besoin de savoir où il en est de son
 * intervention.
 */
const STATION_PHASES: Record<MissionStationId, InterventionPhase[]> = {
  mission: ["new_call", "arrival", "scene_assessment"],
  patient: ["patient_assessment"],
  surveillance: ["vitals"],
  gestes: ["priority_actions", "reevaluation", "transport"],
  bilan: ["centre15_call", "debrief"],
};

const STATION_LABELS: Record<MissionStationId, string> = {
  mission: "Mission",
  patient: "Patient",
  surveillance: "Surveillance",
  gestes: "Gestes",
  bilan: "Bilan",
};

/** La station qui contient une phase. */
export function stationOfPhase(phase: InterventionPhase): MissionStationId {
  for (const station of MISSION_STATIONS) {
    if (STATION_PHASES[station].includes(phase)) return station;
  }
  return "mission";
}

/**
 * Les cinq stations, à la phase courante.
 *
 * « Déjà passée » se déduit de l'ordre des phases, jamais d'un compteur tenu à
 * part : c'est la séquence du moteur qui décide, et elle reste la seule source.
 */
export function missionStations(phase: InterventionPhase): MissionStationModel[] {
  const order = V3_PHASE_SEQUENCE as readonly InterventionPhase[];
  const position = order.indexOf(phase);
  const current = stationOfPhase(phase);

  return MISSION_STATIONS.map((station) => {
    const lastPhase = STATION_PHASES[station][STATION_PHASES[station].length - 1]!;
    return {
      id: station,
      label: STATION_LABELS[station],
      current: station === current,
      done: station !== current && order.indexOf(lastPhase) < position,
    };
  });
}
