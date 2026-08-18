/**
 * Les patients simulés.
 *
 * Un profil décrit **comment ce patient-là va évoluer**, pas ce que le joueur
 * verra. Rien ici n'est affiché : ces valeurs sont la vérité du terrain, et le
 * joueur n'en connaîtra que ce qu'il sera allé chercher.
 *
 * Les neuf profils couvrent les tableaux qu'un DEA rencontre en garde. Un seul
 * est branché sur un scénario pour l'instant ; les autres sont déclarés dès
 * maintenant parce qu'ils fixent le vocabulaire clinique du mode et qu'écrire un
 * moteur sur un seul cas donne toujours un moteur qui ne sert qu'à ce cas.
 *
 * Ces valeurs sont un contenu de jeu construit à partir des maquettes et des
 * tableaux cliniques usuels. Elles doivent être relues par le binôme médecin
 * urgentiste / formateur DEA avant publication, comme les valeurs de scénario.
 */

import type { InterventionClinicalProfile } from "../clinical/intervention-vitals.ts";
import type { AvpuLevel, PhysiologyProfile } from "./physiology-types.ts";

/**
 * Le patient du scénario pilote : chute de sa hauteur sur l'axe N104, traumatisme
 * crânien avec perte de connaissance initiale.
 *
 * Le point pédagogique de ce profil est que **ses constantes sont normales**. La
 * saturation est à 98 %, le pouls à 92, la fréquence respiratoire à 18 : rien
 * n'alerte sur un moniteur. Le risque est neurologique — un Glasgow à 13 et une
 * perte de connaissance initiale — et il ne se lit pas dans les chiffres. Un mode
 * qui ferait chuter la saturation pour signaler le danger enseignerait exactement
 * l'inverse de ce qu'il faut retenir.
 */
export const TRAUMA_CRANIEN_N104: PhysiologyProfile = {
  id: "v3_trauma_cranien_chute_n104",
  label: "Traumatisme crânien — chute sur l'axe N104",
  ageBand: "adult",
  baselineSpO2: 98,
  baselineHeartRate: 92,
  baselineRespiratoryRate: 18,
  baselineSystolic: 138,
  baselineDiastolic: 84,
  baselineGlucose: 5.4,
  baselineTemperature: 36.8,
  consciousnessLevel: "verbal",
  glasgow: 13,
  painLevel: 6,
  // Patient à surveiller : ses constantes tiennent, mais l'atteinte neurologique
  // rend son état moins solide qu'il n'en a l'air.
  clinicalStability: 0.62,
  trend: "stable",
  // La saturation est à 98 % : l'oxygène n'a rien à corriger. Poser un masque
  // n'améliorera aucune constante, et c'est le comportement attendu.
  oxygenIndicated: false,
};

export const DETRESSE_RESPIRATOIRE: PhysiologyProfile = {
  id: "v3_detresse_respiratoire",
  label: "Détresse respiratoire",
  ageBand: "adult",
  baselineSpO2: 89,
  baselineHeartRate: 112,
  baselineRespiratoryRate: 28,
  baselineSystolic: 142,
  baselineDiastolic: 88,
  baselineGlucose: 5.8,
  baselineTemperature: 37.4,
  consciousnessLevel: "alert",
  glasgow: 15,
  painLevel: 3,
  clinicalStability: 0.35,
  trend: "slow_deterioration",
  oxygenIndicated: true,
};

export const DOULEUR_THORACIQUE: PhysiologyProfile = {
  id: "v3_douleur_thoracique",
  label: "Douleur thoracique",
  ageBand: "adult",
  baselineSpO2: 95,
  baselineHeartRate: 98,
  baselineRespiratoryRate: 20,
  baselineSystolic: 156,
  baselineDiastolic: 94,
  baselineGlucose: 6.1,
  baselineTemperature: 36.9,
  consciousnessLevel: "alert",
  glasgow: 15,
  painLevel: 8,
  clinicalStability: 0.45,
  trend: "stable",
  oxygenIndicated: false,
};

export const MALAISE_HYPOGLYCEMIQUE: PhysiologyProfile = {
  id: "v3_malaise_hypoglycemique",
  label: "Malaise hypoglycémique",
  ageBand: "adult",
  baselineSpO2: 97,
  baselineHeartRate: 104,
  baselineRespiratoryRate: 19,
  baselineSystolic: 124,
  baselineDiastolic: 76,
  baselineGlucose: 2.4,
  baselineTemperature: 36.4,
  consciousnessLevel: "verbal",
  glasgow: 12,
  painLevel: 1,
  clinicalStability: 0.4,
  trend: "slow_deterioration",
  oxygenIndicated: false,
};

export const CHOC_HEMORRAGIQUE: PhysiologyProfile = {
  id: "v3_choc_hemorragique",
  label: "Choc hémorragique",
  ageBand: "adult",
  baselineSpO2: 94,
  baselineHeartRate: 126,
  baselineRespiratoryRate: 26,
  baselineSystolic: 92,
  baselineDiastolic: 56,
  baselineGlucose: 5.2,
  baselineTemperature: 36.1,
  consciousnessLevel: "verbal",
  glasgow: 13,
  painLevel: 7,
  clinicalStability: 0.2,
  trend: "rapid_deterioration",
  oxygenIndicated: true,
};

