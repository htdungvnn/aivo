"use client";

/**
 * Activity Page - Steps, movement, and activity tracking
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
  Footprints,
  Flame,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Bike,
  Activity as ActivityIcon,
  Zap,
  Timer,
} from "lucide-react";

// =============================================================================
// Sample Data
// =============================================================================

const ACTIVITY_DATA = {
  steps: 8450,
  stepTarget: 10000,
  activeMinutes: 45,
  activeMinutesTarget: 60,
  distance: 6.2,
  calories: 320,
  workouts: 2,
  streak: 7,
};

const STEPS_TREND = [
  { value: 7800, label: "Mon" },
  { value: 9200, label: "Tue" },
  { value: 6500, label: "Wed" },
  { value: 10500, label: "Thu" },
  { value: 8400, label: "Fri" },
  { value: 11200, label: "Sat" },
  { value: 8450, label: "Sun" },
];

const ACTIVE_MINUTES_TREND = [
  { value: 35, label: "Mon" },
  { value: 55, label: "Tue" },
  { value: 28, label: "Wed" },
  { value: 60, label: "Thu" },
  { value: 42, label: "Fri" },
  { value: 75, label: "Sat" },
  { value: 45, label: "Sun" },
];

const RECENT_ACTIVITY = [
  {
    id: "1",
    type: "walking",
    name: "Morning walk",
    duration: 25,
    calories: 120,
    time: "7:30 AM",
  },
  {
    id: "2",
    type: "workout",
    name: "Strength training",
    duration: 45,
    calories: 280,
    time: "12:00 PM",
  },
  {
    id: "3",
    type: "cycling",
    name: "Evening bike ride",
    duration: 30,
    calories: 180,
    time: "5:30 PM",
  },
];

// =============================================================================
// Main Component
// =============================================================================

export default function ActivityPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [selectedRange, setSelectedRange] = useState("7d");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading activity data..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const stepsProgress = (ACTIVITY_DATA.steps / ACTIVITY_DATA.stepTarget) * 100;
  const activeProgress = (ACTIVITY_DATA.activeMinutes / ACTIVITY_DATA.activeMinutesTarget) * 100;

  const activityTypeIcons: Record<string, React.ElementType> = {
    walking: Footprints,
    workout: ActivityIcon,
    cycling: Bike,
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
              Activity
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Track your steps, movement, and active minutes
            </p>
          </div>
          <Badge variant="primary" className="w-fit gap-1">
            <Flame className="h-4 w-4 text-[var(--color-workout)]" />
            {ACTIVITY_DATA.streak} day streak
          </Badge>
        </div>

        {/* Main Activity Summary */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Steps Circle */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full border-8 border-[var(--color-muted)] flex items-center justify-center relative">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="var(--color-muted)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="var(--color-activity)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${stepsProgress * 2.64} 264`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <Footprints className="h-6 w-6 mx-auto text-[var(--color-activity)] mb-1" />
                      <span className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">
                        {(ACTIVITY_DATA.steps / 1000).toFixed(1)}k
                      </span>
                      <p className="text-xs text-[var(--color-muted-foreground)]">steps</p>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--color-activity)] text-[var(--color-primary-foreground)] text-xs font-medium">
                    {Math.round(stepsProgress)}% of goal
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">Daily target</p>
                  <p className="text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
                    {ACTIVITY_DATA.stepTarget.toLocaleString()}
                  </p>
                  <p className="text-sm text-[var(--color-tertiary)]">steps</p>
                  <p className="text-sm text-[var(--color-success)] mt-2">
                    {(ACTIVITY_DATA.stepTarget - ACTIVITY_DATA.steps).toLocaleString()} to go
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-2 gap-4 lg:pl-8 lg:border-l lg:border-[var(--color-border)]">
                <div className="p-3 rounded-lg bg-[var(--color-muted)]">
                  <div className="flex items-center gap-2 text-[var(--color-muted-foreground)] mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Active minutes</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-[var(--color-foreground)] tabular-nums">
                      {ACTIVITY_DATA.activeMinutes}
                    </span>
                    <span className="text-sm text-[var(--color-tertiary)]">
                      / {ACTIVITY_DATA.activeMinutesTarget}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-workout)] transition-all"
                      style={{ width: `${activeProgress}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-muted)]">
                  <div className="flex items-center gap-2 text-[var(--color-muted-foreground)] mb-1">
                    <ActivityIcon className="h-4 w-4" />
                    <span className="text-xs">Distance</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-[var(--color-foreground)] tabular-nums">
                      {ACTIVITY_DATA.distance}
                    </span>
                    <span className="text-sm text-[var(--color-tertiary)]">km</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-muted)]">
                  <div className="flex items-center gap-2 text-[var(--color-muted-foreground)] mb-1">
                    <Flame className="h-4 w-4" />
                    <span className="text-xs">Calories burned</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-[var(--color-foreground)] tabular-nums">
                      {ACTIVITY_DATA.calories}
                    </span>
                    <span className="text-sm text-[var(--color-tertiary)]">kcal</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-muted)]">
                  <div className="flex items-center gap-2 text-[var(--color-muted-foreground)] mb-1">
                    <ActivityIcon className="h-4 w-4" />
                    <span className="text-xs">Workouts</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-[var(--color-foreground)] tabular-nums">
                      {ACTIVITY_DATA.workouts}
                    </span>
                    <span className="text-sm text-[var(--color-tertiary)]">today</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Daily Steps"
            value={ACTIVITY_DATA.steps.toLocaleString()}
            icon={<Footprints className="h-4 w-4" />}
            color="activity"
            trend="up"
            trendValue="+1.2k"
          />
          <MetricCard
            label="Active Minutes"
            value={ACTIVITY_DATA.activeMinutes}
            unit={`/ ${ACTIVITY_DATA.activeMinutesTarget}`}
            icon={<Clock className="h-4 w-4" />}
            color="workout"
            trend="up"
            trendValue="+5"
          />
          <MetricCard
            label="Distance"
            value={ACTIVITY_DATA.distance}
            unit="km"
            icon={<Footprints className="h-4 w-4" />}
            color="activity"
            trend="stable"
          />
          <MetricCard
            label="Calories Burned"
            value={ACTIVITY_DATA.calories}
            unit="kcal"
            icon={<Flame className="h-4 w-4" />}
            color="workout"
            trend="up"
            trendValue="+45"
          />
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="section-title mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((activity) => {
              const Icon = activityTypeIcons[activity.type] || ActivityIcon;
              return (
                <Card key={activity.id} className="hover:border-[var(--color-border-hover)]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-[var(--color-activity-muted)]">
                        <Icon className="h-5 w-5 text-[var(--color-activity)]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-[var(--color-foreground)]">
                          {activity.name}
                        </h3>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {activity.time}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-[var(--color-muted-foreground)]">
                            <Timer className="h-4 w-4 inline mr-1" />
                            {activity.duration} min
                          </span>
                          <span className="text-[var(--color-workout)] font-medium">
                            {activity.calories} kcal
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Steps Trend"
            subtitle="Daily step count"
            currentValue={ACTIVITY_DATA.steps.toLocaleString()}
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
              data={STEPS_TREND}
              height={200}
              color="var(--color-activity)"
              showDots
              showLabels
            />
          </ChartCard>

          <ChartCard
            title="Active Minutes"
            subtitle="Daily active minutes"
            currentValue={ACTIVITY_DATA.activeMinutes.toString()}
            unit="min"
            trend="up"
            trendValue="+12%"
            ranges={[
              { label: "7D", value: "7d" },
              { label: "30D", value: "30d" },
              { label: "90D", value: "90d" },
            ]}
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          >
            <SimpleChart
              data={ACTIVE_MINUTES_TREND}
              height={200}
              color="var(--color-workout)"
              showDots
              showLabels
            />
          </ChartCard>
        </div>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance. Activity data is sourced from connected
            devices and provides estimates. Consult a healthcare professional for
            personalized activity recommendations.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
