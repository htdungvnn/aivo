import base from '@aivo/jest-config';

export default {
  ...base,
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/validation.ts',
    // Add other files with runtime logic here
  ],
};
