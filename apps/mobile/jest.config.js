export default {
  preset: 'jest-expo',
  roots: ['<rootDir>/app', '<rootDir>'],
  moduleNameMapper: {
    '^@aivo/(.*)$': '<rootDir>/../../packages/$1/src',
    '^@/(.*)$': '<rootDir>/app/$1',
    // Mock problematic RN polyfills with Flow types
    '^@react-native/js-polyfills/(.*)$': '<rootDir>/__mocks__/react-native-js-polyfills.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testTimeout: 30000,
  // Allow transforming node_modules packages that need it, even under pnpm's nested layout
  transformIgnorePatterns: [
    '/node_modules/(?!(.*/)?(react-native|@react-native|@react-native-community|expo|@expo|expo-.*|expo-modules-core|expo-secure-store|react-native-reanimated|lucide-react-native|@unimodules|unimodules|@testing-library/react-native|@testing-library/jest-native|victory-native|native-base|react-native-svg)/)'
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/__tests__/**',
    '!app/**/__tests__/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 13,
      lines: 20,
      statements: 20
    }
  },
  coverageProvider: 'v8',
};
