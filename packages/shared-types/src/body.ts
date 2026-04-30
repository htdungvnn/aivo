// ============================================
// BODY METRICS & INSIGHTS
// Includes body metrics, vision analysis, and heatmap utilities
// ============================================

// Re-export API contract types that are also used in body metrics context
// These are defined in api-contracts.ts to avoid duplication
export type { SleepLog, SleepLogCreate, SensorDataSnapshot, BiometricReading } from "./api-contracts";

export interface BodyMetric {
  id: string;
  userId: string;
  timestamp: number; // Unix timestamp in milliseconds
  weight?: number | null; // kg, nullable in DB
  bodyFatPercentage?: number | null; // 0-100, nullable in DB
  muscleMass?: number | null; // kg, nullable in DB
  boneMass?: number | null; // kg, nullable in DB
  waterPercentage?: number | null; // 0-100, nullable in DB
  bmi?: number | null; // nullable in DB
  waistCircumference?: number | null; // cm, nullable in DB
  chestCircumference?: number | null; // cm, nullable in DB
  hipCircumference?: number | null; // cm, nullable in DB
  source?: "manual" | "ai" | "device";
  notes?: string | null; // nullable in DB
}


// Sensor data upload request
export interface SensorDataUpload {
  timestamp: number;
  period: "hourly" | "daily" | "weekly";
  steps?: number;
  activeMinutes?: number;
  avgHeartRate?: number;
  restingHeartRate?: number;
  hrvMs?: number;
  hrvRmssd?: number;
  stressScore?: number;
  source: "apple_health" | "google_fit";
}

// 2D Vector Heatmap data structure
export interface BodyHeatmapData {
  id: string;
  userId: string;
  timestamp: number; // Unix timestamp in milliseconds
  imageUrl?: string; // R2 stored SVG/PNG
  vectorData: HeatmapVectorPoint[];
  metadata?: {
    analysisSource?: "ai_vision" | "manual_input" | "device_sync";
    confidence?: number; // 0-1
    zones?: MuscleZone[];
    analysisId?: string;
    generatedAt?: string;
    pointCount?: number;
  };
}

export interface HeatmapVectorPoint {
  x: number; // 0-100 normalized coordinates
  y: number;
  intensity: number; // 0-1
  muscle: MuscleGroup;
}

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "forearms"
  | "neck";

export interface MuscleZone {
  group: MuscleGroup;
  development: "underdeveloped" | "normal" | "overdeveloped";
  imbalanceScore: number; // -100 to 100, negative = weak side
  recommendation?: string;
}

// Body composition estimates from AI vision analysis
export interface BodyCompositionEstimate {
  bodyFatEstimate: number; // 0-1 (percentage)
  muscleMassEstimate: number; // 0-1 (percentage)
  confidence: number; // 0-1 confidence score
}

// AI Vision analysis result
export interface VisionAnalysis {
  id: string;
  userId: string;
  imageUrl: string; // Original image in R2
  processedUrl?: string; // Heatmap overlay in R2
  analysis: {
    posture?: PostureAssessment;
    symmetry?: SymmetryAssessment;
    muscleDevelopment: MuscleDevelopment[];
    riskFactors: RiskFactor[];
    bodyComposition?: BodyCompositionEstimate;
  };
  confidence: number;
  createdAt: number; // Unix timestamp in milliseconds
}

export interface PostureAssessment {
  score: number; // 0-100
  issues: PostureIssue[];
  recommendations: string[];
}

export interface PostureIssue {
  type: "forward_head" | "rounded_shoulders" | "hyperlordosis" | "kyphosis" | "pelvic_tilt";
  severity: "mild" | "moderate" | "severe";
}

export interface SymmetryAssessment {
  overallScore: number;
  imbalances: ImbalanceDetail[];
}

export interface ImbalanceDetail {
  muscleGroup: MuscleGroup;
  percentageDiff: number; // Left vs right difference
  side: "left" | "right";
}

export interface MuscleDevelopment {
  group: MuscleGroup;
  score: number; // 0-100
  percentile: number; // Compared to population
}

export interface RiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  description: string;
}

// ============================================
// BODY HEATMAP - SHARED CONSTANTS & UTILITIES
// ============================================

/**
 * Normalized muscle positions (0-100 coordinate system)
 * These positions map to the body outline SVG
 */
