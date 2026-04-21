import base from "./index.js";

export default [
  ...base,
  {
    files: ["**/*.js", "**/*.ts"],
    rules: {
      // Lint the config files themselves
      "no-unused-vars": "error",
      "no-undef": "error",
    },
  },
];
