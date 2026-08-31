"use client";

/**
 * Onboarding Flow - Multi-step wizard for new users
 * Collects user preferences and health goals
 */

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Target,
  User,
  Dumbbell,
  Utensils,
  Moon,
  Calendar,
  Heart,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface OnboardingData {
  // Step 1: Goal
  goal: "fat_loss" | "muscle_gain" | "general_fitness" | "mobility" | "healthy_lifestyle" | null;
  
  // Step 2: Profile
  displayName: string;
  birthYear: string;
  biologicalSex: "male" | "female" | "other" | null;
  height: string;
  weight: string;
  unit: "metric" | "imperial";
  
  // Step 3: Activity Level
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active" | null;
  
  // Step 4: Fitness Experience
  fitnessExperience: "beginner" | "intermediate" | "advanced" | null;
  
  // Step 5: Nutrition Preferences
  dietaryRestrictions: string[];
  mealFrequency: number;
  
  // Step 6: Equipment
  availableEquipment: string[];
  
  // Step 7: Weekly Availability
  workoutDays: number;
  preferredWorkoutTime: "morning" | "afternoon" | "evening" | null;
  
  // Step 8: Sleep & Recovery
  averageSleepHours: string;
  sleepQuality: "poor" | "fair" | "good" | "excellent" | null;
  
  // Step 9: Health Data Permissions
  allowWearableSync: boolean;
  shareWithCoach: boolean;
  
  // Step 10: Plan Preview
  // Summary of selections
}

// =============================================================================
// Constants
// =============================================================================

const STEPS = [
  { id: 1, title: "Goal", icon: Target },
  { id: 2, title: "Profile", icon: User },
  { id: 3, title: "Activity", icon: Heart },
  { id: 4, title: "Experience", icon: Dumbbell },
  { id: 5, title: "Nutrition", icon: Utensils },
  { id: 6, title: "Equipment", icon: Dumbbell },
  { id: 7, title: "Schedule", icon: Calendar },
  { id: 8, title: "Sleep", icon: Moon },
  { id: 9, title: "Permissions", icon: Smartphone },
  { id: 10, title: "Preview", icon: Sparkles },
];

const GOALS = [
  {
    id: "fat_loss",
    label: "Fat Loss",
    description: "Reduce body fat while preserving muscle",
    icon: "🔥",
  },
  {
    id: "muscle_gain",
    label: "Muscle Gain",
    description: "Build strength and muscle mass",
    icon: "💪",
  },
  {
    id: "general_fitness",
    label: "General Fitness",
    description: "Improve overall health and wellness",
    icon: "🌟",
  },
  {
    id: "mobility",
    label: "Mobility",
    description: "Increase flexibility and movement quality",
    icon: "🧘",
  },
  {
    id: "healthy_lifestyle",
    label: "Healthy Lifestyle",
    description: "Maintain balanced health habits",
    icon: "🌿",
  },
] as const;

const ACTIVITY_LEVELS = [
  {
    id: "sedentary",
    label: "Sedentary",
    description: "Little to no exercise, desk job",
  },
  {
    id: "lightly_active",
    label: "Lightly Active",
    description: "Light exercise 1-3 days/week",
  },
  {
    id: "moderately_active",
    label: "Moderately Active",
    description: "Moderate exercise 3-5 days/week",
  },
  {
    id: "very_active",
    label: "Very Active",
    description: "Hard exercise 6-7 days/week",
  },
  {
    id: "extremely_active",
    label: "Extremely Active",
    description: "Very hard exercise, physical job",
  },
] as const;

const FITNESS_LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    description: "New to exercise or returning after a long break",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Consistent training for 1-3 years",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Several years of consistent training",
  },
] as const;

const EQUIPMENT_OPTIONS = [
  "None (bodyweight only)",
  "Dumbbells",
  "Barbell & weights",
  "Kettlebell",
  "Resistance bands",
  "Pull-up bar",
  "Cable machine",
  "Rowing machine",
  "Stationary bike",
  "Treadmill",
] as const;

const DIETARY_OPTIONS = [
  "No restrictions",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Gluten-free",
  "Dairy-free",
  "Nut-free",
  "Low-carb",
  "Keto",
  "Paleo",
] as const;

// =============================================================================
// Step Components
// =============================================================================

interface StepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

