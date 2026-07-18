import type {
  DistractorKind,
  InterventionPhase,
  InterventionQuestionFormat,
  MissionDifficultyStars,
} from "./intervention-domain.ts";
import type { OfficialMissionProfile } from "./intervention-scenario-builder.ts";

export interface QuestionChoiceDraft {
  id: string;
  label: string;
  detail: string;
  rationale: string;
  recommended: boolean;
  distractorKind?: DistractorKind;
  sequenceRank?: number;
}

export interface InterventionQuestionDesign {
  format: InterventionQuestionFormat;
  question: string;
  instruction: string;
  requiredSelections: number;
  successFeedback: string;
  priorityReminder: string;
  choices: QuestionChoiceDraft[];
}

interface DistractorDraft {
  label: string;
  rationale: string;
  kind: DistractorKind;
}

const PRIORITY_REMINDERS: Record<InterventionPhase, string> = {
  arrival:
    "Avant le départ, l'anticipation doit rester ciblée : briefing, rôles, accès et matériel adapté au motif.",
  safety:
    "La sécurité de la scène précède le contact clinique ; elle doit ensuite être réévaluée pendant l'intervention.",
  primary:
    "Le bilan primaire recherche et traite d'abord les menaces vitales selon une démarche ABCDE structurée.",
  secondary:
    "Le bilan secondaire complète l'ABCDE sans retarder une action urgente, une transmission ou un transport prioritaire.",
  care: "Les gestes sont réalisés dans le champ de compétence du DEA, selon sa formation, les protocoles applicables et la régulation.",
  decision:
    "La transmission hiérarchise les signes de gravité, les horaires, les actions réalisées et l'évolution avant de discuter l'orientation.",
  transport:
    "La mobilisation et le transport sont préparés, coordonnés et surveillés selon l'état du patient et la décision de régulation.",
  debrief:
    "Le relais doit permettre à l'équipe suivante de comprendre rapidement la chronologie, les priorités, les gestes et l'évolution.",
};

const SINGLE_QUESTIONS: Record<InterventionPhase, string> = {
  arrival: "Avant le départ, quelle préparation est prioritaire pour cette mission ?",
  safety: "À l'arrivée sur les lieux, quelle action réalisez-vous en premier ?",
  primary: "Après sécurisation, quelle action est prioritaire dans le bilan primaire ?",
  secondary:
    "Quel élément complète le mieux le bilan à ce stade sans retarder la prise en charge ?",
  care: "Quelle action est la plus adaptée à l'état actuel du patient ?",
  decision: "Quelle décision est la plus adaptée au moment de contacter la régulation ?",
  transport: "Quelle conduite est prioritaire avant et pendant la mobilisation ?",
  debrief: "Quelle transmission permet le relais le plus sûr avec l'équipe receveuse ?",
};

const SECOND_CORRECT: Record<InterventionPhase, string> = {
  arrival: "Répartir les rôles et vérifier l'accès pendant que le matériel ciblé est rassemblé",
  safety: "Maintenir une veille sur les dangers pendant toute la prise en charge",
  primary: "Traiter les menaces vitales identifiées puis réévaluer immédiatement leur évolution",
  secondary:
    "Noter les horaires, les traitements pertinents et les changements observés depuis l'appel",
  care: "Surveiller la réponse aux gestes et retransmettre sans délai toute aggravation",
  decision: "Préciser les horaires, les constantes successives et la réponse aux premières actions",
  transport: "Anticiper le matériel, les rôles et les risques de dégradation pendant le transfert",
  debrief: "Signaler les risques persistants et les actions restant à réaliser après le relais",
};

