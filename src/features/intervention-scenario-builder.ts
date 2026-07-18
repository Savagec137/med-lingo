import type {
  InterventionPhase,
  InterventionScenario,
  MissionAlert,
  MissionDifficulty,
  MissionDifficultyStars,
  MissionReward,
  PatientSnapshot,
  PatientVital,
  ScenarioIllustration,
  ScenarioStep,
} from "./intervention-domain.ts";
import { buildInterventionQuestion } from "./intervention-question-factory.ts";

export interface OfficialMissionProfile {
  id: string;
  order: number;
  specialty: string;
  title: string;
  summary: string;
  difficulty: MissionDifficulty;
  difficultyStars: MissionDifficultyStars;
  minimumLevel: number;
  estimatedMinutes: number;
  baseXp: number;
  illustration: ScenarioIllustration;
  unlockAfter?: string;
  startingPatient: number;
  alert: MissionAlert;
  reward: MissionReward;
  pulseAdvice: string[];
  patient: {
    label: string;
    detail: string;
    tone: PatientSnapshot["tone"];
    vitals: PatientVital[];
  };
  content: {
    arrival: string;
    equipment: string;
    scene: string;
    safetyAction: string;
    safetyAvoid: string;
    primary: string;
    primaryAction: string;
    primaryAvoid: string;
    secondary: string;
    secondaryAction: string;
    secondaryAvoid: string;
    care: string;
    careAction: string;
    careAvoid: string;
    decision: string;
    decisionAction: string;
    decisionAvoid: string;
    transport: string;
    transportAction: string;
    transportAvoid: string;
    handover: string;
  };
}

const PHASE_META: Record<InterventionPhase, { eyebrow: string; title: string; objective: string }> =
  {
    arrival: {
      eyebrow: "Départ de l'ambulance",
      title: "Préparer la mission",
      objective: "Partager l'alerte, anticiper le matériel et répartir les rôles.",
    },
    safety: {
      eyebrow: "Arrivée sur les lieux",
      title: "Sécuriser l'intervention",
      objective:
        "Contrôler les dangers avant le contact et protéger toutes les personnes présentes.",
    },
    primary: {
      eyebrow: "Bilan primaire ABCDE",
      title: "Identifier les détresses vitales",
      objective:
        "Réaliser une évaluation structurée et traiter les menaces immédiates selon protocole.",
    },
    secondary: {
      eyebrow: "Bilan secondaire",
      title: "Compléter l'évaluation",
      objective:
        "Recueillir les circonstances, antécédents, traitements et signes associés utiles.",
    },
    care: {
      eyebrow: "Gestes",
      title: "Choisir les gestes adaptés",
      objective:
        "Agir dans son champ de compétence, selon les protocoles et la régulation médicale.",
    },
    decision: {
      eyebrow: "Transmission SAMU",
      title: "Décider avec la régulation",
      objective: "Transmettre un bilan hiérarchisé et obtenir l'orientation adaptée.",
    },
    transport: {
      eyebrow: "Transport",
      title: "Organiser l'évacuation",
      objective:
        "Maintenir la surveillance et assurer un transfert sécurisé vers la filière décidée.",
    },
    debrief: {
      eyebrow: "Relais",
      title: "Clore la mission",
      objective: "Transmettre l'évolution, tracer les actions et assurer la continuité des soins.",
    },
  };

function snapshot(profile: OfficialMissionProfile, phase: InterventionPhase): PatientSnapshot {
  if (phase === "arrival") {
    return {
      label: "Patient signalé par l'appel",
      detail: profile.alert.dispatchNote,
      tone: "watch",
      vitals: [
        { label: "Priorité", value: profile.alert.priority, tone: "watch" },
        { label: "Distance", value: profile.alert.distance },
      ],
    };
  }

  if (phase === "debrief") {
    return {
      label: "Relais en cours",
      detail: "L'équipe receveuse attend une transmission structurée et chronologique.",
      tone: "stable",
      vitals: [
        { label: "Traçabilité", value: "À finaliser" },
        { label: "Relais", value: "Équipe prête" },
      ],
    };
  }

  return {
    label: profile.patient.label,
    detail: profile.patient.detail,
    tone: phase === "transport" ? "watch" : profile.patient.tone,
    vitals: profile.patient.vitals,
  };
}

