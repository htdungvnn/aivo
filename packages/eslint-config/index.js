import typescriptEslint from "typescript-eslint";

export default [
  ...typescriptEslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "error",
      "no-console": "warn",
      "no-debugger": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-var": "error",
      "prefer-const": "error",
    },
    ignores: ["node_modules/", "dist/", "pkg/", "target/", "build/"],
  },
];
