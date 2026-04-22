/**
 * Jest configuration for AIVO React Native mobile application
 */

import base from './base.js';

export default {
  ...base,
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)'
  ],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '^expo$': '<rootDir>/node_modules/expo'
  }
};
