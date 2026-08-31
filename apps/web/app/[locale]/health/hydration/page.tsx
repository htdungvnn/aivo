"use client";

/**
 * Hydration Page - Water intake tracking
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
  Droplets,
  Plus,
  Minus,
  Target,
  TrendingUp,
  TrendingDown,
  MinusIcon,
  Clock,
  GlassWater,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface HydrationEntry {
  id: string;
  amount: number;
  time: string;
  source: "manual" | "smart_bottle";
}

// =============================================================================
// Sample Data
// =============================================================================

const HYDRATION_TARGET = 2500; // ml
const SAMPLE_ENTRIES: HydrationEntry[] = [
  { id: "1", amount: 250, time: "7:30 AM", source: "manual" },
  { id: "2", amount: 350, time: "9:00 AM", source: "smart_bottle" },
  { id: "3", amount: 500, time: "11:30 AM", source: "manual" },
  { id: "4", amount: 300, time: "2:00 PM", source: "smart_bottle" },
  { id: "5", amount: 400, time: "4:30 PM", source: "manual" },
];

const HYDRATION_TREND = [
  { value: 2100, label: "Mon" },
  { value: 2400, label: "Tue" },
  { value: 1950, label: "Wed" },
  { value: 2600, label: "Thu" },
  { value: 2200, label: "Fri" },
  { value: 2500, label: "Sat" },
  { value: 1800, label: "Sun" },
];

const QUICK_ADD_OPTIONS = [
  { label: "Glass", amount: 250, icon: "🥛" },
  { label: "Bottle", amount: 500, icon: "🍶" },
  { label: "Large", amount: 750, icon: "🫗" },
  { label: "Custom", amount: 0, icon: "✨" },
];

// =============================================================================
// Main Component
// =============================================================================

export default function HydrationPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<HydrationEntry[]>(SAMPLE_ENTRIES);
  const [selectedRange, setSelectedRange] = useState("7d");
  const [isAdding, setIsAdding] = useState(false);

  const totalIntake = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = Math.max(HYDRATION_TARGET - totalIntake, 0);
  const progress = (totalIntake / HYDRATION_TARGET) * 100;
  const adherence = Math.min(progress, 100);

  const handleQuickAdd = useCallback((amount: number) => {
    if (amount === 0) {
      // Open custom amount dialog
      const customAmount = prompt("Enter amount in ml:");
      if (customAmount && !isNaN(parseInt(customAmount))) {
        const newEntry: HydrationEntry = {
          id: `entry-${Date.now()}`,
          amount: parseInt(customAmount),
          time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          source: "manual",
        };
        setEntries((prev) => [newEntry, ...prev]);
      }
      return;
    }

    const newEntry: HydrationEntry = {
      id: `entry-${Date.now()}`,
      amount,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      source: "manual",
    };
    setEntries((prev) => [newEntry, ...prev]);
    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 500);
  }, []);

  const handleRemoveEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading hydration data..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const formatAmount = (ml: number) => {
    if (ml >= 1000) {
      return `${(ml / 1000).toFixed(1)}L`;
    }
    return `${ml}ml`;
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
              Hydration
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Track your daily water intake
            </p>
          </div>
          <Badge variant="primary" className="w-fit gap-1">
            <div className="h-2 w-2 rounded-full bg-[var(--color-hydration)] animate-pulse" />
            {entries.length} entries today
          </Badge>
        </div>

        {/* Main Hydration Display */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Hydration Ring */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-36 h-36 rounded-full border-8 border-[var(--color-hydration-muted)] flex items-center justify-center">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="var(--color-hydration-muted)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="var(--color-hydration)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${progress * 2.64} 264`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <Droplets className="h-6 w-6 mx-auto text-[var(--color-hydration)] mb-1" />
                      <span className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">
                        {formatAmount(totalIntake)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">Daily target</p>
                  <p className="text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
                    {formatAmount(HYDRATION_TARGET)}
                  </p>
                  <p className="text-sm text-[var(--color-tertiary)]">recommended</p>
                  {remaining > 0 ? (
                    <p className="text-sm text-[var(--color-hydration)] mt-2">
                      {formatAmount(remaining)} to go
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--color-success)] mt-2">
                      Target reached!
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex-1 grid grid-cols-2 gap-4 lg:pl-8 lg:border-l lg:border-[var(--color-border)]">
                <div className="p-3 rounded-lg bg-[var(--color-muted)]">
                  <div className="flex items-center gap-2 text-[var(--color-muted-foreground)] mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs">Adherence</span>
                  </div>
                  <span className="text-xl font-bold text-[var(--color-hydration)] tabular-nums">
                    {Math.round(adherence)}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-muted)]">
                  <div className="flex items-center gap-2 text-[var(--color-muted-foreground)] mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Last drink</span>
                  </div>
                  <span className="text-lg font-medium text-[var(--color-foreground)]">
                    {entries[0]?.time || "No entries"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Add */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Add</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {QUICK_ADD_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleQuickAdd(option.amount)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-hydration)] hover:bg-[var(--color-hydration)]/5 transition-all",
                    isAdding && "animate-pulse"
                  )}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-sm font-medium text-[var(--color-foreground)]">
                    {option.label}
                  </span>
                  {option.amount > 0 && (
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {option.amount}ml
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Entries */}
        <div>
          <h2 className="section-title mb-4">Today's Intake</h2>
          {entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card key={entry.id} className="hover:border-[var(--color-border-hover)]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--color-hydration-muted)]">
                          <GlassWater className="h-5 w-5 text-[var(--color-hydration)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-foreground)]">
                            +{entry.amount}ml
                          </p>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {entry.time}
                            {entry.source === "smart_bottle" && (
                              <Badge variant="subtle" size="sm" className="ml-2">
                                Smart bottle
                              </Badge>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-error)]"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Droplets className="h-12 w-12 mx-auto text-[var(--color-muted)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--color-foreground)] mb-2">
                  No hydration logged today
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                  Start tracking your water intake by adding your first drink.
                </p>
                <Button onClick={() => handleQuickAdd(250)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Log First Drink
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Hydration Trend */}
        <ChartCard
          title="Hydration Trend"
          subtitle="Daily water intake"
          currentValue={formatAmount(totalIntake)}
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
            data={HYDRATION_TREND}
            height={200}
            color="var(--color-hydration)"
            showDots
            showLabels
          />
        </ChartCard>

        {/* Info Card */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Droplets className="h-5 w-5 text-[var(--color-hydration)] shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <p className="font-medium text-[var(--color-foreground)] mb-1">
                  Hydration Tips
                </p>
                <p>
                  Proper hydration supports energy levels, cognitive function, and recovery.
                  Your daily target may vary based on activity level, climate, and individual needs.
                  Consult a healthcare professional for personalized hydration recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance. Hydration needs vary by individual.
            Consult a healthcare professional for personalized hydration advice.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
