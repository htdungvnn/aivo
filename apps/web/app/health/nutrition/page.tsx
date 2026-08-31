"use client";

/**
 * Nutrition Page - Meal tracking, macros, and nutrition adherence
 */

import React, { useState, useCallback } from "react";
import Link from "next/link";
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
  Flame,
  Utensils,
  Plus,
  Camera,
  Clock,
  ChevronRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Check,
  Edit,
  Trash2,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Meal {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isEstimated?: boolean;
  confidence?: number;
}

interface NutritionTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// =============================================================================
// Sample Data
// =============================================================================

const TARGETS: NutritionTarget = {
  calories: 2200,
  protein: 150,
  carbs: 220,
  fat: 73,
};

const SAMPLE_MEALS: Meal[] = [
  {
    id: "1",
    type: "breakfast",
    name: "Greek yogurt parfait",
    time: "8:00 AM",
    calories: 320,
    protein: 22,
    carbs: 45,
    fat: 8,
  },
  {
    id: "2",
    type: "lunch",
    name: "Grilled chicken salad",
    time: "12:30 PM",
    calories: 450,
    protein: 42,
    carbs: 28,
    fat: 18,
    isEstimated: true,
    confidence: 0.87,
  },
  {
    id: "3",
    type: "snack",
    name: "Protein shake",
    time: "3:00 PM",
    calories: 180,
    protein: 25,
    carbs: 8,
    fat: 3,
  },
];

const CALORIE_TREND = [
  { value: 2100, label: "Mon" },
  { value: 2350, label: "Tue" },
  { value: 1950, label: "Wed" },
  { value: 2200, label: "Thu" },
  { value: 2400, label: "Fri" },
  { value: 2100, label: "Sat" },
  { value: 1950, label: "Sun" },
];

const PROTEIN_TREND = [
  { value: 120, label: "Mon" },
  { value: 145, label: "Tue" },
  { value: 130, label: "Wed" },
  { value: 150, label: "Thu" },
  { value: 135, label: "Fri" },
  { value: 155, label: "Sat" },
  { value: 140, label: "Sun" },
];

// =============================================================================
// Components
// =============================================================================

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

function MacroBar({ label, current, target, color, unit = "g" }: MacroBarProps) {
  const percent = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-muted-foreground)]">{label}</span>
        <span className="font-medium text-[var(--color-foreground)] tabular-nums">
          {current}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-muted)] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-[var(--color-tertiary)]">
        {remaining > 0 ? `${remaining}${unit} remaining` : "Target reached"}
      </p>
    </div>
  );
}

interface MealCardProps {
  meal: Meal;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
  const mealTypeConfig = {
    breakfast: { icon: "🌅", label: "Breakfast", color: "text-[var(--color-nutrition)]" },
    lunch: { icon: "☀️", label: "Lunch", color: "text-[var(--color-workout)]" },
    dinner: { icon: "🌙", label: "Dinner", color: "text-[var(--color-sleep)]" },
    snack: { icon: "🍎", label: "Snack", color: "text-[var(--color-muted-foreground)]" },
  };

  const config = mealTypeConfig[meal.type];

