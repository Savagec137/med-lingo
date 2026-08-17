import type {
  EquipmentId,
  FactId,
  FactRead,
  InterventionSessionView,
  PlayerAction,
  PlayerActionId,
} from "../v3-domain.ts";
import { EQUIPMENT_LABELS, displayValue } from "../v3-domain.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";
import { getFact } from "../facts/fact-registry.ts";
import { readFact } from "../facts/read-fact.ts";
import { actionsForPhase, findAction } from "../actions/action-catalog.ts";
import { successfulActionIds } from "../engine/apply-action.ts";
import { actionAvailability } from "./action-availability.ts";
import { formatGlycemiaMmolForUi } from "../format-glycemia.ts";

/**
 * Écran 3 — « Constantes en direct ».
 *
 * C'est l'écran où la règle centrale du mode se joue : **aucune valeur ne
 * s'affiche sans un relevé du joueur.** Rien ici ne lit les constantes réelles du
 * patient. Chaque carte passe par `readFact`, qui répond soit une valeur figée au
 * moment de la mesure, soit une absence nommée — « Non mesurée », « Glucomètre
 * non embarqué ». Une session vierge produit donc une grille entièrement en
 * gabarits, et c'est le comportement attendu, pas un écran vide.
 *
 * La composition des panneaux est **dérivée**, jamais recopiée. Les constantes
 * sont les faits que le moteur clinique alimente ; les évaluations sont les
 * constats sur le patient qu'aucun appareil ne chiffre. Un écran qui listerait
 * ces faits en dur cesserait d'être juste au premier scénario suivant.
 */

/* Types repris de `FactRead` plutôt qu'importés du moteur clinique : la couche
 * présentation ne nomme pas le module des constantes réelles. */
type KnownRead = Extract<FactRead, { status: "known" }>;
type Severity = KnownRead["severity"];
type Trend = NonNullable<KnownRead["trend"]>;

export interface VitalCardModel {
  factId: FactId;
  label: string;
  /**
   * Valeur relevée **sans son unité**, ou le gabarit du fait — jamais un chiffre
   * inventé. La maquette compose un grand nombre et une petite unité : les deux
   * parties sont donc séparées ici, sans jamais reformater la valeur elle-même.
   */
  value: string;
  /**
   * Unité réellement portée par la valeur affichée, et non celle déclarée au
   * registre : le relevé d'une glycémie est formaté en g/L alors que le registre
   * la décrit en mmol/L. Afficher l'unité du registre à côté d'une valeur en g/L
   * annoncerait une mesure fausse d'un facteur cinq.
   */
  unit: string | null;
  /** Vrai seulement si le joueur a réellement obtenu la mesure. */
  measured: boolean;
  /** Nul tant que rien n'est mesuré : pas de couleur sur une absence. */
  severity: Severity | null;
  trend: Trend | null;
  delta: string | null;
  /** Mesure périmée : affichée, mais signalée comme datée. */
  isStale: boolean;
  ageSeconds: number | null;
  /** Phrase de l'absence : « Non mesurée », « Tensiomètre non embarqué ». */
  missingLabel: string | null;
  /** Vrai quand le matériel manque : la mesure est hors d'atteinte, pas oubliée. */
  outOfReach: boolean;
  /** La même valeur dans l'autre unité, sans interprétation. Glycémie seule. */
  secondaryValue: string | null;
}

export interface QuickMeasureModel {
  id: PlayerActionId;
  label: string;
  hint: string;
  /** Libellés des constantes que le geste renseigne. */
  reveals: string[];
  /** Matériel qu'il mobilise, pour la pastille de la carte. */
  equipment: string[];
  enabled: boolean;
  disabledReason: string | null;
  /** Déjà relevée : la maquette coche la carte sans la faire disparaître. */
  alreadyDone: boolean;
  /** Secondes simulées que le geste consomme. */
  timeSeconds: number;
}

export interface EvaluationModel {
  factId: FactId;
  label: string;
  value: string;
  known: boolean;
  /** Geste qui établirait ce constat, s'il est proposé à cette étape. */
  action: {
    id: PlayerActionId;
    label: string;
    enabled: boolean;
    disabledReason: string | null;
  } | null;
}

export interface EquipmentChipModel {
  id: EquipmentId;
  label: string;
  /** Embarqué au départ. Le reste du matériel n'existe pas pour cette mission. */
  prepared: boolean;
  /** Capteur en place sur le patient. */
  attached: boolean;
  /** Mobilisé au moins une fois. C'est le « utilisé » de la maquette. */
  used: boolean;
}

