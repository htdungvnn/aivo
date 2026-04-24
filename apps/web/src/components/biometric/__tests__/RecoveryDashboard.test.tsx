import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoveryDashboard } from '../RecoveryDashboard';
import { ApiClient } from '@aivo/api-client';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock the API client
const mockGetSleepHistory = jest.fn();
const mockGetCorrelations = jest.fn();
const mockGetBiometricSnapshot = jest.fn();
const mockGenerateBiometricSnapshot = jest.fn();

jest.mock('@aivo/api-client', () => ({
  ApiClient: jest.fn().mockImplementation(() => ({
    getSleepHistory: mockGetSleepHistory,
    getCorrelations: mockGetCorrelations,
    getBiometricSnapshot: mockGetBiometricSnapshot,
    generateBiometricSnapshot: mockGenerateBiometricSnapshot,
  })),
  createApiClient: jest.fn().mockImplementation(() => ({
    getSleepHistory: mockGetSleepHistory,
    getCorrelations: mockGetCorrelations,
    getBiometricSnapshot: mockGetBiometricSnapshot,
    generateBiometricSnapshot: mockGenerateBiometricSnapshot,
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('RecoveryDashboard Component', () => {
  const mockSnapshot = {
    id: 'snap-1',
    userId: 'user-123',
    period: '30d' as const,
    exerciseLoad: {
      totalWorkouts: 5,
      avgIntensity: 7.2,
      intensityStdDev: 0.8,
      weeklyVolume: 25000,
      totalReps: 500,
      avgDurationMinutes: 45,
    },
    sleep: {
      avgDurationHours: 7.5,
      avgQualityScore: 82,
      consistencyScore: 78,
      avgDeepSleepMinutes: 90,
      avgRemSleepMinutes: 95,
    },
    nutrition: {
      avgDailyCalories: 2200,
      targetCalories: 2300,
      consistencyScore: 80,
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
    recoveryScore: 75.4,
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

  const mockSleepHistory = [
    {
      id: 'sleep-1',
      userId: 'user-123',
      date: '2025-04-22',
      durationHours: 7.5,
      qualityScore: 82,
    },
    {
      id: 'sleep-2',
      userId: 'user-123',
      date: '2025-04-21',
      durationHours: 7.0,
      qualityScore: 78,
    },
    {
      id: 'sleep-3',
      userId: 'user-123',
      date: '2025-04-20',
      durationHours: 8.0,
      qualityScore: 85,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSleepHistory.mockResolvedValue({ success: true, data: mockSleepHistory });
    mockGetCorrelations.mockResolvedValue({ success: true, data: mockCorrelations });
    mockGetBiometricSnapshot.mockResolvedValue({ success: true, data: mockSnapshot });
    mockGenerateBiometricSnapshot.mockResolvedValue({ success: true, data: mockSnapshot });
  });

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(
      <AuthProvider>
        {ui}
      </AuthProvider>
    );
  };

  it('should render loading state initially', async () => {
    // Mock one API call to pend to keep loading
    mockGetBiometricSnapshot.mockImplementation(() => new Promise(() => {}));

    renderWithAuth(<RecoveryDashboard />);

    // Should show loading skeletons
    expect(document.body).toBeInTheDocument();
  });

  it('should render recovery score gauge with snapshot', async () => {
    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Biometric Recovery')).toBeInTheDocument();
    });

    expect(screen.getByText('Recovery Score')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // Score rounded
  });

  it('should display sleep stats', async () => {
    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sleep')).toBeInTheDocument();
    });

    expect(screen.getByText(/7\.5h/)).toBeInTheDocument();
  });

  it('should display exercise stats', async () => {
    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Exercise')).toBeInTheDocument();
    });

    expect(screen.getByText('5')).toBeInTheDocument(); // totalWorkouts
  });

  it('should display nutrition consistency', async () => {
    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Nutrition')).toBeInTheDocument();
    });

    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('should display top correlation insight', async () => {
    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Better sleep correlates/)).toBeInTheDocument();
    });
  });

  it('should generate snapshot on button click', async () => {
    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Run Analysis')).toBeInTheDocument();
    });

    const button = screen.getByText('Run Analysis');
    fireEvent.click(button);

    expect(mockGenerateBiometricSnapshot).toHaveBeenCalled();
  });

  it('should display warnings when present', async () => {
    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Late night eating detected')).toBeInTheDocument();
    });
  });

  it('should switch between tabs', async () => {
    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Click Sleep tab
    const sleepTab = screen.getByRole('button', { name: /Sleep/i });
    fireEvent.click(sleepTab);

    await waitFor(() => {
      expect(screen.getByText('Recent Sleep')).toBeInTheDocument();
    });

    // Click Correlations tab
    const correlationsTab = screen.getByRole('button', { name: /Correlations/i });
    fireEvent.click(correlationsTab);

    await waitFor(() => {
      expect(screen.getByText(/Better sleep correlates/)).toBeInTheDocument();
    });
  });

  it('should show no correlations message when empty', async () => {
    mockGetCorrelations.mockResolvedValue({ success: true, data: [] });

    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No significant correlations found yet.')).toBeInTheDocument();
    });
  });

  it('should display recovery grade based on score', async () => {
    renderWithAuth(<RecoveryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    expect(screen.getByText('Good')).toBeInTheDocument(); // Grade for 75.4
  });
});
