"use client";

/**
 * MetricCard - Card component for displaying a single metric
 * Shows value, label, trend, and optional comparison
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "./score-ring";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";

interface MetricCardProps {
  // Main metric data
  label: string;
  value: string | number;
  unit?: string;
  
  // Visual options
  icon?: React.ReactNode;
  color?: "readiness" | "sleep" | "nutrition" | "workout" | "activity" | "hydration" | "ai" | "default";
  showRing?: boolean;
  ringScore?: number;
  
  // Trend and comparison
  trend?: "up" | "down" | "stable";
  trendValue?: string | number;
  comparison?: string;
  
  // Status indicators
  status?: "success" | "warning" | "error" | "info";
  badge?: string;
  isEstimated?: boolean;
  
  // Interactive
  href?: string;
  onClick?: () => void;
  
  // Loading/empty states
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  
  // Styling
  className?: string;
  as?: "div" | "article" | "section";
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  color = "default",
  showRing = false,
  ringScore,
  trend,
  trendValue,
  comparison,
  status,
  badge,
  isEstimated = false,
  href,
  onClick,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "No data available",
  className,
  as: Component = "div",
}: MetricCardProps) {
  const colorClasses: Record<string, string> = {
    readiness: "text-readiness bg-readiness-muted",
    sleep: "text-sleep bg-sleep-muted",
    nutrition: "text-nutrition bg-nutrition-muted",
    workout: "text-workout bg-workout-muted",
    activity: "text-activity bg-activity-muted",
    hydration: "text-hydration bg-hydration-muted",
    ai: "text-ai bg-ai-muted",
    default: "text-[var(--color-muted-foreground)] bg-[var(--color-muted)]",
  };

  const statusClasses: Record<string, string> = {
    success: "border-[var(--color-success)]/30",
    warning: "border-[var(--color-warning)]/30",
    error: "border-[var(--color-error)]/30",
    info: "border-[var(--color-info)]/30",
  };

  const content = (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:border-[var(--color-border-hover)]",
        status && statusClasses[status],
        href && "cursor-pointer",
        className
      )}
      {...(onClick && { onClick: onClick, role: "button", tabIndex: 0 })}
    >
      <CardContent className="p-4 lg:p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-20 animate-shimmer rounded bg-[var(--color-elevated)]" />
            <div className="h-8 w-16 animate-shimmer rounded bg-[var(--color-elevated)]" />
            <div className="h-3 w-24 animate-shimmer rounded bg-[var(--color-elevated)]" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                {icon && (
                  <div className={cn("p-1.5 rounded-md", colorClasses[color])}>
                    {icon}
                  </div>
                )}
                <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  {label}
                </span>
                {badge && (
                  <Badge variant="primary" size="sm">
                    {badge}
                  </Badge>
                )}
                {isEstimated && (
                  <Badge variant="outline" size="sm">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Estimated
                  </Badge>
                )}
              </div>

              {/* Value */}
              <div className="flex items-baseline gap-1.5">
                <span className="metric-value text-2xl lg:text-3xl">
                  {value}
                </span>
                {unit && (
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    {unit}
                  </span>
                )}
              </div>

              {/* Trend and comparison */}
              {(trend || comparison) && (
                <div className="flex items-center gap-2 mt-2">
                  {trend && (
                    <div
                      className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        trend === "up" && "text-[var(--color-success)]",
                        trend === "down" && "text-[var(--color-error)]",
                        trend === "stable" && "text-[var(--color-muted-foreground)]"
                      )}
                    >
                      {trend === "up" && <TrendingUp className="h-4 w-4" />}
                      {trend === "down" && <TrendingDown className="h-4 w-4" />}
                      {trend === "stable" && <Minus className="h-4 w-4" />}
                      {trendValue && (
                        <span className="tabular-nums">{trendValue}</span>
                      )}
                    </div>
                  )}
                  {comparison && (
                    <span className="text-xs text-[var(--color-tertiary)]">
                      {comparison}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Ring visualization */}
            {showRing && ringScore !== undefined && (
              <ScoreRing
                score={ringScore}
                size="sm"
                color={color === "default" ? "readiness" : color}
              />
            )}
          </div>
        )}
      </CardContent>

      {/* Hover indicator for links */}
      {href && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </div>
      )}
    </Card>
  );

  if (href) {
    return (
      <Component
        className="block"
        onClick={() => window.location.href = href}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && (window.location.href = href)}
      >
        {content}
      </Component>
    );
  }

  return content;
}

// Quick Metric variant - smaller, inline display
interface QuickMetricProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  color?: MetricCardProps["color"];
  trend?: "up" | "down" | "stable";
  className?: string;
}

export function QuickMetric({
  label,
  value,
  unit,
  icon,
  color = "default",
  trend,
  className,
}: QuickMetricProps) {
  const colorClasses: Record<string, string> = {
    readiness: "text-readiness",
    sleep: "text-sleep",
    nutrition: "text-nutrition",
    workout: "text-workout",
    activity: "text-activity",
    hydration: "text-hydration",
    ai: "text-ai",
    default: "text-[var(--color-foreground)]",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {icon && (
        <div className={cn("p-2 rounded-lg bg-[var(--color-muted)]", colorClasses[color])}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-lg font-semibold tabular-nums", colorClasses[color])}>
            {value}
          </span>
          {unit && (
            <span className="text-xs text-[var(--color-tertiary)]">{unit}</span>
          )}
        </div>
      </div>
      {trend && (
        <div className={cn(
          "ml-auto",
          trend === "up" && "text-[var(--color-success)]",
          trend === "down" && "text-[var(--color-error)]",
          trend === "stable" && "text-[var(--color-muted-foreground)]"
        )}>
          {trend === "up" && <ArrowUpRight className="h-5 w-5" />}
          {trend === "down" && <ArrowDownRight className="h-5 w-5" />}
          {trend === "stable" && <Minus className="h-5 w-5" />}
        </div>
      )}
    </div>
  );
}
