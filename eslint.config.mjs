import nextTypescript from "eslint-config-next/typescript";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default [...nextTypescript, ...nextCoreWebVitals, {
  ignores: [
    ".next/**",
    "content/**",
    "archive/**",
    "public/wiki-data/**",
    "scripts/build-indexes.ts",
  ],
}];
