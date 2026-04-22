"use client";

import { useState, useCallback } from "react";
import { createApiClient } from "@aivo/api-client";

export interface MetabolicHistoricalPoint {
  timestamp: number;
  weightKg: number;
  bodyFatPct: number;
  muscleMassKg: number;
  activityLevel?: number;
  calorieIntake?: number;
}

export interface TrendLine {
  slope: number;
  intercept: number;
  rSquared: number;
  stdError: number;
}

export interface Projection {
  daysAhead: number;
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ScenarioProjection {
  scenarioType: "consistent_performance" | "potential_regression" | "best_case" | "worst_case";
  weightProjections: Projection[];
  bodyFatProjections: Projection[];
  muscleProjections: Projection[];
  overallConfidence: number;
  expectedBehaviorChange: string;
}

export interface CurrentMetrics {
  weightKg: number;
  bodyFatPct: number;
  muscleMassKg: number;
  leanBodyMassKg: number;
  bmi: number;
  activityScore: number;
}

export interface TrendAnalysis {
  weightTrend: TrendLine;
  bodyFatTrend: TrendLine;
  muscleTrend: TrendLine;
  consistencyScore: number;
  volatility: number;
  trendStrength: number;
}

export interface ScenarioResults {
  consistentPerformance: ScenarioProjection;
  potentialRegression: ScenarioProjection;
  bestCase: ScenarioProjection;
  worstCase: ScenarioProjection;
}

export interface DigitalTwinResult {
  userId: string;
  generatedAt: number;
  timeHorizonDays: number;
  currentMetrics: CurrentMetrics;
  trendAnalysis: TrendAnalysis;
  scenarios: ScenarioResults;
  recommendations: string[];
}

export function useMetabolicTwin() {
  const [simulation, setSimulation] = useState<DigitalTwinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<MetabolicHistoricalPoint[]>([]);

  const fetchHistoricalData = useCallback(async (userId: string, token: string): Promise<MetabolicHistoricalPoint[]> => {
    // Fetch body metrics
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"}/api/body/metrics?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch historical data");
    }

    const data = await response.json();
    // Transform to expected format
    return data.bodyMetrics?.map((m: any) => ({
      timestamp: new Date(m.createdAt).getTime(),
      weightKg: m.weight || 0,
      bodyFatPct: m.bodyFatPercentage || 0,
      muscleMassKg: m.muscleMass || 0,
    })) || [];
  }, []);

  const generateSimulation = useCallback(async (
    userId: string,
    token: string,
    timeHorizonDays: number = 30
  ): Promise<DigitalTwinResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get historical data
      const data = await fetchHistoricalData(userId, token);
      setHistoricalData(data);

      if (data.length < 2) {
        throw new Error("Insufficient historical data. Need at least 2 body metric entries.");
      }

      // Call WASM simulation API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"}/api/metabolic/simulate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          historicalData: data,
          timeHorizonDays,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate simulation");
      }

      const result = await response.json();
      setSimulation(result.data);
      return result.data;
    } catch (err: any) {
      setError(err.message || "An error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchHistoricalData]);

  const getScenarioDescriptions = useCallback(() => {
    return {
      consistent_performance: {
        name: "Consistent Performance",
        description: "Projection if you maintain current habits",
        color: "text-green-400",
        borderColor: "border-green-500/30",
      },
      potential_regression: {
        name: "Potential Regression",
        description: "If consistency decreases",
        color: "text-amber-400",
        borderColor: "border-amber-500/30",
      },
      best_case: {
        name: "Best Case",
        description: "With optimized nutrition & training",
        color: "text-cyan-400",
        borderColor: "border-cyan-500/30",
      },
      worst_case: {
        name: "Worst Case",
        description: "If current trajectory deteriorates",
        color: "text-red-400",
        borderColor: "border-red-500/30",
      },
    };
  }, []);

  return {
    simulation,
    loading,
    error,
    historicalData,
    generateSimulation,
    getScenarioDescriptions,
  };
}