const DISTRACTORS: Record<InterventionPhase, DistractorDraft[]> = {
  arrival: [
    {
      label: "Partir immédiatement et choisir le matériel seulement après le premier contact",
      rationale:
        "Le départ rapide est important, mais l'absence d'anticipation peut retarder le premier bilan et les gestes attendus sur place.",
      kind: "frequent-error",
    },
    {
      label: "Confirmer par téléphone tous les antécédents avant d'engager l'ambulance",
      rationale:
        "L'interrogatoire détaillé sera utile plus tard ; l'attendre avant le départ retarde inutilement l'arrivée auprès du patient.",
      kind: "wrong-timing",
    },
    {
      label: "Préparer uniquement le matériel correspondant au diagnostic supposé lors de l'appel",
      rationale:
        "Le motif d'appel oriente la préparation, mais ne confirme pas un diagnostic et ne doit pas faire oublier le matériel de bilan et de sécurité.",
      kind: "sign-misinterpretation",
    },
    {
      label: "Emporter tout le matériel spécialisé disponible sans répartir les rôles",
      rationale:
        "Cette stratégie paraît prudente, mais elle surcharge l'équipe et remplace une préparation ciblée par une accumulation non hiérarchisée.",
      kind: "secondary-priority",
    },
  ],
  safety: [
    {
      label:
        "Commencer le bilan pendant qu'un équipier recherche encore les dangers autour du patient",
      rationale:
        "L'évaluation clinique est nécessaire, mais elle ne doit pas débuter avant que l'approche et la zone de travail soient suffisamment sécurisées.",
      kind: "wrong-timing",
    },
    {
      label: "Installer d'abord le patient sur le brancard pour libérer rapidement la zone",
      rationale:
        "La mobilisation peut devenir nécessaire, mais elle est prématurée avant l'analyse des risques et l'évaluation des menaces vitales.",
      kind: "frequent-error",
    },
    {
      label:
        "Recueillir la chronologie complète auprès des témoins avant de modifier l'environnement",
      rationale:
        "Les témoignages seront utiles au bilan secondaire ; ils restent moins prioritaires que le contrôle immédiat des dangers.",
      kind: "secondary-priority",
    },
    {
      label:
        "Se fier à l'absence de danger signalé pendant l'appel et approcher sans nouvelle vérification",
      rationale:
        "La situation peut avoir changé depuis l'appel ; la sécurité doit être évaluée par l'équipe à son arrivée.",
      kind: "sign-misinterpretation",
    },
  ],
  primary: [
    {
      label: "Installer tout le monitorage avant de commencer l'évaluation structurée ABCDE",
      rationale:
        "Le monitorage apporte des données utiles, mais ne doit pas retarder l'évaluation clinique immédiate des fonctions vitales.",
      kind: "wrong-timing",
    },
    {
      label:
        "Recueillir d'abord les antécédents et les traitements avant d'évaluer les fonctions vitales",
      rationale:
        "Ces informations appartiennent au bilan secondaire ; elles passent après la recherche des détresses vitales.",
      kind: "secondary-priority",
    },
    {
      label: "Examiner en détail le signe qui motive l'appel avant de poursuivre le reste du bilan",
      rationale:
        "Se focaliser sur le motif visible expose à manquer une menace vitale moins évidente dans une autre composante de l'ABCDE.",
      kind: "sign-misinterpretation",
    },
    {
      label: "Préparer la mobilisation avant de réévaluer les signes de gravité identifiés",
      rationale:
        "Le transport peut être nécessaire, mais la réévaluation et la stabilisation des priorités immédiates doivent guider sa préparation.",
      kind: "other-context",
    },
  ],
  secondary: [
    {
      label: "Reprendre intégralement l'ABCDE sans recueillir la chronologie ni les traitements",
      rationale:
        "L'ABCDE doit être réévalué si l'état change, mais le répéter seul ne remplace pas le bilan secondaire ciblé chez un patient stabilisé.",
      kind: "frequent-error",
    },
    {
      label:
        "Compléter d'abord l'identité administrative avant d'explorer les circonstances cliniques",
      rationale:
        "L'identification est nécessaire, mais les circonstances, horaires et traitements pertinents influencent plus directement la décision médicale.",
      kind: "secondary-priority",
    },
    {
      label:
        "Explorer tous les antécédents anciens avec le même niveau de détail avant la transmission",
      rationale:
        "Un interrogatoire exhaustif peut retarder la régulation ; il faut sélectionner les informations pertinentes pour la situation actuelle.",
      kind: "wrong-timing",
    },
    {
      label:
        "Conclure à partir du motif d'appel sans confronter les informations à l'évolution observée",
      rationale:
        "Le motif initial est une hypothèse de départ ; l'évolution et les données recueillies doivent rester la source de la transmission.",
      kind: "sign-misinterpretation",
    },
  ],
  care: [
    {
      label: "Commencer le transport avant d'évaluer l'effet des premières actions réalisées",
      rationale:
        "Le départ peut être urgent, mais une réévaluation brève permet de transmettre l'évolution et d'anticiper une aggravation pendant le trajet.",
      kind: "wrong-timing",
    },
    {
      label: "Appliquer le geste adapté à une situation voisine sans reconfirmer les indications",
      rationale:
        "Un geste pertinent dans un autre contexte peut être inadapté ici ; les indications et limites de compétence doivent être vérifiées.",
      kind: "other-context",
    },
    {
      label: "Attendre les renforts sans poursuivre la surveillance ni les gestes autorisés au DEA",
      rationale:
        "L'arrivée de renforts ne dispense pas de poursuivre les actions relevant du DEA et la surveillance dynamique du patient.",
      kind: "frequent-error",
    },
    {
      label: "Modifier de sa propre initiative une thérapeutique avant le retour de la régulation",
      rationale:
        "Certains actes sont soumis à prescription ou à un cadre précis ; une initiative hors protocole dépasse les limites de compétence.",
      kind: "secondary-priority",
    },
  ],
  decision: [
    {
      label:
        "Transmettre uniquement le diagnostic supposé et demander immédiatement une destination",
      rationale:
        "Un diagnostic supposé ne remplace pas les faits : signes de gravité, constantes, horaires, actions et évolution doivent être hiérarchisés.",
      kind: "sign-misinterpretation",
    },
    {
      label: "Attendre une série complète de constantes avant de signaler une aggravation évidente",
      rationale:
        "Une donnée manquante peut être complétée ensuite ; une aggravation ou une menace vitale doit être transmise sans attendre.",
      kind: "wrong-timing",
    },
    {
      label: "Commencer par les informations administratives puis décrire les signes cliniques",
      rationale:
        "L'identification reste utile, mais elle ne doit pas masquer le motif, les menaces vitales et l'évolution qui déterminent la réponse du SAMU.",
      kind: "secondary-priority",
    },
    {
      label: "Choisir seul l'établissement le plus proche avant d'avoir présenté le bilan",
      rationale:
        "La proximité ne garantit pas la filière adaptée ; l'orientation est discutée avec la régulation à partir du bilan transmis.",
      kind: "frequent-error",
    },
  ],
  transport: [
    {
      label: "Commencer la mobilisation pendant qu'un équipier contacte encore la régulation",
      rationale:
        "Cette action peut être correcte en urgence extrême, mais elle est prématurée sans décision partagée, préparation et coordination de l'équipe.",
      kind: "wrong-timing",
    },
    {
      label:
        "Choisir systématiquement le moyen de portage le plus rapide, quelle que soit l'évolution",
      rationale:
        "La rapidité seule ne suffit pas ; le moyen doit être adapté à l'état du patient, à l'accès et aux risques de mobilisation.",
      kind: "sign-misinterpretation",
    },
    {
      label: "Reporter la surveillance jusqu'à l'installation complète dans l'ambulance",
      rationale:
        "La mobilisation est une phase à risque ; la surveillance et la capacité de réagir doivent être maintenues pendant le transfert.",
      kind: "frequent-error",
    },
    {
      label: "Différer toute nouvelle transmission jusqu'à l'arrivée dans l'établissement receveur",
      rationale:
        "Une évolution significative pendant le trajet doit être retransmise afin d'adapter la conduite et de préparer l'accueil.",
      kind: "secondary-priority",
    },
  ],
  debrief: [
    {
      label: "Commencer par l'ensemble des antécédents avant de rappeler le motif et l'état actuel",
      rationale:
        "Les antécédents pertinents ont leur place, mais le relais doit d'abord situer le motif, les priorités et l'état actuel.",
      kind: "secondary-priority",
    },
    {
      label: "Donner seulement la dernière série de constantes sans préciser leur évolution",
      rationale:
        "Une valeur isolée ne permet pas de comprendre la dynamique ; les horaires et les variations apportent le contexte nécessaire.",
      kind: "sign-misinterpretation",
    },
    {
      label: "Remettre la fiche écrite et réserver les explications aux questions de l'équipe",
      rationale:
        "La traçabilité écrite est indispensable, mais elle ne remplace pas un relais oral structuré et la vérification de la compréhension.",
      kind: "frequent-error",
    },
    {
      label: "Décrire chaque geste en détail avant d'annoncer les risques encore présents",
      rationale:
        "Les gestes réalisés sont utiles au relais, mais les risques persistants et actions en attente doivent rester immédiatement visibles.",
      kind: "wrong-timing",
    },
  ],
};

