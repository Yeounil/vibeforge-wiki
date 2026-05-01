// ESLint 9 flat config. Lifts next/core-web-vitals via FlatCompat so
// `npm run lint` runs non-interactively (Plan 6 minor #4).
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      ".next/**",
      "content/**",
      "archive/**",
      "public/wiki-data/**",
      "scripts/build-indexes.ts",
    ],
  },
];