function buildStep(
  profile: OfficialMissionProfile,
  phase: InterventionPhase,
  narrative: string,
  recommendedAction: string,
  index: number,
): ScenarioStep {
  const meta = PHASE_META[phase];
  const question = buildInterventionQuestion(profile, phase, recommendedAction);
  const correctTime = 40 + index * 12;
  const errorTime = 25 + index * 8;
  const rewardBonus = phase === "care" || phase === "decision" || phase === "debrief" ? 8 : 0;
  const successEffect = {
    score: 8 + profile.difficultyStars,
    patient: phase === "debrief" ? 3 : 5 + Math.floor(profile.difficultyStars / 2),
    timeSeconds: correctTime,
    xpBonus: 5 + profile.difficultyStars,
    rewardBonus,
    flags: [`${phase}-secured`],
  };
  const failureEffect = {
    score: -(7 + profile.difficultyStars),
    patient: -(6 + profile.difficultyStars),
    timeSeconds: errorTime,
    isError: true,
    flags: [`${phase}-risk`],
  };

  return {
    id: `${profile.id}-${phase}`,
    phase,
    eyebrow: meta.eyebrow,
    title: meta.title,
    narrative,
    objective: meta.objective,
    question: question.question,
    format: question.format,
    requiredSelections: question.requiredSelections,
    successFeedback: question.successFeedback,
    priorityReminder: question.priorityReminder,
    successEffect,
    failureEffect,
    patient: snapshot(profile, phase),
    choices: question.choices.map((choice) => ({
      ...choice,
      feedback: choice.rationale,
      effect: choice.recommended ? successEffect : failureEffect,
    })),
  };
}

export function buildOfficialScenario(profile: OfficialMissionProfile): InterventionScenario {
  const { content } = profile;
  const phases: Array<[InterventionPhase, string, string]> = [
    ["arrival", content.arrival, content.equipment],
    ["safety", content.scene, content.safetyAction],
    ["primary", content.primary, content.primaryAction],
    ["secondary", content.secondary, content.secondaryAction],
    ["care", content.care, content.careAction],
    ["decision", content.decision, content.decisionAction],
    ["transport", content.transport, content.transportAction],
    ["debrief", content.handover, "Faire un relais oral chronologique et compléter la traçabilité"],
  ];

  return {
    id: profile.id,
    specialty: profile.specialty,
    title: profile.title,
    summary: profile.summary,
    difficulty: profile.difficulty,
    difficultyStars: profile.difficultyStars,
    minimumLevel: profile.minimumLevel,
    estimatedMinutes: profile.estimatedMinutes,
    baseXp: profile.baseXp,
    illustration: profile.illustration,
    unlockAfter: profile.unlockAfter,
    alert: profile.alert,
    reward: profile.reward,
    startingPatient: profile.startingPatient,
    pulseAdvice: profile.pulseAdvice,
    steps: phases.map(([phase, narrative, recommended], index) =>
      buildStep(profile, phase, narrative, recommended, index),
    ),
  };
}

export function buildOfficialCatalog(profiles: OfficialMissionProfile[]) {
  const ordered = [...profiles].sort((left, right) => left.order - right.order);
  const ids = new Set<string>();
  const orders = new Set<number>();

  for (const [index, profile] of ordered.entries()) {
    if (!profile.id.trim() || !profile.title.trim()) {
      throw new Error("Chaque mission doit posséder un identifiant et un titre.");
    }
    if (!Number.isInteger(profile.order) || profile.order < 1 || orders.has(profile.order)) {
      throw new Error(`Ordre de mission invalide ou dupliqué : ${profile.order}`);
    }
    if (ids.has(profile.id)) throw new Error(`Identifiant de mission dupliqué : ${profile.id}`);
    if (index === 0 && profile.unlockAfter) {
      throw new Error("La première mission doit être débloquée.");
    }
    if (index > 0 && profile.unlockAfter !== ordered[index - 1]?.id) {
      throw new Error(`La mission ${profile.id} doit dépendre de la mission précédente.`);
    }
    orders.add(profile.order);
    ids.add(profile.id);
  }

  return ordered.map(buildOfficialScenario);
}
