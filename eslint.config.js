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
              group: ["**/intervention-vitals*", "**/facts/reveal-fact*"],
              message:
                "Un composant lit les faits via readFact, jamais les constantes du moteur clinique.",
            },
            {
              group: ["**/intervention-v3/engine/*", "**/intervention-v3/v3-session*"],
              message: "Un composant passe par le hook use-intervention-v3, jamais par le moteur.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
