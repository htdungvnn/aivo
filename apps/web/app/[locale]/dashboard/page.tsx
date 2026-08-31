"use client";

/**
 * Today Dashboard - Main daily intelligence view
 * Shows readiness score, top recommendations, and quick metrics
 */

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { ScoreRing } from "@/components/shared/score-ring";
import { MetricCard } from "@/components/shared/metric-card";
import { ChartCard, SimpleChart } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, DashboardSkeleton } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  Heart,
  Utensils,
  Dumbbell,
  Moon,
  Droplets,
  Footprints,
  CheckCircle,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Flame,
  Clock,
  Battery,
  Brain,
  TrendingUp,
  Sun,
} from "lucide-react";

// Sample data for demonstration
const SAMPLE_READINESS = {
  score: 78,
  level: "Good",
  confidence: 0.85,
  topPositive: "Great sleep quality last night",
  topLimiting: "Slightly elevated stress levels",
};

const SAMPLE_METRICS = {
  calories: { current: 1450, target: 2200, remaining: 750 },
  protein: { current: 95, target: 150 },
  sleep: { duration: 7.5, quality: 82 },
  hydration: { current: 1600, target: 2500 },
  steps: { current: 6500, target: 10000 },
  habits: { completed: 4, total: 6 },
};

const SAMPLE_PLAN = [
  {
    id: "1",
    type: "meal",
    time: "Morning",
    label: "Breakfast",
    status: "completed",
    icon: Utensils,
  },
  {
    id: "2",
    type: "workout",
    time: "Afternoon",
    label: "Upper Body Strength",
    status: "pending",
    icon: Dumbbell,
  },
  {
    id: "3",
    type: "hydration",
    time: "Anytime",
    label: "Drink 500ml water",
    status: "pending",
    icon: Droplets,
  },
  {
    id: "4",
    type: "meal",
    time: "Evening",
    label: "Dinner",
    status: "pending",
    icon: Utensils,
  },
];

const SAMPLE_CHART_DATA = [
  { value: 65, label: "Mon" },
  { value: 72, label: "Tue" },
  { value: 68, label: "Wed" },
  { value: 75, label: "Thu" },
  { value: 71, label: "Fri" },
  { value: 78, label: "Sat" },
  { value: 74, label: "Sun" },
];

const SAMPLE_ACTIONS = [
  {
    id: "1",
    type: "primary",
    label: "Start today's workout",
    description: "Upper Body Strength - 45 min",
    icon: Dumbbell,
  },
  {
    id: "2",
    type: "secondary",
    label: "Log your lunch",
    description: "Track your meal to stay on target",
    icon: Utensils,
  },
  {
    id: "3",
    type: "secondary",
    label: "Drink more water",
    description: "You're 900ml below your goal",
    icon: Droplets,
  },
];

