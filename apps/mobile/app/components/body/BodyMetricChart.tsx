import React from "react";
import { View, Text, StyleSheet } from "react-native";

export interface MetricDataPoint {
  date: string;
  value: number;
}

interface BodyMetricChartProps {
  data: MetricDataPoint[];
  metric: "weight" | "bodyFat" | "muscleMass" | "bmi";
  height?: number;
  color?: string;
}

const METRIC_COLORS = {
  weight: "#22c55e",
  bodyFat: "#f97316",
  muscleMass: "#3b82f6",
  bmi: "#a855f7",
};

const METRIC_UNITS: Record<string, string> = {
  weight: "kg",
  bodyFat: "%",
  muscleMass: "kg",
  bmi: "",
};

const COLORS = {
  background: "rgba(15, 23, 42, 0.5)",
  border: "#334155",
  textSecondary: "#94a3b8",
};

export function BodyMetricChart({ data, metric, height = 200, color }: BodyMetricChartProps) {
  const chartColor = color || METRIC_COLORS[metric];
  const unit = METRIC_UNITS[metric];

  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text className="text-slate-400 text-center">No data available</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View style={[styles.container, { height }]}>
      <View className="flex-row items-end justify-between h-32 gap-1">
        {data.slice(-7).map((point, idx) => {
          const barHeight = ((point.value - min) / range) * 100;
          return (
            <View key={idx} className="flex-1 items-center gap-1">
              <View
                className="w-full rounded-t-sm"
                style={{
                  height: Math.max(barHeight, 4),
                  backgroundColor: chartColor,
                  minHeight: 4,
                }}
              />
              <Text className="text-[8px] text-slate-500" numberOfLines={1}>
                {point.date.split(" ")[0]}
              </Text>
            </View>
          );
        })}
      </View>
      <View className="flex-row justify-between mt-2">
        <Text className="text-xs text-slate-400">
          {min.toFixed(1)}{unit}
        </Text>
        <Text className="text-xs text-slate-400">
          {max.toFixed(1)}{unit}
        </Text>
      </View>
    </View>
  );
}

// Muscle Balance Bar Chart
export interface MuscleBalanceData {
  muscle: string;
  current: number;
  target?: number;
}

interface MuscleBalanceChartProps {
  data: MuscleBalanceData[];
  height?: number;
}

export function MuscleBalanceChart({ data, height = 250 }: MuscleBalanceChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text className="text-slate-400 text-center">No muscle data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <View className="gap-2">
        {data.map((item, idx) => (
          <View key={idx} className="flex-row items-center gap-2">
            <Text className="text-xs text-slate-400 w-16 capitalize">{item.muscle}</Text>
            <View className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${item.current}%`,
                  backgroundColor: "#22c55e",
                }}
              />
            </View>
            <Text className="text-xs text-slate-300 w-8 text-right">{item.current}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Health Score Gauge
interface HealthScoreGaugeProps {
  score: number;
  category: "poor" | "fair" | "good" | "excellent";
}

export function HealthScoreGauge({ score, category }: HealthScoreGaugeProps) {
  const categoryColor = (() => {
    switch (category) {
      case "excellent":
        return "#22c55e";
      case "good":
        return "#3b82f6";
      case "fair":
        return "#f97316";
      case "poor":
        return "#ef4444";
      default:
        return "#64748b";
    }
  })();

  const strokeWidth = 12;

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeSvgContainer}>
        {/* Background circle */}
        <View style={[styles.gaugeCircle, { borderWidth: strokeWidth / 2, borderColor: COLORS.border }]} />
        {/* Score arc */}
        <View
          style={[
            styles.gaugeCircle,
            {
              borderWidth: strokeWidth / 2,
              borderColor: categoryColor,
              borderTopColor: "transparent",
              borderRightColor: "transparent",
              transform: [{ rotate: "-45deg" }],
            },
          ]}
        />
      </View>
      <View style={styles.gaugeCenter}>
        <Text style={styles.gaugeScore}>{Math.round(score)}</Text>
        <Text style={[styles.gaugeCategory, { color: categoryColor }]}>
          {category.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  gaugeContainer: {
    width: 120,
    height: 120,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeSvgContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: COLORS.border,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    transform: [{ rotate: "-45deg" }],
  },
  gaugeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  gaugeCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeScore: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  gaugeCategory: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});

export default BodyMetricChart;
