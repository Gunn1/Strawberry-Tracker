import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".open-next/**",
    // wrangler's local build output; linting it drowns real findings.
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma's generated client — not ours to lint.
    "src/generated/**",
  ]),
]);

export default eslintConfig;
