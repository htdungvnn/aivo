import rn from '@aivo/jest-config/react-native.js';

export default {
  ...rn,
  roots: [...rn.roots, '<rootDir>/app'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx']
};
