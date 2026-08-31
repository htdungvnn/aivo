"use client";

/**
 * Daily Plan Page - Personalized daily schedule
 * Groups items by time of day with action capabilities
 */

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Clock,
  Utensils,
  Dumbbell,
  Droplets,
  Moon,
  Walk,
  CheckCircle,
  Circle,
  Lock,
  Calendar,
  ChevronRight,
  RefreshCw,
  Sun,
  Sunset,
  Sunrise,
  Sparkles,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface PlanItem {
  id: string;
  type: "meal" | "workout" | "hydration" | "walk" | "sleep" | "habit" | "recovery" | "checkin" | "custom";
  timeOfDay: "morning" | "afternoon" | "evening" | "anytime";
  title: string;
  description?: string;
  status: "pending" | "completed" | "skipped" | "locked";
  skipReason?: string;
  duration?: string;
  calories?: number;
  locked?: boolean;
  adaptation?: {
    type: "intensity" | "volume" | "exercise_selection";
    description: string;
    status: "recommended" | "accepted" | "rejected" | "restored";
  };
}

// =============================================================================
// Sample Data
// =============================================================================

const SAMPLE_PLAN: Record<string, PlanItem[]> = {
  morning: [
    {
      id: "1",
      type: "meal",
      timeOfDay: "morning",
      title: "Breakfast",
      description: "High-protein breakfast with complex carbs",
      status: "completed",
      calories: 450,
    },
    {
      id: "2",
      type: "hydration",
      timeOfDay: "morning",
      title: "Morning hydration",
      description: "Drink 500ml water",
      status: "completed",
    },
    {
      id: "3",
      type: "habit",
      timeOfDay: "morning",
      title: "Morning meditation",
      description: "10 minutes mindfulness",
      status: "completed",
    },
  ],
  afternoon: [
    {
      id: "4",
      type: "workout",
      timeOfDay: "afternoon",
      title: "Upper Body Strength",
      description: "Bench press, rows, shoulder press",
      status: "pending",
      duration: "45 min",
      locked: true,
      adaptation: {
        type: "intensity",
        description: "Reduced to moderate intensity based on recent training load",
        status: "recommended",
      },
    },
    {
      id: "5",
      type: "meal",
      timeOfDay: "afternoon",
      title: "Lunch",
      description: "Balanced meal with lean protein",
      status: "pending",
      calories: 550,
    },
    {
      id: "6",
      type: "hydration",
      timeOfDay: "afternoon",
      title: "Post-workout hydration",
      description: "Drink 300ml water with electrolytes",
      status: "pending",
    },
  ],
  evening: [
    {
      id: "7",
      type: "meal",
      timeOfDay: "evening",
      title: "Dinner",
      description: "Protein-rich dinner",
      status: "pending",
      calories: 500,
    },
    {
      id: "8",
      type: "sleep",
      timeOfDay: "evening",
      title: "Sleep preparation",
      description: "Begin wind-down routine",
      status: "pending",
    },
  ],
  anytime: [
    {
      id: "9",
      type: "habit",
      timeOfDay: "anytime",
      title: "Take vitamins",
      status: "pending",
    },
    {
      id: "10",
      type: "hydration",
      timeOfDay: "anytime",
      title: "Stay hydrated",
      description: "Total: 2000ml today",
      status: "pending",
    },
  ],
};

// =============================================================================
// Components
// =============================================================================

const typeIcons: Record<PlanItem["type"], React.ElementType> = {
  meal: Utensils,
  workout: Dumbbell,
  hydration: Droplets,
  walk: Walk,
  sleep: Moon,
  habit: CheckCircle,
  recovery: Heart,
  checkin: Calendar,
  custom: Circle,
};

const typeColors: Record<PlanItem["type"], string> = {
  meal: "text-nutrition bg-nutrition-muted",
  workout: "text-workout bg-workout-muted",
  hydration: "text-hydration bg-hydration-muted",
  walk: "text-activity bg-activity-muted",
  sleep: "text-sleep bg-sleep-muted",
  habit: "text-ai bg-ai-muted",
  recovery: "text-readiness bg-readiness-muted",
  checkin: "text-[var(--color-muted-foreground)] bg-[var(--color-muted)]",
  custom: "text-[var(--color-muted-foreground)] bg-[var(--color-muted)]",
};

