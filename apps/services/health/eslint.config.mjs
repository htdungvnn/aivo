import { config } from "@aivo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  { rules: { "@typescript-eslint/no-unused-vars": "warn" } }
];
