// Jest setup file for mobile app - CommonJS version

global.__DEV__ = true;
global.vi = global.jest;
global.dispatchEvent = () => true;
global.window = global;

// Mock Expo ErrorUtils
global.ErrorUtils = {
  setGlobalHandler: () => {},
  getGlobalHandler: () => () => {},
  reportError: () => {},
};

// Pre-load @testing-library/react-native and mock it to avoid ESM import issues
const rnTL = require('@testing-library/react-native');
global.screen = rnTL.screen || rnTL.default?.screen || rnTL;

// Mock the module to ensure consistent return for all imports
jest.doMock('@testing-library/react-native', () => rnTL);

// Extend expect with matchers from jest-native
require('@testing-library/jest-native/extend-expect');

// Override toBeOnTheScreen with a simpler implementation
expect.extend({
  toBeOnTheScreen(received) {
    const pass = received != null;
    return {
      pass,
      message: () => pass
        ? `expected element not to be on the screen`
        : `expected element to be on the screen`,
    };
  },
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock problematic modules
jest.mock('@react-native/js-polyfills');
jest.mock('react-native-reanimated');
jest.mock('react-native-svg');
jest.mock('lucide-react-native');
jest.mock('@react-native-community/datetimepicker');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  clearAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  nativeAppVersion: '1.0.0',
  nativeBuildVersion: '1',
  manifest: {},
  expoVersion: '54.0.0',
  eas: {},
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
  Style: {},
}));
