"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, TrendingUp, TrendingDown } from "lucide-react";

interface RecoveryScoreDisplayProps {
  score: number;
  trend?: "improving" | "stable" | "declining";
  change?: number;
}

const gradeColors = {
  excellent: "from-emerald-500 to-green-500",
  good: "from-cyan-500 to-blue-500",
  fair: "from-yellow-500 to-orange-500",
  poor: "from-orange-500 to-red-500",
  critical: "from-red-500 to-rose-600",
} as const;

const gradeLabels = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  critical: "Critical",
} as const;

export function getGrade(score: number): keyof typeof gradeLabels {
  if (score >= 80) {
    return "excellent";
  }
  if (score >= 65) {
    return "good";
  }
  if (score >= 50) {
    return "fair";
  }
  if (score >= 35) {
    return "poor";
  }
  return "critical";
}

const RecoveryScoreDisplay = memo(function RecoveryScoreDisplay({
  score,
  trend,
  change,
}: RecoveryScoreDisplayProps) {
  const grade = getGrade(score);
  const trendColor =
    trend === "improving"
      ? "text-emerald-400"
      : trend === "declining"
      ? "text-red-400"
      : "text-gray-400";
  const TrendIcon = trend === "improving" || trend === "stable" ? TrendingUp : TrendingDown;

  return (
    <Card className="bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-900/60 border-slate-700/50 overflow-hidden relative">
      <div className={`absolute inset-0 bg-gradient-to-r ${gradeColors[grade]} opacity-10`} />
      <CardContent className="pt-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradeColors[grade]} shadow-lg`}>
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Recovery Score</p>
              <p className="text-2xl font-bold text-white">{Math.round(score)}%</p>
            </div>
          </div>
          <Badge className={`bg-gradient-to-r ${gradeColors[grade]} text-white border-0`}>
            {gradeLabels[grade]}
          </Badge>
        </div>

        {change !== undefined && (
          <div className={`flex items-center gap-2 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}% from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

RecoveryScoreDisplay.displayName = "RecoveryScoreDisplay";

export { RecoveryScoreDisplay };
export type { RecoveryScoreDisplayProps };
