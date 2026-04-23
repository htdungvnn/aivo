import base from '@aivo/jest-config';

export default {
  ...base,
  roots: ['<rootDir>', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts', '@testing-library/jest-dom'],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // Override @aivo mapping to point to the correct location from apps/web
    '^@aivo/(.*)$': '<rootDir>/../../packages/$1/src',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
};