export interface VitalsScreenModel {
  eyebrow: string;
  title: string;
  /** Récit de la phase, écrit dans le scénario. */
  narrative: string;
  /** Constantes chiffrées, dans l'ordre du registre de faits. */
  vitals: VitalCardModel[];
  /** Combien de constantes attendues sont relevées, pour la jauge de la maquette. */
  measuredCount: number;
  expectedCount: number;
  quickMeasures: QuickMeasureModel[];
  /**
   * Gestes de capteur, qui posent ou retirent sans rien mesurer. Ils ne sont pas
   * des mesures rapides — ils ne renseignent aucune constante — mais les omettre
   * rendrait le retrait du saturomètre injouable depuis cet écran.
   */
  sensorControls: QuickMeasureModel[];
  evaluations: EvaluationModel[];
  equipment: EquipmentChipModel[];
}

/**
 * Catégories d'actions qui renseignent sur le patient plutôt que sur la scène.
 *
 * C'est ce critère, et non une liste de faits écrite à la main, qui répartit les
 * faits entre cet écran et celui du bilan circonstanciel : un fait révélé en
 * sécurisant ou en observant l'environnement décrit les lieux, un fait révélé en
 * examinant, mesurant ou interrogeant décrit le patient.
 */
const PATIENT_ACTION_CATEGORIES = new Set(["examine", "probe", "interview"]);

function isPatientFact(factId: FactId): boolean {
  const fact = getFact(factId);
  if (fact.category === "derived") return true;
  return fact.revealedBy.some((actionId) => {
    const action = findAction(actionId);
    return action !== undefined && PATIENT_ACTION_CATEGORIES.has(action.category);
  });
}

/** Faits du scénario relevant du patient et portés par une constante chiffrée. */
export function vitalFactIds(scenarioId: string): FactId[] {
  return getV3Scenario(scenarioId).factIds.filter(
    (factId) => isPatientFact(factId) && getFact(factId).vitalKey !== null,
  );
}

/** Faits du scénario relevant du patient qu'aucun appareil ne chiffre. */
export function evaluationFactIds(scenarioId: string): FactId[] {
  return getV3Scenario(scenarioId).factIds.filter(
    (factId) => isPatientFact(factId) && getFact(factId).vitalKey === null,
  );
}

/**
 * Sépare une valeur formatée de son unité.
 *
 * La valeur n'est jamais reformatée : elle est découpée. Reformater signifierait
 * relire le nombre et le réécrire, donc pouvoir en changer — un arrondi de plus
 * sur une glycémie ou une température serait une altération de mesure.
 *
 * `factUnit` ne sert que de repli pour les unités collées à la valeur, comme le
 * « /15 » du Glasgow, qu'aucune espace ne détache.
 */
export function splitFormattedValue(
  formatted: string,
  factUnit: string | null,
): { value: string; unit: string | null } {
  // Le découpage n'opère que sur ce qui est réellement une mesure : un nombre,
  // éventuellement décimal, éventuellement une fraction comme « 138/84 ». Une
  // valeur en clair — « Pâleur marquée » — n'a pas d'unité à détacher, et couper
  // son dernier mot en ferait une unité imaginaire.
  const measurement = /^(\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)?)(?:\s+(\S+))?$/u.exec(formatted);
  if (measurement) {
    const [, number, unit] = measurement;
    if (unit !== undefined) return { value: number!, unit };
    // Unité collée à la valeur, comme le « /15 » du Glasgow : seule la
    // déclaration du registre permet de savoir où la valeur s'arrête.
    if (factUnit !== null && number!.endsWith(factUnit)) {
      return { value: number!.slice(0, -factUnit.length), unit: factUnit };
    }
  }
  return { value: formatted, unit: factUnit };
}

/**
 * La même valeur dans l'autre unité. La glycémie seule en a deux : le moteur la
 * conserve en mmol/L et la formate en g/L pour le terrain. Le changement d'unité
 * ne qualifie rien — ni normale, ni basse — ce n'est pas une lecture médicale.
 */
function secondaryValueOf(read: KnownRead): string | null {
  if (read.fact.id !== "fact.glycemie" || read.value.kind !== "numeric") return null;
  return formatGlycemiaMmolForUi(read.value.value);
}

function vitalCard(session: InterventionSessionView, factId: FactId): VitalCardModel {
  const read = readFact(session, factId);
  const fact = read.fact;

  if (read.status === "unknown") {
    return {
      factId,
      label: fact.label,
      value: fact.placeholder,
      unit: fact.unit,
      measured: false,
      severity: null,
      trend: null,
      delta: null,
      isStale: false,
      ageSeconds: null,
      missingLabel: read.label,
      outOfReach: read.reason === "equipment_missing",
      secondaryValue: null,
    };
  }

  const shown = splitFormattedValue(displayValue(read.value), fact.unit);

  return {
    factId,
    label: fact.label,
    value: shown.value,
    unit: shown.unit,
    measured: true,
    severity: read.severity,
    trend: read.trend ?? null,
    delta: read.delta ?? null,
    isStale: read.isStale,
    ageSeconds: read.ageSeconds,
    missingLabel: null,
    outOfReach: false,
    secondaryValue: secondaryValueOf(read),
  };
}

