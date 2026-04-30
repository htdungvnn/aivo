/** @type {import('jest').Config} */
const config = {
  projects: [
    // Unit tests for API service layer
    {
      displayName: "api-unit",
      preset: "ts-jest",
      testEnvironment: "node",
      roots: ["<rootDir>/apps/api"],
      testMatch: ["**/__tests__/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/apps/api/jest.setup.ts"],
      moduleNameMapper: {
        "^@aivo/db$": "<rootDir>/packages/db/src/index.ts",
        "^@aivo/db/schema$": "<rootDir>/packages/db/src/schema.ts",
        "^@aivo/shared-types$": "<rootDir>/packages/shared-types/src/index.ts",
        "^@aivo/shared-types/(.*)$": "<rootDir>/packages/shared-types/src/$1.ts",
        "^@aivo/api-client$": "<rootDir>/packages/api-client/src/index.ts",
        "^@aivo/compute/aivo_compute_bg.js$": "<rootDir>/apps/api/__mocks__/@aivo/compute/index.js",
        "^@aivo/compute$": "<rootDir>/packages/compute/pkg",
      },
      collectCoverageFrom: [
        "apps/api/src/services/**/*.ts",
        "apps/api/src/utils/**/*.ts",
        "!apps/api/src/**/*.d.ts",
      ],
      coverageDirectory: "coverage/api-unit",
      coverageReporters: ["json", "lcov", "text", "clover"],
    },
    // Integration tests for API routes
    {
      displayName: "api-integration",
      preset: "ts-jest",
      testEnvironment: "node",
      roots: ["<rootDir>/apps/api"],
      testMatch: ["**/tests/integration/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/apps/api/tests/setup-db.ts"],
      moduleNameMapper: {
        "^@aivo/db$": "<rootDir>/packages/db/src/index.ts",
        "^@aivo/db/schema$": "<rootDir>/packages/db/src/schema.ts",
        "^@aivo/shared-types$": "<rootDir>/packages/shared-types/src/index.ts",
        "^@aivo/shared-types/(.*)$": "<rootDir>/packages/shared-types/src/$1.ts",
        "^@aivo/api-client$": "<rootDir>/packages/api-client/src/index.ts",
        "^@aivo/compute/aivo_compute_bg.js$": "<rootDir>/apps/api/__mocks__/@aivo/compute/index.js",
        "^@aivo/compute$": "<rootDir>/packages/compute/pkg",
      },
      collectCoverageFrom: [
        "apps/api/src/routes/**/*.ts",
        "apps/api/src/middleware/**/*.ts",
        "!apps/api/src/**/*.d.ts",
      ],
      coverageDirectory: "coverage/api-integration",
      coverageReporters: ["json", "lcov", "text"],
      testTimeout: 30000, // 30s for integration tests
    },
    // Compute tests are run via cargo test, not Jest
    // {
    //   displayName: "compute-unit",
    //   preset: "ts-jest",
    //   testEnvironment: "node",
    //   roots: ["<rootDir>/packages/compute"],
    //   testMatch: ["**/tests/**/*.test.ts"],
    //   moduleNameMapper: {
    //     "^@aivo/compute$": "<rootDir>/packages/compute/pkg",
    //     "^@aivo/compute/aivo_compute_bg.js$": "<rootDir>/__mocks__/@aivo/compute/index.js",
    //   },
    //   collectCoverageFrom: [
    //     "packages/compute/src/**/*.rs",
    //   ],
    //   coverageDirectory: "coverage/compute",
    //   coverageReporters: ["json", "lcov", "text"],
    // },
  ],
  // Global coverage settings
  coverageThreshold: {
    global: {
      branches: 30, // Ratchet strategy: start at 30%, increase 5% per sprint
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  // New files must meet higher standard
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/",
  ],
};

module.exports = config;
