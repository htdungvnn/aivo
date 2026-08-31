"use client";

/**
 * Body Metrics Page - Weight and body measurements tracking
 */

import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { ChartCard, SimpleChart } from "@/components/shared/chart-card";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  Plus,
  Edit,
  Info,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface BodyMetric {
  id: string;
  type: "weight" | "body_fat" | "muscle_mass" | "waist" | "chest" | "hips";
  value: number;
  unit: string;
  date: string;
  source: "manual" | "smart_scale";
}

interface BodyMetricTarget {
  type: string;
  min?: number;
  max?: number;
  goal?: number;
}

// =============================================================================
// Sample Data
// =============================================================================

const CURRENT_WEIGHT = 78.5;
const TARGET_WEIGHT = 75.0;
const BODY_FAT = 18.5;
const MUSCLE_MASS = 38.2;

const WEIGHT_TREND = [
  { value: 80.2, label: "Mon" },
  { value: 79.8, label: "Tue" },
  { value: 79.5, label: "Wed" },
  { value: 79.1, label: "Thu" },
  { value: 78.8, label: "Fri" },
  { value: 78.6, label: "Sat" },
  { value: 78.5, label: "Sun" },
];

const BODY_FAT_TREND = [
  { value: 19.8, label: "Mon" },
  { value: 19.6, label: "Tue" },
  { value: 19.4, label: "Wed" },
  { value: 19.2, label: "Thu" },
  { value: 18.8, label: "Fri" },
  { value: 18.6, label: "Sat" },
  { value: 18.5, label: "Sun" },
];

const METRIC_TARGETS: BodyMetricTarget[] = [
  { type: "Weight", min: 73, max: 77, goal: 75 },
  { type: "Body Fat", max: 20, goal: 15 },
  { type: "Muscle Mass", min: 38, goal: 40 },
];

// =============================================================================
// Components
// =============================================================================

interface TrendIndicatorProps {
  value: number;
  unit: string;
  trend: "improving" | "stable" | "declining";
  goalDirection: "down" | "up" | "stable";
}

