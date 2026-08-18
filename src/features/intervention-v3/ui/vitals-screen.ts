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
import { actionsForPhase, findAction, PLAYER_ACTIONS } from "../actions/action-catalog.ts";
import { successfulActionIds } from "../engine/action-gate.ts";
import { actionAvailability } from "./action-availability.ts";
import { formatGlycemiaMmolForUi } from "../format-glycemia.ts";
import type {
  AttachedSensorView,
  LiveVitalView,
  MonitoringSnapshot,
  SignalQuality,
  StaleVitalView,
  WaveformStateView,
} from "../physiology/physiology-types.ts";

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

/**
 * Les types de surveillance, réexportés depuis cet écran.
 *
 * Ce n'est pas de la commodité. Une garde interdit aux composants animés
 * d'importer quoi que ce soit hors de `ui/`, et elle est **volontairement
 * aveugle** : elle ne cherche pas à distinguer un module de contrats d'un module
 * de moteur, parce qu'un contrôle qui trierait finirait par se tromper. La
 * couche présentation est donc le seul vocabulaire des composants, et ce qu'ils
 * doivent pouvoir nommer passe par elle.
 */
export type {
  AttachedSensorView,
  MonitoringSnapshot,
  SignalQuality,
  StaleVitalView,
  WaveformStateView,
  WaveformTrace,
} from "../physiology/physiology-types.ts";

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
  /**
   * La valeur affichée est **tenue à jour en ce moment**.
   *
   * Cela demande un instantané de surveillance, et pas seulement un capteur posé.
   * La nuance est ce qui empêche une carte de battre et de défiler en montrant
   * une valeur figée : sans rafraîchissement, rien n'est en direct, même capteur
   * en place. Faux aussi pour un instantané de mesure — une tension prise au
   * brassard vaut pour son moment, et l'animer mentirait sur sa nature.
   */
  isLive: boolean;
  /** État du capteur qui porte la mesure. Nul si aucun appareil n'y est rattaché. */
  equipmentState: EquipmentUsageState | null;
  /** Instant du relevé, en secondes simulées. Nul si jamais mesurée. */
  measuredAtSeconds: number | null;
  /**
   * Valeur numérique du relevé, pour les animations qui ont besoin d'un nombre.
   * **Nulle tant que rien n'est mesuré** : c'est ce qui interdit à une animation
   * de trahir une constante que le joueur n'a pas relevée.
   */
  numericValue: number | null;
  /**
   * Qualité du signal du capteur qui porte cette constante.
   *
   * Elle décrit l'appareil et jamais le patient : un signal faible sur quelqu'un
   * qui va très bien est une situation banale. C'est ce qui la rend sûre à
   * afficher — elle n'apprend rien de clinique.
   */
  signalQuality: SignalQuality | null;
  /**
   * Plage de référence, telle que la maquette l'affiche sous la valeur
   * (« 95 - 100 % », « 60 - 100 bpm »).
   *
   * C'est une **connaissance de formation**, pas une donnée du patient : elle est
   * la même pour tous les patients et se trouve dans n'importe quel manuel. La
   * montrer avant toute mesure ne révèle donc rien — et la cacher priverait
   * l'apprenant du repère qui donne son sens au chiffre.
   */
  referenceRange: string | null;
}

/**
 * Ce qui anime l'écran, et rien d'autre.
 *
 * Chaque champ est **nul tant que la mesure correspondante n'a pas été prise**.
 * C'est la règle centrale portée jusque dans les animations : une onde de pouls
 * qui battrait à la fréquence réelle du patient avant toute palpation
 * révélerait cette fréquence aussi sûrement qu'un chiffre.
 */
export interface MonitoringModel {
  /** Un capteur au moins est en place. */
  anyLive: boolean;
  /**
   * Cadence de la pulsation visuelle, en battements par minute. Nulle tant que le
   * pouls n'a pas été relevé — une onde qui bat sans mesure invente une donnée.
   */
  pulseBpm: number | null;
  /** Cadence de l'animation respiratoire. Nulle tant que la FR n'est pas comptée. */
  respiratoryRatePerMinute: number | null;
  /** Constantes actuellement tenues à jour par un capteur en place. */
  liveFactIds: FactId[];
  /**
   * Ce que le bandeau du moniteur affiche : « Saturomètre non posé »,
   * « Acquisition du signal », « Signal faible — repositionner le capteur ».
   *
   * Il ne dit jamais rien du patient. Un bandeau qui annoncerait « patient
   * stable » offrirait la conclusion que le joueur doit tirer de ses mesures.
   */
  statusLabel: string;
  /** Capteurs en place, avec leur qualité de signal. Vide si rien n'est posé. */
  sensors: AttachedSensorView[];
  /**
   * Tracés autorisés à cet instant. Nul tant qu'aucune surveillance n'est en
   * cours — et les points restent vides tant que la cadence n'a pas été mesurée.
   */
  waveform: WaveformStateView | null;
  /** Mesures que le temps a périmées, à réévaluer. */
  stale: StaleVitalView[];
}

