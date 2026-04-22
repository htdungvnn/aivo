import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import type { CorrelationFinding } from "@aivo/shared-types";

interface CorrelationCardProps {
  finding: CorrelationFinding;
  onDismiss?: (id: string) => void;
}

export function CorrelationCard({ finding, onDismiss }: CorrelationCardProps) {
  const { factorA, factorB, correlationCoefficient, pValue, confidence, actionableInsight, outlierDates } = finding;

  const absCorrelation = Math.abs(correlationCoefficient);
  const isPositive = correlationCoefficient > 0;
  const isSignificant = pValue < 0.05;

  const getStrengthLabel = () => {
    if (absCorrelation >= 0.7) {return { label: "Strong", color: "bg-red-500/20 text-red-300 border-red-500/30" };}
    if (absCorrelation >= 0.4) {return { label: "Moderate", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" };}
    return { label: "Weak", color: "bg-gray-500/20 text-gray-300 border-gray-500/30" };
  };

  const strength = getStrengthLabel();

  const factorDisplayNames: Record<string, string> = {
    sleep_duration: "Sleep Duration",
    sleep_quality: "Sleep Quality",
    deep_sleep: "Deep Sleep",
    rem_sleep: "REM Sleep",
    sleep_consistency: "Sleep Consistency",
    bedtime: "Bedtime",
    workout_intensity: "Workout Intensity",
    workout_duration: "Workout Duration",
    consecutive_days: "Consecutive Days",
    rest_days: "Rest Days",
    exercise_variety: "Exercise Variety",
    rpe_average: "Exercise Effort",
    calorie_deficit: "Calorie Deficit",
    protein_intake: "Protein Intake",
    carb_intake: "Carbohydrate Intake",
    fat_intake: "Fat Intake",
    macro_balance: "Macro Balance",
    late_nutrition: "Late Night Eating",
    hydration: "Hydration",
    meal_consistency: "Meal Consistency",
    recovery_score: "Recovery Score",
  };

  const formatFactor = (factor: string) => factorDisplayNames[factor] || factor.replace(/_/g, " ");

  return (
    <Card className="bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-900/60 border-slate-700/50 hover:border-cyan-500/30 transition-all overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        isPositive ? "from-emerald-500 to-green-500" : "from-rose-500 to-red-500"
      }`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${
              isPositive ? "bg-emerald-500/20" : "bg-rose-500/20"
            }`}>
              <BarChart3 className={`w-4 h-4 ${isPositive ? "text-emerald-400" : "text-rose-400"}`} />
            </div>
            <div>
              <CardTitle className="text-base text-white">
                {formatFactor(factorA)} → {formatFactor(factorB)}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={strength.color}>{strength.label}</Badge>
                {isSignificant ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                    Statistically Significant
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-slate-800 text-gray-400 border-slate-700">
                    Not Significant
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className={`text-2xl font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositive ? "+" : ""}{correlationCoefficient.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">p = {pValue.toFixed(4)}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Insight */}
        <p className="text-sm text-gray-300 leading-relaxed">{actionableInsight}</p>

        {/* Anomalies */}
        {outlierDates && outlierDates.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Anomaly Detected</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              Unusual values on these dates may indicate:
            </p>
            <div className="flex flex-wrap gap-2">
              {outlierDates.slice(0, 5).map((date, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-200"
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

        {/* Stats Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(finding.id)}
              className="h-6 text-xs text-gray-400 hover:text-white hover:bg-slate-800 p-0"
            >
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
