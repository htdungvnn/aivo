// Jest setup file for mobile app

// Define __DEV__ global used by React Native
global.__DEV__ = true;

// Make jest vi available globally for tests that use vi.mock()
global.vi = global.jest;

// Mock ResizeObserver which is required by Recharts and other chart libraries
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock problematic modules with Flow types or ESM syntax
jest.mock('@react-native/js-polyfills');
jest.mock('react-native-reanimated');
jest.mock('react-native-svg');
// Use manual mock for lucide-react-native from app/__mocks__/
jest.mock('lucide-react-native');
jest.mock('@react-native-community/datetimepicker');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock Expo modules that access native code
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 1, Medium: 2, Heavy: 3 },
  NotificationFeedbackType: { Success: 2, Warning: 1, Error: 0 },
}));
jest.mock('expo-secure-store', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  clearAsync: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
