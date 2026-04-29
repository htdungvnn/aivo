import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";

// Inline color definitions to avoid import scope issues
const COLORS = {
  success: "#22c55e",
  warning: "#FF9500",
  error: "#EF4444",
  brand: {
    primary: "#007AFF",
  },
  background: {
    tertiary: "#1f2937",
  },
  border: {
    primary: "#374151",
  },
  text: {
    primary: "#ffffff",
    secondary: "#9ca3af",
    tertiary: "#6b7280",
  },
  transparent: "transparent",
};

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

const CHART_COLORS = {
  background: "rgba(15, 23, 42, 0.5)",
  border: COLORS.border.primary,
  textSecondary: COLORS.text.secondary,
};

interface BodyMetricChartDataPoint {
  value: number;
  date: string;
}

interface BodyMetricChartProps {
  data: BodyMetricChartDataPoint[];
  metric: keyof typeof METRIC_COLORS;
  height?: number;
  color?: string;
}

export function BodyMetricChart({ data, metric, height = 200, color }: BodyMetricChartProps) {

  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]} testID="body-metric-chart">
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const values = data.map((d: BodyMetricChartDataPoint) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Determine chart color and unit based on metric type
  const chartColor = color || METRIC_COLORS[metric];
  const unit = METRIC_UNITS[metric];

  return (
    <View style={[styles.container, { height }]} testID="body-metric-chart">
      <View style={styles.chartRow} testID="chart-row">
        {data.slice(-7).map((point: BodyMetricChartDataPoint, idx: number) => {
          const barHeight = ((point.value - min) / range) * 100;
          return (
            <View key={idx} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(barHeight, 4),
                    backgroundColor: chartColor,
                  },
                ]}
                testID="bar"
              />
              <Text style={styles.barLabel} numberOfLines={1} testID="bar-label">
                {point.date.split(" ")[0]}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.rangeRow}>
        <Text style={styles.rangeLabel} testID="range-min">
          {min.toFixed(1)}{unit}
        </Text>
        <Text style={styles.rangeLabel} testID="range-max">
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
      <View style={[styles.container, { height }]} testID="muscle-balance-chart">
        <Text style={styles.noDataText}>No muscle data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]} testID="muscle-balance-chart">
      <View style={styles.muscleList}>
        {data.map((item, idx) => (
          <View key={idx} style={styles.muscleRow}>
            <Text style={styles.muscleName}>{item.muscle}</Text>
            <View style={styles.muscleBarContainer}>
              <View
                style={[styles.muscleBar, { width: `${item.current}%`, backgroundColor: COLORS.success }]}
                testID="muscle-bar"
              />
            </View>
            <Text style={styles.muscleValue}>{item.current}%</Text>
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
        return COLORS.success;
      case "good":
        return COLORS.brand.primary;
      case "fair":
        return COLORS.warning;
      case "poor":
        return COLORS.error;
      default:
        return COLORS.text.tertiary;
    }
  })();

  const strokeWidth = 12;
  const borderWidth = strokeWidth / 2;

  return (
    <View style={styles.gaugeContainer} testID="health-score-gauge">
      <View style={styles.gaugeSvgContainer}>
        {/* Background circle */}
        <View style={[styles.gaugeCircle, { borderColor: CHART_COLORS.border, borderWidth }]} />
        {/* Score arc */}
        <View
          style={[
            styles.gaugeCircleBase,
            {
              borderWidth,
              borderColor: categoryColor,
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
    backgroundColor: CHART_COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  noDataText: {
    color: CHART_COLORS.textSecondary,
    textAlign: "center",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 128,
    gap: 4,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  bar: {
    width: "100%",
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 8,
    color: COLORS.text.tertiary,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rangeLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  muscleList: {
    gap: 8,
  },
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  muscleName: {
    fontSize: 12,
    color: COLORS.text.secondary,
    width: 64,
    textTransform: "capitalize",
  },
  muscleBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 6,
    overflow: "hidden",
  },
  muscleBar: {
    height: "100%",
    borderRadius: 6,
  },
  muscleValue: {
    fontSize: 12,
    color: COLORS.text.primary,
    width: 32,
    textAlign: "right",
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
    borderColor: CHART_COLORS.border,
    borderTopColor: COLORS.transparent,
    borderRightColor: COLORS.transparent,
    transform: [{ rotate: "-45deg" }],
  },
  gaugeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  gaugeCircleBase: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderTopColor: COLORS.transparent,
    borderRightColor: COLORS.transparent,
    transform: [{ rotate: "-45deg" }],
  },
  gaugeCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeScore: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text.primary,
  },
  gaugeCategory: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});

// Memoize components to prevent unnecessary re-renders
export const MemoizedBodyMetricChart = memo(BodyMetricChart);
export const MemoizedMuscleBalanceChart = memo(MuscleBalanceChart);
export const MemoizedHealthScoreGauge = memo(HealthScoreGauge);

export default BodyMetricChart;
