/**
 * Contrats du Mode Intervention V3.
 *
 * V3 est une couche additive : le moteur clinique de `clinical/intervention-vitals.ts` et
 * les types de mission de `intervention-domain.ts` sont importés, jamais
 * dupliqués ni modifiés. Les quinze missions historiques continuent de tourner
 * sur `intervention-engine.ts`.
 *
 * **Règle centrale.** Aucune donnée clinique n'est affichée sans une action du
 * joueur qui la révèle. Ce module en porte la première barrière : il n'exporte
 * ni `InterventionVitals`, ni `DisplayedVital`, ni `VitalsSample`. Un composant
 * ne peut donc pas nommer le type des constantes réelles, et la vue de session
 * qu'il reçoit (`InterventionSessionView`) ne les contient pas.
 *
 * Trois noms entrent en homonymie avec `intervention-domain.ts` :
 * `InterventionPhase`, `InterventionScenario` et `InterventionSession`. C'est
 * volontaire — ce sont les noms du domaine — et sans risque tant qu'un même
 * fichier n'importe pas les deux modules. Aucun fichier ne devrait avoir à le
 * faire : `v3-phases.ts` porte seul la correspondance entre les deux jeux de
 * phases.
 */

import type { MissionAlert, MissionReward, ScenarioIllustration } from "../intervention-domain.ts";
import type {
  DisplayedVital,
  InterventionClinicalProfile,
  InterventionVitals,
  VitalAlert,
  VitalSeverity,
  VitalTrend,
} from "./clinical/intervention-vitals.ts";
import type { PhysiologyState } from "./physiology/physiology-types.ts";

/* -------------------------------------------------------------------------- */
/* Phases                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Les dix phases V3. Distinctes des neuf phases du moteur historique : V3
 * ajoute `new_call` et `reevaluation`, et sépare l'évaluation de la scène de
 * celle du patient.
 */
export const V3_PHASES = [
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
] as const;

export type InterventionPhase = (typeof V3_PHASES)[number];

export const PHASE_LABELS: Record<InterventionPhase, string> = {
  new_call: "Nouvel appel",
  arrival: "Arrivée sur les lieux",
  scene_assessment: "Bilan circonstanciel",
  patient_assessment: "Évaluation primaire",
  vitals: "Constantes vitales",
  centre15_call: "Appel au 15",
  priority_actions: "Gestes prioritaires",
  reevaluation: "Réévaluation",
  transport: "Transport",
  debrief: "Débriefing",
};

/* -------------------------------------------------------------------------- */
/* Faits cliniques                                                            */
/* -------------------------------------------------------------------------- */

export type FactId = string;

/** D'où vient l'information. */
export const FACT_CATEGORIES = ["dispatch", "observable", "probe", "interview", "derived"] as const;

export type FactCategory = (typeof FACT_CATEGORIES)[number];

/**
 * Ce qui rend un fait visible. Axe indépendant de la catégorie : un fait
 * `observable` peut n'être visible qu'après une action, comme un danger qui ne
 * se voit pas depuis le point d'arrivée.
 */
export const FACT_VISIBILITIES = ["always", "on_arrival", "on_action", "on_dependency"] as const;

export type FactVisibility = (typeof FACT_VISIBILITIES)[number];

export const FACT_VALUE_KINDS = ["numeric", "ratio", "text", "boolean", "enum"] as const;

export type FactValueKind = (typeof FACT_VALUE_KINDS)[number];

export type FactValue =
  | { kind: "numeric"; value: number; formatted: string }
  | { kind: "ratio"; systolic: number; diastolic: number; formatted: string }
  | { kind: "text"; value: string }
  | { kind: "boolean"; value: boolean; formatted: string }
  | { kind: "enum"; value: string; formatted: string; short?: string };

/**
 * Texte à afficher pour une valeur, quelle que soit sa forme. Un fait `text` n'a
 * pas de `formatted` : sa valeur **est** son affichage, et la dupliquer offrirait
 * deux vérités pour une même donnée.
 */
export function displayValue(value: FactValue): string {
  return value.kind === "text" ? value.value : value.formatted;
}