function quickMeasure(session: InterventionSessionView, action: PlayerAction): QuickMeasureModel {
  const availability = actionAvailability(session, action);
  return {
    id: action.id,
    label: action.label,
    hint: action.hint,
    reveals: action.reveals.map((factId) => getFact(factId).label),
    equipment: action.requires.equipment.map((id) => EQUIPMENT_LABELS[id]),
    enabled: availability.enabled,
    disabledReason: availability.disabledReason,
    alreadyDone: availability.alreadyDone,
    timeSeconds: action.timeSeconds,
  };
}

/**
 * Geste proposé pour établir un constat non chiffré.
 *
 * Une seule action est retenue par fait, la première du registre qui soit offerte
 * à la phase courante. Proposer les trois manières d'apprendre les antécédents
 * dans une carte de constat encombrerait l'écran sans rien apporter : le panneau
 * des mesures rapides, lui, les liste toutes.
 */
function evaluationAction(
  session: InterventionSessionView,
  factId: FactId,
): EvaluationModel["action"] {
  const offered = new Set(actionsForPhase(session.phase).map((action) => action.id));
  const actionId = getFact(factId).revealedBy.find((id) => offered.has(id));
  if (!actionId) return null;
  const action = findAction(actionId);
  if (!action) return null;
  const availability = actionAvailability(session, action);
  return {
    id: action.id,
    label: action.label,
    enabled: availability.enabled,
    disabledReason: availability.disabledReason,
  };
}

function evaluation(session: InterventionSessionView, factId: FactId): EvaluationModel {
  const read = readFact(session, factId);
  return {
    factId,
    label: read.fact.label,
    value: read.status === "known" ? displayValue(read.value) : read.label,
    known: read.status === "known",
    action: read.status === "known" ? null : evaluationAction(session, factId),
  };
}

/**
 * Matériel de la mission.
 *
 * La maquette titre ce panneau « Matériel utilisé ». Le modèle expose le matériel
 * **embarqué** avec un marqueur `used`, et non le seul matériel déjà employé :
 * masquer le tensiomètre présent dans le sac et jamais sorti effacerait
 * exactement l'oubli que l'écran doit rendre visible. Un composant qui veut la
 * lettre de la maquette filtre sur `used`.
 */
function equipmentChips(session: InterventionSessionView): EquipmentChipModel[] {
  const done = successfulActionIds(session);
  const usedIds = new Set<EquipmentId>();
  for (const actionId of done) {
    const action = findAction(actionId);
    for (const id of action?.requires.equipment ?? []) usedIds.add(id);
  }
  return session.equipment
    .filter((item) => item.prepared)
    .map((item) => ({
      id: item.id,
      label: EQUIPMENT_LABELS[item.id],
      prepared: item.prepared,
      attached: item.attached,
      used: usedIds.has(item.id),
    }));
}

export function vitalsScreenModel(session: InterventionSessionView): VitalsScreenModel {
  const scenario = getV3Scenario(session.scenarioId);
  const vitals = vitalFactIds(session.scenarioId).map((factId) => vitalCard(session, factId));
  const probeActions = actionsForPhase(session.phase).filter(
    (action) => action.category === "probe",
  );

  // La jauge compte les constantes **attendues au bilan**, pas toutes celles que
  // le scénario mobilise : c'est sur le bilan que le joueur est évalué.
  const expected = new Set(scenario.expectedHandoverFactIds);
  const expectedVitals = vitals.filter((card) => expected.has(card.factId));

  return {
    eyebrow: "Intervention en cours",
    title: "Constantes en direct",
    narrative: scenario.narrative[session.phase],
    vitals,
    measuredCount: expectedVitals.filter((card) => card.measured && !card.isStale).length,
    expectedCount: expectedVitals.length,
    quickMeasures: probeActions
      .filter((action) => action.reveals.length > 0)
      .map((action) => quickMeasure(session, action)),
    sensorControls: probeActions
      .filter((action) => action.reveals.length === 0)
      .map((action) => quickMeasure(session, action)),
    evaluations: evaluationFactIds(session.scenarioId).map((factId) => evaluation(session, factId)),
    equipment: equipmentChips(session),
  };
}
