import missionCatalog from "./intervention-missions.json";
import {
  buildOfficialCatalog,
  type OfficialMissionProfile,
} from "./intervention-scenario-builder.ts";

/**
 * Catalogue officiel piloté par les données.
 * Le moteur ne connaît aucune mission particulière : il reçoit uniquement
 * les scénarios normalisés par le builder.
 */
export const INTERVENTION_SCENARIOS = buildOfficialCatalog(
  missionCatalog.missions as OfficialMissionProfile[],
);
