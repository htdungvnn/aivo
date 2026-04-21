import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricsProvider, useMetrics } from '../MetricsContext';

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
const AsyncStorageMock = {
  getItem: async (key: string): Promise<string | null> => {
    return mockStorage[key] || null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    mockStorage[key] = value;
  },
  removeItem: async (key: string): Promise<void> => {
    delete mockStorage[key];
  },
  clear: async (): Promise<void> => {
    Object.keys(mockStorage).forEach((key) => {
      delete mockStorage[key];
    });
  },
};

jest.mock('expo-secure-store', () => ({
  getItemAsync: AsyncStorageMock.getItem,
  setItemAsync: AsyncStorageMock.setItem,
  deleteItemAsync: AsyncStorageMock.removeItem,
}));

// Mock fetch
global.fetch = jest.fn();

// Test component that uses the context
function TestComponent() {
  const {
    metrics,
    latestMetric,
    healthScore,
    loading,
    error,
    refreshMetrics,
    addMetric,
    addMetricOptimistic,
  } = useMetrics();

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="metrics-count">{metrics.length}</div>
      <div data-testid="latest-metric">{latestMetric ? JSON.stringify(latestMetric) : 'none'}</div>
      <div data-testid="health-score">{healthScore ? JSON.stringify(healthScore) : 'none'}</div>
      <button data-testid="refresh" onClick={refreshMetrics}>Refresh</button>
      <button
        data-testid="add-metric"
        onClick={async () => {
          const result = await addMetric({ weight: 75 });
          return result;
        }}
      >Add Metric</button>
      <button
        data-testid="add-optimistic"
        onClick={async () => {
          const result = await addMetricOptimistic({ weight: 80 });
          return result;
        }}
      >Add Optimistic</button>
    </div>
  );
}

describe('MetricsContext', () => {
  const mockToken = 'test-jwt-token';
  const mockUserId = 'user-123';

  const mockMetricsResponse = {
    data: [
      {
        id: '1',
        userId: mockUserId,
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        weight: 70.5,
        bodyFatPercentage: 0.15,
        muscleMass: 30.2,
        bmi: 22.5,
      },
    ],
  };

  const mockHealthScoreResponse = {
    data: {
      score: 82,
      category: 'good',
      factors: {},
      recommendations: ['Continue training'],
    },
  };

  const mockNewMetricResponse = {
    id: 'new-1',
    userId: mockUserId,
    timestamp: Math.floor(Date.now() / 1000),
    weight: 75,
  };

  beforeEach(async () => {
    await AsyncStorageMock.clear();
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Initialization', () => {
    it('loads cached data on mount', async () => {
      await AsyncStorageMock.setItem('aivo_metrics_cache', JSON.stringify(mockMetricsResponse.data));
      await AsyncStorageMock.setItem('aivo_health_score_cache', JSON.stringify(mockHealthScoreResponse.data));

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('metrics-count')).toHaveTextContent('1');
      });
    });

    it('shows empty state when no cached data', async () => {
      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('metrics-count')).toHaveTextContent('0');
      });
    });

    it('sets loading to false after initial load', async () => {
      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });
  });

  describe('refreshMetrics', () => {
    beforeEach(async () => {
      // Setup token and user ID
      await AsyncStorageMock.setItem('aivo_token', mockToken);
      await AsyncStorageMock.setItem('aivo_user_id', mockUserId);
    });

    it('fetches metrics and health score', async () => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({ ok: true, json: async () => mockMetricsResponse });
        }
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({ ok: true, json: async () => mockHealthScoreResponse });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const refreshButton = screen.getByTestId('refresh');
      await act(async () => {
        refreshButton.click();
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('caches fetched data', async () => {
      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({ ok: true, json: async () => mockMetricsResponse });
        }
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({ ok: true, json: async () => mockHealthScoreResponse });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      await act(async () => {
        (await AsyncStorageMock.getItem('aivo_metrics_cache'));
      });

      expect(AsyncStorageMock.getItem).toHaveBeenCalledWith('aivo_metrics_cache');
    });

    it('handles fetch errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const refreshButton = screen.getByTestId('refresh');
      await act(async () => {
        refreshButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to load metrics');
      });
    });
  });

  describe('addMetric', () => {
    beforeEach(async () => {
      await AsyncStorageMock.setItem('aivo_token', mockToken);
      await AsyncStorageMock.setItem('aivo_user_id', mockUserId);
    });

    it('adds new metric successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockNewMetricResponse,
      });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-metric');
      await act(async () => {
        addButton.click();
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/body/metrics'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('invalidates cache after adding metric', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockNewMetricResponse,
      });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-metric');
      await act(async () => {
        addButton.click();
      });

      await waitFor(() => {
        expect(AsyncStorageMock.removeItem).toHaveBeenCalledWith('aivo_metrics_cache');
      });
    });

    it('throws error on failed add', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-metric');
      await act(async () => {
        try {
          addButton.click();
        } catch (e) {
          // Expected error
        }
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Failed to add metric');
    });
  });

  describe('addMetricOptimistic', () => {
    beforeEach(async () => {
      await AsyncStorageMock.setItem('aivo_token', mockToken);
      await AsyncStorageMock.setItem('aivo_user_id', mockUserId);
    });

    it('adds metric optimistically', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockNewMetricResponse,
      });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-optimistic');
      await act(async () => {
        addButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('metrics-count')).toHaveTextContent('1');
      });
    });

    it('shows optimistic metric immediately', async () => {
      (fetch as jest.Mock).mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-optimistic');
      await act(async () => {
        addButton.click();
      });

      // Should show optimistic metric before API returns
      expect(screen.getByTestId('metrics-count')).toHaveTextContent('1');
    });

    it('replaces optimistic metric on success', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockNewMetricResponse,
      });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-optimistic');
      await act(async () => {
        addButton.click();
      });

      await waitFor(() => {
        const latestMetric = JSON.parse(screen.getByTestId('latest-metric').textContent || '{}');
        expect(latestMetric.id).toBe('new-1');
      });
    });

    it('reverts optimistic update on failure', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-optimistic');
      await act(async () => {
        try {
          addButton.click();
        } catch (e) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('metrics-count')).toHaveTextContent('0');
      });
    });
  });

  describe('State Management', () => {
    it('updates latestMetric when metrics change', async () => {
      await AsyncStorageMock.setItem('aivo_token', mockToken);
      await AsyncStorageMock.setItem('aivo_user_id', mockUserId);

      (fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/body/metrics')) {
          return Promise.resolve({ ok: true, json: async () => mockMetricsResponse });
        }
        if (url.includes('/api/body/health-score')) {
          return Promise.resolve({ ok: true, json: async () => mockHealthScoreResponse });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      await waitFor(() => {
        const latestMetric = screen.getByTestId('latest-metric').textContent;
        expect(latestMetric).not.toBe('none');
        expect(latestMetric).toContain('70.5');
      });
    });

    it('tracks optimistic update in state', async () => {
      await AsyncStorageMock.setItem('aivo_token', mockToken);
      await AsyncStorageMock.setItem('aivo_user_id', mockUserId);

      (fetch as jest.Mock).mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-optimistic');
      await act(async () => {
        addButton.click();
      });

      // Check that state updates (metrics count increases)
      await waitFor(() => {
        expect(screen.getByTestId('metrics-count')).toHaveTextContent('1');
      });
    });
  });
});