function answerCount(stars: MissionDifficultyStars, order: number) {
  if (stars === 1) return 3;
  if (stars <= 3) return 4;
  if (stars === 4) return order % 2 === 0 ? 5 : 4;
  return 5;
}

function chooseFormat(
  profile: OfficialMissionProfile,
  phase: InterventionPhase,
): InterventionQuestionFormat {
  if (phase === "arrival") return profile.order % 2 === 0 ? "equipment" : "single";
  if (phase === "safety")
    return profile.order % 3 === 0 ? "error-identification" : "contextual-true-false";
  if (phase === "primary")
    return profile.difficultyStars >= 2 && profile.order % 2 === 0 ? "multiple" : "single";
  if (phase === "secondary") return profile.order % 2 === 0 ? "association" : "single";
  if (phase === "care")
    return profile.difficultyStars >= 3 && profile.order % 2 === 1 ? "multiple" : "single";
  if (phase === "decision") return profile.order % 2 === 0 ? "regulatory" : "handover";
  if (phase === "transport") return profile.difficultyStars >= 3 ? "sequence" : "single";
  if (phase === "debrief") return profile.difficultyStars >= 4 ? "sequence" : "handover";
  return "single";
}

function questionFor(format: InterventionQuestionFormat, phase: InterventionPhase) {
  if (format === "multiple")
    return "Quelles sont les deux actions prioritaires à associer à ce stade ?";
  if (format === "sequence")
    return "Dans quel ordre réalisez-vous ces actions pour conserver une prise en charge cohérente ?";
  if (format === "equipment")
    return "Quel matériel préparez-vous en priorité avant l'arrivée auprès du patient ?";
  if (format === "association")
    return "Quelle association entre les éléments observés et l'action proposée est la plus adaptée ?";
  if (format === "error-identification")
    return "Quelle proposition décrit l'erreur de priorisation à éviter à ce stade ?";
  if (format === "regulatory")
    return "Quelle décision respecte le rôle du DEA et la régulation médicale à ce stade ?";
  if (format === "handover")
    return "Quel élément doit être transmis en priorité au SAMU ou à l'équipe receveuse ?";
  if (format === "contextual-true-false")
    return "Parmi ces affirmations contextualisées, laquelle respecte la priorité de cette phase ?";
  return SINGLE_QUESTIONS[phase];
}

