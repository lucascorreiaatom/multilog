import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Cena three.js (React Three Fiber): mutar objetos do three dentro de useFrame/efeitos é o padrão
    // recomendado (sem re-render por quadro). A regra do React Compiler não se aplica a esses objetos.
    files: ["scene/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // decodificador Draco do three (minificado), servido para os GLBs comprimidos do cenário
    "public/draco/**",
  ]),
]);

export default eslintConfig;
