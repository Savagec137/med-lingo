import type { InterventionSessionView } from "../v3-domain.ts";
import { getV3Scenario } from "../scenarios/v3-catalog.ts";

/**
 * Écran 1 — « Nouvel appel — Centre 15 ».
 *
 * Ce que la maquette affiche vient entièrement de l'alerte du scénario : motif,
 * priorité, lieu, équipe, contexte, et les trois informations reçues. Rien n'est
 * ajouté ici, et surtout rien du dossier clinique : à ce stade le joueur n'a que
 * ce que le régulateur lui a dit.
 */

export interface NewCallLine {
  /** Libellé de la ligne, tel que la maquette l'écrit. */
  label: string;
  value: string;
  /** Ligne mise en évidence par la maquette — la priorité est en rouge. */
  emphasis: boolean;
}

export interface NewCallAction {
  id: "accept" | "details" | "prepare";
  label: string;
  /** Rôle visuel de la maquette : bouton principal, secondaire, ou lien bas. */
  role: "primary" | "secondary" | "tertiary";
  enabled: boolean;
}

export interface NewCallScreenModel {
  title: string;
  /** Bandeau « Mission prioritaire » de la maquette, absent si priorité normale. */
  priorityBanner: string | null;
  callStatus: string;
  /** Motif d'appel, en gros titre dans la carte. */
  reason: string;
  lines: NewCallLine[];
  /** Puces « INFORMATIONS REÇUES ». */
  received: string[];
  actions: NewCallAction[];
}

/** Priorités que la maquette signale par le bandeau « Mission prioritaire ». */
const URGENT_PRIORITIES = new Set(["élevée", "elevee", "haute", "absolue"]);

const isUrgent = (priority: string) =>
  URGENT_PRIORITIES.has(priority.trim().toLocaleLowerCase("fr"));

/**
 * Découpe la note de dispatch en informations reçues.
 *
 * La maquette en montre trois, courtes. La note du scénario est une phrase
 * continue : elle est scindée sur ses points-virgules et ses virgules fortes, et
 * jamais réécrite — le joueur doit lire ce que le régulateur a dit, pas un
 * résumé.
 */
export function receivedInformation(dispatchNote: string, limit = 3): string[] {
  const withoutPrefix = dispatchNote.replace(/^[^:]{0,40}:\s*/u, "");
  return withoutPrefix
    .split(/\s*[;.]\s*|\s*,\s*(?=[a-zà-ÿ]{4,}\s)/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, limit)
    .map((part) => part.charAt(0).toLocaleUpperCase("fr") + part.slice(1));
}

export function newCallScreenModel(session: InterventionSessionView): NewCallScreenModel {
  const scenario = getV3Scenario(session.scenarioId);
  const alert = scenario.alert;
  const urgent = isUrgent(alert.priority);

  return {
    title: "Nouvel appel — Centre 15",
    priorityBanner: urgent ? "Mission prioritaire" : null,
    callStatus: "Appel en cours",
    reason: alert.reason,
    lines: [
      { label: "Lieu", value: alert.location, emphasis: false },
      { label: "Priorité", value: alert.priority, emphasis: urgent },
      { label: "Équipe engagée", value: "Ambulance + binôme DEA", emphasis: false },
      { label: "Contexte", value: "Appel témoin", emphasis: false },
    ],
    received: receivedInformation(alert.dispatchNote),
    actions: [
      { id: "accept", label: "Accepter la mission", role: "primary", enabled: true },
      { id: "details", label: "Voir les détails", role: "secondary", enabled: true },
      { id: "prepare", label: "Préparer le matériel", role: "tertiary", enabled: true },
    ],
  };
}
