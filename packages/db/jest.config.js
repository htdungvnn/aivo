import base from '@aivo/jest-config';

export default {
  ...base,
  testMatch: ['**/__tests__/**/*.test.ts'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 15,
      statements: 15
    }
  },
};
