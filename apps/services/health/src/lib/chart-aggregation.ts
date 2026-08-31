/**
 * Chart Aggregation Library
 * Functions to aggregate and format health data for charts
 * 
 * Handles:
 * - Data point generation
 * - Summary statistics
 * - Range-based aggregation
 * - Downsampling for large ranges
 */

import {
  ChartData,
  ChartDataPoint,
  ChartSummary,
  ChartRange,
  HEALTH_METRICS,
  CHART_RANGES,
  isFiniteNumber,
  roundTo,
  formatDate,
} from '@repo/health-types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum points per chart before downsampling
 */
const MAX_POINTS_BEFORE_DOWNSAMPLE = 90;

/**
 * Downsampling thresholds by range
 */
const DOWNSAMPLE_THRESHOLDS: Record<string, number> = {
  [CHART_RANGES.DAY]: 24, // Hourly
  [CHART_RANGES.WEEK]: 7, // Daily
  [CHART_RANGES.MONTH]: 30, // Daily
  [CHART_RANGES.THREE_MONTHS]: 12, // Weekly
  [CHART_RANGES.YEAR]: 52, // Weekly
};

/**
 * Aggregation interval by range
 */
const AGGREGATION_INTERVAL: Record<string, 'hour' | 'day' | 'week'> = {
  [CHART_RANGES.DAY]: 'hour',
  [CHART_RANGES.WEEK]: 'day',
  [CHART_RANGES.MONTH]: 'day',
  [CHART_RANGES.THREE_MONTHS]: 'week',
  [CHART_RANGES.YEAR]: 'week',
};

// =============================================================================
// Data Types
// =============================================================================

/**
 * Raw metric data point with all details
 */
export interface RawMetricPoint {
  timestamp: number;
  value: number | null;
  target?: number;
  confidence?: number;
  source?: string;
}

/**
 * Metric data for a user over a period
 */
export interface MetricTimeSeries {
  metric: string;
  unit: string;
  target?: number;
  points: RawMetricPoint[];
}

/**
 * Chart generation options
 */
export interface ChartOptions {
  target?: number;
  aggregation?: 'hour' | 'day' | 'week' | 'month';
  fillGaps?: boolean;
  interpolation?: 'linear' | 'previous' | 'none';
}

// =============================================================================
// Chart Generation
// =============================================================================

/**
 * Generate chart data from time series
 */
export function generateChartData(
  timeSeries: MetricTimeSeries,
  range: ChartRange,
  options: ChartOptions = {}
): ChartData {
  const { target, fillGaps = true, interpolation = 'linear' } = options;
  
  // Sort points by timestamp
  const sortedPoints = [...timeSeries.points].sort(
    (a, b) => a.timestamp - b.timestamp
  );
  
  // Filter to requested range
  const filteredPoints = filterByRange(sortedPoints, range);
  
  // Downsample if necessary
  const aggregatedPoints = downsampleIfNeeded(filteredPoints, range);
  
  // Fill gaps if requested
  const filledPoints = fillGaps
    ? fillDataGaps(aggregatedPoints, range, interpolation)
    : aggregatedPoints;
  
  // Convert to chart data points
  const chartPoints: ChartDataPoint[] = filledPoints.map(p => ({
    timestamp: new Date(p.timestamp).toISOString(),
    value: p.value,
    target: p.target ?? target,
    confidence: p.confidence,
  }));
  
  // Calculate summary
  const summary = calculateSummary(filledPoints, target);
  
  return {
    metric: timeSeries.metric,
    range,
    unit: timeSeries.unit,
    target: target ?? timeSeries.target,
    points: chartPoints,
    summary,
  };
}

/**
 * Filter points to a specific range
 */
function filterByRange(
  points: RawMetricPoint[],
  range: ChartRange
): RawMetricPoint[] {
  const now = Date.now();
  const rangeMs = getRangeDurationMs(range);
  const startTime = now - rangeMs;
  
  return points.filter(p => p.timestamp >= startTime);
}

/**
 * Downsample points if too many
 */
function downsampleIfNeeded(
  points: RawMetricPoint[],
  range: ChartRange
): RawMetricPoint[] {
  const threshold = DOWNSAMPLE_THRESHOLDS[range] ?? 30;
  
  if (points.length <= threshold) {
    return points;
  }
  
  // Use largest-triangle-three-buckets algorithm
  return largestTriangleThreeBuckets(points, threshold);
}

/**
 * Largest Triangle Three Buckets downsampling
 * Preserves visual shape while reducing points
 */
