"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/loading";
import {
  Activity,
  Heart,
  Footprints,
  Moon,
  Flame,
  TrendingUp,
  Download,
  RefreshCw,
  AlertCircle,
  Clock,
  Watch,
} from "lucide-react";
import { motion } from "framer-motion";
import type { HealthMetric, HealthGoal, SyncStatus, ChartDataPoint } from "@/types/health";
import { format } from "date-fns";

// Dynamic imports for heavy chart components
const TimeSeriesChart = lazy(() => import("@/components/charts/TimeSeriesChart"));
const GoalsChart = lazy(() => import("@/components/charts/GoalsChart"));

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export default function HealthDashboardPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncAt: null,
    isSyncing: false,
    pendingCount: 0,
    errors: [],
    devices: [],
  });
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "year">("week");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const fetchHealthData = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("aivo_token");
      if (!token) {
        throw new Error("No authentication token");
      }

      const [metricsRes, goalsRes, syncRes] = await Promise.all([
        fetch(`${API_URL}/api/health/metrics?userId=${user.id}&range=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/health/goals?userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/health/sync-status?userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!metricsRes.ok || !goalsRes.ok || !syncRes.ok) {
        throw new Error("Failed to fetch health data");
      }

      const [metricsData, goalsData, syncData] = await Promise.all([
        metricsRes.json(),
        goalsRes.json(),
        syncRes.json(),
      ]);

      setMetrics(metricsData.metrics || []);
      setGoals(goalsData.goals || []);
      setSyncStatus(syncData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health data");
    } finally {
      setIsLoading(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    if (user) {
      fetchHealthData();
    }
  }, [user, timeRange, fetchHealthData]);

  const handleSync = async () => {
    if (!user || syncStatus.isSyncing) {
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      const token = localStorage.getItem("aivo_token");
      const response = await fetch(`${API_URL}/api/health/sync?userId=${user.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Sync failed");
      }

      await fetchHealthData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  const handleExport = async (format: "csv" | "json" | "xlsx") => {
    if (!user) {
      return;
    }

    try {
      const token = localStorage.getItem("aivo_token");
      const response = await fetch(
        `${API_URL}/api/health/export?userId=${user.id}&format=${format}&range=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health-data-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  // Memoized chart data transformations
  const stepsChartData = useMemo<ChartDataPoint[]>(() => {
    const stepsMetrics = metrics.filter((m) => m.type === "steps");
    if (stepsMetrics.length === 0) {
      return [];
    }

    const grouped = new Map<string, number[]>();
    stepsMetrics.forEach((metric) => {
      const date = format(new Date(metric.recordedAt), "yyyy-MM-dd");
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(metric.value);
    });

    const data: ChartDataPoint[] = Array.from(grouped.entries())
      .map(([dateStr, values]) => ({
        timestamp: new Date(`${dateStr}T00:00:00.000Z`),
        value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    data.forEach((point) => {
      const pointDate = new Date(point.timestamp);
      pointDate.setHours(0, 0, 0, 0);
      if (pointDate.getTime() === today.getTime()) {
        (point as ChartDataPoint & { isCurrent?: boolean }).isCurrent = true;
      }
    });

    const maxPoints = timeRange === "day" ? 24 : timeRange === "week" ? 7 : timeRange === "month" ? 30 : 12;
    if (data.length > maxPoints) {
      return data.slice(-maxPoints);
    }

    return data;
  }, [metrics, timeRange]);

  const heartRateChartData = useMemo<ChartDataPoint[]>(() => {
    const hrMetrics = metrics.filter((m) => m.type === "heart_rate");
    if (hrMetrics.length === 0) {
      return [];
    }

    const grouped = new Map<string, number[]>();
    hrMetrics.forEach((metric) => {
      const date = format(new Date(metric.recordedAt), "yyyy-MM-dd");
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(metric.value);
    });

    const data: ChartDataPoint[] = Array.from(grouped.entries())
      .map(([dateStr, values]) => ({
        timestamp: new Date(`${dateStr}T00:00:00.000Z`),
        value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    data.forEach((point) => {
      const pointDate = new Date(point.timestamp);
      pointDate.setHours(0, 0, 0, 0);
      if (pointDate.getTime() === today.getTime()) {
        (point as ChartDataPoint & { isCurrent?: boolean }).isCurrent = true;
      }
    });

    const maxPoints = timeRange === "day" ? 24 : timeRange === "week" ? 7 : timeRange === "month" ? 30 : 12;
    if (data.length > maxPoints) {
      return data.slice(-maxPoints);
    }

    return data;
  }, [metrics, timeRange]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 text-lg font-medium">Loading Health Dashboard...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Calculate summary stats
  const totalSteps = metrics
    .filter((m) => m.type === "steps")
    .reduce((sum, m) => sum + m.value, 0);

  const avgHeartRate =
    metrics.filter((m) => m.type === "heart_rate").length > 0
      ? Math.round(
          metrics
            .filter((m) => m.type === "heart_rate")
            .reduce((sum, m) => sum + m.value, 0) /
            metrics.filter((m) => m.type === "heart_rate").length
        )
      : null;

  const totalSleepHours =
    metrics.filter((m) => m.type === "sleep_duration").length > 0
      ? (
          metrics
            .filter((m) => m.type === "sleep_duration")
            .reduce((sum, m) => sum + m.value, 0) /
          60 /
          metrics.filter((m) => m.type === "sleep_duration").length
        ).toFixed(1)
      : null;

  const totalCalories = metrics
    .filter((m) => m.type === "calories_burned")
    .reduce((sum, m) => sum + m.value, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Activity className="w-7 h-7 text-cyan-400" />
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                AIVO Health
              </span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Connected
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {(["day", "week", "month", "year"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      timeRange === range
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-gray-400 hover:text-white border border-transparent"
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleSync}
                disabled={syncStatus.isSyncing}
                variant="outline"
                size="sm"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                {syncStatus.isSyncing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {syncStatus.isSyncing ? "Syncing..." : "Sync"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 hover:border-slate-500"
                onClick={() => handleExport("csv")}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
            <Button onClick={fetchHealthData} size="sm" variant="ghost" className="ml-auto text-red-400 hover:text-red-300">
              Retry
            </Button>
          </motion.div>
        )}

        {/* Sync Status Bar */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              {syncStatus.lastSyncAt ? (
                <span>Last sync: {new Date(syncStatus.lastSyncAt).toLocaleString()}</span>
              ) : (
                <span>Not synced yet</span>
              )}
            </div>
            {syncStatus.pendingCount > 0 && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                {syncStatus.pendingCount} pending
              </Badge>
            )}
            {syncStatus.errors.length > 0 && (
              <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                {syncStatus.errors.length} errors
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {syncStatus.devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg"
              >
                <Watch className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-300">{device.name}</span>
                {device.batteryLevel && (
                  <span className="text-xs text-gray-500">{device.batteryLevel}%</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Summary Metrics */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <MetricCard
            title="Total Steps"
            value={totalSteps.toLocaleString()}
            unit="steps"
            icon={Footprints}
            color="cyan"
            trend="+12% from last week"
            isLoading={isLoading}
          />
          <MetricCard
            title="Heart Rate"
            value={avgHeartRate ? `${avgHeartRate}` : "--"}
            unit="bpm"
            icon={Heart}
            color="red"
            trend={avgHeartRate ? "Normal range" : "No data"}
            isLoading={isLoading}
          />
          <MetricCard
            title="Sleep"
            value={totalSleepHours || "--"}
            unit="hours"
            icon={Moon}
            color="purple"
            trend="7.5h recommended"
            isLoading={isLoading}
          />
          <MetricCard
            title="Calories Burned"
            value={totalCalories.toLocaleString()}
            unit="kcal"
            icon={Flame}
            color="orange"
            trend="+8% from last week"
            isLoading={isLoading}
          />
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <Card className="bg-gradient-to-br from-cyan-900/30 via-slate-900/60 to-blue-900/30 border-cyan-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Footprints className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Steps Over Time</h3>
                      <p className="text-sm text-gray-400">Daily step count trend</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
                    {timeRange}
                  </Badge>
                </div>
                <div className="h-64">
                  {stepsChartData.length > 0 ? (
                    <Suspense fallback={<Skeleton className="h-full w-full" />}>
                      <TimeSeriesChart
                        data={stepsChartData}
                        metric="steps"
                        height={256}
                        showGrid={true}
                        showTooltip={true}
                      />
                    </Suspense>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <p>No steps data available for selected time range</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <Card className="bg-gradient-to-br from-red-900/30 via-slate-900/60 to-pink-900/30 border-red-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <Heart className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Heart Rate</h3>
                      <p className="text-sm text-gray-400">BPM over time</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-red-500/30 text-red-300">
                    Resting & Active
                  </Badge>
                </div>
                <div className="h-64">
                  {heartRateChartData.length > 0 ? (
                    <Suspense fallback={<Skeleton className="h-full w-full" />}>
                      <TimeSeriesChart
                        data={heartRateChartData}
                        metric="heart_rate"
                        height={256}
                        showGrid={true}
                        showTooltip={true}
                      />
                    </Suspense>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <p>No heart rate data available for selected time range</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Goals Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mb-8"
        >
          <Card className="bg-slate-900/60 border-slate-800/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Health Goals</h3>
                    <p className="text-sm text-gray-400">Track your daily progress</p>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="h-4 w-1/3 bg-slate-700 rounded mb-2 animate-pulse" />
                      <div className="h-2 w-full bg-slate-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No goals set yet.</p>
                  <Button className="mt-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30">
                    Set Your First Goal
                  </Button>
                </div>
              ) : (
                <div style={{ height: "300px" }}>
                  <Suspense fallback={<Skeleton className="h-full w-full" />}>
                    <GoalsChart goals={goals} height={300} showCompact={false} />
                  </Suspense>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Card className="bg-slate-900/60 border-slate-800/50 hover:border-cyan-500/30 transition-all">
            <CardContent className="pt-6">
              <Button
                onClick={() => router.push("/dashboard/health/insights")}
                className="w-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30"
              >
                <Activity className="w-4 h-4 mr-2" />
                View AI Insights
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800/50 hover:border-emerald-500/30 transition-all">
            <CardContent className="pt-6">
              <Button
                onClick={() => handleExport("csv")}
                variant="outline"
                className="w-full border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export All Data
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800/50 hover:border-purple-500/30 transition-all">
            <CardContent className="pt-6">
              <Button
                onClick={() => router.push("/dashboard/health/goals")}
                variant="outline"
                className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Manage Goals
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  color: "cyan" | "red" | "purple" | "orange" | "emerald";
  trend?: string;
  isLoading?: boolean;
}

function MetricCard({ title, value, unit, icon: Icon, color, trend, isLoading }: MetricCardProps) {
  const bgColorClasses = {
    cyan: "bg-cyan-500/20 text-cyan-400",
    red: "bg-red-500/20 text-red-400",
    purple: "bg-purple-500/20 text-purple-400",
    orange: "bg-orange-500/20 text-orange-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${bgColorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-xs">
              {trend}
            </Badge>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-white mb-1">
              {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
            </p>
            <p className="text-sm text-gray-400">{title}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
