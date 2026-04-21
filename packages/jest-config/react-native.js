/**
 * Jest configuration for AIVO React Native mobile application
 */

const baseConfig = require('./base');

module.exports = {
  ...baseConfig,
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)'
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^expo$': '<rootDir>/node_modules/expo'
  }
};
