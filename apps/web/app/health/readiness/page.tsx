"use client";

/**
 * Readiness Page - Detailed readiness score and factor breakdown
 */

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { ScoreRing } from "@/components/shared/score-ring";
import { ChartCard, SimpleChart } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Moon,
  Dumbbell,
  Droplets,
  Footprints,
  Brain,
  Battery,
  Scale,
  Utensils,
  Clock,
  Info,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface ReadinessFactor {
  id: string;
  name: string;
  score: number;
  contribution: number; // percentage contribution to overall
  trend: "up" | "down" | "stable";
  status: "positive" | "neutral" | "negative";
  dataSource: string;
  freshness: string;
  icon: React.ElementType;
  color: string;
}

// =============================================================================
// Sample Data
// =============================================================================

const READINESS_DATA = {
  score: 78,
  level: "Good",
  confidence: 0.85,
  calculatedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  dataCompleteness: 0.92,
};

const READINESS_TREND = [
  { value: 65, label: "Mon" },
  { value: 72, label: "Tue" },
  { value: 68, label: "Wed" },
  { value: 75, label: "Thu" },
  { value: 71, label: "Fri" },
  { value: 78, label: "Sat" },
];

const FACTORS: ReadinessFactor[] = [
  {
    id: "sleep",
    name: "Sleep Quality",
    score: 82,
    contribution: 20,
    trend: "up",
    status: "positive",
    dataSource: "Apple Watch",
    freshness: "Real-time",
    icon: Moon,
    color: "sleep",
  },
  {
    id: "training_load",
    name: "Training Load",
    score: 65,
    contribution: 15,
    trend: "down",
    status: "negative",
    dataSource: "Workout Log",
    freshness: "6 hours ago",
    icon: Dumbbell,
    color: "workout",
  },
  {
    id: "recovery",
    name: "Recovery Status",
    score: 75,
    contribution: 12,
    trend: "stable",
    status: "positive",
    dataSource: "HRV + RHR",
    freshness: "Real-time",
    icon: Heart,
    color: "readiness",
  },
  {
    id: "energy",
    name: "Energy Level",
    score: 70,
    contribution: 10,
    trend: "up",
    status: "neutral",
    dataSource: "Estimated",
    freshness: "Estimated",
    icon: Battery,
    color: "activity",
  },
  {
    id: "nutrition",
    name: "Nutrition Adherence",
    score: 88,
    contribution: 8,
    trend: "up",
    status: "positive",
    dataSource: "Meal Log",
    freshness: "2 hours ago",
    icon: Utensils,
    color: "nutrition",
  },
  {
    id: "hydration",
    name: "Hydration",
    score: 60,
    contribution: 5,
    trend: "down",
    status: "negative",
    dataSource: "Manual Log",
    freshness: "1 hour ago",
    icon: Droplets,
    color: "hydration",
  },
  {
    id: "stress",
    name: "Stress Level",
    score: 55,
    contribution: 8,
    trend: "down",
    status: "negative",
    dataSource: "Wearable",
    freshness: "Real-time",
    icon: Brain,
    color: "stress",
  },
  {
    id: "steps",
    name: "Activity Level",
    score: 72,
    contribution: 5,
    trend: "stable",
    status: "neutral",
    dataSource: "Steps Counter",
    freshness: "Real-time",
    icon: Footprints,
    color: "activity",
  },
  {
    id: "resting_hr",
    name: "Resting Heart Rate",
    score: 78,
    contribution: 6,
    trend: "up",
    status: "positive",
    dataSource: "Apple Watch",
    freshness: "Real-time",
    icon: Heart,
    color: "readiness",
  },
  {
    id: "hrv",
    name: "Heart Rate Variability",
    score: 80,
    contribution: 5,
    trend: "up",
    status: "positive",
    dataSource: "Apple Watch",
    freshness: "Real-time",
    icon: Heart,
    color: "readiness",
  },
];

// =============================================================================
// Components
// =============================================================================

interface FactorCardProps {
  factor: ReadinessFactor;
  expanded?: boolean;
  onToggle?: () => void;
}

