module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'miniflare',
  roots: ['<rootDir>/src', '<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      useESM: true
    }]
  },
  transformIgnorePatterns: [
    'node_modules/'
  ],
  moduleNameMapper: {
    // Map WASM packages to mocks
    '^@aivo/compute$': '<rootDir>/__mocks__/@aivo/compute.js',
    '^@aivo/infographic-generator$': '<rootDir>/__mocks__/@aivo/infographic-generator.js',
    '^@aivo/optimizer$': '<rootDir>/__mocks__/@aivo/optimizer.js',
    // Mock ESM-only node_modules
    '^jose$': '<rootDir>/__mocks__/jose.js',
    // TypeScript packages - map to dist (built output)
    '^@aivo/db$': '<rootDir>/../../packages/db/dist',
    '^@aivo/db/schema$': '<rootDir>/../../packages/db/dist/schema',
    '^@aivo/shared-types$': '<rootDir>/../../packages/shared-types/src',
    '^@aivo/api-client$': '<rootDir>/../../packages/api-client/src',
    '^@aivo/body-compute$': '<rootDir>/../../packages/body-compute/src',
    '^@aivo/email-reporter$': '<rootDir>/../../packages/email-reporter/src',
    '^@aivo/memory-service$': '<rootDir>/../../packages/memory-service/src'
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/mocks/**',
    '!src/types/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },
  // Include all source files in coverage even if no tests directly import them
  coverageProvider: 'v8',
};
