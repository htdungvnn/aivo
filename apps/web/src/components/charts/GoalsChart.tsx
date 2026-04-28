"use client";

import React from "react";
import { cn, formatNumber, formatPercentage } from "@/lib/utils";
import type { HealthGoal } from "@/types/health";

interface GoalsChartProps {
  goals: HealthGoal[];
  height?: number;
  showCompact?: boolean;
  className?: string;
}

const METRIC_COLORS: Record<string, string> = {
  steps: "#06b6d4", // cyan
  heart_rate: "#ef4444", // red
  sleep_duration: "#a855f7", // purple
  calories_burned: "#f59e0b", // amber
  distance: "#10b981", // emerald
  active_minutes: "#3b82f6", // blue
  workout_count: "#ec4899", // pink
  default: "#64748b", // slate
};

const TIMEFRAME_LABELS = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
};

export function GoalsChart({
  goals,
  height = 300,
  showCompact = false,
  className,
}: GoalsChartProps) {
  // Sort goals by completion percentage (descending)
  const sortedGoals = React.useMemo(() => {
    return [...goals].sort((a, b) => b.progressPercentage - a.progressPercentage);
  }, [goals]);

  if (goals.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl bg-slate-900/50 border border-slate-800/50",
          className
        )}
        style={{ height }}
      >
        <div className="p-4 bg-slate-800/50 rounded-full mb-3">
          <svg
            className="w-8 h-8 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <p className="text-slate-400 text-sm">No goals set yet</p>
        <p className="text-slate-500 text-xs mt-1">Create goals to track your progress</p>
      </div>
    );
  }

  if (showCompact) {
    // Compact view - horizontal progress bars
    return (
      <div className={cn("space-y-4", className)}>
        {sortedGoals.map((goal) => {
          const color = METRIC_COLORS[goal.metricType] || METRIC_COLORS.default;
          const isComplete = goal.completed;

          return (
            <div
              key={goal.id}
              className={cn(
                "p-4 rounded-xl bg-slate-900/50 border transition-all duration-300",
                isComplete
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-slate-800/50"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200">
                      {goal.metricType.replace(/_/g, " ").toUpperCase()}
                    </span>
                    {isComplete && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {TIMEFRAME_LABELS[goal.timeframe]} goal
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">
                    {formatNumber(goal.current)} / {formatNumber(goal.target)}
                  </p>
                  <p className="text-xs text-slate-400">{goal.unit}</p>
                </div>
              </div>

              <div className="relative h-2 bg-slate-800/50 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                    isComplete ? "bg-emerald-500" : ""
                  )}
                  style={{
                    width: `${Math.min(100, goal.progressPercentage)}%`,
                    backgroundColor: isComplete ? undefined : color,
                  }}
                />
              </div>

              <p className="text-xs text-slate-400 mt-2 text-right">
                {formatPercentage(goal.progressPercentage)}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // Full view - vertical bars chart
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <div className="h-full flex items-end justify-around gap-2 px-4">
        {sortedGoals.map((goal, index) => {
          const color = METRIC_COLORS[goal.metricType] || METRIC_COLORS.default;
          const isComplete = goal.completed;
          const barHeight = Math.min(100, goal.progressPercentage);

          // Animation delay for staggered effect
          const delay = index * 100;

          return (
            <div
              key={goal.id}
              className="flex-1 flex flex-col items-center group cursor-pointer"
            >
              {/* Progress bar */}
              <div className="relative w-full flex-1 flex items-end">
                {/* Background track */}
                <div className="absolute w-full h-full bg-slate-800/50 rounded-t-lg" />

                {/* Progress fill */}
                <div
                  className={cn(
                    "absolute w-full rounded-t-lg transition-all duration-700 ease-out",
                    isComplete ? "bg-gradient-to-t from-emerald-500 to-emerald-400" : ""
                  )}
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: isComplete ? undefined : color,
                    animationDelay: `${delay}ms`,
                  }}
                />

                {/* Current value indicator */}
                {goal.current >= goal.target * 0.9 && goal.current < goal.target && (
                  <div
                    className="absolute w-1 h-1 rounded-full bg-white shadow-lg"
                    style={{ bottom: `calc(${barHeight}% - 4px)` }}
                  />
                )}
              </div>

              {/* Label */}
              <div className="mt-3 text-center">
                <p className="text-xs font-medium text-slate-300 truncate max-w-[60px]">
                  {goal.metricType.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatPercentage(goal.progressPercentage)}
                </p>
              </div>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-slate-900/95 border border-slate-700/50 rounded-lg shadow-xl p-3 backdrop-blur-sm min-w-[160px]">
                  <p className="text-sm font-medium text-slate-200 mb-2">
                    {goal.metricType.replace(/_/g, " ")}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Current:</span>
                      <span className="text-white font-medium">
                        {formatNumber(goal.current)} {goal.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Target:</span>
                      <span className="text-white font-medium">
                        {formatNumber(goal.target)} {goal.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-700/50">
                      <span className="text-slate-400">Progress:</span>
                      <span className={cn("font-medium", isComplete ? "text-emerald-400" : "text-white")}>
                        {formatPercentage(goal.progressPercentage)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {TIMEFRAME_LABELS[goal.timeframe]}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GoalsChart;
