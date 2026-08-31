"use client";

/**
 * Habits Page - Daily habit tracking
 */

import React, { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  Target,
  TrendingUp,
  MoreHorizontal,
  Edit,
  Trash2,
  Pause,
  Archive,
  Clock,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Habit {
  id: string;
  name: string;
  icon: string;
  frequency: "daily" | "weekly" | "custom";
  schedule?: number[]; // Days of week (0-6)
  targetStreak: number;
  currentStreak: number;
  completedToday: boolean;
  completedDates: string[];
  category: "health" | "fitness" | "nutrition" | "mindfulness" | "sleep" | "custom";
  reminder?: {
    enabled: boolean;
    time?: string;
  };
  status: "active" | "paused" | "archived";
}

interface HabitCompletion {
  habitId: string;
  date: string;
  completedAt: number;
}

// =============================================================================
// Sample Data
// =============================================================================

const SAMPLE_HABITS: Habit[] = [
  {
    id: "1",
    name: "Drink 2L water",
    icon: "💧",
    frequency: "daily",
    targetStreak: 30,
    currentStreak: 12,
    completedToday: true,
    completedDates: [],
    category: "health",
    reminder: { enabled: true, time: "09:00" },
    status: "active",
  },
  {
    id: "2",
    name: "Morning meditation",
    icon: "🧘",
    frequency: "daily",
    targetStreak: 30,
    currentStreak: 8,
    completedToday: false,
    completedDates: [],
    category: "mindfulness",
    reminder: { enabled: true, time: "07:00" },
    status: "active",
  },
  {
    id: "3",
    name: "Take vitamins",
    icon: "💊",
    frequency: "daily",
    targetStreak: 90,
    currentStreak: 45,
    completedToday: true,
    completedDates: [],
    category: "health",
    status: "active",
  },
  {
    id: "4",
    name: "Read 30 minutes",
    icon: "📚",
    frequency: "daily",
    targetStreak: 30,
    currentStreak: 0,
    completedToday: false,
    completedDates: [],
    category: "mindfulness",
    reminder: { enabled: false },
    status: "active",
  },
  {
    id: "5",
    name: "No screens before bed",
    icon: "📵",
    frequency: "daily",
    targetStreak: 14,
    currentStreak: 14,
    completedToday: true,
    completedDates: [],
    category: "sleep",
    status: "active",
  },
  {
    id: "6",
    name: "Post-workout stretch",
    icon: "🧘‍♀️",
    frequency: "weekly",
    schedule: [1, 3, 5],
    targetStreak: 8,
    currentStreak: 3,
    completedToday: false,
    completedDates: [],
    category: "fitness",
    status: "active",
  },
];

// =============================================================================
// Components
// =============================================================================

interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onPause: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

function HabitCard({
  habit,
  onToggle,
  onEdit,
  onPause,
  onArchive,
  onDelete,
}: HabitCardProps) {
  const isCompleted = habit.completedToday;
  const isActive = habit.status === "active";

  const categoryColors: Record<string, string> = {
    health: "bg-[var(--color-readiness-muted)] text-readiness",
    fitness: "bg-[var(--color-workout-muted)] text-workout",
    nutrition: "bg-[var(--color-nutrition-muted)] text-nutrition",
    mindfulness: "bg-[var(--color-ai-muted)] text-ai",
    sleep: "bg-[var(--color-sleep-muted)] text-sleep",
    custom: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
  };

  return (
    <Card
      className={cn(
        "transition-all",
        isActive ? "hover:border-[var(--color-border-hover)]" : "opacity-60",
        isCompleted && "border-[var(--color-success)]/30"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => isActive && onToggle(habit.id)}
              disabled={!isActive}
              className={cn(
                "mt-1 transition-colors",
                isCompleted
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]",
                !isActive && "cursor-not-allowed opacity-50"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <Circle className="h-6 w-6" />
              )}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{habit.icon}</span>
                <h3
                  className={cn(
                    "font-medium text-[var(--color-foreground)]",
                    isCompleted && "line-through text-[var(--color-muted-foreground)]"
                  )}
                >
                  {habit.name}
                </h3>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-tertiary)]">
                {habit.currentStreak > 0 && (
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-[var(--color-workout)]" />
                    {habit.currentStreak} day streak
                  </span>
                )}
                {habit.reminder?.enabled && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {habit.reminder.time}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {habit.currentStreak >= habit.targetStreak && (
              <Badge variant="primary" size="sm">
                <Target className="h-3 w-3 mr-1" />
                Goal reached
              </Badge>
            )}
            <div className="relative group">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <div className="absolute right-0 mt-1 w-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="p-1">
                  <button
                    onClick={() => onEdit(habit.id)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] rounded-lg"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => onPause(habit.id)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] rounded-lg"
                  >
                    <Pause className="h-4 w-4" />
                    {habit.status === "paused" ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => onArchive(habit.id)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] rounded-lg"
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </button>
                  <button
                    onClick={() => onDelete(habit.id)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-muted)] rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Streak Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[var(--color-tertiary)] mb-1">
            <span>Streak progress</span>
            <span>{habit.currentStreak}/{habit.targetStreak} days</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                habit.currentStreak >= habit.targetStreak
                  ? "bg-[var(--color-success)]"
                  : "bg-[var(--color-workout)]"
              )}
              style={{ width: `${Math.min((habit.currentStreak / habit.targetStreak) * 100, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function HabitsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [habits, setHabits] = useState<Habit[]>(SAMPLE_HABITS);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const handleToggleHabit = useCallback((id: string) => {
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id
          ? {
              ...habit,
              completedToday: !habit.completedToday,
              currentStreak: !habit.completedToday
                ? habit.currentStreak + 1
                : Math.max(0, habit.currentStreak - 1),
            }
          : habit
      )
    );
  }, []);

  const handleEditHabit = useCallback((id: string) => {
    console.log("Edit habit:", id);
  }, []);

  const handlePauseHabit = useCallback((id: string) => {
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id
          ? { ...habit, status: habit.status === "paused" ? "active" : "paused" }
          : habit
      )
    );
  }, []);

  const handleArchiveHabit = useCallback((id: string) => {
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id ? { ...habit, status: "archived" as const } : habit
      )
    );
  }, []);

  const handleDeleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((habit) => habit.id !== id));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading habits..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const activeHabits = habits.filter((h) => h.status === "active");
  const completedToday = activeHabits.filter((h) => h.completedToday).length;
  const totalActive = activeHabits.length;
  const longestStreak = Math.max(...habits.map((h) => h.currentStreak), 0);

  const filteredHabits = habits.filter((habit) => {
    if (filter === "all") return habit.status !== "archived";
    if (filter === "active") return habit.status === "active" && !habit.completedToday;
    if (filter === "completed") return habit.completedToday;
    return true;
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Habits
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Build healthy routines and track your progress
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Habit
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Today's Progress"
            value={`${completedToday}/${totalActive}`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="activity"
          />
          <MetricCard
            label="Active Habits"
            value={totalActive}
            icon={<Target className="h-4 w-4" />}
            color="workout"
          />
          <MetricCard
            label="Longest Streak"
            value={longestStreak}
            unit="days"
            icon={<Flame className="h-4 w-4" />}
            color="nutrition"
          />
        </div>

        {/* Filter */}
        <div className="flex gap-2 p-1 rounded-lg bg-[var(--color-muted)] w-fit">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "To Do" },
            { id: "completed", label: "Done" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                filter === f.id
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Habits List */}
        <div className="space-y-3">
          {filteredHabits.length > 0 ? (
            filteredHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={handleToggleHabit}
                onEdit={handleEditHabit}
                onPause={handlePauseHabit}
                onArchive={handleArchiveHabit}
                onDelete={handleDeleteHabit}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto text-[var(--color-muted)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--color-foreground)] mb-2">
                  No habits found
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                  {filter === "all"
                    ? "Start building healthy habits by adding your first one."
                    : filter === "active"
                    ? "All habits completed for today!"
                    : "No habits completed today."}
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Habit
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tips Card */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-[var(--color-workout)] shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <p className="font-medium text-[var(--color-foreground)] mb-1">
                  Habit Building Tips
                </p>
                <p>
                  Start small and be consistent. It takes an average of 66 days to form
                  a new habit. Focus on one habit at a time and celebrate your streaks!
                  Avoid punitive language — progress isn't always linear.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance. Habit tracking is for motivational
            purposes and does not guarantee specific outcomes.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
