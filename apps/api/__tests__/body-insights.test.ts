/**
 * Unit Tests - Body Metrics Service
 *
 * Tests data transformation and validation logic that won't change
 * regardless of routing structure.
 */

import {
  calculateHealthScore,
  validateBodyMetrics,
  formatBodyMetricResponse,
} from "../src/services/body-insights";
import { z } from "zod";

describe("Body Metrics Service", () => {
  describe("validateBodyMetrics", () => {
    it("should accept valid metrics with all fields", () => {
      const result = validateBodyMetrics({
        weight: 70,
        bodyFatPercentage: 0.15,
        muscleMass: 25,
        height: 175,
        age: 25,
        gender: "male" as const,
        fitnessLevel: "intermediate",
      });

      expect(result.valid).toBe(true);
    });

    it("should reject negative weight", () => {
      const result = validateBodyMetrics({
        weight: -70,
        bodyFatPercentage: 0.15,
        muscleMass: 25,
        height: 175,
        age: 25,
        gender: "male",
        fitnessLevel: "intermediate",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: "weight" })
      );
    });

    it("should reject body fat > 1 (100%)", () => {
      const result = validateBodyMetrics({
        weight: 70,
        bodyFatPercentage: 1.5,
        muscleMass: 25,
        height: 175,
        age: 25,
        gender: "male",
        fitnessLevel: "intermediate",
      });

      expect(result.valid).toBe(false);
    });

    it("should accept partial metrics (only weight)", () => {
      const result = validateBodyMetrics({
        weight: 70,
        height: 175,
        age: 25,
        gender: "male",
        fitnessLevel: "intermediate",
      });

      expect(result.valid).toBe(true);
    });

    it("should reject if required fields missing", () => {
      const result = validateBodyMetrics({
        bodyFatPercentage: 0.15,
        muscleMass: 25,
        height: 175,
        age: 25,
        gender: "male",
        fitnessLevel: "intermediate",
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("formatBodyMetricResponse", () => {
    it("should format metric with all fields", () => {
      const dbRecord = {
        id: "metric-123",
        user_id: "user-456",
        timestamp: 1700000000000,
        weight: 70.5,
        body_fat_percentage: 0.15,
        muscle_mass: 25.0,
        bmi: 22.9,
        notes: "Test note",
        source: "manual",
      };

      const result = formatBodyMetricResponse(dbRecord);

      expect(result).toEqual({
        id: "metric-123",
        userId: "user-456",
        timestamp: 1700000000000,
        weight: 70.5,
        bodyFatPercentage: 0.15,
        muscleMass: 25.0,
        bmi: 22.9,
        notes: "Test note",
        source: "manual",
      });
    });

    it("should handle null optional fields", () => {
      const dbRecord = {
        id: "metric-123",
        user_id: "user-456",
        timestamp: 1700000000000,
        weight: null,
        body_fat_percentage: null,
        muscle_mass: null,
        bmi: null,
        notes: null,
        source: "manual",
      };

      const result = formatBodyMetricResponse(dbRecord);

      expect(result.weight).toBeNull();
      expect(result.bodyFatPercentage).toBeNull();
    });
  });

  describe("calculateHealthScore", () => {
    it("should calculate excellent score for optimal metrics", () => {
      const user = {
        weight: 70,
        height: 175,
        age: 25,
        gender: "male" as const,
        fitnessLevel: "advanced",
      };

      const latestMetric = {
        bmi: 22.9,
        bodyFatPercentage: 0.12,
        muscleMass: 28,
      };

      // Mock the calculation (actual logic is in service)
      const score = calculateHealthScore(user, latestMetric);

      expect(score.score).toBeGreaterThanOrEqual(80);
      expect(score.category).toBe("excellent");
    });

    it("should return poor score for suboptimal metrics", () => {
      const user = {
        weight: 100,
        height: 175,
        age: 45,
        gender: "male",
        fitnessLevel: "beginner",
      };

      const latestMetric = {
        bmi: 32.6,
        bodyFatPercentage: 0.35,
        muscleMass: 20,
      };

      const score = calculateHealthScore(user, latestMetric);

      expect(score.score).toBeLessThan(50);
      expect(score.category).toBe("poor");
    });

    it("should include recommendations", () => {
      const user = {
        weight: 100,
        height: 175,
        age: 45,
        gender: "male",
        fitnessLevel: "beginner",
      };

      const latestMetric = {
        bmi: 32.6,
        bodyFatPercentage: 0.35,
        muscleMass: 20,
      };

      const score = calculateHealthScore(user, latestMetric);

      expect(score.recommendations).toBeInstanceOf(Array);
      expect(score.recommendations.length).toBeGreaterThan(0);
    });
  });
});