export interface ClinicalFact {
  id: FactId;
  category: FactCategory;
  visibility: FactVisibility;
  label: string;
  valueKind: FactValueKind;
  unit: string | null;
  /**
   * Gabarit affiché tant que le fait n'est pas révélé : « --/-- », « --,- °C ».
   * Ne contient jamais de chiffre — sinon il laisserait deviner la valeur.
   */
  placeholder: string;
  /** Constante du moteur clinique dont ce fait prend la valeur. `probe` seulement. */
  vitalKey: DisplayedVital | null;
  /** Matériel sans lequel le fait est définitivement hors d'atteinte. */
  requiresEquipment: EquipmentId[];
  /** Actions qui révèlent ce fait. Non vide si `visibility === "on_action"`. */
  revealedBy: PlayerActionId[];
  /** Prérequis d'un fait `derived`. Aucun ne peut être lui-même `derived`. */
  dependsOn: FactId[];
  /** Secondes simulées au-delà desquelles la mesure est périmée. */
  freshnessSeconds: number | null;
  /**
   * Plage de référence affichée sous la valeur : « 95 - 100 % ».
   *
   * Connaissance de formation, pas donnée du patient : la même pour tous, et
   * visible avant toute mesure sans rien révéler. Absente pour les faits qu'aucun
   * chiffre ne porte.
   */
  referenceRange?: string | null;
}

/** Une prise de mesure horodatée. Un fait `probe` en accumule plusieurs. */
export interface FactMeasurement {
  value: FactValue;
  severity: VitalSeverity;
  atSeconds: number;
  actionId: PlayerActionId;
}

/**
 * État d'un fait révélé.
 *
 * `current` est **figée au moment du relevé** et n'est jamais recalculée depuis
 * `session.vitals`. C'est ce qui rend l'affichage fidèle à ce que le joueur a
 * réellement mesuré, et ce qui donne la péremption sans mécanisme dédié : le
 * patient évolue, la valeur affichée reste celle de la dernière prise.
 */
export interface RevealedFactState {
  factId: FactId;
  current: FactValue;
  severity: VitalSeverity;
  revealedAtSeconds: number;
  lastMeasuredAtSeconds: number;
  measurements: FactMeasurement[];
}

/** Pourquoi un fait n'est pas lisible. Détermine le libellé affiché. */
export const FACT_UNKNOWN_REASONS = [
  "not_revealed",
  "equipment_missing",
  "not_applicable",
] as const;

export type FactUnknownReason = (typeof FACT_UNKNOWN_REASONS)[number];

export type FactRead =
  | {
      status: "known";
      fact: ClinicalFact;
      value: FactValue;
      severity: VitalSeverity;
      /** Âge de la dernière mesure, en secondes simulées. */
      ageSeconds: number;
      isStale: boolean;
      /** Renseignés à partir de la deuxième mesure seulement. */
      trend?: VitalTrend;
      delta?: string;
    }
  | {
      status: "unknown";
      fact: ClinicalFact;
      reason: FactUnknownReason;
      placeholder: string;
      /** « Non mesurée », « Glucomètre non embarqué ». */
      label: string;
    };

export interface FactRegistryIndex {
  schemaVersion: 1;
  facts: ClinicalFact[];
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export type PlayerActionId = string;

export const ACTION_CATEGORIES = [
  "secure",
  "observe",
  "examine",
  "probe",
  "interview",
  "care",
  "communicate",
  "logistics",
] as const;

export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

export const EQUIPMENT_IDS = [
  "saturometre",
  "tensiometre",
  "glucometre",
  "thermometre",
  "oxygene",
  "aspirateur",
  "dae",
  "collier",
  "brancard",
  "attelle",
] as const;

export type EquipmentId = (typeof EQUIPMENT_IDS)[number];

export const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  saturometre: "Saturomètre",
  tensiometre: "Tensiomètre",
  glucometre: "Glucomètre",
  thermometre: "Thermomètre",
  oxygene: "Oxygène",
  aspirateur: "Aspirateur de mucosités",
  dae: "Défibrillateur automatisé externe",
  collier: "Collier cervical",
  brancard: "Brancard",
  attelle: "Attelle",
};

