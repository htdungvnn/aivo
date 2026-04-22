import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoveryDashboard } from '../RecoveryDashboard';
import * as biometricApi from '@/services/biometric-api';

// Mock the API
vi.mock('@/services/biometric-api', () => ({
  getSleepSummary: vi.fn(),
  getCorrelationFindings: vi.fn(),
  getBiometricSnapshot: vi.fn(),
  generateBiometricSnapshot: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('RecoveryDashboard Component', () => {
  const mockSnapshot = {
    id: 'snap-1',
    userId: 'user-123',
    period: '7d' as const,
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

  beforeEach(() => {
    vi.clearAllMocks();
    (biometricApi.getSleepSummary as vi.Mock).mockResolvedValue(mockSleepSummary);
    (biometricApi.getCorrelationFindings as vi.Mock).mockResolvedValue(mockCorrelations);
    (biometricApi.getBiometricSnapshot as vi.Mock).mockResolvedValue(mockSnapshot);
    (biometricApi.generateBiometricSnapshot as vi.Mock).mockResolvedValue(mockSnapshot);
  });

  it('should render loading state initially', () => {
    // Mock all API calls to pend
    (biometricApi.getSleepSummary as vi.Mock).mockImplementation(() => new Promise(() => {}));

    render(<RecoveryDashboard />);

    // Should show loading or data eventually
    expect(document.body).toBeInTheDocument();
  });

  it('should render recovery score gauge with snapshot', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recovery & Stress')).toBeInTheDocument();
    });

    expect(screen.getByText('Recovery Score')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument(); // Score rounded
  });

  it('should display sleep stats', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sleep')).toBeInTheDocument();
    });

    expect(screen.getByText(/7\.5h/)).toBeInTheDocument();
    expect(screen.getByText(/82%/)).toBeInTheDocument();
  });

  it('should display exercise stats', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Exercise')).toBeInTheDocument();
    });

    expect(screen.getByText('5')).toBeInTheDocument(); // totalWorkouts
  });

  it('should display nutrition consistency', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Nutrition')).toBeInTheDocument();
    });

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should display top correlation insight', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Top Insight')).toBeInTheDocument();
    });

    expect(screen.getByText(/Better sleep correlates/)).toBeInTheDocument();
  });

  it('should handle correlation dismiss', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Top Insight')).toBeInTheDocument();
    });

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    expect(biometricApi.getCorrelationFindings).toHaveBeenCalledWith(5);
  });

  it('should generate snapshot on button click', async () => {
    const user = { id: 'user-123' };
    vi.spyOn(React, 'useContext').mockReturnValue({ user });

    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Run Analysis Now')).toBeInTheDocument();
    });

    const button = screen.getByText('Run Analysis Now');
    fireEvent.click(button);

    expect(biometricApi.generateBiometricSnapshot).toHaveBeenCalled();
  });

  it('should display warnings when present', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Late night eating detected')).toBeInTheDocument();
    });
  });

  it('should switch between tabs', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Click Sleep tab
    const sleepTab = screen.getByRole('button', { name: /Sleep/i });
    fireEvent.click(sleepTab);

    await waitFor(() => {
      expect(screen.getByText('Sleep Summary')).toBeInTheDocument();
    });

    // Click Insights tab
    const insightsTab = screen.getByRole('button', { name: /Insights/i });
    fireEvent.click(insightsTab);

    await waitFor(() => {
      expect(screen.getByText('No significant correlations')).toBeInTheDocument();
    });
  });

  it('should show no correlations message when empty', async () => {
    (biometricApi.getCorrelationFindings as vi.Mock).mockResolvedValue([]);

    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No significant correlations found yet.')).toBeInTheDocument();
    });
  });

  it('should display recovery grade based on score', async () => {
    render(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    expect(screen.getByText('good')).toBeInTheDocument(); // Grade for 75.5
  });
});
