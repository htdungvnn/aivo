"use client";

/**
 * Progress Analytics Page - Trends, correlations, and milestones
 */

import React, { useState, useCallback } from "react";
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
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Download,
  Filter,
  Target,
  Award,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Heart,
  Utensils,
  Dumbbell,
  Moon,
  Droplets,
  Footprints,
  Scale,
  CheckCircle,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface MetricTrend {
  metric: string;
  label: string;
  current: number;
  average: number;
  trend: "improving" | "stable" | "declining";
  change: number;
  changePercent: number;
  unit: string;
  icon: React.ElementType;
  color: string;
}

interface Milestone {
  id: string;
  type: "achievement" | "streak" | "personal_best";
  title: string;
  description: string;
  date: string;
  value?: string;
}

interface Correlation {
  factor1: string;
  factor2: string;
  strength: "strong" | "moderate" | "weak";
  direction: "positive" | "negative";
  description: string;
}

// =============================================================================
// Sample Data
// =============================================================================

const METRIC_TRENDS: MetricTrend[] = [
  {
    metric: "readiness",
    label: "Readiness",
    current: 78,
    average: 72,
    trend: "improving",
    change: 6,
    changePercent: 8.3,
    unit: "",
    icon: Heart,
    color: "text-readiness",
  },
  {
    metric: "sleep",
    label: "Sleep Duration",
    current: 7.5,
    average: 7.2,
    trend: "improving",
    change: 0.3,
    changePercent: 4.2,
    unit: "hrs",
    icon: Moon,
    color: "text-sleep",
  },
  {
    metric: "calories",
    label: "Calorie Adherence",
    current: 85,
    average: 78,
    trend: "improving",
    change: 7,
    changePercent: 9.0,
    unit: "%",
    icon: Utensils,
    color: "text-nutrition",
  },
  {
    metric: "workouts",
    label: "Workout Completion",
    current: 92,
    average: 85,
    trend: "improving",
    change: 7,
    changePercent: 8.2,
    unit: "%",
    icon: Dumbbell,
    color: "text-workout",
  },
  {
    metric: "steps",
    label: "Daily Steps",
    current: 8500,
    average: 7800,
    trend: "stable",
    change: 700,
    changePercent: 9.0,
    unit: "",
    icon: Footprints,
    color: "text-activity",
  },
  {
    metric: "hydration",
    label: "Hydration",
    current: 78,
    average: 75,
    trend: "stable",
    change: 3,
    changePercent: 4.0,
    unit: "%",
    icon: Droplets,
    color: "text-hydration",
  },
];

const MILESTONES: Milestone[] = [
  {
    id: "1",
    type: "streak",
    title: "7-Day Workout Streak",
    description: "Completed a workout every day this week",
    date: "2026-08-30",
    value: "7 days",
  },
  {
    id: "2",
    type: "personal_best",
    title: "New Deadlift PR",
    description: "Lifted 225 lbs for 5 reps",
    date: "2026-08-28",
    value: "225 lbs",
  },
  {
    id: "3",
    type: "achievement",
    title: "Consistent Sleeper",
    description: "Maintained 7+ hours of sleep for 30 days",
    date: "2026-08-25",
    value: "30 days",
  },
  {
    id: "4",
    type: "personal_best",
    title: "Readiness Peak",
    description: "Achieved your highest readiness score",
    date: "2026-08-20",
    value: "92",
  },
];

const CORRELATIONS: Correlation[] = [
  {
    factor1: "Sleep Duration",
    factor2: "Readiness Score",
    strength: "strong",
    direction: "positive",
    description: "More sleep tends to correlate with higher readiness",
  },
  {
    factor1: "Training Load",
    factor2: "Recovery Status",
    strength: "moderate",
    direction: "negative",
    description: "Higher training load may impact recovery",
  },
  {
    factor1: "Hydration",
    factor2: "Energy Levels",
    strength: "moderate",
    direction: "positive",
    description: "Staying hydrated supports energy",
  },
];

const READINESS_TREND = [
  { value: 65, label: "Mon" },
  { value: 72, label: "Tue" },
  { value: 68, label: "Wed" },
  { value: 75, label: "Thu" },
  { value: 71, label: "Fri" },
  { value: 78, label: "Sat" },
  { value: 82, label: "Sun" },
];

