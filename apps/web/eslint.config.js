import base from "@aivo/eslint-config";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [...base, {
  files: ["**/*.ts", "**/*.tsx"],
  ignores: [".next/**", ".next", "out/", "build/", "**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
  languageOptions: {
    parserOptions: {
      project: "./tsconfig.json",
    },
  },
  plugins: {
    react,
    "react-hooks": reactHooks,
  },
  rules: {
    // React specific
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // TypeScript specific
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],

    // Best practices
    "no-console": "warn",
    "no-debugger": "error",
    eqeqeq: ["error", "always"],
    curly: ["error", "all"],
    "no-var": "error",
    "prefer-const": "error",
  },
}];
