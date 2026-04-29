import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

// Mock external dependencies
jest.mock('@aivo/shared-types', () => ({
  BODY_OUTLINE_FRONT: "M50,50 L100,100", // Simple mock path
  HeatmapRenderer: {
    prepare: jest.fn(() => ({
      points: [
        { x: 50, y: 42, muscle: 'chest', intensity: 0.7, cx: 50, cy: 42, radius: 10 },
      ],
    })),
    color: jest.fn((intensity: number) => `rgba(255, ${Math.round(intensity * 255)}, 0, ${0.5 + intensity * 0.4})`),
  },
}));

import { BodyHeatmap } from '../BodyHeatmap';

describe('Mobile BodyHeatmap Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(BodyHeatmap).toBeDefined();
  });

  it('should render without crashing', () => {
    render(
      <BodyHeatmap
        vectorData={[
          { x: 50, y: 42, muscle: 'chest', intensity: 0.7 }
        ]}
      />
    );
    expect(screen.getByTestId('body-heatmap')).toBeOnTheScreen();
  });

  it('should have test ID', () => {
    render(
      <BodyHeatmap
        vectorData={[
          { x: 50, y: 42, muscle: 'chest', intensity: 0.7 }
        ]}
      />
    );
    const heatmap = screen.getByTestId('body-heatmap');
    expect(heatmap).toBeTruthy();
  });
});
