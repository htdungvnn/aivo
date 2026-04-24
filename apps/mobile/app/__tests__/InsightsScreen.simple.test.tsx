import React from 'react';
import { render } from '@testing-library/react-native';

// Mock all other dependencies
jest.mock('@/components/biometric/RecoveryDashboard', () => () => null);
jest.mock('@/components/biometric/RecoveryScoreGauge', () => () => null);
jest.mock('@/components/body/BodyMetricChart', () => ({
  BodyMetricChart: () => null,
  HealthScoreGauge: () => null,
  MuscleBalanceChart: () => null,
}));
jest.mock('@/components/body/PostureAnalysisCard', () => () => null);
jest.mock('@/components/body/BodyInsightCard', () => () => null);
jest.mock('@/screens/DigitalTwinScreen', () => () => null);
jest.mock('@/screens/AvatarViewer2D', () => () => null);
jest.mock('@/screens/TimeSlider', () => () => null);
jest.mock('@/screens/AdherenceAdjuster', () => () => null);
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Import after mocks
import { MetricsProvider } from '../contexts/MetricsContext';
import InsightsScreen from '../(tabs)/insights';

describe('InsightsScreen Simple', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <MetricsProvider>
        <InsightsScreen />
      </MetricsProvider>
    );
    expect(toJSON()).toBeTruthy();
  });
});
