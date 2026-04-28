"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn, formatNumber } from "@/lib/utils";
import type { ChartDataPoint } from "@/types/health";
import { format } from "date-fns";

interface TimeSeriesChartProps {
  data: (ChartDataPoint & { isCurrent?: boolean })[];
  metric: "steps" | "heart_rate" | "calories_burned" | "sleep_duration" | "distance";
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  highlightToday?: boolean;
  className?: string;
}

const METRIC_CONFIG = {
  steps: {
    label: "Steps",
    unit: "steps",
    color: "#06b6d4", // cyan-500
    gradientStart: "rgba(6, 182, 212, 0.4)",
    gradientEnd: "rgba(6, 182, 212, 0.05)",
  },
  heart_rate: {
    label: "Heart Rate",
    unit: "bpm",
    color: "#ef4444", // red-500
    gradientStart: "rgba(239, 68, 68, 0.4)",
    gradientEnd: "rgba(239, 68, 68, 0.05)",
  },
  calories_burned: {
    label: "Calories",
    unit: "kcal",
    color: "#f59e0b", // amber-500
    gradientStart: "rgba(245, 158, 11, 0.4)",
    gradientEnd: "rgba(245, 158, 11, 0.05)",
  },
  sleep_duration: {
    label: "Sleep",
    unit: "hours",
    color: "#a855f7", // purple-500
    gradientStart: "rgba(168, 85, 247, 0.4)",
    gradientEnd: "rgba(168, 85, 247, 0.05)",
  },
  distance: {
    label: "Distance",
    unit: "km",
    color: "#10b981", // emerald-500
    gradientStart: "rgba(16, 185, 129, 0.4)",
    gradientEnd: "rgba(16, 185, 129, 0.05)",
  },
};

// Format date for X-axis based on time range
const formatXAxisLabel = (date: Date, timeRange: string): string => {
  switch (timeRange) {
    case "day":
      return format(date, "HH:mm");
    case "week":
      return format(date, "EEE");
    case "month":
      return format(date, "MMM d");
    case "year":
      return format(date, "MMM");
    default:
      return format(date, "MMM d");
  }
};

// Custom tooltip for time series
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; unit: string; color: string }>;
  label?: Date;
  unit: string;
}

const CustomTooltip = ({ active, payload, label, unit }: CustomTooltipProps) => {
  if (active && payload && payload.length && label) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/50 rounded-lg shadow-xl p-3 backdrop-blur-sm">
        <p className="text-sm font-medium text-slate-200 mb-2">{formatXAxisLabel(label, "day")}</p>
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-slate-400">{item.name}:</span>
            <span className="text-sm font-semibold text-white">
              {formatNumber(item.value)}
              <span className="text-slate-400 text-xs ml-1">{unit}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function TimeSeriesChart({
  data,
  metric,
  height = 250,
  showGrid = true,
  showTooltip = true,
  highlightToday: _highlightToday,
  className,
}: TimeSeriesChartProps) {
  const config = METRIC_CONFIG[metric];

  // Determine time range from data span
  const timeRange = useMemo(() => {
    if (data.length === 0) {
      return "day";
    }
    const times = data.map(d => d.timestamp.getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const diffDays = Math.floor((maxTime - minTime) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      return "day";
    }
    if (diffDays <= 7) {
      return "week";
    }
    if (diffDays <= 31) {
      return "month";
    }
    return "year";
  }, [data]);

  // Custom dot component
  interface CustomDotProps {
    cx?: number;
    cy?: number;
    fill?: string;
    payload?: { isCurrent?: boolean };
  }

  const CustomDot = (props: CustomDotProps) => {
    const { cx, cy, fill, payload } = props;
    if (payload?.isCurrent) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={fill}
          stroke="#fff"
          strokeWidth={2}
          className="animate-pulse"
        />
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              vertical={false}
              opacity={0.3}
            />
          )}
          <XAxis
            dataKey="timestamp"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={{ stroke: "#475569" }}
            axisLine={{ stroke: "#475569" }}
            tickFormatter={(value) => formatXAxisLabel(value, timeRange)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={{ stroke: "#475569" }}
            axisLine={{ stroke: "#475569" }}
            tickFormatter={(value) => formatNumber(value)}
            width={40}
          />
          {showTooltip && (
            <Tooltip
              content={<CustomTooltip unit={config.unit} />}
              cursor={{ stroke: "#475569", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
          )}
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={config.color}
            strokeWidth={2}
            fill={`url(#gradient-${metric})`}
            dot={<CustomDot />}
            activeDot={{
              r: 6,
              stroke: "#fff",
              strokeWidth: 2,
              fill: config.color,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TimeSeriesChart;