function FactorCard({ factor, expanded, onToggle }: FactorCardProps) {
  const Icon = factor.icon;
  const trendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  }[factor.trend];

  const statusColors = {
    positive: "text-[var(--color-success)]",
    neutral: "text-[var(--color-muted-foreground)]",
    negative: "text-[var(--color-warning)]",
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-[var(--color-border-hover)]",
        expanded && "border-[var(--color-border-accent)]"
      )}
      onClick={onToggle}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={cn(
              "p-3 rounded-xl shrink-0",
              factor.color === "sleep" && "bg-[var(--color-sleep-muted)] text-sleep",
              factor.color === "workout" && "bg-[var(--color-workout-muted)] text-workout",
              factor.color === "readiness" && "bg-[var(--color-readiness-muted)] text-readiness",
              factor.color === "activity" && "bg-[var(--color-activity-muted)] text-activity",
              factor.color === "nutrition" && "bg-[var(--color-nutrition-muted)] text-nutrition",
              factor.color === "hydration" && "bg-[var(--color-hydration-muted)] text-hydration",
              factor.color === "stress" && "bg-[var(--color-stress-muted)] text-stress"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-[var(--color-foreground)]">
                {factor.name}
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    statusColors[factor.status]
                  )}
                >
                  {factor.score}
                </span>
                <trendIcon
                  className={cn(
                    "h-4 w-4",
                    factor.trend === "up" && "text-[var(--color-success)]",
                    factor.trend === "down" && "text-[var(--color-error)]",
                    factor.trend === "stable" && "text-[var(--color-muted-foreground)]"
                  )}
                />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-2 h-1.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  factor.color === "sleep" && "bg-[var(--color-sleep)]",
                  factor.color === "workout" && "bg-[var(--color-workout)]",
                  factor.color === "readiness" && "bg-[var(--color-readiness)]",
                  factor.color === "activity" && "bg-[var(--color-activity)]",
                  factor.color === "nutrition" && "bg-[var(--color-nutrition)]",
                  factor.color === "hydration" && "bg-[var(--color-hydration)]",
                  factor.color === "stress" && "bg-[var(--color-stress)]"
                )}
                style={{ width: `${factor.score}%` }}
              />
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-tertiary)]">
              <span>{factor.contribution}% contribution</span>
              <span>•</span>
              <span>{factor.dataSource}</span>
              <span>•</span>
              <span>{factor.freshness}</span>
            </div>
          </div>

          {/* Expand Icon */}
          <ChevronRight
            className={cn(
              "h-5 w-5 text-[var(--color-muted-foreground)] transition-transform shrink-0",
              expanded && "rotate-90"
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ReadinessPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [selectedRange, setSelectedRange] = useState("7d");
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading readiness data..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const positiveFactors = FACTORS.filter((f) => f.status === "positive");
  const negativeFactors = FACTORS.filter((f) => f.status === "negative");

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
              Readiness
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Your estimated daily wellness indicator
            </p>
          </div>
          <Badge variant="primary" className="w-fit">
            Last updated: {READINESS_DATA.calculatedAt.toLocaleTimeString()}
          </Badge>
        </div>

        {/* Main Score Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Score Ring */}
              <ScoreRing
                score={READINESS_DATA.score}
                size="xl"
                label={READINESS_DATA.level}
                color="readiness"
              />

              {/* Details */}
              <div className="flex-1 text-center sm:text-left">
                <div className="space-y-3">
                  {/* Confidence */}
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-sm text-[var(--color-muted-foreground)]">
                      Confidence:
                    </span>
                    <span className="text-sm font-medium text-[var(--color-foreground)]">
                      {Math.round(READINESS_DATA.confidence * 100)}%
                    </span>
                    <span className="text-xs text-[var(--color-tertiary)]">
                      ({Math.round(READINESS_DATA.dataCompleteness * 100)}% data coverage)
                    </span>
                  </div>

                  {/* Top Positive */}
                  {positiveFactors.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-success-muted)]">
                      <TrendingUp className="h-5 w-5 text-[var(--color-success)] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-success)]">
                          Top positive factor
                        </p>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {positiveFactors[0].name} ({positiveFactors[0].score}%)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Top Limiting */}
                  {negativeFactors.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-warning-muted)]">
                      <AlertCircle className="h-5 w-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-warning)]">
                          Top limiting factor
                        </p>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {negativeFactors[0].name} ({negativeFactors[0].score}%)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <ChartCard
          title="Readiness Trend"
          subtitle="Your readiness score over time"
          currentValue={READINESS_DATA.score.toString()}
          unit="avg"
          trend="up"
          trendValue="+8"
          comparison="vs last week"
          ranges={[
            { label: "7D", value: "7d" },
            { label: "30D", value: "30d" },
            { label: "90D", value: "90d" },
          ]}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          lastUpdated={READINESS_DATA.calculatedAt}
        >
          <SimpleChart
            data={READINESS_TREND}
            height={200}
            color="var(--color-readiness)"
            showDots
            showLabels
          />
        </ChartCard>

        {/* Factor Breakdown */}
        <div>
          <h2 className="section-title mb-4">Factor Breakdown</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
            Each factor contributes to your overall readiness score. Tap a
            factor for more details.
          </p>
          <div className="space-y-3">
            {FACTORS.map((factor) => (
              <FactorCard
                key={factor.id}
                factor={factor}
                expanded={expandedFactor === factor.id}
                onToggle={() =>
                  setExpandedFactor(expandedFactor === factor.id ? null : factor.id)
                }
              />
            ))}
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <p className="font-medium text-[var(--color-foreground)] mb-1">
                  About Readiness Score
                </p>
                <p>
                  AIVO Readiness is an estimated wellness indicator based on sleep,
                  recovery, activity, and other health metrics. It does not provide
                  medical advice or replace professional guidance. Individual results
                  may vary.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance only. It does not provide medical
            diagnoses, prescribe treatment or medication, or guarantee health outcomes.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