/**
 * Le panneau « État du patient » de la maquette, en trois lignes.
 *
 * Chacune vient d'un fait, et **aucune n'est lisible sans l'action qui le
 * révèle**. C'est le panneau le plus exposé de l'écran : il donne une lecture
 * clinique en trois mots, et l'afficher gratuitement offrirait au joueur la
 * conclusion qu'il doit construire. Sur une session vierge, les trois lignes
 * disent leur absence.
 */
export interface PatientReadoutLine {
  id: "stabilite" | "conscience" | "communication";
  /** Ce que la ligne affiche : « Stable », « Confus », « Non évalué ». */
  label: string;
  known: boolean;
  tone: "positive" | "neutral" | "warning" | "critical";
}

/**
 * Le panneau « Matériel utilisé » de la maquette.
 *
 * Il ne liste pas le sac : il liste **ce qui a servi ou reste à faire**, appareils
 * et évaluations chiffrées confondus — c'est exactement ce que la maquette y met,
 * évaluation de la douleur et de la conscience comprises.
 *
 * Le critère est dérivé, jamais recopié : une ligne y figure si le geste mobilise
 * un appareil **ou** produit un score sur une échelle (« /10 », « /15 »). Compter
 * la fréquence respiratoire, palper le pouls et observer la peau en sont donc
 * exclus, comme dans la maquette — et ils le resteront si le catalogue change,
 * parce que le critère porte sur la nature du geste et non sur son nom.
 */
