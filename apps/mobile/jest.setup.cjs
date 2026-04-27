// Jest setup file for mobile app - CommonJS version

global.__DEV__ = true;
global.vi = global.jest;
global.dispatchEvent = () => true;
global.window = global;

// Suppress React act() warnings for async state updates
// These warnings appear when state updates happen after async operations
// but are properly handled by waitFor() in our tests
const originalError = console.error;
console.error = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    message.includes('was not wrapped in act(...)')
  ) {
    return; // Suppress act() warnings
  }
  originalError.call(console, ...args);
};

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
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const createAnimatedComponent = (Component) => Component;
  const useSharedValue = (initial) => ({ value: initial });
  const withSpring = (to) => to;
  return {
    __esModule: true,
    default: {
      createAnimatedComponent,
      useSharedValue,
      withSpring,
    },
    createAnimatedComponent,
    useSharedValue,
    withSpring,
  };
});
jest.mock('react-native-svg', () => {
  const React = require('react');
  const Svg = (props) => React.createElement('Svg', props);
  const G = (props) => React.createElement('G', props);
  const Circle = (props) => React.createElement('Circle', props);
  const Path = (props) => React.createElement('Path', props);
  const Defs = (props) => React.createElement('Defs', props);
  const RadialGradient = (props) => React.createElement('RadialGradient', props);
  const Stop = (props) => React.createElement('Stop', props);
  return {
    __esModule: true,
    default: Svg,
    Svg,
    G,
    Circle,
    Path,
    Defs,
    RadialGradient,
    Stop,
  };
});
jest.mock('lucide-react-native');
jest.mock('@react-native-community/datetimepicker');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => () => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
  NetInfo: {
    addEventListener: jest.fn(() => () => {}),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

// Mock expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  clearAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock @aivo packages to avoid import scope issues
jest.mock('@aivo/shared-types', () => ({
  BODY_OUTLINE_FRONT: "M50,50 L100,100",
  POSTURE_ISSUE_LABELS: {
    forward_head: { label: "Forward Head" },
    rounded_shoulders: { label: "Rounded Shoulders" },
    hyperlordosis: { label: "Hyperlordosis" },
    kyphosis: { label: "Kyphosis" },
    pelvic_tilt: { label: "Pelvic Tilt" },
  },
  SEVERITY_STYLES: {
    mild: { bg: "rgba(34, 197, 94, 0.1)", border: "#22c55e", text: "#22c55e" },
    moderate: { bg: "rgba(249, 115, 22, 0.1)", border: "#f97316", text: "#f97316" },
    severe: { bg: "rgba(239, 68, 68, 0.1)", border: "#ef4444", text: "#ef4444" },
  },
  getScoreColor: jest.fn((score) => score >= 60 ? "text-emerald-500" : "text-amber-500"),
  getScoreLabel: jest.fn((score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  }),
}));

jest.mock('@aivo/body-compute', () => ({
  BodyCompute: {
    calculateBMI: jest.fn(),
    getBMICategory: jest.fn(),
    getBodyFatCategory: jest.fn(),
    transformMetricData: jest.fn(),
    calculateHealthScore: jest.fn(),
    aggregateHeatmapPoints: jest.fn(),
    getHeatmapColor: jest.fn(),
    getHeatmapRadius: jest.fn(),
    formatTimestamp: jest.fn(),
    getPostureScoreColor: jest.fn(),
    getPostureScoreLabel: jest.fn(),
    prepareHeatmapForRender: jest.fn(() => [
      { x: 50, y: 42, muscle: 'chest', intensity: 0.7, cx: 100, cy: 168, radius: 10 },
    ]),
  },
  HealthScoreService: {
    calculate: jest.fn(),
    getBMICategory: jest.fn(),
  },
  HeatmapRenderer: {
    color: jest.fn((intensity) => `rgba(255, ${Math.round(intensity * 255)}, 0, ${0.5 + intensity * 0.4})`),
    prepare: jest.fn(() => ({
      points: [
        { x: 50, y: 42, muscle: 'chest', intensity: 0.7, cx: 100, cy: 168, radius: 10 },
      ],
      viewBox: '0 0 200 400',
    })),
  },
  PostureAnalyzer: {
    getScoreColor: jest.fn(),
    getScoreLabel: jest.fn(),
    getScoreGradient: jest.fn(),
  },
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

// Mock AuthContext
const React = require('react');
const { View, Text } = require('react-native');

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@test.com', name: 'Test User' },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }) => children,
}));

// Mock RecoveryScoreGauge
jest.mock('@/components/biometric/RecoveryScoreGauge', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  function RecoveryScoreGauge({ score, size, testID, accessibilityLabel }) {
    const getCategory = (score) => {
      if (score >= 80) return { label: "Excellent", color: '#22c55e' };
      if (score >= 60) return { label: "Good", color: '#007AFF' };
      if (score >= 40) return { label: "Fair", color: '#FF9500' };
      return { label: "Poor", color: '#EF4444' };
    };
    const category = getCategory(score);
    return React.createElement(
      View,
      { testID, accessibilityLabel },
      React.createElement(Text, { testID: 'gauge-score' }, Math.round(score)),
      React.createElement(Text, { testID: 'gauge-label' }, category.label)
    );
  }

  return { RecoveryScoreGauge };
});
