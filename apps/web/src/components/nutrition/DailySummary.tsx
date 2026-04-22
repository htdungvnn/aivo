"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNutrition } from "./useNutrition";
import type { DailyNutritionSummary } from "@aivo/shared-types";

interface NutritionDashboardProps {
  date?: Date;
  className?: string;
}

export function NutritionDashboard({ date = new Date(), className }: NutritionDashboardProps) {
  const { getDailySummary, getMacroTargets } = useNutrition();
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [targets, setTargets] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const dateStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [summaryData, targetsData] = await Promise.all([
          getDailySummary(dateStr),
          getMacroTargets(),
        ]);
        setSummary(summaryData);
        setTargets(targetsData);
      } catch (err) {
        console.error("Failed to load nutrition data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dateStr, getDailySummary, getMacroTargets]);

  const getProgressPercentage = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded" />
              <div className="h-8 bg-muted rounded" />
              <div className="h-8 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No nutrition data available</p>
        </CardContent>
      </Card>
    );
  }

  const macros = [
    { label: "Calories", current: summary.totalCalories, target: summary.targetCalories, unit: "cal", color: "bg-orange-500" },
    { label: "Protein", current: summary.totalProtein, target: summary.targetProtein, unit: "g", color: "bg-red-500" },
    { label: "Carbs", current: summary.totalCarbs, target: summary.targetCarbs, unit: "g", color: "bg-yellow-500" },
    { label: "Fat", current: summary.totalFat, target: summary.targetFat, unit: "g", color: "bg-blue-500" },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-5" />
          Nutrition Dashboard
        </CardTitle>
        <p className="text-sm text-muted-foreground">{format(date, "EEEE, MMMM d, yyyy")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Macros Progress */}
        <div className="space-y-4">
          {macros.map((macro) => {
            const percentage = getProgressPercentage(macro.current, macro.target);
            return (
              <div key={macro.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{macro.label}</span>
                  <span className="text-muted-foreground">
                    {macro.current.toFixed(0)} / {macro.target.toFixed(0)} {macro.unit}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${macro.color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {percentage}% of daily target
                </p>
              </div>
            );
          })}
        </div>

        {/* Meals Breakdown */}
        {summary.meals && Object.keys(summary.meals).length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="size-4" />
              Meals Today
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(summary.meals).map(([mealType, meal]) => (
                meal && (
                  <div key={mealType} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium capitalize">{mealType.replace("_", " ")}</p>
                    <p className="text-lg font-bold">{meal.calories} cal</p>
                    <p className="text-xs text-muted-foreground">
                      {meal.itemCount} item{meal.itemCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Targets Info */}
        {targets && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Target className="size-4" />
              Your Targets
            </h4>
            <p className="text-sm text-muted-foreground">
              Based on your profile and goals. Targets can be adjusted in settings.
            </p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="border-t pt-4 grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{summary.foodLogCount}</p>
            <p className="text-xs text-muted-foreground">Foods Logged</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{macros.reduce((acc, m) => acc + m.current, 0).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Calories</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