export const MUSCLE_POSITIONS: Record<string, { x: number; y: number; zone: string }> = {
  chest: { x: 50, y: 42, zone: "front_torso" },
  chest_upper: { x: 50, y: 35, zone: "front_torso" },
  chest_lower: { x: 50, y: 50, zone: "front_torso" },
  back: { x: 50, y: 55, zone: "back_torso" },
  back_upper: { x: 50, y: 48, zone: "back_torso" },
  back_lower: { x: 50, y: 65, zone: "back_torso" },
  shoulders: { x: 24, y: 38, zone: "front_torso" },
  shoulders_rear: { x: 76, y: 38, zone: "back_torso" },
  biceps: { x: 18, y: 45, zone: "front_arm" },
  triceps: { x: 22, y: 50, zone: "back_arm" },
  forearms: { x: 12, y: 55, zone: "front_arm" },
  abs: { x: 50, y: 62, zone: "front_torso" },
  core: { x: 50, y: 68, zone: "front_torso" },
  obliques: { x: 30, y: 58, zone: "front_torso" },
  quadriceps: { x: 30, y: 82, zone: "front_leg" },
  hamstrings: { x: 30, y: 92, zone: "back_leg" },
  glutes: { x: 38, y: 82, zone: "back_torso" },
  calves: { x: 30, y: 100, zone: "front_leg" },
  neck: { x: 50, y: 15, zone: "front_torso" },
};

/**
 * SVG path data for body outline (front view)
 * Coordinates in 200x400 viewBox
 */
export const BODY_OUTLINE_FRONT = `
M 50 15
C 42 15, 35 18, 32 22
C 29 26, 28 30, 28 35
C 28 38, 27 40, 25 42
C 23 44, 20 46, 15 48
C 10 50, 7 52, 5 56
C 3 60, 3 65, 4 70
C 5 75, 6 80, 7 90
C 8 100, 10 110, 12 120
M 12 120 C 15 118, 20 115, 25 112
M 50 15
C 58 15, 65 18, 68 22
C 71 26, 72 30, 72 35
C 72 38, 73 40, 75 42
C 77 44, 80 46, 85 48
C 90 50, 93 52, 95 56
C 97 60, 97 65, 96 70
C 95 75, 94 80, 93 90
C 92 100, 90 110, 88 120
M 88 120 C 85 118, 80 115, 75 112
M 30 28 C 30 40, 32 55, 32 70
C 32 85, 30 100, 28 115
M 70 28 C 70 40, 68 55, 68 70
C 68 85, 70 100, 72 115
M 32 115 C 28 118, 20 120, 15 122
M 68 115 C 72 118, 80 120, 85 122
M 45 100 C 40 100, 35 105, 32 115
M 55 100 C 60 100, 65 105, 68 115
`.trim();

/**
 * SVG path data for body outline (back view)
 */
export const BODY_OUTLINE_BACK = `
M 50 15
C 42 15, 35 18, 32 22
C 29 26, 28 30, 28 35
C 28 38, 27 40, 25 42
C 23 44, 20 46, 15 48
C 10 50, 7 52, 5 56
C 3 60, 3 65, 4 70
C 5 75, 6 80, 7 90
C 8 100, 10 110, 12 120
M 12 120 C 15 118, 20 115, 25 112
M 50 15
C 58 15, 65 18, 68 22
C 71 26, 72 30, 72 35
C 72 38, 73 40, 75 42
C 77 44, 80 46, 85 48
C 90 50, 93 52, 95 56
C 97 60, 97 65, 96 70
C 95 75, 94 80, 93 90
C 92 100, 90 110, 88 120
M 88 120 C 85 118, 80 115, 75 112
M 30 32 C 30 45, 32 60, 32 75
C 32 90, 30 105, 28 120
M 70 32 C 70 45, 68 60, 68 75
C 68 90, 70 105, 72 120
M 32 120 C 28 123, 20 125, 15 127
M 68 120 C 72 123, 80 125, 85 127
`.trim();

/**
 * Color scale types for heatmap visualization
 */
export type HeatmapColorScale = "heat" | "cool" | "monochrome";

/**
 * Get color for intensity value based on scale
 * @param intensity - Value between 0 and 1
 * @param scale - Color scale to use
 * @returns Object with baseColor and opacity
 */
