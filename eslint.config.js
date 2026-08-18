import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Deuxième barrière du Mode Intervention V3 contre les fuites de constantes.
    // La règle centrale — aucune donnée clinique affichée sans une action qui la
    // révèle — ne tient que si les composants n'ont aucun moyen d'atteindre les
    // constantes réelles. Ils lisent `readFact`, qui répond soit une valeur
    // relevée, soit une absence nommée.
    files: ["src/components/intervention-v3/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Les motifs portent sur la chaîne écrite dans l'import, pas sur
              // le chemin résolu : un `../clinical/intervention-vitals.ts` doit
              // donc être décrit tel qu'il s'écrit. Un motif ancré sur
              // `**/intervention-v3/...` ne rattrapait aucun import relatif, et
              // laissait donc passer précisément ce qu'il devait interdire.
              group: ["**/intervention-vitals*", "**/reveal-fact*"],
              message:
                "Un composant lit les faits via readFact, jamais les constantes du moteur clinique.",
            },
            {
              group: [
                "**/engine",
                "**/engine/index*",
                "**/engine/apply-action*",
                "**/engine/v3-*",
                "**/v3-session*",
              ],
              message: "Un composant passe par le hook use-intervention-v3, jamais par le moteur.",
            },
            {
              // Le moteur physiologique connaît toutes les constantes à tout
              // instant. Un composant qui l'importerait pourrait échantillonner
              // une saturation que personne n'a mesurée. Seul
              // `physiology-types` reste ouvert : il ne porte que des contrats,
              // et un composant doit pouvoir nommer ce qu'il reçoit.
              group: [
                "**/physiology/physiology-engine*",
                "**/physiology/physiology-selectors*",
                "**/physiology/clinical-profiles*",
                "**/physiology/vital-trends*",
                "**/physiology/vital-noise*",
                "**/physiology/equipment-monitoring*",
              ],
              message:
                "Un composant reçoit l'instantané de surveillance du hook, il n'interroge pas le moteur physiologique.",
            },
          ],
        },
      ],
    },
  },
  {
    // Même barrière pour la couche présentation. Les modules de `ui/` sont des
    // fonctions pures qui décrivent un écran : ils lisent les faits par
    // `readFact` et demandent à `action-gate` quels gestes sont refusés. Rien
    // d'autre du moteur ne leur est accessible — en particulier pas
    // `applyAction`, qui modifie la session, ni `reveal-fact`, qui révélerait
    // une constante sans que le joueur ait agi.
    files: ["src/features/intervention-v3/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/intervention-vitals*", "**/reveal-fact*"],
              message:
                "Un écran lit les faits via readFact, jamais les constantes du moteur clinique.",
            },
            {
              // Deux modules du moteur sont volontairement absents de la liste :
              // `action-gate` et `queries`. Tous deux sont **sans effet** —
              // aucune de leurs fonctions ne rend une session modifiée — et ce
              // sont les seuls qu'un écran peut interroger. Tout le reste est
              // nommé explicitement plutôt qu'exclu par négation : une négation
              // au milieu d'un groupe annule le groupe entier sans le signaler.
              // Et `**/engine` seul est absent aussi, car en sémantique
              // gitignore il couvre tout le dossier, exceptions comprises.
              group: [
                "**/engine/index*",
                "**/engine/apply-action*",
                "**/engine/v3-*",
                "**/v3-session*",
              ],
              message:
                "Un présentateur décrit un écran : il interroge action-gate, il n'exécute pas le moteur.",
            },
            {
              // Même raison pour la couche présentation : le modèle d'écran
              // reçoit l'instantané en argument, il ne va pas le chercher.
              group: [
                "**/physiology/physiology-engine*",
                "**/physiology/physiology-selectors*",
                "**/physiology/clinical-profiles*",
                "**/physiology/vital-trends*",
                "**/physiology/vital-noise*",
                "**/physiology/equipment-monitoring*",
              ],
              message:
                "Un présentateur reçoit l'instantané de surveillance en argument, il n'interroge pas le moteur physiologique.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