export interface EquipmentCheckModel {
  id: PlayerActionId;
  /**
   * Libellé court, adapté à un panneau étroit : « Saturomètre », « Douleur ».
   *
   * Ce n'est pas le libellé du geste — « Poser le saturomètre » déborde et se
   * fait tronquer. Il est dérivé de ce que la ligne désigne réellement : le nom
   * de l'appareil quand il y en a un, celui de la donnée relevée sinon.
   */
  label: string;
  done: boolean;
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

/**
 * État d'un matériel, en un seul mot.
 *
 * Quatre états qui ne se confondent pas. « Embarqué et jamais sorti » n'est pas
 * « utilisé », et « posé » n'est pas « retiré » — un saturomètre qu'on a ôté a
 * bien servi, mais il ne surveille plus. Un panneau qui mélangerait ces états
 * mentirait sur ce que l'équipe a réellement fait.
 */
export const EQUIPMENT_USAGE_STATES = [
  "available",
  "used",
  "attached",
  "removed",
  "unused",
] as const;

export type EquipmentUsageState = (typeof EQUIPMENT_USAGE_STATES)[number];

export interface EquipmentChipModel {
  id: EquipmentId;
  label: string;
  state: EquipmentUsageState;
  /** Libellé du métier, celui que la maquette affiche. */
  stateLabel: string;
  /** Embarqué au départ. Le reste du matériel n'existe pas pour cette mission. */
  prepared: boolean;
  /** Capteur en place sur le patient à cet instant. */
  attached: boolean;
  /** Mobilisé au moins une fois pendant la mission. */
  used: boolean;
}

export interface VitalsScreenModel {
  eyebrow: string;
  title: string;
  /** Sous-titre de la maquette : « Surveillance et mesures ». */
  subtitle: string;
  /**
   * Les trois lignes du panneau « État du patient » de la maquette.
   *
   * Le champ ne s'appelle pas `patientState` : c'est le nom du **champ caché**
   * de la session, celui qui porte l'indice de santé simulé du patient. Une
   * garde l'interdit partout dans un composant, sans regarder de quel objet il
   * s'agit — délibérément, parce qu'un contrôle qui trierait les provenances se
   * laisserait contourner. Deux champs homonymes obligeraient à l'assouplir ; le
   * nom cède, pas la garde.
   */
  patientReadout: PatientReadoutLine[];
  /** La liste à cocher du panneau « Matériel utilisé ». */
  equipmentChecks: EquipmentCheckModel[];
  /** Récit de la phase, écrit dans le scénario. */
  narrative: string;
  /** Constantes chiffrées, dans l'ordre du registre de faits. */
  vitals: VitalCardModel[];
  /**
   * Les constantes qu'un capteur peut tenir à jour — la saturation et le pouls.
   *
   * La maquette leur donne la section « Signes vitaux » à elles seules, en deux
   * grandes cartes avec leur tracé. Les autres suivent dans une grille dense :
   * elles restent visibles, gabarits compris, parce que c'est cette grille vierge
   * qui montre au joueur tout ce qu'il n'a pas encore relevé.
   */
  monitoredVitals: VitalCardModel[];
  /** Le reste des constantes du scénario, dans l'ordre du registre. */
  otherVitals: VitalCardModel[];
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
  /**
   * Gestes de communication proposés à cette phase — joindre la régulation,
   * demander un renfort.
   *
   * Ils ne mesurent rien, et c'est précisément pourquoi ils manquaient : l'écran
   * ne listait que les gestes de mesure. La mission butait alors sur « joindre le
   * Centre 15 avant d'ouvrir la transmission » sans qu'aucun bouton ne permette
   * de le joindre.
   */
  communications: QuickMeasureModel[];
  /**
   * Les évaluations cliniques, séparées des mesures rapides comme dans la
   * maquette.
   *
   * Le partage est dérivé du registre : une **mesure** lit une grandeur physique
   * — un pourcentage, des millimètres de mercure, des cycles par minute. Une
   * **évaluation** produit un score sur une échelle (« /10 », « /15 ») ou une
   * description sans unité. Ce critère rend exactement les trois cartes de la
   * maquette, et il tiendra si le catalogue s'étend, contrairement à une liste
   * écrite à la main ou déduite du nom des actions.
   */
  clinicalAssessments: QuickMeasureModel[];
  /** Ce qui anime l'écran. Tout y est nul tant que la mesure n'est pas prise. */
  monitoring: MonitoringModel;
  evaluations: EvaluationModel[];
  /**
   * Panneau « Matériel embarqué » : tout ce que l'équipe a dans le sac, chacun
   * avec son état. Le tensiomètre jamais sorti y figure, marqué « Non utilisé ».
   */
  carriedEquipment: EquipmentChipModel[];
  /**
   * Panneau « Matériel utilisé » de la maquette : uniquement ce qui a réellement
   * servi. Un sous-ensemble strict du précédent, jamais un mélange des deux.
   */
  usedEquipment: EquipmentChipModel[];
  /** Intitulés des deux panneaux, pour que le composant ne les réinvente pas. */
  equipmentPanelLabels: { carried: string; used: string };
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

interface MonitoringContext {
  equipmentByFact: Map<FactId, EquipmentUsageState>;
  /** Ce que le moniteur affiche à cet instant, par fait. Vide sans surveillance. */
  liveByFact: Map<FactId, LiveVitalView>;
}

function vitalCard(
  session: InterventionSessionView,
  factId: FactId,
  context: MonitoringContext,
): VitalCardModel {
  const read = readFact(session, factId);
  const fact = read.fact;
  const equipmentState = context.equipmentByFact.get(factId) ?? null;
  const monitored = context.liveByFact.get(factId) ?? null;
  const referenceRange = fact.referenceRange ?? null;

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
      // Une constante non relevée n'anime rien, quel que soit l'état du capteur :
      // un saturomètre posé mais dont la mesure n'a pas encore été lue ne doit
      // pas faire battre une onde.
      isLive: false,
      equipmentState,
      measuredAtSeconds: null,
      numericValue: null,
      signalQuality: null,
      referenceRange,
    };
  }

  const frozen = splitFormattedValue(displayValue(read.value), fact.unit);

  /*
   * Deux valeurs possibles pour une même carte, et l'ordre compte.
   *
   * Quand un capteur est en place, la carte montre **ce que le moniteur affiche
   * maintenant** : c'est ce qu'un soignant lit en levant les yeux, et une carte
   * qui garderait le chiffre du relevé initial pendant que l'appareil en affiche
   * un autre serait fausse.
   *
   * Sans capteur, elle montre **la valeur figée au moment du relevé**. Une tension
   * prise il y a six minutes vaut ce qu'elle valait ; la recalculer donnerait au
   * joueur une mesure qu'il n'a pas prise.
   */
  const shown = monitored?.value !== undefined && monitored.value !== null;

