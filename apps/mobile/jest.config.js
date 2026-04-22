import rn from '@aivo/jest-config/react-native';

export default {
  ...rn,
  roots: ['<rootDir>/app'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: [
    // Allow transforming React Native and related packages even if nested under .pnpm
    'node_modules/(?!.*(?:react-native|@react-native|expo|@expo|@react-native-community|@react-navigation|native-base|react-native-svg|@shopify|react-native-reanimated|lucide-react-native|victory-native|@testing-library/react-native|@testing-library/jest-native)/)'
  ]
};
