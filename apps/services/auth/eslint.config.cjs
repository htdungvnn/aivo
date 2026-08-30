/**
 * Basic ESLint config for auth service
 * @type {import("eslint").Linter.Config[]}
 */
module.exports = [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-console": "off",
    },
    ignores: ["dist/**", "node_modules/**", "*.json", "wrangler.jsonc"],
  },
];