  return {
    factId,
    label: fact.label,
    value: shown ? monitored!.value! : frozen.value,
    unit: shown ? monitored!.unit : frozen.unit,
    measured: true,
    severity: monitored ? monitored.severity : read.severity,
    trend: monitored ? monitored.trendDirection : (read.trend ?? null),
    delta: monitored ? null : (read.delta ?? null),
    // Une constante tenue à jour par un capteur ne peut pas être périmée.
    isStale: monitored ? monitored.isStale : read.isStale,
    ageSeconds: monitored ? 0 : read.ageSeconds,
    missingLabel: null,
    outOfReach: false,
    secondaryValue: secondaryValueOf(read),
    isLive: monitored?.isLive ?? false,
    equipmentState,
    measuredAtSeconds: session.simulatedTimeSeconds - read.ageSeconds,
    numericValue: shown ? monitored!.numericValue : numericOf(read),
    signalQuality: monitored?.signalQuality ?? null,
    referenceRange,
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

const EQUIPMENT_STATE_LABELS: Record<EquipmentUsageState, string> = {
  available: "Disponible",
  used: "Utilisé",
  attached: "Posé",
  removed: "Retiré",
  unused: "Non utilisé",
};

/**
 * Matériel de la mission, en deux listes qui ne se mélangent pas.
 *
 * La maquette titre son panneau « Matériel utilisé ». Une première version
 * rendait une liste unique du matériel embarqué avec un marqueur `used`, en
 * laissant au composant le soin de filtrer : c'était mélanger deux notions sous
 * un seul titre, et le composant pouvait afficher le tensiomètre resté dans le sac
 * sous l'intitulé « utilisé ».
 *
 * Les deux listes sont donc construites ici, avec leur libellé propre. « Matériel
 * embarqué » dit ce que l'équipe avait, « Matériel utilisé » ce qu'elle a sorti.
 * Le tensiomètre embarqué et jamais employé apparaît dans la première, marqué
 * « Non utilisé » — l'oubli reste visible, sans être rangé sous le mauvais titre.
 */
function equipmentUsageState(
  item: InterventionSessionView["equipment"][number],
  used: boolean,
): EquipmentUsageState {
  if (!used) return ATTACHABLE_EQUIPMENT.has(item.id) ? "unused" : "available";
  if (item.attached) return "attached";
  // Un capteur détaché a bien servi : « retiré » et « jamais sorti » sont deux
  // situations différentes, et les confondre effacerait la surveillance
  // interrompue. Un matériel qui ne se pose pas et qui a servi est simplement
  // « utilisé » — un tensiomètre ne reste pas en place.
  return ATTACHABLE_EQUIPMENT.has(item.id) ? "removed" : "used";
}

function equipmentChips(session: InterventionSessionView): EquipmentChipModel[] {
  const done = successfulActionIds(session);
  const usedIds = new Set<EquipmentId>();
  for (const actionId of done) {
    const action = findAction(actionId);
    for (const id of action?.requires.equipment ?? []) usedIds.add(id);
  }
  return session.equipment
    .filter((item) => item.prepared)
    .map((item) => {
      const used = usedIds.has(item.id);
      const state = equipmentUsageState(item, used);
      return {
        id: item.id,
        label: EQUIPMENT_LABELS[item.id],
        state,
        stateLabel: EQUIPMENT_STATE_LABELS[state],
        prepared: item.prepared,
        attached: item.attached,
        used,
      };
    });
}

/** Matériel qui se pose sur le patient, et peut donc être retiré. */
const ATTACHABLE_EQUIPMENT = new Set<EquipmentId>(["saturometre"]);

/**
 * Valeur numérique d'un relevé, ou rien.
 *
 * C'est la seule porte par laquelle un nombre atteint une animation, et elle est
 * fermée tant que le fait n'est pas relevé. Une tension rend sa systolique : c'est
 * elle qui donne le rythme, pas la diastolique.
 */
function numericOf(read: FactRead): number | null {
  if (read.status !== "known") return null;
  if (read.value.kind === "numeric") return read.value.value;
  if (read.value.kind === "ratio") return read.value.systolic;
  return null;
}

/* -------------------------------------------------------------------------- */
/* Le panneau « État du patient »                                             */
/* -------------------------------------------------------------------------- */

/**
 * Correspondance entre l'énumération de stabilité produite par le moteur et le
 * mot que la maquette affiche.
 *
 * L'énumération vient de `read-fact`, qui la calcule depuis les sévérités des
 * constantes relevées. Elle n'existe donc pas tant que trois mesures n'ont pas
 * été prises, et c'est ce qui rend cette ligne sûre.
 */
const STABILITY_LABELS: Record<string, { label: string; tone: PatientReadoutLine["tone"] }> = {
  stables: { label: "Stable", tone: "positive" },
  surveiller: { label: "À surveiller", tone: "warning" },
  degrades: { label: "Paramètres dégradés", tone: "critical" },
};

/**
 * Les trois lignes du panneau « État du patient ».
 *
 * Chacune est une lecture, jamais une déduction : la stabilité vient des
 * constantes relevées, la conscience de l'évaluation faite, la communication du
 * fait d'avoir interrogé le patient. Sur une session vierge, les trois disent
 * leur absence — et c'est ce panneau, plus qu'aucun autre, qui doit se taire :
 * « Stable » affiché gratuitement donnerait au joueur la conclusion qu'il est
 * censé construire.
 */
export function patientReadoutLines(session: InterventionSessionView): PatientReadoutLine[] {
  const stability = readFact(session, "fact.stabilite-parametres");
  const consciousness = readFact(session, "fact.conscience-qualitative");
  const interview = readFact(session, "fact.plaintes");

  const stabilityEntry =
    stability.status === "known" && stability.value.kind === "enum"
      ? STABILITY_LABELS[stability.value.value]
      : undefined;

  return [
    {
      id: "stabilite",
      label: stabilityEntry?.label ?? "Stabilité non évaluée",
      known: stabilityEntry !== undefined,
      tone: stabilityEntry?.tone ?? "neutral",
    },
    {
      id: "conscience",
      // La forme courte est **écrite dans le scénario**. À défaut, la forme longue
      // est affichée telle quelle : mieux vaut une ligne qui déborde qu'un
      // abrégé fabriqué à partir d'un identifiant.
      label:
        consciousness.status === "known"
          ? consciousness.value.kind === "enum"
            ? (consciousness.value.short ?? consciousness.value.formatted)
            : displayValue(consciousness.value)
          : "Conscience non évaluée",
      known: consciousness.status === "known",
      tone: consciousness.status === "known" ? "neutral" : "neutral",
    },
    {
      id: "communication",
      label: interview.status === "known" ? "Répond aux questions" : "Patient non interrogé",
      known: interview.status === "known",
      tone: "neutral",
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Mesures et évaluations                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Une unité qui n'est qu'un dénominateur d'échelle : « /10 », « /15 ».
 *
 * À distinguer d'un débit comme « /min », qui est bien une grandeur physique.
 * C'est ce seul caractère qui sépare une évaluation d'une mesure, et il se lit
 * dans le registre plutôt que dans le nom du geste.
 */
const isScaleUnit = (unit: string | null): boolean => unit !== null && /^\/\d+$/u.test(unit);

/**
 * Un geste est une **évaluation clinique** si rien de ce qu'il révèle ne se lit
 * sur un instrument : que des scores sur une échelle, ou des constats sans unité.
 * Tout le reste est une mesure.
 */
export function isClinicalAssessment(action: PlayerAction): boolean {
  if (action.reveals.length === 0) return false;
  return action.reveals.every((factId) => {
    const unit = getFact(factId).unit;
    return unit === null || isScaleUnit(unit);
  });
}

/**
 * Un geste figure au panneau « Matériel utilisé » s'il mobilise un appareil ou
 * s'il produit un score sur une échelle. C'est ce que la maquette y met — les
 * quatre appareils, plus l'évaluation de la douleur et celle de la conscience.
 */
function belongsToEquipmentPanel(action: PlayerAction): boolean {
  if (action.requires.equipment.length > 0) return true;
  return action.reveals.some((factId) => isScaleUnit(getFact(factId).unit));
}

/** Le nom court d'une ligne du panneau : l'appareil, ou la donnée qu'elle relève. */
function equipmentCheckLabel(action: PlayerAction): string {
  const [equipment] = action.requires.equipment;
  if (equipment) return EQUIPMENT_LABELS[equipment];
  const [factId] = action.reveals;
  return factId ? getFact(factId).label : action.label;
}

/**
 * L'écran des constantes.
 *
 * `snapshot` est **facultatif**, et ce n'est pas une commodité : le modèle doit
 * rester juste sans surveillance, parce que c'est l'état d'un début
 * d'intervention. Sans instantané, les cartes montrent ce que le joueur a relevé,
 * figé au moment du relevé ; avec, celles qu'un capteur tient à jour montrent la
 * valeur du moment.
 *
 * L'instantané vient du hook, jamais d'un composant : c'est un résultat de
 * sélecteur, déjà filtré par la double condition mesurée + capteur en place.
 */
export function vitalsScreenModel(
  session: InterventionSessionView,
  snapshot?: MonitoringSnapshot,
): VitalsScreenModel {
  const scenario = getV3Scenario(session.scenarioId);
  const carried = equipmentChips(session);
  const context: MonitoringContext = {
    liveByFact: new Map(
      (snapshot?.monitoring.liveVitals ?? []).map((entry) => [entry.factId, entry] as const),
    ),
    equipmentByFact: new Map(
      carried.flatMap((chip) =>
        PLAYER_ACTIONS.filter((action) => action.requires.equipment.includes(chip.id)).flatMap(
          (action) => action.reveals.map((factId) => [factId, chip.state] as const),
        ),
      ),
    ),
  };
  const vitals = vitalFactIds(session.scenarioId).map((factId) =>
    vitalCard(session, factId, context),
  );
  const measuredOf = (factId: FactId) =>
    vitals.find((card) => card.factId === factId)?.numericValue ?? null;
  const probeActions = actionsForPhase(session.phase).filter(
    (action) => action.category === "probe",
  );
  const revealingProbes = probeActions.filter((action) => action.reveals.length > 0);

  // Les constantes qu'un capteur peut tenir à jour, qu'il soit posé ou non : la
  // maquette leur réserve la section « Signes vitaux ». Sans instantané, la
  // distinction n'a pas lieu d'être et tout retombe dans la grille dense.
  const monitorable = new Set(snapshot?.monitorableFactIds ?? []);

  // La jauge compte les constantes **attendues au bilan**, pas toutes celles que
  // le scénario mobilise : c'est sur le bilan que le joueur est évalué.
  const expected = new Set(scenario.expectedHandoverFactIds);
  const expectedVitals = vitals.filter((card) => expected.has(card.factId));

  return {
    eyebrow: "Intervention en cours",
    title: "Constantes en direct",
    subtitle: "Surveillance et mesures",
    patientReadout: patientReadoutLines(session),
    equipmentChecks: revealingProbes.filter(belongsToEquipmentPanel).map((action) => ({
      id: action.id,
      label: equipmentCheckLabel(action),
      done: actionAvailability(session, action).alreadyDone,
    })),
    narrative: scenario.narrative[session.phase],
    vitals,
    monitoredVitals: vitals.filter((card) => monitorable.has(card.factId)),
    otherVitals: vitals.filter((card) => !monitorable.has(card.factId)),
    measuredCount: expectedVitals.filter((card) => card.measured && !card.isStale).length,
    expectedCount: expectedVitals.length,
    quickMeasures: revealingProbes
      .filter((action) => !isClinicalAssessment(action))
      .map((action) => quickMeasure(session, action)),
    clinicalAssessments: revealingProbes
      .filter((action) => isClinicalAssessment(action))
      .map((action) => quickMeasure(session, action)),
    sensorControls: probeActions
      .filter((action) => action.reveals.length === 0)
      .map((action) => quickMeasure(session, action)),
    communications: actionsForPhase(session.phase)
      .filter((action) => action.category === "communicate" && !action.outOfScope)
      .map((action) => quickMeasure(session, action)),
    monitoring: {
      anyLive: snapshot?.monitoring.anyLive ?? false,
      // Les cadences viennent des cartes, donc de `readFact` ou du moniteur, donc
      // de ce que le joueur a relevé. Aucune animation ne peut battre à une
      // fréquence que personne n'a mesurée.
      pulseBpm: measuredOf("fact.fc"),
      respiratoryRatePerMinute: measuredOf("fact.fr"),
      liveFactIds: (snapshot?.monitoring.liveVitals ?? []).map((entry) => entry.factId),
      statusLabel: snapshot?.monitoring.statusLabel ?? "Saturomètre non posé",
      sensors: snapshot?.monitoring.sensors ?? [],
      waveform: snapshot?.waveform ?? null,
      stale: snapshot?.stale ?? [],
    },
    evaluations: evaluationFactIds(session.scenarioId).map((factId) => evaluation(session, factId)),
    carriedEquipment: carried,
    usedEquipment: carried.filter((chip) => chip.used),
    equipmentPanelLabels: { carried: "Matériel embarqué", used: "Matériel utilisé" },
  };
}
