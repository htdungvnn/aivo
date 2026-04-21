import base from "@aivo/eslint-config";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactNative from "eslint-plugin-react-native";

export default [...base, {
  files: ["**/*.ts", "**/*.tsx"],
  ignores: [".expo/"],
  languageOptions: {
    parserOptions: {
      project: "./tsconfig.json",
    },
  },
  plugins: {
    react,
    "react-hooks": reactHooks,
    "react-native": reactNative,
  },
  rules: {
    // React Native specific
    "react/prop-types": "off",
    "react-native/no-unused-styles": "warn",
    "react-native/no-inline-styles": "warn",
    "react-native/no-color-literals": "warn",

    // React Hooks
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // TypeScript specific
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-misused-promises": "error",

    // Best practices
    "no-console": "warn",
    "no-debugger": "error",
    eqeqeq: ["error", "always"],
    curly: ["error", "all"],
    "no-var": "error",
    "prefer-const": "error",
  },
}];