/**
 * Deux natures de prérequis, qu'il ne faut pas confondre.
 *
 * Les **barrières dures** — phase, matériel, actions bloquantes — décrivent une
 * impossibilité matérielle : on ne retire pas un capteur qu'on n'a pas posé, on
 * ne transmet pas un bilan sans avoir joint la régulation. L'action est refusée
 * sans consommer de temps.
 *
 * Les **barrières souples** — faits et actions justifiantes — décrivent une
 * justification clinique. Leur absence **ne bloque pas** : l'action s'exécute
 * avec `unjustifiedEffect` et pose son marqueur. C'est le cœur pédagogique du
 * mode : approcher un patient sans avoir sécurisé, ou partir sans réévaluer,
 * doit être possible pour être une faute.
 */
export interface ActionRequirement {
  phases: InterventionPhase[];
  equipment: EquipmentId[];
  /** Actions sans lesquelles celle-ci est matériellement impossible. */
  blockingActions: PlayerActionId[];
  /** Faits qui justifient l'action. Absents, l'action reste possible. */
  justifyingFacts: FactId[];
  /** Actions qui justifient celle-ci. Absentes, l'action reste possible. */
  justifyingActions: PlayerActionId[];
  maxUses: number | null;
}

export interface ActionEffect {
  score: number;
  patient: number;
  timeSeconds: number;
  flag: string | null;
  /**
   * Vrai pour un geste. Seule une action thérapeutique modifie `patientState`
   * et peut autoriser une reprise d'activité circulatoire.
   */
  therapeutic: boolean;
}

export interface PlayerAction {
  id: PlayerActionId;
  label: string;
  hint: string;
  category: ActionCategory;
  requires: ActionRequirement;
  reveals: FactId[];
  timeSeconds: number;
  effect: ActionEffect;
  /** Effet quand `requires.facts` n'est pas réuni. */
  unjustifiedEffect: ActionEffect | null;
  /** Acte de l'article R. 6311-17. Jamais inventé : vérifié contre le catalogue. */
  actId: string | null;
  competencyIds: string[];
  /** Hors périmètre DEA : affichée barrée, refusée, expliquée. */
  outOfScope: boolean;
  outOfScopeReason: string | null;
  /** Fiche de la bibliothèque justifiant l'action ou son refus. */
  knowledgeId: string | null;
}

export type ActionOutcomeKind = "applied" | "refused" | "unjustified";

export interface ActionLogEntry {
  actionId: PlayerActionId;
  phase: InterventionPhase;
  atSeconds: number;
  outcome: ActionOutcomeKind;
  refusalReason?: string;
  /**
   * Nature du refus, en plus de son message.
   *
   * Le message est destiné à la lecture ; s'en servir pour raisonner obligerait à
   * le reconnaître par expression régulière, et une reformulation casserait
   * silencieusement le raisonnement. Le débriefing s'appuie sur cette nature pour
   * distinguer une donnée hors d'atteinte d'une donnée simplement oubliée.
   */
  refusalKind?: string;
  revealedFactIds: FactId[];
  scoreDelta: number;
  patientDelta: number;
  flag?: string;
}

export interface ActionCatalogIndex {
  schemaVersion: 1;
  actions: PlayerAction[];
}

/* -------------------------------------------------------------------------- */
/* Transmission au Centre 15                                                  */
/* -------------------------------------------------------------------------- */

export interface HandoverItem {
  id: string;
  label: string;
  factIds: FactId[];
  /** Attendu dans le bilan de ce scénario. */
  expected: boolean;
  /** Le joueur peut transmettre « non recueilli » plutôt que taire. */
  disclosable: boolean;
}

export const HANDOVER_ITEM_STATES = [
  "transmitted",
  "disclosed_missing",
  "omitted",
  "silent_gap",
] as const;

export type HandoverItemState = (typeof HANDOVER_ITEM_STATES)[number];

export interface RegulatorAnswer {
  id: string;
  text: string;
  correct: boolean;
  rationale: string;
}

export interface RegulatorQuestion {
  id: string;
  text: string;
  /** Le trou qui déclenche la question. Sans trou, pas de question. */
  triggeredByFactId: FactId;
  /** Vrai si la question naît d'un fait révélé mais non transmis. */
  onOmission: boolean;
  answers: RegulatorAnswer[];
}

