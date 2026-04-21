import type {
  BodyMetric,
  HealthScoreResult,
  HeatmapVectorPoint,
  BodyHeatmapData,
} from "@aivo/shared-types";
import {
  aggregateHeatmapPoints,
  getHeatmapColor,
  getHeatmapRadius,
  calculateHealthScore,
  getScoreColor,
  getScoreLabel,
  getScoreGradient,
} from "@aivo/shared-types";

/**
 * Body metrics calculations and transformations
 * Pure functions - no side effects
 */
export class BodyCompute {
  /**
   * Calculate BMI from weight and height
   */
  static calculateBMI(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  /**
   * Get BMI category based on BMI value
   */
  static getBMICategory(bmi: number): "underweight" | "normal" | "overweight" | "obese" {
    if (bmi < 18.5) return "underweight";
    if (bmi < 25) return "normal";
    if (bmi < 30) return "overweight";
    return "obese";
  }

  /**
   * Calculate body fat category based on percentage and gender
   */
  static getBodyFatCategory(
    bodyFat: number,
    gender: "male" | "female"
  ): "essential" | "athletic" | "fitness" | "average" | "obese" {
    if (gender === "male") {
      if (bodyFat < 6) return "essential";
      if (bodyFat < 14) return "athletic";
      if (bodyFat < 18) return "fitness";
      if (bodyFat < 25) return "average";
      return "obese";
    } else {
      if (bodyFat < 14) return "essential";
      if (bodyFat < 21) return "athletic";
      if (bodyFat < 25) return "fitness";
      if (bodyFat < 32) return "average";
      return "obese";
    }
  }

  /**
   * Transform metrics array for chart consumption
   * Returns array of { date, value } sorted chronologically
   */
  static transformMetricData(
    metrics: BodyMetric[],
    metricKey: keyof Pick<BodyMetric, "weight" | "bodyFatPercentage" | "muscleMass" | "bmi">
  ): Array<{ date: string; value: number }> {
    return metrics
      .filter((m) => m[metricKey] !== undefined && m[metricKey] !== null)
      .map((m) => ({
        date: new Date(m.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: m[metricKey] as number,
      }))
      .reverse();
  }

  /**
   * Calculate health score from metrics
   * Delegates to shared-types calculation
   */
  static calculateHealthScore(params: {
    bmi?: number;
    bodyFatPercentage?: number;
    muscleMass?: number;
    weight?: number;
    fitnessLevel?: string;
  }): HealthScoreResult {
    return calculateHealthScore(params);
  }

  /**
   * Aggregate heatmap points for rendering
   * Delegates to shared-types calculation
   */
  static aggregateHeatmapPoints(
    vectorData: HeatmapVectorPoint[]
  ): HeatmapVectorPoint[] {
    return aggregateHeatmapPoints(vectorData);
  }

  /**
   * Get color for heatmap point
   */
  static getHeatmapColor(
    intensity: number,
    scale?: "heat" | "cool" | "monochrome"
  ): { baseColor: string; opacity: number } {
    return getHeatmapColor(intensity, scale);
  }

  /**
   * Get radius for heatmap point
   */
  static getHeatmapRadius(intensity: number, baseRadius?: number): number {
    return getHeatmapRadius(intensity, baseRadius);
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Get posture score color indicator
   */
  static getPostureScoreColor(score: number): "excellent" | "good" | "fair" | "poor" {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "fair";
    return "poor";
  }

  /**
   * Get posture score label
   */
  static getPostureScoreLabel(score: number): string {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  }

  /**
   * Prepare heatmap data for rendering
   * Transforms raw vector data into aggregated points ready for visualization
   */
  static prepareHeatmapForRender(
    vectorData: HeatmapVectorPoint[],
    scaleFactor: { x: number; y: number } = { x: 2, y: 4 }
  ): Array<HeatmapVectorPoint & { cx: number; cy: number; radius: number }> {
    const aggregated = this.aggregateHeatmapPoints(vectorData);

    return aggregated.map((point) => ({
      ...point,
      cx: point.x * scaleFactor.x,
      cy: point.y * scaleFactor.y,
      radius: this.getHeatmapRadius(point.intensity),
    }));
  }

  /**
   * Convert BodyHeatmapData to renderable vector points
   */
  static parseHeatmapData(heatmapData: BodyHeatmapData): HeatmapVectorPoint[] {
    if (Array.isArray(heatmapData.vectorData)) {
      return heatmapData.vectorData;
    }
    // Handle legacy JSON string format
    if (typeof heatmapData.vectorData === "string") {
      try {
        return JSON.parse(heatmapData.vectorData);
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * Health score calculation service
 */
export class HealthScoreService {
  static calculate(params: {
    bmi?: number;
    bodyFatPercentage?: number;
    muscleMass?: number;
    weight?: number;
    fitnessLevel?: string;
  }): HealthScoreResult {
    return BodyCompute.calculateHealthScore(params);
  }

  static getBMICategory(bmi: number): "underweight" | "normal" | "overweight" | "obese" {
    return BodyCompute.getBMICategory(bmi);
  }
}

/**
 * Heatmap rendering helpers (platform-agnostic)
 */
export class HeatmapRenderer {
  /**
   * Generate color for a point (returns rgba string)
   */
  static color(intensity: number, scale?: string): string {
    const { baseColor, opacity } = getHeatmapColor(intensity, scale as any);
    return `${baseColor}${opacity})`;
  }

  /**
   * Generate all rendering data in one call
   */
  static prepare(
    vectorData: HeatmapVectorPoint[],
    options: { width: number; height: number; colorScale?: string } = { width: 200, height: 400 }
  ): {
    points: Array<HeatmapVectorPoint & { cx: number; cy: number; radius: number; color: string }>;
    viewBox: string;
  } {
    const scaleFactor = {
      x: options.width / 100,
      y: options.height / 100,
    };

    const points = BodyCompute.prepareHeatmapForRender(vectorData, scaleFactor).map((point) => ({
      ...point,
      color: this.color(point.intensity, options.colorScale),
    }));

    return {
      points,
      viewBox: `0 0 ${options.width} ${options.height}`,
    };
  }
}

/**
 * Posture analysis helpers
 */
export class PostureAnalyzer {
  static getScoreColor(score: number): string {
    return getScoreColor(score);
  }

  static getScoreLabel(score: number): string {
    return getScoreLabel(score);
  }

  static getScoreGradient(score: number): string {
    return getScoreGradient(score);
  }
}

// Re-export types from shared-types for convenient consumption
export type { BodyMetric, HealthScoreResult, HeatmapVectorPoint, BodyHeatmapData };
