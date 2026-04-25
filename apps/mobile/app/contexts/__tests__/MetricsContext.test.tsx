// Mocks must be hoisted before imports
jest.mock('@aivo/api-client', () => {
  const mocks = {
    getBodyMetrics: jest.fn(),
    getHealthScore: jest.fn(),
    createBodyMetric: jest.fn(),
  };
  return {
    createApiClient: jest.fn(() => mocks),
    ...mocks,
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  clearAsync: jest.fn(),
}));

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react-native';
import '@testing-library/jest-native';
import { MetricsProvider, useMetrics } from '../MetricsContext';
import * as SecureStore from 'expo-secure-store';
import { View, Text, TouchableOpacity } from 'react-native';
import * as apiClient from '@aivo/api-client';

console.log('Mocked apiClient:', Object.keys(apiClient));

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
    <View>
      <Text testID="loading">{loading.toString()}</Text>
      <Text testID="error">{error || 'no-error'}</Text>
      <Text testID="metrics-count">{metrics.length}</Text>
      <Text testID="latest-metric">{latestMetric ? JSON.stringify(latestMetric) : 'none'}</Text>
      <Text testID="health-score">{healthScore ? JSON.stringify(healthScore) : 'none'}</Text>
      <TouchableOpacity testID="refresh" onPress={refreshMetrics}>
        <Text>Refresh</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="add-metric"
        onPress={async () => {
          const result = await addMetric({ weight: 75 });
          return result;
        }}
      >
        <Text>Add Metric</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="add-optimistic"
        onPress={async () => {
          const result = await addMetricOptimistic({ weight: 80 });
          return result;
        }}
      >
        <Text>Add Optimistic</Text>
      </TouchableOpacity>
    </View>
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
    await SecureStore.clearAsync();
    jest.clearAllMocks();

    // Setup default SecureStore values
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('loads cached data on mount', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'aivo_metrics_cache') return JSON.stringify(mockMetricsResponse.data);
        if (key === 'aivo_health_score_cache') return JSON.stringify(mockHealthScoreResponse.data);
        return null;
      });

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
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
    });

    it('fetches metrics and health score', async () => {
      apiClient.getBodyMetrics.mockResolvedValue({ data: mockMetricsResponse.data });
      apiClient.getHealthScore.mockResolvedValue({ data: mockHealthScoreResponse.data });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const refreshButton = screen.getByTestId('refresh');
      await act(async () => {
        fireEvent.press(refreshButton);
      });

      await waitFor(() => {
        expect(apiClient.getBodyMetrics).toHaveBeenCalled();
        expect(apiClient.getHealthScore).toHaveBeenCalled();
      });
    });

    it('caches fetched data', async () => {
      apiClient.getBodyMetrics.mockResolvedValue({ data: mockMetricsResponse.data });
      apiClient.getHealthScore.mockResolvedValue({ data: mockHealthScoreResponse.data });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const refreshButton = screen.getByTestId('refresh');
      await act(async () => {
        fireEvent.press(refreshButton);
      });

      await waitFor(() => {
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          'aivo_metrics_cache',
          expect.any(String)
        );
      });
    });
  });

  describe('addMetric', () => {
    beforeEach(async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
    });

    it('adds new metric successfully', async () => {
      apiClient.createBodyMetric.mockResolvedValue({ data: mockNewMetricResponse });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-metric');
      await act(async () => {
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(apiClient.createBodyMetric).toHaveBeenCalledWith({ weight: 75 });
      });
    });

    it('invalidates cache after adding metric', async () => {
      apiClient.createBodyMetric.mockResolvedValue({ data: mockNewMetricResponse });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-metric');
      await act(async () => {
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('aivo_metrics_cache');
      });
    });
  });

  describe('addMetricOptimistic', () => {
    beforeEach(async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockUserId);
    });

    it('adds metric optimistically', async () => {
      apiClient.createBodyMetric.mockResolvedValue({ data: mockNewMetricResponse });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-optimistic');
      await act(async () => {
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('metrics-count')).toHaveTextContent('1');
      });
    });

    it('shows optimistic metric immediately', async () => {
      apiClient.createBodyMetric.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-optimistic');
      await act(async () => {
        fireEvent.press(addButton);
      });

      // Should show optimistic metric before API returns
      expect(screen.getByTestId('metrics-count')).toHaveTextContent('1');
    });

    it('replaces optimistic metric on success', async () => {
      apiClient.createBodyMetric.mockResolvedValue({ data: mockNewMetricResponse });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-optimistic');
      await act(async () => {
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const latestMetric = JSON.parse(screen.getByTestId('latest-metric').textContent || '{}');
        expect(latestMetric.id).toBe('new-1');
      });
    });

    it('reverts optimistic update on failure', async () => {
      apiClient.createBodyMetric.mockRejectedValue(new Error('Network error'));

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      const addButton = screen.getByTestId('add-optimistic');
      await act(async () => {
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('metrics-count')).toHaveTextContent('0');
      });
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
    });

    it('updates latestMetric when metrics change', async () => {
      apiClient.getBodyMetrics.mockResolvedValue({ data: mockMetricsResponse.data });
      apiClient.getHealthScore.mockResolvedValue({ data: mockHealthScoreResponse.data });

      render(
        <MetricsProvider>
          <TestComponent />
        </MetricsProvider>
      );

      // Click refresh to load metrics
      const refreshButton = screen.getByTestId('refresh');
      await act(async () => {
        fireEvent.press(refreshButton);
      });

      await waitFor(() => {
        expect(apiClient.getBodyMetrics).toHaveBeenCalled();
      });

      // Wait for state to update after API call
      await waitFor(() => {
        expect(screen.getByTestId('metrics-count')).toHaveTextContent('1');
      });
    });
  });
});