interface PlanItemCardProps {
  item: PlanItem;
  onComplete: (id: string) => void;
  onSkip: (id: string, reason?: string) => void;
  onRestore: (id: string) => void;
  onAcceptAdaptation: (id: string) => void;
  onRejectAdaptation: (id: string) => void;
}

function PlanItemCard({
  item,
  onComplete,
  onSkip,
  onRestore,
  onAcceptAdaptation,
  onRejectAdaptation,
}: PlanItemCardProps) {
  const Icon = typeIcons[item.type];
  const isCompleted = item.status === "completed";
  const isSkipped = item.status === "skipped";
  const isLocked = item.status === "locked" || item.locked;

  return (
    <Card
      className={cn(
        "transition-all",
        isCompleted && "opacity-60",
        isSkipped && "opacity-50"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <button
            onClick={() => !isLocked && onComplete(item.id)}
            disabled={isLocked}
            className={cn(
              "shrink-0 mt-0.5",
              isCompleted && "text-[var(--color-success)]",
              isSkipped && "text-[var(--color-tertiary)]",
              !isCompleted && !isSkipped && !isLocked && "text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
            )}
          >
            {isCompleted ? (
              <CheckCircle className="h-6 w-6" />
            ) : isLocked ? (
              <Lock className="h-6 w-6 text-[var(--color-tertiary)]" />
            ) : (
              <Circle className="h-6 w-6" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  className={cn(
                    "font-medium text-[var(--color-foreground)]",
                    (isCompleted || isSkipped) && "line-through text-[var(--color-muted-foreground)]"
                  )}
                >
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Type Badge */}
              <div className={cn("p-2 rounded-lg shrink-0", typeColors[item.type])}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-tertiary)]">
              {item.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.duration}
                </span>
              )}
              {item.calories && (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {item.calories} kcal
                </span>
              )}
            </div>

            {/* Adaptation Notice */}
            {item.adaptation && item.adaptation.status === "recommended" && (
              <div className="mt-3 p-3 rounded-lg bg-[var(--color-ai-muted)] border border-[var(--color-ai)]/20">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-[var(--color-ai)]" />
                  <span className="text-sm font-medium text-[var(--color-ai)]">
                    AI Adaptation
                  </span>
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {item.adaptation.description}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onAcceptAdaptation(item.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRejectAdaptation(item.id)}
                  >
                    Keep original
                  </Button>
                </div>
              </div>
            )}

            {/* Skip Reason */}
            {isSkipped && item.skipReason && (
              <p className="text-xs text-[var(--color-tertiary)] mt-2 italic">
                Skipped: {item.skipReason}
              </p>
            )}

            {/* Actions */}
            {!isCompleted && !isSkipped && !isLocked && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSkip(item.id)}
                  className="text-[var(--color-tertiary)] hover:text-[var(--color-error)]"
                >
                  <X className="h-4 w-4 mr-1" />
                  Skip
                </Button>
              </div>
            )}

            {/* Restore */}
            {(isCompleted || isSkipped) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRestore(item.id)}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Restore
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TimeSectionProps {
  title: string;
  icon: React.ElementType;
  items: PlanItem[];
  onComplete: (id: string) => void;
  onSkip: (id: string, reason?: string) => void;
  onRestore: (id: string) => void;
  onAcceptAdaptation: (id: string) => void;
  onRejectAdaptation: (id: string) => void;
}

