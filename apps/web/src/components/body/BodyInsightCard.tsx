"use client";

import { useState, useEffect, useCallback } from "react";
import { BodyHeatmap } from "./BodyHeatmap";
import { BodyMetricCard } from "./BodyMetricCard";
import { BodyMetricChart } from "./BodyMetricsChart";
import { PostureAnalysisCard } from "./PostureAnalysisCard";
import type { MetricDataPoint } from "./BodyMetricsChart";
import type { HealthScoreResult, BodyMetric, BodyHeatmapData } from "@aivo/shared-types";

// Use types from shared-types directly
// BodyHeatmapData, BodyMetric, VisionAnalysis, HealthScoreResult are all imported

interface BodyInsightCardProps {
  apiUrl: string;
  compact?: boolean; // Show only heatmap, no charts
}

export function BodyInsightCard({ apiUrl, compact = false }: BodyInsightCardProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [latestMetric, setLatestMetric] = useState<BodyMetric | null>(null);
  const [heatmapData, setHeatmapData] = useState<BodyHeatmapData | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch body metrics (using cookie-based auth)
      const metricsRes = await fetch(`${apiUrl}/api/body/metrics?limit=30`, {
        credentials: "include",
      });
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        const metricsList = metricsData.data || [];
        setMetrics(metricsList);
        // Get the most recent metric (assumes array is sorted by timestamp ascending)
        if (metricsList.length > 0) {
          setLatestMetric(metricsList[metricsList.length - 1]);
        }
      }

      // Fetch heatmap data
      const heatmapRes = await fetch(`${apiUrl}/api/body/heatmaps?limit=1`, {
        credentials: "include",
      });
      if (heatmapRes.ok) {
        const heatmapData = await heatmapRes.json();
        if (heatmapData.data?.[0]) {
          setHeatmapData(heatmapData.data[0]);
        }
      }

      // Fetch health score
      const scoreRes = await fetch(`${apiUrl}/api/body/health-score`, {
        credentials: "include",
      });
      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        if (scoreData.data) {
          setHealthScore(scoreData.data);
        }
      }
    } catch (err: unknown) {
      // Generic error message for user display
      setError("Failed to load body insights");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!apiUrl) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [apiUrl, fetchData]);

  // Transform data for charts
  const weightData: MetricDataPoint[] = metrics
    .filter((m) => m.weight)
    .map((m) => ({
      date: new Date(m.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: m.weight!,
    }))
    .reverse();

  const bodyFatData: MetricDataPoint[] = metrics
    .filter((m) => m.bodyFatPercentage)
    .map((m) => ({
      date: new Date(m.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: m.bodyFatPercentage! * 100, // Convert to percentage
    }))
    .reverse();

  const muscleData: MetricDataPoint[] = metrics
    .filter((m) => m.muscleMass)
    .map((m) => ({
      date: new Date(m.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: m.muscleMass!,
    }))
    .reverse();

  const handleHeatmapPointClick = (_point: unknown) => {
    // TODO: Handle heatmap point click - show detailed body part analysis
  };

  if (compact) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-200 font-semibold">Body Heatmap</h3>
          <button
            onClick={fetchData}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse bg-slate-800/50 rounded-lg h-64"></div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : heatmapData ? (
          <div className="flex justify-center">
            <BodyHeatmap
              vectorData={heatmapData.vectorData}
              width={280}
              height={560}
              onPointClick={handleHeatmapPointClick}
            />
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No heatmap data yet.</p>
            <p className="text-slate-500 text-xs mt-1">Upload a body photo to generate analysis.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {healthScore && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h4 className="text-slate-400 text-sm font-medium mb-4">Health Score</h4>
            <div className="flex items-center justify-center">
              <div className="relative">
                <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={healthScore.score >= 80 ? "#22c55e" : healthScore.score >= 60 ? "#3b82f6" : healthScore.score >= 40 ? "#f97316" : "#ef4444"}
                    strokeWidth="10"
                    strokeDasharray={`${251.2 * (healthScore.score / 100)} 251.2`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{Math.round(healthScore.score)}</span>
                  <span className="text-xs text-slate-400 uppercase">{healthScore.category.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {latestMetric && (
          <>
            <BodyMetricCard
              label="Weight"
              value={latestMetric.weight || 0}
              unit="kg"
              change={latestMetric.weight && weightData.length > 1 ? weightData[0].value - weightData[1]?.value || 0 : undefined}
              variant={latestMetric.weight ? "success" : "default"}
            />
            <BodyMetricCard
              label="Body Fat"
              value={(latestMetric.bodyFatPercentage || 0) * 100}
              unit="%"
              change={latestMetric.bodyFatPercentage && bodyFatData.length > 1 ? (bodyFatData[0].value - bodyFatData[1]?.value || 0) * 100 : undefined}
              variant={latestMetric.bodyFatPercentage && latestMetric.bodyFatPercentage < 0.25 ? "success" : "warning"}
            />
            <BodyMetricCard
              label="Muscle Mass"
              value={latestMetric.muscleMass || 0}
              unit="kg"
              change={latestMetric.muscleMass && muscleData.length > 1 ? muscleData[0].value - muscleData[1]?.value || 0 : undefined}
              variant="success"
            />
          </>
        )}
      </div>

      {/* Body Heatmap */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-200 font-semibold">Muscle Development Heatmap</h3>
          <div className="flex gap-2">
            {["heat", "cool", "monochrome"].map((scale) => (
              <button
                key={scale}
                className="px-3 py-1 text-xs rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
              >
                {scale}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse bg-slate-800/50 rounded-lg h-80"></div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">{error}</p>
          </div>
        ) : heatmapData ? (
          <div className="flex justify-center">
            <BodyHeatmap
              vectorData={heatmapData.vectorData}
              width={300}
              height={600}
              onPointClick={handleHeatmapPointClick}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">No muscle analysis yet.</p>
            <p className="text-slate-500 text-sm mt-1">
              Upload a body photo to generate AI-powered muscle development analysis.
            </p>
          </div>
        )}
      </div>

      {/* Trend Charts */}
      {!compact && (weightData.length > 0 || bodyFatData.length > 0) && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-slate-200 font-semibold mb-6">Body Composition Trends</h3>

          <div className="space-y-8">
            {weightData.length > 0 && (
              <div>
                <h4 className="text-slate-400 text-sm mb-3">Weight Progress</h4>
                <BodyMetricChart data={weightData} metric="weight" height={200} />
              </div>
            )}

            {bodyFatData.length > 0 && (
              <div>
                <h4 className="text-slate-400 text-sm mb-3">Body Fat %</h4>
                <BodyMetricChart data={bodyFatData} metric="bodyFat" height={200} />
              </div>
            )}

            {muscleData.length > 0 && (
              <div>
                <h4 className="text-slate-400 text-sm mb-3">Muscle Mass</h4>
                <BodyMetricChart data={muscleData} metric="muscleMass" height={200} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {healthScore?.recommendations && healthScore.recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-950/30 to-blue-950/30 border border-emerald-500/20 rounded-xl p-6">
          <h3 className="text-emerald-400 font-semibold mb-4">Personalized Recommendations</h3>
          <ul className="space-y-3">
            {healthScore.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-300">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Posture Analysis */}
      {!compact && <PostureAnalysisCard />}
    </div>
  );
}

export default BodyInsightCard;