function GoalStep({ data, onUpdate, onNext, onBack }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          What's your main goal?
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          Select the health goal that matters most to you right now.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GOALS.map((goal) => (
          <button
            key={goal.id}
            onClick={() => onUpdate({ goal: goal.id })}
            className={cn(
              "p-4 rounded-xl border text-left transition-all",
              data.goal === goal.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-elevated)]"
            )}
          >
            <span className="text-3xl mb-2 block">{goal.icon}</span>
            <h3 className="font-semibold text-[var(--color-foreground)]">
              {goal.label}
            </h3>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              {goal.description}
            </p>
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!data.goal}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ProfileStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => currentYear - 20 - i);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Tell us about yourself
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          This helps us calculate your personalized targets.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={data.displayName}
            onChange={(e) => onUpdate({ displayName: e.target.value })}
            placeholder="Your name"
            className="w-full h-11 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] placeholder:text-[var(--color-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Unit Toggle */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
            Measurement Unit
          </label>
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => onUpdate({ unit: "metric" })}
              className={cn(
                "flex-1 py-2 text-sm font-medium transition-colors",
                data.unit === "metric"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)]"
              )}
            >
              Metric (kg, cm)
            </button>
            <button
              onClick={() => onUpdate({ unit: "imperial" })}
              className={cn(
                "flex-1 py-2 text-sm font-medium transition-colors",
                data.unit === "imperial"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)]"
              )}
            >
              Imperial (lb, in)
            </button>
          </div>
        </div>

        {/* Birth Year */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
            Birth Year
          </label>
          <select
            value={data.birthYear}
            onChange={(e) => onUpdate({ birthYear: e.target.value })}
            className="w-full h-11 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
          >
            <option value="">Select year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Biological Sex */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
            Biological Sex
          </label>
          <div className="flex gap-3">
            {(["male", "female", "other"] as const).map((sex) => (
              <button
                key={sex}
                onClick={() => onUpdate({ biologicalSex: sex })}
                className={cn(
                  "flex-1 py-2.5 rounded-lg border text-sm font-medium capitalize transition-all",
                  data.biologicalSex === sex
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
                )}
              >
                {sex}
              </button>
            ))}
          </div>
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
              Height ({data.unit === "metric" ? "cm" : "in"})
            </label>
            <input
              type="number"
              value={data.height}
              onChange={(e) => onUpdate({ height: e.target.value })}
              placeholder={data.unit === "metric" ? "170" : "68"}
              className="w-full h-11 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] placeholder:text-[var(--color-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
              Weight ({data.unit === "metric" ? "kg" : "lb"})
            </label>
            <input
              type="number"
              value={data.weight}
              onChange={(e) => onUpdate({ weight: e.target.value })}
              placeholder={data.unit === "metric" ? "70" : "154"}
              className="w-full h-11 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] placeholder:text-[var(--color-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ActivityStep({ data, onUpdate, onNext, onBack }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          How active are you?
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          This helps us calibrate your daily targets and workout intensity.
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {ACTIVITY_LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => onUpdate({ activityLevel: level.id })}
            className={cn(
              "w-full p-4 rounded-xl border text-left transition-all",
              data.activityLevel === level.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-elevated)]"
            )}
          >
            <h3 className="font-semibold text-[var(--color-foreground)]">
              {level.label}
            </h3>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              {level.description}
            </p>
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!data.activityLevel}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ExperienceStep({ data, onUpdate, onNext, onBack }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Your fitness experience
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          We'll tailor workout recommendations to your level.
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {FITNESS_LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => onUpdate({ fitnessExperience: level.id })}
            className={cn(
              "w-full p-4 rounded-xl border text-left transition-all",
              data.fitnessExperience === level.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-elevated)]"
            )}
          >
            <h3 className="font-semibold text-[var(--color-foreground)]">
              {level.label}
            </h3>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              {level.description}
            </p>
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!data.fitnessExperience}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function NutritionStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const toggleDiet = (diet: string) => {
    if (data.dietaryRestrictions.includes(diet)) {
      onUpdate({
        dietaryRestrictions: data.dietaryRestrictions.filter((d) => d !== diet),
      });
    } else {
      onUpdate({
        dietaryRestrictions: [...data.dietaryRestrictions, diet],
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Nutrition preferences
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          Help us tailor meal recommendations to your diet.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
            Dietary Restrictions
          </label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((diet) => (
              <button
                key={diet}
                onClick={() => toggleDiet(diet)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  data.dietaryRestrictions.includes(diet)
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)]"
                )}
              >
                {diet}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
            Meals per day
          </label>
          <div className="flex gap-3">
            {[3, 4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => onUpdate({ mealFrequency: num })}
                className={cn(
                  "flex-1 py-3 rounded-lg border text-sm font-medium transition-all",
                  data.mealFrequency === num
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function EquipmentStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const toggleEquipment = (equipment: string) => {
    if (data.availableEquipment.includes(equipment)) {
      onUpdate({
        availableEquipment: data.availableEquipment.filter((e) => e !== equipment),
      });
    } else {
      onUpdate({
        availableEquipment: [...data.availableEquipment, equipment],
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Available equipment
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          Select what you have access to for workouts.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
        {EQUIPMENT_OPTIONS.map((equipment) => (
          <button
            key={equipment}
            onClick={() => toggleEquipment(equipment)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              data.availableEquipment.includes(equipment)
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)]"
            )}
          >
            {equipment}
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ScheduleStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayValues = [1, 2, 3, 4, 5, 6, 7];

  const toggleDay = (day: number) => {
    if (data.workoutDays === day) {
      onUpdate({ workoutDays: 0 }); // Deselect
    } else {
      onUpdate({ workoutDays: day });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Weekly availability
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          How many days per week can you workout?
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Workout Days */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-3">
            Workout Days
          </label>
          <div className="flex justify-between gap-1">
            {days.map((day, i) => (
              <button
                key={day}
                onClick={() => toggleDay(dayValues[i])}
                className={cn(
                  "w-10 h-10 rounded-full text-sm font-medium transition-all",
                  data.workoutDays === dayValues[i]
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)]"
                )}
              >
                {day}
              </button>
            ))}
          </div>
          {data.workoutDays > 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)] mt-2 text-center">
              {data.workoutDays} day{data.workoutDays > 1 ? "s" : ""} per week
            </p>
          )}
        </div>

        {/* Preferred Time */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-3">
            Preferred Workout Time
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["morning", "afternoon", "evening"] as const).map((time) => (
              <button
                key={time}
                onClick={() => onUpdate({ preferredWorkoutTime: time })}
                className={cn(
                  "py-3 rounded-lg border text-sm font-medium capitalize transition-all",
                  data.preferredWorkoutTime === time
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
                )}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={data.workoutDays === 0}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function SleepStep({ data, onUpdate, onNext, onBack }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Sleep & Recovery
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          Good sleep is essential for recovery and performance.
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Sleep Hours */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-3">
            Average sleep hours per night
          </label>
          <input
            type="range"
            min="4"
            max="10"
            step="0.5"
            value={parseFloat(data.averageSleepHours) || 7}
            onChange={(e) => onUpdate({ averageSleepHours: e.target.value })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-muted)]"
          />
          <div className="flex justify-between text-sm text-[var(--color-muted-foreground)] mt-2">
            <span>4h</span>
            <span className="text-lg font-semibold text-[var(--color-primary)]">
              {data.averageSleepHours || "7"}h
            </span>
            <span>10h</span>
          </div>
        </div>

        {/* Sleep Quality */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-3">
            How would you rate your sleep quality?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["poor", "fair", "good", "excellent"] as const).map((quality) => (
              <button
                key={quality}
                onClick={() => onUpdate({ sleepQuality: quality })}
                className={cn(
                  "py-3 px-4 rounded-lg border text-sm font-medium capitalize transition-all",
                  data.sleepQuality === quality
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]"
                )}
              >
                {quality}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function PermissionsStep({ data, onUpdate, onNext, onBack }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Data & Permissions
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          Choose how AIVO can access your health data.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {/* Wearable Sync */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            data.allowWearableSync && "border-[var(--color-primary)]"
          )}
          onClick={() => onUpdate({ allowWearableSync: !data.allowWearableSync })}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5",
                  data.allowWearableSync
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                    : "border-[var(--color-border)]"
                )}
              >
                {data.allowWearableSync && (
                  <Check className="h-3 w-3 text-[var(--color-primary-foreground)]" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-[var(--color-foreground)]">
                  Sync with wearables
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  Connect Apple Watch, Fitbit, or Garmin to automatically import
                  health data like heart rate, sleep, and activity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share with Coach */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            data.shareWithCoach && "border-[var(--color-primary)]"
          )}
          onClick={() => onUpdate({ shareWithCoach: !data.shareWithCoach })}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5",
                  data.shareWithCoach
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                    : "border-[var(--color-border)]"
                )}
              >
                {data.shareWithCoach && (
                  <Check className="h-3 w-3 text-[var(--color-primary-foreground)]" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-[var(--color-foreground)]">
                  Share data with AI Coach
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  Allow AIVO's AI to analyze your health patterns to provide
                  personalized recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <div className="p-4 rounded-lg bg-[var(--color-muted)]">
          <p className="text-xs text-[var(--color-tertiary)]">
            <strong>Your privacy matters:</strong> AIVO never sells your health data.
            You can change these settings anytime in your account preferences.
            All data is encrypted and stored securely.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function PreviewStep({ data, onUpdate, onNext, onBack }: StepProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Redirect to dashboard
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-[var(--color-success)]/10 mb-4">
          <Check className="h-6 w-6 text-[var(--color-success)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          Your plan is ready!
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          Here's a summary of your personalized AIVO experience.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">Goal</span>
              <Badge variant="primary">
                {GOALS.find((g) => g.id === data.goal)?.label || "Not set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">Workouts</span>
              <Badge>{data.workoutDays} days/week</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">Experience</span>
              <Badge>
                {FITNESS_LEVELS.find((l) => l.id === data.fitnessExperience)?.label || "Not set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">Equipment</span>
              <span className="text-sm text-[var(--color-foreground)]">
                {data.availableEquipment.length > 0 
                  ? `${data.availableEquipment.length} items`
                  : "Bodyweight only"
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">Sleep Target</span>
              <span className="text-sm text-[var(--color-foreground)]">
                {data.averageSleepHours || "7"} hours/night
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="p-4 rounded-lg bg-[var(--color-ai-muted)] border border-[var(--color-ai)]/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-[var(--color-ai)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--color-ai)]">
                AI is preparing your plan
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Based on your preferences, AIVO will create a personalized workout
                plan, meal recommendations, and daily targets within the next few minutes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleComplete} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Zap className="h-4 w-4 mr-2 animate-pulse" />
              Setting up...
            </>
          ) : (
            <>
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

const STEP_COMPONENTS: Record<number, React.ComponentType<StepProps>> = {
  1: GoalStep,
  2: ProfileStep,
  3: ActivityStep,
  4: ExperienceStep,
  5: NutritionStep,
  6: EquipmentStep,
  7: ScheduleStep,
  8: SleepStep,
  9: PermissionsStep,
  10: PreviewStep,
};

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    goal: null,
    displayName: "",
    birthYear: "",
    biologicalSex: null,
    height: "",
    weight: "",
    unit: "metric",
    activityLevel: null,
    fitnessExperience: null,
    dietaryRestrictions: [],
    mealFrequency: 3,
    availableEquipment: [],
    workoutDays: 0,
    preferredWorkoutTime: null,
    averageSleepHours: "7",
    sleepQuality: null,
    allowWearableSync: true,
    shareWithCoach: true,
  });

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]">
              <Zap className="h-5 w-5 text-[var(--color-primary-foreground)]" />
            </div>
            <span className="text-lg font-bold text-[var(--color-foreground)]">
              AIVO
            </span>
          </div>
          <span className="text-sm text-[var(--color-muted-foreground)]">
            Step {currentStep} of {STEPS.length}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-[var(--color-muted)]">
        <div
          className="h-full bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="hidden lg:flex justify-center py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id)}
                  disabled={step.id > currentStep && currentStep < step.id - 1}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
                    isActive && "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
                    isCompleted && "text-[var(--color-success)]",
                    !isActive && !isCompleted && "text-[var(--color-muted-foreground)]"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium hidden xl:inline">
                    {step.title}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 rounded",
                      isCompleted ? "bg-[var(--color-success)]" : "bg-[var(--color-border)]"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <StepComponent
          data={data}
          onUpdate={updateData}
          onNext={goNext}
          onBack={goBack}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-4 flex justify-between text-xs text-[var(--color-tertiary)]">
          <Link href="/privacy" className="hover:text-[var(--color-foreground)]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-foreground)]">
            Terms of Service
          </Link>
          <span>© 2026 AIVO. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
