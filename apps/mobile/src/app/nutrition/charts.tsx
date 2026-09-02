/**
 * Charts Screen
 * Nutrition trends and analytics
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getNutritionClient, ChartData } from "@/lib/nutrition";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;

type ChartRange = "1d" | "7d" | "30d" | "90d";
type Metric = "calories" | "protein" | "carbs" | "fat";

const METRICS: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal", color: "#007AFF" },
  { key: "protein", label: "Protein", unit: "g", color: "#34C759" },
  { key: "carbs", label: "Carbs", unit: "g", color: "#FF9500" },
  { key: "fat", label: "Fat", unit: "g", color: "#AF52DE" },
];

export default function ChartsScreen() {
  const router = useRouter();

  const [selectedMetric, setSelectedMetric] = useState<Metric>("calories");
  const [selectedRange, setSelectedRange] = useState<ChartRange>("7d");
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const nutritionClient = getNutritionClient();

  /**
   * Fetch chart data
   */
  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const data = await nutritionClient.getChartData(
        selectedMetric,
        selectedRange,
      );
      setChartData(data);
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
    } finally {
      setLoading(false);
    }
  }, [nutritionClient, selectedMetric, selectedRange]);

  /**
   * Fetch data when metric or range changes
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Render simple bar chart
   */
  const renderChart = () => {
    if (!chartData || chartData.points.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No data available</Text>
        </View>
      );
    }

    const values = chartData.points.map((p) => p.value);
    const maxValue = Math.max(...values, 1);
    const chartHeight = 200;
    const barWidth = Math.max(10, (CHART_WIDTH - 20) / values.length - 4);

    return (
      <View style={styles.chartContainer}>
        {/* Target line */}
        {chartData.target && (
          <View
            style={[
              styles.targetLine,
              { bottom: (chartData.target / maxValue) * chartHeight },
            ]}
          >
            <Text style={styles.targetLabel}>
              Target: {chartData.target}
              {chartData.unit}
            </Text>
          </View>
        )}

        {/* Bars */}
        <View style={styles.barsContainer}>
          {chartData.points.map((point, index) => {
            const height = Math.max(4, (point.value / maxValue) * chartHeight);
            const isToday = index === chartData.points.length - 1;

            return (
              <View
                key={index}
                style={[
                  styles.bar,
                  {
                    width: barWidth,
                    height,
                    backgroundColor: isToday
                      ? METRICS.find((m) => m.key === selectedMetric)?.color
                      : "#C7C7CC",
                  },
                ]}
              />
            );
          })}
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxis}>
          {chartData.points.length <= 7 ? (
            chartData.points.map((point, index) => (
              <Text key={index} style={styles.xAxisLabel}>
                {new Date(point.timestamp).toLocaleDateString("en", {
                  weekday: "short",
                })}
              </Text>
            ))
          ) : (
            <>
              <Text style={styles.xAxisLabel}>
                {new Date(chartData.points[0].timestamp).toLocaleDateString(
                  "en",
                  { month: "short", day: "numeric" },
                )}
              </Text>
              <Text style={styles.xAxisLabel}>
                {new Date(
                  chartData.points[chartData.points.length - 1].timestamp,
                ).toLocaleDateString("en", { month: "short", day: "numeric" })}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  /**
   * Render summary stats
   */
  const renderSummary = () => {
    if (!chartData) return null;

    const { summary } = chartData;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.average}</Text>
          <Text style={styles.summaryLabel}>Average</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.minimum}</Text>
          <Text style={styles.summaryLabel}>Min</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.maximum}</Text>
          <Text style={styles.summaryLabel}>Max</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text
            style={[
              styles.summaryValue,
              {
                color: (summary.changePercent || 0) > 0 ? "#34C759" : "#FF3B30",
              },
            ]}
          >
            {summary.changePercent !== null
              ? `${summary.changePercent > 0 ? "+" : ""}${summary.changePercent}%`
              : "-"}
          </Text>
          <Text style={styles.summaryLabel}>Change</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Nutrition Trends</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Metric Selector */}
      <View style={styles.metricSelector}>
        {METRICS.map((metric) => (
          <TouchableOpacity
            key={metric.key}
            style={[
              styles.metricButton,
              selectedMetric === metric.key && styles.metricButtonActive,
              selectedMetric === metric.key && {
                backgroundColor: metric.color,
              },
            ]}
            onPress={() => setSelectedMetric(metric.key)}
          >
            <Text
              style={[
                styles.metricButtonText,
                selectedMetric === metric.key && styles.metricButtonTextActive,
              ]}
            >
              {metric.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Range Selector */}
      <View style={styles.rangeSelector}>
        {(["1d", "7d", "30d", "90d"] as ChartRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.rangeButton,
              selectedRange === range && styles.rangeButtonActive,
            ]}
            onPress={() => setSelectedRange(range)}
          >
            <Text
              style={[
                styles.rangeButtonText,
                selectedRange === range && styles.rangeButtonTextActive,
              ]}
            >
              {range === "1d"
                ? "Today"
                : range === "7d"
                  ? "Week"
                  : range === "30d"
                    ? "Month"
                    : "3 Months"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>
                {METRICS.find((m) => m.key === selectedMetric)?.label}
              </Text>
              <Text style={styles.chartUnit}>
                {METRICS.find((m) => m.key === selectedMetric)?.unit}
              </Text>
            </View>

            {renderChart()}
            {renderSummary()}
          </>
        )}
      </View>

      {/* Comparison Cards */}
      <View style={styles.comparisonSection}>
        <Text style={styles.sectionTitle}>All Metrics</Text>

        {METRICS.map((metric) => (
          <TouchableOpacity
            key={metric.key}
            style={styles.comparisonCard}
            onPress={() => setSelectedMetric(metric.key)}
          >
            <View
              style={[
                styles.comparisonColor,
                { backgroundColor: metric.color },
              ]}
            />
            <View style={styles.comparisonContent}>
              <Text style={styles.comparisonLabel}>{metric.label}</Text>
              {chartData && (
                <Text style={styles.comparisonValue}>
                  {chartData.points.length > 0
                    ? Math.round(
                        chartData.points.reduce((sum, p) => sum + p.value, 0) /
                          chartData.points.length,
                      )
                    : 0}
                  {metric.unit}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
        <Text style={styles.disclaimerText}>
          Nutrition values are estimates based on AI analysis and may not be
          100% accurate. Please verify critical nutrition data independently.
        </Text>
      </View>

      {/* Bottom padding */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  metricSelector: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  metricButtonActive: {
    backgroundColor: "#007AFF",
  },
  metricButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
  },
  metricButtonTextActive: {
    color: "#FFFFFF",
  },
  rangeSelector: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  rangeButtonActive: {
    backgroundColor: "#007AFF",
  },
  rangeButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333333",
  },
  rangeButtonTextActive: {
    color: "#FFFFFF",
  },
  chartCard: {
    margin: 16,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  loadingContainer: {
    height: 280,
    justifyContent: "center",
    alignItems: "center",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  chartUnit: {
    fontSize: 14,
    color: "#8E8E93",
  },
  chartContainer: {
    height: 260,
    position: "relative",
  },
  emptyChart: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyChartText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  targetLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#34C759",
    borderStyle: "dashed",
  },
  targetLabel: {
    position: "absolute",
    right: 0,
    top: -16,
    fontSize: 10,
    color: "#34C759",
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 200,
    paddingBottom: 24,
  },
  bar: {
    borderRadius: 4,
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    color: "#8E8E93",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
  },
  comparisonSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  comparisonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  comparisonColor: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  comparisonContent: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 14,
    color: "#333333",
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginTop: 2,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    margin: 16,
    padding: 12,
    backgroundColor: "#FFF9E6",
    borderRadius: 8,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: "#856404",
    lineHeight: 18,
  },
});
