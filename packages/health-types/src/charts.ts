/**
 * Chart Types
 * Shared chart contracts for health metrics visualization
 */

import { z } from 'zod';
import { HEALTH_METRICS, CHART_RANGES } from './index.js';

// =============================================================================
// Chart Types
// =============================================================================

/**
 * Single chart data point
 */
export interface ChartDataPoint {
  timestamp: string;
  value: number | null;
  target?: number;
  confidence?: number;
  label?: string;
}

/**
 * Chart summary statistics
 */
export interface ChartSummary {
  current: number | null;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  changePercent: number | null;
  completionPercent?: number | null;
  trend: 'improving' | 'stable' | 'declining' | null;
}

/**
 * Complete chart data response
 */
export interface ChartData {
  metric: string;
  range: string;
  unit: string;
  target?: number;
  points: ChartDataPoint[];
  summary: ChartSummary;
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  metric: string;
  label: string;
  unit: string;
  color: string;
  target?: number;
  minValue?: number;
  maxValue?: number;
  precision: number;
  chartType: 'line' | 'bar' | 'area' | 'donut';
  categories?: string[];
}

/**
 * Chart availability by platform
 */
export interface ChartAvailability {
  web: boolean;
  mobile: boolean;
  chartDetail?: 'full' | 'summary' | 'none';
}

/**
 * Chart definition with metadata
 */
export interface ChartDefinition {
  config: ChartConfig;
  availability: ChartAvailability;
  category: 'readiness' | 'nutrition' | 'fitness' | 'general' | 'sleep' | 'activity';
  priority: number;
  requiresData: string[];
  supportedRanges: string[];
}

/**
 * Chart request parameters
 */
