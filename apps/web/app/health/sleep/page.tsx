"use client";

/**
 * Sleep Page - Sleep tracking, quality, and patterns
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
  Moon,
  Sun,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Info,
  Bed,
  Wake,
  Sparkles,
} from "lucide-react";

// =============================================================================
// Sample Data
// =============================================================================

const SLEEP_DATA = {
  duration: 7.5,
  quality: 82,
  bedtime: "10:45 PM",
  wakeTime: "6:15 AM",
  deepSleep: 2.1,
  lightSleep: 4.2,
  remSleep: 1.2,
  consistency: 78,
  targetAdherence: 92,
  readinessImpact: "+12 points",
};

const SLEEP_TREND = [
  { value: 6.5, label: "Mon" },
  { value: 7.0, label: "Tue" },
  { value: 7.2, label: "Wed" },
  { value: 7.5, label: "Thu" },
  { value: 7.0, label: "Fri" },
  { value: 7.8, label: "Sat" },
  { value: 7.5, label: "Sun" },
];

const BEDTIME_TREND = [
  { value: 23.0, label: "Mon" }, // 11:00 PM
  { value: 22.8, label: "Tue" }, // 10:48 PM
  { value: 22.9, label: "Wed" }, // 10:54 PM
  { value: 22.75, label: "Thu" }, // 10:45 PM
  { value: 23.1, label: "Fri" }, // 11:06 PM
  { value: 22.6, label: "Sat" }, // 10:36 PM
  { value: 22.75, label: "Sun" }, // 10:45 PM
];

const QUALITY_TREND = [
  { value: 72, label: "Mon" },
  { value: 78, label: "Tue" },
  { value: 75, label: "Wed" },
  { value: 82, label: "Thu" },
  { value: 70, label: "Fri" },
  { value: 85, label: "Sat" },
  { value: 82, label: "Sun" },
];

// =============================================================================
// Components
// =============================================================================

interface SleepPhaseBarProps {
  deep: number;
  light: number;
  rem: number;
  total: number;
}

function SleepPhaseBar({ deep, light, rem, total }: SleepPhaseBarProps) {
  const deepPercent = (deep / total) * 100;
  const lightPercent = (light / total) * 100;
  const remPercent = (rem / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden">
        <div
          className="bg-[var(--color-sleep)]"
          style={{ width: `${deepPercent}%` }}
          title={`Deep: ${deep.toFixed(1)}h`}
        />
        <div
          className="bg-[var(--color-sleep)]/50"
          style={{ width: `${lightPercent}%` }}
          title={`Light: ${light.toFixed(1)}h`}
        />
        <div
          className="bg-[var(--color-ai)]"
          style={{ width: `${remPercent}%` }}
          title={`REM: ${rem.toFixed(1)}h`}
        />
      </div>
      <div className="flex justify-between text-xs text-[var(--color-tertiary)]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--color-sleep)]" />
          Deep: {deep.toFixed(1)}h
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--color-sleep)]/50" />
          Light: {light.toFixed(1)}h
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--color-ai)]" />
          REM: {rem.toFixed(1)}h
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SleepPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [selectedRange, setSelectedRange] = useState("7d");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading sleep data..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-[var(--color-error)]" />;
      default:
        return <Minus className="h-4 w-4 text-[var(--color-muted-foreground)]" />;
    }
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
              Sleep
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Track your sleep quality and patterns
            </p>
          </div>
          <Badge variant="primary" className="w-fit gap-1">
            <div className="h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
            Synced with Apple Watch
          </Badge>
        </div>

        {/* Main Sleep Summary */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Sleep Duration */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-36 h-36 rounded-full border-8 border-[var(--color-sleep-muted)] flex items-center justify-center">
                    <div className="text-center">
                      <Moon className="h-8 w-8 mx-auto text-[var(--color-sleep)] mb-1" />
                      <span className="text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
                        {SLEEP_DATA.duration}
                      </span>
                      <p className="text-xs text-[var(--color-muted-foreground)]">hours</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">Last night</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-bold text-[var(--color-foreground)]">
                      {Math.floor(SLEEP_DATA.duration)}
                    </span>
                    <span className="text-lg text-[var(--color-muted-foreground)]">
                      h {Math.round((SLEEP_DATA.duration % 1) * 60)}m
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="primary" size="sm">
                      Quality: {SLEEP_DATA.quality}%
                    </Badge>
                    <Badge variant="subtle" size="sm">
                      {SLEEP_DATA.targetAdherence}% of target
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Sleep Times */}
              <div className="flex-1 grid grid-cols-2 gap-6 lg:pl-8 lg:border-l lg:border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-sleep-muted)]">
                    <Bed className="h-5 w-5 text-[var(--color-sleep)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">Bedtime</p>
                    <p className="text-lg font-semibold text-[var(--color-foreground)] tabular-nums">
                      {formatTime(SLEEP_DATA.bedtime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-accent)]/10">
                    <Wake className="h-5 w-5 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">Wake time</p>
                    <p className="text-lg font-semibold text-[var(--color-foreground)] tabular-nums">
                      {formatTime(SLEEP_DATA.wakeTime)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sleep Phases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sleep Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <SleepPhaseBar
              deep={SLEEP_DATA.deepSleep}
              light={SLEEP_DATA.lightSleep}
              rem={SLEEP_DATA.remSleep}
              total={SLEEP_DATA.duration}
            />
            <p className="text-xs text-[var(--color-tertiary)] mt-4">
              Sleep phases are estimates based on your device data. Individual phases may vary.
            </p>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Quality Score"
            value={SLEEP_DATA.quality}
            unit="%"
            icon={<Moon className="h-4 w-4" />}
            color="sleep"
            trend="up"
            trendValue="+5%"
          />
          <MetricCard
            label="Consistency"
            value={SLEEP_DATA.consistency}
            unit="%"
            icon={<Target className="h-4 w-4" />}
            color="sleep"
            trend="stable"
          />
          <MetricCard
            label="Target Adherence"
            value={SLEEP_DATA.targetAdherence}
            unit="%"
            icon={<Clock className="h-4 w-4" />}
            color="sleep"
            trend="up"
            trendValue="+8%"
          />
          <MetricCard
            label="Readiness Impact"
            value="+12"
            unit="pts"
            icon={<Sparkles className="h-4 w-4" />}
            color="readiness"
            trend="up"
            trendValue="+3"
          />
        </div>

        {/* Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Sleep Duration"
            subtitle="Hours of sleep per night"
            currentValue={SLEEP_DATA.duration.toString()}
            unit="hrs"
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
              showDots
              showLabels
            />
          </ChartCard>

          <ChartCard
            title="Sleep Quality"
            subtitle="Quality score percentage"
            currentValue={SLEEP_DATA.quality.toString()}
            unit="%"
            trend="up"
            trendValue="+5%"
            ranges={[
              { label: "7D", value: "7d" },
              { label: "30D", value: "30d" },
              { label: "90D", value: "90d" },
            ]}
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          >
            <SimpleChart
              data={QUALITY_TREND}
              height={200}
              color="var(--color-sleep)"
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
                  About Sleep Data
                </p>
                <p>
                  Sleep data is sourced from your connected devices and provides estimates
                  of your sleep patterns. AIVO uses this data to calculate your readiness
                  score and provide personalized recommendations. For accurate medical-grade
                  sleep analysis, consult a healthcare professional.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance. Sleep tracking is for informational
            purposes and does not constitute medical advice or diagnosis.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
