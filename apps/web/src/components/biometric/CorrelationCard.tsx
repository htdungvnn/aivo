"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, AlertTriangle, X } from "lucide-react";
import type { CorrelationFinding } from "@aivo/shared-types";

interface CorrelationCardProps {
  finding: CorrelationFinding;
  onDismiss?: (id: string) => void;
}

// Map factor keys to user-friendly names
const factorDisplayNames: Record<string, string> = {
  sleep_duration: "Sleep Duration",
  sleep_quality: "Sleep Quality",
  deep_sleep: "Deep Sleep",
  recovery_score: "Recovery Score",
  workout_intensity: "Workout Intensity",
  exercise_load: "Exercise Load",
  late_nutrition: "Late Night Eating",
  nutrition_consistency: "Nutrition Consistency",
  stress_level: "Stress Level",
  heart_rate_variability: "Heart Rate Variability",
};

function formatFactorName(factor: string): string {
  return (
    factorDisplayNames[factor] ||
    factor.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

const CorrelationCard = memo(function CorrelationCard({
  finding,
  onDismiss,
}: CorrelationCardProps) {
  const { factorA, factorB, correlationCoefficient, pValue, confidence, outlierDates, actionableInsight } = finding;

  const strength = Math.abs(correlationCoefficient);
  const strengthLabel =
    strength >= 0.7 ? "Strong" : strength >= 0.4 ? "Moderate" : "Weak";
  const isSignificant = pValue < 0.05;
  const isNegative = correlationCoefficient < 0;

  return (
    <Card className="bg-slate-900/60 border-slate-700/50 hover:border-cyan-500/30 transition-all">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">
              {formatFactorName(factorA)} → {formatFactorName(factorB)}
            </span>
          </div>
          <Badge
            variant={isSignificant ? "default" : "outline"}
            className={
              isSignificant
                ? isNegative
                  ? "bg-red-500/20 text-red-300 border-red-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-slate-800 text-gray-400"
            }
          >
            {strengthLabel} ({correlationCoefficient.toFixed(2)})
          </Badge>
        </div>

        <p className="text-sm text-gray-300 mb-3 leading-relaxed">{actionableInsight}</p>

        {outlierDates.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Anomaly{outlierDates.length > 1 ? "ies" : ""} detected</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {outlierDates.slice(0, 5).map((date, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-300"
                >
                  {date}
                </Badge>
              ))}
              {outlierDates.length > 5 && (
                <Badge variant="outline" className="text-xs bg-slate-800 text-gray-400">
                  +{outlierDates.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-gray-500">
          <span>p-value: {pValue.toFixed(4)}</span>
          <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
        </div>

        {onDismiss && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(finding.id)}
              className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-3 h-3 mr-1" />
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CorrelationCard.displayName = "CorrelationCard";

export default CorrelationCard;