export const INTOXICATION: PhysiologyProfile = {
  id: "v3_intoxication",
  label: "Intoxication",
  ageBand: "adult",
  baselineSpO2: 93,
  baselineHeartRate: 58,
  baselineRespiratoryRate: 10,
  baselineSystolic: 106,
  baselineDiastolic: 64,
  baselineGlucose: 4.6,
  baselineTemperature: 35.8,
  consciousnessLevel: "pain",
  glasgow: 9,
  painLevel: 0,
  clinicalStability: 0.3,
  trend: "slow_deterioration",
  oxygenIndicated: true,
};

export const CRISE_CONVULSIVE_POST_CRITIQUE: PhysiologyProfile = {
  id: "v3_crise_convulsive_post_critique",
  label: "Crise convulsive — phase post-critique",
  ageBand: "adult",
  baselineSpO2: 94,
  baselineHeartRate: 108,
  baselineRespiratoryRate: 22,
  baselineSystolic: 134,
  baselineDiastolic: 82,
  baselineGlucose: 4.9,
  baselineTemperature: 37.2,
  consciousnessLevel: "pain",
  glasgow: 10,
  painLevel: 2,
  clinicalStability: 0.5,
  // La phase post-critique se résout d'elle-même : le patient récupère.
  trend: "improving",
  oxygenIndicated: true,
};

export const PERSONNE_AGEE_FRAGILE: PhysiologyProfile = {
  id: "v3_personne_agee_fragile",
  label: "Personne âgée fragile",
  ageBand: "adult",
  baselineSpO2: 93,
  baselineHeartRate: 88,
  baselineRespiratoryRate: 20,
  baselineSystolic: 108,
  baselineDiastolic: 62,
  baselineGlucose: 5.6,
  baselineTemperature: 36.0,
  consciousnessLevel: "alert",
  glasgow: 14,
  painLevel: 4,
  clinicalStability: 0.25,
  trend: "slow_deterioration",
  oxygenIndicated: true,
};

export const ENFANT_FEBRILE: PhysiologyProfile = {
  id: "v3_enfant_febrile",
  label: "Enfant fébrile",
  ageBand: "child",
  baselineSpO2: 96,
  baselineHeartRate: 138,
  baselineRespiratoryRate: 32,
  baselineSystolic: 96,
  baselineDiastolic: 58,
  baselineGlucose: 4.8,
  baselineTemperature: 39.4,
  consciousnessLevel: "alert",
  glasgow: 15,
  painLevel: 3,
  clinicalStability: 0.45,
  trend: "stable",
  oxygenIndicated: false,
};

export const PHYSIOLOGY_PROFILES: readonly PhysiologyProfile[] = [
  TRAUMA_CRANIEN_N104,
  DETRESSE_RESPIRATOIRE,
  DOULEUR_THORACIQUE,
  MALAISE_HYPOGLYCEMIQUE,
  CHOC_HEMORRAGIQUE,
  INTOXICATION,
  CRISE_CONVULSIVE_POST_CRITIQUE,
  PERSONNE_AGEE_FRAGILE,
  ENFANT_FEBRILE,
];

export function findPhysiologyProfile(id: string): PhysiologyProfile | undefined {
  return PHYSIOLOGY_PROFILES.find((profile) => profile.id === id);
}

/** Correspondance entre un identifiant de scénario et son profil physiologique. */
const SCENARIO_PROFILES: Record<string, string> = {
  "v3-pilot-trauma-cranien": TRAUMA_CRANIEN_N104.id,
};

/**
 * Traduit le bloc clinique d'un scénario en profil physiologique.
 *
 * Deux chemins, dans cet ordre. Un scénario peut **déclarer** son profil, et
 * c'est alors une donnée relue et assumée. Sinon le profil est **dérivé** de sa
 * ligne de base : le moteur reste utilisable sur tout scénario existant sans
 * qu'il faille d'abord écrire neuf profils.
 *
 * La dérivation ne devine jamais une gravité : un scénario sans profil déclaré
 * produit un patient `stable`. Inventer une dégradation à partir de chiffres de
 * départ ferait mourir des patients que personne n'a écrits.
 */
export function profileFromScenario(
  scenarioId: string,
  clinical: InterventionClinicalProfile,
): PhysiologyProfile {
  const declared = SCENARIO_PROFILES[scenarioId];
  const named = declared ? findPhysiologyProfile(declared) : undefined;
  if (named) return named;

  const baseline = clinical.baseline;
  return {
    id: `derived:${scenarioId}`,
    label: scenarioId,
    ageBand: clinical.ageBand,
    baselineSpO2: baseline.spo2,
    baselineHeartRate: baseline.hr,
    baselineRespiratoryRate: baseline.rr,
    baselineSystolic: baseline.sbp,
    baselineDiastolic: baseline.dbp,
    baselineGlucose: baseline.glycemia,
    baselineTemperature: baseline.temperature,
    consciousnessLevel: avpuFromGlasgow(baseline.gcs),
    glasgow: baseline.gcs,
    painLevel: baseline.pain,
    clinicalStability: 0.5,
    // Un arrêt cardiaque déclaré est la seule gravité qu'on accepte de déduire :
    // elle est explicite dans le profil clinique du scénario.
    trend: clinical.cardiacArrest ? "critical" : "stable",
    // L'oxygène n'est indiqué que si la saturation le justifie. Le seuil de 94 %
    // est celui des recommandations usuelles pour l'adulte non BPCO.
    oxygenIndicated: baseline.spo2 < 94,
  };
}

/** Niveau AVPU correspondant à un Glasgow. Utilisé seulement pour la dérivation. */
export function avpuFromGlasgow(gcs: number): AvpuLevel {
  if (gcs >= 15) return "alert";
  if (gcs >= 13) return "verbal";
  if (gcs >= 9) return "pain";
  return "unresponsive";
}
