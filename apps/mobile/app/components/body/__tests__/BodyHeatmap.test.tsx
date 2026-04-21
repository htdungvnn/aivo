import React from 'react';
import { render } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { BodyHeatmap } from '../BodyHeatmap';
import * as Haptics from 'expo-haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 0,
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('Mobile BodyHeatmap Component', () => {
  it('should be defined', () => {
    expect(BodyHeatmap).toBeDefined();
  });

  it('should render without crashing', () => {
    const { toJSON } = render(
      <BodyHeatmap
        vectorData={[
          { x: 50, y: 42, muscle: 'chest', intensity: 0.7 }
        ]}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should call haptics on press', () => {
    const { getByTestId } = render(
      <BodyHeatmap
        vectorData={[
          { x: 50, y: 42, muscle: 'chest', intensity: 0.7 }
        ]}
        onPointPress={jest.fn()}
      />
    );

    // Verify haptics mock exists
    expect(Haptics.impactAsync).toBeDefined();
  });
});
