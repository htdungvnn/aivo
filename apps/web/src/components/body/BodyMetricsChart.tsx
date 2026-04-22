"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

export interface MetricDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface BodyMetricChartProps {
  data: MetricDataPoint[];
  metric: "weight" | "bodyFat" | "muscleMass" | "bmi";
  height?: number;
  showArea?: boolean;
  showGoalLine?: number;
  goalLabel?: string;
  unit?: string;
}

const METRIC_CONFIG: Record<
  string,
  {
    color: string;
    areaColor: string;
    unit: string;
    label: string;
  }
> = {
  weight: {
    color: "#22c55e",
    areaColor: "rgba(34, 197, 94, 0.2)",
    unit: "kg",
    label: "Weight",
  },
  bodyFat: {
    color: "#f97316",
    areaColor: "rgba(249, 115, 22, 0.2)",
    unit: "%",
    label: "Body Fat %",
  },
  muscleMass: {
    color: "#3b82f6",
    areaColor: "rgba(59, 130, 246, 0.2)",
    unit: "kg",
    label: "Muscle Mass",
  },
  bmi: {
    color: "#a855f7",
    areaColor: "rgba(168, 85, 247, 0.2)",
    unit: "",
    label: "BMI",
  },
};

export function BodyMetricChart({
  data,
  metric,
  height = 250,
  showArea = true,
  showGoalLine,
  goalLabel = "Goal",
  unit: overrideUnit,
}: BodyMetricChartProps) {
  const config = METRIC_CONFIG[metric];
  const unit = overrideUnit || config.unit;

  // Transform data for recharts
  const chartData = data.map((point) => ({
    ...point,
    displayValue: point.value.toFixed(1),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm font-medium">{label}</p>
          <p className="text-emerald-400 font-semibold">
            {payload[0].value.toFixed(1)} {unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        {showArea ? (
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.areaColor} stopOpacity={0.8} />
                <stop offset="95%" stopColor={config.areaColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#gradient-${metric})`}
              activeDot={{ r: 6, stroke: config.color, strokeWidth: 2, fill: "#0f172a" }}
            />
            {showGoalLine && (
              <Line
                type="monotone"
                dataKey={() => showGoalLine}
                stroke="#fbbf24"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                name={goalLabel}
              />
            )}
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              dot={{ r: 4, fill: config.color, strokeWidth: 2, stroke: "#0f172a" }}
              activeDot={{ r: 6 }}
            />
            {showGoalLine && (
              <Line
                type="monotone"
                dataKey={() => showGoalLine}
                stroke="#fbbf24"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                name={goalLabel}
              />
            )}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Muscle Balance Bar Chart
export interface MuscleBalanceData {
  muscle: string;
  current: number;
  target?: number;
  imbalance?: number;
}

export function MuscleBalanceChart({
  data,
  height = 300,
}: {
  data: MuscleBalanceData[];
  height?: number;
}) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm font-medium capitalize">{label}</p>
          <p className="text-emerald-400">
            Current: {payload[0]?.value?.toFixed(0) || 0}%
          </p>
          {payload[1] && (
            <p className="text-amber-400">
              Target: {payload[1].value?.toFixed(0) || 0}%
            </p>
          )}
          {payload[2] && (
            <p className={`font-semibold ${payload[2].value >= 0 ? "text-red-400" : "text-blue-400"}`}>
              Imbalance: {payload[2].value?.toFixed(0)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis
            type="number"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="muscle"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="current"
            name="Current"
            fill="#22c55e"
            radius={[0, 4, 4, 0]}
            barSize={16}
          />
          {data[0]?.target !== undefined && (
            <Bar
              dataKey="target"
              name="Target"
              fill="#fbbf24"
              radius={[0, 4, 4, 0]}
              barSize={8}
            />
          )}
          {data[0]?.imbalance !== undefined && (
            <Bar
              dataKey="imbalance"
              name="Imbalance"
              fill="#ef4444"
              radius={[0, 4, 4, 0]}
              barSize={4}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Health Score Gauge Chart
export function HealthScoreGauge({
  score,
  category,
}: {
  score: number;
  category: "poor" | "fair" | "good" | "excellent";
}) {
  const getCategoryColor = () => {
    switch (category) {
      case "excellent":
        return "#22c55e";
      case "good":
        return "#3b82f6";
      case "fair":
        return "#f97316";
      case "poor":
        return "#ef4444";
    }
  };

  // Calculate the arc angles
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 12;
  const normalizedScore = score / 100;
  const strokeDashoffset = circumference * (1 - normalizedScore);

  // Background arc
  const bgArc = (
    <circle
      cx="50"
      cy="50"
      r={radius}
      fill="none"
      stroke="#334155"
      strokeWidth={strokeWidth}
      strokeDasharray={`${circumference} ${circumference}`}
      strokeLinecap="round"
      transform="rotate(-90 50 50)"
    />
  );

  // Score arc
  const scoreArc = (
    <circle
      cx="50"
      cy="50"
      r={radius}
      fill="none"
      stroke={getCategoryColor()}
      strokeWidth={strokeWidth}
      strokeDasharray={`${circumference} ${circumference}`}
      strokeDashoffset={strokeDashoffset}
      strokeLinecap="round"
      transform="rotate(-90 50 50)"
      style={{ transition: "stroke-dashoffset 1s ease-out" }}
    />
  );

  return (
    <div className="flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90">
        {bgArc}
        {scoreArc}
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{Math.round(score)}</span>
        <span className="text-xs text-slate-400 uppercase tracking-wider">{category}</span>
      </div>
    </div>
  );
}

// Composite Chart for multiple metrics
export function CompositeBodyChart({
  weightData,
  bodyFatData,
  muscleMassData,
  height = 300,
}: {
  weightData?: MetricDataPoint[];
  bodyFatData?: MetricDataPoint[];
  muscleMassData?: MetricDataPoint[];
  height?: number;
}) {
  // Merge data by date
  const mergedData = useMemo(() => {
    const allDates = new Set<string>();
    [weightData, bodyFatData, muscleMassData].forEach((data) => {
      data?.forEach((point) => allDates.add(point.date));
    });

    return Array.from(allDates)
      .sort()
      .map((date) => ({
        date,
        weight: weightData?.find((d) => d.date === date)?.value,
        bodyFat: bodyFatData?.find((d) => d.date === date)?.value,
        muscleMass: muscleMassData?.find((d) => d.date === date)?.value,
      }));
  }, [weightData, bodyFatData, muscleMassData]);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={mergedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="weight"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}kg`}
          />
          <YAxis
            yAxisId="bodyFat"
            orientation="right"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Legend />
          <Area
            yAxisId="weight"
            type="monotone"
            dataKey="weight"
            stroke="#22c55e"
            fill="rgba(34, 197, 94, 0.2)"
            name="Weight"
          />
          <Line
            yAxisId="bodyFat"
            type="monotone"
            dataKey="bodyFat"
            stroke="#f97316"
            name="Body Fat %"
            dot={{ r: 3 }}
          />
          <Bar
            yAxisId="muscleMass"
            dataKey="muscleMass"
            fill="#3b82f6"
            name="Muscle Mass"
            radius={[4, 4, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BodyMetricChart;
