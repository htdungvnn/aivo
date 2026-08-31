"use client";

/**
 * ChartCard - Wrapper for chart visualizations
 * Provides consistent styling, loading states, and accessibility
 */

import React, { Suspense } from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  
  // Header actions
  action?: React.ReactNode;
  
  // Ranges for time selection
  ranges?: Array<{ label: string; value: string }>;
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  
  // Stats
  currentValue?: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  comparison?: string;
  
  // Status
  isLoading?: boolean;
  isStale?: boolean;
  lastUpdated?: Date;
  error?: string;
  onRetry?: () => void;
  
  // Accessibility
  ariaLabel?: string;
  description?: string;
  
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  action,
  ranges,
  selectedRange = "7d",
  onRangeChange,
  currentValue,
  unit,
  trend,
  trendValue,
  comparison,
  isLoading = false,
  isStale = false,
  lastUpdated,
  error,
  onRetry,
  ariaLabel,
  description,
  className,
}: ChartCardProps) {
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {isStale && (
              <Badge variant="warning" size="sm">
                Stale
              </Badge>
            )}
            {error && (
              <Badge variant="error" size="sm">
                Error
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Range selector */}
          {ranges && onRangeChange && (
            <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-0.5">
              {ranges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => onRangeChange(range.value)}
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                    selectedRange === range.value
                      ? "bg-[var(--color-elevated)] text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          )}

          {action}
        </div>
      </CardHeader>

      {/* Stats row */}
      {(currentValue || trend || comparison) && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-4">
            {currentValue && (
              <div>
                <span className="text-2xl font-bold tabular-nums">
                  {currentValue}
                </span>
                {unit && (
                  <span className="ml-1 text-sm text-[var(--color-muted-foreground)]">
                    {unit}
                  </span>
                )}
              </div>
            )}
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-sm",
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
        </div>
      )}

      <CardContent className="pt-2">
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-[var(--color-error)] mb-2" />
            <p className="text-sm text-[var(--color-muted-foreground)] mb-2">
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            )}
          </div>
        ) : isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <Suspense
              fallback={
                <div className="h-64 animate-pulse bg-[var(--color-elevated)] rounded-lg" />
              }
            >
              {children}
            </Suspense>

            {/* Footer with last updated */}
            {lastUpdated && !isLoading && !error && (
              <p className="mt-2 text-xs text-[var(--color-tertiary)] text-right">
                Last updated: {formatLastUpdated(lastUpdated)}
              </p>
            )}
          </>
        )}
      </CardContent>

      {/* Accessibility */}
      {ariaLabel && <span className="sr-only">{ariaLabel}</span>}
      {description && (
        <p className="sr-only">{description}</p>
      )}
    </Card>
  );
}

// Simple line/bar chart placeholder using pure SVG
interface SimpleChartProps {
  data: Array<{ value: number; label?: string }>;
  height?: number;
  color?: string;
  showDots?: boolean;
  showLabels?: boolean;
  className?: string;
}

export function SimpleChart({
  data,
  height = 200,
  color = "var(--color-primary)",
  showDots = true,
  showLabels = false,
  className,
}: SimpleChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-[var(--color-muted-foreground)]",
          className
        )}
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;
  const padding = 20;
  const width = 100;
  const chartHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = chartHeight - ((d.value - minValue) / range) * chartHeight + padding;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-full", className)}
      role="img"
      aria-label="Chart visualization"
    >
      {/* Gradient fill */}
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={`${pathD} L ${points[points.length - 1]?.x || 0} ${height} L ${padding} ${height} Z`}
        fill="url(#chartGradient)"
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {showDots &&
        points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--color-surface)"
            stroke={color}
            strokeWidth="2"
          />
        ))}

      {/* Labels */}
      {showLabels &&
        points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            className="fill-[var(--color-tertiary)]"
            style={{ fontSize: "8px" }}
          >
            {p.label || ""}
          </text>
        ))}
    </svg>
  );
}