function makeChoice(
  profile: OfficialMissionProfile,
  phase: InterventionPhase,
  suffix: string,
  label: string,
  rationale: string,
  recommended: boolean,
  distractorKind?: DistractorKind,
  sequenceRank?: number,
): QuestionChoiceDraft {
  return {
    id: `${profile.id}-${phase}-${suffix}`,
    label,
    detail: recommended
      ? "À évaluer selon la priorité, le timing et le cadre de compétence."
      : "Option plausible à comparer avec la priorité immédiate de la situation.",
    rationale,
    recommended,
    distractorKind,
    sequenceRank,
  };
}

function sequenceChoices(
  profile: OfficialMissionProfile,
  phase: InterventionPhase,
): QuestionChoiceDraft[] {
  const labels =
    phase === "debrief"
      ? [
          "Identifier le patient, le motif d'appel et la situation initiale",
          "Présenter l'ABCDE, les signes de gravité et les constantes horodatées",
          "Décrire les actions réalisées et l'évolution observée après chacune",
          "Conclure par le transport, les risques persistants et les actions en attente",
        ]
      : [
          "Valider avec la régulation la destination et les conditions du transport",
          "Préparer le patient, le matériel, le moyen de portage et les rôles",
          "Réaliser la mobilisation puis le transport avec la surveillance adaptée",
          "Retransmettre toute évolution et effectuer un relais structuré à l'arrivée",
        ];

  return labels.map((label, index) =>
    makeChoice(
      profile,
      phase,
      `sequence-${index + 1}`,
      label,
      `Cette action occupe la position ${index + 1} : elle ${
        index === 0
          ? "cadre la décision avant l'engagement des actions suivantes"
          : index === labels.length - 1
            ? "assure la continuité une fois les étapes précédentes réalisées"
            : "s'appuie sur l'étape précédente et prépare la suivante"
      }.`,
      true,
      undefined,
      index + 1,
    ),
  );
}

