/**
 * Chart data routes
 */

import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth } from "../middleware/auth";
import { NutritionError } from "../middleware";
import {
  getChartData,
  getUserNutritionTargets,
  getDailySummary,
} from "../db/queries";
import type {
  ChartMetric,
  ChartRange,
  ChartData,
  ChartDataPoint,
  ChartDataSummary,
} from "@repo/nutrition-types";

const charts = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// Use auth middleware
charts.use("*", requireAuth());

/**
 * Get chart data for a metric
 */
charts.get("/:metric", async (c) => {
  const userId = c.get("userId");
  const requestId = c.get("requestId");
  const metric = c.req.param("metric") as ChartMetric;
  const range = (c.req.query("range") || "7d") as ChartRange;

  // Validate metric
  const validMetrics = [
    "calories",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "sugar",
    "sodium",
  ];
  if (!validMetrics.includes(metric)) {
    throw NutritionError.badRequest(
      `Invalid metric. Valid: ${validMetrics.join(", ")}`,
    );
  }

  // Validate range
  const validRanges = ["1d", "7d", "30d", "90d"];
  if (!validRanges.includes(range)) {
    throw NutritionError.badRequest(
      `Invalid range. Valid: ${validRanges.join(", ")}`,
    );
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case "1d":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // Get chart data points
  const dataPoints = await getChartData(
    c.env.DB,
    userId,
    metric,
    startDateStr,
    endDateStr,
  );

  // Get target if specified
  const targetParam = c.req.query("target");
  let target = targetParam ? parseFloat(targetParam) : null;

  // If no target param, get from user targets
  if (!target) {
    const userTargets = await getUserNutritionTargets(c.env.DB, userId);
    if (userTargets) {
      switch (metric) {
        case "calories":
          target = userTargets.targets.caloriesKcal;
          break;
        case "protein":
          target = userTargets.targets.proteinG;
          break;
        case "carbs":
          target = userTargets.targets.carbsG;
          break;
        case "fat":
          target = userTargets.targets.fatG;
          break;
        case "fiber":
          target = userTargets.targets.fiberG;
          break;
        case "sugar":
          target = userTargets.targets.sugarG;
          break;
        case "sodium":
          target = userTargets.targets.sodiumMg;
          break;
      }
    }
  }

  // Calculate summary statistics
  const values = dataPoints.map((p) => p.value);
  const summary = calculateSummary(values, range);

  // Get unit for metric
  const units: Record<string, string> = {
    calories: "kcal",
    protein: "g",
    carbs: "g",
    fat: "g",
    fiber: "g",
    sugar: "g",
    sodium: "mg",
  };

  const chartData: ChartData = {
    metric,
    range,
    unit: units[metric] || "",
    target,
    points: dataPoints.map((p) => ({
      timestamp: `${p.date}T00:00:00Z`,
      value: p.value,
    })),
    summary,
  };

  return c.json({
    data: chartData,
    requestId,
  });
});

/**
 * Get multiple metrics at once
 */
charts.get("/", async (c) => {
  const userId = c.get("userId");
  const requestId = c.get("requestId");
  const metricsParam = c.req.query("metrics");
  const range = (c.req.query("range") || "7d") as ChartRange;

  const metrics = metricsParam
    ? (metricsParam.split(",") as ChartMetric[])
    : ["calories"];
  const validMetrics = [
    "calories",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "sugar",
    "sodium",
  ];

  for (const m of metrics) {
    if (!validMetrics.includes(m)) {
      throw NutritionError.badRequest(`Invalid metric: ${m}`);
    }
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case "1d":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // Get data for each metric
  const results: Record<string, ChartData> = {};

  for (const metric of metrics) {
    const dataPoints = await getChartData(
      c.env.DB,
      userId,
      metric,
      startDateStr,
      endDateStr,
    );

    const values = dataPoints.map((p) => p.value);
    const summary = calculateSummary(values, range);

    const units: Record<string, string> = {
      calories: "kcal",
      protein: "g",
      carbs: "g",
      fat: "g",
      fiber: "g",
      sugar: "g",
      sodium: "mg",
    };

    results[metric] = {
      metric,
      range,
      unit: units[metric] || "",
      target: null,
      points: dataPoints.map((p) => ({
        timestamp: `${p.date}T00:00:00Z`,
        value: p.value,
      })),
      summary,
    };
  }

  return c.json({
    data: results,
    requestId,
  });
});

/**
 * Calculate summary statistics
 */
function calculateSummary(
  values: number[],
  range: ChartRange,
): ChartDataSummary {
  if (values.length === 0) {
    return {
      average: 0,
      minimum: 0,
      maximum: 0,
      changePercent: null,
    };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const average = Math.round(sum / values.length);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);

  // Calculate change percentage (first half vs second half)
  let changePercent: number | null = null;

  if (values.length >= 2) {
    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (firstAvg > 0) {
      changePercent = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
    }
  }

  return {
    average,
    minimum,
    maximum,
    changePercent,
  };
}

export default charts;
