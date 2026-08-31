"use client";

/**
 * ScoreRing - Circular progress indicator for scores
 * Displays a score (0-100) with visual ring
 */

import React from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg" | "xl";
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
  color?: "readiness" | "sleep" | "nutrition" | "workout" | "activity" | "hydration" | "ai" | "default";
  className?: string;
}

const sizeMap = {
  sm: { outer: 64, inner: 52, stroke: 4, fontSize: "text-sm" },
  md: { outer: 96, inner: 80, stroke: 5, fontSize: "text-xl" },
  lg: { outer: 140, inner: 118, stroke: 6, fontSize: "text-3xl" },
  xl: { outer: 200, inner: 170, stroke: 8, fontSize: "text-5xl" },
};

const colorMap = {
  readiness: {
    stroke: "var(--color-readiness)",
    track: "var(--color-readiness-muted)",
    text: "var(--color-readiness)",
  },
  sleep: {
    stroke: "var(--color-sleep)",
    track: "var(--color-sleep-muted)",
    text: "var(--color-sleep)",
  },
  nutrition: {
    stroke: "var(--color-nutrition)",
    track: "var(--color-nutrition-muted)",
    text: "var(--color-nutrition)",
  },
  workout: {
    stroke: "var(--color-workout)",
    track: "var(--color-workout-muted)",
    text: "var(--color-workout)",
  },
  activity: {
    stroke: "var(--color-activity)",
    track: "var(--color-activity-muted)",
    text: "var(--color-activity)",
  },
  hydration: {
    stroke: "var(--color-hydration)",
    track: "var(--color-hydration-muted)",
    text: "var(--color-hydration)",
  },
  ai: {
    stroke: "var(--color-ai)",
    track: "var(--color-ai-muted)",
    text: "var(--color-ai)",
  },
  default: {
    stroke: "var(--color-primary)",
    track: "var(--color-primary)",
    text: "var(--color-foreground)",
  },
};

export function ScoreRing({
  score,
  size = "md",
  strokeWidth,
  showLabel = true,
  label,
  color = "default",
  className,
}: ScoreRingProps) {
  const config = sizeMap[size];
  const colors = colorMap[color];
  const actualStroke = strokeWidth || config.stroke;

  // Calculate SVG dimensions
  const radius = (config.outer - actualStroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Determine if score is good (>= 70)
  const isGood = score >= 70;
  const isWarning = score >= 40 && score < 70;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={config.outer}
        height={config.outer}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          stroke={colors.track}
          strokeWidth={actualStroke}
        />
        {/* Progress arc */}
        <circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={actualStroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-bold tabular-nums",
            config.fontSize,
            color !== "default" ? "text-[var(--color-foreground)]" : colors.text
          )}
          style={{ color: color !== "default" ? undefined : colors.text }}
        >
          {score}
        </span>
        {showLabel && (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {label || "Score"}
          </span>
        )}
      </div>
    </div>
  );
}