function errorIdentificationChoices(
  profile: OfficialMissionProfile,
  phase: InterventionPhase,
  count: number,
  recommendedAction: string,
): QuestionChoiceDraft[] {
  const identifiedError = DISTRACTORS[phase][0];
  if (!identifiedError) throw new Error(`Aucun distracteur disponible pour ${phase}`);
  const appropriateAlternatives = [
    {
      label: recommendedAction,
      rationale:
        "Cette proposition respecte la priorité de la phase ; elle n'est donc pas l'erreur recherchée.",
    },
    {
      label: SECOND_CORRECT[phase],
      rationale:
        "Cette action complète correctement la prise en charge sans remplacer la priorité principale.",
    },
    {
      label: "Réévaluer la situation après l'action et adapter la transmission à l'évolution",
      rationale:
        "La réévaluation est une conduite attendue ; elle ne constitue pas l'erreur de priorisation demandée.",
    },
    {
      label: "Partager les rôles avec l'équipier et annoncer clairement les changements observés",
      rationale:
        "La coordination et l'annonce des changements améliorent la sécurité ; ce n'est pas l'erreur recherchée.",
    },
  ];

  return [
    makeChoice(
      profile,
      phase,
      "identified-error",
      identifiedError.label,
      identifiedError.rationale,
      true,
      identifiedError.kind,
    ),
    ...appropriateAlternatives
      .slice(0, count - 1)
      .map((choice, index) =>
        makeChoice(
          profile,
          phase,
          `appropriate-${index + 1}`,
          choice.label,
          choice.rationale,
          false,
          "other-context",
        ),
      ),
  ];
}

export function buildInterventionQuestion(
  profile: OfficialMissionProfile,
  phase: InterventionPhase,
  recommendedAction: string,
): InterventionQuestionDesign {
  const format = chooseFormat(profile, phase);
  const count = answerCount(profile.difficultyStars, profile.order);

  if (format === "sequence") {
    return {
      format,
      question: questionFor(format, phase),
      instruction: "Sélectionne toutes les actions dans l'ordre chronologique, puis valide.",
      requiredSelections: 4,
      successFeedback:
        "L'ordre choisi respecte la hiérarchie : cadrer la décision, préparer, agir sous surveillance puis assurer le relais.",
      priorityReminder: PRIORITY_REMINDERS[phase],
      choices: sequenceChoices(profile, phase),
    };
  }

  if (format === "error-identification") {
    return {
      format,
      question: questionFor(format, phase),
      instruction: "Sélectionne l'unique proposition qui constitue l'erreur demandée.",
      requiredSelections: 1,
      successFeedback:
        "L'erreur a été correctement repérée : une action peut sembler utile tout en étant mal placée dans la chronologie.",
      priorityReminder: PRIORITY_REMINDERS[phase],
      choices: errorIdentificationChoices(profile, phase, count, recommendedAction),
    };
  }

  const correctRationale = `${recommendedAction} répond directement à la priorité de cette phase et reste compatible avec une prise en charge structurée et réévaluée.`;
  const correct = makeChoice(
    profile,
    phase,
    "priority",
    format === "association" ? `Éléments observés → ${recommendedAction}` : recommendedAction,
    correctRationale,
    true,
  );
  const availableDistractors = DISTRACTORS[phase];

  if (format === "multiple") {
    const secondCorrect = makeChoice(
      profile,
      phase,
      "reassessment",
      SECOND_CORRECT[phase],
      "Cette seconde action complète la priorité principale par une réévaluation et une transmission adaptées à l'évolution.",
      true,
    );
    const distractors = availableDistractors
      .slice(0, count - 2)
      .map((draft, index) =>
        makeChoice(
          profile,
          phase,
          `distractor-${draft.kind}-${index + 1}`,
          draft.label,
          draft.rationale,
          false,
          draft.kind,
        ),
      );
    return {
      format,
      question: questionFor(format, phase),
      instruction: "Sélectionne exactement deux réponses, puis valide.",
      requiredSelections: 2,
      successFeedback:
        "Les deux actions retenues associent la priorité immédiate à la réévaluation indispensable de son efficacité.",
      priorityReminder: PRIORITY_REMINDERS[phase],
      choices: [correct, secondCorrect, ...distractors],
    };
  }

  const distractors = availableDistractors
    .slice(0, count - 1)
    .map((draft, index) =>
      makeChoice(
        profile,
        phase,
        `distractor-${draft.kind}-${index + 1}`,
        format === "association" ? `Motif initial seul → ${draft.label}` : draft.label,
        draft.rationale,
        false,
        draft.kind,
      ),
    );

  return {
    format,
    question: questionFor(format, phase),
    instruction: "Sélectionne la réponse la mieux hiérarchisée à ce stade.",
    requiredSelections: 1,
    successFeedback:
      "La réponse choisie respecte la priorité clinique, le bon moment d'action et le cadre opérationnel du DEA.",
    priorityReminder: PRIORITY_REMINDERS[phase],
    choices: [correct, ...distractors],
  };
}