function TrendIndicator({ value, unit, trend, goalDirection }: TrendIndicatorProps) {
  const isGood = goalDirection === "down"
    ? trend === "declining" || trend === "stable" && value <= (METRIC_TARGETS.find(t => t.type === unit)?.max || Infinity)
    : trend === "improving" || trend === "stable" && value >= (METRIC_TARGETS.find(t => t.type === unit)?.min || 0);

  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
  const trendColor = isGood ? "text-[var(--color-success)]" : "text-[var(--color-warning)]";

  return (
    <div className={cn("flex items-center gap-1", trendColor)}>
      <TrendIcon className="h-4 w-4" />
      <span className="text-sm font-medium capitalize">{trend}</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function BodyPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [selectedRange, setSelectedRange] = useState("7d");
  const [selectedMetric, setSelectedMetric] = useState<"weight" | "body_fat" | "muscle">("weight");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading body metrics..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const weightChange = CURRENT_WEIGHT - WEIGHT_TREND[0].value;
  const bodyFatChange = BODY_FAT - BODY_FAT_TREND[0].value;
  const muscleChange = MUSCLE_MASS - 37.8; // Assume starting value

  const getTrendDirection = (change: number): "improving" | "stable" | "declining" => {
    if (Math.abs(change) < 0.1) return "stable";
    return change < 0 ? "improving" : "declining";
  };

  return (
    <AppShell
      user={
        user
          ? {
              name: user.displayName || user.email,
              email: user.email,
              avatar: user.avatarUrl || undefined,
            }
          : undefined
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Body Metrics
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Track your weight and body composition
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Log Entry
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Measurement
            </Button>
          </div>
        </div>

        {/* Main Weight Display */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Weight Display */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-8 border-[var(--color-weight-muted)] flex items-center justify-center">
                    <div className="text-center">
                      <Scale className="h-6 w-6 mx-auto text-[var(--color-weight)] mb-1" />
                      <span className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">
                        {CURRENT_WEIGHT}
                      </span>
                      <p className="text-xs text-[var(--color-muted-foreground)]">kg</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">Current weight</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
                      {CURRENT_WEIGHT}
                    </span>
                    <span className="text-lg text-[var(--color-muted-foreground)]">kg</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendIndicator
                      value={weightChange}
                      unit="Weight"
                      trend={getTrendDirection(weightChange)}
                      goalDirection="down"
                    />
                    <span className="text-sm text-[var(--color-tertiary)]">
                      {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg this week
                    </span>
                  </div>
                </div>
              </div>

              {/* Goal Progress */}
              <div className="flex-1 lg:pl-8 lg:border-l lg:border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Goal</span>
                  <span className="text-sm font-medium text-[var(--color-foreground)] tabular-nums">
                    {TARGET_WEIGHT} kg
                  </span>
                </div>
                <div className="h-3 rounded-full bg-[var(--color-muted)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      CURRENT_WEIGHT <= TARGET_WEIGHT
                        ? "bg-[var(--color-success)]"
                        : "bg-[var(--color-weight)]"
                    )}
                    style={{
                      width: `${Math.min(
                        ((WEIGHT_TREND[0].value - CURRENT_WEIGHT) /
                          (WEIGHT_TREND[0].value - TARGET_WEIGHT)) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--color-tertiary)] mt-2">
                  {CURRENT_WEIGHT <= TARGET_WEIGHT
                    ? "Goal reached!"
                    : `${(CURRENT_WEIGHT - TARGET_WEIGHT).toFixed(1)} kg to go`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Weight"
            value={CURRENT_WEIGHT}
            unit="kg"
            icon={<Scale className="h-4 w-4" />}
            color="weight"
            trend={weightChange < 0 ? "up" : weightChange > 0 ? "down" : "stable"}
            trendValue={`${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg`}
          />
          <MetricCard
            label="Body Fat"
            value={BODY_FAT}
            unit="%"
            icon={<Target className="h-4 w-4" />}
            color="workout"
            trend={bodyFatChange < 0 ? "up" : bodyFatChange > 0 ? "down" : "stable"}
            trendValue={`${bodyFatChange > 0 ? "+" : ""}${bodyFatChange.toFixed(1)}%`}
          />
          <MetricCard
            label="Muscle Mass"
            value={MUSCLE_MASS}
            unit="kg"
            icon={<TrendingUp className="h-4 w-4" />}
            color="activity"
            trend={muscleChange >= 0 ? "up" : "down"}
            trendValue={`${muscleChange >= 0 ? "+" : ""}${muscleChange.toFixed(1)} kg`}
          />
        </div>

        {/* Metric Selector */}
        <div className="flex gap-2 p-1 rounded-lg bg-[var(--color-muted)] w-fit">
          {[
            { id: "weight", label: "Weight" },
            { id: "body_fat", label: "Body Fat" },
            { id: "muscle", label: "Muscle Mass" },
          ].map((metric) => (
            <button
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id as typeof selectedMetric)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                selectedMetric === metric.id
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              )}
            >
              {metric.label}
            </button>
          ))}
        </div>

        {/* Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Weight Trend"
            subtitle="Daily weight measurement"
            currentValue={CURRENT_WEIGHT.toString()}
            unit="kg"
            trend={weightChange < 0 ? "up" : "stable"}
            trendValue={`${Math.abs(weightChange).toFixed(1)} kg`}
            ranges={[
              { label: "7D", value: "7d" },
              { label: "30D", value: "30d" },
              { label: "90D", value: "90d" },
            ]}
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          >
            <SimpleChart
              data={WEIGHT_TREND}
              height={200}
              color="var(--color-weight)"
              showDots
              showLabels
            />
          </ChartCard>

          <ChartCard
            title="Body Fat Trend"
            subtitle="Body fat percentage over time"
            currentValue={BODY_FAT.toString()}
            unit="%"
            trend={bodyFatChange < 0 ? "up" : "stable"}
            trendValue={`${Math.abs(bodyFatChange).toFixed(1)}%`}
            ranges={[
              { label: "7D", value: "7d" },
              { label: "30D", value: "30d" },
              { label: "90D", value: "90d" },
            ]}
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          >
            <SimpleChart
              data={BODY_FAT_TREND}
              height={200}
              color="var(--color-workout)"
              showDots
              showLabels
            />
          </ChartCard>
        </div>

        {/* Info Card */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <p className="font-medium text-[var(--color-foreground)] mb-1">
                  About Body Metrics
                </p>
                <p>
                  Body metrics are tracked based on your logged measurements and connected
                  devices. Weight can fluctuate due to hydration, food intake, and time of
                  day. For accurate tracking, weigh yourself at the same time each day.
                  AIVO provides general wellness guidance and does not provide medical
                  advice regarding body composition.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance. Body composition metrics are
            estimates and may not be accurate for all individuals. Consult a healthcare
            professional for personalized body composition advice.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
