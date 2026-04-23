module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'miniflare',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      useESM: true
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@hono|hono)/)'
  ],
  moduleNameMapper: {
    // WASM packages - map to pkg directory
    '^@aivo/compute$': '<rootDir>/../../packages/aivo-compute/pkg',
    '^@aivo/infographic-generator$': '<rootDir>/../../packages/infographic-generator/pkg',
    '^@aivo/optimizer$': '<rootDir>/../../packages/optimizer/pkg',
    // TypeScript packages - map to src
    '^@aivo/(.*)$': '<rootDir>/../../packages/$1/src'
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts'
  ]
};
