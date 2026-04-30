"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, AlertTriangle } from "lucide-react";
import type { CorrelationFinding } from "@aivo/shared-types";

interface CorrelationCardProps {
  finding: CorrelationFinding;
  onDismiss?: () => void;
}

/**
 * CorrelationCard - Displays statistical correlation findings
 * Memoized for performance
 */
const CorrelationCard = memo(function CorrelationCard({
  finding,
  onDismiss,
}: CorrelationCardProps) {
  const {
    factorA,
    factorB,
    correlationCoefficient,
    pValue,
    actionableInsight,
    outlierDates,
    confidence,
  } = finding;

  const strength = Math.abs(correlationCoefficient);
  const strengthLabel =
    strength >= 0.7 ? "Strong" : strength >= 0.4 ? "Moderate" : "Weak";
  const isSignificant = pValue < 0.05;

  return (
    <Card className="bg-slate-900/60 border-slate-700/50 hover:border-cyan-500/30 transition-all">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">
              {factorA.replace(/_/g, " ")} → {factorB.replace(/_/g, " ")}
            </span>
          </div>
          <Badge
            variant={isSignificant ? "default" : "outline"}
            className={
              isSignificant
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-slate-800 text-gray-400"
            }
          >
            {strengthLabel} ({correlationCoefficient.toFixed(2)})
          </Badge>
        </div>

        <p className="text-sm text-gray-300 mb-3 leading-relaxed">
          {actionableInsight || finding.explanation}
        </p>

        {outlierDates.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Anomaly{outlierDates.length > 1 ? "s" : ""} detected</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {outlierDates.slice(0, 3).map((date, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-300"
                >
                  {date}
                </Badge>
              ))}
              {outlierDates.length > 3 && (
                <Badge variant="outline" className="text-xs bg-slate-800 text-gray-400">
                  +{outlierDates.length - 3} more
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
          <button
            onClick={onDismiss}
            className="mt-2 text-xs text-gray-500 hover:text-gray-300"
            aria-label="Dismiss correlation"
          >
            Dismiss
          </button>
        )}
      </CardContent>
    </Card>
  );
});

CorrelationCard.displayName = "CorrelationCard";

export default CorrelationCard;