export function getHeatmapColor(intensity: number, scale: HeatmapColorScale = "heat"): { baseColor: string; opacity: number } {
  const i = Math.max(0, Math.min(1, intensity));
  const opacity = 0.4 + i * 0.5;

  switch (scale) {
    case "cool":
      return { baseColor: "rgba(6, 182, 212, ", opacity };
    case "monochrome":
      return { baseColor: "rgba(255, 255, 255, ", opacity };
    case "heat":
    default:
      if (i < 0.2) { return { baseColor: "rgba(59, 130, 246, ", opacity }; } // blue
      if (i < 0.4) { return { baseColor: "rgba(6, 182, 212, ", opacity }; } // cyan
      if (i < 0.6) { return { baseColor: "rgba(34, 197, 94, ", opacity }; } // green
      if (i < 0.8) { return { baseColor: "rgba(234, 179, 8, ", opacity }; } // yellow
      return { baseColor: "rgba(249, 115, 22, ", opacity }; // orange
  }
}

/**
 * Calculate radius for heatmap point based on intensity
 */
export function getHeatmapRadius(intensity: number, baseRadius: number = 8): number {
  return baseRadius + intensity * 6;
}

/**
 * Aggregate heatmap points by muscle location
 * Groups nearby points and averages their intensities
 */
export function aggregateHeatmapPoints(
  vectorData: Array<{ x: number; y: number; intensity: number; muscle: MuscleGroup }>
): Array<{ x: number; y: number; intensity: number; muscle: MuscleGroup }> {
  const groups: Record<string, { x: number; y: number; count: number; totalIntensity: number }> = {};

  vectorData.forEach((point) => {
    const key = `${point.muscle}_${Math.round(point.x)}_${Math.round(point.y)}`;
    if (!groups[key]) {
      groups[key] = { x: point.x, y: point.y, count: 0, totalIntensity: 0 };
    }
    groups[key].count++;
    groups[key].totalIntensity += point.intensity;
  });

  return Object.values(groups).map((g) => ({
    x: g.x,
    y: g.y,
    intensity: g.totalIntensity / g.count,
    muscle: vectorData.find(
      (p) => Math.abs(p.x - g.x) < 2 && Math.abs(p.y - g.y) < 2
    )?.muscle || ("chest" as MuscleGroup),
  }));
}

// ============================================
// VISION-TO-SVG HEATMAP ENGINE TYPES
// ============================================

/**
 * Pre-defined body zones for SVG heatmap rendering
 * Coordinates are normalized (0-1) relative to SVG viewport
 */
export interface BodyZone {
  id: string;
  name: string;
  bounds: {
    x: number; // 0-1 left offset
    y: number; // 0-1 top offset
    width: number; // 0-1 width
    height: number; // 0-1 height
  };
  muscles: string[]; // Primary muscle groups in this zone
}

export const BODY_ZONES: BodyZone[] = [
  // Upper Body
  {
    id: "chest",
    name: "Chest",
    bounds: { x: 0.35, y: 0.18, width: 0.30, height: 0.15 },
    muscles: ["pectorals", "deltoids_front"],
  },
  {
    id: "back_upper",
    name: "Upper Back",
    bounds: { x: 0.35, y: 0.12, width: 0.30, height: 0.15 },
    muscles: ["trapezius", "deltoids_rear", "lats"],
  },
  {
    id: "shoulders",
    name: "Shoulders",
    bounds: { x: 0.25, y: 0.18, width: 0.50, height: 0.08 },
    muscles: ["deltoids"],
  },
  {
    id: "arms",
    name: "Arms",
    bounds: { x: 0.15, y: 0.20, width: 0.10, height: 0.30 },
    muscles: ["biceps", "triceps", "forearms"],
  },

  // Core
  {
    id: "abs_upper",
    name: "Upper Abs",
    bounds: { x: 0.35, y: 0.32, width: 0.30, height: 0.08 },
    muscles: ["rectus_abdominis"],
  },
  {
    id: "abs_lower",
    name: "Lower Abs",
    bounds: { x: 0.35, y: 0.40, width: 0.30, height: 0.10 },
    muscles: ["rectus_abdominis", "hip_flexors"],
  },
  {
    id: "obliques",
    name: "Obliques",
    bounds: { x: 0.25, y: 0.35, width: 0.50, height: 0.12 },
    muscles: ["obliques", "serratus_anterior"],
  },
  {
    id: "lower_back",
    name: "Lower Back",
    bounds: { x: 0.35, y: 0.28, width: 0.30, height: 0.08 },
    muscles: ["erector_spinae"],
  },

  // Lower Body
  {
    id: "glutes",
    name: "Glutes",
    bounds: { x: 0.35, y: 0.50, width: 0.30, height: 0.12 },
    muscles: ["gluteus_maximus"],
  },
  {
    id: "quads",
    name: "Quadriceps",
    bounds: { x: 0.30, y: 0.62, width: 0.40, height: 0.20 },
    muscles: ["quadriceps"],
  },
  {
    id: "hamstrings",
    name: "Hamstrings",
    bounds: { x: 0.30, y: 0.82, width: 0.40, height: 0.15 },
    muscles: ["hamstrings"],
  },
  {
    id: "calves",
    name: "Calves",
    bounds: { x: 0.35, y: 0.97, width: 0.30, height: 0.10 },
    muscles: ["gastrocnemius", "soleus"],
  },
];