const SLEEP_TREND = [
  { value: 6.5, label: "Mon" },
  { value: 7.0, label: "Tue" },
  { value: 7.2, label: "Wed" },
  { value: 7.5, label: "Thu" },
  { value: 7.0, label: "Fri" },
  { value: 7.8, label: "Sat" },
  { value: 7.5, label: "Sun" },
];

const CALORIE_TREND = [
  { value: 1800, label: "Mon" },
  { value: 2100, label: "Tue" },
  { value: 1950, label: "Wed" },
  { value: 2200, label: "Thu" },
  { value: 1900, label: "Fri" },
  { value: 2050, label: "Sat" },
  { value: 2100, label: "Sun" },
];

// =============================================================================
// Components
// =============================================================================

interface TrendCardProps {
  metric: MetricTrend;
  onClick?: () => void;
}

function TrendCard({ metric, onClick }: TrendCardProps) {
  const Icon = metric.icon;
  const TrendIcon = metric.trend === "improving" ? TrendingUp : metric.trend === "declining" ? TrendingDown : Minus;
  const trendColor = metric.trend === "improving" ? "text-[var(--color-success)]" : metric.trend === "declining" ? "text-[var(--color-error)]" : "text-[var(--color-muted-foreground)]";

  return (
    <MetricCard
      label={metric.label}
      value={metric.current}
      unit={metric.unit}
      icon={<Icon className="h-4 w-4" />}
      color={metric.color.replace("text-", "") as "readiness" | "sleep" | "nutrition" | "workout" | "activity" | "hydration" | "default"}
      trend={metric.trend === "improving" ? "up" : metric.trend === "declining" ? "down" : "stable"}
      trendValue={`${metric.changePercent > 0 ? "+" : ""}${metric.changePercent.toFixed(1)}%`}
      onClick={onClick}
      className="cursor-pointer"
    />
  );
}

interface MilestoneCardProps {
  milestone: Milestone;
}

