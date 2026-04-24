// Manual mock for react-native-reanimated
module.exports = {
  default: {
    createAnimatedComponent: (Component) => Component,
    View: 'View',
    Text: 'Text',
    Image: 'Image',
    ScrollView: 'ScrollView',
  },
  // Mock worklets
  worklet: (fn) => fn,
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedStyle: (fn) => ({}),
  withSpring: (to) => to,
  withTiming: (to) => to,
  withDecay: (config) => config.velocity || 0,
  withRepeat: (animation) => animation,
  withSequence: (...animations) => animations[0],
  cancelAnimation: () => {},
  // Mock Easing
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    in: (easing) => easing,
    out: (easing) => easing,
    inOut: (easing) => easing,
  },
  // Mock NativeReanimatedModule
  NativeReanimatedModule: {
    get: () => ({}),
    install: () => {},
    // Add other methods as needed
  },
  // Mock ReanimatedModule
  ReanimatedModule: {
    get: () => ({}),
    install: () => {},
  },
  // Mock getUIManager
  getUIManager: () => null,
};