/**
 * Heatmap region data for a specific body zone
 */
export interface HeatmapRegion {
  zoneId: string;
  intensity: number; // 0-100 (fat percentage or lean score, lower is better)
  color: string; // Calculated from intensity
  confidence: number; // 0-1 from vision analysis
}

// ============================================
// HEATMAP RENDERING - Platform-agnostic helpers
// ============================================

/**
 * Platform-agnostic heatmap renderer for body visualization
 * Provides color and geometry calculations for heatmap points
 */
export class HeatmapRenderer {
  /**
   * Generate color string for a heatmap point based on intensity
   * @param intensity - Value between 0 and 1
   * @param scale - Color scale (heat, cool, monochrome)
   * @returns rgba color string with opacity
   */
  static color(intensity: number, scale?: string): string {
    const { baseColor, opacity } = getHeatmapColor(intensity, scale as HeatmapColorScale);
    return `${baseColor}${opacity})`;
  }

  /**
   * Prepare all heatmap data for rendering in one call
   * Transforms raw vector data into positioned, colored points
   * @param vectorData - Raw heatmap vector points from AI analysis
   * @param options - Rendering dimensions and color scale
   * @returns Prepared points with coordinates, radius, color, and SVG viewBox
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

    // Aggregate and scale points
    const aggregated = aggregateHeatmapPoints(vectorData);
    const points = aggregated.map((point) => ({
      ...point,
      cx: point.x * scaleFactor.x,
      cy: point.y * scaleFactor.y,
      radius: getHeatmapRadius(point.intensity),
      color: this.color(point.intensity, options.colorScale),
    }));

    return {
      points,
      viewBox: `0 0 ${options.width} ${options.height}`,
    };
  }
}

/**
 * Complete vision analysis result from Claude
 */
export interface VisionAnalysisResult {
  photoId: string;
  pose: "front" | "back" | "side" | "unknown";
  regions: HeatmapRegion[];
  metrics: {
    upperBodyScore: number; // 0-100, lower is better
    coreScore: number;
    lowerBodyScore: number;
    overallScore: number;
  };
  processedAt: string;
}

/**
 * Stored heatmap record (from database)
 */
export interface StoredHeatmap {
  id: string;
  userId: string;
  photoId: string;
  regions: HeatmapRegion[];
  metrics: {
    upperBodyScore: number;
    coreScore: number;
    lowerBodyScore: number;
    overallScore: number;
  };
  createdAt: number;
}

/**
 * Body photo upload record
 */
export interface BodyPhotoRecord {
  id: string;
  userId: string;
  r2Url: string;
  thumbnailUrl?: string;
  uploadDate: number;
  analysisStatus: "pending" | "processing" | "completed" | "failed";
  poseDetected?: boolean;
}

/**
 * Heatmap comparison data showing progress between two measurements
 */
export interface HeatmapComparison {
  current: StoredHeatmap;
  previous?: StoredHeatmap;
  differences: Record<
    string,
    { current: number; previous: number; change: number; trend: "improved" | "regressed" | "stable" }
  >;
}