function MilestoneCard({ milestone }: MilestoneCardProps) {
  const typeConfig = {
    achievement: { icon: Award, color: "text-[var(--color-accent)]", bg: "bg-[var(--color-accent)]/10" },
    streak: { icon: Flame, color: "text-[var(--color-workout)]", bg: "bg-[var(--color-workout-muted)]" },
    personal_best: { icon: Target, color: "text-[var(--color-success)]", bg: "bg-[var(--color-success-muted)]" },
  };

  const config = typeConfig[milestone.type];
  const Icon = config.icon;

  return (
    <Card className="hover:border-[var(--color-border-hover)] transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-[var(--color-foreground)]">
                {milestone.title}
              </h3>
              {milestone.value && (
                <Badge variant="primary" size="sm">
                  {milestone.value}
                </Badge>
              )}
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              {milestone.description}
            </p>
            <p className="text-xs text-[var(--color-tertiary)] mt-2">
              {new Date(milestone.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CorrelationCardProps {
  correlation: Correlation;
}

function CorrelationCard({ correlation }: CorrelationCardProps) {
  const strengthColors = {
    strong: "border-[var(--color-success)]/30",
    moderate: "border-[var(--color-warning)]/30",
    weak: "border-[var(--color-muted)]",
  };

  const directionIcon = correlation.direction === "positive" ? ArrowUpRight : ArrowDownRight;
  const directionColor = correlation.direction === "positive" ? "text-[var(--color-success)]" : "text-[var(--color-error)]";

  return (
    <Card className={cn("border-l-4", strengthColors[correlation.strength])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--color-foreground)]">
                {correlation.factor1}
              </span>
              <span className="text-xs text-[var(--color-tertiary)]">&</span>
              <span className="text-sm font-medium text-[var(--color-foreground)]">
                {correlation.factor2}
              </span>
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {correlation.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="subtle" size="sm" className="capitalize">
              {correlation.strength}
            </Badge>
            <div className={cn("flex items-center gap-1 text-xs", directionColor)}>
              <directionIcon className="h-3 w-3" />
              {correlation.direction}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ProgressPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [selectedRange, setSelectedRange] = useState("7d");
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"overview" | "trends" | "correlations">("overview");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading progress data..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Progress
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Track your wellness trends and achievements
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-muted)] w-fit">
          {(["overview", "trends", "correlations"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize",
                activeView === view
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              )}
            >
              {view}
            </button>
          ))}
        </div>

        {activeView === "overview" && (
          <>
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {METRIC_TRENDS.map((metric) => (
                <TrendCard key={metric.metric} metric={metric} />
              ))}
            </div>

            {/* Key Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ChartCard
                title="Readiness Trend"
                currentValue="78"
                unit="avg"
                trend="up"
                trendValue="+8"
                ranges={[
                  { label: "7D", value: "7d" },
                  { label: "30D", value: "30d" },
                  { label: "90D", value: "90d" },
                ]}
                selectedRange={selectedRange}
                onRangeChange={setSelectedRange}
              >
                <SimpleChart
                  data={READINESS_TREND}
                  height={200}
                  color="var(--color-readiness)"
                />
              </ChartCard>

              <ChartCard
                title="Sleep Duration"
                currentValue="7.5"
                unit="hrs avg"
                trend="up"
                trendValue="+0.3"
                ranges={[
                  { label: "7D", value: "7d" },
                  { label: "30D", value: "30d" },
                  { label: "90D", value: "90d" },
                ]}
                selectedRange={selectedRange}
                onRangeChange={setSelectedRange}
              >
                <SimpleChart
                  data={SLEEP_TREND}
                  height={200}
                  color="var(--color-sleep)"
                />
              </ChartCard>

              <ChartCard
                title="Calorie Intake"
                currentValue="2014"
                unit="kcal avg"
                trend="stable"
                ranges={[
                  { label: "7D", value: "7d" },
                  { label: "30D", value: "30d" },
                  { label: "90D", value: "90d" },
                ]}
                selectedRange={selectedRange}
                onRangeChange={setSelectedRange}
              >
                <SimpleChart
                  data={CALORIE_TREND}
                  height={200}
                  color="var(--color-nutrition)"
                />
              </ChartCard>
            </div>

            {/* Milestones */}
            <div>
              <h2 className="section-title mb-4">Recent Milestones</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MILESTONES.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} />
                ))}
              </div>
            </div>
          </>
        )}

        {activeView === "trends" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Readiness Over Time"
              subtitle="Your readiness score trend"
              currentValue="78"
              unit="avg"
              trend="up"
              trendValue="+8%"
              ranges={[
                { label: "7D", value: "7d" },
                { label: "30D", value: "30d" },
                { label: "90D", value: "90d" },
              ]}
              selectedRange={selectedRange}
              onRangeChange={setSelectedRange}
            >
              <SimpleChart
                data={READINESS_TREND}
                height={300}
                color="var(--color-readiness)"
                showDots
                showLabels
              />
            </ChartCard>

            <ChartCard
              title="Sleep Duration"
              subtitle="Hours of sleep per night"
              currentValue="7.5"
              unit="hrs"
              trend="up"
              trendValue="+4%"
              ranges={[
                { label: "7D", value: "7d" },
                { label: "30D", value: "30d" },
                { label: "90D", value: "90d" },
              ]}
              selectedRange={selectedRange}
              onRangeChange={setSelectedRange}
            >
              <SimpleChart
                data={SLEEP_TREND}
                height={300}
                color="var(--color-sleep)"
                showDots
                showLabels
              />
            </ChartCard>

            <ChartCard
              title="Calorie Intake"
              subtitle="Daily caloric intake"
              currentValue="2014"
              unit="kcal"
              trend="stable"
              ranges={[
                { label: "7D", value: "7d" },
                { label: "30D", value: "30d" },
                { label: "90D", value: "90d" },
              ]}
              selectedRange={selectedRange}
              onRangeChange={setSelectedRange}
            >
              <SimpleChart
                data={CALORIE_TREND}
                height={300}
                color="var(--color-nutrition)"
                showDots
                showLabels
              />
            </ChartCard>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workout Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center text-[var(--color-muted-foreground)]">
                    <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Workout volume chart</p>
                    <p className="text-sm">Coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === "correlations" && (
          <div className="space-y-6">
            <div>
              <h2 className="section-title mb-2">Health Correlations</h2>
              <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                Relationships between different health metrics. Use caution when interpreting — correlation does not imply causation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CORRELATIONS.map((correlation, index) => (
                <CorrelationCard key={index} correlation={correlation} />
              ))}
            </div>

            <Card className="bg-[var(--color-muted)]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-info-muted)]">
                    <svg className="h-5 w-5 text-[var(--color-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      About Correlation Analysis
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                      Correlations show relationships between metrics but do not prove that one factor causes another.
                      Many factors work together to influence your health. Consult with healthcare professionals
                      for personalized guidance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance only. Correlations are informational and do not constitute medical advice.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
