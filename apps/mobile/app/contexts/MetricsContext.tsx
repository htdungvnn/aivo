import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { createApiClient, type BodyMetric, type HealthScoreResult } from "@aivo/api-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

// Storage keys
const STORAGE_KEYS = {
  TOKEN: "aivo_token",
  USER_ID: "aivo_user_id",
  METRICS: "aivo_metrics_cache",
  HEALTH_SCORE: "aivo_health_score_cache",
};

// Create API client with platform-specific token storage
function getApiClient() {
  return createApiClient({
    baseUrl: API_URL,
    tokenProvider: async () => (await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN)) || "",
    userIdProvider: async () => (await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID)) || "",
  });
}

export interface MetricsState {
  metrics: BodyMetric[];
  latestMetric: BodyMetric | null;
  healthScore: HealthScoreResult | null;
  loading: boolean;
  error: string | null;
  optimisticUpdate: BodyMetric | null;
}

interface MetricsContextType extends MetricsState {
  refreshMetrics: () => Promise<void>;
  addMetric: (metric: Partial<BodyMetric>) => Promise<BodyMetric>;
  addMetricOptimistic: (metric: Partial<BodyMetric>) => Promise<BodyMetric>;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MetricsState>(() => ({
    metrics: [],
    latestMetric: null,
    healthScore: null,
    loading: true,
    error: null,
    optimisticUpdate: null,
  }));

  const loadCachedData = useCallback(async () => {
    try {
      const [cachedMetrics, cachedScore] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.METRICS),
        SecureStore.getItemAsync(STORAGE_KEYS.HEALTH_SCORE),
      ]);

      if (cachedMetrics) {
        const metrics = JSON.parse(cachedMetrics);
        setState((prev) => ({
          ...prev,
          metrics,
          latestMetric: metrics[0] || null,
        }));
      }
      if (cachedScore) {
        setState((prev) => ({
          ...prev,
          healthScore: JSON.parse(cachedScore),
        }));
      }
    } catch {
      // Silently ignore cache load errors
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const api = getApiClient();
      const [metricsRes, scoreRes] = await Promise.allSettled([
        api.getBodyMetrics({ limit: 30 }),
        api.getHealthScore(),
      ]);

      if (metricsRes.status === "fulfilled") {
        const { data } = metricsRes.value;
        setState((prev) => ({
          ...prev,
          metrics: data || [],
          latestMetric: data?.[0] || null,
        }));
        await SecureStore.setItemAsync(STORAGE_KEYS.METRICS, JSON.stringify(data || []));
      }

      if (scoreRes.status === "fulfilled") {
        const { data } = scoreRes.value;
        setState((prev) => ({
          ...prev,
          healthScore: data || null,
        }));
        await SecureStore.setItemAsync(STORAGE_KEYS.HEALTH_SCORE, JSON.stringify(data));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load metrics";
      setState((prev) => ({ ...prev, error: message }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const addMetric = async (metric: Partial<BodyMetric>): Promise<BodyMetric> => {
    const api = getApiClient();
    const { data } = await api.createBodyMetric(metric);
    if (!data) {throw new Error('Failed to create metric: no data returned');}
    await SecureStore.deleteItemAsync(STORAGE_KEYS.METRICS);
    return data;
  };

  const addMetricOptimistic = async (metric: Partial<BodyMetric>): Promise<BodyMetric> => {
    const api = getApiClient();
    const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID) || "";

    // Create optimistic metric with temporary ID
    const optimisticMetric: BodyMetric = {
      id: `temp-${Date.now()}`,
      userId,
      timestamp: Math.floor(Date.now() / 1000),
      weight: metric.weight,
      bodyFatPercentage: metric.bodyFatPercentage,
      muscleMass: metric.muscleMass,
      bmi: metric.bmi,
    };

    // Immediately update state
    setState((prev) => ({
      ...prev,
      metrics: [optimisticMetric, ...prev.metrics],
      latestMetric: optimisticMetric,
      optimisticUpdate: optimisticMetric,
    }));

    try {
      const { data: newMetric } = await api.createBodyMetric(metric);
      if (!newMetric) {throw new Error('No data returned from API');}

      // Replace optimistic metric with real one
      setState((prev) => ({
        ...prev,
        metrics: prev.metrics.map((m) => (m.id === optimisticMetric.id ? newMetric : m)),
        latestMetric: newMetric,
        optimisticUpdate: null,
      }));

      await SecureStore.deleteItemAsync(STORAGE_KEYS.METRICS);
      return newMetric;
    } catch (error) {
      // Revert optimistic update on error
      setState((prev) => ({
        ...prev,
        metrics: prev.metrics.filter((m) => m.id !== optimisticMetric.id),
        latestMetric: prev.metrics[0] || null,
        optimisticUpdate: null,
      }));
      throw error;
    }
  };

  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  const value: MetricsContextType = {
    ...state,
    refreshMetrics,
    addMetric,
    addMetricOptimistic,
  };

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}

export function useMetrics() {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error("useMetrics must be used within a MetricsProvider");
  }
  return context;
}
