import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/intervention` mène au simulateur.
 *
 * Cette adresse ouvrait l'ancien mode à questions. Elle est conservée plutôt que
 * supprimée : elle est en circulation — liens partagés, historique de
 * navigation, habitude — et la faire disparaître afficherait une page
 * introuvable là où l'on attend une intervention.
 *
 * L'écran historique n'est pas perdu : il vit dans
 * `components/InterventionLegacyScreen.tsx`, hors circuit. Le remettre en
 * service tient en une ligne, et c'est une décision de contenu — quinze
 * missions rédigées — pas une décision technique.
 */
export const Route = createFileRoute("/intervention")({
  beforeLoad: () => {
    throw redirect({ to: "/intervention-v3", search: {} });
  },
});
