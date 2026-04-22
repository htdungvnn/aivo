"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createApiClient } from "@aivo/api-client";
import { Moon, Clock, TrendingUp, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

interface SleepSummary {
  period: string;
  averageDuration: number;
  averageQuality: number;
  consistency: number;
  totalDays: number;
}

export function SleepSummaryCard() {
  const { user, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<SleepSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const apiClient = user ? createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787/api",
    tokenProvider: async () => localStorage.getItem("aivo_token") || "",
    userIdProvider: async () => user.id,
  }) : null;

  const loadSummary = useCallback(async () => {
    if (!apiClient) {return;}

    setLoading(true);
    try {
      const result = await apiClient.getSleepSummary("30d");
      if (result.success && result.data) {
        setSummary(result.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (isAuthenticated && apiClient) {
      loadSummary();
    }
  }, [isAuthenticated, apiClient, loadSummary]);

  if (loading) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            <div className="h-8 bg-slate-800 rounded"></div>
            <div className="h-4 bg-slate-800 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardContent className="pt-6 text-center py-8">
          <Moon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No sleep data yet</p>
          <p className="text-gray-500 text-xs mt-1">Log your sleep to see insights</p>
        </CardContent>
      </Card>
    );
  }

  const qualityColor = summary.averageQuality >= 80 ? "text-emerald-400" : summary.averageQuality >= 60 ? "text-yellow-400" : "text-red-400";
  const consistencyColor = summary.consistency >= 0.8 ? "text-emerald-400" : summary.consistency >= 0.6 ? "text-yellow-400" : "text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-gradient-to-br from-indigo-900/30 via-slate-900/60 to-purple-900/30 border-indigo-500/20 hover:border-indigo-500/40 transition-all">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Sleep Summary</h3>
              <p className="text-xs text-gray-400">Last {summary.totalDays} days</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Avg Duration</span>
              </div>
              <span className="text-lg font-semibold text-white">{summary.averageDuration.toFixed(1)}h</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Quality</span>
              </div>
              <span className={`text-lg font-semibold ${qualityColor}`}>
                {summary.averageQuality.toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Consistency</span>
              </div>
              <span className={`text-lg font-semibold ${consistencyColor}`}>
                {(summary.consistency * 100).toFixed(0)}%
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Recovery Impact</span>
                <span className={`font-medium ${
                  summary.averageQuality >= 75 ? "text-emerald-400" : "text-yellow-400"
                }`}>
                  {summary.averageQuality >= 75 ? "Optimal" : "Needs Improvement"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