export interface Centre15Transmission {
  startedAtSeconds: number;
  durationSeconds: number;
  selection: string[];
  itemStates: Record<string, HandoverItemState>;
  questionsAsked: string[];
  answers: Record<string, string>;
  /** Consigne reçue de la régulation. Toujours reçue, jamais choisie. */
  instruction: string;
  freeAdditions: string[];
  rejectedAdditions: string[];
}

/* -------------------------------------------------------------------------- */
/* Gestes prioritaires                                                        */
/* -------------------------------------------------------------------------- */

export const GESTURE_CONSEQUENCE_FAMILIES = [
  "risk_reduction",
  "handover_quality",
  "stability",
] as const;

export type GestureConsequenceFamily = (typeof GESTURE_CONSEQUENCE_FAMILIES)[number];

export interface PriorityGesture {
  id: string;
  label: string;
  hint: string;
  recommended: boolean;
  outOfScope: boolean;
  outOfScopeReason: string | null;
  /** Faits qui justifient le geste. Absents → `unjustified-act`. */
  justifiedBy: FactId[];
  consequenceFamily: GestureConsequenceFamily;
  actId: string | null;
  competencyIds: string[];
  knowledgeId: string | null;
}

export interface PriorityGestureRoundDefinition {
  id: string;
  requiredSelections: number;
  timerSeconds: number | null;
  offered: PriorityGesture[];
}

/**
 * Le détail d'un geste retenu.
 *
 * `selected` ne dit que « ce geste a été coché ». Le jugement — était-il indiqué,
 * était-il fondé sur un élément recueilli — doit être **figé au moment du choix**,
 * comme une mesure. Le recalculer au débriefing donnerait une autre réponse : les
 * constantes auront péri entre-temps, et un geste justifié à la minute six
 * deviendrait rétroactivement une faute.
 */
export interface GestureChoice {
  gestureId: string;
  recommended: boolean;
  justified: boolean;
  atSeconds: number;
  scoreDelta: number;
  flag: string | null;
}

export interface PriorityGestureRound extends PriorityGestureRoundDefinition {
  selected: string[];
  /** Un élément par geste retenu, dans l'ordre des choix. */
  choices: GestureChoice[];
  refused: Array<{ gestureId: string; reason: string }>;
  resolved: boolean;
  correct: boolean;
}

/* -------------------------------------------------------------------------- */
/* Réévaluation                                                               */
/* -------------------------------------------------------------------------- */

export const REINFORCEMENT_STATUSES = ["none", "requested", "en_route", "on_scene"] as const;

export type ReinforcementStatus = (typeof REINFORCEMENT_STATUSES)[number];

/** Ce que l'écran de réévaluation dit au joueur des trous de son bilan. */
export const HINT_POLICIES = ["gap_list", "gap_count", "none"] as const;

export type HintPolicy = (typeof HINT_POLICIES)[number];

export interface ReevaluationState {
  cycle: number;
  startedAtSeconds: number;
  reinforcement: ReinforcementStatus;
  refreshedFactIds: FactId[];
  /** Faits attendus non révélés ou périmés. Calculés, jamais rédigés. */
  gapFactIds: FactId[];
  note: string | null;
  validated: boolean;
}

/* -------------------------------------------------------------------------- */
/* Scénario                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Confiance dans une source, **dérivée** des deux axes de la bibliothèque et
 * jamais déclarée. Un document `official` dont le contenu n'a pas été lu
 * retombe en `internal_to_validate`.
 */
export const SOURCE_TRUSTS = [
  "official_verified",
  "training_source",
  "internal_to_validate",
] as const;

export type SourceTrust = (typeof SOURCE_TRUSTS)[number];

