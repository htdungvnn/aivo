/**
 * Jest configuration for AIVO Next.js web application
 */

import base from './base.js';

export default {
  ...base,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts', '@testing-library/jest-dom'],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    ...base.transform,
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {
      babelrc: false,
      configFile: '<rootDir>/babel.config.js',
    }],
  },
};