function largestTriangleThreeBuckets(
  points: RawMetricPoint[],
  targetPoints: number
): RawMetricPoint[] {
  if (points.length <= targetPoints) return points;
  
  const result: RawMetricPoint[] = [];
  const bucketSize = (points.length - 2) / (targetPoints - 2);
  
  // Always add first point
  result.push(points[0]);
  
  let prevSelectedIndex = 0;
  
  for (let i = 1; i < targetPoints - 1; i++) {
    // Calculate bucket range
    const bucketStart = Math.floor((i - 1) * bucketSize) + 1;
    const bucketEnd = Math.floor(i * bucketSize) + 1;
    
    // Calculate next bucket average (for triangle)
    const nextBucketStart = bucketEnd;
    const nextBucketEnd = Math.min(
      Math.floor((i + 1) * bucketSize) + 1,
      points.length
    );
    
    let nextAvgX = 0;
    let nextAvgY = 0;
    let nextCount = 0;
    
    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      if (points[j].value !== null) {
        nextAvgX += points[j].timestamp;
        nextAvgY += points[j].value;
        nextCount++;
      }
    }
    
    if (nextCount > 0) {
      nextAvgX /= nextCount;
      nextAvgY /= nextCount;
    }
    
    // Find point in current bucket with largest triangle area
    let maxArea = -1;
    let maxAreaIndex = bucketStart;
    
    const prevPoint = points[prevSelectedIndex];
    
    for (let j = bucketStart; j < bucketEnd && j < points.length; j++) {
      if (points[j].value === null) continue;
      
      // Calculate triangle area using cross product
      const area = Math.abs(
        (prevPoint.timestamp - nextAvgX) * (points[j].value - prevPoint.value) -
        (prevPoint.timestamp - points[j].timestamp) * (nextAvgY - prevPoint.value)
      );
      
      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }
    
    result.push(points[maxAreaIndex]);
    prevSelectedIndex = maxAreaIndex;
  }
  
  // Always add last point
  result.push(points[points.length - 1]);
  
  return result;
}

/**
 * Fill gaps in data
 */