export interface InterventionScenario {
  id: string;
  schemaVersion: 1;
  title: string;
  specialty: string;
  learningObjective: string;
  difficulty: "initiation" | "intermediate" | "advanced";
  illustration: ScenarioIllustration;
  estimatedMinutes: number;
  baseXp: number;
  startingPatient: number;
  hintPolicy: HintPolicy;
  alert: MissionAlert;
  clinical: InterventionClinicalProfile;
  /** Nature de la validation des valeurs cliniques du scénario. */
  clinicalTrust: SourceTrust;
  clinicalReviewNote: string;
  /** Faits mobilisés par ce scénario. Tous existent dans le registre. */
  factIds: FactId[];
  /**
   * Valeur de chaque fait que le moteur clinique ne produit pas : circonstances,
   * antécédents, traitements, perte de connaissance, coloration cutanée. Les
   * mesures rattachées à une constante (`vitalKey`) n'y figurent pas — leur
   * valeur vient du moteur au moment du relevé, sans quoi le scénario pourrait
   * contredire la physiologie simulée.
   */
  factValues: Record<FactId, FactValue>;
  /** Sous-ensemble attendu au bilan. Plafonné à 12. */
  expectedHandoverFactIds: FactId[];
  handoverItems: HandoverItem[];
  regulatorQuestions: RegulatorQuestion[];
  gestureRounds: PriorityGestureRoundDefinition[];
  narrative: Record<InterventionPhase, string>;
  /** Consigne reçue de la régulation après transmission. */
  regulatorInstruction: string;
  /** Formulations diagnostiques proposées à l'ajout libre, et refusées. */
  rejectedAdditions: string[];
  freeAdditions: string[];
  reward: MissionReward;
}

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

export interface EquipmentState {
  id: EquipmentId;
  prepared: boolean;
  attached: boolean;
}

/**
 * Historique physiologique interne au moteur V3.
 *
 * Il vit volontairement dans le contrat V3 : le domaine historique ne doit pas
 * être étendu pour faire fonctionner le pilote. Comme les constantes courantes,
 * cet historique est retiré de `InterventionSessionView`.
 */
export interface V3VitalsSample {
  phase: InterventionPhase;
  label: string;
  simulatedTimeSeconds: number;
  vitals: InterventionVitals;
  alerts: VitalAlert[];
}

export const SESSION_STATUSES = ["briefing", "active", "debrief"] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface InterventionSession {
  scenarioId: string;
  phase: InterventionPhase;
  status: SessionStatus;
  score: number;
  patientState: number;
  lives: number;
  simulatedTimeSeconds: number;
  equipment: EquipmentState[];
  revealedFacts: Record<FactId, RevealedFactState>;
  actionLog: ActionLogEntry[];
  flags: string[];
  /**
   * Constantes réelles du patient. **Jamais lues par un composant** : elles ne
   * figurent pas dans `InterventionSessionView`.
   */
  vitals: InterventionVitals;
  vitalsHistory: V3VitalsSample[];
  /**
   * Le patient simulé : sa base, sa trajectoire, et ce qui lui est arrivé.
   *
   * C'est de loin le champ le plus sensible de la session. Il ne contient aucune
   * constante — les valeurs n'existent qu'à l'instant où on les demande — mais il
   * permet de les calculer toutes, à n'importe quel moment, y compris avant que
   * le joueur ait posé le moindre capteur. Le donner à un composant reviendrait à
   * lui donner le dossier médical complet avant l'arrivée sur les lieux.
   */
  physiology: PhysiologyState;
  roscAchieved: boolean;
  transmission: Centre15Transmission | null;
  gestureRounds: PriorityGestureRound[];
  reevaluations: ReevaluationState[];
  xpBonus: number;
  rewardBonus: number;
}

/**
 * Champs que l'interface a le droit de recevoir.
 *
 * **Une liste d'autorisation, et non d'exclusion.** La distinction n'est pas de
 * style : une liste d'exclusion laisse passer par défaut tout champ ajouté
 * ensuite à la session. C'est ainsi que `patientState` et `roscAchieved` — l'état
 * de santé simulé du patient et la reprise d'activité circulatoire — se
 * retrouvaient exposés à l'interface alors qu'aucune action du joueur ne les
 * révèle. Un écran pouvait afficher « patient à 72 % » sans qu'un seul geste ait
 * été fait.
 *
 * Ajouter un champ à `InterventionSession` sans le classer ici le rend invisible
 * à l'interface, et un test refuse un champ non classé plutôt que de deviner.
 */
export const SESSION_VIEW_FIELDS = [
  "scenarioId",
  "phase",
  "status",
  "score",
  "lives",
  "simulatedTimeSeconds",
  "equipment",
  "revealedFacts",
  "actionLog",
  "flags",
  "transmission",
  "gestureRounds",
  "reevaluations",
  "xpBonus",
  "rewardBonus",
] as const satisfies readonly (keyof InterventionSession)[];

export type SessionViewField = (typeof SESSION_VIEW_FIELDS)[number];

