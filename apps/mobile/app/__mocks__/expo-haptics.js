// Manual mock for expo-haptics
module.exports = {
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 0,
    Medium: 1,
    Heavy: 2,
    Selection: 4,
  },
  Haptics: {
    impactAsync: jest.fn(() => Promise.resolve()),
    notificationAsync: jest.fn(() => Promise.resolve()),
    selectionStartAsync: jest.fn(() => Promise.resolve()),
    selectionEndAsync: jest.fn(() => Promise.resolve()),
  },
};