export interface ChartRequest {
  metric: string;
  range: string;
  startDate?: string;
  endDate?: string;
  target?: number;
  aggregation?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Multiple charts response
 */
export interface ChartBundle {
  charts: ChartData[];
  requestedMetrics: string[];
  requestedRanges: string[];
  generatedAt: number;
}

// =============================================================================
// Chart Registry
// =============================================================================

/**
 * Readiness and Recovery charts
 */
export const READINESS_CHARTS: ChartDefinition[] = [
  {
    config: {
      metric: HEALTH_METRICS.READINESS,
      label: 'Readiness Score',
      unit: 'score',
      color: '#3B82F6',
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'readiness',
    priority: 1,
    requiresData: ['readiness'],
    supportedRanges: ['1d', '7d', '30d', '90d'],
  },
  {
    config: {
      metric: 'readiness_factors',
      label: 'Readiness Factors',
      unit: 'contribution',
      color: '#8B5CF6',
      precision: 1,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'summary' },
    category: 'readiness',
    priority: 2,
    requiresData: ['readiness_factors'],
    supportedRanges: ['7d', '30d'],
  },
  {
    config: {
      metric: 'recovery_trend',
      label: 'Recovery Trend',
      unit: 'score',
      color: '#10B981',
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: false, chartDetail: 'full' },
    category: 'readiness',
    priority: 3,
    requiresData: ['hrv', 'sleep'],
    supportedRanges: ['7d', '30d', '90d'],
  },
  {
    config: {
      metric: 'energy_stress',
      label: 'Energy & Stress',
      unit: 'level',
      color: '#F59E0B',
      precision: 0,
      chartType: 'area',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'readiness',
    priority: 4,
    requiresData: ['energy', 'stress'],
    supportedRanges: ['7d', '30d'],
  },
  {
    config: {
      metric: 'data_completeness',
      label: 'Data Completeness',
      unit: 'percent',
      color: '#6366F1',
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: false, chartDetail: 'summary' },
    category: 'readiness',
    priority: 5,
    requiresData: ['all'],
    supportedRanges: ['7d', '30d'],
  },
];

/**
 * Nutrition charts
 */
export const NUTRITION_CHARTS: ChartDefinition[] = [
  {
    config: {
      metric: HEALTH_METRICS.CALORIES,
      label: 'Calories',
      unit: 'kcal',
      color: '#3B82F6',
      target: 2000,
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'nutrition',
    priority: 1,
    requiresData: ['nutrition'],
    supportedRanges: ['1d', '7d', '30d', '90d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.PROTEIN,
      label: 'Protein',
      unit: 'g',
      color: '#10B981',
      target: 150,
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'nutrition',
    priority: 2,
    requiresData: ['nutrition'],
    supportedRanges: ['1d', '7d', '30d', '90d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.CARBS,
      label: 'Carbohydrates',
      unit: 'g',
      color: '#F59E0B',
      target: 250,
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'nutrition',
    priority: 3,
    requiresData: ['nutrition'],
    supportedRanges: ['1d', '7d', '30d', '90d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.FAT,
      label: 'Fat',
      unit: 'g',
      color: '#8B5CF6',
      target: 65,
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'nutrition',
    priority: 4,
    requiresData: ['nutrition'],
    supportedRanges: ['1d', '7d', '30d', '90d'],
  },
  {
    config: {
      metric: 'macro_distribution',
      label: 'Macro Distribution',
      unit: 'percent',
      color: '#EC4899',
      precision: 0,
      chartType: 'donut',
    },
    availability: { web: true, mobile: true, chartDetail: 'summary' },
    category: 'nutrition',
    priority: 5,
    requiresData: ['nutrition'],
    supportedRanges: ['1d', '7d'],
  },
  {
    config: {
      metric: 'nutrition_adherence',
      label: 'Nutrition Adherence',
      unit: 'percent',
      color: '#14B8A6',
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: false, chartDetail: 'full' },
    category: 'nutrition',
    priority: 6,
    requiresData: ['nutrition'],
    supportedRanges: ['7d', '30d', '90d'],
  },
  {
    config: {
      metric: 'meal_calories',
      label: 'Meal Calories',
      unit: 'kcal',
      color: '#F97316',
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'nutrition',
    priority: 7,
    requiresData: ['meals'],
    supportedRanges: ['1d', '7d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.HYDRATION,
      label: 'Hydration',
      unit: 'ml',
      color: '#06B6D4',
      target: 2000,
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'nutrition',
    priority: 8,
    requiresData: ['hydration'],
    supportedRanges: ['1d', '7d', '30d'],
  },
];

/**
 * Fitness charts
 */
export const FITNESS_CHARTS: ChartDefinition[] = [
  {
    config: {
      metric: HEALTH_METRICS.WORKOUT_COMPLETION,
      label: 'Workout Completion',
      unit: 'percent',
      color: '#3B82F6',
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'fitness',
    priority: 1,
    requiresData: ['workouts'],
    supportedRanges: ['7d', '30d', '90d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.TRAINING_LOAD,
      label: 'Training Load',
      unit: 'load',
      color: '#EF4444',
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: false, chartDetail: 'full' },
    category: 'fitness',
    priority: 2,
    requiresData: ['workouts'],
    supportedRanges: ['7d', '30d', '90d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.FORM_QUALITY,
      label: 'Form Quality',
      unit: 'score',
      color: '#10B981',
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: false, chartDetail: 'full' },
    category: 'fitness',
    priority: 3,
    requiresData: ['workouts'],
    supportedRanges: ['7d', '30d', '90d'],
  },
  {
    config: {
      metric: 'workout_duration',
      label: 'Workout Duration',
      unit: 'minutes',
      color: '#8B5CF6',
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'fitness',
    priority: 4,
    requiresData: ['workouts'],
    supportedRanges: ['7d', '30d'],
  },
  {
    config: {
      metric: 'muscle_groups',
      label: 'Muscle Group Distribution',
      unit: 'sets',
      color: '#F59E0B',
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: false, chartDetail: 'summary' },
    category: 'fitness',
    priority: 5,
    requiresData: ['workouts'],
    supportedRanges: ['7d', '30d'],
  },
  {
    config: {
      metric: 'exercise_progress',
      label: 'Exercise Progress',
      unit: 'reps',
      color: '#EC4899',
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: false, chartDetail: 'full' },
    category: 'fitness',
    priority: 6,
    requiresData: ['workouts'],
    supportedRanges: ['30d', '90d', '1y'],
  },
];

/**
 * General health charts
 */
export const GENERAL_HEALTH_CHARTS: ChartDefinition[] = [
  {
    config: {
      metric: HEALTH_METRICS.SLEEP_DURATION,
      label: 'Sleep Duration',
      unit: 'hours',
      color: '#6366F1',
      target: 8,
      precision: 1,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'sleep',
    priority: 1,
    requiresData: ['sleep'],
    supportedRanges: ['7d', '30d', '90d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.SLEEP_QUALITY,
      label: 'Sleep Quality',
      unit: 'score',
      color: '#8B5CF6',
      target: 85,
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'sleep',
    priority: 2,
    requiresData: ['sleep'],
    supportedRanges: ['7d', '30d', '90d'],
  },
  {
    config: {
      metric: 'sleep_stages',
      label: 'Sleep Stages',
      unit: 'minutes',
      color: '#3B82F6',
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: false, chartDetail: 'full' },
    category: 'sleep',
    priority: 3,
    requiresData: ['sleep'],
    supportedRanges: ['1d', '7d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.STEPS,
      label: 'Steps',
      unit: 'steps',
      color: '#10B981',
      target: 10000,
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'activity',
    priority: 1,
    requiresData: ['activity'],
    supportedRanges: ['1d', '7d', '30d', '90d'],
  },
  {
    config: {
      metric: 'active_minutes',
      label: 'Active Minutes',
      unit: 'minutes',
      color: '#F59E0B',
      target: 30,
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'activity',
    priority: 2,
    requiresData: ['activity'],
    supportedRanges: ['1d', '7d', '30d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.RESTING_HR,
      label: 'Resting Heart Rate',
      unit: 'bpm',
      color: '#EF4444',
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'general',
    priority: 1,
    requiresData: ['cardiovascular'],
    supportedRanges: ['7d', '30d', '90d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.HRV,
      label: 'Heart Rate Variability',
      unit: 'ms',
      color: '#8B5CF6',
      target: 50,
      precision: 0,
      chartType: 'line',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'general',
    priority: 2,
    requiresData: ['cardiovascular'],
    supportedRanges: ['7d', '30d', '90d'],
  },
  {
    config: {
      metric: HEALTH_METRICS.WEIGHT,
      label: 'Weight',
      unit: 'kg',
      color: '#6366F1',
      precision: 1,
      chartType: 'line',
    },
    availability: { web: true, mobile: true, chartDetail: 'full' },
    category: 'general',
    priority: 3,
    requiresData: ['body'],
    supportedRanges: ['30d', '90d', '1y'],
  },
  {
    config: {
      metric: HEALTH_METRICS.BODY_FAT,
      label: 'Body Fat',
      unit: 'percent',
      color: '#EC4899',
      precision: 1,
      chartType: 'line',
    },
    availability: { web: true, mobile: false, chartDetail: 'full' },
    category: 'general',
    priority: 4,
    requiresData: ['body'],
    supportedRanges: ['30d', '90d', '1y'],
  },
  {
    config: {
      metric: HEALTH_METRICS.HABITS,
      label: 'Habit Completion',
      unit: 'percent',
      color: '#14B8A6',
      precision: 0,
      chartType: 'bar',
    },
    availability: { web: true, mobile: true, chartDetail: 'summary' },
    category: 'general',
    priority: 5,
    requiresData: ['habits'],
    supportedRanges: ['7d', '30d'],
  },
  {
    config: {
      metric: 'weekly_overview',
      label: 'Weekly Health Overview',
      unit: 'score',
      color: '#3B82F6',
      precision: 0,
      chartType: 'radar',
    },
    availability: { web: true, mobile: false, chartDetail: 'summary' },
    category: 'general',
    priority: 6,
    requiresData: ['all'],
    supportedRanges: ['7d'],
  },
];

/**
 * All charts registry
 */
export const ALL_CHARTS = [
  ...READINESS_CHARTS,
  ...NUTRITION_CHARTS,
  ...FITNESS_CHARTS,
  ...GENERAL_HEALTH_CHARTS,
];

/**
 * Get chart definition by metric
 */
export function getChartDefinition(metric: string): ChartDefinition | undefined {
  return ALL_CHARTS.find(c => c.config.metric === metric);
}

/**
 * Get charts by category
 */
export function getChartsByCategory(category: string): ChartDefinition[] {
  return ALL_CHARTS.filter(c => c.category === category);
}

/**
 * Get charts by availability
 */
export function getChartsByPlatform(platform: 'web' | 'mobile'): ChartDefinition[] {
  return ALL_CHARTS.filter(c => c.availability[platform]);
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * ChartDataPoint schema
 */
export const ChartDataPointSchema = z.object({
  timestamp: z.string(),
  value: z.number().nullable(),
  target: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  label: z.string().optional(),
});

/**
 * ChartSummary schema
 */
export const ChartSummarySchema = z.object({
  current: z.number().nullable(),
  average: z.number().nullable(),
  minimum: z.number().nullable(),
  maximum: z.number().nullable(),
  changePercent: z.number().nullable(),
  completionPercent: z.number().min(0).max(100).nullable().optional(),
  trend: z.enum(['improving', 'stable', 'declining']).nullable().optional(),
});

/**
 * ChartData schema
 */
export const ChartDataSchema = z.object({
  metric: z.string(),
  range: z.string(),
  unit: z.string(),
  target: z.number().optional(),
  points: z.array(ChartDataPointSchema),
  summary: ChartSummarySchema,
});

/**
 * ChartRequest schema
 */
export const ChartRequestSchema = z.object({
  metric: z.string(),
  range: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  target: z.number().optional(),
  aggregation: z.enum(['hour', 'day', 'week', 'month']).optional(),
});

/**
 * ChartBundle schema
 */
export const ChartBundleSchema = z.object({
  charts: z.array(ChartDataSchema),
  requestedMetrics: z.array(z.string()),
  requestedRanges: z.array(z.string()),
  generatedAt: z.number(),
});

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate chart request
 */
export function validateChartRequest(request: unknown): {
  valid: boolean;
  errors: string[];
} {
  const result = ChartRequestSchema.safeParse(request);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Validate chart data response
 */
export function validateChartData(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const result = ChartDataSchema.safeParse(data);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Check if metric supports range
 */
export function isRangeSupported(metric: string, range: string): boolean {
  const definition = getChartDefinition(metric);
  if (!definition) return false;
  return definition.supportedRanges.includes(range);
}
