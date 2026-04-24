// Mock for @react-native/js-polyfills
// These files contain Flow types that cause parsing errors in Jest
// Provide minimal stubs for the polyfills that RN's jest/setup.js requires
module.exports = {
  // error-guard exports
  ErrorHandler: function ErrorHandler() {},
  // Add any other exports that might be required
  initialize: () => {},
  // Default export
  default: {},
};
