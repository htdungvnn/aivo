"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createApiClient } from "@aivo/api-client";
import {
  Activity,
  RefreshCw,
  Target,
  Clock,
  Moon,
  BarChart3,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BiometricSnapshot as SharedBiometricSnapshot, SleepLog, CorrelationFinding } from "@aivo/shared-types";
import { RecoveryScoreDisplay } from "./RecoveryScoreDisplay";
import CorrelationCard from "./CorrelationCard";
import SleepLogEntry from "./SleepLogEntry";

export function RecoveryDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<SharedBiometricSnapshot | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationFinding[]>([]);
  const [sleepHistory, setSleepHistory] = useState<SleepLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "correlations" | "sleep">("overview");

  const apiClient = useMemo(() => {
    if (!user) {
      return null;
    }
    return createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787/api",
      tokenProvider: async () => localStorage.getItem("aivo_token") || "",
      userIdProvider: async () => user.id,
    });
  }, [user]);

  const loadData = useCallback(async (showRefresh = false) => {
    if (!apiClient) {
      return;
    }

    if (!showRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      // Load 30-day snapshot
      const snapshotResult = await apiClient.getBiometricSnapshot("30d");
      if (snapshotResult.success && snapshotResult.data) {
        setSnapshot(snapshotResult.data);
      }

      // Load correlations
      const corrResult = await apiClient.getCorrelations();
      if (corrResult.success && corrResult.data) {
        setCorrelations(corrResult.data);
      }

      // Load recent sleep history
      const sleepResult = await apiClient.getSleepHistory({ limit: 7 });
      if (sleepResult.success && sleepResult.data) {
        setSleepHistory(sleepResult.data);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load recovery data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (isAuthenticated && apiClient) {
      loadData();
    }
  }, [isAuthenticated, apiClient, loadData]);

  const handleGenerateSnapshot = async () => {
    if (!apiClient) {
      return;
    }
    setRefreshing(true);
    try {
      const result = await apiClient.generateBiometricSnapshot({ period: "30d" });
      if (result.success) {
        await loadData(true);
      }
    } catch {
      setError("Failed to generate snapshot");
    } finally {
      setRefreshing(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full bg-slate-800/50" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full bg-slate-800/50" />
          <Skeleton className="h-64 w-full bg-slate-800/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Biometric Recovery
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            AI-powered correlation analysis between your sleep, exercise, and nutrition
          </p>
        </div>
        <Button
          onClick={handleGenerateSnapshot}
          disabled={refreshing}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Analyzing..." : "Run Analysis"}
        </Button>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            <p className="text-red-300 text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {snapshot ? (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Recovery Score & Key Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <RecoveryScoreDisplay
                    score={snapshot.recoveryScore}
                    trend={snapshot.warnings && snapshot.warnings.length > 0 ? "declining" : "stable"}
                  />
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-cyan-900/30 via-slate-900/60 to-blue-900/30 border-cyan-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Moon className="w-5 h-5 text-cyan-400" />
                        <span className="text-sm text-gray-400">Sleep</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{snapshot.sleep?.avgDuration?.toFixed(1) || 0}h</p>
                      <p className="text-xs text-gray-500 mt-1">Avg duration</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-900/30 via-slate-900/60 to-pink-900/30 border-purple-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-gray-400">Exercise</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{snapshot.exerciseLoad?.totalWorkouts || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">Workouts</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-emerald-900/30 via-slate-900/60 to-teal-900/30 border-emerald-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm text-gray-400">Nutrition</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{snapshot.nutrition?.consistencyScore || 0}%</p>
                      <p className="text-xs text-gray-500 mt-1">Consistency</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Warnings */}
              {snapshot.warnings && snapshot.warnings.length > 0 && (
                <Card className="bg-amber-900/20 border-amber-500/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <span className="font-medium text-amber-300">Alerts</span>
                    </div>
                    <ul className="space-y-1">
                      {snapshot.warnings.map((warning: string, i: number) => (
                        <li key={i} className="text-sm text-amber-200/70">• {warning}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Sleep History */}
              <Card className="bg-slate-900/60 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Recent Sleep
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sleepHistory.slice(0, 5).map((entry: SleepLog) => (
                      <SleepLogEntry
                        key={entry.id}
                        date={entry.date}
                        duration={entry.durationHours && entry.durationHours !== null ? entry.durationHours : 0}
                        quality={entry.qualityScore && entry.qualityScore !== null ? entry.qualityScore : undefined}
                      />
                    ))}
                    {sleepHistory.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No sleep data logged yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Correlations Tab */}
          {activeTab === "correlations" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {correlations.length > 0 ? (
                correlations.map((corr) => (
                  <CorrelationCard key={corr.id} finding={corr} />
                ))
              ) : (
                <Card className="bg-slate-900/60 border-slate-700/50">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-gray-300">No significant correlations found yet.</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Keep logging your biometric data for at least 7 days to discover patterns.
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* Sleep Tab */}
          {activeTab === "sleep" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-slate-900/60 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Recent Sleep
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sleepHistory.slice(0, 5).map((entry: SleepLog) => (
                      <SleepLogEntry
                        key={entry.id}
                        date={entry.date}
                        duration={entry.durationHours && entry.durationHours !== null ? entry.durationHours : 0}
                        quality={entry.qualityScore && entry.qualityScore !== null ? entry.qualityScore : undefined}
                      />
                    ))}
                    {sleepHistory.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No sleep data logged yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-700/50 pb-2">
            {(["overview", "correlations", "sleep"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? "bg-slate-800 text-cyan-400 border-b-2 border-cyan-400"
                    : "text-gray-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="pt-6 text-center py-12">
            <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Analysis Available</h3>
            <p className="text-gray-400 mb-4 max-w-md mx-auto">
              Generate your first biometric snapshot to discover hidden patterns between your sleep,
              exercise, nutrition, and recovery.
            </p>
            <Button
              onClick={handleGenerateSnapshot}
              disabled={refreshing}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>Generate Analysis</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
