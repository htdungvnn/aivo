import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

// Types (copied from API service - in production would be from shared-types)
export interface BodyMetric {
  id: string;
  userId: string;
  timestamp: number;
  weight?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  bmi?: number;
}

export interface HealthScore {
  score: number;
  category: "poor" | "fair" | "good" | "excellent";
  recommendations: string[];
}

export interface MetricsState {
  metrics: BodyMetric[];
  latestMetric: BodyMetric | null;
  healthScore: HealthScore | null;
  loading: boolean;
  error: string | null;
  optimisticUpdate: BodyMetric | null; // Track pending optimistic update
}

interface MetricsContextType extends MetricsState {
  refreshMetrics: () => Promise<void>;
  addMetric: (metric: Partial<BodyMetric>) => Promise<BodyMetric>;
  addMetricOptimistic: (metric: Partial<BodyMetric>) => Promise<BodyMetric>;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  METRICS: "aivo_metrics_cache",
  HEALTH_SCORE: "aivo_health_score_cache",
};

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MetricsState>({
    metrics: [],
    latestMetric: null,
    healthScore: null,
    loading: true,
    error: null,
    optimisticUpdate: null,
  });

  const loadCachedData = useCallback(async () => {
    try {
      const cachedMetrics = await SecureStore.getItemAsync(STORAGE_KEYS.METRICS);
      const cachedScore = await SecureStore.getItemAsync(STORAGE_KEYS.HEALTH_SCORE);

      if (cachedMetrics) {
        setState((prev) => ({
          ...prev,
          metrics: JSON.parse(cachedMetrics),
          latestMetric: JSON.parse(cachedMetrics)[0] || null,
        }));
      }
      if (cachedScore) {
        setState((prev) => ({
          ...prev,
          healthScore: JSON.parse(cachedScore),
        }));
      }
    } catch (error) {
      console.error("Failed to load cached metrics:", error);
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const [metricsRes, scoreRes] = await Promise.allSettled([
        fetch("http://localhost:8787/api/body/metrics?limit=30", {
          headers: { Authorization: `Bearer ${await SecureStore.getItemAsync("aivo_token")}` },
        }),
        fetch("http://localhost:8787/api/body/health-score", {
          headers: {
            Authorization: `Bearer ${await SecureStore.getItemAsync("aivo_token")}`,
            "X-User-Id": await SecureStore.getItemAsync("aivo_user_id"),
          },
        }),
      ]);

      if (metricsRes.status === "fulfilled") {
        const metricsData = await metricsRes.value.json();
        setState((prev) => ({
          ...prev,
          metrics: metricsData.data || [],
          latestMetric: metricsData.data?.[0] || null,
        }));
        await SecureStore.setItemAsync(STORAGE_KEYS.METRICS, JSON.stringify(metricsData.data || []));
      }

      if (scoreRes.status === "fulfilled") {
        const scoreData = await scoreRes.value.json();
        setState((prev) => ({
          ...prev,
          healthScore: scoreData.data,
        }));
        await SecureStore.setItemAsync(STORAGE_KEYS.HEALTH_SCORE, JSON.stringify(scoreData.data));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load metrics";
      setState((prev) => ({ ...prev, error: message }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const addMetric = async (metric: Partial<BodyMetric>): Promise<BodyMetric> => {
    const token = await SecureStore.getItemAsync("aivo_token");
    const userId = await SecureStore.getItemAsync("aivo_user_id");

    const response = await fetch("http://localhost:8787/api/body/metrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-User-Id": userId,
      },
      body: JSON.stringify(metric),
    });

    if (!response.ok) {
      throw new Error("Failed to add metric");
    }

    const newMetric = await response.json();
    // Invalidate cache
    await SecureStore.deleteItemAsync(STORAGE_KEYS.METRICS);
    return newMetric;
  };

  const addMetricOptimistic = async (metric: Partial<BodyMetric>): Promise<BodyMetric> => {
    const token = await SecureStore.getItemAsync("aivo_token");

    // Create optimistic metric with temporary ID
    const optimisticMetric: BodyMetric = {
      id: `temp-${Date.now()}`,
      userId: await SecureStore.getItemAsync("aivo_user_id") || "",
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
      const response = await fetch("http://localhost:8787/api/body/metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-User-Id": optimisticMetric.userId,
        },
        body: JSON.stringify(metric),
      });

      if (!response.ok) {
        throw new Error("Failed to add metric");
      }

      const newMetric = await response.json();

      // Replace optimistic metric with real one
      setState((prev) => {
        const updatedMetrics = prev.metrics.map((m) =>
          m.id === optimisticMetric.id ? newMetric : m
        );
        return {
          ...prev,
          metrics: updatedMetrics,
          latestMetric: newMetric,
          optimisticUpdate: null,
        };
      });

      // Invalidate cache
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
