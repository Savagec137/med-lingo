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
              // `action-gate` est volontairement absent de la liste : c'est le
              // seul module du moteur qu'un écran peut interroger, et il est
              // sans effet. Tout le reste est nommé explicitement plutôt
              // qu'exclu par négation — une négation au milieu d'un groupe
              // annule le groupe entier sans le signaler. Et `**/engine` seul
              // est absent aussi : en sémantique gitignore il couvre tout le
              // dossier, `action-gate` compris.
              group: [
                "**/engine/index*",
                "**/engine/apply-action*",
                "**/engine/v3-*",
                "**/v3-session*",
              ],
              message:
                "Un présentateur décrit un écran : il interroge action-gate, il n'exécute pas le moteur.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