  return (
    <Card className="hover:border-[var(--color-border-hover)] transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[var(--color-foreground)]">
                  {meal.name}
                </h3>
                {meal.isEstimated && (
                  <Badge variant="outline" size="sm" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI estimated
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                {meal.time}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="tabular-nums">
                  <span className="font-medium">{meal.calories}</span>
                  <span className="text-[var(--color-tertiary)]"> kcal</span>
                </span>
                <span className="tabular-nums text-[var(--color-muted-foreground)]">
                  P: <span className="font-medium text-[var(--color-nutrition)]">{meal.protein}g</span>
                </span>
                <span className="tabular-nums text-[var(--color-muted-foreground)]">
                  C: <span className="font-medium text-[var(--color-workout)]">{meal.carbs}g</span>
                </span>
                <span className="tabular-nums text-[var(--color-muted-foreground)]">
                  F: <span className="font-medium text-[var(--color-warning)]">{meal.fat}g</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(meal.id)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(meal.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickAddMealTypeProps {
  type: Meal["type"];
  onClick: () => void;
}

function QuickAddMealType({ type, onClick }: QuickAddMealTypeProps) {
  const configs = {
    breakfast: { icon: "🌅", label: "Breakfast" },
    lunch: { icon: "☀️", label: "Lunch" },
    dinner: { icon: "🌙", label: "Dinner" },
    snack: { icon: "🍎", label: "Snack" },
  };

  const config = configs[type];

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors"
    >
      <span className="text-2xl">{config.icon}</span>
      <span className="text-sm text-[var(--color-muted-foreground)]">{config.label}</span>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function NutritionPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [meals, setMeals] = useState<Meal[]>(SAMPLE_MEALS);
  const [selectedRange, setSelectedRange] = useState("7d");

  const handleEditMeal = useCallback((id: string) => {
    console.log("Edit meal:", id);
  }, []);

  const handleDeleteMeal = useCallback((id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleAddMeal = useCallback((type: Meal["type"]) => {
    console.log("Add meal:", type);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading nutrition data..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remaining = {
    calories: TARGETS.calories - totals.calories,
    protein: TARGETS.protein - totals.protein,
    carbs: TARGETS.carbs - totals.carbs,
    fat: TARGETS.fat - totals.fat,
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
              Nutrition
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Track your meals and macros
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/health/nutrition/scan">
              <Button variant="secondary" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Scan Meal
              </Button>
            </Link>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Meal
            </Button>
          </div>
        </div>

        {/* Calories Summary */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Main Calorie Display */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-8 border-[var(--color-nutrition-muted)] flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
                        {totals.calories}
                      </span>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        consumed
                      </p>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--color-nutrition)] text-[var(--color-primary-foreground)] text-xs font-medium">
                    {remaining.calories > 0 ? `${remaining.calories} remaining` : "Target reached"}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Daily target
                  </p>
                  <p className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">
                    {TARGETS.calories}
                  </p>
                  <p className="text-sm text-[var(--color-tertiary)]">kcal</p>
                </div>
              </div>

              {/* Macro Summary */}
              <div className="flex-1 grid grid-cols-3 gap-6 lg:pl-8 lg:border-l lg:border-[var(--color-border)]">
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Protein</p>
                  <p className="text-xl font-bold text-[var(--color-nutrition)] tabular-nums">
                    {totals.protein}g
                  </p>
                  <p className="text-xs text-[var(--color-tertiary)]">
                    of {TARGETS.protein}g
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Carbs</p>
                  <p className="text-xl font-bold text-[var(--color-workout)] tabular-nums">
                    {totals.carbs}g
                  </p>
                  <p className="text-xs text-[var(--color-tertiary)]">
                    of {TARGETS.carbs}g
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Fat</p>
                  <p className="text-xl font-bold text-[var(--color-warning)] tabular-nums">
                    {totals.fat}g
                  </p>
                  <p className="text-xs text-[var(--color-tertiary)]">
                    of {TARGETS.fat}g
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Add */}
        <div>
          <h2 className="section-title mb-4">Quick Add</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAddMealType type="breakfast" onClick={() => handleAddMeal("breakfast")} />
            <QuickAddMealType type="lunch" onClick={() => handleAddMeal("lunch")} />
            <QuickAddMealType type="dinner" onClick={() => handleAddMeal("dinner")} />
            <QuickAddMealType type="snack" onClick={() => handleAddMeal("snack")} />
          </div>
        </div>

        {/* Today's Meals */}
        <div>
          <h2 className="section-title mb-4">Today's Meals</h2>
          {meals.length > 0 ? (
            <div className="space-y-3">
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onEdit={handleEditMeal}
                  onDelete={handleDeleteMeal}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Utensils className="h-12 w-12 mx-auto text-[var(--color-muted)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--color-foreground)] mb-2">
                  No meals logged today
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                  Start tracking your nutrition by adding your first meal.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Meal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Macro Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Macro Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MacroBar
              label="Protein"
              current={totals.protein}
              target={TARGETS.protein}
              color="bg-[var(--color-nutrition)]"
            />
            <MacroBar
              label="Carbohydrates"
              current={totals.carbs}
              target={TARGETS.carbs}
              color="bg-[var(--color-workout)]"
            />
            <MacroBar
              label="Fat"
              current={totals.fat}
              target={TARGETS.fat}
              color="bg-[var(--color-warning)]"
            />
          </CardContent>
        </Card>

        {/* Calorie Trend */}
        <ChartCard
          title="Calorie Trend"
          subtitle="Daily caloric intake"
          currentValue={totals.calories.toString()}
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
            height={200}
            color="var(--color-nutrition)"
            showDots
            showLabels
          />
        </ChartCard>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general nutrition guidance. Nutritional needs vary by individual.
            Consult a healthcare professional for personalized nutrition advice.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