function TimeSection({
  title,
  icon: Icon,
  items,
  onComplete,
  onSkip,
  onRestore,
  onAcceptAdaptation,
  onRejectAdaptation,
}: TimeSectionProps) {
  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.status === "completed").length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            {title}
          </h2>
        </div>
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {completedCount}/{items.length} completed
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <PlanItemCard
            key={item.id}
            item={item}
            onComplete={onComplete}
            onSkip={onSkip}
            onRestore={onRestore}
            onAcceptAdaptation={onAcceptAdaptation}
            onRejectAdaptation={onRejectAdaptation}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function PlanPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [plan, setPlan] = useState(SAMPLE_PLAN);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const handleComplete = (id: string) => {
    setPlan((prev) => {
      const updated = { ...prev };
      for (const time of Object.keys(updated)) {
        updated[time] = updated[time].map((item) =>
          item.id === id ? { ...item, status: "completed" as const } : item
        );
      }
      return updated;
    });
  };

  const handleSkip = (id: string, reason?: string) => {
    setPlan((prev) => {
      const updated = { ...prev };
      for (const time of Object.keys(updated)) {
        updated[time] = updated[time].map((item) =>
          item.id === id ? { ...item, status: "skipped" as const, skipReason: reason } : item
        );
      }
      return updated;
    });
  };

  const handleRestore = (id: string) => {
    setPlan((prev) => {
      const updated = { ...prev };
      for (const time of Object.keys(updated)) {
        updated[time] = updated[time].map((item) =>
          item.id === id ? { ...item, status: "pending" as const, skipReason: undefined } : item
        );
      }
      return updated;
    });
  };

  const handleAcceptAdaptation = (id: string) => {
    setPlan((prev) => {
      const updated = { ...prev };
      for (const time of Object.keys(updated)) {
        updated[time] = updated[time].map((item) =>
          item.id === id && item.adaptation
            ? {
                ...item,
                adaptation: { ...item.adaptation, status: "accepted" as const },
                locked: false,
              }
            : item
        );
      }
      return updated;
    });
  };

  const handleRejectAdaptation = (id: string) => {
    setPlan((prev) => {
      const updated = { ...prev };
      for (const time of Object.keys(updated)) {
        updated[time] = updated[time].map((item) =>
          item.id === id && item.adaptation
            ? {
                ...item,
                adaptation: { ...item.adaptation, status: "restored" as const },
              }
            : item
        );
      }
      return updated;
    });
  };

  // Calculate totals
  const allItems = Object.values(plan).flat();
  const totalCompleted = allItems.filter((i) => i.status === "completed").length;
  const totalSkipped = allItems.filter((i) => i.status === "skipped").length;
  const totalPending = allItems.filter((i) => i.status === "pending").length;
  const overallProgress = Math.round((totalCompleted / allItems.length) * 100);

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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Daily Plan
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Link href="/health/workouts">
            <Button variant="secondary" size="sm">
              View full schedule
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[var(--color-foreground)]">
                Daily Progress
              </span>
              <span className="text-sm text-[var(--color-muted-foreground)]">
                {overallProgress}% complete
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-muted)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-[var(--color-tertiary)]">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-[var(--color-success)]" />
                {totalCompleted} completed
              </span>
              <span className="flex items-center gap-1">
                <Circle className="h-3 w-3 text-[var(--color-warning)]" />
                {totalPending} pending
              </span>
              <span className="flex items-center gap-1">
                <X className="h-3 w-3 text-[var(--color-tertiary)]" />
                {totalSkipped} skipped
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Plan Sections */}
        <TimeSection
          title="Morning"
          icon={Sunrise}
          items={plan.morning}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onRestore={handleRestore}
          onAcceptAdaptation={handleAcceptAdaptation}
          onRejectAdaptation={handleRejectAdaptation}
        />

        <TimeSection
          title="Afternoon"
          icon={Sun}
          items={plan.afternoon}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onRestore={handleRestore}
          onAcceptAdaptation={handleAcceptAdaptation}
          onRejectAdaptation={handleRejectAdaptation}
        />

        <TimeSection
          title="Evening"
          icon={Sunset}
          items={plan.evening}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onRestore={handleRestore}
          onAcceptAdaptation={handleAcceptAdaptation}
          onRejectAdaptation={handleRejectAdaptation}
        />

        <TimeSection
          title="Anytime"
          icon={Clock}
          items={plan.anytime}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onRestore={handleRestore}
          onAcceptAdaptation={handleAcceptAdaptation}
          onRejectAdaptation={handleRejectAdaptation}
        />

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance. Always consult a healthcare
            professional before starting a new fitness or nutrition program.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
