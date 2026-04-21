import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CartesianChart, Line, Bar, Area, CartesianAxis, type CartesianChartRenderArg } from "victory-native";

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

  const sortedData = [...data].map((d, i) => ({ x: i, y: d.value, date: d.date }));
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;
  const padding = range * 0.1;

  return (
    <View style={[styles.container, { height }]}>
      <CartesianChart
        domain={{ y: [Math.max(0, minValue - padding), maxValue + padding] }}
        padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
        style={{
          parent: { backgroundColor: "transparent" },
        }}
        data={sortedData}
        xKey="x"
        yKey="y"
      >
        {(chartProps: CartesianChartRenderArg<{ x: number; y: number }>) => {
          const { xScale, yScale } = chartProps;
          const xTickValues = data.map((_, i) => i);

          return (
            <>
              <CartesianAxis
                xScale={xScale}
                yScale={yScale}
                tickCount={{ x: data.length, y: 5 }}
                tickValues={{ x: xTickValues, y: undefined }}
                formatXLabel={(_: any, i: number) => data[i]?.date || ""}
                formatYLabel={(t: number) => `${t.toFixed(1)}${unit}`}
                axisSide={{ x: "bottom", y: "left" }}
                style={{
                  axis: { stroke: "#334155" },
                  tickLabels: { fill: "#94a3b8", fontSize: 10, fontFamily: "System" },
                  ticks: { stroke: "#334155" },
                  grid: { stroke: "#1e293b", strokeDasharray: "3,3" },
                }}
                lineColor={{ grid: "#1e293b", frame: "#334155" }}
                lineWidth={{ grid: 1, frame: 1 }}
                labelColor="#94a3b8"
              />
              <Area
                points={[{ x: "x", y: "y" }]}
                style={{ fill: chartColor, fillOpacity: 0.3 }}
                interpolation="monotoneX"
              />
              <Line
                points={[{ x: "x", y: "y" }]}
                style={{ stroke: chartColor, strokeWidth: 2 }}
                interpolation="monotoneX"
              />
            </>
          );
        }}
      </CartesianChart>
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

  const barData = data.map((d, i) => ({ x: i, y: d.current, muscle: d.muscle }));
  const xTickValues = data.map((_, i) => i);

  return (
    <View style={[styles.container, { height }]}>
      <CartesianChart
        domain={{ x: [0, 100], y: [0, 100] }}
        padding={{ top: 20, bottom: 50, left: 60, right: 20 }}
        style={{ parent: { backgroundColor: "transparent" } }}
        data={barData}
        xKey="x"
        yKey="y"
      >
        {(chartProps: CartesianChartRenderArg<{ x: number; y: number }>) => {
          const { xScale, yScale } = chartProps;

          return (
            <>
              <CartesianAxis
                xScale={xScale}
                yScale={yScale}
                tickCount={{ x: xTickValues.length, y: 5 }}
                tickValues={{ x: xTickValues, y: undefined }}
                formatXLabel={(_: any, i: number) => data[i]?.muscle.toUpperCase().slice(0, 6) || ""}
                formatYLabel={(t: number) => `${t}%`}
                axisSide={{ x: "bottom", y: "left" }}
                style={{
                  tickLabels: { fill: "#94a3b8", fontSize: 9 },
                }}
                lineColor={{ grid: "#1e293b", frame: "#334155" }}
                lineWidth={1}
                labelColor="#94a3b8"
              />
              <Bar
                points={[{ x: "x", y: "y" }]}
                style={{ fill: "#22c55e" }}
                cornerRadius={{ top: 4 }}
              />
            </>
          );
        }}
      </CartesianChart>
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