export default function TodayDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isDataLoading] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading your dashboard..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const greeting = getGreeting();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-foreground)]">
              {greeting}, {user?.displayName?.split(" ")[0] || "there"}
            </h1>
            <p className="text-[var(--color-muted-foreground)] mt-1">
              {today}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" className="gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
              All systems synced
            </Badge>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Readiness and Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Readiness Hero */}
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Score Ring */}
                  <div className="flex flex-col items-center">
                    <ScoreRing
                      score={SAMPLE_READINESS.score}
                      size="xl"
                      label="Readiness"
                      color="readiness"
                    />
                    <Badge
                      variant="primary"
                      className="mt-3"
                    >
                      {SAMPLE_READINESS.level}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <div>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        Your readiness score is based on sleep, recovery, activity, and other health metrics.
                      </p>
                      <p className="text-xs text-[var(--color-tertiary)] mt-1">
                        Confidence: {Math.round(SAMPLE_READINESS.confidence * 100)}%
                      </p>
                    </div>

                    {/* Positive Factor */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-success-muted)]">
                      <TrendingUp className="h-5 w-5 text-[var(--color-success)] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-success)]">
                          Top positive factor
                        </p>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {SAMPLE_READINESS.topPositive}
                        </p>
                      </div>
                    </div>

                    {/* Limiting Factor */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-warning-muted)]">
                      <Battery className="h-5 w-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-warning)]">
                          Top limiting factor
                        </p>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {SAMPLE_READINESS.topLimiting}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div>
              <h2 className="section-title mb-4">Recommended Actions</h2>
              <div className="space-y-3">
                {SAMPLE_ACTIONS.map((action) => (
                  <Card
                    key={action.id}
                    className={cn(
                      "group cursor-pointer transition-all hover:border-[var(--color-border-hover)]",
                      action.type === "primary" && "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "p-3 rounded-lg",
                            action.type === "primary"
                              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                              : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                          )}
                        >
                          <action.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--color-foreground)]">
                            {action.label}
                          </p>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {action.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--color-muted-foreground)] group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Readiness Trend Chart */}
            <ChartCard
              title="Readiness Trend"
              subtitle="Your readiness score over the past week"
              currentValue={SAMPLE_READINESS.score}
              unit="avg"
              trend="up"
              trendValue="+8"
              comparison="vs last week"
              ranges={[
                { label: "7D", value: "7d" },
                { label: "30D", value: "30d" },
                { label: "90D", value: "90d" },
              ]}
              selectedRange="7d"
              onRangeChange={() => {}}
            >
              <SimpleChart
                data={SAMPLE_CHART_DATA}
                height={200}
                color="var(--color-readiness)"
                showDots
                showLabels
              />
            </ChartCard>
          </div>

          {/* Right Column - Metrics and Plan */}
          <div className="space-y-6">
            {/* Today's Summary Cards */}
            <div>
              <h2 className="section-title mb-4">Today's Summary</h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Calories */}
                <MetricCard
                  label="Calories"
                  value={SAMPLE_METRICS.calories.current}
                  unit="/ 2200"
                  icon={<Flame className="h-4 w-4" />}
                  color="nutrition"
                  trend="up"
                  trendValue="+150"
                  href="/health/nutrition"
                  className="col-span-2"
                />

                {/* Protein */}
                <MetricCard
                  label="Protein"
                  value={`${SAMPLE_METRICS.protein.current}g`}
                  unit={`/ ${SAMPLE_METRICS.protein.target}g`}
                  icon={<Utensils className="h-4 w-4" />}
                  color="nutrition"
                  href="/health/nutrition"
                />

                {/* Sleep */}
                <MetricCard
                  label="Sleep"
                  value={SAMPLE_METRICS.sleep.duration}
                  unit="hrs"
                  icon={<Moon className="h-4 w-4" />}
                  color="sleep"
                  badge={`${SAMPLE_METRICS.sleep.quality}%`}
                  href="/health/sleep"
                />

                {/* Hydration */}
                <MetricCard
                  label="Hydration"
                  value={`${SAMPLE_METRICS.hydration.current}ml`}
                  unit={`/ ${SAMPLE_METRICS.hydration.target}ml`}
                  icon={<Droplets className="h-4 w-4" />}
                  color="hydration"
                  trend="down"
                  trendValue="-400ml"
                  href="/health/hydration"
                />

                {/* Steps */}
                <MetricCard
                  label="Steps"
                  value={SAMPLE_METRICS.steps.current.toLocaleString()}
                  unit={`/ ${(SAMPLE_METRICS.steps.target / 1000).toFixed(0)}k`}
                  icon={<Footprints className="h-4 w-4" />}
                  color="activity"
                  trend="up"
                  trendValue="+1.2k"
                  href="/health/activity"
                />

                {/* Habits */}
                <MetricCard
                  label="Habits"
                  value={`${SAMPLE_METRICS.habits.completed}/${SAMPLE_METRICS.habits.total}`}
                  icon={<CheckCircle className="h-4 w-4" />}
                  color="ai"
                  href="/health/habits"
                />
              </div>
            </div>

            {/* Today's Plan Preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">
                  Today's Plan
                </CardTitle>
                <Link href="/plan">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  {SAMPLE_PLAN.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-elevated)] transition-colors"
                    >
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          item.status === "completed"
                            ? "bg-[var(--color-success-muted)]"
                            : "bg-[var(--color-muted)]"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4",
                            item.status === "completed"
                              ? "text-[var(--color-success)]"
                              : "text-[var(--color-muted-foreground)]"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            item.status === "completed"
                              ? "text-[var(--color-muted-foreground)] line-through"
                              : "text-[var(--color-foreground)]"
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="text-xs text-[var(--color-tertiary)]">
                          {item.time}
                        </p>
                      </div>
                      {item.status === "completed" && (
                        <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Insight */}
            <Card className="bg-gradient-to-br from-[var(--color-ai-muted)] to-transparent border-[var(--color-ai)]/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-ai)]/20">
                    <Sparkles className="h-5 w-5 text-[var(--color-ai)]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[var(--color-ai)]">
                        AI Insight
                      </span>
                      <Badge variant="ai" size="sm">
                        Beta
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      Based on your recent sleep patterns and activity levels, consider a
                      moderate-intensity workout today rather than high intensity.
                    </p>
                    <Link href="/coach">
                      <Button variant="ghost" size="sm" className="mt-2 text-[var(--color-ai)]">
                        Ask AI Coach
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)] max-w-2xl mx-auto">
            AIVO provides general wellness guidance only. It does not provide medical
            diagnoses, prescribe treatment or medication, or guarantee health outcomes.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
