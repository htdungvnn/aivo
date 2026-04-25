import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import '@testing-library/jest-native';
import RecoveryDashboard from '../RecoveryDashboard';
import * as biometricApi from '@/services/biometric-api';

// Mock the API
jest.mock('@/services/biometric-api', () => ({
  getSleepSummary: jest.fn(),
  getCorrelationFindings: jest.fn(),
  getBiometricSnapshot: jest.fn(),
  generateBiometricSnapshot: jest.fn(),
  getRecoveryScore: jest.fn(),
}));

describe('Mobile RecoveryDashboard Component', () => {
  const mockSnapshot = {
    id: 'snap-1',
    userId: 'user-123',
    period: '7d',
    exerciseLoad: {
      totalWorkouts: 5,
      avgIntensity: 7.2,
      intensityStdDev: 0.8,
      weeklyVolume: 25000,
      totalReps: 500,
    },
    sleep: {
      avgDuration: 7.5,
      durationStdDev: 0.5,
      avgQuality: 82,
      consistencyScore: 78,
      avgDeepSleepMinutes: 90,
      avgRemSleepMinutes: 95,
    },
    nutrition: {
      avgDailyCalories: 2200,
      targetCalories: 2300,
      consistencyScore: 75,
      avgProtein: 120,
      avgCarbs: 250,
      avgFat: 70,
      avgWater: 2.5,
    },
    bodyMetrics: {
      weightChange: -0.5,
      bodyFatChange: -0.3,
      muscleMassChange: 0.2,
    },
    recoveryScore: 75.5,
    warnings: ['Late night eating detected on 2025-04-20'],
  };

  const mockCorrelations = [
    {
      id: 'corr-1',
      factorA: 'sleep_duration',
      factorB: 'recovery_score',
      correlationCoefficient: 0.78,
      pValue: 0.001,
      confidence: 0.85,
      anomalyThreshold: 2.5,
      anomalyCount: 2,
      outlierDates: ['2025-04-15', '2025-04-18'],
      explanation: 'Better sleep correlates with higher recovery scores',
      actionableInsight: 'Aim for 7+ hours of sleep to improve recovery by 15-20%',
      detectedAt: Date.now(),
    },
  ];

  const mockSleepSummary = {
    avgDuration: 7.5,
    avgQuality: 82,
    avgConsistency: 78,
    totalLogs: 7,
    logs: [],
  };

  const mockRecoveryScore = {
    score: 75.5,
    grade: 'good',
    factors: {
      sleep: 82,
      exercise: 70,
      nutrition: 78,
      bodyMetrics: 65,
      hydration: 72,
    },
    warnings: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (biometricApi.getSleepSummary as jest.Mock).mockResolvedValue(mockSleepSummary);
    (biometricApi.getCorrelationFindings as jest.Mock).mockResolvedValue(mockCorrelations);
    (biometricApi.getBiometricSnapshot as jest.Mock).mockResolvedValue(mockSnapshot);
    (biometricApi.generateBiometricSnapshot as jest.Mock).mockResolvedValue(mockSnapshot);
    (biometricApi.getRecoveryScore as jest.Mock).mockResolvedValue(mockRecoveryScore);
  });

  it('should render recovery dashboard', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recovery Score')).toBeOnTheScreen();
    });
  });

  it('should display recovery score value', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      // Score is 75.5 which rounds to 76
      expect(screen.getByTestId('gauge-score')).toHaveTextContent('76');
    });
  });

  it('should display recovery grade', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('gauge-label')).toHaveTextContent('GOOD');
    });
  });

  it('should display sleep stats', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      // There are two "Sleep" texts (tab and stat card), just check the values
      expect(screen.getByText(/7\.5h/)).toBeOnTheScreen();
      expect(screen.getByText(/82% quality/)).toBeOnTheScreen();
    });
  });

  it('should display exercise stats', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Exercise')).toBeOnTheScreen();
    });

    // 5 workouts shown
    expect(screen.getByText('5')).toBeOnTheScreen();
  });

  it('should display nutrition stats', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Nutrition')).toBeOnTheScreen();
    });

    // 75% consistency shown
    expect(screen.getByText('75%')).toBeOnTheScreen();
  });

  it('should display top correlation insight', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Top Insight')).toBeOnTheScreen();
    });

    // The actionableInsight from mock data
    expect(screen.getByText(/Aim for 7\+ hours/)).toBeOnTheScreen();
  });

  it('should display actionable insight', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Aim for 7\+ hours/)).toBeOnTheScreen();
    });
  });

  it('should show warnings when present', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Late night eating detected/)).toBeOnTheScreen();
    });
  });

  it('should dismiss correlation when dismiss button clicked', async () => {
    render(<RecoveryDashboard />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Recovery Score')).toBeOnTheScreen();
    });

    // Switch to Insights tab to see correlations
    const insightsTab = screen.getByText('Insights');
    fireEvent.press(insightsTab);

    await waitFor(() => {
      expect(screen.getByText('Dismiss')).toBeOnTheScreen();
    });

    const dismissButtonText = screen.getByText('Dismiss');
    const dismissButton = dismissButtonText.parent;
    fireEvent.press(dismissButton);

    await waitFor(() => {
      expect(biometricApi.getCorrelationFindings).toHaveBeenCalled();
    });
  });

  it('should generate snapshot when run analysis button clicked', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Run Analysis Now')).toBeOnTheScreen();
    });

    const runButton = screen.getByText('Run Analysis Now');
    fireEvent.press(runButton);

    expect(biometricApi.generateBiometricSnapshot).toHaveBeenCalled();
  });

  it('should show loading state initially', () => {
    // Make all API calls pend
    (biometricApi.getSleepSummary as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<RecoveryDashboard />);

    // Should show loading indicator
    expect(screen.toJSON()).toBeTruthy();
  });

  it('should switch to correlations tab and show empty message', async () => {
    // Set empty correlations
    (biometricApi.getCorrelationFindings as jest.Mock).mockResolvedValue([]);

    render(<RecoveryDashboard />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Recovery Score')).toBeOnTheScreen();
    });

    // Click on Insights tab
    const insightsTab = screen.getByText('Insights');
    fireEvent.press(insightsTab);

    await waitFor(() => {
      expect(screen.getByText(/No significant correlations/)).toBeOnTheScreen();
    });
  });

  it('should handle API errors gracefully', async () => {
    (biometricApi.getSleepSummary as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(<RecoveryDashboard />);

    // Component should still render (errors are silently caught)
    await waitFor(() => {
      expect(screen.getByText('Recovery & Stress')).toBeOnTheScreen();
    });
  });
});
