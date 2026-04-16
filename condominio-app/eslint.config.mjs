import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Permitir 'any' - necesario para interoperar con Supabase dinámico
      "@typescript-eslint/no-explicit-any": "off",
      // Advertir en lugar de error por variables no usadas
      "@typescript-eslint/no-unused-vars": "warn",
      "no-unused-vars": "warn",
      // No forzar deps en hooks - el proyecto las maneja manualmente
      "react-hooks/exhaustive-deps": "warn",
      // Permitir setState en effects (patrón común en Next.js)
      "react-hooks/set-state-in-effect": "off",
      // Desactivar expresiones no usadas como error
      "@typescript-eslint/no-unused-expressions": "warn",
      // prefer-const como advertencia
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
