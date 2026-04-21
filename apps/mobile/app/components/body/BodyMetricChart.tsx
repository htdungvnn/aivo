import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme, VictoryBar, VictoryArea, VictoryTooltip } from "victory-native";

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

  // Sort by date (assuming MM/dd format, but could be any format)
  const sortedData = [...data].sort((a, b) => {
    // Simple sort - in production, parse dates properly
    return 0;
  });

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;
  const padding = range * 0.1;

  return (
    <View style={[styles.container, { height }]}>
      <VictoryChart
        theme={VictoryTheme.material}
        domain={{ y: [Math.max(0, minValue - padding), maxValue + padding] }}
        padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
        style={{
          parent: { backgroundColor: "transparent" },
        }}
      >
        <VictoryAxis
          dependentAxis
          style={{
            tickLabels: { fill: "#94a3b8", fontSize: 10, fontFamily: "System" },
            axis: { stroke: "#334155" },
            tickLines: { stroke: "#334155" },
            grid: { stroke: "#1e293b", strokeDasharray: "3,3" },
          }}
          tickFormat={(t) => `${t.toFixed(1)}${unit}`}
        />
        <VictoryAxis
          style={{
            tickLabels: { fill: "#94a3b8", fontSize: 10, fontFamily: "System" },
            axis: { stroke: "#334155" },
            tickLines: { stroke: "#334155" },
          }}
          tickValues={data.map((_, i) => i)}
          tickFormat={(_, i) => data[i]?.date || ""}
        />
        <VictoryArea
          data={sortedData}
          style={{
            data: { fill: chartColor, fillOpacity: 0.3 },
            parent: { border: "none" },
          }}
          interpolation="monotoneX"
        />
        <VictoryLine
          data={sortedData}
          style={{
            data: { stroke: chartColor, strokeWidth: 2 },
          }}
          interpolation="monotoneX"
        />
      </VictoryChart>
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
      <VictoryChart
        theme={VictoryTheme.material}
        domain={{ x: [0, 100] }}
        padding={{ top: 20, bottom: 50, left: 60, right: 20 }}
        style={{ parent: { backgroundColor: "transparent" } }}
      >
        <VictoryAxis
          dependentAxis
          style={{
            tickLabels: { fill: "#94a3b8", fontSize: 10 },
            axis: { stroke: "#334155" },
            tickLines: { stroke: "#334155" },
            grid: { stroke: "#1e293b", strokeDasharray: "3,3" },
          }}
          tickFormat={(t) => `${t}%`}
        />
        <VictoryAxis
          style={{
            tickLabels: { fill: "#94a3b8", fontSize: 9 },
            axis: { stroke: "#334155" },
            tickLines: { stroke: "#334155" },
          }}
          tickValues={data.map((_, i) => i)}
          tickFormat={(_, i) => data[i]?.muscle.toUpperCase().slice(0, 6) || ""}
        />
        <VictoryBar
          data={data.map((d, i) => ({ x: i, y: d.current }))}
          style={{
            data: { fill: "#22c55e" },
          }}
          cornerRadius={{ top: 4 }}
        />
      </VictoryChart>
    </View>
  );
}

// Health Score Gauge
interface HealthScoreGaugeProps {
  score: number;
  category: "poor" | "fair" | "good" | "excellent";
}

export function HealthScoreGauge({ score, category }: HealthScoreGaugeProps) {
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
      default:
        return "#64748b";
    }
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 12;
  const normalizedScore = score / 100;
  const strokeDashoffset = circumference * (1 - normalizedScore);

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeSvgContainer}>
        {/* Background circle */}
        <View style={[styles.gaugeCircle, { borderWidth: strokeWidth / 2, borderColor: "#334155" }]} />
        {/* Score arc */}
        <View
          style={[
            styles.gaugeCircle,
            {
              borderWidth: strokeWidth / 2,
              borderColor: getCategoryColor(),
              borderTopColor: "transparent",
              borderRightColor: "transparent",
              transform: [{ rotate: "-45deg" }],
            },
          ]}
        />
      </View>
      <View style={styles.gaugeCenter}>
        <Text style={styles.gaugeScore}>{Math.round(score)}</Text>
        <Text style={[styles.gaugeCategory, { color: getCategoryColor() }]}>
          {category.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
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
    borderColor: "#334155",
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
