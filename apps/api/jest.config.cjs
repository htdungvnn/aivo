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
    'node_modules/(?!(jose|@hono|hono|drizzle-orm|@cloudflare|@anthropic-ai|@jest/globals)/)'
  ],
  moduleNameMapper: {
    // Map WASM packages to mocks
    '^@aivo/compute$': '<rootDir>/__mocks__/@aivo/compute.js',
    '^@aivo/infographic-generator$': '<rootDir>/__mocks__/@aivo/infographic-generator.js',
    '^@aivo/optimizer$': '<rootDir>/__mocks__/@aivo/optimizer.js',
    // Mock ESM-only node_modules
    '^jose$': '<rootDir>/__mocks__/jose.js',
    // TypeScript packages - map to src
    '^@aivo/(?!compute|infographic-generator|optimizer)(.*)$': '<rootDir>/../../packages/$1/src'
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts'
  ]
};
