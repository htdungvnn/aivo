/**
 * Base Jest configuration for AIVO packages
 * Shared configuration with ESM support
 */

export default {
  // Use test environment from individual configs
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      useESM: true,
      isolatedModules: false, // Set isolatedModules in tsconfig instead
    }]
  },
  moduleNameMapper: {
    '^@aivo/(.*)$': '<rootDir>/../$1/src'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
  // Extend Jest's default snapshot serializers if needed
  snapshotSerializers: [],
};