/**
 * Champs délibérément retenus, avec la raison de leur rétention.
 *
 * Déclarés plutôt que déduits : un champ caché doit l'être par décision, et la
 * décision doit être lisible à côté du champ.
 */
export const HIDDEN_SESSION_FIELDS = {
  vitals: "Constantes réelles du patient, connues du moteur dès la première seconde.",
  vitalsHistory: "Historique physiologique, d'où l'on pourrait relire les constantes.",
  physiology:
    "Patient simulé complet : base, trajectoire et événements. Il ne porte aucune valeur, mais permet de calculer toutes les constantes à tout instant — y compris celles que le joueur n'a pas mesurées.",
  patientState:
    "État de santé simulé. Aucune action ne le révèle : l'afficher donnerait une lecture clinique gratuite.",
  roscAchieved:
    "Reprise d'activité circulatoire. C'est un constat clinique, qui doit se gagner comme les autres.",
} as const satisfies Partial<Record<keyof InterventionSession, string>>;

export type HiddenSessionField = keyof typeof HIDDEN_SESSION_FIELDS;

/**
 * Ce que l'interface reçoit. Deuxième moitié de la première barrière : les
 * données cliniques cachées sont retirées structurellement, si bien qu'un
 * composant ne peut pas les atteindre même sans nommer leur type.
 */
export type InterventionSessionView = Pick<InterventionSession, SessionViewField>;

/**
 * Construit la vue **en recopiant la liste d'autorisation**, et non en retirant
 * les champs cachés. La différence compte : une copie par retrait laisserait
 * passer tout champ que la liste d'exclusion aurait oublié, y compris ceux
 * ajoutés après elle. Ici l'objet produit ne peut porter que ce qui est déclaré.
 */
export function toSessionView(session: InterventionSession): InterventionSessionView {
  const view: Partial<Record<SessionViewField, unknown>> = {};
  for (const field of SESSION_VIEW_FIELDS) view[field] = session[field];
  return view as InterventionSessionView;
}

/* -------------------------------------------------------------------------- */
/* Débriefing                                                                 */
/* -------------------------------------------------------------------------- */

export const SCORE_AXIS_IDS = [
  "securite",
  "bilan",
  "constantes",
  "communication",
  "gestes",
  "transport",
] as const;

export type ScoreAxisId = (typeof SCORE_AXIS_IDS)[number];

export const SCORE_AXIS_LABELS: Record<ScoreAxisId, string> = {
  securite: "Sécurité du patient",
  bilan: "Bilan & évaluation",
  constantes: "Constantes vitales",
  communication: "Communication Centre 15",
  gestes: "Gestes prioritaires",
  transport: "Transport & installation",
};

export const AXIS_RATINGS = ["excellent", "tres_bien", "bien", "suffisant", "a_ameliorer"] as const;

export type AxisRating = (typeof AXIS_RATINGS)[number];

export interface ScoreAxis {
  id: ScoreAxisId;
  label: string;
  /** `null` quand l'axe n'est pas mobilisé : affiché « non évalué », jamais 0 %. */
  percentage: number | null;
  earned: number;
  available: number;
  rating: AxisRating | null;
  /** Entrées du journal ayant coûté des points sur cet axe. */
  lostOn: ActionLogEntry[];
}

export const TIMELINE_NODE_STATUSES = ["success", "partial", "error"] as const;

export type TimelineNodeStatus = (typeof TIMELINE_NODE_STATUSES)[number];

export interface TimelineNode {
  id: string;
  label: string;
  phases: InterventionPhase[];
  durationSeconds: number;
  status: TimelineNodeStatus;
  reason?: string;
}

export interface RewardResult {
  nominalXp: number;
  nominalCoins: number;
  rewardFactor: number;
  xp: number;
  coins: number;
  badge?: string;
  rankBefore: number;
  rankAfter: number;
  rankBonusPercent: number;
}

export interface DebriefReviewEntry {
  severity: "error" | "warning";
  label: string;
  knowledgeId?: string;
  /** Point de départ du rejeu, reconstruit depuis `actionLog`. */
  replayFromSeconds?: number;
}

export interface DebriefReference {
  knowledgeId: string;
  title: string;
  subtitle: string;
  trust: SourceTrust;
}

