import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "@/theme/colors";

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

const CHART_COLORS = {
  background: "rgba(15, 23, 42, 0.5)",
  border: colors.border.primary,
  textSecondary: colors.text.secondary,
};

export function BodyMetricChart({ data, metric, height = 200, color }: BodyMetricChartProps) {
  const chartColor = color || METRIC_COLORS[metric];
  const unit = METRIC_UNITS[metric];

  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.chartRow}>
        {data.slice(-7).map((point, idx) => {
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
              />
              <Text style={styles.barLabel} numberOfLines={1}>
                {point.date.split(" ")[0]}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.rangeRow}>
        <Text style={styles.rangeLabel}>
          {min.toFixed(1)}{unit}
        </Text>
        <Text style={styles.rangeLabel}>
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
        <Text style={styles.noDataText}>No muscle data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.muscleList}>
        {data.map((item, idx) => (
          <View key={idx} style={styles.muscleRow}>
            <Text style={styles.muscleName}>{item.muscle}</Text>
            <View style={styles.muscleBarContainer}>
              <View
                style={[styles.muscleBar, { width: `${item.current}%`, backgroundColor: colors.success }]}
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
        return colors.success;
      case "good":
        return colors.brand.primary;
      case "fair":
        return colors.warning;
      case "poor":
        return colors.error;
      default:
        return colors.text.tertiary;
    }
  })();

  const strokeWidth = 12;
  const borderWidth = strokeWidth / 2;

  return (
    <View style={styles.gaugeContainer}>
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
    color: colors.text.tertiary,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rangeLabel: {
    fontSize: 12,
    color: colors.text.secondary,
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
    color: colors.text.secondary,
    width: 64,
    textTransform: "capitalize",
  },
  muscleBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: colors.background.tertiary,
    borderRadius: 6,
    overflow: "hidden",
  },
  muscleBar: {
    height: "100%",
    borderRadius: 6,
  },
  muscleValue: {
    fontSize: 12,
    color: colors.text.primary,
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
    borderTopColor: colors.transparent,
    borderRightColor: colors.transparent,
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
    borderTopColor: colors.transparent,
    borderRightColor: colors.transparent,
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
    color: colors.text.primary,
  },
  gaugeCategory: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});

export default BodyMetricChart;