function fillDataGaps(
  points: RawMetricPoint[],
  range: ChartRange,
  interpolation: 'linear' | 'previous' | 'none'
): RawMetricPoint[] {
  if (points.length === 0) return points;
  
  const intervalMs = getAggregationIntervalMs(range);
  const filled: RawMetricPoint[] = [];
  
  let currentTime = points[0].timestamp;
  let pointIndex = 0;
  
  const endTime = points[points.length - 1].timestamp;
  
  while (currentTime <= endTime) {
    // Find nearest actual point
    while (
      pointIndex < points.length - 1 &&
      points[pointIndex + 1].timestamp <= currentTime
    ) {
      pointIndex++;
    }
    
    const prevPoint = points[Math.max(0, pointIndex - 1)];
    const nextPoint = points[Math.min(pointIndex, points.length - 1)];
    
    // Determine value for this time
    let value: number | null = null;
    
    if (
      Math.abs(currentTime - prevPoint.timestamp) < intervalMs / 2
    ) {
      // Use exact point
      value = prevPoint.value;
    } else if (
      Math.abs(currentTime - nextPoint.timestamp) < intervalMs / 2
    ) {
      // Use exact point
      value = nextPoint.value;
    } else if (interpolation === 'linear') {
      // Linear interpolation
      const timeDiff = nextPoint.timestamp - prevPoint.timestamp;
      if (timeDiff > 0) {
        const t = (currentTime - prevPoint.timestamp) / timeDiff;
        if (prevPoint.value !== null && nextPoint.value !== null) {
          value = prevPoint.value + t * (nextPoint.value - prevPoint.value);
        }
      }
    } else if (interpolation === 'previous') {
      // Use previous value
      value = prevPoint.value;
    }
    
    filled.push({
      timestamp: currentTime,
      value,
      confidence: value !== null ? 1 : 0,
    });
    
    currentTime += intervalMs;
  }
  
  return filled;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(
  points: RawMetricPoint[],
  target?: number
): ChartSummary {
  const validValues = points
    .map(p => p.value)
    .filter((v): v is number => v !== null);
  
  if (validValues.length === 0) {
    return {
      current: null,
      average: null,
      minimum: null,
      maximum: null,
      changePercent: null,
      completionPercent: target ? null : undefined,
      trend: null,
    };
  }
  
  const current = validValues[validValues.length - 1];
  const average = roundTo(
    validValues.reduce((s, v) => s + v, 0) / validValues.length,
    2
  );
  const minimum = roundTo(Math.min(...validValues), 2);
  const maximum = roundTo(Math.max(...validValues), 2);
  
  // Calculate change percent
  let changePercent: number | null = null;
  if (validValues.length >= 2) {
    const previous = validValues[0];
    if (previous !== 0) {
      changePercent = roundTo(
        ((current - previous) / previous) * 100,
        1
      );
    }
  }
  
  // Calculate completion percent if target exists
  let completionPercent: number | null = null;
  if (target && target > 0) {
    completionPercent = roundTo((average / target) * 100, 0);
  }
  
  // Calculate trend
  const trend = calculateTrendFromPoints(validValues);
  
  return {
    current: roundTo(current, 2),
    average,
    minimum,
    maximum,
    changePercent,
    completionPercent,
    trend,
  };
}

/**
 * Calculate trend from points
 */
function calculateTrendFromPoints(
  values: number[]
): 'improving' | 'stable' | 'declining' | null {
  if (values.length < 3) return null;
  
  // Compare first third to last third
  const third = Math.max(1, Math.floor(values.length / 3));
  
  const early = values.slice(0, third);
  const late = values.slice(-third);
  
  const earlyAvg = early.reduce((s, v) => s + v, 0) / early.length;
  const lateAvg = late.reduce((s, v) => s + v, 0) / late.length;
  
  const change = ((lateAvg - earlyAvg) / earlyAvg) * 100;
  
  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
}

/**
 * Get range duration in milliseconds
 */
function getRangeDurationMs(range: ChartRange): number {
  const durations: Record<string, number> = {
    [CHART_RANGES.DAY]: 24 * 60 * 60 * 1000,
    [CHART_RANGES.WEEK]: 7 * 24 * 60 * 60 * 1000,
    [CHART_RANGES.MONTH]: 30 * 24 * 60 * 60 * 1000,
    [CHART_RANGES.THREE_MONTHS]: 90 * 24 * 60 * 60 * 1000,
    [CHART_RANGES.YEAR]: 365 * 24 * 60 * 60 * 1000,
  };
  
  return durations[range] ?? durations[CHART_RANGES.WEEK];
}

/**
 * Get aggregation interval in milliseconds
 */
function getAggregationIntervalMs(range: ChartRange): number {
  const intervals: Record<string, number> = {
    [CHART_RANGES.DAY]: 60 * 60 * 1000, // 1 hour
    [CHART_RANGES.WEEK]: 24 * 60 * 60 * 1000, // 1 day
    [CHART_RANGES.MONTH]: 24 * 60 * 60 * 1000, // 1 day
    [CHART_RANGES.THREE_MONTHS]: 7 * 24 * 60 * 60 * 1000, // 1 week
    [CHART_RANGES.YEAR]: 7 * 24 * 60 * 60 * 1000, // 1 week
  };
  
  return intervals[range] ?? intervals[CHART_RANGES.WEEK];
}

// =============================================================================
// Specific Chart Generators
// =============================================================================

/**
 * Generate readiness trend chart
 */
export function generateReadinessChart(
  scores: { date: string; score: number; level: string }[],
  range: ChartRange,
  options?: ChartOptions
): ChartData {
  const points: RawMetricPoint[] = scores.map(s => ({
    timestamp: new Date(s.date).getTime(),
    value: s.score,
    confidence: 0.9,
  }));
  
  return generateChartData(
    { metric: HEALTH_METRICS.READINESS, unit: 'score', points },
    range,
    options
  );
}

/**
 * Generate nutrition chart
 */
export function generateNutritionChart(
  data: { date: string; consumed: number; target: number }[],
  range: ChartRange,
  metric: 'calories' | 'protein' | 'carbs' | 'fat',
  options?: ChartOptions
): ChartData {
  const unitMap: Record<string, string> = {
    calories: 'kcal',
    protein: 'g',
    carbs: 'g',
    fat: 'g',
  };
  
  const points: RawMetricPoint[] = data.map(d => ({
    timestamp: new Date(d.date).getTime(),
    value: d.consumed,
    target: d.target,
    confidence: 0.85,
  }));
  
  return generateChartData(
    {
      metric,
      unit: unitMap[metric] ?? 'unit',
      target: options?.target,
      points,
    },
    range,
    options
  );
}

/**
 * Generate sleep chart
 */
export function generateSleepChart(
  data: { date: string; hours: number | null; quality: number | null }[],
  range: ChartRange,
  options?: ChartOptions
): ChartData {
  const points: RawMetricPoint[] = data.map(d => ({
    timestamp: new Date(d.date).getTime(),
    value: d.hours,
    confidence: 0.85,
  }));
  
  return generateChartData(
    {
      metric: HEALTH_METRICS.SLEEP_DURATION,
      unit: 'hours',
      target: 8,
      points,
    },
    range,
    options
  );
}

/**
 * Generate activity chart
 */
export function generateActivityChart(
  data: { date: string; steps: number | null; activeMinutes: number | null }[],
  range: ChartRange,
  metric: 'steps' | 'active_minutes',
  options?: ChartOptions
): ChartData {
  const unitMap: Record<string, string> = {
    steps: 'steps',
    active_minutes: 'minutes',
  };
  
  const targetMap: Record<string, number> = {
    steps: 10000,
    active_minutes: 30,
  };
  
  const points: RawMetricPoint[] = data.map(d => ({
    timestamp: new Date(d.date).getTime(),
    value: metric === 'steps' ? d.steps : d.activeMinutes,
    confidence: 0.9,
  }));
  
  return generateChartData(
    {
      metric: metric === 'steps' ? HEALTH_METRICS.STEPS : 'active_minutes',
      unit: unitMap[metric],
      target: options?.target ?? targetMap[metric],
      points,
    },
    range,
    options
  );
}

/**
 * Generate hydration chart
 */
export function generateHydrationChart(
  data: { date: string; ml: number; target: number }[],
  range: ChartRange,
  options?: ChartOptions
): ChartData {
  const points: RawMetricPoint[] = data.map(d => ({
    timestamp: new Date(d.date).getTime(),
    value: d.ml,
    target: d.target,
    confidence: 0.8,
  }));
  
  return generateChartData(
    {
      metric: HEALTH_METRICS.HYDRATION,
      unit: 'ml',
      target: options?.target ?? 2000,
      points,
    },
    range,
    options
  );
}

/**
 * Generate HRV chart
 */
export function generateHRVChart(
  data: { date: string; hrv: number | null }[],
  range: ChartRange,
  options?: ChartOptions
): ChartData {
  const points: RawMetricPoint[] = data.map(d => ({
    timestamp: new Date(d.date).getTime(),
    value: d.hrv,
    confidence: 0.85,
  }));
  
  return generateChartData(
    {
      metric: HEALTH_METRICS.HRV,
      unit: 'ms',
      target: options?.target ?? 50,
      points,
    },
    range,
    options
  );
}

/**
 * Generate resting heart rate chart
 */
export function generateRestingHRChart(
  data: { date: string; hr: number | null }[],
  range: ChartRange,
  options?: ChartOptions
): ChartData {
  const points: RawMetricPoint[] = data.map(d => ({
    timestamp: new Date(d.date).getTime(),
    value: d.hr,
    confidence: 0.9,
  }));
  
  return generateChartData(
    {
      metric: HEALTH_METRICS.RESTING_HR,
      unit: 'bpm',
      points,
    },
    range,
    options
  );
}

/**
 * Generate weight chart
 */
export function generateWeightChart(
  data: { date: string; weight: number | null }[],
  range: ChartRange,
  options?: ChartOptions
): ChartData {
  const points: RawMetricPoint[] = data.map(d => ({
    timestamp: new Date(d.date).getTime(),
    value: d.weight,
    confidence: 0.95,
  }));
  
  return generateChartData(
    {
      metric: HEALTH_METRICS.WEIGHT,
      unit: 'kg',
      target: options?.target,
      points,
    },
    range,
    options
  );
}

/**
 * Generate workout completion chart
 */
export function generateWorkoutCompletionChart(
  data: { date: string; completed: boolean; duration: number | null }[],
  range: ChartRange,
  options?: ChartOptions
): ChartData {
  const points: RawMetricPoint[] = data.map(d => ({
    timestamp: new Date(d.date).getTime(),
    value: d.completed ? 100 : 0,
    confidence: 0.9,
  }));
  
  return generateChartData(
    {
      metric: HEALTH_METRICS.WORKOUT_COMPLETION,
      unit: 'percent',
      target: 100,
      points,
    },
    range,
    options
  );
}

/**
 * Generate energy/stress chart
 */
export function generateEnergyStressChart(
  data: { date: string; energy: number | null; stress: number | null }[],
  range: ChartRange,
  options?: ChartOptions
): ChartData {
  // Use energy for the chart (primary metric)
  const points: RawMetricPoint[] = data.map(d => ({
    timestamp: new Date(d.date).getTime(),
    value: d.energy,
    confidence: 0.7,
  }));
  
  return generateChartData(
    {
      metric: 'energy_stress',
      unit: 'level',
      points,
    },
    range,
    options
  );
}