export const FACT_COVERAGE_STATES = ["measured", "not_measured", "not_measurable"] as const;

export type FactCoverageState = (typeof FACT_COVERAGE_STATES)[number];

/**
 * Ce que le joueur a bien fait.
 *
 * Un débriefing qui ne liste que les fautes n'enseigne qu'à moitié : l'apprenant
 * ne sait pas ce qu'il doit reproduire. Les réussites sont donc relevées avec la
 * même exigence que les erreurs — à partir du journal, jamais par un compliment
 * générique.
 */
export interface DebriefStrength {
  /** Ce qui a été bien fait, en une phrase tirée de ce qui a été joué. */
  label: string;
  /** Nature de la réussite, pour le regroupement à l'écran. */
  axis: ScoreAxisId;
}

/** Une erreur de transmission, avec sa nature. */
export interface HandoverReviewEntry {
  itemId: string;
  label: string;
  state: HandoverItemState;
  /** Vrai pour un trou passé sous silence : la faute de transmission la plus grave. */
  silent: boolean;
  detail: string;
}

/** Un geste dangereux tenté, non indiqué, ou recommandé et manqué. */
export interface GestureReviewEntry {
  gestureId: string;
  label: string;
  kind: "refused" | "not_indicated" | "unjustified" | "missing";
  detail: string;
}

export interface DebriefReport {
  scenarioId: string;
  passed: boolean;
  failureReason?: string;
  score: number;
  /** 1 à 5, par demi-points. */
  stars: number;
  globalRating: string;
  /** Égal à la somme des `durationSeconds` de `timeline`. */
  totalSeconds: number;
  axes: ScoreAxis[];
  /** Découplé de `livesRemaining` : un trou de bilan ne coûte pas de vie. */
  criticalErrorCount: number;
  livesRemaining: number;
  timeline: TimelineNode[];
  trajectory: "amelioration" | "stabilisation" | "aggravation" | "echec" | undefined;
  reward: RewardResult;
  review: DebriefReviewEntry[];
  references: DebriefReference[];
  /**
   * Couverture des données de la mission. `expected` distingue ce qui était
   * attendu au bilan de ce qui était seulement disponible : ne pas avoir pris la
   * température n'est pas du même ordre que ne pas avoir pris la tension.
   */
  factCoverage: Array<{
    factId: FactId;
    label: string;
    state: FactCoverageState;
    expected: boolean;
  }>;
  /** Ce que le joueur a bien fait. */
  strengths: DebriefStrength[];
  /** Erreurs de transmission au Centre 15. Vide si le bilan n'a pas été transmis. */
  handoverReview: HandoverReviewEntry[];
  /** Gestes dangereux tentés, gestes non indiqués retenus, gestes attendus manqués. */
  gestureReview: GestureReviewEntry[];
  /**
   * La conduite attendue pour cette mission, assemblée depuis les déclarations du
   * scénario — gestes recommandés, éléments attendus au bilan — et jamais rédigée
   * en prose : une conduite écrite à la main finirait par contredire les données.
   */
  expectedConduct: string[];
  /** Fiches à revoir, tirées des erreurs commises et non des actions jouées. */
  revisionPoints: DebriefReference[];
}

/* -------------------------------------------------------------------------- */
/* Constantes de règle                                                        */
/* -------------------------------------------------------------------------- */

/** Score de départ, repris du moteur historique. */
export const V3_STARTING_SCORE = 45;

/** Vies au départ. Une vie ne tombe que sur une faute grave. */
export const V3_STARTING_LIVES = 5;

/**
 * Marqueurs coûtant une vie. Volontairement court : un trou de bilan n'en coûte
 * aucune, ce qui rend cohérent « cinq vies intactes, deux erreurs critiques ».
 */
export const GRAVE_FAULT_FLAGS = [
  "out-of-scope-act",
  "unsafe-approach",
  "ignored-alert",
  "premature-transport",
] as const;

/** Plafond de faits attendus au bilan : au-delà, ce n'est plus un bilan. */
export const MAX_EXPECTED_HANDOVER_FACTS = 12;

/** Plancher, pour qu'un bilan attendu ne soit pas trivial. */
export const MIN_EXPECTED_HANDOVER_FACTS = 6;
